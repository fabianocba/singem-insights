/**
 * Rotas Gov.br - SINGEM
 * OAuth2 Authorization Code + PKCE (S256) para Login Único gov.br
 *
 * Endpoints:
 *   GET  /api/auth/govbr/status   → Status da integração
 *   GET  /api/auth/govbr/login    → Inicia fluxo OAuth2 (redirect para gov.br)
 *   GET  /api/auth/govbr/callback → Recebe callback com code
 *   POST /api/auth/govbr/link     → Vincula gov.br a usuário local existente
 */

const express = require('express');
const identityService = require('../domain/identity/identityService');
const govbrProvider = require('../domain/identity/providers/govbrProvider');
const { authenticate, generateAccessToken, generateRefreshToken, saveRefreshToken } = require('../middleware/auth');
const db = require('../config/database');
const { config } = require('../config');

const router = express.Router();

// ============================================================================
// PKCE Store (state → { codeVerifier, nonce, createdAt })
// Em produção com múltiplas instâncias, usar Redis ou tabela govbr_sessions
// ============================================================================
const pkceStore = new Map();

// Limpa entradas expiradas a cada 5 minutos
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
// GET /api/auth/govbr/status - Status da integração
// ============================================================================
router.get('/status', (_req, res) => {
  const providers = identityService.getProvidersInfo();

  res.json({
    sucesso: true,
    govbr: {
      habilitado: providers.govbr.enabled,
      configurado: govbrProvider.isConfigured(),
      issuer: providers.govbr.issuer
    }
  });
});

// ============================================================================
// GET /api/auth/govbr/login - Inicia fluxo OAuth2 + PKCE
// ============================================================================
router.get('/login', async (req, res) => {
  const frontendUrl = config.frontendUrl;

  try {
    if (!identityService.isProviderEnabled('govbr')) {
      return res.redirect(
        `${frontendUrl}?error=${encodeURIComponent('Login gov.br não está habilitado neste momento.')}`
      );
    }

    if (!govbrProvider.isConfigured()) {
      return res.redirect(
        `${frontendUrl}?error=${encodeURIComponent('Gov.br não está configurado corretamente. Contate o administrador.')}`
      );
    }

    // Pre-flight: valida que o issuer gov.br está acessível
    const wellKnownUrl = `${govbrProvider.issuer}/.well-known/openid-configuration`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const oidcRes = await fetch(wellKnownUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!oidcRes.ok) {
        console.error('[GovBr] OIDC discovery retornou status:', oidcRes.status);
        return res.redirect(
          `${frontendUrl}?error=${encodeURIComponent('Servidor gov.br indisponível. Tente novamente mais tarde.')}`
        );
      }

      const oidcData = await oidcRes.json();
      if (!oidcData.authorization_endpoint) {
        console.error('[GovBr] OIDC discovery sem authorization_endpoint');
        return res.redirect(
          `${frontendUrl}?error=${encodeURIComponent('Configuração gov.br inválida. Contate o administrador.')}`
        );
      }
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.error('[GovBr] Pre-flight falhou:', fetchErr.message);
      return res.redirect(
        `${frontendUrl}?error=${encodeURIComponent('Não foi possível conectar ao servidor gov.br. Verifique sua conexão.')}`
      );
    }

    // Gera URL de autorização com PKCE
    const { url, state, nonce, codeVerifier } = govbrProvider.getAuthorizationUrl();

    // Armazena PKCE associado ao state (anti-CSRF)
    pkceStore.set(state, {
      codeVerifier,
      nonce,
      createdAt: Date.now()
    });

    console.log('[GovBr] Iniciando fluxo OAuth2, state:', state);

    // Redireciona para o gov.br
    return res.redirect(url);
  } catch (err) {
    console.error('[GovBr] Erro ao iniciar login:', err);
    return res.redirect(
      `${frontendUrl}?error=${encodeURIComponent('Erro ao iniciar autenticação gov.br. Tente novamente.')}`
    );
  }
});

