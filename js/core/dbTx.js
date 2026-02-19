/**
 * Database Transaction Helper
 * Garante commits reais no IndexedDB
 */

/**
 * Executa operação em transação com commit garantido
 * @param {IDBDatabase} db - Instância do banco
 * @param {string[]} stores - Array de stores a usar
 * @param {string} mode - 'readonly' ou 'readwrite'
 * @param {Function} callback - Função async com a transação
 * @returns {Promise<any>} Resultado do callback
 */
export function withTx(db, stores, mode, callback) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Banco de dados não inicializado'));
      return;
    }

    try {
      const tx = db.transaction(stores, mode);

      tx.oncomplete = () => {
        console.log('✅ Transação commitada com sucesso');
        resolve(result);
      };

      tx.onerror = () => {
        console.error('❌ Erro na transação:', tx.error);
        reject(new Error(`Transação abortada: ${tx.error?.message || 'Erro desconhecido'}`));
      };

      tx.onabort = () => {
        console.error('❌ Transação abortada');
        reject(new Error('Transação abortada pelo sistema'));
      };

      let result;

      // Executa callback e captura resultado
      Promise.resolve(callback(tx))
        .then((res) => {
          result = res;
          // Não faz nada aqui - aguarda oncomplete
        })
        .catch((error) => {
          console.error('❌ Erro no callback:', error);
          tx.abort();
          reject(error);
        });
    } catch (error) {
      console.error('❌ Erro ao criar transação:', error);
      reject(error);
    }
  });
}

export default { withTx };
