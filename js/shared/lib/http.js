import apiClient from '../../services/apiClient.js';

const IS_LOCALHOST = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = (() => {
  if (typeof window === 'undefined') {
    return '';
  }

  if (window.__API_BASE_URL__) {
    return String(window.__API_BASE_URL__);
  }

  if (IS_LOCALHOST) {
    return window.CONFIG?.api?.baseUrl || apiClient.config?.baseUrl || window.location.origin;
  }

  return window.CONFIG?.api?.baseUrl || apiClient.config?.baseUrl || window.location.origin;
})();

function toErrorPayload(error) {
  return {
    message: error?.message || 'Erro inesperado na comunicação',
    status: error?.status || 0,
    data: error?.data || null,
    isAbort: error?.name === 'AbortError'
  };
}

function resolveUrl(path) {
  if (/^https?:\/\//i.test(String(path || ''))) {
    return String(path);
  }

  return `${API_BASE_URL}${path}`;
}

export function resolveApiUrl(path) {
  return resolveUrl(path);
}

function getAuthToken() {
  return window.__SINGEM_AUTH?.accessToken || null;
}

export async function httpRequest(path, options = {}) {
  try {
    const url = resolveUrl(path);

    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body;
    if (options.body !== undefined) {
      body = options.rawBody ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body,
      signal: options.signal
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      return {
        ok: false,
        error: {
          message: payload?.erro || payload?.message || `HTTP ${response.status}`,
          status: response.status,
          data: payload
        }
      };
    }

    return { ok: true, data: payload };
  } catch (error) {
    return { ok: false, error: toErrorPayload(error) };
  }
}

export async function apiHealth() {
  return httpRequest('/health');
}
