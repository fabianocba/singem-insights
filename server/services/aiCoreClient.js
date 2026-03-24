const { config } = require('../config');
const AppError = require('../utils/appError');

function normalizeBaseUrl(value) {
  return String(value || 'http://ai-core:8010').replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const core = String(value || '/ai')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  return core ? `/${core}` : '';
}

function buildAiUrl(pathname = '') {
  const cleanPath = String(pathname || '')
    .trim()
    .replace(/^\/+/, '');
  const suffix = cleanPath ? `/${cleanPath}` : '';
  return `${normalizeBaseUrl(config.ai.baseUrl)}${normalizeApiPrefix(config.ai.apiPrefix)}${suffix}`;
}

function buildHeaders(requestId) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  if (requestId) {
    headers['x-request-id'] = requestId;
  }

  if (config.ai.internalToken) {
    headers[config.ai.internalTokenHeader] = config.ai.internalToken;
  }

  return headers;
}

async function parsePayload(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}));
  }
  return response.text().catch(() => '');
}

function resolvePayloadMessage(payload, fallback) {
  if (payload && typeof payload === 'object') {
    return payload.detail || payload.message || payload.erro || payload.error?.message || payload.error || fallback;
  }
  return String(payload || fallback);
}

async function invokeAi(pathname, { method = 'GET', body, requestId, timeoutMs } = {}) {
  if (!config.ai.enabled) {
    throw new AppError(503, 'AI_CORE_DISABLED', 'Módulo de IA desabilitado no backend');
  }

  const effectiveTimeout =
    Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Number(timeoutMs) : config.ai.timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);

  try {
    const response = await fetch(buildAiUrl(pathname), {
      method,
      headers: buildHeaders(requestId),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });

    const payload = await parsePayload(response);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AppError(503, 'AI_CORE_AUTH_FAILED', 'Serviço de IA rejeitou autenticação interna', {
          upstreamStatus: response.status
        });
      }

      const statusCode = response.status >= 500 ? 502 : response.status;
      throw new AppError(
        statusCode,
        'AI_CORE_REQUEST_FAILED',
        resolvePayloadMessage(payload, `Falha em chamada ao módulo IA (${response.status})`),
        { upstreamStatus: response.status, payload }
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error?.name === 'AbortError') {
      throw new AppError(504, 'AI_CORE_TIMEOUT', 'Serviço de IA não respondeu a tempo', {
        timeoutMs: effectiveTimeout,
        url: buildAiUrl(pathname)
      });
    }

    throw new AppError(503, 'AI_CORE_UNAVAILABLE', 'Serviço de IA indisponível', {
      reason: error?.message || 'Falha de rede',
      url: buildAiUrl(pathname)
    });
  } finally {
    clearTimeout(timer);
  }
}

async function healthCheck({ requestId, timeoutMs } = {}) {
  if (!config.ai.enabled) {
    return {
      ok: false,
      enabled: false,
      status: 'disabled',
      service: 'SINGEM AI Core'
    };
  }

  try {
    const payload = await invokeAi('/health', {
      method: 'GET',
      requestId,
      timeoutMs: timeoutMs || config.ai.healthTimeoutMs
    });

    return {
      enabled: true,
      status: payload?.ok ? 'online' : 'degraded',
      ...payload
    };
  } catch (error) {
    return {
      ok: false,
      enabled: true,
      status: 'offline',
      service: 'SINGEM AI Core',
      code: error.code || 'AI_CORE_UNAVAILABLE',
      error: error.message
    };
  }
}

function search(body, meta = {}) {
  return invokeAi('/search', { method: 'POST', body, ...meta });
}

function suggestItem(body, meta = {}) {
  return invokeAi('/suggest/item', { method: 'POST', body, ...meta });
}

function suggestFornecedor(body, meta = {}) {
  return invokeAi('/suggest/fornecedor', { method: 'POST', body, ...meta });
}

function matchEntity(body, meta = {}) {
  return invokeAi('/match/entity', { method: 'POST', body, ...meta });
}

function reportSummary(body, meta = {}) {
  return invokeAi('/report/summary', { method: 'POST', body, ...meta });
}

function saveFeedback(body, meta = {}) {
  return invokeAi('/feedback', { method: 'POST', body, ...meta });
}

function rebuildIndex(body, meta = {}) {
  return invokeAi('/index/rebuild', { method: 'POST', body, ...meta });
}

function clearIndex(body, meta = {}) {
  return invokeAi('/index/clear', { method: 'POST', body, ...meta });
}

module.exports = {
  buildAiUrl,
  healthCheck,
  search,
  suggestItem,
  suggestFornecedor,
  matchEntity,
  reportSummary,
  saveFeedback,
  rebuildIndex,
  clearIndex
};
