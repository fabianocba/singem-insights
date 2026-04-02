const authRoutes = require('../../modules/auth/auth.routes');
const govbrRoutes = require('../../routes/govbr.routes');
const serproidRoutes = require('../../routes/serproid.routes');
const empenhosRoutes = require('../../modules/empenhos/empenhos.routes');
const almoxarifadoRoutes = require('../../modules/almoxarifado/almoxarifado.routes');
const notasFiscaisRoutes = require('../../modules/notas-fiscais/notas-fiscais.routes');
const estoqueRoutes = require('../routes/estoque.routes');
const syncRoutes = require('../../routes/sync.routes');
const catmatRoutes = require('../routes/catmat.routes');
const catalogacaoRoutes = require('../../routes/catalogacao.routes');
const comprasRoutes = require('../../routes/compras.routes');
const comprasGovRoutes = require('../../routes/comprasgov.routes');
const priceIntelligenceRoutes = require('../../routes/price-intelligence.routes');
const procurementAnalyticsRoutes = require('../../routes/procurement-analytics.routes');
const dadosGovRoutes = require('../../routes/dadosgov.routes');
const integracoesAdminRoutes = require('../../routes/integracoes-admin.routes');
const { router: nfeRoutes, setNfeService } = require('../../routes/nfe.routes');
const { router: nfeRoutesV2, setNfeService: setNfeServiceV2 } = require('../../routes/nfe.routes.v2');

function registerRoutes(app, dependencies) {
  const { createIntegracoesLimiter, authenticate, requireAdmin, nfeService, nfeServiceV2 } = dependencies;

  setNfeService(nfeService);
  setNfeServiceV2(nfeServiceV2);

  app.use('/api/nfe', nfeRoutes);
  app.use('/api/nfe/v2', nfeRoutesV2);

  app.use('/api/auth', authRoutes);
  app.use('/api/auth/govbr', govbrRoutes);
  app.use('/api/auth/serproid', serproidRoutes);
  app.use('/api/almoxarifado', almoxarifadoRoutes);
  app.use('/api/empenhos', empenhosRoutes);
  app.use('/api/notas-fiscais', notasFiscaisRoutes);
  app.use('/api/estoque', estoqueRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/catmat', catmatRoutes);
  app.use('/api/catalogacao-pedidos', catalogacaoRoutes);
  app.use('/api/inteligencia-precos', createIntegracoesLimiter(), priceIntelligenceRoutes);
  app.use('/api/compras/inteligencia-precos', createIntegracoesLimiter(), priceIntelligenceRoutes);
  app.use('/api/inteligencia-compras', createIntegracoesLimiter(), procurementAnalyticsRoutes);
  app.use('/api/compras/inteligencia-compras', createIntegracoesLimiter(), procurementAnalyticsRoutes);
  app.use('/api/compras', createIntegracoesLimiter(), comprasRoutes);
  app.use('/api/integracoes/comprasgov', createIntegracoesLimiter(), authenticate, requireAdmin, comprasGovRoutes);
  app.use('/api/integracoes/dadosgov', createIntegracoesLimiter(), authenticate, requireAdmin, dadosGovRoutes);
  app.use('/api/integracoes', createIntegracoesLimiter(), authenticate, requireAdmin, integracoesAdminRoutes);

  return [
    '/api/auth',
    '/api/auth/govbr',
    '/api/auth/serproid',
    '/api/almoxarifado',
    '/api/empenhos',
    '/api/notas-fiscais',
    '/api/estoque',
    '/api/sync',
    '/api/catmat',
    '/api/catalogacao-pedidos',
    '/api/inteligencia-precos',
    '/api/compras/inteligencia-precos',
    '/api/inteligencia-compras',
    '/api/compras/inteligencia-compras',
    '/api/compras',
    '/api/integracoes',
    '/api/integracoes/comprasgov',
    '/api/integracoes/dadosgov',
    '/api/nfe',
    '/api/nfe/v2'
  ];
}

module.exports = {
  registerRoutes
};
