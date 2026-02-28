import apiClient from '../../services/apiClient.js';

function toErrorPayload(error) {
  return {
    message: error?.message || 'Erro inesperado na comunicação',
    status: error?.status || 0,
    data: error?.data || null
  };
}

export async function httpRequest(path, options = {}) {
  try {
    const baseUrl = window.CONFIG?.api?.baseUrl || apiClient.config?.baseUrl || '';
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
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
