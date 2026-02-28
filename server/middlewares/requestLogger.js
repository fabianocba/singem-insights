function sanitizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function requestLogger(nodeEnv = 'development') {
  const isProduction = nodeEnv === 'production';

  return (req, res, next) => {
    const start = process.hrtime.bigint();
    const method = req.method;
    const path = req.originalUrl || req.url || '/';
    const ip = req.ip || req.socket?.remoteAddress || '-';
    const userAgent = sanitizeText(req.headers['user-agent'] || '-');

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      const statusCode = res.statusCode;
      const contentLength = res.getHeader('content-length');
      const requestId = req.requestId || 'null';

      let logLine = `[HTTP] requestId=${requestId} method=${method} path="${path}" status=${statusCode} durationMs=${durationMs.toFixed(
        2
      )} ip=${ip}`;

      if (contentLength !== undefined) {
        logLine += ` contentLength=${contentLength}`;
      }

      if (!isProduction) {
        logLine += ` userAgent="${userAgent}"`;
      }

      if (statusCode >= 500) {
        console.error(logLine);
      } else {
        console.log(logLine);
      }
    });

    next();
  };
}

module.exports = requestLogger;
