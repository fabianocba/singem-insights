const empenhosService = require('./empenhos.service');
const { ok, created, paginated } = require('../../utils/httpResponse');
const { scheduleAiReindex } = require('../../services/aiReindexScheduler');

async function list(req, res, next) {
  try {
    const result = await empenhosService.listEmpenhos(req.query);
    return paginated(req, res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await empenhosService.getEmpenhoById(req.params.id);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function getBySlug(req, res, next) {
  try {
    const result = await empenhosService.getEmpenhoBySlug(req.params.slug);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await empenhosService.createEmpenho(req.body, req.user, { ip: req.ip });
    scheduleAiReindex(['fornecedor', 'material'], 'empenhos.create');
    return created(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await empenhosService.updateEmpenho(req.params.id, req.body, req.user, { ip: req.ip });
    scheduleAiReindex(['fornecedor', 'material'], 'empenhos.update');
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await empenhosService.deleteEmpenho(req.params.id);
    scheduleAiReindex(['fornecedor', 'material'], 'empenhos.remove');
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function sync(req, res, next) {
  try {
    const result = await empenhosService.syncEmpenhos(req.body.operacoes, req.user);
    scheduleAiReindex(['fornecedor', 'material'], 'empenhos.sync');
    return ok(req, res, result);
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
