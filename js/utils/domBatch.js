/**
 * IFDESK - DOM Batch Operations
 * @module utils/domBatch
 *
 * Agrupa operações DOM para evitar layout thrashing.
 * Usar em novos componentes com muitas manipulações DOM.
 */

// @ts-check

/**
 * Batch de leituras e escritas do DOM
 * @returns {Object} Batches read/write
 */
export function createDOMBatch() {
  const reads = [];
  const writes = [];
  let scheduled = false;

  const flush = () => {
    scheduled = false;

    // Executa todas as leituras primeiro
    const readResults = reads.map((fn) => {
      try {
        return fn();
      } catch (error) {
        console.error('🔴 Erro em DOM read:', error);
        return null;
      }
    });

    // Depois todas as escritas
    writes.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error('🔴 Erro em DOM write:', error);
      }
    });

    reads.length = 0;
    writes.length = 0;

    return readResults;
  };

  const schedule = () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(flush);
    }
  };

  return {
    /**
     * Agenda leitura do DOM
     * @param {Function} fn - Função de leitura
     * @returns {Promise<any>} Resultado da leitura
     */
    read(fn) {
      return new Promise((resolve) => {
        reads.push(() => {
          const result = fn();
          resolve(result);
          return result;
        });
        schedule();
      });
    },

    /**
     * Agenda escrita no DOM
     * @param {Function} fn - Função de escrita
     * @returns {Promise<void>} Promise
     */
    write(fn) {
      return new Promise((resolve) => {
        writes.push(() => {
          fn();
          resolve();
        });
        schedule();
      });
    },

    /**
     * Força execução imediata
     * @returns {Array} Resultados das leituras
     */
    flush() {
      if (scheduled) {
        cancelAnimationFrame(scheduled);
      }
      return flush();
    },

    /**
     * Limpa batch pendente
     */
    clear() {
      reads.length = 0;
      writes.length = 0;
      if (scheduled) {
        cancelAnimationFrame(scheduled);
        scheduled = false;
      }
    }
  };
}

/**
 * Batch global padrão
 */
const globalBatch = createDOMBatch();

/**
 * Agenda leitura do DOM (batch global)
 * @param {Function} fn - Função de leitura
 * @returns {Promise<any>} Resultado
 */
export function readDOM(fn) {
  return globalBatch.read(fn);
}

/**
 * Agenda escrita no DOM (batch global)
 * @param {Function} fn - Função de escrita
 * @returns {Promise<void>} Promise
 */
export function writeDOM(fn) {
  return globalBatch.write(fn);
}

/**
 * Mede dimensões de elemento de forma otimizada
 * @param {HTMLElement} element - Elemento a medir
 * @returns {Promise<DOMRect>} Dimensões
 */
export async function measureElement(element) {
  return readDOM(() => element.getBoundingClientRect());
}

/**
 * Aplica estilos de forma otimizada
 * @param {HTMLElement} element - Elemento
 * @param {Object} styles - Estilos a aplicar
 * @returns {Promise<void>} Promise
 */
export async function applyStyles(element, styles) {
  return writeDOM(() => {
    Object.assign(element.style, styles);
  });
}

/**
 * Lê e escreve em sequência otimizada
 * @param {Function} readFn - Função de leitura
 * @param {Function} writeFn - Função de escrita
 * @returns {Promise<any>} Resultado da leitura
 */
export async function readWrite(readFn, writeFn) {
  const result = await readDOM(readFn);
  await writeDOM(() => writeFn(result));
  return result;
}

/**
 * Batch de múltiplas leituras
 * @param {...Function} fns - Funções de leitura
 * @returns {Promise<Array>} Resultados
 */
export function batchReads(...fns) {
  return Promise.all(fns.map((fn) => readDOM(fn)));
}

/**
 * Batch de múltiplas escritas
 * @param {...Function} fns - Funções de escrita
 * @returns {Promise<void[]>} Promises
 */
export function batchWrites(...fns) {
  return Promise.all(fns.map((fn) => writeDOM(fn)));
}

console.info('✅ Módulo DOM batch carregado');
