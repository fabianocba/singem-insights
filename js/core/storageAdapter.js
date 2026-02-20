/**
 * Storage Adapter - Camada unificada de persistência
 * Fornece interface única para backup/restore de todos os dados
 *
 * @module storageAdapter
 */

// Versão dos dados (independente da versão do app)
export const DATA_VERSION = '1.0.0';

// ============================================================================
// STORAGE ADAPTER - Interface Unificada
// ============================================================================

class StorageAdapter {
  constructor() {
    this.DATA_VERSION_KEY = 'SINGEM_data_version';
  }

  // ==========================================================================
  // MÉTODOS PRINCIPAIS
  // ==========================================================================

  /**
   * Obtém um valor por chave
   * @param {string} key - Chave do item
   * @param {string} source - Fonte: 'localStorage', 'indexedDB', 'auto'
   * @returns {Promise<any>}
   */
  async get(key, source = 'auto') {
    if (source === 'localStorage' || source === 'auto') {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
    }

    if (source === 'indexedDB' || source === 'auto') {
      if (window.dbManager?.db) {
        try {
          return await this._getFromIndexedDB(key);
        } catch (e) {
          console.warn('[StorageAdapter] Erro ao buscar no IndexedDB:', e);
        }
      }
    }

    return null;
  }

  /**
   * Define um valor por chave
   * @param {string} key - Chave do item
   * @param {any} value - Valor a salvar
   * @param {string} target - Destino: 'localStorage', 'indexedDB', 'both'
   * @returns {Promise<void>}
   */
  async set(key, value, target = 'localStorage') {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    if (target === 'localStorage' || target === 'both') {
      localStorage.setItem(key, serialized);
    }

    if (target === 'indexedDB' || target === 'both') {
      if (window.dbManager?.db) {
        await this._setToIndexedDB(key, value);
      }
    }
  }

  /**
   * Remove um item por chave
   * @param {string} key - Chave do item
   * @param {string} source - Fonte: 'localStorage', 'indexedDB', 'both'
   * @returns {Promise<void>}
   */
  async remove(key, source = 'both') {
    if (source === 'localStorage' || source === 'both') {
      localStorage.removeItem(key);
    }

    if (source === 'indexedDB' || source === 'both') {
      if (window.dbManager?.db) {
        await this._removeFromIndexedDB(key);
      }
    }
  }

  /**
   * Lista todas as chaves conhecidas
   * @returns {Promise<Object>}
   */
  async listKeys() {
    const result = {
      localStorage: [],
      indexedDB: {
        stores: [],
        configKeys: []
      }
    };

    // LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
      result.localStorage.push(localStorage.key(i));
    }

    // IndexedDB
    if (window.dbManager?.db) {
      result.indexedDB.stores = Array.from(window.dbManager.db.objectStoreNames);

      // Buscar chaves da store config
      try {
        const configKeys = await this._getConfigKeys();
        result.indexedDB.configKeys = configKeys;
      } catch (e) {
        console.warn('[StorageAdapter] Erro ao listar config keys:', e);
      }
    }

