const service = require('./almoxarifado.service');
const { ok, created, paginated } = require('../../../utils/httpResponse');

async function getMeta(req, res, next) {
  try {
    const result = await service.getMeta();
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const result = await service.getDashboard(req.query);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function listContas(req, res, next) {
  try {
    const result = await service.listContasContabeis(req.query);
    return paginated(req, res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function createConta(req, res, next) {
  try {
    const result = await service.createContaContabil(req.body, req.user, req.requestId);
    return created(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function listItens(req, res, next) {
  try {
    const result = await service.listItems(req.query);
    return paginated(req, res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function getItem(req, res, next) {
  try {
    const result = await service.getItemById(req.params.id);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function createItem(req, res, next) {
  try {
    const result = await service.createItem(req.body, req.user, req.requestId);
    return created(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const result = await service.updateItem(req.params.id, req.body, req.user, req.requestId);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function listNotasEntrada(req, res, next) {
  try {
    const result = await service.listNotasEntrada(req.query);
    return paginated(req, res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function createNotaEntrada(req, res, next) {
  try {
    const result = await service.createNotaEntrada(req.body, req.user, req.requestId);
    return created(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function listMovimentacoes(req, res, next) {
  try {
    const result = await service.listMovimentacoes(req.query);
    return paginated(req, res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function createMovimentacao(req, res, next) {
  try {
    const result = await service.createMovimentacao(req.body, req.user, req.requestId);
    return created(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function listSolicitacoes(req, res, next) {
  try {
    const result = await service.listSolicitacoes(req.query);
    return paginated(req, res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function createSolicitacao(req, res, next) {
  try {
    const result = await service.createSolicitacao(req.body, req.user, req.requestId);
    return created(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function updateSolicitacaoStatus(req, res, next) {
  try {
    const result = await service.updateSolicitacaoStatus(req.params.id, req.body, req.user, req.requestId);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function getResumoRelatorio(req, res, next) {
  try {
    const result = await service.getResumoRelatorio(req.query);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function listAuditoria(req, res, next) {
  try {
    const result = await service.listAuditoria(req.query);
    return paginated(req, res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMeta,
  getDashboard,
  listContas,
  createConta,
  listItens,
  getItem,
  createItem,
  updateItem,
  listNotasEntrada,
  createNotaEntrada,
  listMovimentacoes,
  createMovimentacao,
  listSolicitacoes,
  createSolicitacao,
  updateSolicitacaoStatus,
  getResumoRelatorio,
  listAuditoria
};
