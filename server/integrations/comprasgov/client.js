const crypto = require('crypto');
const db = require('../../config/database');
const { config } = require('../../config');
const integrationCache = require('../core/integrationCache');
const { recordApiCall } = require('../core/auditApiCalls');
const { buildComprasGovHeaders } = require('../core/comprasGovHeaders');

const runtime = {
  lastRequestAt: 0
};

const DEFAULT_ENDPOINTS = {
  catalogoMaterial: {
    itens: '/modulo-material/4_consultarItemMaterial',
    grupos: '/modulo-material/1_consultarGrupoMaterial',
    classes: '/modulo-material/2_consultarClasseMaterial'
  },
  catalogoServico: {
    itens: '/modulo-servico/6_consultarItemServico',
    grupos: '/modulo-servico/3_consultarGrupoServico',
    classes: '/modulo-servico/4_consultarClasseServico'
  },
  pesquisaPreco: {
    material: '/modulo-pesquisa-preco/1_consultarMaterial',
    servico: '/modulo-pesquisa-preco/3_consultarServico'
  },
  uasgOrgao: {
    consulta: '/modulo-uasg/1_consultarUasg'
  },
  fornecedor: {
    consulta: '/modulo-fornecedor/1_consultarFornecedor'
  },
  contratacoes: {
    consulta: '/modulo-contratacoes/1_consultarContratacoes_PNCP_14133'
  },
  arp: {
    consulta: '/modulo-arp/2_consultarARPItem'
  },
  contratos: {
    consulta: '/modulo-contratos/1_consultarContratos'
  },
  legado: {
    licitacoes: '/modulo-legado/1_consultarLicitacao',
    itens: '/modulo-legado/2_consultarItemLicitacao'
  },
  ocds: {
    consulta: '/modulo-ocds/1_releases'
  }
};

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBoolean(value) {
  if (value === true || value === false) {
    return value;
  }

  return String(value || '').toLowerCase() === 'true';
}

function sanitizeString(value, maxLength = 160) {
  const normalized = String(value || '').normalize('NFKC');
  let cleaned = '';

  for (const char of normalized) {
    const code = char.charCodeAt(0);
    const isControl = (code >= 0 && code <= 31) || code === 127;
    if (!isControl) {
      cleaned += char;
    }
  }

  return cleaned.trim().slice(0, maxLength);
}

function sanitizeParams(input = {}) {
  const out = {};

  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const safeKey = sanitizeString(key, 80);
    if (!safeKey) {
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      out[safeKey] = value;
      continue;
    }

    if (Array.isArray(value)) {
      const normalized = value
        .map((entry) => sanitizeString(entry, 120))
        .filter(Boolean)
        .slice(0, 30);

      if (normalized.length > 0) {
        out[safeKey] = normalized.join(',');
      }
      continue;
    }

    out[safeKey] = sanitizeString(value, 240);
  }

  return out;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sha1(text) {
  return crypto.createHash('sha1').update(String(text)).digest('hex');
}

function getComprasGovConfig() {
  const cfg = config.comprasGov || {};
  const integrationsCfg = config.integracoes || {};

  return {
    baseUrl: String(cfg.baseUrl || 'https://dadosabertos.compras.gov.br').replace(/\/+$/, ''),
    timeoutMs: Math.max(1000, toNumber(cfg.timeoutMs, 10000)),
    maxRetries: Math.max(1, Math.min(toNumber(cfg.maxRetries, 3), 6)),
    retryBaseDelayMs: Math.max(100, toNumber(cfg.retryBaseDelayMs, 400)),
    rateLimitMs: Math.max(0, toNumber(cfg.rateLimitMs, 250)),
    cacheEnabled: integrationsCfg.cacheEnabled !== false && cfg.cacheEnabled !== false,
    cacheTtlCatalogSeconds: Math.max(
      60,
      toNumber(cfg.cacheTtlCatalogSeconds || integrationsCfg.cacheTtlCatalogSeconds, 86400)
    ),
    cacheTtlPesquisaPrecoSeconds: Math.max(
      60,
      toNumber(cfg.cacheTtlPesquisaPrecoSeconds || integrationsCfg.cacheTtlPesquisaSeconds, 21600)
    ),
    cacheTtlFornecedorUasgSeconds: Math.max(
      60,
      toNumber(cfg.cacheTtlFornecedorUasgSeconds || integrationsCfg.cacheTtlFornecedorUasgSeconds, 43200)
    ),
    cacheTtlDefaultSeconds: Math.max(
      60,
      toNumber(cfg.cacheTtlDefaultSeconds || integrationsCfg.cacheTtlCatalogSeconds, 3600)
    ),
    maxPageSize: Math.max(1, Math.min(toNumber(cfg.maxPageSize, 500), 500)),
    maxAutoPages: Math.max(1, Math.min(toNumber(cfg.maxAutoPages, 20), 100)),
    auditEnabled: cfg.auditEnabled !== false,
    snapshotEnabled: cfg.snapshotEnabled !== false,
    apiToken: String(cfg.apiToken || '').trim(),
    acceptHeader: String(cfg.acceptHeader || '*/*').trim() || '*/*',
    endpoints: cfg.endpoints || {}
  };
}

