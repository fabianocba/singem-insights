const express = require('express');
const crypto = require('crypto');
const comprasApiClient = require('../services/comprasApiClient');
const comprasGovGateway = require('../services/gov-api/comprasGovGatewayService');
const integrationCache = require('../integrations/core/integrationCache');

const router = express.Router();

const ENDPOINT_MAP = {
  '/modulo-material/grupos': '/modulo-material/1_consultarGrupoMaterial',
  '/modulo-material/classes': '/modulo-material/2_consultarClasseMaterial',
  '/modulo-material/pdm': '/modulo-material/3_consultarPdmMaterial',
  '/modulo-material/itens': '/modulo-material/4_consultarItemMaterial',
  '/modulo-material/natureza-despesa': '/modulo-material/5_consultarMaterialNaturezaDespesa',
  '/modulo-material/unidades-fornecimento': '/modulo-material/6_consultarMaterialUnidadeFornecimento',
  '/modulo-material/caracteristicas': '/modulo-material/7_consultarMaterialCaracteristicas',
  '/modulo-servico/grupos': '/modulo-servico/3_consultarGrupoServico',
  '/modulo-servico/classes': '/modulo-servico/4_consultarClasseServico',
  '/modulo-servico/itens': '/modulo-servico/6_consultarItemServico',
  '/modulo-pesquisa-preco/material': '/modulo-pesquisa-preco/1_consultarMaterial',
  '/modulo-pesquisa-preco/material/detalhe': '/modulo-pesquisa-preco/2_consultarMaterialDetalhe',
  '/modulo-pesquisa-preco/servico': '/modulo-pesquisa-preco/3_consultarServico',
  '/modulo-pesquisa-preco/servico/detalhe': '/modulo-pesquisa-preco/4_consultarServicoDetalhe',
  '/modulo-uasg/consulta': '/modulo-uasg/1_consultarUasg',
  '/modulo-uasg/orgao': '/modulo-uasg/2_consultarOrgao',
  '/modulo-fornecedor/consulta': '/modulo-fornecedor/1_consultarFornecedor',
  '/modulo-contratacoes/consulta': '/modulo-contratacoes/1_consultarContratacoes_PNCP_14133',
  '/modulo-contratacoes/itens': '/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133',
  '/modulo-contratacoes/resultados-itens': '/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133',
  // BUGFIX: ARP consulta deve usar endpoint de cabeçalhos, não de itens
  '/modulo-arp/consulta': '/modulo-arp/1_consultarARP',
  '/modulo-arp/itens': '/modulo-arp/2_consultarARPItem',
  '/modulo-contratos/consulta': '/modulo-contratos/1_consultarContratos',
  '/modulo-contratos/itens': '/modulo-contratos/2_consultarContratosItem',
  '/modulo-legado/licitacoes': '/modulo-legado/1_consultarLicitacao',
  '/modulo-legado/itens': '/modulo-legado/2_consultarItemLicitacao',
  '/modulo-ocds/consulta': '/modulo-ocds/1_releases'
};

