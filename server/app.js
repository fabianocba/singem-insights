const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const db = require('./db');
const requestId = require('./middlewares/requestId');
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/appError');
const { createApiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./modules/auth/auth.routes');
const govbrRoutes = require('./routes/govbr.routes');
const serproidRoutes = require('./routes/serproid.routes');
const empenhosRoutes = require('./modules/empenhos/empenhos.routes');
const notasFiscaisRoutes = require('./modules/notas-fiscais/notas-fiscais.routes');
const estoqueRoutes = require('./src/routes/estoque.routes');
const syncRoutes = require('./routes/sync.routes');
const catmatRoutes = require('./src/routes/catmat.routes');
const catalogacaoRoutes = require('./routes/catalogacao.routes');
const integrationsRoutes = require('./routes/integrations.routes');

const { router: nfeRoutes, setNfeService } = require('./routes/nfe.routes');
const { router: nfeRoutesV2, setNfeService: setNfeServiceV2 } = require('./routes/nfe.routes.v2');

function readJsonSafe(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function resolveGitCommitShort() {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

function loadVersionInfo(nodeEnv) {
  const versionJsonPath = path.resolve(__dirname, '..', 'js', 'core', 'version.json');
  const serverPackagePath = path.resolve(__dirname, 'package.json');

  const coreVersion = readJsonSafe(versionJsonPath);
  const serverPackage = readJsonSafe(serverPackagePath);

  return {
    name: String(coreVersion.name || 'SINGEM'),
    version: String(serverPackage.version || coreVersion.version || '0.0.0'),
    build: String(coreVersion.build || 'local'),
    buildTimestamp: String(coreVersion.buildTimestamp || new Date().toISOString()),
    gitCommit: resolveGitCommitShort(),
    nodeEnv: nodeEnv === 'production' ? 'production' : 'development'
  };
}

function createApp({ nodeEnv, bodyLimit, corsOrigins, trustProxy, nfeService, nfeServiceV2 }) {
  const app = express();

  const corsOptions = {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (corsOrigins.includes(origin)) {
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

  app.use(express.static(path.join(__dirname, '..')));

  setNfeService(nfeService);
  setNfeServiceV2(nfeServiceV2);

  app.use('/api/nfe', nfeRoutes);
  app.use('/api/nfe/v2', nfeRoutesV2);

  app.use('/api/auth', authRoutes);
  app.use('/api/auth/govbr', govbrRoutes);
  app.use('/api/auth/serproid', serproidRoutes);
  app.use('/api/empenhos', empenhosRoutes);
  app.use('/api/notas-fiscais', notasFiscaisRoutes);
  app.use('/api/estoque', estoqueRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/catmat', catmatRoutes);
  app.use('/api/catalogacao-pedidos', catalogacaoRoutes);
  app.use('/api/integrations', integrationsRoutes);

  app.get('/health', async (req, res) => {
    const dbStatus = await db.healthCheck().catch((error) => ({
      ok: false,
      error: error?.message || 'Falha no healthcheck do PostgreSQL'
    }));

    const response = {
      status: dbStatus.ok ? 'OK' : 'DEGRADED',
      version: '2.0.0',
      sistema: 'SINGEM',
      database: dbStatus.ok ? 'conectado' : 'desconectado',
      nfeService: nfeService ? 'ativo' : 'inativo',
      timestamp: new Date().toISOString()
    };

    if (nodeEnv !== 'production' && dbStatus.error) {
      response.dbError = dbStatus.error;
    }

    return res.json(response);
  });

  app.get('/api/info', (_req, res) => {
    return res.json({
      nome: 'SINGEM Server',
      versao: '2.0.0',
      sistema: 'Sistema Institucional de Gestão de Material',
      instituicao: 'IF Baiano'
    });
  });

  app.get('/api/version', (_req, res) => {
    const info = loadVersionInfo(nodeEnv);
    return res.json({
      backend: {
        version: info.version,
        build: info.build,
        commit: info.gitCommit,
        env: info.nodeEnv
      },
      timestamp: new Date().toISOString(),
      name: info.name,
      buildTimestamp: info.buildTimestamp
    });
  });

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Endpoint não encontrado'));
  });
  app.use(errorHandler(process.env.NODE_ENV));

  const registeredRoutes = [
    '/api/auth',
    '/api/auth/govbr',
    '/api/auth/serproid',
    '/api/empenhos',
    '/api/notas-fiscais',
    '/api/estoque',
    '/api/sync',
    '/api/catmat',
    '/api/catalogacao-pedidos',
    '/api/integrations',
    '/api/version',
    '/api/nfe',
    '/api/nfe/v2',
    '/health',
    '/api/info'
  ];

  return { app, registeredRoutes };
}

module.exports = {
  createApp
};
