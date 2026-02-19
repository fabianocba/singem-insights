/**
 * API Client - SINGEM
 * Cliente HTTP para comunicação com backend PostgreSQL
 * Gerencia autenticação JWT e retry automático
 */

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const API_CONFIG = {
  // URL base do servidor (pode ser sobrescrita via localStorage)
  baseUrl: localStorage.getItem('singem_api_url') || 'http://localhost:3000',
  timeout: 30000,
  retries: 3
};

// Chaves de storage
const TOKEN_KEY = 'singem_access_token';
const REFRESH_KEY = 'singem_refresh_token';
const USER_KEY = 'singem_user';

// ============================================================================
// GERENCIAMENTO DE TOKENS
// ============================================================================

function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

function setTokens(accessToken, refreshToken) {
  if (accessToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function getStoredUser() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ============================================================================
// CORE HTTP
// ============================================================================

/**
 * Executa requisição HTTP com retry e refresh de token
 */
async function request(endpoint, options = {}) {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Adiciona token se disponível
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers,
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
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

        if (data.code === 'TOKEN_EXPIRED' && getRefreshToken()) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Retry com novo token
            headers['Authorization'] = `Bearer ${getAccessToken()}`;
            const retryResponse = await fetch(url, { ...config, headers });
            return handleResponse(retryResponse);
          }
        }

        // Token inválido - limpa e notifica
        clearTokens();
        window.dispatchEvent(new CustomEvent('singem:auth:logout', { detail: { reason: 'token_invalid' } }));
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      return handleResponse(response);
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

async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(data.erro || data.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
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

    const data = await response.json();
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
    localStorage.setItem('singem_api_url', url);
  },

  // ========================================================================
  // AUTENTICAÇÃO
  // ========================================================================

  async login(login, senha) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: { login, senha }
    });

    setTokens(data.accessToken, data.refreshToken);
    setStoredUser(data.usuario);

    window.dispatchEvent(new CustomEvent('singem:auth:login', { detail: data.usuario }));

    return data;
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

  // ========================================================================
  // UTILITÁRIOS
  // ========================================================================

  async healthCheck() {
    try {
      const data = await request('/health');
      return { online: true, ...data };
    } catch {
      return { online: false, status: 'OFFLINE' };
    }
  },

  async isOnline() {
    try {
      await request('/health');
      return true;
    } catch {
      return false;
    }
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default apiClient;

// Também exporta funções individuais para flexibilidade
export { apiClient, getAccessToken, getRefreshToken, getStoredUser, clearTokens, API_CONFIG };
