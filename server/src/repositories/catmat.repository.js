const catmatService = require('../../integrations/catmat/catmatService');

async function search(term, options) {
  return catmatService.search(term, options);
}

async function getStats() {
  return catmatService.getStats();
}

async function findByCodigo(codigo) {
  return catmatService.findByCodigo(codigo);
}

module.exports = {
  search,
  getStats,
  findByCodigo
};
