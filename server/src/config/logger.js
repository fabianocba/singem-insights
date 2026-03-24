function logInfo(message, meta = {}) {
  console.info('[SINGEM]', message, meta);
}

function logWarn(message, meta = {}) {
  console.warn('[SINGEM]', message, meta);
}

function logError(message, meta = {}) {
  console.error('[SINGEM]', message, meta);
}

module.exports = {
  logInfo,
  logWarn,
  logError
};
