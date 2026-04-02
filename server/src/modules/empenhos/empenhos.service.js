const baseEmpenhosService = require('../../services/empenhos.service');
const AppError = require('../../../utils/appError');
const empenhosRepository = require('./empenhos.repository');
const { parsePagination, buildMeta } = require('../../../utils/pagination');

async function listEmpenhos(query) {
  const normalizedQuery = {
    ...query,
    limit: query.limit || query.limite,
    page:
      query.page ||
      (query.offset !== undefined && (query.limit || query.limite)
        ? Math.floor(Number(query.offset) / Number(query.limit || query.limite)) + 1
        : undefined)
  };

  const pagination = parsePagination(
    normalizedQuery,
    {
      sortField: 'createdAt',
      sortDir: 'desc',
      sort: 'createdAt:desc'
    },
    ['createdAt', 'numero', 'ano', 'fornecedor', 'dataEmpenho', 'status', 'statusValidacao', 'valorTotal']
  );

  const filters = {
    ...pagination,
    q: query.q || query.busca,
    status: query.status,
    unidadeId: query.unidadeId,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
    ano: query.ano,
    cnpj: query.cnpj
  };

  const result = await empenhosRepository.findAllPaginated(filters);

  const meta = buildMeta({
    page: pagination.page,
    limit: pagination.limit,
    total: result.total,
    sort: pagination.sort
  });

  meta.filters = {
    q: filters.q || null,
    status: filters.status || null,
    unidadeId: filters.unidadeId || null,
    dataInicio: filters.dataInicio || null,
    dataFim: filters.dataFim || null,
    ano: filters.ano || null,
    cnpj: filters.cnpj || null
  };

  return {
    items: result.rows,
    meta
  };
}

async function syncEmpenhos(operacoes, user) {
  if (!Array.isArray(operacoes)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Lista de operações é obrigatória', [
      { path: 'operacoes', message: 'Lista de operações é obrigatória', code: 'custom' }
    ]);
  }

  const resultados = [];

  for (const op of operacoes) {
    try {
      let resultado;

      switch (op.tipo) {
        case 'criar':
          resultado = await empenhosRepository.createSyncIfMissing({
            ...op.dados,
            createdBy: user.id
          });
          break;
        case 'atualizar':
          resultado = await empenhosRepository.updateSync(op.id, op.dados || {});
          break;
        case 'excluir':
          resultado = await empenhosRepository.removeSync(op.id);
          break;
        default:
          resultado = { id: op.id, status: 'operacao_desconhecida' };
      }

      resultados.push({ ...op, resultado });
    } catch (opError) {
      resultados.push({ ...op, resultado: { status: 'erro', mensagem: opError.message } });
    }
  }

  return {
    sucesso: true,
    processados: resultados.length,
    resultados
  };
}

module.exports = {
  listEmpenhos,
  getEmpenhoById: baseEmpenhosService.getEmpenhoById,
  getEmpenhoBySlug: baseEmpenhosService.getEmpenhoBySlug,
  createEmpenho: baseEmpenhosService.createEmpenho,
  updateEmpenho: baseEmpenhosService.updateEmpenho,
  deleteEmpenho: baseEmpenhosService.deleteEmpenho,
  syncEmpenhos
};