const GATEWAY_ROUTE_MAP = {
  '/modulo-material/grupos': comprasGovGateway.consultarGrupoMaterial,
  '/modulo-material/classes': comprasGovGateway.consultarClasseMaterial,
  '/modulo-material/pdm': comprasGovGateway.consultarPdmMaterial,
  '/modulo-material/natureza-despesa': comprasGovGateway.consultarMaterialNaturezaDespesa,
  '/modulo-material/unidades-fornecimento': comprasGovGateway.consultarMaterialUnidadeFornecimento,
  '/modulo-material/caracteristicas': comprasGovGateway.consultarMaterialCaracteristicas,
  '/modulo-servico/grupos': comprasGovGateway.consultarGrupoServico,
  '/modulo-servico/classes': comprasGovGateway.consultarClasseServico,
  '/modulo-servico/itens': comprasGovGateway.consultarItemServico,
  '/modulo-pesquisa-preco/material': comprasGovGateway.consultarPrecoMaterial,
  '/modulo-pesquisa-preco/material/detalhe': comprasGovGateway.consultarPrecoMaterialDetalhe,
  '/modulo-pesquisa-preco/servico': comprasGovGateway.consultarPrecoServico,
  '/modulo-pesquisa-preco/servico/detalhe': comprasGovGateway.consultarPrecoServicoDetalhe,
  '/modulo-uasg/consulta': comprasGovGateway.consultarUasg,
  '/modulo-uasg/orgao': comprasGovGateway.consultarOrgao,
  '/modulo-fornecedor/consulta': comprasGovGateway.consultarFornecedor,
  '/modulo-contratacoes/consulta': comprasGovGateway.consultarContratacoesPncp,
  '/modulo-contratacoes/itens': comprasGovGateway.consultarItensContratacoesPncp,
  '/modulo-contratacoes/resultados-itens': comprasGovGateway.consultarResultadosItensContratacoesPncp,
  '/modulo-arp/consulta': comprasGovGateway.consultarArp,
  '/modulo-arp/itens': comprasGovGateway.consultarArpItem,
  '/modulo-contratos/consulta': comprasGovGateway.consultarContratos,
  '/modulo-contratos/itens': comprasGovGateway.consultarItensContratos,
  '/modulo-legado/licitacoes': comprasGovGateway.consultarLicitacoesLegado,
  '/modulo-legado/itens': comprasGovGateway.consultarItensLicitacaoLegado
};

const MATERIAL_ITENS_CACHE_NAMESPACE = 'compras:material:itens';
const MATERIAL_ITENS_CACHE_TTL_SECONDS = 24 * 60 * 60;
const NON_FILTER_KEYS = new Set(['pagina', 'tamanhopagina', 'buscartodaspaginas', 'maxpaginas']);
const INTERNAL_QUERY_KEYS = new Set(['buscarTodasPaginas', 'maxPaginas']);

function parseBooleanFlag(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  return ['1', 'true', 'sim', 'yes', 'on'].includes(normalized);
}

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeQuery(query = {}) {
  const out = {};

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      const normalized = value.map((entry) => normalizeText(entry)).filter((entry) => entry !== '');
      if (normalized.length > 0) {
        out[key] = normalized;
      }
      return;
    }

    if (typeof value === 'string') {
      const normalized = normalizeText(value);
      if (normalized !== '') {
        out[key] = normalized;
      }
      return;
    }

    out[key] = value;
  });

  return out;
}

function hasAtLeastOneFilter(query = {}) {
  return Object.entries(query || {}).some(([key, value]) => {
    if (NON_FILTER_KEYS.has(String(key || '').toLowerCase())) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.some((entry) => String(entry || '').trim() !== '');
    }

    return String(value || '').trim() !== '';
  });
}

function sendEmptyFilterError(res) {
  return res.status(400).json({
    errorCode: 'EMPTY_FILTER',
    message: 'Pelo menos um filtro deve ser informado.'
  });
}

function hashQueryString(queryString) {
  return crypto
    .createHash('sha1')
    .update(String(queryString || ''))
    .digest('hex');
}

function buildCanonicalQueryString(query = {}) {
  const keys = Object.keys(query || {})
    .filter((key) => query[key] !== undefined && query[key] !== null && query[key] !== '')
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const params = new URLSearchParams();

  for (const key of keys) {
    const value = query[key];
    if (Array.isArray(value)) {
      value
        .map((entry) => String(entry))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .forEach((entry) => params.append(key, entry));
      continue;
    }

    params.append(key, String(value));
  }

  return params.toString();
}

function stripInternalQueryParams(query = {}) {
  const filtered = { ...query };

  INTERNAL_QUERY_KEYS.forEach((key) => {
    delete filtered[key];
  });

  return filtered;
}

function buildGatewayParams(query = {}) {
  const filtered = stripInternalQueryParams(query);

  delete filtered.pagina;
  delete filtered.tamanhoPagina;

  return filtered;
}

