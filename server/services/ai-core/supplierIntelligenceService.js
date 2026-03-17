'use strict';

const aiCoreService = require('./aiCoreService');
const { supplierIntelligenceService } = require('../supplier-intelligence.service');

async function sugerirFornecedor(query, context = {}) {
  return aiCoreService.suggestSupplier(
    {
      query_text: query,
      context_module: 'supplier-intelligence'
    },
    context
  );
}

async function query(payload = {}, context = {}) {
  return supplierIntelligenceService.query(payload, context);
}

async function querySingle(document, payload = {}, context = {}) {
  return supplierIntelligenceService.querySingle(document, payload, context);
}

async function exportQuery(payload = {}, format = 'csv', context = {}) {
  return supplierIntelligenceService.exportQuery(payload, format, context);
}

async function lookupProfiles(documents = [], context = {}) {
  return supplierIntelligenceService.lookupProfiles(documents, context);
}

module.exports = {
  sugerirFornecedor,
  query,
  querySingle,
  exportQuery,
  lookupProfiles
};