function resolveEndpointPath(domain, key) {
  const cfg = getComprasGovConfig();
  const configured = cfg.endpoints?.[domain]?.[key];
  const fallback = DEFAULT_ENDPOINTS?.[domain]?.[key];
  const resolved = configured || fallback;

  if (!resolved) {
    throw new Error(`Endpoint não configurado para domínio=${domain} chave=${key}`);
  }

  return resolved;
}

function clampPagination(pagina, tamanhoPagina) {
  const cfg = getComprasGovConfig();

  return {
    pagina: Math.max(1, toNumber(pagina, 1)),
    tamanhoPagina: Math.max(10, Math.min(toNumber(tamanhoPagina, 20), cfg.maxPageSize))
  };
}

function pickResultArray(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.resultado)) {
    return payload.resultado;
  }

  if (Array.isArray(payload.itens)) {
    return payload.itens;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload._embedded && typeof payload._embedded === 'object') {
    const firstArray = Object.values(payload._embedded).find(Array.isArray);
    if (firstArray) {
      return firstArray;
    }
  }

  return [];
}

function pickMeta(payload) {
  const metadata = payload?._metadata || payload?.metadata || {};

  const totalRegistros =
    toNumber(payload?.totalRegistros, NaN) ||
    toNumber(payload?.total, NaN) ||
    toNumber(payload?.count, NaN) ||
    toNumber(metadata?.totalRegistros, NaN) ||
    toNumber(metadata?.total, NaN) ||
    toNumber(metadata?.count, NaN);

  const totalPaginas =
    toNumber(payload?.totalPaginas, NaN) || toNumber(metadata?.totalPaginas, NaN) || toNumber(metadata?.pages, NaN);

  return {
    totalRegistros: Number.isFinite(totalRegistros) ? totalRegistros : null,
    totalPaginas: Number.isFinite(totalPaginas) ? totalPaginas : null,
    paginasRestantes: Number.isFinite(toNumber(payload?.paginasRestantes, NaN))
      ? toNumber(payload?.paginasRestantes, 0)
      : Number.isFinite(toNumber(metadata?.paginasRestantes, NaN))
        ? toNumber(metadata?.paginasRestantes, 0)
        : null
  };
}

function normalizeResponse({ payload, pagina, tamanhoPagina, endpoint, dominio, requestId }) {
  const resultado = pickResultArray(payload);
  const meta = pickMeta(payload);

  const totalRegistros =
    meta.totalRegistros !== null
      ? meta.totalRegistros
      : pagina === 1 && resultado.length < tamanhoPagina
        ? resultado.length
        : null;

  let totalPaginas = meta.totalPaginas;
  if (totalPaginas === null && totalRegistros !== null && tamanhoPagina > 0) {
    totalPaginas = Math.ceil(totalRegistros / tamanhoPagina);
  }

  let paginasRestantes = meta.paginasRestantes;
  if (paginasRestantes === null && totalPaginas !== null) {
    paginasRestantes = Math.max(0, totalPaginas - pagina);
  }

  return {
    resultado,
    totalRegistros,
    totalPaginas,
    paginasRestantes,
    pagina,
    tamanhoPagina,
    dataHoraConsulta: nowIso(),
    requestId,
    endpoint,
    dominio,
    bruto: payload
  };
}

