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

module.exports = {
  createAuthLimiter
};
