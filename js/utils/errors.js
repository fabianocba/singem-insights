/**
 * IFDESK - Tratamento Global de Erros
 * @module utils/errors
 *
 * Centraliza captura e log de erros não tratados sem bloquear a aplicação.
 * NÃO substitui tratamentos existentes - apenas adiciona camada de segurança.
 */

// @ts-check

/**
 * Logger de erros centralizado
 * @private
 */
const errorLog = {
  errors: [],
  maxSize: 100,

  add(error, context = {}) {
    this.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack,
      context,
      userAgent: navigator.userAgent
    });

    // Mantém apenas os últimos N erros
    if (this.errors.length > this.maxSize) {
      this.errors.shift();
    }

    // Salva em localStorage para debug
    try {
      localStorage.setItem('ifdesk_error_log', JSON.stringify(this.errors.slice(-10)));
    } catch (e) {
      // Ignora se localStorage estiver cheio
    }
  },

  getAll() {
    return [...this.errors];
  },

  clear() {
    this.errors = [];
    localStorage.removeItem('ifdesk_error_log');
  }
};

/**
 * Configura handlers globais de erro
 * @param {Object} options - Opções de configuração
 * @param {boolean} [options.logToConsole=true] - Se deve logar no console
 * @param {Function} [options.onError] - Callback customizado para cada erro
 * @returns {Function} Função para remover os handlers
 */
export function setupGlobalErrorHandlers(options = {}) {
  const { logToConsole = true, onError } = options;

  // Handler para erros síncronos
  const errorHandler = (event) => {
    const error = event.error || new Error(event.message);
    const context = {
      type: 'unhandled-error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    };

    errorLog.add(error, context);

    if (logToConsole) {
      console.error('🔴 Erro não tratado:', error);
      console.error('   Contexto:', context);
    }

    if (onError) {
      try {
        onError(error, context);
      } catch (e) {
        console.error('🔴 Erro no callback onError:', e);
      }
    }

    // NÃO previne o comportamento padrão - deixa o navegador lidar também
    return false;
  };

  // Handler para promises rejeitadas
  const rejectionHandler = (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    const context = {
      type: 'unhandled-rejection',
      promise: event.promise
    };

    errorLog.add(error, context);

    if (logToConsole) {
      console.error('🔴 Promise rejeitada não tratada:', error);
      console.error('   Contexto:', context);
    }

    if (onError) {
      try {
        onError(error, context);
      } catch (e) {
        console.error('🔴 Erro no callback onError:', e);
      }
    }

    // Previne o log padrão do navegador (já logamos acima)
    event.preventDefault();
  };

  // Registra handlers
  window.addEventListener('error', errorHandler);
  window.addEventListener('unhandledrejection', rejectionHandler);

  console.info('✅ Handlers globais de erro configurados');

  // Retorna função para remover handlers
  return () => {
    window.removeEventListener('error', errorHandler);
    window.removeEventListener('unhandledrejection', rejectionHandler);
    console.info('✅ Handlers globais de erro removidos');
  };
}

/**
 * Obtém log de erros
 * @returns {Array} Lista de erros registrados
 */
export function getErrorLog() {
  return errorLog.getAll();
}

/**
 * Limpa log de erros
 */
export function clearErrorLog() {
  errorLog.clear();
}

/**
 * Exporta log de erros como texto
 * @returns {string} Log formatado
 */
export function exportErrorLog() {
  const errors = errorLog.getAll();
  if (errors.length === 0) {
    return 'Nenhum erro registrado.';
  }

  return errors
    .map((err, index) => {
      return `
=== Erro ${index + 1} ===
Timestamp: ${err.timestamp}
Mensagem: ${err.message}
Tipo: ${err.context.type || 'desconhecido'}
Stack:
${err.stack || 'N/A'}
---
`;
    })
    .join('\n');
}

// Auto-inicializa se não estiver em ambiente de testes
if (typeof window !== 'undefined' && !window.__IFDESK_TEST_MODE__) {
  setupGlobalErrorHandlers({
    logToConsole: true,
    onError: (_error, _context) => {
      // Futuramente pode enviar para servidor de analytics
      // Por ora, apenas loga localmente
    }
  });
}

console.info('✅ Módulo de erros carregado');
