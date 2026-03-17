'use strict';

const aiCoreService = require('./aiCoreService');

async function sugerirItem(query, context = {}) {
  return aiCoreService.suggestCatalogItem(
    {
      query_text: query,
      context_module: 'catalog-search'
    },
    context
  );
}

async function sugerirFornecedor(query, context = {}) {
  return aiCoreService.suggestSupplier(
    {
      query_text: query,
      context_module: 'supplier-search'
    },
    context
  );
}

module.exports = {
  sugerirItem,
  sugerirFornecedor
};
