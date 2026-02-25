/**
 * CATMAT Service - SINGEM
 * Serviço de domínio para busca e importação CATMAT
 * Usa PostgreSQL para cache local do catálogo
 */

const db = require('../../config/database');

/**
 * Jobs em execução (cache em memória)
 */
const jobs = new Map();

/**
 * Serviço CATMAT
 */
class CatmatService {
  /**
   * Busca materiais no cache local com autocomplete
   * @param {string} query - Termo de busca (min 3 chars)
   * @param {Object} options - Opções de busca
   * @returns {Promise<{dados: Array, total: number}>}
   */
  async search(query, { limite = 20, offset = 0, apenasAtivos = true } = {}) {
    if (!query || query.length < 3) {
      return { dados: [], total: 0 };
    }

    const params = [];
    let paramIdx = 0;

    // Busca usando trigram para melhor performance em autocomplete
    let sql = `
      SELECT
        id,
        codigo,
        descricao,
        unidade,
        catmat_id,
        catmat_grupo,
        catmat_classe,
        catmat_padrao_desc,
        catmat_sustentavel,
        natureza_despesa,
        subelemento,
        ativo,
        fonte,
        updated_at
      FROM materials
      WHERE 1=1
    `;

    // Filtro por texto (usando trigram similarity ou ILIKE)
    paramIdx++;
    sql += ` AND (
      descricao ILIKE $${paramIdx}
      OR codigo ILIKE $${paramIdx}
      OR catmat_padrao_desc ILIKE $${paramIdx}
    )`;
    params.push(`%${query}%`);

    // Filtro por ativos
    if (apenasAtivos) {
      sql += ' AND ativo = true';
    }

    // Ordenação: prioriza matches exatos e por relevância
    sql += ` ORDER BY
      CASE WHEN descricao ILIKE $${paramIdx} THEN 0 ELSE 1 END,
      CASE WHEN catmat_id IS NOT NULL THEN 0 ELSE 1 END,
      descricao
    `;

    // Conta total antes de paginar
    const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await db.query(countSql.split('ORDER BY')[0], params);
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Paginação
    paramIdx++;
    sql += ` LIMIT $${paramIdx}`;
    params.push(limite);

    paramIdx++;
    sql += ` OFFSET $${paramIdx}`;
    params.push(offset);

    const result = await db.query(sql, params);

    return {
      dados: result.rows,
      total,
      pagina: Math.floor(offset / limite) + 1,
      totalPaginas: Math.ceil(total / limite)
    };
  }

  /**
   * Busca material por código CATMAT
   * @param {number|string} codigo - Código CATMAT
   * @returns {Promise<Object|null>}
   */
  async findByCodigo(codigo) {
    const result = await db.query(`SELECT * FROM materials WHERE catmat_id = $1 OR codigo = $2 LIMIT 1`, [
      parseInt(codigo),
      String(codigo)
    ]);
    return result.rows[0] || null;
  }

  /**
   * Busca material por ID interno
   * @param {number} id - ID do material
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return db.findById('materials', id);
  }

  /**
   * Retorna estatísticas do cache CATMAT
   * @returns {Promise<Object>}
   */
  async getStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE catmat_id IS NOT NULL) as com_catmat,
        COUNT(*) FILTER (WHERE ativo = true) as ativos,
        COUNT(*) FILTER (WHERE catmat_sustentavel = true) as sustentaveis,
        MAX(catmat_atualizado_em) as ultima_atualizacao
      FROM materials
    `);

    const importLog = await db.query(`
      SELECT * FROM catmat_import_log
      ORDER BY created_at DESC LIMIT 1
    `);

    return {
      sucesso: true,
      dados: {
        ...result.rows[0],
        ultimaImportacao: importLog.rows[0] || null
      }
    };
  }

  /**
   * Retorna status de importação atual
   */
  getImportStatus() {
    return (
      Array.from(jobs.values())
        .filter((j) => j.status === 'running')
        .pop() || null
    );
  }

  /**
   * Inicia importação de materiais (job assíncrono)
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

    // Nota: A importação real é feita via script import-catmat.js
    // Este endpoint apenas inicia e monitora
    const job = jobs.get(jobId);
    job.status = 'info';
    job.message = 'Use o script import-catmat.js para importar dados. Este endpoint é apenas para monitoramento.';

    return { jobId, status: 'info', message: job.message };
  }

  /**
   * Retorna status de um job de importação
   * @param {string} jobId
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
