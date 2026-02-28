const catmatService = require('../services/catmat.service');
const { ok } = require('../../utils/httpResponse');

async function search(req, res) {
  const result = await catmatService.search(req.query);
  return ok(req, res, result.dados ?? result);
}

async function stats(_req, res) {
  const result = await catmatService.stats();
  return ok(_req, res, result.dados ?? result);
}

async function getByCodigo(req, res) {
  const result = await catmatService.getByCodigo(req.params.codigo);
  return ok(req, res, result.dados ?? result);
}

module.exports = {
  search,
  stats,
  getByCodigo
};
