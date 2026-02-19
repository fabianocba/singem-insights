/**
 * Middleware de Autenticação JWT - SINGEM
 *
 * Este módulo re-exporta o authMiddleware da camada de identidade
 * e adiciona funções utilitárias para tokens JWT.
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Re-exporta middlewares do domínio de identidade
const identityAuth = require('../domain/identity/authMiddleware');
const rbac = require('../domain/identity/rbac');

const JWT_SECRET = process.env.JWT_SECRET || 'desenvolvimento_nao_use_em_producao';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Gera token de acesso
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      login: user.login,
      perfil: user.perfil
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Gera refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Salva refresh token no banco
 */
async function saveRefreshToken(userId, token) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

  await db.insert('refresh_tokens', {
    usuario_id: userId,
    token: token,
    expires_at: expiresAt
  });
}

/**
 * Valida e remove refresh token
 */
async function consumeRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return null;
    }

    // Busca e remove o token
    const result = await db.query(
      'DELETE FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() RETURNING usuario_id',
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Busca usuário
    const user = await db.findById('usuarios', result.rows[0].usuario_id);
    return user && user.ativo ? user : null;
  } catch {
    return null;
  }
}

/**
 * Remove todos os tokens de um usuário (logout completo)
 */
async function revokeAllTokens(userId) {
  await db.query('DELETE FROM refresh_tokens WHERE usuario_id = $1', [userId]);
}

module.exports = {
  // Middlewares do domínio de identidade
  authenticate: identityAuth.authenticate,
  requireAdmin: identityAuth.requireAdmin,
  optionalAuth: identityAuth.optionalAuth,
  requirePermission: identityAuth.requirePermission,
  requireProfile: identityAuth.requireProfile,
  auditLog: identityAuth.auditLog,

  // Funções de token
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  consumeRefreshToken,
  revokeAllTokens,

  // RBAC
  rbac,
  hasPermission: rbac.hasPermission.bind(rbac),
  isAdmin: rbac.isAdmin.bind(rbac),
  logAudit: rbac.logAudit.bind(rbac),
  Perfis: rbac.Perfis,
  Modulos: rbac.Modulos,
  Acoes: rbac.Acoes,

  // Constantes
  JWT_SECRET
};