function isTransientStatus(statusCode) {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function buildCacheKey({ domain, pathTemplate, pagina, tamanhoPagina, params }) {
  return sha1(JSON.stringify({ domain, pathTemplate, pagina, tamanhoPagina, params }));
}

function getCacheNamespace(domain) {
  return `comprasgov:${domain}`;
}

function buildEndpoint(pathTemplate, pagina) {
  const safePage = Math.max(1, toNumber(pagina, 1));
  if (pathTemplate.includes('{pagina}')) {
    return pathTemplate.replace('{pagina}', String(safePage));
  }

  return pathTemplate;
}

function buildUrl(baseUrl, endpoint, params) {
  const url = new URL(`${baseUrl}${endpoint}`);
  const safeParams = sanitizeParams(params);

  for (const [key, value] of Object.entries(safeParams)) {
    url.searchParams.set(key, String(value));
  }

  return url;
}

async function persistAudit({ user, requestId, acao, status, details }) {
  const cfg = getComprasGovConfig();
  if (!cfg.auditEnabled) {
    return;
  }

  const payload = {
    usuario_id: user?.id || null,
    usuario_nome: user?.nome || user?.login || 'sistema',
    acao,
    entidade: 'comprasgov_api',
    entidade_id: null,
    dados_depois: details,
    ip_address: null,
    user_agent: null
  };

  try {
    await db.insert('audit_log', payload);
  } catch (error) {
    console.warn(`[COMPRASGOV][AUDIT] requestId=${requestId || 'null'} falha ao persistir auditoria: ${error.message}`);
  }

  if (status >= 500) {
    console.error(`[COMPRASGOV][AUDIT] requestId=${requestId || 'null'} status=${status} acao=${acao}`);
  } else {
    console.log(`[COMPRASGOV][AUDIT] requestId=${requestId || 'null'} status=${status} acao=${acao}`);
  }
}

class ComprasGovClient {
  async waitRateLimit() {
    const cfg = getComprasGovConfig();
    const elapsed = Date.now() - runtime.lastRequestAt;
    if (elapsed < cfg.rateLimitMs) {
      await sleep(cfg.rateLimitMs - elapsed);
    }
    runtime.lastRequestAt = Date.now();
  }

  /* eslint-disable complexity */
  async fetchJson({ url, requestId, user, routeInterna, queryParams, cacheHit = false }) {
    const cfg = getComprasGovConfig();
    const startedAt = Date.now();
    let lastError = null;

    for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

      try {
        await this.waitRateLimit();

        const response = await fetch(url, {
          method: 'GET',
          headers: buildComprasGovHeaders({
            requestId,
            userAgent: 'SINGEM-ComprasGov/1.0',
            accept: cfg.acceptHeader,
            token: cfg.apiToken
          }),
          signal: controller.signal
        });

        const text = await response.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {
            message: text || `HTTP ${response.status}`,
            raw: text || null
          };
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          const statusCode = Number(response.status || 500);
          const isUnauthorized = statusCode === 401;
          const isForbidden = statusCode === 403;

          let errorMessage = data?.message || data?.erro || `Falha na consulta ComprasGov (HTTP ${response.status})`;

          if (isUnauthorized) {
            errorMessage =
              data?.message ||
              data?.erro ||
              'API Compras.gov.br respondeu 401. Verifique se o endpoint exige credencial e configure COMPRASGOV_API_TOKEN se necessário.';
          }

          if (isForbidden) {
            errorMessage =
              data?.message ||
              data?.erro ||
              'API Compras.gov.br respondeu 403. Acesso negado para o recurso solicitado.';
          }

          const error = new Error(errorMessage);
          error.statusCode = statusCode;
          error.code = isUnauthorized
            ? 'COMPRASGOV_UNAUTHORIZED'
            : isForbidden
              ? 'COMPRASGOV_FORBIDDEN'
              : 'COMPRASGOV_HTTP_ERROR';
          error.details = {
            response: data,
            url: url.toString()
          };
          throw error;
        }

        const payload = {
          statusCode: response.status,
          data,
          durationMs: Date.now() - startedAt,
          attempt
        };

        await recordApiCall({
          requestId,
          usuario: user?.login || user?.nome || null,
          rotaInterna: routeInterna || 'comprasgov',
          endpointExterno: url.toString(),
          metodo: 'GET',
          queryParams: queryParams || {},
          statusHttp: response.status,
          duracaoMs: payload.durationMs,
          cacheHit
        });

        return payload;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          error.statusCode = 504;
          error.code = 'COMPRASGOV_TIMEOUT';
          error.message = 'Timeout ao consultar a API Compras.gov.br';
        } else if (!error.statusCode) {
          error.statusCode = 503;
          error.code = error.code || 'COMPRASGOV_NETWORK_ERROR';
        }

        lastError = error;

        const shouldRetry =
          attempt < cfg.maxRetries &&
          (error.code === 'COMPRASGOV_TIMEOUT' || isTransientStatus(Number(error.statusCode || 0)));

        if (!shouldRetry) {
          break;
        }

        const delayMs = cfg.retryBaseDelayMs * 2 ** (attempt - 1);
        await sleep(delayMs);
      }
    }

    lastError.durationMs = Date.now() - startedAt;

    await recordApiCall({
      requestId,
      usuario: user?.login || user?.nome || null,
      rotaInterna: routeInterna || 'comprasgov',
      endpointExterno: url.toString(),
      metodo: 'GET',
      queryParams: queryParams || {},
      statusHttp: Number(lastError?.statusCode || 500),
      duracaoMs: Number(lastError?.durationMs || 0),
      cacheHit
    });

    throw lastError;
  }
  /* eslint-enable complexity */

  getCacheTTL(domain) {
    const cfg = getComprasGovConfig();

    if (domain === 'catalogoMaterial' || domain === 'catalogoServico') {
      return cfg.cacheTtlCatalogSeconds;
    }

    if (domain === 'pesquisaPreco') {
      return cfg.cacheTtlPesquisaPrecoSeconds;
    }

    if (domain === 'fornecedor' || domain === 'uasgOrgao') {
      return cfg.cacheTtlFornecedorUasgSeconds;
    }

    return cfg.cacheTtlDefaultSeconds;
  }

  readCache(domain, key) {
    const cfg = getComprasGovConfig();
    if (!cfg.cacheEnabled) {
      return null;
    }

    return integrationCache.get(getCacheNamespace(domain), key);
  }

  writeCache(domain, key, value, ttlSeconds) {
    const cfg = getComprasGovConfig();
    if (!cfg.cacheEnabled || ttlSeconds <= 0) {
      return;
    }

    integrationCache.set(getCacheNamespace(domain), key, value, ttlSeconds);
  }

  async requestDomain({
    domain,
    operation,
    pagina,
    tamanhoPagina,
    params,
    requestId,
    user,
    routeInterna,
    buscarTodasPaginas = false,
    maxPaginas
  }) {
    const cfg = getComprasGovConfig();
    const pathTemplate = resolveEndpointPath(domain, operation);
    const { pagina: page, tamanhoPagina: pageSize } = clampPagination(pagina, tamanhoPagina);

    const safeParams = sanitizeParams({ ...params, pagina: page, tamanhoPagina: pageSize });
    const cacheKey = buildCacheKey({ domain, pathTemplate, pagina: page, tamanhoPagina: pageSize, params: safeParams });

    const cached = this.readCache(domain, cacheKey);
    if (cached) {
      await recordApiCall({
        requestId,
        usuario: user?.login || user?.nome || null,
        rotaInterna: routeInterna || 'comprasgov',
        endpointExterno: `${cfg.baseUrl}${buildEndpoint(pathTemplate, page)}`,
        metodo: 'GET',
        queryParams: safeParams,
        statusHttp: 200,
        duracaoMs: 0,
        cacheHit: true
      });

      await persistAudit({
        user,
        requestId,
        acao: 'consulta_cache_hit',
        status: 200,
        details: {
          requestId,
          domain,
          operation,
          endpoint: buildEndpoint(pathTemplate, page),
          params: safeParams,
          cache: 'hit',
          dataHoraConsulta: nowIso()
        }
      });

      return {
        ...cached,
        cache: 'HIT'
      };
    }

    const startedAt = Date.now();

    if (!buscarTodasPaginas) {
      const endpoint = buildEndpoint(pathTemplate, page);
      const url = buildUrl(cfg.baseUrl, endpoint, safeParams);

      try {
        const response = await this.fetchJson({
          url,
          requestId,
          user,
          routeInterna,
          queryParams: safeParams,
          cacheHit: false
        });
        const normalized = normalizeResponse({
          payload: response.data,
          pagina: page,
          tamanhoPagina: pageSize,
          endpoint,
          dominio: domain,
          requestId
        });

        this.writeCache(domain, cacheKey, normalized, this.getCacheTTL(domain));

        await persistAudit({
          user,
          requestId,
          acao: 'consulta_externa',
          status: 200,
          details: {
            requestId,
            domain,
            operation,
            endpoint,
            params: safeParams,
            status: 200,
            duracaoMs: Date.now() - startedAt,
            cache: 'miss',
            dataHoraConsulta: normalized.dataHoraConsulta
          }
        });

        return {
          ...normalized,
          cache: 'MISS'
        };
      } catch (error) {
        await persistAudit({
          user,
          requestId,
          acao: 'consulta_externa_erro',
          status: Number(error.statusCode || 500),
          details: {
            requestId,
            domain,
            operation,
            endpoint,
            params: safeParams,
            status: Number(error.statusCode || 500),
            duracaoMs: Date.now() - startedAt,
            erro: error.message,
            codigo: error.code || 'COMPRASGOV_REQUEST_ERROR',
            dataHoraConsulta: nowIso()
          }
        });

        throw error;
      }
    }

    const maxPagesSafe = Math.max(1, Math.min(toNumber(maxPaginas, cfg.maxAutoPages), cfg.maxAutoPages));
    const acumulado = [];
    let totalRegistros = null;
    let totalPaginas = null;
    let paginasConsumidas = 0;

    for (let currentPage = page; paginasConsumidas < maxPagesSafe; currentPage++) {
      const endpoint = buildEndpoint(pathTemplate, currentPage);
      const url = buildUrl(cfg.baseUrl, endpoint, safeParams);
      const response = await this.fetchJson({
        url,
        requestId,
        user,
        routeInterna,
        queryParams: safeParams,
        cacheHit: false
      });

      const normalized = normalizeResponse({
        payload: response.data,
        pagina: currentPage,
        tamanhoPagina: pageSize,
        endpoint,
        dominio: domain,
        requestId
      });

      paginasConsumidas += 1;
      acumulado.push(...normalized.resultado);

      if (normalized.totalRegistros !== null) {
        totalRegistros = normalized.totalRegistros;
      }

      if (normalized.totalPaginas !== null) {
        totalPaginas = normalized.totalPaginas;
      }

      const acabouPorTotalPaginas = totalPaginas !== null && currentPage >= totalPaginas;
      const acabouPorConteudo = normalized.resultado.length < pageSize;

      if (acabouPorTotalPaginas || acabouPorConteudo) {
        break;
      }
    }

    const merged = {
      resultado: acumulado,
      totalRegistros: totalRegistros !== null ? totalRegistros : acumulado.length,
      totalPaginas,
      paginasRestantes: totalPaginas !== null ? Math.max(0, totalPaginas - (page + paginasConsumidas - 1)) : null,
      pagina: page,
      tamanhoPagina: pageSize,
      dataHoraConsulta: nowIso(),
      requestId,
      endpoint: buildEndpoint(pathTemplate, page),
      dominio: domain,
      cache: 'MISS',
      paginacaoAutomatica: {
        habilitada: true,
        paginasConsumidas,
        limitePaginas: maxPagesSafe
      }
    };

    this.writeCache(domain, cacheKey, merged, this.getCacheTTL(domain));

    await persistAudit({
      user,
      requestId,
      acao: 'consulta_externa_multiplas_paginas',
      status: 200,
      details: {
        requestId,
        domain,
        operation,
        endpoint: merged.endpoint,
        params: safeParams,
        status: 200,
        duracaoMs: Date.now() - startedAt,
        paginasConsumidas,
        totalRegistros: merged.totalRegistros,
        dataHoraConsulta: merged.dataHoraConsulta
      }
    });

    return merged;
  }

  async snapshotPesquisaPreco({ user, requestId, route, filtros, resultado }) {
    const cfg = getComprasGovConfig();
    if (!cfg.snapshotEnabled || config.priceSnapshot?.enabled === false) {
      return;
    }

    const itens = Array.isArray(resultado?.resultado) ? resultado.resultado : [];

    const prices = itens
      .map((item) => {
        const candidates = [
          item?.valor,
          item?.preco,
          item?.valorUnitario,
          item?.precoUnitario,
          item?.menorPreco,
          item?.maiorPreco,
          item?.valorHomologado
        ];

        for (const value of candidates) {
          const numeric = Number(String(value ?? '').replace(',', '.'));
          if (Number.isFinite(numeric) && numeric >= 0) {
            return numeric;
          }
        }

        return null;
      })
      .filter((value) => Number.isFinite(value));

    prices.sort((a, b) => a - b);

    const totalResultados = itens.length;
    const menorPreco = prices.length > 0 ? prices[0] : null;
    const maiorPreco = prices.length > 0 ? prices[prices.length - 1] : null;
    const media = prices.length > 0 ? prices.reduce((sum, value) => sum + value, 0) / prices.length : null;
    const mediana =
      prices.length === 0
        ? null
        : prices.length % 2 === 0
          ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
          : prices[Math.floor(prices.length / 2)];

    const snapshotInsert = await db.query(
      `
      INSERT INTO price_snapshot (
        codigo_item_catalogo,
        filtros_usados,
        data_hora_consulta,
        total_resultados,
        menor_preco,
        maior_preco,
        media,
        mediana,
        request_id,
        resultado_bruto
      ) VALUES ($1,$2::jsonb,NOW(),$3,$4,$5,$6,$7,$8,$9::jsonb)
      RETURNING id
      `,
      [
        filtros?.codigoItemCatalogo || null,
        JSON.stringify(sanitizeParams(filtros)),
        totalResultados,
        menorPreco,
        maiorPreco,
        media,
        mediana,
        requestId || null,
        JSON.stringify(itens.slice(0, 500))
      ]
    );

    const snapshotId = snapshotInsert.rows[0]?.id || null;
    if (resultado && typeof resultado === 'object') {
      resultado.snapshotId = snapshotId;
    }

    await persistAudit({
      user,
      requestId,
      acao: 'snapshot_pesquisa_preco',
      status: 200,
      details: {
        requestId,
        route,
        filtros: sanitizeParams(filtros),
        resumo: {
          totalRegistros: resultado?.totalRegistros,
          totalPaginas: resultado?.totalPaginas,
          amostra: itens.slice(0, 20)
        },
        snapshotId,
        hashResultado: sha1(JSON.stringify(itens.slice(0, 200))),
        dataHoraConsulta: nowIso()
      }
    });
  }

  async health({ requestId, user }) {
    const startedAt = Date.now();

    try {
      const response = await this.requestDomain({
        domain: 'catalogoMaterial',
        operation: 'itens',
        pagina: 1,
        tamanhoPagina: 10,
        params: {},
        requestId,
        user,
        buscarTodasPaginas: false
      });

      return {
        ok: true,
        status: 'UP',
        baseUrl: getComprasGovConfig().baseUrl,
        timestamp: nowIso(),
        duracaoMs: Date.now() - startedAt,
        amostraRegistros: Array.isArray(response.resultado) ? response.resultado.length : 0
      };
    } catch (error) {
      return {
        ok: false,
        status: 'DOWN',
        baseUrl: getComprasGovConfig().baseUrl,
        timestamp: nowIso(),
        duracaoMs: Date.now() - startedAt,
        erro: {
          message: error.message,
          code: error.code || 'COMPRASGOV_HEALTH_ERROR',
          statusCode: Number(error.statusCode || 500)
        }
      };
    }
  }
}

module.exports = {
  ComprasGovClient,
  parseBoolean,
  sanitizeParams
};
