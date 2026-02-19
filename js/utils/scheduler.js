/**
 * IFDESK - Utilitários de Agendamento
 * @module utils/scheduler
 *
 * Funções para agendar tarefas de forma otimizada.
 * Usar em novos componentes para melhor performance.
 */

// @ts-check

/**
 * Adia execução para próximo tick
 * @param {Function} fn - Função a executar
 * @returns {number} ID do timeout
 */
export function defer(fn) {
  return setTimeout(fn, 0);
}

/**
 * Executa quando navegador estiver ocioso
 * @param {Function} fn - Função a executar
 * @param {Object} [options] - Opções
 * @param {number} [options.timeout=1000] - Timeout máximo em ms
 * @returns {number} ID do callback
 */
export function idle(fn, options = {}) {
  const { timeout = 1000 } = options;

  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(fn, { timeout });
  }

  // Fallback para setTimeout
  return setTimeout(fn, 50);
}

/**
 * Cancela callback idle
 * @param {number} id - ID do callback
 */
export function cancelIdle(id) {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Executa no próximo frame de animação
 * @param {Function} fn - Função a executar
 * @returns {number} ID do frame
 */
export function raf(fn) {
  return requestAnimationFrame(fn);
}

/**
 * Cancela frame de animação
 * @param {number} id - ID do frame
 */
export function cancelRaf(id) {
  cancelAnimationFrame(id);
}

/**
 * Executa após N frames
 * @param {Function} fn - Função a executar
 * @param {number} [frames=1] - Número de frames
 * @returns {Function} Função para cancelar
 */
export function afterFrames(fn, frames = 1) {
  let remaining = frames;
  let frameId = null;

  const tick = () => {
    remaining--;
    if (remaining <= 0) {
      fn();
    } else {
      frameId = raf(tick);
    }
  };

  frameId = raf(tick);

  return () => {
    if (frameId !== null) {
      cancelRaf(frameId);
    }
  };
}

/**
 * Agrupa várias execuções em um único frame
 * @returns {Object} Batche de RAF
 */
export function rafBatch() {
  const callbacks = new Set();
  let frameId = null;

  const flush = () => {
    const toExecute = Array.from(callbacks);
    callbacks.clear();
    frameId = null;

    toExecute.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error('🔴 Erro em rafBatch:', error);
      }
    });
  };

  return {
    /**
     * Adiciona callback ao batch
     * @param {Function} fn - Callback
     */
    add(fn) {
      callbacks.add(fn);

      if (frameId === null) {
        frameId = raf(flush);
      }
    },

    /**
     * Remove callback do batch
     * @param {Function} fn - Callback
     */
    remove(fn) {
      callbacks.delete(fn);
    },

    /**
     * Cancela batch pendente
     */
    cancel() {
      if (frameId !== null) {
        cancelRaf(frameId);
        frameId = null;
      }
      callbacks.clear();
    }
  };
}

/**
 * Microtask (Promise.resolve)
 * @param {Function} fn - Função a executar
 * @returns {Promise<void>} Promise
 */
export function microtask(fn) {
  return Promise.resolve().then(fn);
}

/**
 * Agrupa microtasks
 * @returns {Object} Batch de microtasks
 */
export function microtaskBatch() {
  const callbacks = new Set();
  let pending = false;

  const flush = () => {
    const toExecute = Array.from(callbacks);
    callbacks.clear();
    pending = false;

    toExecute.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error('🔴 Erro em microtaskBatch:', error);
      }
    });
  };

  return {
    /**
     * Adiciona callback ao batch
     * @param {Function} fn - Callback
     */
    add(fn) {
      callbacks.add(fn);

      if (!pending) {
        pending = true;
        microtask(flush);
      }
    },

    /**
     * Remove callback do batch
     * @param {Function} fn - Callback
     */
    remove(fn) {
      callbacks.delete(fn);
    },

    /**
     * Limpa batch
     */
    clear() {
      callbacks.clear();
      pending = false;
    }
  };
}

console.info('✅ Módulo de agendamento carregado');
