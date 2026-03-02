const express = require('express');
const crypto = require('crypto');
const comprasApiClient = require('../services/comprasApiClient');
const integrationCache = require('../integrations/core/integrationCache');

const router = express.Router();

const ENDPOINT_MAP = {
  '/modulo-material/grupos': '/modulo-material/1_consultarGrupoMaterial',
  '/modulo-material/classes': '/modulo-material/2_consultarClasseMaterial',
  '/modulo-material/itens': '/modulo-material/4_consultarItemMaterial',
  '/modulo-servico/grupos': '/modulo-servico/3_consultarGrupoServico',
  '/modulo-servico/classes': '/modulo-servico/4_consultarClasseServico',
  '/modulo-servico/itens': '/modulo-servico/6_consultarItemServico',
  '/modulo-pesquisa-preco/material': '/modulo-pesquisa-preco/1_consultarMaterial',
  '/modulo-pesquisa-preco/servico': '/modulo-pesquisa-preco/3_consultarServico',
  '/modulo-uasg/consulta': '/modulo-uasg/1_consultarUasg',
  '/modulo-fornecedor/consulta': '/modulo-fornecedor/1_consultarFornecedor',
  '/modulo-contratacoes/consulta': '/modulo-contratacoes/1_consultarContratacoes_PNCP_14133',
  '/modulo-arp/consulta': '/modulo-arp/2_consultarARPItem',
  '/modulo-contratos/consulta': '/modulo-contratos/1_consultarContratos',
  '/modulo-legado/licitacoes': '/modulo-legado/1_consultarLicitacao',
  '/modulo-legado/itens': '/modulo-legado/2_consultarItemLicitacao',
  '/modulo-ocds/consulta': '/modulo-ocds/1_releases'
};

const MATERIAL_ITENS_CACHE_NAMESPACE = 'compras:material:itens';
const MATERIAL_ITENS_CACHE_TTL_SECONDS = 24 * 60 * 60;
const NON_FILTER_KEYS = new Set(['pagina', 'tamanhopagina']);

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

async function executeProxy(req, res, upstreamPath) {
  const normalizedQuery = normalizeQuery(req.query || {});
  if (!hasAtLeastOneFilter(normalizedQuery)) {
    return sendEmptyFilterError(res);
  }

  try {
    const result = await comprasApiClient.get(upstreamPath, {
      query: normalizedQuery,
      requestId: getRequestId(req),
      userAgent: 'SINGEM-Compras-Proxy/1.0'
    });

    return sendSuccess(res, req, result.data, result.upstreamStatus);
  } catch (error) {
    return sendError(res, req, error);
  }
}

async function executeMaterialItensWithCache(req, res) {
  const requestId = getRequestId(req);
  const query = normalizeQuery(req.query || {});

  if (!hasAtLeastOneFilter(query)) {
    return sendEmptyFilterError(res);
  }

  const timeoutMs = getMaterialItensTimeout(query);
  const cacheKey = buildMaterialItensCacheKey(query);
  const cacheMeta = integrationCache.getWithMeta(MATERIAL_ITENS_CACHE_NAMESPACE, cacheKey, { includeExpired: true });
  const hasFreshCache = cacheMeta.hit && !cacheMeta.expired;

  if (hasFreshCache) {
    const cached = cacheMeta.value;
    console.log(
      `[COMPRAS_PROXY] requestId=${requestId || 'null'} route=material-itens cache=HIT timeoutMs=${timeoutMs} stale=false fetchedAt=${cached?.fetchedAt || 'n/a'}`
    );

    return res.status(200).json({
      success: true,
      status: 'success',
      data: cached?.data ?? null,
      cacheKey,
      requestId,
      timestamp: new Date().toISOString(),
      upstreamStatus: Number(cached?.upstreamStatus || 200),
      fromCache: true,
      stale: false,
      warning: null,
      timeoutMs,
      upstreamUrl: cached?.upstreamUrl || null,
      cache: {
        fetchedAt: cached?.fetchedAt || null,
        upstreamLatencyMs: Number(cached?.upstreamLatencyMs || 0) || null
      }
    });
  }

  try {
    const result = await comprasApiClient.get('/modulo-material/4_consultarItemMaterial', {
      query,
      requestId,
      userAgent: 'SINGEM-Compras-Proxy/1.0',
      timeoutMs
    });

    const shouldCache = hasTextFilter(query);
    if (shouldCache) {
      integrationCache.set(
        MATERIAL_ITENS_CACHE_NAMESPACE,
        cacheKey,
        {
          data: result.data,
          fetchedAt: new Date().toISOString(),
          upstreamLatencyMs: result.latencyMs,
          upstreamStatus: result.upstreamStatus,
          upstreamUrl: result.url
        },
        MATERIAL_ITENS_CACHE_TTL_SECONDS
      );
    }

    console.log(
      `[COMPRAS_PROXY] requestId=${requestId || 'null'} route=material-itens cache=MISS timeoutMs=${timeoutMs} latencyMs=${result.latencyMs} upstreamStatus=${result.upstreamStatus} upstreamUrl=${result.url}`
    );

    return res.status(200).json({
      success: true,
      status: 'success',
      data: result.data,
      cacheKey,
      requestId,
      timestamp: new Date().toISOString(),
      upstreamStatus: result.upstreamStatus,
      fromCache: false,
      stale: false,
      warning: null,
      timeoutMs,
      upstreamUrl: result.url,
      latencyMs: result.latencyMs
    });
  } catch (error) {
    const staleCacheExists = cacheMeta.hit;
    const upstreamStatus = Number(error?.upstreamStatus || error?.statusCode || 0);
    const shouldUseStale = staleCacheExists && [0, 502, 503, 504].includes(upstreamStatus);

    if (shouldUseStale) {
      const stale = cacheMeta.value;
      console.warn(
        `[COMPRAS_PROXY] requestId=${requestId || 'null'} route=material-itens fallback=STALE timeoutMs=${timeoutMs} errorType=${error?.errorType || 'upstream'} upstreamStatus=${upstreamStatus} upstreamUrl=${error?.upstreamUrl || error?.details?.url || 'n/a'}`
      );

      return res.status(200).json({
        success: true,
        status: 'success',
        data: stale?.data ?? null,
        cacheKey,
        requestId,
        timestamp: new Date().toISOString(),
        upstreamStatus: Number(stale?.upstreamStatus || upstreamStatus || 0),
        fromCache: true,
        stale: true,
        warning: 'UPSTREAM_TIMEOUT_USING_STALE_CACHE',
        timeoutMs,
        upstreamUrl: error?.upstreamUrl || stale?.upstreamUrl || error?.details?.url || null,
        cache: {
          fetchedAt: stale?.fetchedAt || null,
          upstreamLatencyMs: Number(stale?.upstreamLatencyMs || 0) || null,
          expired: cacheMeta.expired === true
        }
      });
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

  router.get(routePath, (req, res) => executeProxy(req, res, upstreamPath));
});

router.get('/modulo-material/itens', (req, res) => executeMaterialItensWithCache(req, res));

module.exports = router;
