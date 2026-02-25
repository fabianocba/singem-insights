const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const db = require('./config/database');
const notFoundHandler = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const govbrRoutes = require('./routes/govbr.routes');
const serproidRoutes = require('./routes/serproid.routes');
const empenhosRoutes = require('./routes/empenhos.routes');
const notasFiscaisRoutes = require('./routes/notas-fiscais.routes');
const estoqueRoutes = require('./routes/estoque.routes');
const syncRoutes = require('./routes/sync.routes');
const catmatRoutes = require('./integrations/catmat/catmat.routes');
const catalogacaoRoutes = require('./routes/catalogacao.routes');
const integrationsRoutes = require('./routes/integrations.routes');

const { router: nfeRoutes, setNfeService } = require('./routes/nfe.routes');
const { router: nfeRoutesV2, setNfeService: setNfeServiceV2 } = require('./routes/nfe.routes.v2');

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
  app.use(cors(corsOptions));
  app.use(bodyParser.json({ limit: bodyLimit }));
  app.use(bodyParser.urlencoded({ extended: true, limit: bodyLimit }));

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

  app.get('/health', async (_req, res) => {
    const dbOk = await db.testConnection().catch(() => false);
    return res.json({
      status: dbOk ? 'OK' : 'DEGRADED',
      version: '2.0.0',
      sistema: 'SINGEM',
      database: dbOk ? 'conectado' : 'desconectado',
      nfeService: nfeService ? 'ativo' : 'inativo',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/info', (_req, res) => {
    return res.json({
      nome: 'SINGEM Server',
      versao: '2.0.0',
      sistema: 'Sistema Institucional de Gestão de Material',
      instituicao: 'IF Baiano'
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler(nodeEnv));

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
