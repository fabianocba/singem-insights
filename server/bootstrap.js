const path = require('path');
const NfeImportService = require('./src/services/NfeImportService');
const NfeImportServiceV2 = require('./src/services/NfeImportServiceV2');
const db = require('./db');
const databaseCompat = require('./config/database');
const { verifySmtpConnection } = require('./src/services/emailService');
const { createApp } = require('./app');
const { config, getCorsOrigins, validateRuntimeConfig } = require('./config');

async function initializeNfeServices() {
  const nfeService = new NfeImportService({
    storagePath: path.join(__dirname, '../storage/nfe'),
    ambiente: config.sefaz.ambiente,
    certificadoPath: config.sefaz.certificadoPath,
    certificadoSenha: config.sefaz.certificadoSenha
  });

  const nfeServiceV2 = new NfeImportServiceV2({
    storagePath: path.join(__dirname, '../storage/nfe')
  });

  nfeService
    .inicializar()
    .then(() => {
      console.log('[NFE] Serviço de NF-e v1 inicializado');
    })
    .catch((err) => {
      console.warn('[NFE] Serviço de NF-e v1 não totalmente configurado:', err.message);
    });

  nfeServiceV2
    .inicializar()
    .then(() => {
      console.log('[NFE] Serviço de NF-e v2 inicializado (pipeline robusto)');
    })
    .catch((err) => {
      console.error('[NFE] Erro ao inicializar serviço NF-e v2:', err.message);
    });

  return { nfeService, nfeServiceV2 };
}

async function startServer() {
  validateRuntimeConfig();

  const corsOrigins = getCorsOrigins();
  const { nfeService, nfeServiceV2 } = await initializeNfeServices();

  const { app, registeredRoutes } = createApp({
    nodeEnv: config.env,
    bodyLimit: config.apiBodyLimit,
    corsOrigins,
    trustProxy: config.trustProxy,
    nfeService,
    nfeServiceV2
  });

  console.log('============================================');
  console.log('SINGEM SERVER 2.0');
  console.log('Sistema Institucional de Gestão de Material');
  console.log('IF Baiano');
  console.log('============================================');
  console.log('');
  console.log(`[Config] Ambiente: ${config.env}`);
  console.log(
    `[Config] CORS_ORIGINS: ${corsOrigins.length > 0 ? corsOrigins.join(', ') : 'nenhuma origem configurada'}`
  );
  console.log(`[Config] Limite de payload: ${config.apiBodyLimit}`);
  if (config.trustProxy || config.env === 'production') {
    console.log('[Config] trust proxy: habilitado (proxy reverso/Nginx)');
  }
  console.log('');

  console.log('[DB] Conectando ao PostgreSQL...');
  const dbHealth = await db.healthCheck().catch((error) => ({
    ok: false,
    error: error?.message || 'Falha no healthcheck do PostgreSQL'
  }));

  const dbReady = Boolean(dbHealth.ok);

  if (!dbReady) {
    console.error('[DB] Erro ao conectar ao banco:', dbHealth.error || 'desconhecido');
    console.log('[DB] Servidor iniciando sem banco de dados');
  }

  if (dbReady) {
    await databaseCompat.runMigrations();
    console.log('[DB] PostgreSQL conectado e migrations aplicadas');
  } else {
    console.log('[DB] PostgreSQL indisponível no startup healthcheck');
  }

  console.log('[SMTP] Verificando configuração SMTP...');
  await verifySmtpConnection();

  console.log(`[API] Rotas registradas: ${registeredRoutes.join(', ')}`);

  app.listen(config.port, '0.0.0.0', () => {
    console.log('');
    console.log(`[API] Servidor rodando na porta ${config.port}`);
    console.log('');
    console.log('Endereços de acesso:');
    console.log(`   • Local:  http://localhost:${config.port}`);
    console.log(`   • Rede:   http://<seu-ip>:${config.port}`);
    console.log('');
    console.log('Health Check: /health');
    console.log('');
    console.log('Pressione Ctrl+C para parar o servidor');
    console.log('');
  });
}

module.exports = {
  startServer
};