// ============================================================================
// GET /api/auth/govbr/callback - Callback OAuth2
// ============================================================================
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = config.frontendUrl;

  // Erro retornado pelo gov.br
  if (error) {
    console.error('[GovBr] Erro no callback:', error, error_description);
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent(error_description || error)}`);
  }

  // Validação de parâmetros obrigatórios
  if (!code || !state) {
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent('Parâmetros code ou state ausentes')}`);
  }

  // Valida state (anti-CSRF)
  const pkceData = pkceStore.get(state);
  if (!pkceData) {
    console.error('[GovBr] State inválido ou expirado:', state);
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent('Sessão expirada. Tente novamente.')}`);
  }

  // Remove do store (single-use)
  pkceStore.delete(state);

  try {
    console.log('[GovBr] Trocando code por token...');

    // Troca code por profile normalizado (inclui validação de id_token)
    const profile = await govbrProvider.exchangeCodeForProfile({
      code,
      codeVerifier: pkceData.codeVerifier,
      nonce: pkceData.nonce
    });

    console.log('[GovBr] Profile obtido:', {
      cpf: profile.cpf ? `***${profile.cpf.slice(-4)}` : null,
      name: profile.name,
      level: profile.level,
      mfa: profile.mfaEnabled,
      amr: profile.amr
    });

    // Busca ou cria usuário local
    const user = await findOrCreateGovBrUser(profile);

    if (!user) {
      return res.redirect(
        `${frontendUrl}?error=${encodeURIComponent('Usuário não autorizado no sistema. Contate o administrador.')}`
      );
    }

    // Gera tokens SINGEM
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Salva refresh token
    await saveRefreshToken(user.id, refreshToken);

    // Log de auditoria
    await logGovBrAuth(user.id, true, req.ip, req.headers['user-agent']);

    console.log(
      '[GovBr] Login bem-sucedido para usuário:',
      user.login,
      '| Nível:',
      profile.level,
      profile.mfaEnabled ? '| 2FA: ativado' : '| 2FA: não'
    );

    // Redireciona para frontend com tokens
    return res.redirect(
      `${frontendUrl}?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&provider=govbr`
    );
  } catch (err) {
    console.error('[GovBr] Erro no callback:', err);
    await logGovBrAuth(null, false, req.ip, req.headers['user-agent'], err.message);
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent(err.message || 'Erro ao autenticar com gov.br')}`);
  }
});

// ============================================================================
// POST /api/auth/govbr/link - Vincula conta gov.br a usuário local existente
// ============================================================================
router.post('/link', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { govbrSub, govbrCpf } = req.body;

    if (!govbrSub) {
      return res.status(400).json({
        sucesso: false,
        erro: 'govbrSub é obrigatório para vinculação'
      });
    }

    // Verifica se o sub já está vinculado a outro usuário
    const existing = await db.query('SELECT id FROM usuarios WHERE govbr_sub = $1 AND id != $2', [govbrSub, userId]);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        sucesso: false,
        erro: 'Esta conta gov.br já está vinculada a outro usuário'
      });
    }

    // Vincula
    await db.query(
      `UPDATE usuarios
       SET govbr_sub = $1, govbr_cpf = $2, auth_provider = 'ambos', govbr_vinculado_em = NOW()
       WHERE id = $3`,
      [govbrSub, govbrCpf || null, userId]
    );

    return res.json({
      sucesso: true,
      mensagem: 'Conta gov.br vinculada com sucesso'
    });
  } catch (err) {
    console.error('[GovBr] Erro na vinculação:', err);
    return res.status(500).json({
      sucesso: false,
      erro: 'Erro ao vincular conta gov.br'
    });
  }
});

// ============================================================================
// DELETE /api/auth/govbr/link - Remove vinculação gov.br
// ============================================================================
router.delete('/link', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      `UPDATE usuarios
       SET govbr_sub = NULL, govbr_cpf = NULL, auth_provider = 'local', govbr_vinculado_em = NULL
       WHERE id = $1`,
      [userId]
    );

    return res.json({
      sucesso: true,
      mensagem: 'Vinculação gov.br removida'
    });
  } catch (err) {
    console.error('[GovBr] Erro ao remover vinculação:', err);
    return res.status(500).json({
      sucesso: false,
      erro: 'Erro ao remover vinculação gov.br'
    });
  }
});

// ============================================================================
// GET /api/auth/govbr/logout - Logout do gov.br (implementação obrigatória)
// Conforme roteiro oficial: https://acesso.gov.br/roteiro-tecnico/iniciarintegracao.html
// ============================================================================
router.get('/logout', (req, res) => {
  const frontendUrl = config.frontendUrl;
  const postLogoutUri = req.query.redirect || frontendUrl;

  // Redireciona para o endpoint de logout do gov.br
  // O gov.br invalida a sessão SSO e redireciona de volta ao SINGEM
  const logoutUrl = `${govbrProvider.logoutUrl}?post_logout_redirect_uri=${encodeURIComponent(postLogoutUri)}`;

  console.log('[GovBr] Logout - redirecionando para gov.br');
  return res.redirect(logoutUrl);
});

