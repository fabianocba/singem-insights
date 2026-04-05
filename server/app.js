const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const db = require('./db');
const requestId = require('./middlewares/requestId');
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/appError');
const { createApiLimiter, createIntegracoesLimiter } = require('./middleware/rateLimit');
const { authenticate, requireAdmin } = require('./middleware/auth');
const { readVersion } = require('./utils/version');
const { registerRoutes } = require('./src/core/routes');

function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function normalizeOrigin(originValue) {
  const raw = String(originValue || '').trim();
  if (!raw) {
    return '';
  }

  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    const defaultPort =
      (protocol === 'https:' && parsed.port === '443') || (protocol === 'http:' && parsed.port === '80');
    const port = parsed.port && !defaultPort ? `:${parsed.port}` : '';
    return `${protocol}//${hostname}${port}`;
  } catch (_error) {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

function buildCorsOriginsSet(origins) {
  const allowed = new Set();

  for (const candidate of origins || []) {
    const normalized = normalizeOrigin(candidate);
    if (!normalized) {
      continue;
    }

    allowed.add(normalized);

    try {
      const parsed = new URL(normalized);
      const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
      if (isLocalHost) {
        continue;
      }

      if (parsed.hostname.startsWith('www.')) {
        const withoutWww = `${parsed.protocol}//${parsed.hostname.slice(4)}${parsed.port ? `:${parsed.port}` : ''}`;
        allowed.add(normalizeOrigin(withoutWww));
      } else if (parsed.hostname.includes('.')) {
        const withWww = `${parsed.protocol}//www.${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
        allowed.add(normalizeOrigin(withWww));
      }
    } catch (_error) {
      // Ignora aliases quando a origem não for uma URL válida.
    }
  }

  return allowed;
}

function createApp({ nodeEnv, bodyLimit, corsOrigins, trustProxy, nfeService, nfeServiceV2 }) {
  const app = express();
  const allowedCorsOrigins = buildCorsOriginsSet(corsOrigins);

  const corsOptions = {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (allowedCorsOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error('Origem não permitida por CORS'));
    },
    credentials: true
  };

  app.disable('x-powered-by');

  if (trustProxy || nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );
  app.use(requestId());
  app.use(requestLogger(nodeEnv));
  app.use(cors(corsOptions));
  app.use(bodyParser.json({ limit: bodyLimit }));
  app.use(bodyParser.urlencoded({ extended: true, limit: bodyLimit }));
  app.use('/api', createApiLimiter());

  const registeredApiRoutes = registerRoutes(app, {
    createIntegracoesLimiter,
    authenticate,
    requireAdmin,
    nfeService,
    nfeServiceV2
  });

  const handleHealthcheck = async (req, res) => {
    setNoCacheHeaders(res);

    const dbStatus = await db.healthCheck().catch((error) => ({
      ok: false,
      error: error?.message || 'Falha no healthcheck do PostgreSQL'
    }));

    const versionInfo = readVersion();

    const response = {
      status: dbStatus.ok ? 'OK' : 'DEGRADED',
      name: versionInfo.name,
      version: versionInfo.version,
      channel: versionInfo.channel,
      build: versionInfo.build,
      buildTimestamp: versionInfo.buildTimestamp,
      sistema: 'SINGEM',
      database: dbStatus.ok ? 'conectado' : 'desconectado',
      nfeService: nfeService ? 'ativo' : 'inativo',
      timestamp: new Date().toISOString()
    };

    if (nodeEnv !== 'production' && dbStatus.error) {
      response.dbError = dbStatus.error;
    }

    return res.json(response);
  };

  app.get('/health', handleHealthcheck);
  app.get('/api/health', handleHealthcheck);

  app.get('/api/info', (_req, res) => {
    const versionInfo = readVersion();

    return res.json({
      nome: 'SINGEM Server',
      versao: versionInfo.version,
      sistema: 'Sistema Institucional de Gestão de Material',
      instituicao: 'IF Baiano'
    });
  });

  app.get('/api/version', (_req, res) => {
    setNoCacheHeaders(res);

    const info = readVersion();

    return res.json({
      ok: true,
      name: info.name,
      version: info.version,
      channel: info.channel,
      build: info.build,
      buildTimestamp: info.buildTimestamp
    });
  });

  // ---- Prometheus metrics endpoint --------------------------
  const startTime = Date.now();
  let requestCount = 0;
  app.use((req, _res, next) => {
    requestCount++;
    next();
  });
  app.get('/metrics', async (req, res) => {
    setNoCacheHeaders(res);
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');

    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const memUsage = process.memoryUsage();
    const dbStatus = await db.healthCheck().catch(() => ({ ok: false }));

    const lines = [
      '# HELP singem_up Whether the SINGEM backend is up (1=up, 0=down)',
      '# TYPE singem_up gauge',
      'singem_up 1',
      '',
      '# HELP singem_uptime_seconds Backend uptime in seconds',
      '# TYPE singem_uptime_seconds gauge',
      `singem_uptime_seconds ${uptimeSec}`,
      '',
      '# HELP singem_http_requests_total Total HTTP requests received',
      '# TYPE singem_http_requests_total counter',
      `singem_http_requests_total ${requestCount}`,
      '',
      '# HELP singem_database_up Whether the database is reachable (1=connected, 0=disconnected)',
      '# TYPE singem_database_up gauge',
      `singem_database_up ${dbStatus.ok ? 1 : 0}`,
      '',
      '# HELP singem_nodejs_heap_used_bytes Node.js heap used in bytes',
      '# TYPE singem_nodejs_heap_used_bytes gauge',
      `singem_nodejs_heap_used_bytes ${memUsage.heapUsed}`,
      '',
      '# HELP singem_nodejs_heap_total_bytes Node.js heap total in bytes',
      '# TYPE singem_nodejs_heap_total_bytes gauge',
      `singem_nodejs_heap_total_bytes ${memUsage.heapTotal}`,
      '',
      '# HELP singem_nodejs_rss_bytes Node.js resident set size in bytes',
      '# TYPE singem_nodejs_rss_bytes gauge',
      `singem_nodejs_rss_bytes ${memUsage.rss}`,
      '',
      `# HELP singem_nodejs_external_bytes Node.js external memory in bytes`,
      '# TYPE singem_nodejs_external_bytes gauge',
      `singem_nodejs_external_bytes ${memUsage.external}`,
      ''
    ];

    return res.send(lines.join('\n'));
  });

  app.use(express.static(path.join(__dirname, '..')));

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Endpoint não encontrado'));
  });
  app.use(errorHandler(process.env.NODE_ENV));

  const registeredRoutes = [...registeredApiRoutes, '/api/version', '/health', '/api/info', '/metrics'];

  return { app, registeredRoutes };
}

module.exports = {
  createApp
};
