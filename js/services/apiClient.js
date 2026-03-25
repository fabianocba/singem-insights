/**
 * API Client - SINGEM
 * Cliente HTTP para comunicação com backend PostgreSQL
 * Gerencia autenticação JWT e retry automático
 */

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const API_CONFIG = {
  // URL base do servidor
  baseUrl:
    window.__API_BASE_URL__ ||
    window.CONFIG?.api?.baseUrl ||
    window.location.origin,
  timeout: 30000,
  retries: 3,
  retryBaseDelayMs: 500
};

const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const authState = {
  accessToken: null,
  refreshToken: null,
  user: null
};

window.__SINGEM_AUTH = authState;

// ============================================================================
// GERENCIAMENTO DE TOKENS
// ============================================================================

function getAccessToken() {
  return authState.accessToken;
}

function getRefreshToken() {
  return authState.refreshToken;
}

function setTokens(accessToken, refreshToken) {
  authState.accessToken = accessToken || null;
  authState.refreshToken = refreshToken || null;
}

function clearTokens() {
  authState.accessToken = null;
  authState.refreshToken = null;
  authState.user = null;
}

function getStoredUser() {
  return authState.user;
}

function setStoredUser(user) {
  authState.user = user || null;
}

// ============================================================================
// CORE HTTP
// ============================================================================

/**
 * Executa requisição HTTP com retry e refresh de token
 */
