const crypto = require('crypto');
const { config } = require('../../config');
const integrationCache = require('../core/integrationCache');
const { recordApiCall } = require('../core/auditApiCalls');

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeString(value, maxLength = 400) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function getCkanConfig() {
  const cfg = config.dadosGovCkan || {};
  const integrationsCfg = config.integracoes || {};
  const fallbackBaseUrls = [
    String(cfg.baseUrl || 'https://dados.gov.br/api/3/action').replace(/\/+$/, ''),
    'https://dados.gov.br/dados/api/3/action'
  ];

  const uniqueBaseUrls = Array.from(new Set(fallbackBaseUrls.filter(Boolean)));

  return {
    baseUrl: uniqueBaseUrls[0],
    fallbackBaseUrls: uniqueBaseUrls,
    timeoutMs: Math.max(1000, toNumber(cfg.timeoutMs, 12000)),
    cacheEnabled: integrationsCfg.cacheEnabled !== false && cfg.cacheEnabled !== false,
    cacheTtlSeconds: Math.max(30, toNumber(cfg.cacheTtlSeconds, 300)),
    maxDownloadBytes: Math.max(1024 * 100, toNumber(cfg.maxDownloadBytes, 20 * 1024 * 1024)),
    maxRetries: Math.max(1, Math.min(toNumber(cfg.maxRetries || 3, 3), 6)),
    retryBaseDelayMs: Math.max(100, toNumber(cfg.retryBaseDelayMs || 400, 400))
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(prefix, payload) {
  const hash = crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
  return `${prefix}:${hash}`;
}

function readCache(key) {
  const cfg = getCkanConfig();
  if (!cfg.cacheEnabled) {
    return null;
  }

  return integrationCache.get('dadosgov:ckan', key);
}

function writeCache(key, value, ttlSeconds) {
  const cfg = getCkanConfig();
  if (!cfg.cacheEnabled) {
    return;
  }

  integrationCache.set('dadosgov:ckan', key, value, ttlSeconds);
}

async function fetchWithTimeout(url, options = {}) {
  const cfg = getCkanConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });

    return response;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Timeout ao consultar CKAN do dados.gov.br');
      timeoutError.code = 'DADOSGOV_CKAN_TIMEOUT';
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    if (!error?.code) {
      const networkError = new Error(`Falha de rede ao consultar CKAN: ${error?.message || 'erro desconhecido'}`);
      networkError.code = 'DADOSGOV_CKAN_NETWORK_ERROR';
      networkError.statusCode = 503;
      networkError.details = {
        cause: error?.message || null,
        url
      };
      throw networkError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function requestCkanAction(action, queryParams = {}, context = {}) {
  const cfg = getCkanConfig();
  let lastError = null;

  for (const baseUrl of cfg.fallbackBaseUrls) {
    const endpoint = `${baseUrl}/${action}`;
    const url = new URL(endpoint);

    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, String(value));
    }

    for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
      const startedAt = Date.now();

      try {
        const response = await fetchWithTimeout(url.toString(), {
          headers: {
            Accept: 'application/json, */*',
            'X-Request-Id': context.requestId || ''
          }
        });

        const text = await response.text();
        const payload = parseJsonSafe(text);

        if (!response.ok) {
          const err = new Error(payload?.error?.message || `Erro HTTP ${response.status} no ${action}`);
          err.code = 'DADOSGOV_CKAN_HTTP_ERROR';
          err.statusCode = response.status;
          err.details = payload || { bodyPreview: text.slice(0, 240), endpoint };
          throw err;
        }

        if (!payload || typeof payload !== 'object') {
          const err = new Error(`Resposta não-JSON recebida no ${action}`);
          err.code = 'DADOSGOV_CKAN_NON_JSON_RESPONSE';
          err.statusCode = 502;
          err.details = {
            endpoint,
            bodyPreview: text.slice(0, 240)
          };
          throw err;
        }

        assertCkanSuccess(payload, action);

        await recordApiCall({
          requestId: context.requestId,
          usuario: context.user?.login || context.user?.nome || null,
          rotaInterna: context.routeInterna || '/api/integracoes/dadosgov/ckan',
          endpointExterno: endpoint,
          metodo: 'GET',
          queryParams,
          statusHttp: response.status,
          duracaoMs: Date.now() - startedAt,
          cacheHit: false
        });

        return {
          endpoint,
          payload
        };
      } catch (error) {
        lastError = error;

        const status = Number(error?.statusCode || 0);
        const retryable = attempt < cfg.maxRetries && (status === 408 || status === 429 || status >= 500);

        if (!retryable) {
          break;
        }

        const delayMs = cfg.retryBaseDelayMs * 2 ** (attempt - 1);
        await sleep(delayMs);
      }
    }

    lastError = lastError || new Error(`Falha na operação CKAN: ${action}`);
  }

  throw lastError || new Error(`Falha na operação CKAN: ${action}`);
}

function assertCkanSuccess(payload, endpointName) {
  if (payload?.success !== true) {
    const err = new Error(`Falha na operação CKAN: ${endpointName}`);
    err.code = 'DADOSGOV_CKAN_ACTION_ERROR';
    err.statusCode = 502;
    err.details = payload;
    throw err;
  }
}

