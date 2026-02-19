/**
 * CATMAT Errors - SINGEM
 * Normaliza erros da integração CATMAT para formato padrão do sistema
 *
 * Isola tratamento de erros externos do domínio principal.
 */

/**
 * Códigos de erro CATMAT
 */
const ErrorCodes = {
  // Erros de parsing
  PARSE_ERROR: 'CATMAT_PARSE_ERROR',
  INVALID_FORMAT: 'CATMAT_INVALID_FORMAT',
  MISSING_COLUMNS: 'CATMAT_MISSING_COLUMNS',

  // Erros de dados
  INVALID_ITEM: 'CATMAT_INVALID_ITEM',
  DUPLICATE_CODE: 'CATMAT_DUPLICATE_CODE',
  EMPTY_FILE: 'CATMAT_EMPTY_FILE',

  // Erros de importação
  IMPORT_FAILED: 'CATMAT_IMPORT_FAILED',
  PARTIAL_IMPORT: 'CATMAT_PARTIAL_IMPORT',

  // Erros de conectividade (para API futura)
  CONNECTION_ERROR: 'CATMAT_CONNECTION_ERROR',
  TIMEOUT: 'CATMAT_TIMEOUT',

  // Erros internos
  INTERNAL_ERROR: 'CATMAT_INTERNAL_ERROR'
};

/**
 * Classe de erro CATMAT normalizado
 */
class CatmatError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'CatmatError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.integration = 'CATMAT';
  }

  /**
   * Serializa erro para resposta HTTP
   */
  toJSON() {
    return {
      erro: this.message,
      codigo: this.code,
      detalhes: this.details,
      integracao: this.integration,
      timestamp: this.timestamp
    };
  }

  /**
   * Serializa para log
   */
  toLog() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Factory functions para erros comuns
 */
const errors = {
  parseError(details) {
    return new CatmatError(ErrorCodes.PARSE_ERROR, 'Erro ao processar arquivo CATMAT', details);
  },

  invalidFormat(expected, received) {
    return new CatmatError(ErrorCodes.INVALID_FORMAT, `Formato de arquivo inválido. Esperado: ${expected}`, {
      expected,
      received
    });
  },

  missingColumns(missing) {
    return new CatmatError(ErrorCodes.MISSING_COLUMNS, `Colunas obrigatórias ausentes: ${missing.join(', ')}`, {
      missingColumns: missing
    });
  },

  invalidItem(index, reason) {
    return new CatmatError(ErrorCodes.INVALID_ITEM, `Item inválido na linha ${index + 1}: ${reason}`, {
      index,
      reason
    });
  },

  emptyFile() {
    return new CatmatError(ErrorCodes.EMPTY_FILE, 'Arquivo vazio ou sem dados válidos');
  },

  importFailed(reason) {
    return new CatmatError(ErrorCodes.IMPORT_FAILED, `Falha na importação: ${reason}`, { reason });
  },

  partialImport(imported, total, errors) {
    return new CatmatError(ErrorCodes.PARTIAL_IMPORT, `Importação parcial: ${imported}/${total} itens`, {
      imported,
      total,
      errorCount: errors.length,
      errors: errors.slice(0, 10)
    });
  },

  connectionError(details) {
    return new CatmatError(ErrorCodes.CONNECTION_ERROR, 'Erro de conexão com serviço CATMAT', details);
  },

  internal(originalError) {
    return new CatmatError(ErrorCodes.INTERNAL_ERROR, 'Erro interno na integração CATMAT', {
      originalMessage: originalError?.message
    });
  }
};

/**
 * Normaliza qualquer erro para CatmatError
 * @param {Error} err - Erro original
 * @returns {CatmatError}
 */
function normalize(err) {
  if (err instanceof CatmatError) {
    return err;
  }

  // Tenta identificar o tipo de erro
  if (err.message?.includes('parse') || err.message?.includes('JSON')) {
    return errors.parseError({ originalMessage: err.message });
  }

  if (err.message?.includes('timeout') || err.code === 'ETIMEDOUT') {
    return new CatmatError(ErrorCodes.TIMEOUT, 'Timeout na operação CATMAT');
  }

  if (err.message?.includes('ECONNREFUSED') || err.message?.includes('network')) {
    return errors.connectionError({ originalMessage: err.message });
  }

  return errors.internal(err);
}

module.exports = {
  ErrorCodes,
  CatmatError,
  ...errors,
  normalize
};
