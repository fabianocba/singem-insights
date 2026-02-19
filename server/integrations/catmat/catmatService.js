/**
 * CATMAT Service - SINGEM
 * Serviço de domínio para importação CATMAT
 */

const catmatClient = require('./catmatClient.stub');
const catmatMapper = require('./catmatMapper');
const catmatErrors = require('./catmatErrors');

/**
 * Jobs em execução (cache em memória)
 */
const jobs = new Map();

/**
 * Serviço de importação CATMAT
 */
class CatmatService {
  /**
   * Importa materiais do catálogo CATMAT
   * @param {{ since?: string, forceSync?: boolean }} options
   * @returns {Promise<{ jobId: string, status: string }>}
   */
  async importMaterials({ since, forceSync = false } = {}) {
    // Gera ID único para o job
    const jobId = `catmat-${Date.now()}`;

    // Registra job como pendente
    jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      started: new Date().toISOString(),
      progress: 0,
      total: 0,
      imported: 0,
      errors: []
    });

    // Execução assíncrona (não bloqueia resposta)
    setImmediate(async () => {
      try {
        jobs.get(jobId).status = 'running';

        // Busca dados da API (stub vai lançar erro)
        const { items, lastSync } = await catmatClient.fetchCatalog({ since: forceSync ? null : since });

        const job = jobs.get(jobId);
        job.total = items.length;

        // Normaliza e persiste
        const { materials, errors } = catmatMapper.batchToInternal(items);
        job.imported = materials.length;
        job.errors = errors;
        job.lastSync = lastSync;
        job.status = 'completed';
        job.finished = new Date().toISOString();
      } catch (err) {
        const job = jobs.get(jobId);
        job.status = 'failed';
        job.error = catmatErrors.normalize(err);
        job.finished = new Date().toISOString();
      }
    });

    return { jobId, status: 'pending' };
  }

  /**
   * Retorna status de um job de importação
   * @param {string} jobId
   * @returns {{ id: string, status: string, progress?: number, error?: object } | null}
   */
  getStatus(jobId) {
    return jobs.get(jobId) || null;
  }

  /**
   * Lista todos os jobs recentes
   */
  listJobs() {
    return Array.from(jobs.values()).slice(-20);
  }
}

module.exports = new CatmatService();
module.exports.CatmatService = CatmatService;