// ============================================================================
// Função auxiliar: Busca ou cria usuário a partir do profile gov.br
// ============================================================================
async function findOrCreateGovBrUser(profile) {
  const sub = profile.providerUserId;
  const cpf = profile.cpf;

  if (!sub) {
    console.error('[GovBr] Sub (providerUserId) não encontrado no profile');
    return null;
  }

  // 1. Busca por govbr_sub (vinculação direta)
  const existingBySub = await db.query('SELECT * FROM usuarios WHERE govbr_sub = $1 AND ativo = true', [sub]);

  if (existingBySub.rows.length > 0) {
    const user = existingBySub.rows[0];
    await db.query('UPDATE usuarios SET ultimo_login = NOW(), govbr_nivel_confiabilidade = $1 WHERE id = $2', [
      profile.level === 'ouro' ? 3 : profile.level === 'prata' ? 2 : 1,
      user.id
    ]);
    return user;
  }

  // 2. Busca por CPF (auto-vinculação)
  if (cpf) {
    const existingByCpf = await db.query('SELECT * FROM usuarios WHERE (cpf = $1 OR govbr_cpf = $1) AND ativo = true', [
      cpf
    ]);

    if (existingByCpf.rows.length > 0) {
      const user = existingByCpf.rows[0];
      // Auto-vincula gov.br ao usuário existente
      await db.query(
        `UPDATE usuarios
         SET govbr_sub = $1, govbr_cpf = $2, auth_provider = 'ambos',
             govbr_vinculado_em = NOW(), ultimo_login = NOW(),
             govbr_nivel_confiabilidade = $3
         WHERE id = $4`,
        [sub, cpf, profile.level === 'ouro' ? 3 : profile.level === 'prata' ? 2 : 1, user.id]
      );
      console.log('[GovBr] Auto-vinculado ao usuário existente via CPF:', user.login);
      return user;
    }
  }

  // 3. Busca por email
  if (profile.email && profile.emailVerified) {
    const existingByEmail = await db.query('SELECT * FROM usuarios WHERE email = $1 AND ativo = true', [
      profile.email.toLowerCase()
    ]);

    if (existingByEmail.rows.length > 0) {
      const user = existingByEmail.rows[0];
      await db.query(
        `UPDATE usuarios
         SET govbr_sub = $1, govbr_cpf = $2, auth_provider = 'ambos',
             govbr_vinculado_em = NOW(), ultimo_login = NOW(),
             govbr_nivel_confiabilidade = $3
         WHERE id = $4`,
        [sub, cpf, profile.level === 'ouro' ? 3 : profile.level === 'prata' ? 2 : 1, user.id]
      );
      console.log('[GovBr] Auto-vinculado ao usuário existente via email:', user.login);
      return user;
    }
  }

  // 4. Auto-criação de usuário (se habilitado)
  if (config.govbr.autoCreateUser) {
    const login = cpf ? `govbr_${cpf.slice(-6)}` : `govbr_${Date.now()}`;

    const newUser = await db.insert('usuarios', {
      login,
      nome: profile.name,
      email: profile.email?.toLowerCase() || null,
      cpf: cpf || null,
      govbr_sub: sub,
      govbr_cpf: cpf || null,
      govbr_nivel_confiabilidade: profile.level === 'ouro' ? 3 : profile.level === 'prata' ? 2 : 1,
      govbr_vinculado_em: new Date(),
      auth_provider: 'govbr',
      perfil: 'operador',
      ativo: true,
      is_active: true,
      senha_hash: null,
      ultimo_login: new Date()
    });

    console.log('[GovBr] Novo usuário criado:', newUser.login, '| Nível:', profile.level);
    return newUser;
  }

  console.warn('[GovBr] Usuário não encontrado e auto-criação desabilitada');
  return null;
}

// ============================================================================
// Log de auditoria
// ============================================================================
async function logGovBrAuth(userId, success, ip, userAgent, errorMessage) {
  try {
    await db.insert('auth_log', {
      usuario_id: userId,
      provider: 'govbr',
      ip_address: ip || null,
      user_agent: userAgent ? String(userAgent).slice(0, 500) : null,
      success,
      error_message: errorMessage ? String(errorMessage).slice(0, 1000) : null
    });
  } catch (err) {
    console.error('[GovBr] Falha ao registrar log de auditoria:', err.message);
  }
}

module.exports = router;
