/**
 * SINGEM - Guards e Helpers de Segurança
 * @module utils/guard
 *
 * Funções para proteger contra erros em operações assíncronas e I/O.
 * NÃO substitui try/catch existentes - apenas adiciona helpers novos.
 */

// @ts-check

/**
 * Envolve função assíncrona com tratamento de erro seguro
 * @template T
 * @param {() => Promise<T>} fn - Função assíncrona
 * @param {Object} options - Opções
 * @param {T} [options.defaultValue] - Valor padrão em caso de erro
 * @param {Function} [options.onError] - Callback para erro
 * @returns {Promise<T|null>} Resultado ou defaultValue
 */
export async function safeAsync(fn, options = {}) {
  const { defaultValue = null, onError } = options;

  try {
    return await fn();
  } catch (error) {
    if (onError) {
      try {
        onError(error);
      } catch (e) {
        console.error('🔴 Erro no callback onError:', e);
      }
    } else {
      console.warn('⚠️ Erro capturado em safeAsync:', error);
    }

    return defaultValue;
  }
}

/**
 * Tenta executar função, retorna valor padrão se falhar
 * @template T
 * @param {() => T} fn - Função a executar
 * @param {T} defaultValue - Valor padrão
 * @returns {T} Resultado ou defaultValue
 */
export function tryOrDefault(fn, defaultValue) {
  try {
    return fn();
  } catch (error) {
    console.warn('⚠️ Erro capturado em tryOrDefault:', error);
    return defaultValue;
  }
}

/**
 * Retry assíncrono com backoff exponencial
 * @template T
 * @param {() => Promise<T>} fn - Função assíncrona
 * @param {Object} options - Opções
 * @param {number} [options.maxRetries=3] - Número máximo de tentativas
 * @param {number} [options.initialDelay=1000] - Delay inicial em ms
 * @param {number} [options.maxDelay=10000] - Delay máximo em ms
 * @param {Function} [options.shouldRetry] - Função para decidir se deve retentar
 * @returns {Promise<T>} Resultado
 * @throws {Error} Se todas as tentativas falharem
 */
export async function retryWithBackoff(fn, options = {}) {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, shouldRetry = () => true } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      console.warn(`⚠️ Tentativa ${attempt + 1}/${maxRetries + 1} falhou, retentando em ${delay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delay));

      // Backoff exponencial
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Timeout para promises
 * @template T
 * @param {Promise<T>} promise - Promise a executar
 * @param {number} ms - Timeout em milissegundos
 * @param {string} [message] - Mensagem de erro customizada
 * @returns {Promise<T>} Promise com timeout
 * @throws {Error} Se timeout for atingido
 */
export function withTimeout(promise, ms, message = `Timeout de ${ms}ms excedido`) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    })
  ]);
}

/**
 * Garante que valor não é null/undefined
 * @template T
 * @param {T|null|undefined} value - Valor a verificar
 * @param {string} [message] - Mensagem de erro
 * @returns {T} Valor garantido não-nulo
 * @throws {Error} Se valor for null/undefined
 */
export function requireNonNull(value, message = 'Valor não pode ser null ou undefined') {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * Verifica se valor é um objeto válido
 * @param {any} value - Valor a verificar
 * @returns {boolean} True se for objeto válido
 */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep clone seguro (sem referências circulares)
 * @template T
 * @param {T} obj - Objeto a clonar
 * @returns {T} Clone do objeto
 */
export function safeClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.warn('⚠️ Erro ao clonar objeto, retornando cópia rasa:', error);
    return { ...obj };
  }
}

/**
 * Memoização simples de função
 * @template T
 * @param {Function} fn - Função a memoizar
 * @param {Function} [keyGenerator] - Gerador de chave do cache
 * @returns {Function} Função memoizada
 */
export function memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return function (...args) {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);

    return result;
  };
}

/**
 * Cache com TTL (Time To Live)
 * @template T
 * @param {Function} fn - Função a cachear
 * @param {number} ttl - Tempo de vida em ms
 * @returns {Function} Função com cache TTL
 */
export function cacheWithTTL(fn, ttl = 5000) {
  const cache = new Map();

  return function (...args) {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }

    const result = fn.apply(this, args);
    cache.set(key, { value: result, timestamp: Date.now() });

    // Limpa cache antigo
    setTimeout(() => cache.delete(key), ttl);

    return result;
  };
}

console.info('✅ Módulo de guards carregado');
