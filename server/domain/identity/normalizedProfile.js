/**
 * Normalized Profile - SINGEM
 * Contrato do perfil normalizado de usuário
 *
 * Qualquer provider de identidade deve retornar dados neste formato.
 * Isso garante que o SINGEM funcione independente da fonte de autenticação.
 */

/**
 * Providers de identidade suportados
 * @readonly
 * @enum {string}
 */
const IdentityProvider = {
  LOCAL: 'local',
  GOVBR: 'govbr',
  LDAP: 'ldap',
  SAML: 'saml'
};

/**
 * Níveis de confiabilidade (baseado em gov.br)
 * @readonly
 * @enum {string}
 */
const ConfiabilityLevel = {
  BRONZE: 'bronze', // Cadastro básico (email/senha ou app gov.br)
  PRATA: 'prata', // Validação por certificado digital ou biometria
  OURO: 'ouro' // Certificado digital e validação presencial
};

/**
 * Cria perfil normalizado vazio
 * @returns {NormalizedProfile}
 */
function createEmptyProfile() {
  return {
    provider: null,
    providerUserId: null,
    cpf: null,
    name: null,
    email: null,
    level: null,
    verified: false,
    raw: null
  };
}

/**
 * Valida se perfil tem campos obrigatórios
 * @param {NormalizedProfile} profile
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateProfile(profile) {
  const errors = [];

  if (!profile) {
    return { valid: false, errors: ['Perfil é obrigatório'] };
  }

  if (!profile.provider) {
    errors.push('Provider é obrigatório');
  }

  if (!profile.providerUserId) {
    errors.push('ID do provider é obrigatório');
  }

  if (!profile.name) {
    errors.push('Nome é obrigatório');
  }

  // CPF ou email obrigatório
  if (!profile.cpf && !profile.email) {
    errors.push('CPF ou email é obrigatório');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Cria perfil normalizado a partir de dados locais
 * @param {object} user - Usuário do banco
 * @returns {NormalizedProfile}
 */
function fromLocalUser(user) {
  return {
    provider: IdentityProvider.LOCAL,
    providerUserId: String(user.id),
    cpf: user.cpf || null,
    name: user.nome,
    email: user.email,
    level: null,
    verified: true,
    raw: null
  };
}

/**
 * Cria perfil normalizado a partir de claims gov.br
 * @param {object} claims - Claims do token gov.br
 * @returns {NormalizedProfile}
 *
 * Claims esperados do gov.br:
 * - sub: ID único do usuário
 * - name: Nome completo
 * - email: Email (se autorizado)
 * - email_verified: Se email foi verificado
 * - phone_number: Telefone (se autorizado)
 * - cpf: CPF (scope 'cpf')
 * - picture: URL da foto (scope 'profile')
 * - profile: URL do perfil gov.br
 * - amr: Métodos de autenticação usados
 * - acr: Nível de autenticação
 */
function fromGovBrClaims(claims) {
  // Determina nível baseado no ACR
  let level = ConfiabilityLevel.BRONZE;
  if (claims.acr) {
    if (claims.acr.includes('ouro') || claims.acr.includes('gold')) {
      level = ConfiabilityLevel.OURO;
    } else if (claims.acr.includes('prata') || claims.acr.includes('silver')) {
      level = ConfiabilityLevel.PRATA;
    }
  }

  return {
    provider: IdentityProvider.GOVBR,
    providerUserId: claims.sub,
    cpf: claims.cpf?.replace(/\D/g, '') || null,
    name: claims.name || claims.nome_social || claims.nome,
    email: claims.email || null,
    level,
    verified: claims.email_verified === true,
    raw: claims
  };
}

/**
 * Cria perfil normalizado a partir de LDAP
 * @param {object} ldapEntry - Entrada LDAP
 * @returns {NormalizedProfile}
 */
function fromLdapEntry(ldapEntry) {
  return {
    provider: IdentityProvider.LDAP,
    providerUserId: ldapEntry.dn || ldapEntry.uid,
    cpf: ldapEntry.cpf || null,
    name: ldapEntry.cn || ldapEntry.displayName,
    email: ldapEntry.mail || null,
    level: null,
    verified: true,
    raw: ldapEntry
  };
}

/**
 * Sanitiza perfil removendo dados sensíveis para log
 * @param {NormalizedProfile} profile
 * @returns {object}
 */
function sanitizeForLog(profile) {
  if (!profile) {
    return null;
  }

  return {
    provider: profile.provider,
    providerUserId: profile.providerUserId?.slice(0, 8) + '...',
    cpf: profile.cpf ? profile.cpf.slice(0, 3) + '***' : null,
    name: profile.name,
    email: profile.email?.replace(/(.{2}).*@/, '$1***@'),
    level: profile.level,
    verified: profile.verified
    // raw removido intencionalmente
  };
}

/**
 * @typedef {Object} NormalizedProfile
 * @property {string} provider - Identificador do provider (local, govbr, ldap)
 * @property {string} providerUserId - ID único no provider externo
 * @property {string|null} cpf - CPF (apenas dígitos, 11 caracteres)
 * @property {string} name - Nome completo
 * @property {string|null} email - Email
 * @property {string|null} level - Nível de confiabilidade (bronze, prata, ouro)
 * @property {boolean} verified - Se email/identidade foi verificada
 * @property {object|null} raw - Dados originais do provider (não persistir)
 */

module.exports = {
  IdentityProvider,
  ConfiabilityLevel,
  createEmptyProfile,
  validateProfile,
  fromLocalUser,
  fromGovBrClaims,
  fromLdapEntry,
  sanitizeForLog
};
