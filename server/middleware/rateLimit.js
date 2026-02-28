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

module.exports = {
  createAuthLimiter,
  createApiLimiter
};
