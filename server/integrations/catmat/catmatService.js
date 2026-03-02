/**
 * CATMAT Service - SINGEM
 * Integração oficial com API de Dados Abertos do Compras + cache PostgreSQL.
 */

const db = require('../../config/database');
const { config } = require('../../config');
const comprasApiClient = require('../../services/comprasApiClient');

const jobs = new Map();

const runtime = {
  lastRequestAt: 0
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractMaterialList(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.materiais)) {
    return payload.materiais;
  }

  if (payload._embedded) {
    if (Array.isArray(payload._embedded.materiais)) {
      return payload._embedded.materiais;
    }

    const values = Object.values(payload._embedded);
    const firstArray = values.find(Array.isArray);
    if (firstArray) {
      return firstArray;
    }
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

// eslint-disable-next-line complexity
function normalizeMaterial(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const codigoRaw = raw.id || raw.codigo || raw.catmat_id || raw.cod_item || raw.cod;
  const descricao =
    raw.descricao || raw.descricao_item || raw.nome || raw.descricao_padrao || raw.catmat_padrao_desc || null;

  if (!codigoRaw || !descricao) {
    return null;
  }

  const codigo = String(codigoRaw).replace(/\D/g, '');
  if (!codigo) {
    return null;
  }

  const statusRaw = (raw.status || raw.situacao || raw.ativo || '').toString().toUpperCase();

  return {
    codigo,
    descricao: String(descricao).trim().slice(0, 500),
    id_grupo: raw.id_grupo || raw.grupo_id || raw.cod_grupo || null,
    id_classe: raw.id_classe || raw.classe_id || raw.cod_classe || null,
    id_pdm: raw.id_pdm || raw.pdm_id || raw.cod_pdm || null,
    status: raw.status || raw.situacao || (statusRaw === 'INATIVO' ? 'INATIVO' : 'ATIVO'),
    sustentavel: Boolean(raw.sustentavel || raw.item_sustentavel || raw.catmat_sustentavel),
    unidade: raw.unidade || raw.unidade_fornecimento || 'UN',
    fonte: 'api_oficial_compras',
    raw
  };
}

class CatmatService {
  async _waitRateLimit() {
    const minInterval = Number(config.comprasApi?.rateLimitMs || 250);
    const now = Date.now();
    const elapsed = now - runtime.lastRequestAt;
    if (elapsed < minInterval) {
      await sleep(minInterval - elapsed);
    }
    runtime.lastRequestAt = Date.now();
  }

  async _fetchOfficial(pathname, params = {}) {
    try {
      await this._waitRateLimit();

      const response = await comprasApiClient.get(pathname, {
        query: params,
        userAgent: 'SINGEM-CATMAT/2.0'
      });

      return response.data || {};
    } catch (error) {
      const wrapped = new Error(`Falha ao consultar API oficial CATMAT: ${error?.message || 'erro desconhecido'}`);
      wrapped.cause = error;
      wrapped.code = 'COMPRAS_API_UNAVAILABLE';
      if (error?.statusCode || error?.upstreamStatus) {
        wrapped.status = Number(error?.statusCode || error?.upstreamStatus);
      }
      throw wrapped;
    }
  }

  async _upsertCache(material) {
    await db.query(
      `
      INSERT INTO catmat_cache (
        codigo, descricao, id_grupo, id_classe, id_pdm, status,
        sustentavel, unidade, fonte, payload_raw, fetched_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
      ON CONFLICT (codigo) DO UPDATE SET
        descricao = EXCLUDED.descricao,
        id_grupo = EXCLUDED.id_grupo,
        id_classe = EXCLUDED.id_classe,
        id_pdm = EXCLUDED.id_pdm,
        status = EXCLUDED.status,
        sustentavel = EXCLUDED.sustentavel,
        unidade = EXCLUDED.unidade,
        fonte = EXCLUDED.fonte,
        payload_raw = EXCLUDED.payload_raw,
        fetched_at = NOW(),
        updated_at = NOW()
    `,
      [
        material.codigo,
        material.descricao,
        material.id_grupo,
        material.id_classe,
        material.id_pdm,
        material.status,
        material.sustentavel,
        material.unidade || 'UN',
        material.fonte,
        JSON.stringify(material.raw || {})
      ]
    );
  }

  async ensureMaterialMirror(material) {
    const codigo = String(material.codigo).replace(/\D/g, '');
    if (!codigo) {
      return null;
    }

    await db.query(
      `
      INSERT INTO materials (
        codigo, descricao, unidade, catmat_id, catmat_grupo, catmat_classe,
        catmat_padrao_desc, catmat_sustentavel, fonte, ativo, catmat_atualizado_em, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
      ON CONFLICT (codigo) DO UPDATE SET
        descricao = EXCLUDED.descricao,
        unidade = EXCLUDED.unidade,
        catmat_id = EXCLUDED.catmat_id,
        catmat_grupo = EXCLUDED.catmat_grupo,
        catmat_classe = EXCLUDED.catmat_classe,
        catmat_padrao_desc = EXCLUDED.catmat_padrao_desc,
        catmat_sustentavel = EXCLUDED.catmat_sustentavel,
        fonte = EXCLUDED.fonte,
        ativo = EXCLUDED.ativo,
        catmat_atualizado_em = NOW(),
        updated_at = NOW()
      RETURNING *
    `,
      [
        codigo,
        material.descricao,
        material.unidade || 'UN',
        Number(codigo),
        material.id_grupo ? String(material.id_grupo).slice(0, 100) : null,
        material.id_classe ? String(material.id_classe).slice(0, 100) : null,
        material.descricao,
        Boolean(material.sustentavel),
        material.fonte || 'api_oficial_compras',
        String(material.status || 'ATIVO').toUpperCase() !== 'INATIVO'
      ]
    );

    const mirror = await db.query('SELECT * FROM materials WHERE codigo = $1 LIMIT 1', [codigo]);
    return mirror.rows[0] || null;
  }

  async _queryCacheByTerm(query, { limite = 20, offset = 0, apenasAtivos = true } = {}) {
    const params = [`%${query}%`];
    let sql = `
      SELECT codigo, descricao, id_grupo, id_classe, id_pdm, status, sustentavel,
             unidade, fonte, fetched_at, updated_at
      FROM catmat_cache
      WHERE (descricao ILIKE $1 OR codigo ILIKE $1)
    `;

    if (apenasAtivos) {
      sql += ` AND (status IS NULL OR UPPER(status) NOT IN ('INATIVO', 'CANCELADO'))`;
    }

    const countResult = await db.query(`SELECT COUNT(*) AS total FROM (${sql}) AS sub`, params);
    const total = Number(countResult.rows[0]?.total || 0);

    params.push(limite);
    params.push(offset);

    sql += ' ORDER BY descricao LIMIT $2 OFFSET $3';
    const result = await db.query(sql, params);

    const dados = result.rows.map((row) => ({
      codigo: row.codigo,
      catmat_id: Number(row.codigo),
      descricao: row.descricao,
      catmat_padrao_desc: row.descricao,
      unidade: row.unidade,
      id_grupo: row.id_grupo,
      id_classe: row.id_classe,
      id_pdm: row.id_pdm,
      status: row.status,
      catmat_sustentavel: row.sustentavel,
      fonte: row.fonte,
      fetched_at: row.fetched_at,
      updated_at: row.updated_at
    }));

    return { dados, total };
  }

  async search(query, { limite = 20, offset = 0, apenasAtivos = true } = {}) {
    if (!query || query.length < 3) {
      return { dados: [], total: 0, pagina: 1, totalPaginas: 0 };
    }

    const clampedLimit = Math.max(1, Math.min(Number(limite) || 20, 100));
    const safeOffset = Math.max(0, Number(offset) || 0);

    try {
      const payload = await this._fetchOfficial('/materiais/v1/materiais.json', {
        descricao_item: query,
        offset: safeOffset,
        limit: clampedLimit
      });

      const normalized = extractMaterialList(payload).map(normalizeMaterial).filter(Boolean);
      const filtered = apenasAtivos
        ? normalized.filter((item) => String(item.status || 'ATIVO').toUpperCase() !== 'INATIVO')
        : normalized;

      for (const item of filtered) {
        await this._upsertCache(item);
      }

      return {
        dados: filtered.map((item) => ({
          codigo: item.codigo,
          catmat_id: Number(item.codigo),
          descricao: item.descricao,
          catmat_padrao_desc: item.descricao,
          unidade: item.unidade,
          id_grupo: item.id_grupo,
          id_classe: item.id_classe,
          id_pdm: item.id_pdm,
          status: item.status,
          catmat_sustentavel: item.sustentavel,
          fonte: item.fonte,
          fetched_at: new Date().toISOString()
        })),
        total: Number(payload?.total || payload?.count || filtered.length || 0),
        pagina: Math.floor(safeOffset / clampedLimit) + 1,
        totalPaginas: null,
        fonte: 'api_oficial_compras'
      };
    } catch (apiError) {
      const fallback = await this._queryCacheByTerm(query, {
        limite: clampedLimit,
        offset: safeOffset,
        apenasAtivos
      });

      return {
        ...fallback,
        pagina: Math.floor(safeOffset / clampedLimit) + 1,
        totalPaginas: Math.ceil((fallback.total || 0) / clampedLimit),
        fonte: 'cache_local',
        aviso: 'API oficial temporariamente indisponível. Resultado retornado do cache local mais recente.',
        erroApi: apiError.message
      };
    }
  }

  async findByCodigo(codigo) {
    const cleanCode = String(codigo || '').replace(/\D/g, '');
    if (!cleanCode) {
      return null;
    }

    const cached = await db.query(
      `
      SELECT codigo, descricao, id_grupo, id_classe, id_pdm, status, sustentavel,
             unidade, fonte, fetched_at, updated_at
      FROM catmat_cache
      WHERE codigo = $1
      LIMIT 1
    `,
      [cleanCode]
    );

    const ttlHours = Number(config.catmatCacheTtlHours || 168);
    const cacheRow = cached.rows[0] || null;
    const isFresh =
      cacheRow &&
      cacheRow.fetched_at &&
      Date.now() - new Date(cacheRow.fetched_at).getTime() < ttlHours * 60 * 60 * 1000;

    if (cacheRow && isFresh) {
      return {
        ...cacheRow,
        catmat_id: Number(cacheRow.codigo),
        catmat_padrao_desc: cacheRow.descricao
      };
    }

    try {
      const payload = await this._fetchOfficial(`/materiais/id/material/${cleanCode}.json`);
      const normalized = normalizeMaterial(payload);

      if (!normalized) {
        if (cacheRow) {
          return {
            ...cacheRow,
            catmat_id: Number(cacheRow.codigo),
            catmat_padrao_desc: cacheRow.descricao
          };
        }
        return null;
      }

      await this._upsertCache(normalized);

      return {
        codigo: normalized.codigo,
        catmat_id: Number(normalized.codigo),
        descricao: normalized.descricao,
        catmat_padrao_desc: normalized.descricao,
        unidade: normalized.unidade,
        id_grupo: normalized.id_grupo,
        id_classe: normalized.id_classe,
        id_pdm: normalized.id_pdm,
        status: normalized.status,
        catmat_sustentavel: normalized.sustentavel,
        fonte: normalized.fonte,
        fetched_at: new Date().toISOString()
      };
    } catch {
      if (!cacheRow) {
        return null;
      }

      return {
        ...cacheRow,
        catmat_id: Number(cacheRow.codigo),
        catmat_padrao_desc: cacheRow.descricao,
        aviso: 'API oficial indisponível. Retornando dado do cache local.'
      };
    }
  }

  async validateAndHydrate(codigo) {
    const material = await this.findByCodigo(codigo);
    if (!material) {
      return null;
    }

    await this.ensureMaterialMirror({
      codigo: material.codigo || material.catmat_id,
      descricao: material.descricao || material.catmat_padrao_desc,
      id_grupo: material.id_grupo,
      id_classe: material.id_classe,
      id_pdm: material.id_pdm,
      status: material.status,
      sustentavel: material.catmat_sustentavel,
      unidade: material.unidade,
      fonte: material.fonte
    });

    return material;
  }

  async runSyncBatch({ offset = 0, limite = 200, termo = '' } = {}) {
    const payload = await this._fetchOfficial('/materiais/v1/materiais.json', {
      descricao_item: termo || undefined,
      offset,
      limit: limite
    });

    const normalized = extractMaterialList(payload).map(normalizeMaterial).filter(Boolean);

    let imported = 0;
    for (const item of normalized) {
      await this._upsertCache(item);
      await this.ensureMaterialMirror(item);
      imported++;
    }

    return {
      imported,
      totalApi: Number(payload?.total || payload?.count || normalized.length || 0),
      hasMore: normalized.length >= limite,
      nextOffset: offset + limite
    };
  }

  async getStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(status, 'ATIVO')) NOT IN ('INATIVO', 'CANCELADO')) as ativos,
        COUNT(*) FILTER (WHERE sustentavel = true) as sustentaveis,
        MAX(updated_at) as ultima_atualizacao,
        MAX(fetched_at) as ultima_coleta
      FROM catmat_cache
    `);

    const importLog = await db.query('SELECT * FROM catmat_import_log ORDER BY created_at DESC LIMIT 1');

    return {
      sucesso: true,
      dados: {
        ...result.rows[0],
        ultimaImportacao: importLog.rows[0] || null
      }
    };
  }

  async importMaterials({ since, forceSync = false } = {}) {
    const jobId = `catmat-${Date.now()}`;

    jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      started: new Date().toISOString(),
      since: since || null,
      forceSync: Boolean(forceSync),
      progress: 0,
      total: 0,
      imported: 0,
      errors: []
    });

    const job = jobs.get(jobId);
    job.status = 'info';
    job.message = 'Execute o script node scripts/import-catmat.js para sincronização paginada oficial.';

    return { jobId, status: 'info', message: job.message };
  }

  getStatus(jobId) {
    return jobs.get(jobId) || null;
  }

  listJobs() {
    return Array.from(jobs.values()).slice(-20);
  }
}

module.exports = new CatmatService();
module.exports.CatmatService = CatmatService;
