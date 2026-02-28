const estoqueService = require('../services/estoque.service');
const { ok, created } = require('../../utils/httpResponse');

async function listSaldos(req, res) {
  const result = await estoqueService.listSaldos(req.query);
  return ok(req, res, result.dados ?? result);
}

async function getSaldoByMaterial(req, res) {
  const result = await estoqueService.getSaldoByMaterial(req.params.materialId);
  return ok(req, res, result.dados ?? result);
}

async function listMovimentos(req, res) {
  const result = await estoqueService.listMovimentos(req.query);
  return ok(req, res, result.dados ?? result);
}

async function createMovimento(req, res) {
  const result = await estoqueService.createMovimento(req.body, req.user);
  return created(req, res, result.dados ?? result);
}

async function listMateriais(req, res) {
  const result = await estoqueService.listMateriais(req.query);
  return ok(req, res, result.dados ?? result);
}

async function createMaterial(req, res) {
  const result = await estoqueService.createMaterial(req.body);
  return created(req, res, result.dados ?? result);
}

async function updateMaterial(req, res) {
  const result = await estoqueService.updateMaterial(req.params.id, req.body);
  return ok(req, res, result.dados ?? result);
}

module.exports = {
  listSaldos,
  getSaldoByMaterial,
  listMovimentos,
  createMovimento,
  listMateriais,
  createMaterial,
  updateMaterial
};
