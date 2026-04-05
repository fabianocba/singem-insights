function resolveApiBase() {
  const base = window.__API_BASE_URL__ || window.CONFIG?.api?.baseUrl || window.location.origin;
  return String(base).replace(/\/+$/, '');
}

function makeUrl(path) {
  return `${resolveApiBase()}${path}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function request(path, options = {}) {
  const response = await fetch(makeUrl(path), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload?.erro || payload?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload;
}

function setAuthTokens(accessToken, refreshToken) {
  window.__SINGEM_AUTH = window.__SINGEM_AUTH || {
    accessToken: null,
    refreshToken: null,
    user: null
  };

  window.__SINGEM_AUTH.accessToken = accessToken || null;
  window.__SINGEM_AUTH.refreshToken = refreshToken || null;
}

export async function loginLocal(login, senha) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: { login, senha }
  });

  setAuthTokens(data?.accessToken, data?.refreshToken);
  return data;
}

export async function fetchMe() {
  const token = window.__SINGEM_AUTH?.accessToken;
  if (!token) {
    throw new Error('Token ausente para /api/auth/me');
  }

  return request('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function fetchGovBrStatus() {
  return request('/api/auth/govbr/status', { method: 'GET' });
}

export async function fetchSerproIdStatus() {
  return request('/api/auth/serproid/status', { method: 'GET' });
}

export function getApiBase() {
  return resolveApiBase();
}
