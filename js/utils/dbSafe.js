/**
 * Utilitário Global: Garantia de Inicialização do IndexedDB
 *
 * PROBLEMA RESOLVIDO:
 * - Módulos de configuração tentavam acessar dbManager antes da inicialização
 * - Erro: "Cannot read properties of null (reading 'transaction')"
 *
 * SOLUÇÃO:
 * - Função global que garante dbManager.db != null
 * - Inicialização sob demanda com retry automático
 * - Compatível com initSafe() (retry + backoff)
 *
 * USO:
 * ```javascript
 * async minhaFuncao() {
 *   await ensureDBReady(); // ← Garante banco inicializado
 *   await window.dbManager.get("config", "chave");
 * }
 * ```
 */

/**
 * Garante que o IndexedDB está inicializado e pronto para uso
 * @returns {Promise<void>}
 * @throws {Error} Se dbManager não estiver disponível após tentativas
 */
window.ensureDBReady = async function () {
  // Verifica se dbManager existe
  if (!window.dbManager) {
    throw new Error('❌ window.dbManager não está disponível. Certifique-se de que db.js foi carregado.');
  }

  // Se já está inicializado, retorna imediatamente
  if (window.dbManager.db) {
    return;
  }

  // Banco não inicializado → inicializa agora
  console.warn('⚠️ IndexedDB não estava inicializado. Inicializando sob demanda...');

  try {
    // Usa initSafe() se disponível (com retry automático)
    if (window.dbManager.initSafe) {
      await window.dbManager.initSafe({ maxRetries: 3, retryDelay: 1000 });
      console.log('✅ IndexedDB inicializado com sucesso via initSafe()');
    } else {
      // Fallback: init() padrão
      await window.dbManager.init();
      console.log('✅ IndexedDB inicializado com sucesso via init()');
    }
  } catch (error) {
    console.error('❌ Falha ao inicializar IndexedDB:', error);
    throw new Error(`Não foi possível inicializar o banco de dados: ${error.message}`);
  }

  // Validação final
  if (!window.dbManager.db) {
    throw new Error('❌ IndexedDB foi inicializado mas db ainda está null');
  }
};

/**
 * Wrapper seguro para operações de leitura
 * @param {string} storeName - Nome da store
 * @param {string|number} key - Chave do registro
 * @returns {Promise<*>} Dados do registro ou null
 */
window.safeDBGet = async function (storeName, key) {
  try {
    await window.ensureDBReady();
    return await window.dbManager.get(storeName, key);
  } catch (error) {
    console.error(`❌ Erro ao ler ${storeName}/${key}:`, error);
    return null;
  }
};

/**
 * Wrapper seguro para operações de escrita
 * @param {string} storeName - Nome da store
 * @param {Object} data - Dados a salvar (deve conter o ID)
 * @returns {Promise<boolean>} True se sucesso, false se falha
 */
window.safeDBUpdate = async function (storeName, data) {
  try {
    await window.ensureDBReady();
    await window.dbManager.update(storeName, data);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${storeName}:`, error);
    return false;
  }
};

/**
 * Wrapper seguro para adicionar registros
 * @param {string} storeName - Nome da store
 * @param {Object} data - Dados a adicionar
 * @returns {Promise<number|null>} ID do registro criado ou null se falha
 */
window.safeDBAdd = async function (storeName, data) {
  try {
    await window.ensureDBReady();
    return await window.dbManager.add(storeName, data);
  } catch (error) {
    console.error(`❌ Erro ao adicionar em ${storeName}:`, error);
    return null;
  }
};

/**
 * Wrapper seguro para remover registros
 * @param {string} storeName - Nome da store
 * @param {string|number} key - Chave do registro
 * @returns {Promise<boolean>} True se sucesso, false se falha
 */
window.safeDBRemove = async function (storeName, key) {
  try {
    await window.ensureDBReady();
    await window.dbManager.remove(storeName, key);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao remover ${storeName}/${key}:`, error);
    return false;
  }
};

console.log('✅ DB Safe Utils carregados:');
console.log('   - ensureDBReady()');
console.log('   - safeDBGet(storeName, key)');
console.log('   - safeDBUpdate(storeName, data)');
console.log('   - safeDBAdd(storeName, data)');
console.log('   - safeDBRemove(storeName, key)');
