/**
 * Auth Middleware - SINGEM (Domain Layer)
 * Middleware de autenticação e autorização
 *
 * Centraliza validação de JWT e verificação de permissões RBAC.
 */

const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const rbac = require('./rbac');

const JWT_SECRET = process.env.JWT_SECRET || 'desenvolvimento_nao_use_em_producao';

/**
 * Middleware que requer autenticação
 * Valida JWT e injeta user no request
 */
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

      // Busca usuário no banco para validar se ainda existe e está ativo
      const user = await db.findById('usuarios', decoded.id);

      if (!user || !user.ativo) {
        return res.status(401).json({ erro: 'Usuário inativo ou não encontrado' });
      }

      // Anexa usuário ao request
      req.user = {
        id: user.id,
        login: user.login,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        authProvider: user.auth_provider || 'local'
      };

      return next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ erro: 'Token expirado', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ erro: 'Token inválido' });
    }
  } catch (err) {
    console.error('[AuthMiddleware] Erro:', err);
    return res.status(500).json({ erro: 'Erro interno de autenticação' });
  }
}

/**
 * Middleware que requer perfil admin
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  if (!rbac.isAdmin(req.user)) {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }

  return next();
}

/**
 * Factory para middleware de permissão específica
 * @param {string} modulo - Módulo do sistema
 * @param {string} acao - Ação requerida
 * @returns {Function} Middleware
 *
 * @example
 * router.post('/empenhos', authenticate, requirePermission('empenhos', 'criar'), handler);
 */
function requirePermission(modulo, acao) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    if (!rbac.hasPermission(req.user, modulo, acao)) {
      // Log tentativa de acesso não autorizado
      rbac
        .logAudit({
          userId: req.user.id,
          action: 'ACCESS_DENIED',
          module: modulo,
          entityType: null,
          entityId: null,
          changes: { acao },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        })
        .catch(() => {});

      return res.status(403).json({
        erro: 'Permissão negada',
        modulo,
        acao
      });
    }

    return next();
  };
}

/**
 * Factory para middleware que requer perfil mínimo
 * @param {string} perfilMinimo - Perfil mínimo requerido
 * @returns {Function} Middleware
 */
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

/**
 * Middleware opcional de autenticação
 * Não falha se não tiver token, mas injeta user se tiver
 */
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
          id: user.id,
          login: user.login,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil,
          authProvider: user.auth_provider || 'local'
        };
      }
    }
  } catch (_err) {
    // Token inválido, mas não é erro - apenas não injeta user
  }

  req.user = req.user || null;
  return next();
}

/**
 * Middleware de logging de auditoria para ações sensíveis
 * @param {string} modulo - Módulo do sistema
 * @param {string} action - Ação sendo realizada
 * @returns {Function} Middleware
 */
function auditLog(modulo, action) {
  return (req, res, next) => {
    // Registra após a resposta
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

    next();
  };
}

module.exports = {
  authenticate,
  requireAdmin,
  requirePermission,
  requireProfile,
  optionalAuth,
  auditLog
};
