/**
 * SERPRO Client - STUB
 * Cliente HTTP para APIs do SERPRO
 *
 * Quando implementado: conecta-se ao gateway.apiserpro.serpro.gov.br
 * Hoje: stub que documenta contrato esperado
 */

/**
 * Client stub para consumir APIs SERPRO
 */
class SerproClient {
  constructor() {
    this.baseUrl = process.env.SERPRO_BASE_URL || 'https://gateway.apiserpro.serpro.gov.br';
    this.apiKey = process.env.SERPRO_API_KEY || '';
    this.consumerSecret = process.env.SERPRO_CONSUMER_SECRET || '';
  }

  /**
   * Verifica saúde do gateway SERPRO
   * @returns {Promise<{ online: boolean, latency?: number }>}
   */
  async health() {
    const error = new Error('SERPRO health check not implemented');
    error.code = 'SERPRO_NOT_IMPLEMENTED';
    error.status = 501;
    error._stub = true;
    error._contract = {
      description: 'Quando implementado, deve verificar:',
      output: { online: 'boolean', latency: 'ms de resposta' },
      endpoint: `${this.baseUrl}/health`
    };
    throw error;
  }

  /**
   * Testa conexão com autenticação OAuth2
   * @returns {Promise<{ success: boolean, expiresIn?: number }>}
   */
  async testConnection() {
    const error = new Error('SERPRO connection test not implemented');
    error.code = 'SERPRO_NOT_IMPLEMENTED';
    error.status = 501;
    error._stub = true;
    error._contract = {
      description: 'Quando implementado, deve:',
      steps: [
        '1. Autenticar com Client Credentials',
        '2. Obter token de acesso OAuth2',
        '3. Retornar expiresIn do token'
      ],
      auth: 'OAuth2 Client Credentials',
      tokenEndpoint: `${this.baseUrl}/token`
    };
    throw error;
  }

  /**
   * Verifica se client está configurado
   */
  isConfigured() {
    return !!(this.baseUrl && this.apiKey && this.consumerSecret);
  }
}

module.exports = new SerproClient();
module.exports.SerproClient = SerproClient;
