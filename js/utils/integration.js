/**
 * SINGEM - Integration Layer
 * @module utils/integration
 *
 * Camada de integração que expõe os novos utilitários globalmente
 * SEM MODIFICAR o código existente.
 *
 * Este módulo é carregado OPCIONALMENTE e não quebra nada se não for usado.
 */

// @ts-check

import * as ErrorUtils from './errors.js';
import * as Guard from './guard.js';
import * as Validate from './validate.js';
import * as Sanitize from './sanitize.js';
import * as Logger from './logger.js';
import * as Scheduler from './scheduler.js';
import * as Throttle from './throttle.js';
import * as DOMBatch from './domBatch.js';

/**
 * Expõe utilitários no objeto global window.SINGEMUtils
 * Permite que código legado use as novas funções sem imports
 */
export function exposeGlobalUtils() {
  // Cria namespace global se não existir
  if (!window.SINGEMUtils) {
    window.SINGEMUtils = {};
  }

  // Errors
  window.SINGEMUtils.errors = {
    getErrorLog: ErrorUtils.getErrorLog,
    exportErrorLog: ErrorUtils.exportErrorLog,
    clearErrorLog: ErrorUtils.clearErrorLog
  };

  // Guard
  window.SINGEMUtils.guard = {
    safeAsync: Guard.safeAsync,
    tryOrDefault: Guard.tryOrDefault,
    retryWithBackoff: Guard.retryWithBackoff,
    withTimeout: Guard.withTimeout,
    requireNonNull: Guard.requireNonNull,
    memoize: Guard.memoize,
    cacheWithTTL: Guard.cacheWithTTL
  };

  // Validate
  window.SINGEMUtils.validate = {
    validateCNPJ: Validate.validateCNPJ,
    validateCPF: Validate.validateCPF,
    validateEmail: Validate.validateEmail,
    validateURL: Validate.validateURL,
    isISODate: Validate.isISODate,
    asNumberBR: Validate.asNumberBR,
    asMoney: Validate.asMoney,
    formatCNPJ: Validate.formatCNPJ,
    formatCPF: Validate.formatCPF,
    isEmpty: Validate.isEmpty,
    inRange: Validate.inRange
  };

  // Sanitize
  window.SINGEMUtils.sanitize = {
    escapeHTML: Sanitize.escapeHTML,
    safeHTML: Sanitize.safeHTML,
    stripDangerousTags: Sanitize.stripDangerousTags,
    sanitizeURL: Sanitize.sanitizeURL,
    sanitizeAttributes: Sanitize.sanitizeAttributes,
    createSafeElement: Sanitize.createSafeElement,
    safeJSONParse: Sanitize.safeJSONParse
  };

  // Logger
  window.SINGEMUtils.logger = {
    debug: Logger.debug,
    info: Logger.info,
    warn: Logger.warn,
    error: Logger.error,
    configure: Logger.configure,
    getLogs: Logger.getLogs,
    exportLogs: Logger.exportLogs,
    group: Logger.group
  };

  // Scheduler
  window.SINGEMUtils.scheduler = {
    defer: Scheduler.defer,
    idle: Scheduler.idle,
    raf: Scheduler.raf,
    afterFrames: Scheduler.afterFrames,
    rafBatch: Scheduler.rafBatch,
    microtask: Scheduler.microtask,
    microtaskBatch: Scheduler.microtaskBatch
  };

  // Throttle
  window.SINGEMUtils.throttle = Throttle.throttle;
  window.SINGEMUtils.debounce = Throttle.debounce;
  window.SINGEMUtils.debounceRaf = Throttle.debounceRaf;

  // DOMBatch
  window.SINGEMUtils.domBatch = {
    createDOMBatch: DOMBatch.createDOMBatch,
    readDOM: DOMBatch.readDOM,
    writeDOM: DOMBatch.writeDOM,
    measureElement: DOMBatch.measureElement,
    applyStyles: DOMBatch.applyStyles,
    readWrite: DOMBatch.readWrite,
    batchReads: DOMBatch.batchReads,
    batchWrites: DOMBatch.batchWrites
  };

  console.info('✅ SINGEMUtils exposto globalmente em window.SINGEMUtils');
  console.info('📦 Utilitários disponíveis:', Object.keys(window.SINGEMUtils));
}

/**
 * Adiciona wrappers seguros ao window.dbManager existente
 * NÃO substitui funções existentes, apenas adiciona novas
 */
export function enhanceDBManager() {
  if (!window.dbManager) {
    console.warn('⚠️ dbManager não encontrado, pulando enhancement');
    return;
  }

  // Em modo servidor PostgreSQL, não adicionar métodos que dependem de IndexedDB
  const isServerMode =
    window.CONFIG?.storage?.mode === 'server' ||
    window.dbManager?.db?.mode === 'server-postgres' ||
    window.dbManager?.mode === 'server-postgres' ||
    (window.dbManager?.db && typeof window.dbManager.db.transaction !== 'function');

  if (isServerMode) {
    console.info('[Integration] Modo servidor: safeTransaction não adicionado (usa API PostgreSQL)');
    return;
  }

  // Adiciona método safe para operações críticas
  if (!window.dbManager.safeTransaction) {
    window.dbManager.safeTransaction = Guard.safeAsync(
      async (storeName, mode, callback) => {
        if (!window.dbManager.db) {
          throw new Error('Banco de dados não inicializado');
        }

        // Verificação defensiva adicional
        if (typeof window.dbManager.db.transaction !== 'function') {
          console.warn('[Integration] db.transaction não disponível (modo servidor?)');
          return null;
        }

        return new Promise((resolve, reject) => {
          const tx = window.dbManager.db.transaction(storeName, mode);
          const store = tx.objectStore(storeName);

          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(new Error('Transação abortada'));

          callback(store, tx);
        });
      },
      {
        defaultValue: null,
        onError: (error) => {
          Logger.error('Erro em transação do banco:', error);
        }
      }
    );

    console.info('✅ dbManager.safeTransaction() adicionado');
  }

  // Adiciona retry ao init se não existir
  if (!window.dbManager.initWithRetry) {
    window.dbManager.initWithRetry = () => {
      return Guard.retryWithBackoff(() => window.dbManager.init(), {
        maxRetries: 3,
        initialDelay: 1000
      });
    };

    console.info('✅ dbManager.initWithRetry() adicionado');
  }
}

/**
 * Adiciona helpers de validação ao window global
 * Útil para validação inline em event handlers
 */
export function exposeValidationHelpers() {
  // CNPJ/CPF validators globais
  window.validarCNPJ = Validate.validateCNPJ;
  window.validarCPF = Validate.validateCPF;
  window.formatarCNPJ = Validate.formatCNPJ;
  window.formatarCPF = Validate.formatCPF;

  // Sanitização global
  window.escaparHTML = Sanitize.escapeHTML;
  window.sanitizarURL = Sanitize.sanitizeURL;

  console.info('✅ Helpers de validação expostos globalmente');
}

/**
 * Inicialização automática
 */
export function init() {
  try {
    exposeGlobalUtils();
    enhanceDBManager();
    exposeValidationHelpers();

    console.info('🎉 Camada de integração inicializada com sucesso!');
    console.info('💡 Use window.SINGEMUtils para acessar os utilitários');

    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar camada de integração:', error);
    return false;
  }
}

// Auto-inicialização
init();