async function request(endpoint, options = {}) {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;
  const method = String(options.method || 'GET').toUpperCase();
  const { headers: customHeaders, body, unwrap = true, ...fetchOptions } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  // Adiciona token se disponível
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
    ...fetchOptions
  };

  if (body instanceof FormData) {
    delete headers['Content-Type'];
    config.body = body;
  } else if (body !== undefined && body !== null && typeof body === 'object') {
    config.body = JSON.stringify(body);
  } else if (body !== undefined) {
    config.body = body;
  }

  let lastError;

  for (let attempt = 1; attempt <= API_CONFIG.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(url, { ...config, signal: controller.signal });
      clearTimeout(timeoutId);

      // Token expirado - tenta refresh
      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        const isLoginRequest = endpoint === '/api/auth/login';

        // No login, 401 normalmente significa credencial inválida
        if (isLoginRequest) {
          return handleResponse(response, data, unwrap);
        }

        if (data.code === 'TOKEN_EXPIRED' && getRefreshToken()) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Retry com novo token
            headers['Authorization'] = `Bearer ${getAccessToken()}`;
            const retryResponse = await fetch(url, { ...config, headers });
            return handleResponse(retryResponse, undefined, unwrap);
          }
        }

        // Token inválido - limpa e notifica
        clearTokens();
        window.dispatchEvent(new CustomEvent('singem:auth:logout', { detail: { reason: 'token_invalid' } }));
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      if (attempt < API_CONFIG.retries && shouldRetryStatus(response.status, method)) {
        await sleep(getRetryDelay(attempt));
        continue;
      }

      return handleResponse(response, undefined, unwrap);
    } catch (err) {
      lastError = err;

      if (err.name === 'AbortError') {
        throw new Error('Timeout: servidor não respondeu');
      }

      // Retry em erros de rede
      if (attempt < API_CONFIG.retries && isNetworkError(err)) {
        await sleep(1000 * attempt);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

function shouldRetryStatus(status, method = 'GET') {
  return RETRYABLE_METHODS.has(String(method || 'GET').toUpperCase()) && RETRYABLE_STATUS.has(Number(status || 0));
}

function getRetryDelay(attempt) {
  return API_CONFIG.retryBaseDelayMs * attempt;
}

function unwrapSuccessPayload(data) {
  if (data && typeof data === 'object' && data.status === 'success' && Object.hasOwn(data, 'data')) {
    return data.data;
  }

  return data;
}

async function handleResponse(response, parsedData = undefined, unwrap = true) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  const data = parsedData !== undefined ? parsedData : isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      data?.erro || data?.message || data?.error?.message || data?.error || `HTTP ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return unwrap ? unwrapSuccessPayload(data) : data;
}

function isNetworkError(err) {
  return err.name === 'TypeError' || err.message.includes('Failed to fetch');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Renova token de acesso usando refresh token
 */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const raw = await response.json();
    const data = raw?.data || raw;
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// ============================================================================
// API CLIENT - INTERFACE PÚBLICA
// ============================================================================

const apiClient = {
  // Configuração
  config: API_CONFIG,

  setBaseUrl(url) {
    API_CONFIG.baseUrl = url;
  },

  async get(endpoint, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'GET'
    });
  },

  async getEnvelope(endpoint, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'GET',
      unwrap: false
    });
  },

  async post(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body
    });
  },

  async postEnvelope(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body,
      unwrap: false
    });
  },

  async put(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'PUT',
      body
    });
  },

  async patch(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'PATCH',
      body
    });
  },

  async delete(endpoint, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  },

  // ========================================================================
  // AUTENTICAÇÃO
  // ========================================================================

  async login(login, senha) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: { login, senha }
    });

    const usuario = data.usuario || data.user || null;

    setTokens(data.accessToken, data.refreshToken);
    setStoredUser(usuario);

    window.dispatchEvent(new CustomEvent('singem:auth:login', { detail: { usuario } }));

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      usuario
    };
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignora erro - limpa tokens locais de qualquer forma
    }
    clearTokens();
    window.dispatchEvent(new CustomEvent('singem:auth:logout', { detail: { reason: 'user_action' } }));
  },

  async register(dados) {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: dados
    });

    if (data.accessToken) {
      setTokens(data.accessToken, data.refreshToken);
      setStoredUser(data.usuario);
    }

    return data;
  },

  async getMe() {
    return request('/api/auth/me');
  },

  async changePassword(senhaAtual, novaSenha) {
    const result = await request('/api/auth/password', {
      method: 'PUT',
      body: { senhaAtual, novaSenha }
    });
    clearTokens();
    return result;
  },

  isAuthenticated() {
    return !!getAccessToken();
  },

  getUser() {
    return getStoredUser();
  },

  // ========================================================================
  // EMPENHOS
  // ========================================================================

  empenhos: {
    async listar(filtros = {}) {
      const params = new URLSearchParams();
      if (filtros.ano) {
        params.set('ano', filtros.ano);
      }
      if (filtros.status) {
        params.set('status', filtros.status);
      }
      if (filtros.cnpj) {
        params.set('cnpj', filtros.cnpj);
      }
      if (filtros.busca) {
        params.set('busca', filtros.busca);
      }
      if (filtros.limite) {
        params.set('limite', filtros.limite);
      }
      if (filtros.offset) {
        params.set('offset', filtros.offset);
      }

      const query = params.toString();
      return request(`/api/empenhos${query ? '?' + query : ''}`);
    },

    async buscar(id) {
      return request(`/api/empenhos/${id}`);
    },

    async buscarPorSlug(slug) {
      return request(`/api/empenhos/slug/${slug}`);
    },

    async criar(dados) {
      return request('/api/empenhos', {
        method: 'POST',
        body: dados
      });
    },

    async atualizar(id, dados) {
      return request(`/api/empenhos/${id}`, {
        method: 'PUT',
        body: dados
      });
    },

    async excluir(id) {
      return request(`/api/empenhos/${id}`, {
        method: 'DELETE'
      });
    },

    async sincronizar(operacoes) {
      return request('/api/empenhos/sync', {
        method: 'POST',
        body: { operacoes }
      });
    }
  },

  ai: {
    async health(options = {}) {
      return request('/api/ai/health', {
        ...options,
        method: 'GET'
      });
    },

    async search(payload, options = {}) {
      return request('/api/ai/search', {
        ...options,
        method: 'POST',
        body: payload
      });
    },

    async suggestItem(payload, options = {}) {
      return request('/api/ai/suggest/item', {
        ...options,
        method: 'POST',
        body: payload
      });
    },

    async suggestFornecedor(payload, options = {}) {
      return request('/api/ai/suggest/fornecedor', {
        ...options,
        method: 'POST',
        body: payload
      });
    },

    async matchEntity(payload, options = {}) {
      return request('/api/ai/match/entity', {
        ...options,
        method: 'POST',
        body: payload
      });
    },

    async reportSummary(payload, options = {}) {
      return request('/api/ai/report/summary', {
        ...options,
        method: 'POST',
        body: payload
      });
    },

    async feedback(payload, options = {}) {
      return request('/api/ai/feedback', {
        ...options,
        method: 'POST',
        body: payload
      });
    },

    async rebuildIndex(payload, options = {}) {
      return request('/api/ai/index/rebuild', {
        ...options,
        method: 'POST',
        body: payload
      });
    },

    async clearIndex(payload, options = {}) {
      return request('/api/ai/index/clear', {
        ...options,
        method: 'POST',
        body: payload
      });
    }
  },

  // ========================================================================
  // UTILITÁRIOS
  // ========================================================================

  async healthCheck() {
    try {
      const data = await request('/health');
      return { online: true, ...data };
    } catch {
      try {
        const data = await request('/api/health');
        return { online: true, ...data };
      } catch {
        return { online: false, status: 'OFFLINE' };
      }
    }
  },

  async isOnline() {
    try {
      await request('/health');
      return true;
    } catch {
      try {
        await request('/api/health');
        return true;
      } catch {
        return false;
      }
    }
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default apiClient;

// Também exporta funções individuais para flexibilidade
export { apiClient, getAccessToken, getRefreshToken, getStoredUser, clearTokens, API_CONFIG };