    return result;
  }

  // ==========================================================================
  // EXPORTAR TODOS OS DADOS
  // ==========================================================================

  /**
   * Exporta todos os dados do sistema para JSON
   * @returns {Promise<Object>}
   */
  async exportAll() {
    console.log('[StorageAdapter] 📤 Exportando todos os dados...');

    const backup = {
      meta: {
        appVersion: window.APP_VERSION || '1.0.0',
        dataVersion: DATA_VERSION,
        exportedAt: new Date().toISOString(),
        source: 'SINGEM Storage Adapter'
      },
      localStorage: {},
      indexedDB: {}
    };

    // =======================================================================
    // 1. Exportar LocalStorage (apenas chaves do SINGEM)
    // =======================================================================
    const SINGEMKeys = [
      'session',
      'SINGEM_app_version',
      'SINGEM_data_version',
      'SINGEM_logs',
      'SINGEM_auth_flags',
      'SINGEM_auth_login'
      // NÃO exportar SINGEM_auth_pass (senha)
    ];

    for (const key of SINGEMKeys) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          backup.localStorage[key] = JSON.parse(value);
        } catch {
          backup.localStorage[key] = value;
        }
      }
    }

    // =======================================================================
    // 2. Exportar IndexedDB (ControleMaterialDB)
    // =======================================================================
    if (window.dbManager?.db) {
      const db = window.dbManager.db;
      const storeNames = Array.from(db.objectStoreNames);

      for (const storeName of storeNames) {
        try {
          const records = await this._getAllFromStore(db, storeName);
          backup.indexedDB[storeName] = records;
          console.log(`[StorageAdapter] ✅ ${storeName}: ${records.length} registros`);
        } catch (e) {
          console.warn(`[StorageAdapter] ⚠️ Erro ao exportar ${storeName}:`, e);
          backup.indexedDB[storeName] = { error: e.message };
        }
      }
    }

    // =======================================================================
    // 3. Estatísticas
    // =======================================================================
    backup.meta.stats = {
      empenhos: backup.indexedDB.empenhos?.length || 0,
      notasFiscais: backup.indexedDB.notasFiscais?.length || 0,
      arquivos: backup.indexedDB.arquivos?.length || 0,
      localStorageKeys: Object.keys(backup.localStorage).length,
      indexedDBStores: Object.keys(backup.indexedDB).length
    };

    console.log('[StorageAdapter] ✅ Exportação concluída:', backup.meta.stats);

    return backup;
  }

  // ==========================================================================
  // IMPORTAR DADOS
  // ==========================================================================

  /**
   * Importa dados de um backup JSON
   * @param {Object} backup - Objeto de backup
   * @param {string} mode - 'merge' (mesclar) ou 'replace' (substituir tudo)
   * @returns {Promise<Object>} Resultado da importação
   */
  async importAll(backup, mode = 'merge') {
    console.log(`[StorageAdapter] 📥 Importando dados (modo: ${mode})...`);

    if (!backup || !backup.meta) {
      throw new Error('Backup inválido: meta informações ausentes');
    }

    const result = {
      success: true,
      mode,
      imported: {
        localStorage: 0,
        indexedDB: {}
      },
      errors: []
    };

    try {
      // =====================================================================
      // 1. Importar LocalStorage
      // =====================================================================
      if (backup.localStorage) {
        for (const [key, value] of Object.entries(backup.localStorage)) {
          // Pular chaves sensíveis
          if (key.includes('pass') || key.includes('senha')) {
            continue;
          }

          try {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serialized);
            result.imported.localStorage++;
          } catch (e) {
            result.errors.push(`localStorage.${key}: ${e.message}`);
          }
        }
      }

      // =====================================================================
      // 2. Importar IndexedDB
      // =====================================================================
      console.log('[StorageAdapter] 🔍 Verificando backup.indexedDB:', Object.keys(backup.indexedDB || {}));
      console.log('[StorageAdapter] 🔍 dbManager disponível:', !!window.dbManager?.db);

      if (backup.indexedDB && window.dbManager?.db) {
        const db = window.dbManager.db;
        console.log('[StorageAdapter] 🔍 Stores no banco:', Array.from(db.objectStoreNames));

        for (const [storeName, records] of Object.entries(backup.indexedDB)) {
          console.log(`[StorageAdapter] 🔄 Processando store ${storeName}:`, {
            isArray: Array.isArray(records),
            length: records?.length,
            type: typeof records
          });

          if (!Array.isArray(records)) {
            console.warn(`[StorageAdapter] ⚠️ ${storeName} não é array, pulando`);
            continue;
          }

          if (!db.objectStoreNames.contains(storeName)) {
            result.errors.push(`Store ${storeName} não existe no banco`);
            console.warn(`[StorageAdapter] ⚠️ Store ${storeName} não existe no banco`);
            continue;
          }

          try {
            console.log(`[StorageAdapter] 📥 Importando ${records.length} registros para ${storeName}...`);
            const importedCount = await this._importToStore(db, storeName, records, mode);
            result.imported.indexedDB[storeName] = importedCount;
            console.log(`[StorageAdapter] ✅ ${storeName}: ${importedCount} registros importados`);
          } catch (e) {
            result.errors.push(`${storeName}: ${e.message}`);
            console.error(`[StorageAdapter] ❌ Erro ao importar ${storeName}:`, e);
          }
        }
      } else {
        console.error('[StorageAdapter] ❌ Não foi possível importar IndexedDB:', {
          hasIndexedDB: !!backup.indexedDB,
          hasDbManager: !!window.dbManager,
          hasDb: !!window.dbManager?.db
        });
      }

      // =====================================================================
      // 3. Atualizar versão dos dados
      // =====================================================================
      localStorage.setItem(this.DATA_VERSION_KEY, DATA_VERSION);

      console.log('[StorageAdapter] ✅ Importação concluída:', result.imported);
    } catch (error) {
      result.success = false;
      result.errors.push(error.message);
      console.error('[StorageAdapter] ❌ Erro na importação:', error);
    }

    return result;
  }

  // ==========================================================================
  // MÉTODOS AUXILIARES - IndexedDB
  // ==========================================================================

  async _getFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const tx = window.dbManager.db.transaction(['config'], 'readonly');
      const store = tx.objectStore('config');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _setToIndexedDB(key, value) {
    return new Promise((resolve, reject) => {
      const tx = window.dbManager.db.transaction(['config'], 'readwrite');
      const store = tx.objectStore('config');
      const request = store.put({ id: key, ...value, dataAtualizacao: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async _removeFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const tx = window.dbManager.db.transaction(['config'], 'readwrite');
      const store = tx.objectStore('config');
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async _getConfigKeys() {
    return new Promise((resolve, reject) => {
      const tx = window.dbManager.db.transaction(['config'], 'readonly');
      const store = tx.objectStore('config');
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async _getAllFromStore(db, storeName) {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async _importToStore(db, storeName, records, mode) {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        let imported = 0;
        let errors = 0;

        console.log(`[StorageAdapter] 🔧 Iniciando transação para ${storeName}, ${records.length} registros`);

        // Se modo replace, limpar store primeiro
        if (mode === 'replace') {
          const clearRequest = store.clear();
          clearRequest.onerror = () => {
            console.warn(`[StorageAdapter] Erro ao limpar ${storeName}`);
          };
        }

        // Importar registros
        for (const record of records) {
          try {
            // Para modo merge, usar put (atualiza se existir)
            const request = store.put(record);
            request.onsuccess = () => {
              imported++;
            };
            request.onerror = (e) => {
              errors++;
              console.warn(`[StorageAdapter] Erro ao inserir registro:`, e.target.error);
            };
          } catch (e) {
            errors++;
            console.warn(`[StorageAdapter] Erro ao importar registro em ${storeName}:`, e);
          }
        }

        tx.oncomplete = () => {
          console.log(`[StorageAdapter] ✅ Transação completa: ${imported} inseridos, ${errors} erros`);
          resolve(records.length); // Usar o total de registros tentados
        };
        tx.onerror = (e) => {
          console.error(`[StorageAdapter] ❌ Erro na transação:`, e.target.error);
          reject(tx.error);
        };
        tx.onabort = (e) => {
          console.error(`[StorageAdapter] ❌ Transação abortada:`, e.target.error);
          reject(new Error('Transação abortada'));
        };
      } catch (e) {
        console.error(`[StorageAdapter] ❌ Erro ao criar transação:`, e);
        reject(e);
      }
    });
  }

  // ==========================================================================
  // VERIFICAÇÃO DE VERSÃO E MIGRAÇÃO
  // ==========================================================================

  /**
   * Verifica e executa migração de dados se necessário
   * @returns {Promise<Object>}
   */
  async checkAndMigrate() {
    const currentVersion = localStorage.getItem(this.DATA_VERSION_KEY);
    const result = {
      previousVersion: currentVersion,
      currentVersion: DATA_VERSION,
      migrationNeeded: currentVersion !== DATA_VERSION,
      migrations: []
    };

    if (!result.migrationNeeded) {
      console.log('[StorageAdapter] ✅ Dados já estão na versão atual');
      return result;
    }

    console.log(`[StorageAdapter] 🔄 Migração necessária: ${currentVersion} → ${DATA_VERSION}`);

    // Executar migrações específicas
    try {
      // Migração de null/undefined para 1.0.0
      if (!currentVersion) {
        await this._migrateToV1();
        result.migrations.push('null → 1.0.0');
      }

      // Atualizar versão
      localStorage.setItem(this.DATA_VERSION_KEY, DATA_VERSION);

      console.log('[StorageAdapter] ✅ Migração concluída');
    } catch (error) {
      console.error('[StorageAdapter] ❌ Erro na migração:', error);
      result.error = error.message;
    }

    return result;
  }

  /**
   * Migração para versão 1.0.0
   * - Adiciona campos padrão faltantes
   * - NÃO deleta dados
   */
  async _migrateToV1() {
    console.log('[StorageAdapter] 🔄 Executando migração para v1.0.0...');

    if (!window.dbManager?.db) {
      return;
    }

    const db = window.dbManager.db;

    // Verificar e normalizar empenhos
    try {
      const empenhos = await this._getAllFromStore(db, 'empenhos');
      let migrated = 0;

      for (const empenho of empenhos) {
        let needsUpdate = false;

        // Adicionar campos padrão se faltantes
        if (empenho.statusValidacao === undefined) {
          empenho.statusValidacao = 'rascunho';
          needsUpdate = true;
        }

        if (empenho.itens === undefined) {
          empenho.itens = [];
          needsUpdate = true;
        }

        if (empenho.status === undefined) {
          empenho.status = 'ativo';
          needsUpdate = true;
        }

        if (needsUpdate) {
          empenho.dataMigracao = new Date().toISOString();
          await this._putRecord(db, 'empenhos', empenho);
          migrated++;
        }
      }

      console.log(`[StorageAdapter] ✅ Empenhos migrados: ${migrated}/${empenhos.length}`);
    } catch (e) {
      console.warn('[StorageAdapter] ⚠️ Erro ao migrar empenhos:', e);
    }
  }

  async _putRecord(db, storeName, record) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==========================================================================
  // LIMPAR DADOS (com proteção)
  // ==========================================================================

  /**
   * Limpa todos os dados (REQUER confirmação)
   * @param {string} confirmationCode - Deve ser "CONFIRMAR"
   * @returns {Promise<Object>}
   */
  async clearAllData(confirmationCode) {
    if (confirmationCode !== 'CONFIRMAR') {
      throw new Error('Código de confirmação inválido. Digite "CONFIRMAR" para limpar todos os dados.');
    }

    console.warn('[StorageAdapter] ⚠️ LIMPANDO TODOS OS DADOS...');

    const result = {
      localStorage: 0,
      indexedDB: {}
    };

    // Limpar localStorage (apenas chaves SINGEM)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('SINGEM_') || key === 'session') {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      result.localStorage++;
    }

    // Limpar IndexedDB
    if (window.dbManager?.db) {
      const db = window.dbManager.db;
      const storeNames = Array.from(db.objectStoreNames);

      for (const storeName of storeNames) {
        try {
          await this._clearStore(db, storeName);
          result.indexedDB[storeName] = 'limpo';
        } catch (e) {
          result.indexedDB[storeName] = `erro: ${e.message}`;
        }
      }
    }

    console.warn('[StorageAdapter] ✅ Dados limpos:', result);
    return result;
  }

  async _clearStore(db, storeName) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================================
// INSTÂNCIA SINGLETON
// ============================================================================
const storageAdapter = new StorageAdapter();

// Exportar para window
if (typeof window !== 'undefined') {
  window.storageAdapter = storageAdapter;
}

export default storageAdapter;
export { StorageAdapter };