function buildGatewayPagination(query = {}) {
  return {
    pagina: query.pagina,
    tamanhoPagina: query.tamanhoPagina,
    buscarTodasPaginas: parseBooleanFlag(query.buscarTodasPaginas),
    maxPaginas: query.maxPaginas
  };
}

function hasTextFilter(query = {}) {
  const entries = Object.entries(query || {});
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const normalizedKey = String(key || '').toLowerCase();
    if (normalizedKey.includes('descricao')) {
      return true;
    }

    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      const text = String(item || '').trim();
      if (/[a-zA-ZÀ-ÿ]/.test(text)) {
        return true;
      }
    }
  }

  return false;
}

function getMaterialItensTimeout(query = {}) {
  return hasTextFilter(query) ? 45000 : 12000;
}

function buildMaterialItensCacheKey(query = {}) {
  const queryString = buildCanonicalQueryString(query);
  const hash = hashQueryString(queryString);

  return `compras:material:itens:${hash}`;
}

function resolveErrorStatus(error) {
  const upstreamStatus = Number(error?.upstreamStatus || error?.statusCode || 0);
  if (upstreamStatus === 0 || upstreamStatus === 502 || upstreamStatus === 503 || upstreamStatus === 504) {
    return 502;
  }

  if (upstreamStatus >= 400 && upstreamStatus <= 499) {
    return upstreamStatus;
  }

  return 502;
}

function getRequestId(req) {
  return req.requestId || req.headers['x-request-id'] || null;
}

function buildGatewayContext(req) {
  return {
    requestId: getRequestId(req),
    routeInterna: req.originalUrl || req.url || '/api/compras'
  };
}

function sendSuccess(res, req, data, upstreamStatus = 200) {
  return res.status(200).json({
    success: true,
    status: 'success',
    data,
    requestId: getRequestId(req),
    timestamp: new Date().toISOString(),
    upstreamStatus
  });
}

function sendError(res, req, error) {
  const statusCode = resolveErrorStatus(error);
  const requestId = getRequestId(req);
  const upstreamStatus = Number(error?.upstreamStatus || error?.statusCode || 0);
  const timeoutMs = Number(error?.timeoutMs || 0) || null;
  const upstreamUrl = error?.upstreamUrl || error?.details?.url || null;
  const errorType = error?.errorType || (error?.code === 'COMPRAS_TIMEOUT' ? 'timeout' : 'upstream');

  if (statusCode >= 500) {
    console.error(
      `[COMPRAS_PROXY] requestId=${requestId || 'null'} status=${statusCode} type=${errorType} upstreamStatus=${upstreamStatus} timeoutMs=${timeoutMs || 'n/a'} latencyMs=${error?.latencyMs || 'n/a'} upstreamUrl=${upstreamUrl || 'n/a'} message=${error?.message || 'erro'}`
    );
  }

  return res.status(statusCode).json({
    success: false,
    status: 'error',
    code: error?.code || 'COMPRAS_PROXY_ERROR',
    message:
      statusCode === 502
        ? `Upstream Compras.gov.br indisponível no momento. ${error?.message || ''}`.trim()
        : error?.message || 'Falha ao consultar Compras.gov.br',
    requestId,
    timestamp: new Date().toISOString(),
    upstreamStatus,
    baseUrl: comprasApiClient.getBaseUrl(),
    details: error?.details || null,
    errorCode: error?.code || 'COMPRAS_PROXY_ERROR',
    fromCache: false,
    stale: false,
    timeoutMs,
    upstreamUrl
  });
}

async function executeProxy(req, res, routePath, upstreamPath) {
  const normalizedQuery = normalizeQuery(req.query || {});
  if (!hasAtLeastOneFilter(normalizedQuery)) {
    return sendEmptyFilterError(res);
  }

  try {
    const gatewayHandler = GATEWAY_ROUTE_MAP[routePath];
    if (typeof gatewayHandler === 'function') {
      const result = await gatewayHandler(
        buildGatewayParams(normalizedQuery),
        buildGatewayPagination(normalizedQuery),
        buildGatewayContext(req)
      );

      return sendSuccess(res, req, result, 200);
    }

    const result = await comprasApiClient.get(upstreamPath, {
      query: stripInternalQueryParams(normalizedQuery),
      requestId: getRequestId(req),
      userAgent: 'SINGEM-Compras-Proxy/1.0'
    });

    return sendSuccess(res, req, result.data, result.upstreamStatus);
  } catch (error) {
    return sendError(res, req, error);
  }
}

