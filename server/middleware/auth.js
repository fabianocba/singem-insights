/**
 * Middleware de Autenticação JWT - SINGEM
 *
 * Este módulo re-exporta o authMiddleware da camada de identidade
 * e adiciona funções utilitárias para tokens JWT.
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { config } = require('../config');

const rbac = require('../domain/identity/rbac');
const accessContextService = require('../domain/identity/accessContextService');

const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;
const JWT_REFRESH_EXPIRES_IN = config.jwt.refreshExpiresIn;

if (!JWT_SECRET) {
  throw new Error('[Auth] JWT_SECRET não configurado. Defina no ambiente antes de iniciar o servidor.');
}

async function buildAuthenticatedUser(user) {
  const baseUser = {
    id: user.id,
    login: user.login,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    authProvider: user.auth_provider || 'local'
  };

  try {
    return (await accessContextService.hydrateAuthenticatedUser(baseUser)) || baseUser;
  } catch (error) {
    console.error('[Auth] Falha ao hidratar contexto de acesso:', error.message);
    return {
      ...baseUser,
      accessContext: null,
      modulosHabilitados: [],
      permissoes: {},
      menusVisiveis: [],
      unidadesVinculadas: [],
      setoresVinculados: [],
      escopoDados: {
        allUnits: false,
        allSectors: false,
        unitIds: [],
        sectorIds: []
      }
    };
  }
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ erro: 'Token mal formatado' });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.findById('usuarios', decoded.id);

      if (!user || !user.ativo) {
        return res.status(401).json({ erro: 'Usuário inativo ou não encontrado' });
      }

      req.user = await buildAuthenticatedUser(user);

      return next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ erro: 'Token expirado', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ erro: 'Token inválido' });
    }
  } catch (err) {
    console.error('[Auth] Erro no authenticate:', err);
    return res.status(500).json({ erro: 'Erro interno de autenticação' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  if (!rbac.isAdmin(req.user)) {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }

  return next();
}

function requirePermission(modulo, acao, scopeResolver = null) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    const scope = typeof scopeResolver === 'function' ? scopeResolver(req) : scopeResolver;

    if (!rbac.hasPermission(req.user, modulo, acao, scope)) {
      rbac
        .logAudit({
          userId: req.user.id,
          action: 'ACCESS_DENIED',
          module: modulo,
          entityType: null,
          entityId: null,
          changes: { acao, scope },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        })
        .catch(() => {});

      return res.status(403).json({
        erro: 'Permissão negada',
        modulo,
        acao,
        scope: scope || null
      });
    }

    return next();
  };
}

function requireProfile(perfilMinimo) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    const userPerfil = req.user.perfil?.toLowerCase();
    const nivelUser = rbac.PerfilHierarquia[userPerfil] || 0;
    const nivelRequerido = rbac.PerfilHierarquia[perfilMinimo?.toLowerCase()] || 0;

    if (nivelUser < nivelRequerido) {
      return res.status(403).json({
        erro: 'Perfil insuficiente',
        perfilUsuario: userPerfil,
        perfilRequerido: perfilMinimo
      });
    }

    return next();
  };
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  try {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const decoded = jwt.verify(parts[1], JWT_SECRET);
      const user = await db.findById('usuarios', decoded.id);

      if (user && user.ativo) {
        req.user = {
          ...(await buildAuthenticatedUser(user))
        };
      }
    }
  } catch (_err) {
    req.user = null;
  }

  req.user = req.user || null;
  return next();
}

function auditLog(modulo, action) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400 && req.user) {
        rbac
          .logAudit({
            userId: req.user.id,
            action,
            module: modulo,
            entityType: req.params.entityType || null,
            entityId: req.params.id || req.params.entityId || null,
            changes: req.body ? { body: JSON.stringify(req.body).slice(0, 500) } : null,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          })
          .catch(() => {});
      }
    });

    return next();
  };
}

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
  authenticate,
  requireAdmin,
  optionalAuth,
  requirePermission,
  requireProfile,
  auditLog,

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
