/**
 * Rotas de Autenticação - SINGEM
 * Login, Refresh Token, Logout
 */

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const auth = require('../middleware/auth');
const identityService = require('../domain/identity/identityService');

const router = express.Router();
const SALT_ROUNDS = 10;

// ============================================================================
// POST /api/auth/login - Login via Provider Pattern
// ============================================================================
router.post('/login', async (req, res) => {
  try {
    const { login, senha, email, password } = req.body;

    // Suporta ambos formatos: {login, senha} (legado) ou {email, password} (novo)
    const userLogin = email || login;
    const userPassword = password || senha;

    if (!userLogin || !userPassword) {
      return res.status(400).json({ erro: 'Login e senha são obrigatórios' });
    }

    // Usa Provider Pattern - LocalProvider faz validação + audit log
    const profile = await identityService.authenticate('local', {
      email: userLogin,
      password: userPassword
    });

    // Busca dados completos para token (profile._internal tem id, login, perfil)
    const userForToken = {
      id: profile._internal.id,
      login: profile._internal.login,
      nome: profile.name,
      email: profile.email,
      perfil: profile._internal.perfil
    };

    // Gera tokens
    const accessToken = auth.generateAccessToken(userForToken);
    const refreshToken = auth.generateRefreshToken(userForToken);

    // Salva refresh token no banco
    await auth.saveRefreshToken(userForToken.id, refreshToken);

    return res.json({
      sucesso: true,
      usuario: {
        id: userForToken.id,
        login: userForToken.login,
        nome: userForToken.nome,
        email: userForToken.email,
        perfil: userForToken.perfil
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('[Auth] Erro no login:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ erro: err.message || 'Erro interno no login' });
  }
});

// ============================================================================
// POST /api/auth/refresh
// ============================================================================
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ erro: 'Refresh token é obrigatório' });
    }

    // Consome e valida o refresh token
    const user = await auth.consumeRefreshToken(refreshToken);

    if (!user) {
      return res.status(401).json({ erro: 'Refresh token inválido ou expirado' });
    }

    // Gera novos tokens
    const newAccessToken = auth.generateAccessToken(user);
    const newRefreshToken = auth.generateRefreshToken(user);

    // Salva novo refresh token
    await auth.saveRefreshToken(user.id, newRefreshToken);

    return res.json({
      sucesso: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    console.error('[Auth] Erro no refresh:', err);
    return res.status(500).json({ erro: 'Erro interno no refresh' });
  }
});

// ============================================================================
// POST /api/auth/logout
// ============================================================================
router.post('/logout', auth.authenticate, async (req, res) => {
  try {
    // Revoga todos os tokens do usuário
    await auth.revokeAllTokens(req.user.id);

    res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso' });
  } catch (err) {
    console.error('[Auth] Erro no logout:', err);
    res.status(500).json({ erro: 'Erro interno no logout' });
  }
});

// ============================================================================
// GET /api/auth/me - Retorna dados do usuário logado
// ============================================================================
router.get('/me', auth.authenticate, async (req, res) => {
  res.json({
    sucesso: true,
    usuario: req.user
  });
});

// ============================================================================
// POST /api/auth/register - Registro de primeiro admin (bootstrap)
// ============================================================================
router.post('/register', async (req, res) => {
  try {
    // Verifica se já existem usuários
    const count = await db.query('SELECT COUNT(*) as total FROM usuarios');
    const totalUsuarios = parseInt(count.rows[0].total);

    if (totalUsuarios > 0) {
      return res.status(403).json({
        erro: 'Registro direto desabilitado. Solicite ao administrador.'
      });
    }

    const { login, email, senha, nome } = req.body;

    if (!login || !senha || !nome) {
      return res.status(400).json({ erro: 'Login, senha e nome são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ erro: 'Senha deve ter no mínimo 6 caracteres' });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    // Cria primeiro usuário como admin
    const user = await db.insert('usuarios', {
      login: login.toLowerCase(),
      email: email ? email.toLowerCase() : null,
      senha_hash: senhaHash,
      nome,
      perfil: 'admin',
      ativo: true
    });

    // Gera tokens
    const accessToken = auth.generateAccessToken(user);
    const refreshToken = auth.generateRefreshToken(user);
    await auth.saveRefreshToken(user.id, refreshToken);

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Primeiro administrador criado com sucesso',
      usuario: {
        id: user.id,
        login: user.login,
        nome: user.nome,
        perfil: user.perfil
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('[Auth] Erro no registro:', err);
    if (err.code === '23505') {
      // Unique violation
      return res.status(409).json({ erro: 'Login ou email já existe' });
    }
    return res.status(500).json({ erro: 'Erro interno no registro' });
  }
});

// ============================================================================
// PUT /api/auth/password - Alterar senha
// ============================================================================
router.put('/password', auth.authenticate, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    // Busca usuário atual
    const user = await db.findById('usuarios', req.user.id);

    // Verifica senha atual
    const senhaCorreta = await bcrypt.compare(senhaAtual, user.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Senha atual incorreta' });
    }

    // Atualiza senha
    const novaSenhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
    await db.update('usuarios', user.id, { senha_hash: novaSenhaHash });

    // Revoga todos os tokens (força re-login)
    await auth.revokeAllTokens(user.id);

    return res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (err) {
    console.error('[Auth] Erro ao alterar senha:', err);
    return res.status(500).json({ erro: 'Erro interno ao alterar senha' });
  }
});

module.exports = router;
