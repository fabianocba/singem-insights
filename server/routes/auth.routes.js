/**
 * Rotas de Autenticação - SINGEM
 * Login, Refresh Token, Logout
 */

const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { createAuthLimiter } = require('../middleware/rateLimit');
const identityService = require('../domain/identity/identityService');
const { sendMail, buildActivationEmail, buildResetPasswordEmail } = require('../src/services/emailService');

const router = express.Router();
const SALT_ROUNDS = 10;
const ACTIVATION_HOURS = 24;
const RESET_HOURS = 1;

const loginLimiter = createAuthLimiter(20, 'Muitas tentativas de login. Tente novamente em alguns minutos.');

const registerLimiter = createAuthLimiter(10, 'Muitas tentativas de cadastro. Tente novamente em alguns minutos.');

const forgotPasswordLimiter = createAuthLimiter(10, 'Muitas tentativas. Tente novamente em alguns minutos.');

const resetPasswordLimiter = createAuthLimiter(
  10,
  'Muitas tentativas de redefinição. Tente novamente em alguns minutos.'
);

function ok(res, message, data) {
  const payload = { ok: true, message };
  if (data !== undefined) {
    payload.data = data;
  }
  return res.json(payload);
}

function fail(res, status, message) {
  return res.status(status).json({ ok: false, message });
}

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function saveAuthToken(userId, type, rawToken, expiresAt) {
  const tokenHash = hashToken(rawToken);

  await db.query('DELETE FROM auth_tokens WHERE user_id = $1 AND type = $2 AND used_at IS NULL', [userId, type]);

  await db.query('INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) VALUES ($1, $2, $3, $4)', [
    userId,
    tokenHash,
    type,
    expiresAt
  ]);

  return tokenHash;
}

