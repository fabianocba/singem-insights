/**
 * SINGEM - Logger Centralizado
 * @module utils/logger
 *
 * Sistema de logging com níveis e armazenamento local.
 * NÃO remove console existente - apenas adiciona camada estruturada.
 */

// @ts-check

/**
 * Níveis de log
 * @readonly
 * @enum {string}
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Configuração do logger
 */
const config = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableLocalStorage: false,
  maxStoredLogs: 100
};

/**
 * Armazenamento de logs
 */
const logStore = {
  logs: [],

  add(entry) {
    this.logs.push(entry);

    if (this.logs.length > config.maxStoredLogs) {
      this.logs.shift();
    }

    if (config.enableLocalStorage) {
      try {
        localStorage.setItem('SINGEM_logs', JSON.stringify(this.logs.slice(-50)));
      } catch (e) {
        // Ignora se localStorage estiver cheio
      }
    }
  },

  getAll() {
    return [...this.logs];
  },

  clear() {
    this.logs = [];
    if (config.enableLocalStorage) {
      localStorage.removeItem('SINGEM_logs');
    }
  }
};

/**
 * Ordem dos níveis (para comparação)
 */
const levelOrder = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3
};

/**
 * Verifica se deve logar o nível
 * @param {string} level - Nível a verificar
 * @returns {boolean} True se deve logar
 */
function shouldLog(level) {
  return levelOrder[level] >= levelOrder[config.level];
}

/**
 * Formata mensagem de log
 * @param {string} level - Nível
 * @param {string} message - Mensagem
 * @param {...any} args - Argumentos adicionais
 * @returns {Object} Entrada de log formatada
 */
function formatLogEntry(level, message, ...args) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    args: args.length > 0 ? args : undefined,
    url: window.location.href,
    userAgent: navigator.userAgent
  };
}

/**
 * Loga mensagem de debug
 * @param {string} message - Mensagem
 * @param {...any} args - Argumentos adicionais
 */
export function debug(message, ...args) {
  if (!shouldLog(LogLevel.DEBUG)) {
    return;
  }

  const entry = formatLogEntry(LogLevel.DEBUG, message, ...args);
  logStore.add(entry);

  if (config.enableConsole) {
    console.log(`🔍 [DEBUG] ${message}`, ...args);
  }
}

/**
 * Loga mensagem de informação
 * @param {string} message - Mensagem
 * @param {...any} args - Argumentos adicionais
 */
export function info(message, ...args) {
  if (!shouldLog(LogLevel.INFO)) {
    return;
  }

  const entry = formatLogEntry(LogLevel.INFO, message, ...args);
  logStore.add(entry);

  if (config.enableConsole) {
    console.info(`ℹ️ [INFO] ${message}`, ...args);
  }
}

/**
 * Loga mensagem de aviso
 * @param {string} message - Mensagem
 * @param {...any} args - Argumentos adicionais
 */
export function warn(message, ...args) {
  if (!shouldLog(LogLevel.WARN)) {
    return;
  }

  const entry = formatLogEntry(LogLevel.WARN, message, ...args);
  logStore.add(entry);

  if (config.enableConsole) {
    console.warn(`⚠️ [WARN] ${message}`, ...args);
  }
}

/**
 * Loga mensagem de erro
 * @param {string} message - Mensagem
 * @param {...any} args - Argumentos adicionais
 */
export function error(message, ...args) {
  if (!shouldLog(LogLevel.ERROR)) {
    return;
  }

  const entry = formatLogEntry(LogLevel.ERROR, message, ...args);
  logStore.add(entry);

  if (config.enableConsole) {
    console.error(`🔴 [ERROR] ${message}`, ...args);
  }
}

/**
 * Configura logger
 * @param {Object} options - Opções
 * @param {string} [options.level] - Nível mínimo
 * @param {boolean} [options.enableConsole] - Habilitar console
 * @param {boolean} [options.enableLocalStorage] - Habilitar localStorage
 * @param {number} [options.maxStoredLogs] - Máximo de logs armazenados
 */
export function configure(options = {}) {
  if (options.level && levelOrder[options.level] !== undefined) {
    config.level = options.level;
  }

  if (typeof options.enableConsole === 'boolean') {
    config.enableConsole = options.enableConsole;
  }

  if (typeof options.enableLocalStorage === 'boolean') {
    config.enableLocalStorage = options.enableLocalStorage;
  }

  if (typeof options.maxStoredLogs === 'number') {
    config.maxStoredLogs = options.maxStoredLogs;
  }

  info('Logger configurado', config);
}

/**
 * Obtém todos os logs
 * @returns {Array} Lista de logs
 */
export function getLogs() {
  return logStore.getAll();
}

/**
 * Limpa logs
 */
export function clearLogs() {
  logStore.clear();
  info('Logs limpos');
}

/**
 * Exporta logs como texto
 * @returns {string} Logs formatados
 */
export function exportLogs() {
  const logs = logStore.getAll();

  if (logs.length === 0) {
    return 'Nenhum log disponível.';
  }

  return logs
    .map((log) => {
      const args = log.args ? ` ${JSON.stringify(log.args)}` : '';
      return `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${args}`;
    })
    .join('\n');
}

/**
 * Agrupa logs e mede tempo
 * @param {string} label - Label do grupo
 * @returns {Function} Função para finalizar grupo
 */
export function group(label) {
  const start = performance.now();

  if (config.enableConsole) {
    console.group(label);
  }

  return () => {
    const duration = performance.now() - start;
    info(`${label} (${duration.toFixed(2)}ms)`);

    if (config.enableConsole) {
      console.groupEnd();
    }
  };
}

// Auto-carrega logs do localStorage se habilitado
if (config.enableLocalStorage) {
  try {
    const stored = localStorage.getItem('SINGEM_logs');
    if (stored) {
      logStore.logs = JSON.parse(stored);
    }
  } catch (e) {
    // Ignora erro
  }
}

console.info('✅ Logger centralizado carregado');
