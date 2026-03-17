'use strict';

const { priceIntelligenceService } = require('./price-intelligence.service');
const { supplierIntelligenceService } = require('./supplier-intelligence.service');
const { buyerIntelligenceService } = require('./buyer-intelligence.service');
const reportInsightService = require('./ai-core/reportInsightService');
const AppError = require('../utils/appError');

function normalizeFocus(value) {
  const normalized = String(value || 'price').trim().toLowerCase();
  if (normalized === 'supplier' || normalized === 'fornecedor') {
    return 'supplier';
  }

  if (normalized === 'buyer' || normalized === 'uasg' || normalized === 'orgao') {
    return 'buyer';
  }

  return 'price';
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function logAnalytics(scope, payload = {}) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.log(`[ANALYTICS][${scope}] ${JSON.stringify(payload)}`);
}

function extractTopSupplierDocuments(response = {}) {
  const docsFromPage = (response?.page?.items || []).map((item) => item?.niFornecedor).filter(Boolean);
  const docsFromAnalytics = (response?.suppliers?.topByFrequency || []).map((item) => item?.niFornecedor).filter(Boolean);
  return unique([...docsFromPage, ...docsFromAnalytics]).slice(0, 8);
}

function extractTopBuyerCodes(response = {}) {
  const codesFromPage = (response?.page?.items || []).map((item) => item?.codigoUasg).filter(Boolean);
  const codesFromAnalytics = (response?.buyers?.topUasgs || []).map((item) => item?.codigoUasg).filter(Boolean);
  return unique([...codesFromPage, ...codesFromAnalytics]).slice(0, 8);
}

function buildIntegratedPanel(focus, response, linkedSuppliers = [], linkedBuyers = []) {
  if (focus === 'price') {
    return {
      focus,
      linkedSuppliers,
      linkedBuyers,
      coverage: {
        supplierProfiles: linkedSuppliers.length,
        buyerProfiles: linkedBuyers.length
      },
      summary: {
        title: 'Conexoes analiticas',
        text: `Painel conectado com ${linkedSuppliers.length} perfil(is) oficial(is) de fornecedor e ${linkedBuyers.length} perfil(is) oficial(is) de UASG/órgão a partir do recorte de preços.`
      }
    };
  }

  return {
    focus,
    linkedSuppliers:
      focus === 'supplier'
        ? response?.page?.items?.slice(0, 8) || []
        : response?.priceContext?.suppliers?.topByFrequency?.slice(0, 8) || [],
    linkedBuyers:
      focus === 'buyer'
        ? response?.page?.items?.slice(0, 8) || []
        : response?.priceContext?.buyers?.topUasgs?.slice(0, 8) || [],
    relatedPriceSummary: response?.priceContext
      ? {
          totalRegistros: response.priceContext.metrics?.totalRegistros || 0,
          totalCompras: response.priceContext.metrics?.totalCompras || 0,
          precoMedio: response.priceContext.metrics?.precoMedio || 0,
          valorTotalEstimado: response.priceContext.metrics?.valorTotalEstimado || 0
        }
      : null,
    summary: {
      title: 'Painel analitico integrado',
      text:
        focus === 'supplier'
          ? 'Fornecedor conectado ao historico de preços e aos principais compradores do recorte.'
          : 'UASG/órgão conectado ao historico de preços e aos principais fornecedores do recorte.'
    }
  };
}

function buildAiPayload(focus, response) {
  if (!response) {
    return null;
  }

  const reportKey = focus === 'price' ? 'compras_publicas_preco' : focus === 'supplier' ? 'compras_publicas_fornecedor' : 'compras_publicas_buyer';
  const contextModule = focus === 'price' ? 'price-intelligence' : focus === 'supplier' ? 'supplier-intelligence' : 'buyer-intelligence';

  return {
    report_key: reportKey,
    context_module: contextModule,
    data: {
      summary: response?.summary?.text || '',
      metrics: response?.metrics || {},
      cache: response?.cache || null,
      focus,
      generatedAt: response?.meta?.generatedAt || response?.meta?.timestamp || null
    }
  };
}

class ProcurementAnalyticsService {
  constructor(options = {}) {
    this.priceIntelligenceService = options.priceIntelligenceService || priceIntelligenceService;
    this.supplierIntelligenceService = options.supplierIntelligenceService || supplierIntelligenceService;
    this.buyerIntelligenceService = options.buyerIntelligenceService || buyerIntelligenceService;
    this.reportInsightService = options.reportInsightService || reportInsightService;
  }

  async maybeGenerateAiSummary(focus, response, context = {}, includeAiSummary = false) {
    if (!includeAiSummary) {
      return null;
    }

    const payload = buildAiPayload(focus, response);
    if (!payload) {
      return null;
    }

    try {
      return await this.reportInsightService.gerarInsight(payload, context);
    } catch (error) {
      logAnalytics('AI', {
        focus,
        erro: error?.message || 'falha ao gerar resumo AI'
      });
      return null;
    }
  }

  async query(input = {}, context = {}) {
    const focus = normalizeFocus(input.focus || input.dataset);
    logAnalytics('BUILD', {
      focus,
      routeInterna: context.routeInterna || '/api/inteligencia-compras/query'
    });

    if (focus === 'price') {
      const response = await this.priceIntelligenceService.query(input, context);
      const topSupplierDocs = extractTopSupplierDocuments(response);
      const topBuyerCodes = extractTopBuyerCodes(response);
      const linkedSuppliers = await this.supplierIntelligenceService.lookupProfiles(topSupplierDocs, context);
      const linkedBuyers = await this.buyerIntelligenceService.lookupUasgProfiles(topBuyerCodes, context);
      const integratedPanel = buildIntegratedPanel(focus, response, linkedSuppliers, linkedBuyers);
      const aiSummary = await this.maybeGenerateAiSummary(focus, response, context, input.includeAiSummary === true);

      return {
        ...response,
        focus,
        integratedPanel,
        aiSummary
      };
    }

    if (focus === 'supplier') {
      const response = await this.supplierIntelligenceService.query(input, context);
      const integratedPanel = buildIntegratedPanel(focus, response);
      const aiSummary = await this.maybeGenerateAiSummary(focus, response, context, input.includeAiSummary === true);
      return {
        ...response,
        focus,
        integratedPanel,
        aiSummary
      };
    }

    if (focus === 'buyer') {
      const response = await this.buyerIntelligenceService.query(input, context);
      const integratedPanel = buildIntegratedPanel(focus, response);
      const aiSummary = await this.maybeGenerateAiSummary(focus, response, context, input.includeAiSummary === true);
      return {
        ...response,
        focus,
        integratedPanel,
        aiSummary
      };
    }

    throw new AppError(400, 'VALIDATION_ERROR', 'Foco analitico invalido. Use price, supplier ou buyer.');
  }

  async exportQuery(input = {}, format = 'csv', context = {}) {
    const focus = normalizeFocus(input.focus || input.dataset);

    if (focus === 'price') {
      return this.priceIntelligenceService.exportQuery(input, format, context);
    }

    if (focus === 'supplier') {
      return this.supplierIntelligenceService.exportQuery(input, format, context);
    }

    if (focus === 'buyer') {
      return this.buyerIntelligenceService.exportQuery(input, format, context);
    }

    throw new AppError(400, 'VALIDATION_ERROR', 'Foco analitico invalido para exportacao.');
  }
}

const procurementAnalyticsService = new ProcurementAnalyticsService();

module.exports = {
  ProcurementAnalyticsService,
  procurementAnalyticsService
};
