/**
 * SINGEM Server - Sistema Institucional de Gestão de Material
 * IF Baiano - API REST com PostgreSQL + JWT
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Database
const db = require('./config/database');

// Rotas SINGEM
const authRoutes = require('./routes/auth.routes');
const govbrRoutes = require('./routes/govbr.routes');
const serproidRoutes = require('./routes/serproid.routes');
const empenhosRoutes = require('./routes/empenhos.routes');
const notasFiscaisRoutes = require('./routes/notas-fiscais.routes');
const estoqueRoutes = require('./routes/estoque.routes');
const syncRoutes = require('./routes/sync.routes');

// Integrações consolidadas
const integrationsRoutes = require('./routes/integrations.routes');

// Serviços e rotas de NF-e (v1 - legado)
const NfeImportService = require('./services/NfeImportService');
const { router: nfeRoutes, setNfeService } = require('./routes/nfe.routes');

// Serviços e rotas de NF-e v2 (novo pipeline robusto)
const NfeImportServiceV2 = require('./services/NfeImportServiceV2');
const { router: nfeRoutesV2, setNfeService: setNfeServiceV2 } = require('./routes/nfe.routes.v2');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve arquivos estáticos da raiz do projeto
app.use(express.static(path.join(__dirname, '..')));

// ==========================================
// CONFIGURAÇÃO DO SERVIÇO NF-e v1 (Legado)
// ==========================================

const nfeService = new NfeImportService({
  storagePath: path.join(__dirname, '../storage/nfe'),
  ambiente: process.env.SEFAZ_AMBIENTE || 'producao',
  certificadoPath: process.env.CERTIFICADO_PATH || null,
  certificadoSenha: process.env.CERTIFICADO_SENHA || null
});

// Inicializa serviço de NF-e v1 de forma assíncrona
nfeService
  .inicializar()
  .then(() => {
    console.log('✅ Serviço de NF-e v1 inicializado');
    setNfeService(nfeService);
  })
  .catch((err) => {
    console.warn('⚠️ Serviço de NF-e v1 não totalmente configurado:', err.message);
    setNfeService(nfeService);
  });

// ==========================================
// CONFIGURAÇÃO DO SERVIÇO NF-e v2 (Novo)
// ==========================================

const nfeServiceV2 = new NfeImportServiceV2({
  storagePath: path.join(__dirname, '../storage/nfe')
});

// Inicializa serviço de NF-e v2
nfeServiceV2
  .inicializar()
  .then(() => {
    console.log('✅ Serviço de NF-e v2 inicializado (pipeline robusto)');
    setNfeServiceV2(nfeServiceV2);
  })
  .catch((err) => {
    console.error('❌ Erro ao inicializar serviço NF-e v2:', err.message);
  });

// Rotas de NF-e (v1 legado + v2 novo)
app.use('/api/nfe', nfeRoutes);
app.use('/api/nfe/v2', nfeRoutesV2);

// Rotas SINGEM
app.use('/api/auth', authRoutes);
app.use('/api/auth/govbr', govbrRoutes);
app.use('/api/auth/serproid', serproidRoutes);
app.use('/api/empenhos', empenhosRoutes);
app.use('/api/notas-fiscais', notasFiscaisRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/sync', syncRoutes);

// Integrações externas consolidadas
app.use('/api/integrations', integrationsRoutes);

// Health check
app.get('/health', async (req, res) => {
  const dbOk = await db.testConnection().catch(() => false);
  res.json({
    status: dbOk ? 'OK' : 'DEGRADED',
    version: '2.0.0',
    sistema: 'SINGEM',
    database: dbOk ? 'conectado' : 'desconectado',
    nfeService: nfeService ? 'ativo' : 'inativo',
    timestamp: new Date().toISOString()
  });
});

// Info do servidor
app.get('/api/info', (req, res) => {
  res.json({
    nome: 'SINGEM Server',
    versao: '2.0.0',
    sistema: 'Sistema Institucional de Gestão de Material',
    instituicao: 'IF Baiano'
  });
});

// ==========================================
// TRATAMENTO DE ERROS
// ==========================================

// 404
app.use((req, res) => {
  res.status(404).json({
    erro: 'Endpoint não encontrado',
    path: req.path
  });
});

// Erro geral
app.use((err, req, res, _next) => {
  console.error('Erro:', err);
  res.status(500).json({
    erro: 'Erro interno do servidor',
    mensagem: err.message
  });
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function startServer() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║                                           ║');
  console.log('║          🏛️  SINGEM SERVER 2.0           ║');
  console.log('║    Sistema Institucional de Gestão de     ║');
  console.log('║              Material - IF Baiano         ║');
  console.log('║                                           ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');

  // Inicializa banco de dados
  console.log('🔌 Conectando ao PostgreSQL...');
  const dbReady = await db.initDatabase().catch((err) => {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    console.log('⚠️  Servidor iniciando sem banco de dados');
    return false;
  });

  if (dbReady) {
    console.log('✅ PostgreSQL conectado e migrations aplicadas');
  }

  // Inicia servidor HTTP
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log('');
    console.log('📡 Endereços de acesso:');
    console.log(`   • Local:  http://localhost:${PORT}`);
    console.log(`   • Rede:   http://<seu-ip>:${PORT}`);
    console.log('');
    console.log('🔐 API de Autenticação:');
    console.log('   • POST /api/auth/login     - Login');
    console.log('   • POST /api/auth/refresh   - Renovar token');
    console.log('   • POST /api/auth/logout    - Logout');
    console.log('   • POST /api/auth/register  - Primeiro admin');
    console.log('');
    console.log('📋 API de Empenhos:');
    console.log('   • GET  /api/empenhos       - Listar');
    console.log('   • GET  /api/empenhos/:id   - Buscar');
    console.log('   • POST /api/empenhos       - Criar');
    console.log('   • PUT  /api/empenhos/:id   - Atualizar');
    console.log('   • DELETE /api/empenhos/:id - Excluir');
    console.log('   • POST /api/empenhos/sync  - Sincronização');
    console.log('');
    console.log('📦 API de NF-e:');
    console.log('   • POST /api/nfe/importar   - Importar via SEFAZ');
    console.log('   • POST /api/nfe/upload     - Upload manual XML');
    console.log('   • GET  /api/nfe/danfe/:chave - Obter DANFE');
    console.log('');
    console.log('� Integrações (stubs):');
    console.log('   • /api/auth/govbr/*         - Login gov.br');
    console.log('   • /api/integrations/catmat/* - CATMAT');
    console.log('   • /api/integrations/serpro/* - SERPRO');
    console.log('');
    console.log('�🔍 Health Check: /health');
    console.log('');
    console.log('Pressione Ctrl+C para parar o servidor');
    console.log('');
  });
}

startServer().catch((err) => {
  console.error('❌ Falha ao iniciar servidor:', err);
  process.exit(1);
});
