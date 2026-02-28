const crypto = require('crypto');

function generateRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

function requestId() {
  return (req, res, next) => {
    const incomingRequestId = req.headers['x-request-id'];
    const requestIdValue =
      typeof incomingRequestId === 'string' && incomingRequestId.trim() ? incomingRequestId : generateRequestId();

    req.requestId = requestIdValue;
    res.setHeader('X-Request-Id', requestIdValue);
    next();
  };
}

module.exports = requestId;
