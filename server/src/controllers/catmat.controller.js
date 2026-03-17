const catmatService = require('../services/catmat.service');
const { ok } = require('../../utils/httpResponse');

async function search(req, res) {
  const result = await catmatService.search(req.query);
  const dados = Array.isArray(result?.dados) ? result.dados : [];

  return ok(req, res, result, {
    total: Number(result?.total || dados.length),
    pagina: Number(result?.pagina || 1),
    totalPaginas: result?.totalPaginas ?? null,
    limite: Number(req?.query?.limite || 20),
    offset: Number(req?.query?.offset || 0),
    fonte: result?.fonte || null,
    aviso: result?.aviso || null,
    cache: result?.cache || null
  });
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
