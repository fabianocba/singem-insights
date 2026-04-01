const { Pool } = require('pg');
require('../config');

function parsePort(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function isLocalHost(hostname) {
  if (!hostname) {
    return true;
  }

  return ['localhost', '127.0.0.1', '::1'].includes(String(hostname).toLowerCase());
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).trim().toLowerCase() === 'true';
}

function isPrivateNetworkHost(hostname) {
  const normalized = String(hostname || '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return true;
  }

  if (isLocalHost(normalized)) {
    return true;
  }

  if (!normalized.includes('.')) {
    return true;
  }

  if (normalized.endsWith('.local') || normalized.endsWith('.internal')) {
    return true;
  }

  if (/^10\./.test(normalized)) {
    return true;
  }

  if (/^192\.168\./.test(normalized)) {
    return true;
  }

  const match172 = normalized.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (Number.isFinite(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

function shouldEnableSsl({ nodeEnv, hostname }) {
  const sslMode = String(process.env.PGSSLMODE || '')
    .trim()
    .toLowerCase();
  if (['require', 'verify-ca', 'verify-full'].includes(sslMode)) {
    return true;
  }

  if (['disable', 'allow', 'prefer'].includes(sslMode)) {
    return false;
  }

  if (process.env.DB_SSL !== undefined) {
    return parseBoolean(process.env.DB_SSL, false);
  }

  if (nodeEnv !== 'production') {
    return false;
  }

  return !isPrivateNetworkHost(hostname);
}

function resolvePoolConfig() {
  const connectionString = process.env.DATABASE_URL || '';
  const nodeEnv = process.env.NODE_ENV || 'development';

  const host = process.env.PGHOST || process.env.DB_HOST || '127.0.0.1';
  const port = parsePort(process.env.PGPORT || process.env.DB_PORT, 5432);
  const database = process.env.PGDATABASE || process.env.DB_NAME || 'singem';
  const user = process.env.PGUSER || process.env.DB_USER || 'singem_user';
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || '';

  const max = parsePort(process.env.DB_POOL_MAX, 20);
  const idleTimeoutMillis = parsePort(process.env.DB_IDLE_TIMEOUT_MS, 30000);
  const connectionTimeoutMillis = parsePort(process.env.DB_CONNECTION_TIMEOUT_MS, 2000);

  const poolConfig = {
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis
  };

  if (connectionString) {
    poolConfig.connectionString = connectionString;
    try {
      const parsed = new URL(connectionString);
      const shouldUseSsl = shouldEnableSsl({ nodeEnv, hostname: parsed.hostname });
      if (shouldUseSsl) {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
    } catch (_error) {
      if (shouldEnableSsl({ nodeEnv, hostname: '' })) {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
    }
  } else {
    poolConfig.host = host;
    poolConfig.port = port;
    poolConfig.database = database;
    poolConfig.user = user;
    poolConfig.password = password;
  }

  return poolConfig;
}

const pool = new Pool(resolvePoolConfig());

pool.on('error', (error) => {
  console.error('[DB] Erro no pool PostgreSQL:', error.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

async function healthCheck() {
  const timeoutMsRaw = Number(process.env.DB_HEALTHCHECK_TIMEOUT_MS || 2000);
  const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? timeoutMsRaw : 2000;

  let timer = null;

  const queryPromise = query('SELECT 1 AS ok')
    .then(() => ({ ok: true }))
    .catch((error) => ({ ok: false, error: error?.message || 'Falha ao conectar no PostgreSQL' }));

  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      resolve({ ok: false, error: `Healthcheck timeout (${timeoutMs}ms)` });
    }, timeoutMs);
  });

  const result = await Promise.race([queryPromise, timeoutPromise]);

  if (timer) {
    clearTimeout(timer);
  }

  return result;
}

async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  healthCheck,
  close
};
