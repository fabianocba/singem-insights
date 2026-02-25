/**
 * Auth Middleware - SINGEM (Domain Layer)
 * Camada compatível que delega para o middleware único do servidor.
 */

const {
  authenticate,
  requireAdmin,
  requirePermission,
  requireProfile,
  optionalAuth,
  auditLog
} = require('../../middleware/auth');

module.exports = {
  authenticate,
  requireAdmin,
  requirePermission,
  requireProfile,
  optionalAuth,
  auditLog
};
