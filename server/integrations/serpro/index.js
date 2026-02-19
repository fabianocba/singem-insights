/**
 * SERPRO Integration - SINGEM
 * Interface pública da integração SERPRO
 *
 * IMPORTANTE: O domínio do SINGEM usa apenas este módulo.
 * Não conhece detalhes de implementação (client, mapper, etc.)
 *
 * @example
 * const serpro = require('../integrations/serpro');
 * const { online } = await serpro.health();
 */

const serproClient = require('./serproClient.stub');

/**
 * Interface pública - apenas métodos expostos ao domínio SINGEM
 */
module.exports = {
  /**
   * Verifica saúde do gateway SERPRO
   * @returns {Promise<{ online: boolean, latency?: number }>}
   */
  health: () => serproClient.health(),

  /**
   * Testa conexão autenticada com OAuth2
   * @returns {Promise<{ success: boolean, expiresIn?: number }>}
   */
  testConnection: () => serproClient.testConnection(),

  /**
   * Verifica se integração está configurada
   * @returns {boolean}
   */
  isConfigured: () => serproClient.isConfigured()
};
