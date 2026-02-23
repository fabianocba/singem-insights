/**
 * Rotas SerproID - SINGEM
 * OAuth2 Authorization Code + PKCE (S256)
 *
 * Endpoints:
 *   GET  /api/auth/serproid/login    → Inicia fluxo OAuth2
 *   GET  /api/auth/serproid/callback → Recebe callback com code
 *   GET  /api/auth/serproid/status   → Status da integração
 */

const express = require('express');
const identityService = require('../domain/identity/identityService');
const serproidProvider = require('../domain/identity/providers/serproidProvider');
const auth = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Armazenamento temporário de PKCE (em produção usar Redis/session store)
// Chave: state, Valor: { codeVerifier, createdAt }
const pkceStore = new Map();

// Limpa entradas antigas a cada 5 minutos
setInterval(
  () => {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutos
    for (const [key, value] of pkceStore.entries()) {
      if (now - value.createdAt > maxAge) {
        pkceStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

// ============================================================================
// GET /api/auth/serproid/status - Status da integração
// ============================================================================
router.get('/status', (_req, res) => {
  const providers = identityService.getProvidersInfo();

  res.json({
    sucesso: true,
    serproid: {
      habilitado: providers.serproid.enabled,
      configurado: serproidProvider.isConfigured(),
      baseUrl: providers.serproid.baseUrl
    }
  });
});

// ============================================================================
// GET /api/auth/serproid/login - Inicia fluxo OAuth2 + PKCE
// ============================================================================
router.get('/login', (req, res) => {
  try {
    // Verifica se está habilitado
    if (!identityService.isProviderEnabled('serproid')) {
      return res.status(503).json({
        sucesso: false,
        erro: 'Login SerproID não está habilitado'
      });
    }

    // Verifica se está configurado
    if (!serproidProvider.isConfigured()) {
      return res.status(503).json({
        sucesso: false,
        erro: 'SerproID não está configurado corretamente'
      });
    }

    // Gera URL de autorização com PKCE
    const { url, state, codeVerifier } = serproidProvider.getAuthorizationUrl();

    // Armazena codeVerifier associado ao state (anti-CSRF)
    pkceStore.set(state, {
      codeVerifier,
      createdAt: Date.now()
    });

    console.log('[SerproID] Iniciando fluxo OAuth2, state:', state);

    // Redireciona para o SerproID
    return res.redirect(url);
  } catch (err) {
    console.error('[SerproID] Erro ao iniciar login:', err);
    return res.status(err.statusCode || 500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// ============================================================================
// GET /api/auth/serproid/callback - Callback OAuth2
// ============================================================================
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // URL de redirecionamento após login (frontend)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8000';

  // Erro retornado pelo SerproID
  if (error) {
    console.error('[SerproID] Erro no callback:', error, error_description);
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent(error_description || error)}`);
  }

  // Validação básica
  if (!code || !state) {
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent('Parâmetros code ou state ausentes')}`);
  }

  // Valida state (anti-CSRF)
  const pkceData = pkceStore.get(state);
  if (!pkceData) {
    console.error('[SerproID] State inválido ou expirado:', state);
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent('Sessão expirada. Tente novamente.')}`);
  }

  // Remove do store (use once)
  pkceStore.delete(state);

  try {
    console.log('[SerproID] Trocando code por token...');

    // Troca code por profile
    const profile = await serproidProvider.exchangeCodeForProfile({
      code,
      codeVerifier: pkceData.codeVerifier
    });

    console.log('[SerproID] Profile obtido:', {
      cpf: profile.cpf ? `***${profile.cpf.slice(-4)}` : null,
      cnpj: profile.cnpj ? `***${profile.cnpj.slice(-4)}` : null,
      name: profile.name
    });

    // Busca ou cria usuário local
    const user = await findOrCreateUser(profile);

    if (!user) {
      return res.redirect(`${frontendUrl}?error=${encodeURIComponent('Usuário não autorizado no sistema')}`);
    }

    // Gera tokens SINGEM
    const accessToken = auth.generateAccessToken(user);
    const refreshToken = auth.generateRefreshToken(user);

    // Salva refresh token
    await auth.saveRefreshToken(user.id, refreshToken);

    // Log de auditoria
    await auth.logAudit?.('LOGIN_SERPROID', user.id, {
      cpf: profile.cpf ? `***${profile.cpf.slice(-4)}` : null,
      provider: 'serproid'
    });

    console.log('[SerproID] Login bem-sucedido para usuário:', user.login);

    // Redireciona para frontend com tokens
    return res.redirect(
      `${frontendUrl}?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`
    );
  } catch (err) {
    console.error('[SerproID] Erro no callback:', err);
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent(err.message || 'Erro ao autenticar')}`);
  }
});

// ============================================================================
// Função auxiliar: Busca ou cria usuário a partir do profile SerproID
// ============================================================================
async function findOrCreateUser(profile) {
  const cpf = profile.cpf;
  const cnpj = profile.cnpj;

  if (!cpf && !cnpj) {
    console.error('[SerproID] CPF/CNPJ não encontrado no certificado');
    return null;
  }

  // Busca usuário pelo CPF
  if (cpf) {
    const existingByCpf = await db.query('SELECT * FROM usuarios WHERE cpf = $1 AND ativo = true', [cpf]);

    if (existingByCpf.rows.length > 0) {
      // Atualiza último login
      await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [existingByCpf.rows[0].id]);
      return existingByCpf.rows[0];
    }
  }

  // Busca usuário pelo email (se disponível)
  if (profile.email) {
    const existingByEmail = await db.query('SELECT * FROM usuarios WHERE email = $1 AND ativo = true', [
      profile.email.toLowerCase()
    ]);

    if (existingByEmail.rows.length > 0) {
      // Vincula CPF ao usuário existente
      if (cpf) {
        await db.query('UPDATE usuarios SET cpf = $1, ultimo_login = NOW() WHERE id = $2', [
          cpf,
          existingByEmail.rows[0].id
        ]);
      }
      return existingByEmail.rows[0];
    }
  }

  // Auto-criação de usuário (se habilitado)
  if (process.env.SERPROID_AUTO_CREATE_USER === 'true') {
    const login = cpf ? `serproid_${cpf.slice(-6)}` : `serproid_${Date.now()}`;

    const newUser = await db.insert('usuarios', {
      login,
      nome: profile.name,
      email: profile.email?.toLowerCase() || null,
      cpf: cpf || null,
      perfil: 'user', // Perfil padrão para auto-criação
      ativo: true,
      senha_hash: null // Sem senha local
    });

    console.log('[SerproID] Novo usuário criado:', newUser.login);
    return newUser;
  }

  console.warn('[SerproID] Usuário não encontrado e auto-criação desabilitada');
  return null;
}

module.exports = router;
