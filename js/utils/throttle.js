/**
 * IFDESK - Throttle e Debounce
 * @module utils/throttle
 *
 * Utilitários para controlar frequência de execução.
 * Usar em eventos de scroll, resize, input, etc.
 */

// @ts-check

/**
 * Throttle - executa no máximo uma vez por intervalo
 * @template T
 * @param {Function} fn - Função a executar
 * @param {number} delay - Delay em ms
 * @param {Object} [options] - Opções
 * @param {boolean} [options.leading=true] - Executar na primeira chamada
 * @param {boolean} [options.trailing=true] - Executar após delay
 * @returns {Function & {cancel: Function}} Função throttled
 */
export function throttle(fn, delay, options = {}) {
  const { leading = true, trailing = true } = options;

  let timeoutId = null;
  let lastExecTime = 0;
  let lastArgs = null;
  let lastThis = null;

  const execute = () => {
    lastExecTime = Date.now();
    timeoutId = null;

    if (lastArgs !== null) {
      fn.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
    }
  };

  const throttled = function (...args) {
    const now = Date.now();
    const timeSinceLastExec = now - lastExecTime;

    lastArgs = args;
    lastThis = this;

    if (lastExecTime === 0 && !leading) {
      lastExecTime = now;
      if (trailing) {
        timeoutId = setTimeout(execute, delay);
      }
      return;
    }

    if (timeSinceLastExec >= delay) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      execute();
    } else if (timeoutId === null && trailing) {
      timeoutId = setTimeout(execute, delay - timeSinceLastExec);
    }
  };

  throttled.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastExecTime = 0;
    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

/**
 * Debounce - executa após delay sem novas chamadas
 * @template T
 * @param {Function} fn - Função a executar
 * @param {number} delay - Delay em ms
 * @param {Object} [options] - Opções
 * @param {boolean} [options.leading=false] - Executar na primeira chamada
 * @param {number} [options.maxWait] - Tempo máximo de espera
 * @returns {Function & {cancel: Function, flush: Function}} Função debounced
 */
export function debounce(fn, delay, options = {}) {
  const { leading = false, maxWait } = options;

  let timeoutId = null;
  let maxTimeoutId = null;
  let lastCallTime = 0;
  let lastArgs = null;
  let lastThis = null;
  let result;

  const execute = () => {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = null;
    lastThis = null;
    lastCallTime = 0;

    result = fn.apply(thisArg, args);
    return result;
  };

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
    lastCallTime = 0;
  };

  const flush = () => {
    if (timeoutId === null && maxTimeoutId === null) {
      return result;
    }
    cancel();
    return execute();
  };

  const debounced = function (...args) {
    const now = Date.now();
    const isFirstCall = lastCallTime === 0;

    lastArgs = args;
    lastThis = this;
    lastCallTime = now;

    // Cancela timeout anterior
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Executa imediatamente se leading
    if (isFirstCall && leading) {
      result = execute();

      if (maxWait !== undefined) {
        maxTimeoutId = setTimeout(() => {
          maxTimeoutId = null;
          if (lastArgs !== null) {
            result = execute();
          }
        }, maxWait);
      }

      return result;
    }

    // Agenda execução
    timeoutId = setTimeout(() => {
      timeoutId = null;
      result = execute();

      if (maxTimeoutId !== null) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = null;
      }
    }, delay);

    // maxWait
    if (maxWait !== undefined && maxTimeoutId === null) {
      maxTimeoutId = setTimeout(() => {
        maxTimeoutId = null;
        if (lastArgs !== null) {
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          result = execute();
        }
      }, maxWait);
    }

    return result;
  };

  debounced.cancel = cancel;
  debounced.flush = flush;

  return debounced;
}

/**
 * Debounce com requestAnimationFrame
 * @param {Function} fn - Função a executar
 * @returns {Function & {cancel: Function}} Função debounced
 */
export function debounceRaf(fn) {
  let frameId = null;
  let lastArgs = null;
  let lastThis = null;

  const debounced = function (...args) {
    lastArgs = args;
    lastThis = this;

    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }

    frameId = requestAnimationFrame(() => {
      frameId = null;
      fn.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
    });
  };

  debounced.cancel = () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  return debounced;
}

console.info('✅ Módulo throttle/debounce carregado');
