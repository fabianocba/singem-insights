/**
 * CATMAT Client - STUB
 * Cliente HTTP para API CATMAT (Portal de Compras)
 *
 * Quando implementado: conecta-se ao endpoint real do SIASG
 * Hoje: stub que documenta contrato esperado
 */

/**
 * Client stub para consumir API CATMAT
 */
class CatmatClient {
  constructor() {
    this.baseUrl = process.env.CATMAT_API_URL || '';
    this.apiKey = process.env.CATMAT_API_KEY || '';
  }

  /**
   * Busca catálogo de materiais
   * @param {{ since?: string }} params - Filtro por data de atualização (ISO)
   * @returns {Promise<{ items: object[], lastSync: string }>}
   */
  async fetchCatalog({ since: _since } = {}) {
    const error = new Error('CATMAT API not implemented');
    error.code = 'CATMAT_NOT_IMPLEMENTED';
    error.status = 501;
    error._stub = true;
    error._contract = {
      description: 'Quando implementado, deve retornar:',
      input: { since: 'ISO date string para busca incremental' },
      output: {
        items: 'Array de CatmatItem (id, descricao, unidade, grupo, classe, sustentavel, status)',
        lastSync: 'ISO timestamp da última atualização'
      },
      source: 'https://www.gov.br/compras/pt-br'
    };
    throw error;
  }

  /**
   * Verifica se client está configurado
   */
  isConfigured() {
    return !!(this.baseUrl && this.apiKey);
  }
}

module.exports = new CatmatClient();
module.exports.CatmatClient = CatmatClient;
