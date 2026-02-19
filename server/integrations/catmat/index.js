/**
 * CATMAT Integration - SINGEM
 * Interface pública da integração CATMAT
 *
 * IMPORTANTE: O domínio do SINGEM usa apenas este módulo.
 * Não conhece detalhes de implementação (client, mapper, etc.)
 *
 * @example
 * const catmat = require('../integrations/catmat');
 * const { jobId } = await catmat.importMaterials({ since: '2025-01-01' });
 * const status = catmat.getStatus(jobId);
 */

const catmatService = require('./catmatService');

/**
 * Interface pública - apenas métodos expostos ao domínio SINGEM
 */
module.exports = {
  /**
   * Inicia importação de materiais CATMAT
   * @param {{ since?: string, forceSync?: boolean }} options
   * @returns {Promise<{ jobId: string, status: string }>}
   */
  importMaterials: (options) => catmatService.importMaterials(options),

  /**
   * Retorna status de um job de importação
   * @param {string} jobId
   * @returns {{ id: string, status: string, progress?: number } | null}
   */
  getStatus: (jobId) => catmatService.getStatus(jobId),

  /**
   * Lista jobs recentes
   */
  listJobs: () => catmatService.listJobs()
};
