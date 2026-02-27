const estoqueService = require('../services/estoque.service');
const { sendSuccess } = require('../utils/successResponse');

async function listSaldos(req, res) {
  const result = await estoqueService.listSaldos(req.query);
  return sendSuccess(res, result);
}

async function getSaldoByMaterial(req, res) {
  const result = await estoqueService.getSaldoByMaterial(req.params.materialId);
  return sendSuccess(res, result);
}

async function listMovimentos(req, res) {
  const result = await estoqueService.listMovimentos(req.query);
  return sendSuccess(res, result);
}

async function createMovimento(req, res) {
  const result = await estoqueService.createMovimento(req.body, req.user);
  return sendSuccess(res, result, 201);
}

module.exports = {
  listSaldos,
  getSaldoByMaterial,
  listMovimentos,
  createMovimento
};
