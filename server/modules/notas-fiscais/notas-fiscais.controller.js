const notasService = require('./notas-fiscais.service');
const { sendSuccess } = require('../../src/utils/successResponse');

async function list(req, res, next) {
  try {
    const result = await notasService.listNotas(req.query);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await notasService.getNotaById(req.params.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getItems(req, res, next) {
  try {
    const result = await notasService.getItemsByNotaId(req.params.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getByChave(req, res, next) {
  try {
    const result = await notasService.getNotaByChave(req.params.chave);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await notasService.createNota(req.body, req.user, { ip: req.ip });
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await notasService.updateNota(req.params.id, req.body, req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function conferir(req, res, next) {
  try {
    const result = await notasService.conferirNota(req.params.id, req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function receber(req, res, next) {
  try {
    const result = await notasService.receberNota(req.params.id, req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await notasService.deleteNota(req.params.id, req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  getById,
  getItems,
  getByChave,
  create,
  update,
  conferir,
  receber,
  remove
};
