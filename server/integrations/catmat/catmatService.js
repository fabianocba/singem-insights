/**
 * CATMAT Service - SINGEM
 * Integração oficial com API de Dados Abertos do Compras + cache PostgreSQL.
 */

const db = require('../../config/database');
const { config } = require('../../config');
const comprasApiClient = require('../../services/comprasApiClient');
const comprasGovGateway = require('../../services/gov-api/comprasGovGatewayService');
const catalogSearchService = require('../../services/ai-core/catalogSearchService');
const integrationCache = require('../core/integrationCache');
const { normalizeText } = require('../../utils/textNormalize');

const jobs = new Map();

const runtime = {
  lastRequestAt: 0,
  searchInFlight: new Map()
};

const CATMAT_SEARCH_CACHE_NAMESPACE = 'catmat:search';
const CATMAT_SEARCH_CACHE_TTL_SECONDS = Math.max(15, Number(config.catmatSearchCacheTtlSeconds || 90));

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

  const codigoRaw = raw.codigoItem || raw.id || raw.codigo || raw.catmat_id || raw.cod_item || raw.cod;
  const descricao =
    raw.descricaoItem ||
    raw.descricao ||
    raw.descricao_item ||
    raw.nome ||
    raw.descricao_padrao ||
    raw.catmat_padrao_desc ||
    null;

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
    id_grupo: raw.codigoGrupo || raw.id_grupo || raw.grupo_id || raw.cod_grupo || raw.grupoMaterial?.codigo || null,
    id_classe:
      raw.codigoClasse || raw.id_classe || raw.classe_id || raw.cod_classe || raw.classeMaterial?.codigo || null,
    id_pdm: raw.codigoPdm || raw.id_pdm || raw.pdm_id || raw.cod_pdm || raw.pdm?.codigo || null,
    descricao_grupo: raw.descricaoGrupo || raw.nomeGrupo || raw.grupoMaterial?.descricao || null,
    descricao_classe: raw.descricaoClasse || raw.nomeClasse || raw.classeMaterial?.descricao || null,
    descricao_pdm: raw.descricaoPdm || raw.nomePdm || raw.pdm?.descricao || null,
    status: raw.statusItem || raw.status || raw.situacao || (statusRaw === 'INATIVO' ? 'INATIVO' : 'ATIVO'),
    sustentavel: Boolean(raw.itemSustentavel || raw.sustentavel || raw.item_sustentavel || raw.catmat_sustentavel),
    unidade: raw.unidadeFornecimento || raw.unidade || raw.unidade_fornecimento || 'UN',
    fonte: 'api_oficial_compras',
    raw
  };
}

function pickMaterialValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function normalizeMaterialCode(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeMaterialText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function mapCatalogItemToSearchData(item = {}, extras = {}) {
  const codigo = normalizeMaterialCode(pickMaterialValue(item.codigoItem, item.codigo));
  const descricao = normalizeMaterialText(pickMaterialValue(item.descricaoItem, item.descricao)) || '';
  const unidade = normalizeMaterialText(pickMaterialValue(item.unidadeFornecimento, item.unidade)) || 'UN';
  const idGrupo = pickMaterialValue(item.codigoGrupo, item.id_grupo, item.grupoMaterial?.codigo);
  const idClasse = pickMaterialValue(item.codigoClasse, item.id_classe, item.classeMaterial?.codigo);
  const idPdm = pickMaterialValue(item.codigoPdm, item.id_pdm, item.pdm?.codigo);
  const descricaoGrupo = normalizeMaterialText(pickMaterialValue(item.descricaoGrupo, item.grupoMaterial?.descricao));
  const descricaoClasse = normalizeMaterialText(
    pickMaterialValue(item.descricaoClasse, item.classeMaterial?.descricao)
  );
  const descricaoPdm = normalizeMaterialText(pickMaterialValue(item.descricaoPdm, item.pdm?.descricao));
  const status = normalizeMaterialText(pickMaterialValue(item.statusItem, item.status)) || 'ATIVO';
  const fonte = normalizeMaterialText(pickMaterialValue(extras.fonte, item.fonte)) || 'api_oficial_compras';
  const fetchedAt = extras.fetchedAt || new Date().toISOString();
  const score = Number(extras.score || 0) || 0;

  return {
    codigo,
    catmat_id: Number(codigo),
    descricao,
    catmat_padrao_desc: descricao,
    unidade,
    id_grupo: idGrupo,
    id_classe: idClasse,
    id_pdm: idPdm,
    descricaoGrupo,
    descricaoClasse,
    descricaoPdm,
    status,
    catmat_sustentavel: Boolean(item.itemSustentavel || item.sustentavel || item.catmat_sustentavel),
    fonte,
    fetched_at: fetchedAt,
    score,
    raw: item
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

    try {
      await db.query(
        `
        INSERT INTO catmat_itens (codigo, descricao, descricao_norm, unidade, ativo, raw_json, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())
        ON CONFLICT (codigo) DO UPDATE SET
          descricao = EXCLUDED.descricao,
          descricao_norm = EXCLUDED.descricao_norm,
          unidade = EXCLUDED.unidade,
          ativo = EXCLUDED.ativo,
          raw_json = EXCLUDED.raw_json,
          updated_at = NOW()
      `,
        [
          material.codigo,
          material.descricao,
          normalizeText(material.descricao),
          material.unidade || 'UN',
          String(material.status || 'ATIVO').toUpperCase() !== 'INATIVO',
          JSON.stringify(material.raw || {})
        ]
      );
    } catch (error) {
      console.warn(`[CATMAT] Falha ao atualizar catmat_itens (single): ${error.message}`);
    }
  }

  async _upsertCacheBatch(materials = []) {
    const rows = Array.isArray(materials)
      ? materials
          .filter((item) => item && item.codigo && item.descricao)
          .map((item) => ({
            codigo: String(item.codigo),
            descricao: String(item.descricao).trim().slice(0, 500),
            id_grupo: item.id_grupo ? String(item.id_grupo).slice(0, 30) : null,
            id_classe: item.id_classe ? String(item.id_classe).slice(0, 30) : null,
            id_pdm: item.id_pdm ? String(item.id_pdm).slice(0, 30) : null,
            status: String(item.status || 'ATIVO').slice(0, 30),
            sustentavel: Boolean(item.sustentavel),
            unidade: String(item.unidade || 'UN').slice(0, 20),
            fonte: String(item.fonte || 'api_oficial_compras').slice(0, 100),
            payload_raw: item.raw || {}
          }))
      : [];

    if (rows.length === 0) {
      return;
    }

    await db.query(
      `
      WITH src AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          codigo TEXT,
          descricao TEXT,
          id_grupo TEXT,
          id_classe TEXT,
          id_pdm TEXT,
          status TEXT,
          sustentavel BOOLEAN,
          unidade TEXT,
          fonte TEXT,
          payload_raw JSONB
        )
      )
      INSERT INTO catmat_cache (
        codigo,
        descricao,
        id_grupo,
        id_classe,
        id_pdm,
        status,
        sustentavel,
        unidade,
        fonte,
        payload_raw,
        fetched_at,
        updated_at
      )
      SELECT
        codigo,
        descricao,
        id_grupo,
        id_classe,
        id_pdm,
        status,
        sustentavel,
        unidade,
        fonte,
        payload_raw,
        NOW(),
        NOW()
      FROM src
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
      [JSON.stringify(rows)]
    );

    const fastRows = rows.map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      descricao_norm: normalizeText(item.descricao),
      unidade: item.unidade || 'UN',
      ativo: String(item.status || 'ATIVO').toUpperCase() !== 'INATIVO',
      raw_json: item.payload_raw || {}
    }));

    try {
      await db.query(
        `
        WITH src AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS x(
            codigo TEXT,
            descricao TEXT,
            descricao_norm TEXT,
            unidade TEXT,
            ativo BOOLEAN,
            raw_json JSONB
          )
        )
        INSERT INTO catmat_itens (
          codigo,
          descricao,
          descricao_norm,
          unidade,
          ativo,
          raw_json,
          updated_at
        )
        SELECT
          codigo,
          descricao,
          descricao_norm,
          unidade,
          ativo,
          raw_json,
          NOW()
        FROM src
        ON CONFLICT (codigo) DO UPDATE SET
          descricao = EXCLUDED.descricao,
          descricao_norm = EXCLUDED.descricao_norm,
          unidade = EXCLUDED.unidade,
          ativo = EXCLUDED.ativo,
          raw_json = EXCLUDED.raw_json,
          updated_at = NOW()
      `,
        [JSON.stringify(fastRows)]
      );
    } catch (error) {
      console.warn(`[CATMAT] Falha ao atualizar catmat_itens (batch): ${error.message}`);
    }
  }

  _buildSearchCacheKey(query, { limite, offset, apenasAtivos, codigoPdm, detalhar }) {
    return `${String(query || '')
      .trim()
      .toLowerCase()}|${limite}|${offset}|${apenasAtivos ? 1 : 0}|${String(codigoPdm || '').trim()}|${detalhar ? 1 : 0}`;
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
             unidade, fonte, fetched_at, updated_at, payload_raw
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
      descricaoGrupo:
        row.payload_raw?.descricaoGrupo ||
        row.payload_raw?.nomeGrupo ||
        row.payload_raw?.grupoMaterial?.descricao ||
        null,
      descricaoClasse:
        row.payload_raw?.descricaoClasse ||
        row.payload_raw?.nomeClasse ||
        row.payload_raw?.classeMaterial?.descricao ||
        null,
      descricaoPdm:
        row.payload_raw?.descricaoPdm || row.payload_raw?.nomePdm || row.payload_raw?.pdm?.descricao || null,
      status: row.status,
      catmat_sustentavel: row.sustentavel,
      fonte: row.fonte,
      fetched_at: row.fetched_at,
      updated_at: row.updated_at,
      raw: row.payload_raw || null
    }));

    return { dados, total };
  }

  async search(query, { limite = 20, offset = 0, apenasAtivos = true, codigoPdm = null, detalhar = false } = {}) {
    const safeQuery = String(query || '').trim();
    if (!safeQuery || safeQuery.length < 3) {
      return { dados: [], total: 0, pagina: 1, totalPaginas: 0 };
    }

    const clampedLimit = Math.max(1, Math.min(Number(limite) || 20, 100));
    const safeOffset = Math.max(0, Number(offset) || 0);
    const safeApenasAtivos = String(apenasAtivos).toLowerCase() !== 'false';
    const safeCodigoPdm = String(codigoPdm || '').trim() || null;
    const safeDetalhar = detalhar === true || String(detalhar).toLowerCase() === 'true';
    const cacheKey = this._buildSearchCacheKey(safeQuery, {
      limite: clampedLimit,
      offset: safeOffset,
      apenasAtivos: safeApenasAtivos,
      codigoPdm: safeCodigoPdm,
      detalhar: safeDetalhar
    });

    const cached = integrationCache.get(CATMAT_SEARCH_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return {
        ...cached,
        cache: 'HIT'
      };
    }

    const inFlight = runtime.searchInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const searchPromise = (async () => {
      try {
        const ranked = await catalogSearchService.buscarMateriaisComRanking(
          safeQuery,
          {
            limite: clampedLimit,
            offset: safeOffset,
            codigoPdm: safeCodigoPdm,
            detalhar: safeDetalhar,
            statusItem: safeApenasAtivos ? '1' : undefined,
            tamanhoPagina: Math.max(clampedLimit * 4, 80)
          },
          {
            routeInterna: '/api/catmat/search'
          }
        );

        const rawItems = Array.isArray(ranked?.dados) ? ranked.dados.map(normalizeMaterial).filter(Boolean) : [];
        if (rawItems.length > 0) {
          await this._upsertCacheBatch(rawItems);
        }

        const dados = Array.isArray(ranked?.rankedItems)
          ? ranked.rankedItems.map((entry) => mapCatalogItemToSearchData(entry.item, { score: entry.score }))
          : [];
        const result = {
          dados,
          total: Number(ranked?.totalRegistros || dados.length || 0),
          pagina: Math.floor(safeOffset / clampedLimit) + 1,
          totalPaginas: Math.max(1, Math.ceil(Number(ranked?.totalRegistros || dados.length || 0) / clampedLimit)),
          fonte: 'api_oficial_compras',
          modo: ranked?.modo || 'items',
          sugestoes: Array.isArray(ranked?.sugestoes) ? ranked.sugestoes : [],
          filtros: ranked?.filtros || {
            codigoPdm: safeCodigoPdm,
            detalhar: safeDetalhar
          },
          contextoSelecionado: ranked?.contextoSelecionado || null,
          groupedByPdm: Array.isArray(ranked?.groupedByPdm) ? ranked.groupedByPdm : []
        };

        integrationCache.set(CATMAT_SEARCH_CACHE_NAMESPACE, cacheKey, result, CATMAT_SEARCH_CACHE_TTL_SECONDS);

        return {
          ...result,
          cache: 'MISS'
        };
      } catch (apiError) {
        const fallback = await this._queryCacheByTerm(safeQuery, {
          limite: clampedLimit,
          offset: safeOffset,
          apenasAtivos: safeApenasAtivos
        });

        const result = {
          ...fallback,
          pagina: Math.floor(safeOffset / clampedLimit) + 1,
          totalPaginas: Math.ceil((fallback.total || 0) / clampedLimit),
          fonte: 'cache_local',
          aviso: 'API oficial temporariamente indisponível. Resultado retornado do cache local mais recente.',
          erroApi: apiError.message
        };

        integrationCache.set(
          CATMAT_SEARCH_CACHE_NAMESPACE,
          cacheKey,
          result,
          Math.min(30, CATMAT_SEARCH_CACHE_TTL_SECONDS)
        );

        return {
          ...result,
          cache: 'LOCAL'
        };
      } finally {
        runtime.searchInFlight.delete(cacheKey);
      }
    })();

    runtime.searchInFlight.set(cacheKey, searchPromise);
    return searchPromise;
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
      const payload = await comprasGovGateway.consultarItemMaterial(
        {
          codigoItem: cleanCode
        },
        {
          pagina: 1,
          tamanhoPagina: 1
        },
        {
          routeInterna: `/api/catmat/${cleanCode}`
        }
      );
      const normalized = normalizeMaterial(Array.isArray(payload?.resultado) ? payload.resultado[0] : payload);

      if (!normalized) {
        const legacyPayload = await this._fetchOfficial(`/materiais/id/material/${cleanCode}.json`);
        const legacyNormalized = normalizeMaterial(legacyPayload);
        if (legacyNormalized) {
          await this._upsertCache(legacyNormalized);

          return {
            codigo: legacyNormalized.codigo,
            catmat_id: Number(legacyNormalized.codigo),
            descricao: legacyNormalized.descricao,
            catmat_padrao_desc: legacyNormalized.descricao,
            unidade: legacyNormalized.unidade,
            id_grupo: legacyNormalized.id_grupo,
            id_classe: legacyNormalized.id_classe,
            id_pdm: legacyNormalized.id_pdm,
            status: legacyNormalized.status,
            catmat_sustentavel: legacyNormalized.sustentavel,
            fonte: legacyNormalized.fonte,
            fetched_at: new Date().toISOString()
          };
        }

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

    await this._upsertCacheBatch(normalized);

    let imported = 0;
    for (const item of normalized) {
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
