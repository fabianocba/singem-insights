const { config } = require('../config');

const TRANSIENT_STATUS = new Set([502, 503, 504]);

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonSafe(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

function normalizeBaseUrl(value) {
  const normalized = String(value || 'https://dadosabertos.compras.gov.br').replace(/\/+$/, '');
  if (!normalized.startsWith('https://')) {
    return 'https://dadosabertos.compras.gov.br';
  }

  return normalized;
}

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeQueryValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeQueryValue(entry));
  }

  if (typeof value === 'string') {
    return normalizeText(value);
  }

  return value;
}

function getComprasApiConfig() {
  const baseUrl = normalizeBaseUrl(
    process.env.COMPRAS_API_BASE_URL || process.env.COMPRASGOV_BASE_URL || 'https://dadosabertos.compras.gov.br'
  );
  const timeoutMs = Math.max(1000, toNumber(process.env.COMPRAS_API_TIMEOUT_MS || config.comprasApi?.timeoutMs, 15000));
  const maxRetries = Math.max(
    0,
    Math.min(toNumber(process.env.COMPRAS_API_MAX_RETRIES || config.comprasApi?.maxRetries, 2), 5)
  );
  const retryBaseDelayMs = Math.max(
    100,
    toNumber(process.env.COMPRAS_API_RETRY_BASE_DELAY_MS || config.comprasApi?.retryBaseDelayMs, 400)
  );
  const apiToken = String(process.env.COMPRAS_API_TOKEN || process.env.COMPRASGOV_API_TOKEN || '').trim();

  return {
    baseUrl,
    timeoutMs,
    maxRetries,
    retryBaseDelayMs,
    apiToken,
    acceptHeader: '*/*'
  };
}

function buildHeaders({ requestId, userAgent }) {
  const cfg = getComprasApiConfig();
  const headers = {
    accept: cfg.acceptHeader,
    'User-Agent': String(userAgent || 'SINGEM-Server/1.0')
  };

  if (requestId) {
    headers['X-Request-Id'] = String(requestId);
  }

  if (cfg.apiToken) {
    headers.Authorization = `Bearer ${cfg.apiToken}`;
  }

  return headers;
}

function assertAllowedModuloPath(pathname) {
  const safePath = String(pathname || '').trim();
  if (!safePath.startsWith('/modulo-')) {
    const err = new Error('Caminho de upstream inválido. Apenas paths iniciados com /modulo- são permitidos.');
    err.statusCode = 400;
    err.code = 'COMPRAS_INVALID_PATH';
    throw err;
  }

  if (safePath.includes('://') || safePath.includes('..')) {
    const err = new Error('Caminho de upstream potencialmente inseguro.');
    err.statusCode = 400;
    err.code = 'COMPRAS_UNSAFE_PATH';
    throw err;
  }

  return safePath;
}

class ComprasApiClient {
  getBaseUrl() {
    return getComprasApiConfig().baseUrl;
  }

  async get(pathname, { query = {}, requestId, userAgent, timeoutMs: timeoutOverrideMs } = {}) {
    const cfg = getComprasApiConfig();
    const safePath = assertAllowedModuloPath(pathname);
    const url = new URL(`${cfg.baseUrl}${safePath}`);
    const effectiveTimeoutMs = Math.max(1000, toNumber(timeoutOverrideMs, cfg.timeoutMs));

    Object.entries(query || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      const normalizedValue = normalizeQueryValue(value);
      if (Array.isArray(normalizedValue)) {
        normalizedValue.forEach((entry) => {
          if (entry === undefined || entry === null || entry === '') {
            return;
          }

          url.searchParams.append(String(key), String(entry));
        });
        return;
      }

      if (normalizedValue === undefined || normalizedValue === null || normalizedValue === '') {
        return;
      }

      url.searchParams.set(String(key), String(normalizedValue));
    });

    let lastError = null;
    const startedAt = Date.now();

    for (let attempt = 1; attempt <= cfg.maxRetries + 1; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: buildHeaders({ requestId, userAgent }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const rawText = await response.text();
        const parsed = parseJsonSafe(rawText);
        const payload = parsed !== null ? parsed : { message: rawText || `HTTP ${response.status}` };

        if (!response.ok) {
          const upstreamStatus = Number(response.status || 0);
          const err = new Error(
            payload?.message || payload?.erro || `Falha no upstream Compras.gov.br (HTTP ${upstreamStatus})`
          );
          err.code = 'COMPRAS_UPSTREAM_ERROR';
          err.statusCode = upstreamStatus;
          err.upstreamStatus = upstreamStatus;
          err.details = {
            url: url.toString(),
            response: payload,
            attempt
          };
          throw err;
        }

        return {
          statusCode: Number(response.status || 200),
          upstreamStatus: Number(response.status || 200),
          data: payload,
          latencyMs: Date.now() - startedAt,
          attempt,
          baseUrl: cfg.baseUrl,
          url: url.toString(),
          timeoutMs: effectiveTimeoutMs
        };
      } catch (error) {
        clearTimeout(timeoutId);

        const statusCode = Number(error?.upstreamStatus || error?.statusCode || 0);
        const timedOut = error?.name === 'AbortError';
        const transient = timedOut || TRANSIENT_STATUS.has(statusCode);

        const normalizedError = new Error(error?.message || 'Erro de rede ao consultar Compras.gov.br');
        normalizedError.details = error?.details || null;

        if (timedOut) {
          normalizedError.code = 'COMPRAS_TIMEOUT';
          normalizedError.statusCode = 504;
          normalizedError.upstreamStatus = 504;
          normalizedError.message = `Timeout ao consultar Compras.gov.br (${effectiveTimeoutMs} ms)`;
        } else {
          normalizedError.code = error?.code || 'COMPRAS_NETWORK_ERROR';
          normalizedError.statusCode = statusCode || 502;
          normalizedError.upstreamStatus = statusCode || 0;
        }

        normalizedError.timeoutMs = effectiveTimeoutMs;
        normalizedError.upstreamUrl = url.toString();
        normalizedError.errorType = timedOut ? 'timeout' : 'upstream';

        lastError = normalizedError;

        if (!transient || attempt > cfg.maxRetries) {
          break;
        }

        const delay = cfg.retryBaseDelayMs * 2 ** (attempt - 1);
        await sleep(delay);
      }
    }

    lastError.latencyMs = Date.now() - startedAt;
    lastError.timeoutMs = lastError.timeoutMs || effectiveTimeoutMs;
    lastError.upstreamUrl = lastError.upstreamUrl || url.toString();
    throw lastError;
  }
}

module.exports = new ComprasApiClient();
