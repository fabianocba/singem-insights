/**
 * SINGEM - IndexedDB Integration Layer
 * @module db/integration
 *
 * Adiciona métodos seguros ao window.dbManager EXISTENTE
 * SEM modificar ou substituir funcionalidades atuais.
 */

// @ts-check

import * as IDBUtils from './indexeddb-utils.js';
import { retryWithBackoff } from '../utils/guard.js';

/**
 * Detecta se está em modo servidor PostgreSQL
 */
function isServerMode() {
  return (
    window.CONFIG?.storage?.mode === 'server' ||
    window.dbManager?.db?.mode === 'server-postgres' ||
    window.dbManager?.mode === 'server-postgres'
  );
}

/**
 * Adiciona métodos utilitários ao dbManager existente
 */
export function enhanceDBManager() {
  // Em modo servidor PostgreSQL, não injetar métodos IndexedDB
  if (isServerMode()) {
    console.info('[DBIntegration] Modo servidor: IndexedDB integration desativada');
    return true;
  }

  if (!window.dbManager) {
    console.warn('⚠️ window.dbManager não encontrado ainda');
    return false;
  }

  // Verificação defensiva: se db existe mas não tem transaction, é modo servidor
  if (window.dbManager.db && typeof window.dbManager.db.transaction !== 'function') {
    console.info('[DBIntegration] db.transaction não disponível: pulando enhance');
    return true;
  }

  // ========================================
  // NOVOS MÉTODOS - NÃO SUBSTITUEM EXISTENTES
  // ========================================

  /**
   * Wrapper seguro para transações
   * USO: await dbManager.withTransaction(['unidades'], 'readwrite', (tx) => {...})
   */
  if (!window.dbManager.withTransaction) {
    window.dbManager.withTransaction = function (storeNames, mode, callback) {
      // Verificação defensiva em runtime
      if (typeof this.db?.transaction !== 'function') {
        console.warn('[DBIntegration] withTransaction ignorado: modo servidor');
        return Promise.resolve(null);
      }
      return IDBUtils.withTx(this.db, storeNames, mode, callback);
    };
  }

  /**
   * Inserção em lote
   * USO: await dbManager.batchInsert('unidades', arrayDeUnidades)
   */
  if (!window.dbManager.batchInsert) {
    window.dbManager.batchInsert = async function (storeName, items, options) {
      // Verificação defensiva em runtime
      if (typeof this.db?.transaction !== 'function') {
        console.warn('[DBIntegration] batchInsert ignorado: modo servidor');
        return [];
      }
      return IDBUtils.batchPut(this.db, storeName, items, options);
    };
  }

  /**
   * Remoção em lote
   * USO: await dbManager.batchRemove('unidades', ['id1', 'id2', 'id3'])
   */
  if (!window.dbManager.batchRemove) {
    window.dbManager.batchRemove = async function (storeName, keys) {
      return IDBUtils.batchDelete(this.db, storeName, keys);
    };
  }

  /**
   * Contagem rápida
   * USO: const total = await dbManager.count('unidades')
   */
  if (!window.dbManager.count) {
    window.dbManager.count = async function (storeName, range) {
      return IDBUtils.countItems(this.db, storeName, range);
    };
  }

  /**
   * Obter todos os itens
   * USO: const todos = await dbManager.fetchAll('unidades')
   */
  if (!window.dbManager.fetchAll) {
    window.dbManager.fetchAll = async function (storeName, range, limit) {
      return IDBUtils.getAll(this.db, storeName, range, limit);
    };
  }

  /**
   * Limpar store
   * USO: await dbManager.clearStore('logs')
   */
  if (!window.dbManager.clearStore) {
    window.dbManager.clearStore = async function (storeName) {
      return IDBUtils.clearStore(this.db, storeName);
    };
  }

  /**
   * Exportar dados de uma store
   * USO: const backup = await dbManager.exportData('unidades')
   */
  if (!window.dbManager.exportData) {
    window.dbManager.exportData = async function (storeName) {
      return IDBUtils.exportStore(this.db, storeName);
    };
  }

  /**
   * Importar dados para uma store
   * USO: await dbManager.importData('unidades', backupData, true)
   */
  if (!window.dbManager.importData) {
    window.dbManager.importData = async function (storeName, data, clearFirst = false) {
      return IDBUtils.importStore(this.db, storeName, data, clearFirst);
    };
  }

  /**
   * Informações sobre o banco
   * USO: const info = await dbManager.getInfo()
   */
  if (!window.dbManager.getInfo) {
    window.dbManager.getInfo = async function () {
      return IDBUtils.getDatabaseInfo(this.db);
    };
  }

  /**
   * Init com retry automático
   * USO: await dbManager.initSafe()
   */
  if (!window.dbManager.initSafe) {
    window.dbManager.initSafe = function (options = {}) {
      const { maxRetries = 3, retryDelay = 1000 } = options;

      return retryWithBackoff(() => this.init(), {
        maxRetries,
        initialDelay: retryDelay,
        shouldRetry: (error) => {
          // Não retentar se for erro de versão
          return !error.message?.includes('version');
        }
      });
    };
  }

  console.info('✅ IndexedDB integration: Métodos utilitários adicionados ao dbManager');
  console.info(
    '📦 Novos métodos:',
    [
      'withTransaction',
      'batchInsert',
      'batchRemove',
      'count',
      'fetchAll',
      'clearStore',
      'exportData',
      'importData',
      'getInfo',
      'initSafe'
    ].join(', ')
  );

  return true;
}

/**
 * Aguarda dbManager estar disponível e adiciona melhorias
 */
export async function waitAndEnhance() {
  // Em modo servidor, não tentar adicionar métodos IndexedDB
  if (isServerMode()) {
    console.info('[DBIntegration] Modo servidor detectado: pulando waitAndEnhance');
    return true;
  }

  // Se dbManager já existe, melhora imediatamente
  if (window.dbManager) {
    return enhanceDBManager();
  }

  // Caso contrário, aguarda até 5 segundos
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos (50 * 100ms)

    const interval = setInterval(() => {
      attempts++;

      // Verificar modo servidor a cada tentativa (pode mudar durante init)
      if (isServerMode()) {
        clearInterval(interval);
        console.info('[DBIntegration] Modo servidor detectado durante espera: pulando enhance');
        resolve(true);
        return;
      }

      if (window.dbManager) {
        clearInterval(interval);
        resolve(enhanceDBManager());
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn('⚠️ dbManager não encontrado após 5 segundos');
        resolve(false);
      }
    }, 100);
  });
}

// Auto-execução
waitAndEnhance();
