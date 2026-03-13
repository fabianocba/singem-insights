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

const authRoutes = require('./modules/auth/auth.routes');
const govbrRoutes = require('./routes/govbr.routes');
const serproidRoutes = require('./routes/serproid.routes');
const empenhosRoutes = require('./modules/empenhos/empenhos.routes');
const notasFiscaisRoutes = require('./modules/notas-fiscais/notas-fiscais.routes');
const estoqueRoutes = require('./src/routes/estoque.routes');
const syncRoutes = require('./routes/sync.routes');
const catmatRoutes = require('./src/routes/catmat.routes');
const catalogacaoRoutes = require('./routes/catalogacao.routes');
const comprasRoutes = require('./routes/compras.routes');
const comprasGovRoutes = require('./routes/comprasgov.routes');
const priceIntelligenceRoutes = require('./routes/price-intelligence.routes');
const dadosGovRoutes = require('./routes/dadosgov.routes');
const integracoesAdminRoutes = require('./routes/integracoes-admin.routes');
const aiRoutes = require('./routes/ai.routes');
const aiCoreClient = require('./services/aiCoreClient');
const { createSystemStatusRouter } = require('./routes/system-status.routes');

const { router: nfeRoutes, setNfeService } = require('./routes/nfe.routes');
const { router: nfeRoutesV2, setNfeService: setNfeServiceV2 } = require('./routes/nfe.routes.v2');

function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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
  app.use('/api/inteligencia-precos', createIntegracoesLimiter(), priceIntelligenceRoutes);
  app.use('/api/compras/inteligencia-precos', createIntegracoesLimiter(), priceIntelligenceRoutes);
  app.use('/api/compras', createIntegracoesLimiter(), comprasRoutes);
  app.use('/api/ai', authenticate, aiRoutes);
  app.use('/api/integracoes/comprasgov', createIntegracoesLimiter(), authenticate, requireAdmin, comprasGovRoutes);
  app.use('/api/integracoes/dadosgov', createIntegracoesLimiter(), authenticate, requireAdmin, dadosGovRoutes);
  app.use('/api/integracoes', createIntegracoesLimiter(), authenticate, requireAdmin, integracoesAdminRoutes);
  app.use('/system-status', createSystemStatusRouter({ nodeEnv, nfeService, nfeServiceV2 }));

  app.get('/health', async (req, res) => {
    setNoCacheHeaders(res);

    const dbStatus = await db.healthCheck().catch((error) => ({
      ok: false,
      error: error?.message || 'Falha no healthcheck do PostgreSQL'
    }));
    const aiStatus = await aiCoreClient.healthCheck({ requestId: req.requestId, timeoutMs: 2000 });

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
      aiCore: {
        enabled: Boolean(aiStatus.enabled),
        status: aiStatus.status || 'unknown',
        ok: Boolean(aiStatus.ok),
        service: aiStatus.service || 'SINGEM AI Core'
      },
      nfeService: nfeService ? 'ativo' : 'inativo',
      timestamp: new Date().toISOString()
    };

    if (dbStatus.ok && aiStatus.enabled && !aiStatus.ok) {
      response.status = 'DEGRADED';
    }

    if (nodeEnv !== 'production' && dbStatus.error) {
      response.dbError = dbStatus.error;
    }

    if (nodeEnv !== 'production' && aiStatus.error) {
      response.aiCore.error = aiStatus.error;
    }

    return res.json(response);
  });

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

  app.use(express.static(path.join(__dirname, '..')));

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
    '/api/inteligencia-precos',
    '/api/compras/inteligencia-precos',
    '/api/compras',
    '/api/ai',
    '/api/integracoes',
    '/api/integracoes/comprasgov',
    '/api/integracoes/dadosgov',
    '/api/version',
    '/api/nfe',
    '/api/nfe/v2',
    '/health',
    '/system-status',
    '/api/info'
  ];

  return { app, registeredRoutes };
}

module.exports = {
  createApp
};
