const notasService = require('../services/notasFiscais.service');
const { sendSuccess } = require('../utils/successResponse');

async function list(req, res) {
  const result = await notasService.listNotas(req.query);
  return sendSuccess(res, result);
}

async function getById(req, res) {
  const result = await notasService.getNotaById(req.params.id);
  return sendSuccess(res, result);
}

async function getItems(req, res) {
  const result = await notasService.getItemsByNotaId(req.params.id);
  return sendSuccess(res, result);
}

async function getByChave(req, res) {
  const result = await notasService.getNotaByChave(req.params.chave);
  return sendSuccess(res, result);
}

async function create(req, res) {
  const result = await notasService.createNota(req.body, req.user, { ip: req.ip });
  return sendSuccess(res, result, 201);
}

module.exports = {
  list,
  getById,
  getItems,
  getByChave,
  create
};
