'use strict';

const aiCoreClient = require('../aiCoreClient');

function logSuggestion(scope, payload = {}) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.log(`[AI_CORE][SUGGESTION] scope=${scope} payload=${JSON.stringify(payload)}`);
}

async function health(meta = {}) {
  return aiCoreClient.healthCheck(meta);
}

async function searchCatalog(body = {}, meta = {}) {
  logSuggestion('catalog-search', { query: body.query_text || '', entityTypes: body.entity_types || [] });
  return aiCoreClient.search(body, meta);
}

async function suggestCatalogItem(body = {}, meta = {}) {
  logSuggestion('item', { query: body.text || body.query_text || body.query || '' });
  return aiCoreClient.suggestItem(body, meta);
}

async function suggestSupplier(body = {}, meta = {}) {
  logSuggestion('supplier', { query: body.text || body.query_text || body.query || '' });
  return aiCoreClient.suggestFornecedor(body, meta);
}

async function matchEntity(body = {}, meta = {}) {
  return aiCoreClient.matchEntity(body, meta);
}

async function generateReportInsight(body = {}, meta = {}) {
  return aiCoreClient.reportSummary(body, meta);
}

module.exports = {
  health,
  searchCatalog,
  suggestCatalogItem,
  suggestSupplier,
  matchEntity,
  generateReportInsight
};
