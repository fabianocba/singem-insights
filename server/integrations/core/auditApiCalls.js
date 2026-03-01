const db = require('../../config/database');
const { config } = require('../../config');

function isAuditEnabled() {
  return config.integracoes?.auditEnabled !== false;
}

function sanitizeQueryParams(input = {}) {
  const out = {};

  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const safeKey = String(key).slice(0, 120);
    const safeValue = Array.isArray(value)
      ? value.map((item) => String(item).slice(0, 240)).slice(0, 40)
      : String(value).slice(0, 500);

    out[safeKey] = safeValue;
  }

  return out;
}

async function recordApiCall({
  requestId,
  usuario,
  rotaInterna,
  endpointExterno,
  metodo = 'GET',
  queryParams = {},
  statusHttp,
  duracaoMs,
  cacheHit = false
}) {
  if (!isAuditEnabled()) {
    return;
  }

  try {
    await db.query(
      `
      INSERT INTO audit_api_calls (
        request_id,
        usuario,
        rota_interna,
        endpoint_externo,
        metodo,
        query_params,
        status_http,
        duracao_ms,
        cache_hit
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
      `,
      [
        requestId || null,
        usuario || null,
        rotaInterna || 'N/A',
        endpointExterno || 'N/A',
        metodo,
        JSON.stringify(sanitizeQueryParams(queryParams)),
        Number(statusHttp || 0),
        Number(duracaoMs || 0),
        Boolean(cacheHit)
      ]
    );
  } catch (error) {
    console.warn('[AuditApiCalls] Falha ao registrar auditoria técnica:', error.message);
  }
}

async function listAuditCalls(filters = {}) {
  const params = [];
  const where = [];

  if (filters.de) {
    params.push(filters.de);
    where.push(`created_at >= $${params.length}`);
  }

  if (filters.ate) {
    params.push(filters.ate);
    where.push(`created_at <= $${params.length}`);
  }

  if (filters.endpoint) {
    params.push(`%${filters.endpoint}%`);
    where.push(`endpoint_externo ILIKE $${params.length}`);
  }

  if (filters.status) {
    params.push(Number(filters.status));
    where.push(`status_http = $${params.length}`);
  }

  const limit = Math.min(Math.max(Number(filters.limit || 20), 1), 200);
  params.push(limit);

  const sql = `
    SELECT *
    FROM audit_api_calls
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC
    LIMIT $${params.length}
  `;

  const result = await db.query(sql, params);
  return result.rows;
}

async function getAuditMetrics24h() {
  const result = await db.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status_http >= 400)::int AS errors,
      COUNT(*) FILTER (WHERE cache_hit IS TRUE)::int AS cache_hits
    FROM audit_api_calls
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    `
  );

  const row = result.rows[0] || { total: 0, errors: 0, cache_hits: 0 };
  const total = Number(row.total || 0);
  const errors = Number(row.errors || 0);
  const cacheHits = Number(row.cache_hits || 0);

  return {
    total,
    errors,
    cacheHits,
    errorRate24h: total > 0 ? Number(((errors / total) * 100).toFixed(2)) : 0,
    cacheHitRate24h: total > 0 ? Number(((cacheHits / total) * 100).toFixed(2)) : 0
  };
}

module.exports = {
  recordApiCall,
  listAuditCalls,
  getAuditMetrics24h,
  sanitizeQueryParams
};
