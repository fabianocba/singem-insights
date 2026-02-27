const AppError = require('../utils/appError');

function errorHandler(nodeEnv = 'development') {
  return (error, req, res, _next) => {
    const corsDenied = error && error.message === 'Origem não permitida por CORS';
    const normalizedError = corsDenied
      ? new AppError(403, 'CORS_DENIED', 'Origem não permitida por CORS')
      : error instanceof AppError
        ? error
        : new AppError(
            error?.statusCode || error?.status || 500,
            error?.code || 'INTERNAL_ERROR',
            error?.message || 'Erro interno do servidor'
          );

    const statusCode = normalizedError.statusCode || 500;
    const requestPath = req.originalUrl || req.path;

    if (statusCode >= 500) {
      console.error(`[HTTP] ${statusCode} ${req.method} ${requestPath}`, normalizedError);
    } else {
      console.warn(`[HTTP] ${statusCode} ${req.method} ${requestPath}`, normalizedError.message);
    }

    const payload = {
      status: 'error',
      code: normalizedError.code || 'INTERNAL_ERROR',
      message:
        statusCode >= 500 && nodeEnv === 'production'
          ? 'Erro interno do servidor'
          : normalizedError.message || 'Erro interno do servidor',
      requestId: req.requestId || null,
      timestamp: new Date().toISOString()
    };

    if (normalizedError.details !== undefined) {
      payload.details = normalizedError.details;
    }

    return res.status(statusCode).json(payload);
  };
}

module.exports = errorHandler;
