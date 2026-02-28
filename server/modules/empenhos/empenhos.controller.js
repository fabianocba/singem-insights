const empenhosService = require('./empenhos.service');
const { sendSuccess } = require('../../src/utils/successResponse');

async function list(req, res, next) {
  try {
    const result = await empenhosService.listEmpenhos(req.query);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await empenhosService.getEmpenhoById(req.params.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getBySlug(req, res, next) {
  try {
    const result = await empenhosService.getEmpenhoBySlug(req.params.slug);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await empenhosService.createEmpenho(req.body, req.user, { ip: req.ip });
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await empenhosService.updateEmpenho(req.params.id, req.body, req.user, { ip: req.ip });
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await empenhosService.deleteEmpenho(req.params.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function sync(req, res, next) {
  try {
    const result = await empenhosService.syncEmpenhos(req.body.operacoes, req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  getById,
  getBySlug,
  create,
  update,
  remove,
  sync
};
