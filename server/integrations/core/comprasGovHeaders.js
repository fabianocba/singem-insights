function pickFirstNonEmpty(values = []) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function buildComprasGovHeaders({
  requestId,
  userAgent = 'SINGEM-ComprasGov/1.0',
  accept,
  token,
  tokenPrefix = 'Bearer '
} = {}) {
  const headers = {
    Accept: pickFirstNonEmpty([accept, '*/*']),
    'User-Agent': pickFirstNonEmpty([userAgent, 'SINGEM-Integracao/1.0'])
  };

  const requestIdSafe = String(requestId || '').trim();
  if (requestIdSafe) {
    headers['X-Request-Id'] = requestIdSafe;
  }

  const tokenSafe = String(token || '').trim();
  if (tokenSafe) {
    headers.Authorization = `${tokenPrefix}${tokenSafe}`;
  }

  return headers;
}

module.exports = {
  buildComprasGovHeaders
};
