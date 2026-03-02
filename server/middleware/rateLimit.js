const rateLimit = require('express-rate-limit');

function createAuthLimiter(max, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      message
    }
  });
}

function createApiLimiter() {
  return rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Muitas requisições. Tente novamente em instantes.'
    }
  });
}

function createIntegracoesLimiter() {
  return rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      code: 'INTEGRACOES_RATE_LIMITED',
      message: 'Muitas requisições para endpoints de integração. Aguarde e tente novamente.'
    }
  });
}

module.exports = {
  createAuthLimiter,
  createApiLimiter,
  createIntegracoesLimiter
};
