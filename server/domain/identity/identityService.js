/**
 * Identity Service - SINGEM
 *
 * Provider Pattern:
 * - Hoje: local
 * - Amanhã: govbr (OIDC)
 *
 * Este service padroniza o retorno de "identidade" para o resto do sistema.
 * O SINGEM continua responsável por RBAC/permissões e emissão de token interno.
 */

const localProvider = require('./providers/localProvider');
const govbrProvider = require('./providers/govbrProvider.stub');

class IdentityService {
  constructor({ providers } = {}) {
    this.providers = providers ?? {
      local: localProvider,
      govbr: govbrProvider
    };
  }

  getProvider(providerName) {
    const provider = this.providers?.[providerName];
    if (!provider) {
      const err = new Error(`Identity provider not supported: ${providerName}`);
      err.statusCode = 400;
      throw err;
    }
    return provider;
  }

  /**
   * Autenticação genérica via provider
   * @param {string} providerName - Nome do provider (local, govbr)
   * @param {object} payload - Dados de autenticação
   * @returns {Promise<object>} Profile normalizado
   */
  async authenticate(providerName, payload) {
    const provider = this.getProvider(providerName);
    if (typeof provider.authenticate !== 'function') {
      const err = new Error(`Provider "${providerName}" does not support authenticate()`);
      err.statusCode = 400;
      throw err;
    }
    return provider.authenticate(payload);
  }

  /**
   * Fluxo gov.br (futuro): gera URL de autorização
   * @param {string} providerName - Nome do provider
   * @param {object} params - { state, nonce, redirectUri }
   */
  async getAuthorizationUrl(providerName, params) {
    const provider = this.getProvider(providerName);
    if (typeof provider.getAuthorizationUrl !== 'function') {
      const err = new Error(`Provider "${providerName}" does not support getAuthorizationUrl()`);
      err.statusCode = 400;
      throw err;
    }
    return provider.getAuthorizationUrl(params);
  }

  /**
   * Fluxo gov.br (futuro): troca code por profile normalizado
   * @param {string} providerName - Nome do provider
   * @param {object} params - { code, redirectUri }
   */
  async exchangeCodeForProfile(providerName, params) {
    const provider = this.getProvider(providerName);
    if (typeof provider.exchangeCodeForProfile !== 'function') {
      const err = new Error(`Provider "${providerName}" does not support exchangeCodeForProfile()`);
      err.statusCode = 400;
      throw err;
    }
    return provider.exchangeCodeForProfile(params);
  }

  /**
   * Verifica se provider está habilitado
   * @param {string} providerName
   * @returns {boolean}
   */
  isProviderEnabled(providerName) {
    if (providerName === 'local') {
      return true;
    }
    if (providerName === 'govbr') {
      return process.env.GOVBR_ENABLED === 'true';
    }
    return false;
  }

  /**
   * Retorna informações sobre provedores disponíveis
   */
  getProvidersInfo() {
    return {
      local: {
        enabled: true,
        name: 'Login Local',
        description: 'Autenticação com login e senha'
      },
      govbr: {
        enabled: this.isProviderEnabled('govbr'),
        name: 'Gov.br',
        description: 'Login Único do Governo Federal',
        issuer: process.env.GOVBR_ISSUER || 'https://sso.acesso.gov.br'
      }
    };
  }
}

const identityService = new IdentityService();

module.exports = identityService;
module.exports.IdentityService = IdentityService;
