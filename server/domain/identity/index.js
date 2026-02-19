/**
 * Identity Module - SINGEM
 * Interface pública do módulo de identidade
 *
 * @example
 * const identity = require('./domain/identity');
 * const result = await identity.authenticateLocal(login, senha);
 */

const identityService = require('./identityService');
const authMiddleware = require('./authMiddleware');
const rbac = require('./rbac');
const userLinkService = require('./userLinkService');
const normalizedProfile = require('./normalizedProfile');

module.exports = {
  // Serviço principal de identidade
  identityService,

  // Middlewares Express
  ...authMiddleware,

  // RBAC
  rbac,
  hasPermission: rbac.hasPermission.bind(rbac),
  isAdmin: rbac.isAdmin.bind(rbac),
  logAudit: rbac.logAudit.bind(rbac),
  Perfis: rbac.Perfis,
  Modulos: rbac.Modulos,
  Acoes: rbac.Acoes,

  // Vinculação de contas
  userLinkService,

  // Perfil normalizado
  normalizedProfile,
  IdentityProvider: normalizedProfile.IdentityProvider,
  ConfiabilityLevel: normalizedProfile.ConfiabilityLevel
};
