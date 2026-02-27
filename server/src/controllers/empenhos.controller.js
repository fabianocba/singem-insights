const empenhosService = require('../services/empenhos.service');
const { sendSuccess } = require('../utils/successResponse');

async function list(req, res) {
  const result = await empenhosService.listEmpenhos(req.query);
  return sendSuccess(res, result);
}

async function getById(req, res) {
  const result = await empenhosService.getEmpenhoById(req.params.id);
  return sendSuccess(res, result);
}

async function getBySlug(req, res) {
  const result = await empenhosService.getEmpenhoBySlug(req.params.slug);
  return sendSuccess(res, result);
}

async function create(req, res) {
  const result = await empenhosService.createEmpenho(req.body, req.user, { ip: req.ip });
  return sendSuccess(res, result, 201);
}

async function update(req, res) {
  const result = await empenhosService.updateEmpenho(req.params.id, req.body, req.user, { ip: req.ip });
  return sendSuccess(res, result);
}

async function remove(req, res) {
  const result = await empenhosService.deleteEmpenho(req.params.id);
  return sendSuccess(res, result);
}

module.exports = {
  list,
  getById,
  getBySlug,
  create,
  update,
  remove
};
