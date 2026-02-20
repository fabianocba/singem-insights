/**
 * SINGEM - IndexedDB Utilities
 * @module db/indexeddb-utils
 *
 * Utilitários para operações seguras e eficientes com IndexedDB.
 * NÃO substitui db.js existente - apenas adiciona helpers novos.
 */

// @ts-check

import { retryWithBackoff } from '../utils/guard.js';

/**
 * Abre banco de dados com retry automático
 * @param {Object} config - Configuração
 * @param {string} config.name - Nome do banco
 * @param {number} config.version - Versão
 * @param {Function} config.upgrade - Callback de upgrade
 * @param {Object} [options] - Opções
 * @param {number} [options.maxRetries=3] - Máximo de tentativas
 * @param {number} [options.retryDelay=1000] - Delay entre tentativas
 * @returns {Promise<IDBDatabase>} Banco de dados
 */
export async function openDBSafe(config, options = {}) {
  const { name, version, upgrade } = config;
  const { maxRetries = 3, retryDelay = 1000 } = options;

  return retryWithBackoff(
    () => {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error('IndexedDB não suportado neste navegador'));
          return;
        }

        const request = indexedDB.open(name, version);

        request.onerror = () => {
          reject(new Error(`Erro ao abrir banco ${name}: ${request.error}`));
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
          try {
            if (upgrade) {
              upgrade(event.target.result, event);
            }
          } catch (error) {
            console.error('🔴 Erro em upgrade:', error);
            reject(error);
          }
        };

        request.onblocked = () => {
          console.warn('⚠️ Banco bloqueado - outra aba pode estar aberta');
        };
      });
    },
    {
      maxRetries,
      initialDelay: retryDelay,
      shouldRetry: (error) => {
        // Não retentar se for erro de versão
        return !error.message.includes('version');
      }
    }
  );
}

/**
 * Executa operação em transação
 * @template T
 * @param {IDBDatabase} db - Banco de dados
 * @param {string[]} storeNames - Nomes das stores
 * @param {string} mode - Modo ('readonly' ou 'readwrite')
 * @param {Function} callback - Callback com transaction
 * @returns {Promise<T>} Resultado
 */
export function withTx(db, storeNames, mode, callback) {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeNames, mode);

      transaction.onerror = () => {
        reject(transaction.error);
      };

      transaction.onabort = () => {
        reject(new Error('Transação abortada'));
      };

      const result = callback(transaction);

      // Se callback retorna Promise, aguarda
      if (result && typeof result.then === 'function') {
        result.then(resolve).catch(reject);
      } else {
        transaction.oncomplete = () => resolve(result);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Insere múltiplos itens em lote
 * @param {IDBDatabase} db - Banco de dados
 * @param {string} storeName - Nome da store
 * @param {Array<any>} items - Itens a inserir
 * @param {Object} [options] - Opções
 * @param {number} [options.batchSize=100] - Tamanho do lote
 * @returns {Promise<number>} Número de itens inseridos
 */
export async function batchPut(db, storeName, items, options = {}) {
  const { batchSize = 100 } = options;
  let inserted = 0;

  // Divide em lotes
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    await withTx(db, [storeName], 'readwrite', (tx) => {
      const store = tx.objectStore(storeName);

      return Promise.all(
        batch.map((item) => {
          return new Promise((resolve, reject) => {
            const request = store.put(item);
            request.onsuccess = () => {
              inserted++;
              resolve(request.result);
            };
            request.onerror = () => reject(request.error);
          });
        })
      );
    });
  }

  return inserted;
}

/**
 * Remove múltiplos itens por IDs
 * @param {IDBDatabase} db - Banco de dados
 * @param {string} storeName - Nome da store
 * @param {Array<any>} keys - Chaves a remover
 * @returns {Promise<number>} Número de itens removidos
 */
export async function batchDelete(db, storeName, keys) {
  let deleted = 0;

  await withTx(db, [storeName], 'readwrite', (tx) => {
    const store = tx.objectStore(storeName);

    return Promise.all(
      keys.map((key) => {
        return new Promise((resolve, reject) => {
          const request = store.delete(key);
          request.onsuccess = () => {
            deleted++;
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      })
    );
  });

  return deleted;
}

/**
 * Conta itens em uma store
 * @param {IDBDatabase} db - Banco de dados
 * @param {string} storeName - Nome da store
 * @param {IDBKeyRange} [range] - Range opcional
 * @returns {Promise<number>} Contagem
 */
export async function countItems(db, storeName, range) {
  return withTx(db, [storeName], 'readonly', (tx) => {
    return new Promise((resolve, reject) => {
      const store = tx.objectStore(storeName);
      const request = range ? store.count(range) : store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Obtém todos os itens de uma store
 * @param {IDBDatabase} db - Banco de dados
 * @param {string} storeName - Nome da store
 * @param {IDBKeyRange} [range] - Range opcional
 * @param {number} [limit] - Limite de itens
 * @returns {Promise<Array>} Lista de itens
 */
export async function getAll(db, storeName, range, limit) {
  return withTx(db, [storeName], 'readonly', (tx) => {
    return new Promise((resolve, reject) => {
      const store = tx.objectStore(storeName);
      const request = limit ? store.getAll(range, limit) : store.getAll(range);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Limpa uma store completamente
 * @param {IDBDatabase} db - Banco de dados
 * @param {string} storeName - Nome da store
 * @returns {Promise<void>} Promise
 */
export async function clearStore(db, storeName) {
  return withTx(db, [storeName], 'readwrite', (tx) => {
    return new Promise((resolve, reject) => {
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Exporta store para array
 * @param {IDBDatabase} db - Banco de dados
 * @param {string} storeName - Nome da store
 * @returns {Promise<Array>} Dados exportados
 */
export async function exportStore(db, storeName) {
  return getAll(db, storeName);
}

/**
 * Importa array para store
 * @param {IDBDatabase} db - Banco de dados
 * @param {string} storeName - Nome da store
 * @param {Array} data - Dados a importar
 * @param {boolean} [clearFirst=false] - Limpar store antes
 * @returns {Promise<number>} Número de itens importados
 */
export async function importStore(db, storeName, data, clearFirst = false) {
  if (clearFirst) {
    await clearStore(db, storeName);
  }

  return batchPut(db, storeName, data);
}

/**
 * Verifica se store existe
 * @param {IDBDatabase} db - Banco de dados
 * @param {string} storeName - Nome da store
 * @returns {boolean} True se existe
 */
export function storeExists(db, storeName) {
  return db.objectStoreNames.contains(storeName);
}

/**
 * Obtém informações sobre store
 * @param {IDBDatabase} db - Banco de dados
 * @param {string} storeName - Nome da store
 * @returns {Promise<Object>} Informações
 */
export async function getStoreInfo(db, storeName) {
  const count = await countItems(db, storeName);

  return withTx(db, [storeName], 'readonly', async (tx) => {
    const store = tx.objectStore(storeName);

    return {
      name: storeName,
      keyPath: store.keyPath,
      autoIncrement: store.autoIncrement,
      indexNames: Array.from(store.indexNames),
      count
    };
  });
}

/**
 * Obtém informações sobre banco
 * @param {IDBDatabase} db - Banco de dados
 * @returns {Promise<Object>} Informações
 */
export async function getDatabaseInfo(db) {
  const storeNames = Array.from(db.objectStoreNames);
  const stores = await Promise.all(storeNames.map((name) => getStoreInfo(db, name)));

  return {
    name: db.name,
    version: db.version,
    stores,
    totalItems: stores.reduce((sum, store) => sum + store.count, 0)
  };
}

console.info('✅ IndexedDB utils carregado');
