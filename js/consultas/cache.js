/**
 * cache.js
 * Sistema de cache em memória para consultas do Compras.gov.br
 */

/**
 * TTL padrão do cache (5 minutos em ms)
 */
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Armazenamento em memória
 * Chave: hash(dataset + params)
 * Valor: { data, timestamp }
 */
const memoryCache = new Map();

/**
 * Gera chave única para combinação de dataset e filtros
 * @param {string} dataset - Tipo do dataset
 * @param {Object} params - Parâmetros de filtro
 * @returns {string} Hash único
 */
function generateKey(dataset, params) {
  const normalized = JSON.stringify(
    {
      dataset,
      ...params
    },
    Object.keys(params).sort()
  );

  return btoa(normalized);
}

/**
 * Armazena resultado no cache
 * @param {string} dataset - Tipo do dataset
 * @param {Object} params - Parâmetros de filtro
 * @param {*} data - Dados a cachear
 * @param {number} ttl - Tempo de vida em ms (opcional)
 */
export function set(dataset, params, data, ttl = DEFAULT_TTL) {
  const key = generateKey(dataset, params);

  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });

  // Limpa cache expirado periodicamente
  cleanExpired();
}

/**
 * Recupera resultado do cache
 * @param {string} dataset - Tipo do dataset
 * @param {Object} params - Parâmetros de filtro
 * @returns {*|null} Dados cacheados ou null se expirado/inexistente
 */
export function get(dataset, params) {
  const key = generateKey(dataset, params);
  const cached = memoryCache.get(key);

  if (!cached) {
    return null;
  }

  const age = Date.now() - cached.timestamp;

  // Expirou
  if (age > cached.ttl) {
    memoryCache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Verifica se existe cache válido
 * @param {string} dataset - Tipo do dataset
 * @param {Object} params - Parâmetros de filtro
 * @returns {boolean} True se existe e está válido
 */
export function has(dataset, params) {
  return get(dataset, params) !== null;
}

/**
 * Remove item específico do cache
 * @param {string} dataset - Tipo do dataset
 * @param {Object} params - Parâmetros de filtro
 */
export function remove(dataset, params) {
  const key = generateKey(dataset, params);
  memoryCache.delete(key);
}

/**
 * Limpa todo o cache
 */
export function clear() {
  memoryCache.clear();
  console.log('Cache limpo');
}

/**
 * Remove entradas expiradas do cache
 */
function cleanExpired() {
  const now = Date.now();

  for (const [key, value] of memoryCache.entries()) {
    const age = now - value.timestamp;

    if (age > value.ttl) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Retorna estatísticas do cache
 * @returns {Object} { size, entries }
 */
export function getStats() {
  cleanExpired();

  const entries = Array.from(memoryCache.entries()).map(([key, value]) => ({
    key,
    age: Math.round((Date.now() - value.timestamp) / 1000),
    ttl: Math.round(value.ttl / 1000),
    size: JSON.stringify(value.data).length
  }));

  return {
    size: memoryCache.size,
    entries
  };
}

// Limpeza automática a cada 2 minutos
setInterval(cleanExpired, 2 * 60 * 1000);
