/**
 * Gov.br Provider Stub - SINGEM
 *
 * Stub "Not implemented", mas já com assinaturas e leitura de env.
 * Quando implementado, seguirá fluxo OIDC:
 * 1. getAuthorizationUrl() → redireciona usuário pro gov.br
 * 2. exchangeCodeForProfile() → troca code por token + userinfo
 */

const { config } = require('../../../config');

class GovBrProviderStub {
  constructor() {
    this.clientId = config.govbr.clientId;
    this.clientSecret = config.govbr.clientSecret;
    this.redirectUri = config.govbr.redirectUri;
    this.issuer = config.govbr.issuer;
    this.enabled = config.govbr.enabled;
  }

  /**
   * Gera URL de autorização OIDC
   * @param {object} params - { state, nonce, redirectUri }
   * @returns {Promise<{url: string, state: string}>}
   */
  async getAuthorizationUrl({ state, nonce, redirectUri } = {}) {
    const err = new Error('gov.br OIDC authorize URL not implemented');
    err.statusCode = 501;
    err.details = {
      state,
      nonce,
      redirectUri: redirectUri ?? this.redirectUri,
      issuer: this.issuer,
      _contract: {
        description: 'Quando implementado, este método deve:',
        steps: [
          '1. Gerar state e nonce se não fornecidos',
          '2. Montar URL: {issuer}/authorize?client_id=...&scope=openid+email+profile+govbr_confiabilidades&response_type=code',
          '3. Retornar { url, state, nonce }'
        ],
        scopes: ['openid', 'email', 'profile', 'govbr_confiabilidades']
      }
    };
    throw err;
  }

  /**
   * Troca authorization code por profile normalizado
   * @param {object} params - { code, redirectUri }
   * @returns {Promise<object>} Profile normalizado
   */
  async exchangeCodeForProfile({ code, redirectUri } = {}) {
    const err = new Error('gov.br OIDC code exchange not implemented');
    err.statusCode = 501;
    err.details = {
      code: code ? `${code.substring(0, 10)}...` : null,
      redirectUri: redirectUri ?? this.redirectUri,
      _contract: {
        description: 'Quando implementado, este método deve:',
        steps: [
          '1. POST {issuer}/token com code + client_secret',
          '2. GET {issuer}/userinfo com access_token',
          '3. Normalizar claims para profile padrão',
          '4. Retornar profile normalizado'
        ],
        expectedReturn: {
          provider: 'govbr',
          providerUserId: 'sub do token',
          cpf: '00000000000',
          name: 'Nome Completo',
          email: 'email@dominio',
          level: 'bronze|prata|ouro'
        }
      }
    };
    throw err;
  }

  /**
   * Verifica se integração está configurada
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  /**
   * Retorna info de configuração (sem secrets)
   * @returns {object}
   */
  getConfig() {
    return {
      enabled: this.enabled,
      configured: this.isConfigured(),
      issuer: this.issuer,
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      redirectUri: this.redirectUri
    };
  }
}

const govbrProvider = new GovBrProviderStub();

module.exports = govbrProvider;
module.exports.GovBrProviderStub = GovBrProviderStub;
