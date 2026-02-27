const catmatService = require('../services/catmat.service');
const { sendSuccess } = require('../utils/successResponse');

async function search(req, res) {
  const result = await catmatService.search(req.query);
  return sendSuccess(res, result);
}

async function stats(_req, res) {
  const result = await catmatService.stats();
  return sendSuccess(res, result);
}

async function getByCodigo(req, res) {
  const result = await catmatService.getByCodigo(req.params.codigo);
  return sendSuccess(res, result);
}

module.exports = {
  search,
  stats,
  getByCodigo
};
