function errorHandler(nodeEnv = 'development') {
  return (err, req, res, _next) => {
    const corsDenied = err && err.message === 'Origem não permitida por CORS';
    const statusCode = corsDenied ? 403 : err.statusCode || err.status || 500;
    const requestPath = req.originalUrl || req.path;
    const logMessage = `[HTTP] ${statusCode} ${req.method} ${requestPath}`;

    if (statusCode >= 500) {
      console.error(logMessage, err.message);
    } else {
      console.warn(logMessage, err.message);
    }

    return res.status(statusCode).json({
      ok: false,
      error: {
        code: statusCode >= 500 ? 'INTERNAL_ERROR' : statusCode === 403 ? 'CORS_DENIED' : 'REQUEST_ERROR',
        message: statusCode >= 500 && nodeEnv === 'production' ? 'Erro interno do servidor' : err.message
      }
    });
  };
}

module.exports = errorHandler;