class DadosGovCkanClient {
  async packageSearch(q, context = {}) {
    const termo = sanitizeString(q, 200);
    if (!termo) {
      const err = new Error('Parâmetro obrigatório: q');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const key = cacheKey('package_search', { termo });
    const cached = readCache(key);
    if (cached) {
      await recordApiCall({
        requestId: context.requestId,
        usuario: context.user?.login || context.user?.nome || null,
        rotaInterna: context.routeInterna || '/api/integracoes/dadosgov/ckan/package_search',
        endpointExterno: cached.endpoint || '/package_search',
        metodo: 'GET',
        queryParams: { q: termo },
        statusHttp: 200,
        duracaoMs: 0,
        cacheHit: true
      });

      return { ...cached, cache: 'HIT' };
    }

    const cfg = getCkanConfig();
    const actionData = await requestCkanAction('package_search', { q: termo }, context);
    const data = actionData.payload;

    const payload = {
      query: termo,
      endpoint: actionData.endpoint,
      total: data?.result?.count ?? null,
      result: data?.result || {},
      timestamp: new Date().toISOString(),
      cache: 'MISS'
    };

    writeCache(key, payload, cfg.cacheTtlSeconds);
    return payload;
  }

  async packageShow(id, context = {}) {
    const datasetId = sanitizeString(id, 200);
    if (!datasetId) {
      const err = new Error('Parâmetro obrigatório: id');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const key = cacheKey('package_show', { datasetId });
    const cached = readCache(key);
    if (cached) {
      await recordApiCall({
        requestId: context.requestId,
        usuario: context.user?.login || context.user?.nome || null,
        rotaInterna: context.routeInterna || '/api/integracoes/dadosgov/ckan/package_show',
        endpointExterno: cached.endpoint || '/package_show',
        metodo: 'GET',
        queryParams: { id: datasetId },
        statusHttp: 200,
        duracaoMs: 0,
        cacheHit: true
      });

      return { ...cached, cache: 'HIT' };
    }

    const cfg = getCkanConfig();
    const actionData = await requestCkanAction('package_show', { id: datasetId }, context);
    const data = actionData.payload;

    const payload = {
      id: datasetId,
      endpoint: actionData.endpoint,
      result: data?.result || {},
      timestamp: new Date().toISOString(),
      cache: 'MISS'
    };

    writeCache(key, payload, cfg.cacheTtlSeconds);
    return payload;
  }

  async downloadResource(resourceUrl, context = {}) {
    const rawUrl = sanitizeString(resourceUrl, 1200);
    if (!rawUrl) {
      const err = new Error('Parâmetro obrigatório: resource_url');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      const err = new Error('resource_url inválida');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      const err = new Error('resource_url deve usar http/https');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const startedAt = Date.now();

    const response = await fetchWithTimeout(parsed.toString(), {
      headers: {
        Accept: 'application/json, text/csv, application/csv, text/plain, */*'
      }
    });

    if (!response.ok) {
      const err = new Error(`Erro HTTP ${response.status} ao baixar resource_url`);
      err.code = 'DADOSGOV_CKAN_DOWNLOAD_ERROR';
      err.statusCode = response.status;

      await recordApiCall({
        requestId: context.requestId,
        usuario: context.user?.login || context.user?.nome || null,
        rotaInterna: context.routeInterna || '/api/integracoes/dadosgov/ckan/resource_download',
        endpointExterno: parsed.toString(),
        metodo: 'GET',
        queryParams: { resource_url: parsed.toString() },
        statusHttp: response.status,
        duracaoMs: Date.now() - startedAt,
        cacheHit: false
      });

      throw err;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = Number(response.headers.get('content-length') || 0);
    const cfg = getCkanConfig();

    if (contentLength > 0 && contentLength > cfg.maxDownloadBytes) {
      const err = new Error(`Arquivo excede limite permitido (${cfg.maxDownloadBytes} bytes)`);
      err.code = 'DADOSGOV_CKAN_DOWNLOAD_TOO_LARGE';
      err.statusCode = 413;
      throw err;
    }

    const arrayBuffer = await response.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;

    if (byteLength > cfg.maxDownloadBytes) {
      const err = new Error(`Arquivo excede limite permitido (${cfg.maxDownloadBytes} bytes)`);
      err.code = 'DADOSGOV_CKAN_DOWNLOAD_TOO_LARGE';
      err.statusCode = 413;
      throw err;
    }

    await recordApiCall({
      requestId: context.requestId,
      usuario: context.user?.login || context.user?.nome || null,
      rotaInterna: context.routeInterna || '/api/integracoes/dadosgov/ckan/resource_download',
      endpointExterno: parsed.toString(),
      metodo: 'GET',
      queryParams: { resource_url: parsed.toString() },
      statusHttp: 200,
      duracaoMs: Date.now() - startedAt,
      cacheHit: false
    });

    return {
      resourceUrl: parsed.toString(),
      contentType,
      sizeBytes: byteLength,
      bodyBuffer: Buffer.from(arrayBuffer),
      timestamp: new Date().toISOString()
    };
  }

  async health(context = {}) {
    try {
      const result = await this.packageSearch('compras', context);
      return {
        ok: true,
        status: 'UP',
        endpoint: result.endpoint,
        total: result.total,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await recordApiCall({
        requestId: context.requestId,
        usuario: context.user?.login || context.user?.nome || null,
        rotaInterna: context.routeInterna || '/api/integracoes/dadosgov/ckan/health',
        endpointExterno: getCkanConfig().baseUrl,
        metodo: 'GET',
        queryParams: { q: 'compras' },
        statusHttp: Number(error?.statusCode || 500),
        duracaoMs: 0,
        cacheHit: false
      });

      return {
        ok: false,
        status: 'DOWN',
        error: {
          message: error.message,
          code: error.code || 'DADOSGOV_CKAN_HEALTH_ERROR',
          statusCode: Number(error.statusCode || 500)
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = {
  DadosGovCkanClient
};