async function consumeAuthToken(rawToken, type) {
  const tokenHash = hashToken(rawToken);

  const result = await db.query(
    `
      SELECT id, user_id
      FROM auth_tokens
      WHERE token_hash = $1
        AND type = $2
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash, type]
  );

  if (!result.rows[0]) {
    return null;
  }

  return result.rows[0];
}

// ============================================================================
// POST /api/auth/login - Login via Provider Pattern
// ============================================================================
router.post('/login', loginLimiter, async (req, res) => {
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
    if (status >= 500) {
      return res.status(500).json({ erro: 'Erro interno no login' });
    }
    return res.status(status).json({ erro: 'Credenciais inválidas' });
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
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, nome, email, password, senha } = req.body;

    const userName = (name || nome || '').trim();
    const userEmail = (email || '').trim().toLowerCase();
    const userPassword = password || senha;

    if (!userName || !userEmail || !userPassword) {
      return fail(res, 400, 'Nome, e-mail e senha são obrigatórios.');
    }

    if (!isEmailValid(userEmail)) {
      return fail(res, 400, 'E-mail inválido.');
    }

    if (userPassword.length < 8) {
      return fail(res, 400, 'A senha deve ter no mínimo 8 caracteres.');
    }

    const existing = await db.query('SELECT id FROM usuarios WHERE LOWER(email) = $1 OR LOWER(login) = $1 LIMIT 1', [
      userEmail
    ]);

    if (existing.rows.length > 0) {
      return fail(res, 409, 'Não foi possível concluir o cadastro com este e-mail.');
    }

    const senhaHash = await bcrypt.hash(userPassword, SALT_ROUNDS);

    const user = await db.insert('usuarios', {
      login: userEmail,
      email: userEmail,
      senha_hash: senhaHash,
      nome: userName,
      perfil: 'operador',
      ativo: false,
      is_active: false
    });

    const token = generateRawToken();
    const expiresAt = new Date(Date.now() + ACTIVATION_HOURS * 60 * 60 * 1000);

    await saveAuthToken(user.id, 'ACTIVATION', token, expiresAt);

    const emailContent = buildActivationEmail({ name: user.nome, token });
    const mailResult = await sendMail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    if (!mailResult.ok) {
      return fail(res, 503, 'Cadastro realizado, mas não foi possível enviar o e-mail de ativação no momento.');
    }

    return res.status(201).json({
      ok: true,
      message: 'Cadastro realizado. Verifique seu e-mail para ativar a conta.'
    });
  } catch (err) {
    console.error('[Auth] Erro no registro:', err);
    if (err.code === '23505') {
      return fail(res, 409, 'Não foi possível concluir o cadastro com este e-mail.');
    }
    return fail(res, 500, 'Erro interno no cadastro.');
  }
});

// ============================================================================
// GET /api/auth/activate?token=XXXX - Ativação de conta
// ============================================================================
router.get('/activate', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';

  if (!token) {
    return fail(res, 400, 'Token de ativação é obrigatório.');
  }

  try {
    const tokenRow = await consumeAuthToken(token, 'ACTIVATION');

    if (!tokenRow) {
      return fail(res, 400, 'Token inválido ou expirado.');
    }

    await db.query('BEGIN');
    try {
      await db.query('UPDATE usuarios SET ativo = true, is_active = true, updated_at = NOW() WHERE id = $1', [
        tokenRow.user_id
      ]);

      await db.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = $1', [tokenRow.id]);

      await db.query(
        "UPDATE auth_tokens SET used_at = NOW() WHERE user_id = $1 AND type = 'ACTIVATION' AND used_at IS NULL",
        [tokenRow.user_id]
      );

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return ok(res, 'Conta ativada com sucesso.');
  } catch (err) {
    console.error('[Auth] Erro na ativação:', err);
    return fail(res, 500, 'Erro interno na ativação da conta.');
  }
});

// ============================================================================
// POST /api/auth/forgot-password
// ============================================================================
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const genericMessage = 'Se existir uma conta ativa para este e-mail, enviaremos instruções de recuperação.';

  try {
    const { email } = req.body;
    const userEmail = (email || '').trim().toLowerCase();

    if (!userEmail || !isEmailValid(userEmail)) {
      return ok(res, genericMessage);
    }

    const result = await db.query(
      `
        SELECT id, nome, email
        FROM usuarios
        WHERE LOWER(email) = $1
          AND ativo = true
          AND COALESCE(is_active, false) = true
        LIMIT 1
      `,
      [userEmail]
    );

    const user = result.rows[0];

    if (user) {
      const token = generateRawToken();
      const expiresAt = new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000);

      await saveAuthToken(user.id, 'RESET', token, expiresAt);

      const emailContent = buildResetPasswordEmail({ name: user.nome, token });
      await sendMail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });
    }

    return ok(res, genericMessage);
  } catch (err) {
    console.error('[Auth] Erro no forgot-password:', err);
    return ok(res, genericMessage);
  }
});

// ============================================================================
// POST /api/auth/reset-password
// ============================================================================
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { token, new_password: newPassword, novaSenha } = req.body;
    const nextPassword = newPassword || novaSenha;

    if (!token || !nextPassword) {
      return fail(res, 400, 'Token e nova senha são obrigatórios.');
    }

    if (nextPassword.length < 8) {
      return fail(res, 400, 'A nova senha deve ter no mínimo 8 caracteres.');
    }

    const tokenRow = await consumeAuthToken(token, 'RESET');
    if (!tokenRow) {
      return fail(res, 400, 'Token inválido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(nextPassword, SALT_ROUNDS);

    await db.query('BEGIN');
    try {
      await db.query('UPDATE usuarios SET senha_hash = $1, updated_at = NOW() WHERE id = $2', [
        passwordHash,
        tokenRow.user_id
      ]);

      await db.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = $1', [tokenRow.id]);

      await db.query(
        "UPDATE auth_tokens SET used_at = NOW() WHERE user_id = $1 AND type = 'RESET' AND used_at IS NULL",
        [tokenRow.user_id]
      );

      await db.query('DELETE FROM refresh_tokens WHERE usuario_id = $1', [tokenRow.user_id]);

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return ok(res, 'Senha redefinida com sucesso.');
  } catch (err) {
    console.error('[Auth] Erro no reset-password:', err);
    return fail(res, 500, 'Erro interno ao redefinir senha.');
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
