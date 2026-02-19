/**
 * SERPRO Errors - SINGEM
 * Normaliza erros da integração SERPRO para formato padrão do sistema
 */

/**
 * Códigos de erro SERPRO
 */
const ErrorCodes = {
  // Erros de autenticação
  AUTH_FAILED: 'SERPRO_AUTH_FAILED',
  TOKEN_EXPIRED: 'SERPRO_TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'SERPRO_INVALID_CREDENTIALS',

  // Erros de consulta
  NOT_FOUND: 'SERPRO_NOT_FOUND',
  INVALID_DOCUMENT: 'SERPRO_INVALID_DOCUMENT',
  RATE_LIMITED: 'SERPRO_RATE_LIMITED',

  // Erros de conectividade
  CONNECTION_ERROR: 'SERPRO_CONNECTION_ERROR',
  TIMEOUT: 'SERPRO_TIMEOUT',
  GATEWAY_ERROR: 'SERPRO_GATEWAY_ERROR',

  // Erros de configuração
  NOT_CONFIGURED: 'SERPRO_NOT_CONFIGURED',
  DISABLED: 'SERPRO_DISABLED',

  // Erros internos
  INTERNAL_ERROR: 'SERPRO_INTERNAL_ERROR'
};

/**
 * Classe de erro SERPRO normalizado
 */
class SerproError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'SerproError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.integration = 'SERPRO';
  }

  toJSON() {
    return {
      erro: this.message,
      codigo: this.code,
      detalhes: this.details,
      integracao: this.integration,
      timestamp: this.timestamp
    };
  }

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
  authFailed(reason) {
    return new SerproError(ErrorCodes.AUTH_FAILED, 'Falha na autenticação com SERPRO', { reason });
  },

  tokenExpired() {
    return new SerproError(ErrorCodes.TOKEN_EXPIRED, 'Token SERPRO expirado');
  },

  notFound(documentType, document) {
    const masked =
      documentType === 'cpf'
        ? document.slice(0, 3) + '.***.***-' + document.slice(-2)
        : document.slice(0, 8) + '/****-' + document.slice(-2);

    return new SerproError(ErrorCodes.NOT_FOUND, `${documentType.toUpperCase()} não encontrado`, {
      documentType,
      maskedDocument: masked
    });
  },

  invalidDocument(document) {
    return new SerproError(ErrorCodes.INVALID_DOCUMENT, 'Documento inválido', { length: document?.length });
  },

  rateLimited(retryAfter) {
    return new SerproError(ErrorCodes.RATE_LIMITED, 'Limite de requisições excedido. Tente novamente mais tarde.', {
      retryAfter
    });
  },

  connectionError(details) {
    return new SerproError(ErrorCodes.CONNECTION_ERROR, 'Erro de conexão com SERPRO', details);
  },

  timeout() {
    return new SerproError(ErrorCodes.TIMEOUT, 'Timeout na consulta SERPRO');
  },

  gatewayError(status, body) {
    return new SerproError(ErrorCodes.GATEWAY_ERROR, `Erro do gateway SERPRO (${status})`, { status, body });
  },

  notConfigured() {
    return new SerproError(
      ErrorCodes.NOT_CONFIGURED,
      'Integração SERPRO não configurada. Configure SERPRO_API_KEY e SERPRO_CONSUMER_SECRET.'
    );
  },

  disabled() {
    return new SerproError(ErrorCodes.DISABLED, 'Integração SERPRO desabilitada');
  },

  internal(originalError) {
    return new SerproError(ErrorCodes.INTERNAL_ERROR, 'Erro interno na integração SERPRO', {
      originalMessage: originalError?.message
    });
  }
};

/**
 * Normaliza qualquer erro para SerproError
 * @param {Error} err - Erro original
 * @returns {SerproError}
 */
function normalize(err) {
  if (err instanceof SerproError) {
    return err;
  }

  // Tenta identificar o tipo de erro
  if (err.response?.status === 401 || err.message?.includes('unauthorized')) {
    return errors.authFailed(err.message);
  }

  if (err.response?.status === 404) {
    return new SerproError(ErrorCodes.NOT_FOUND, 'Dado não encontrado no SERPRO');
  }

  if (err.response?.status === 429) {
    return errors.rateLimited(err.response?.headers?.['retry-after']);
  }

  if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
    return errors.timeout();
  }

  if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
    return errors.connectionError({ originalMessage: err.message });
  }

  if (err.response?.status >= 500) {
    return errors.gatewayError(err.response.status, err.response.data);
  }

  return errors.internal(err);
}

module.exports = {
  ErrorCodes,
  SerproError,
  ...errors,
  normalize
};
