class AppError extends Error {
  constructor(statusCode = 500, code = 'INTERNAL_ERROR', message = 'Erro interno do servidor', details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = Number(statusCode) || 500;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = AppError;