function buildMaterialItensContext(req) {
  const query = normalizeQuery(req.query || {});
  const gatewayParams = buildGatewayParams(query);
  const gatewayPagination = {
    ...buildGatewayPagination(query),
    tamanhoPagina: query.tamanhoPagina || 30
  };

  return {
    requestId: getRequestId(req),
    query,
    gatewayParams,
    gatewayPagination,
    cacheQuery: {
      ...query,
      buscarTodasPaginas: gatewayPagination.buscarTodasPaginas,
      maxPaginas: gatewayPagination.maxPaginas
    }
  };
}

function buildMaterialItensResponse({
  data,
  cacheKey,
  requestId,
  timeoutMs,
  upstreamStatus = 200,
  fromCache = false,
  stale = false,
  warning = null,
  upstreamUrl = null,
  latencyMs = null,
  cache = null
}) {
  const response = {
    success: true,
    status: 'success',
    data,
    cacheKey,
    requestId,
    timestamp: new Date().toISOString(),
    upstreamStatus,
    fromCache,
    stale,
    warning,
    timeoutMs,
    upstreamUrl,
    latencyMs
  };

  if (cache) {
    response.cache = cache;
  }

  return response;
}

function sendMaterialItensCacheHit(res, { cacheKey, requestId, timeoutMs }, cached) {
  return res.status(200).json(
    buildMaterialItensResponse({
      data: cached?.data ?? null,
      cacheKey,
      requestId,
      timeoutMs,
      upstreamStatus: Number(cached?.upstreamStatus || 200),
      fromCache: true,
      upstreamUrl: cached?.upstreamUrl || null,
      cache: {
        fetchedAt: cached?.fetchedAt || null,
        upstreamLatencyMs: Number(cached?.upstreamLatencyMs || 0) || null
      }
    })
  );
}

function writeMaterialItensCache(cacheKey, data) {
  integrationCache.set(
    MATERIAL_ITENS_CACHE_NAMESPACE,
    cacheKey,
    {
      data,
      fetchedAt: new Date().toISOString(),
      upstreamLatencyMs: null,
      upstreamStatus: 200,
      upstreamUrl: null
    },
    MATERIAL_ITENS_CACHE_TTL_SECONDS
  );
}

function shouldUseStaleMaterialItensCache(cacheMeta, error) {
  const upstreamStatus = Number(error?.upstreamStatus || error?.statusCode || 0);
  return cacheMeta.hit && [0, 502, 503, 504].includes(upstreamStatus);
}

function sendMaterialItensStaleCache(res, { cacheKey, requestId, timeoutMs }, cacheMeta, error) {
  const stale = cacheMeta.value;
  const upstreamStatus = Number(error?.upstreamStatus || error?.statusCode || 0);

  return res.status(200).json(
    buildMaterialItensResponse({
      data: stale?.data ?? null,
      cacheKey,
      requestId,
      timeoutMs,
      upstreamStatus: Number(stale?.upstreamStatus || upstreamStatus || 0),
      fromCache: true,
      stale: true,
      warning: 'UPSTREAM_TIMEOUT_USING_STALE_CACHE',
      upstreamUrl: error?.upstreamUrl || stale?.upstreamUrl || error?.details?.url || null,
      cache: {
        fetchedAt: stale?.fetchedAt || null,
        upstreamLatencyMs: Number(stale?.upstreamLatencyMs || 0) || null,
        expired: cacheMeta.expired === true
      }
    })
  );
}

