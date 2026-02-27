function sendSuccess(res, data, statusCode = 200) {
  const payload = data && typeof data === 'object' ? { ...data } : { data };

  return res.status(statusCode).json({
    status: 'ok',
    ...payload,
    requestId: res.getHeader('X-Request-Id') || null,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  sendSuccess
};