async function executeMaterialItensWithCache(req, res) {
  const context = buildMaterialItensContext(req);
  const { requestId, query, gatewayParams, gatewayPagination, cacheQuery } = context;

  if (!hasAtLeastOneFilter(query)) {
    return sendEmptyFilterError(res);
  }

  const timeoutMs = getMaterialItensTimeout(gatewayParams);
  const cacheKey = buildMaterialItensCacheKey(cacheQuery);
  const cacheMeta = integrationCache.getWithMeta(MATERIAL_ITENS_CACHE_NAMESPACE, cacheKey, { includeExpired: true });
  const hasFreshCache = cacheMeta.hit && !cacheMeta.expired;

  if (hasFreshCache) {
    const cached = cacheMeta.value;
    console.log(
      `[COMPRAS_PROXY] requestId=${requestId || 'null'} route=material-itens cache=HIT timeoutMs=${timeoutMs} stale=false fetchedAt=${cached?.fetchedAt || 'n/a'}`
    );

    return sendMaterialItensCacheHit(res, { cacheKey, requestId, timeoutMs }, cached);
  }

  try {
    const result = await comprasGovGateway.consultarItemMaterial(
      gatewayParams,
      gatewayPagination,
      buildGatewayContext(req)
    );

    const shouldCache = hasTextFilter(gatewayParams);
    if (shouldCache) {
      writeMaterialItensCache(cacheKey, result);
    }

    console.log(
      `[COMPRAS_PROXY] requestId=${requestId || 'null'} route=material-itens cache=MISS timeoutMs=${timeoutMs} upstreamStatus=200 upstreamUrl=n/a`
    );

    return res.status(200).json(
      buildMaterialItensResponse({
        data: result,
        cacheKey,
        requestId,
        timeoutMs
      })
    );
  } catch (error) {
    const upstreamStatus = Number(error?.upstreamStatus || error?.statusCode || 0);
    const shouldUseStale = shouldUseStaleMaterialItensCache(cacheMeta, error);

    if (shouldUseStale) {
      console.warn(
        `[COMPRAS_PROXY] requestId=${requestId || 'null'} route=material-itens fallback=STALE timeoutMs=${timeoutMs} errorType=${error?.errorType || 'upstream'} upstreamStatus=${upstreamStatus} upstreamUrl=${error?.upstreamUrl || error?.details?.url || 'n/a'}`
      );

      return sendMaterialItensStaleCache(res, { cacheKey, requestId, timeoutMs }, cacheMeta, error);
    }

    error.timeoutMs = error.timeoutMs || timeoutMs;
    error.upstreamUrl = error.upstreamUrl || error?.details?.url || null;
    return sendError(res, req, error);
  }
}

router.get('/health', async (req, res) => {
  const startedAt = Date.now();

  try {
    const result = await comprasApiClient.get('/modulo-material/1_consultarGrupoMaterial', {
      query: {
        pagina: 1,
        tamanhoPagina: 1
      },
      requestId: getRequestId(req),
      userAgent: 'SINGEM-Compras-Health/1.0'
    });

    return res.status(200).json({
      ok: true,
      status: 'UP',
      upstreamStatus: result.upstreamStatus,
      latencyMs: result.latencyMs,
      baseUrl: result.baseUrl,
      requestId: getRequestId(req),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const statusCode = resolveErrorStatus(error);
    return res.status(statusCode).json({
      ok: false,
      status: 'DOWN',
      upstreamStatus: Number(error?.upstreamStatus || error?.statusCode || 0),
      latencyMs: Date.now() - startedAt,
      baseUrl: comprasApiClient.getBaseUrl(),
      requestId: getRequestId(req),
      timestamp: new Date().toISOString(),
      message: error?.message || 'Falha no diagnóstico de integração Compras.gov.br'
    });
  }
});

Object.entries(ENDPOINT_MAP).forEach(([routePath, upstreamPath]) => {
  if (routePath === '/modulo-material/itens') {
    return;
  }

  router.get(routePath, (req, res) => executeProxy(req, res, routePath, upstreamPath));
});

router.get('/modulo-material/itens', (req, res) => executeMaterialItensWithCache(req, res));

module.exports = router;
