const baseNotasService = require('../../services/notasFiscais.service');
const AppError = require('../../../utils/appError');
const notasRepository = require('./notas-fiscais.repository');
const { parsePagination, buildMeta } = require('../../../utils/pagination');

async function listNotas(query) {
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
    ['createdAt', 'numero', 'fornecedor', 'dataEmissao', 'dataEntrada', 'situacao', 'status']
  );

  const filters = {
    ...pagination,
    q: query.q || query.busca,
    situacao: query.situacao,
    fornecedor: query.fornecedor,
    numero: query.numero,
    chaveAcesso: query.chaveAcesso,
    dataInicio: query.dataInicio || query.data_inicio,
    dataFim: query.dataFim || query.data_fim,
    status: query.status,
    cnpj: query.cnpj,
    empenho_id: query.empenho_id
  };

  const result = await notasRepository.findAllPaginated(filters);

  const meta = buildMeta({
    page: pagination.page,
    limit: pagination.limit,
    total: result.total,
    sort: pagination.sort
  });

  meta.filters = {
    q: filters.q || null,
    situacao: filters.situacao || null,
    fornecedor: filters.fornecedor || null,
    numero: filters.numero || null,
    chaveAcesso: filters.chaveAcesso || null,
    dataInicio: filters.dataInicio || null,
    dataFim: filters.dataFim || null,
    status: filters.status || null,
    cnpj: filters.cnpj || null,
    empenho_id: filters.empenho_id || null
  };

  return {
    items: result.rows,
    meta
  };
}

async function updateNota(id, data, user) {
  const nfAntes = await notasRepository.findById(id);
  if (!nfAntes) {
    throw new AppError(404, 'NOT_FOUND', 'Nota fiscal não encontrada');
  }

  const updateData = {};
  const fields = [
    'empenho_id',
    'numero',
    'serie',
    'data_emissao',
    'data_entrada',
    'fornecedor',
    'cnpj_fornecedor',
    'valor_total',
    'valor_icms',
    'valor_ipi',
    'valor_frete',
    'valor_desconto',
    'status',
    'observacoes'
  ];

  for (const field of fields) {
    if (data[field] !== undefined) {
      updateData[field] = field === 'cnpj_fornecedor' ? data[field]?.replace(/\D/g, '') : data[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nenhum campo para atualizar', [
      { path: 'body', message: 'Nenhum campo para atualizar', code: 'custom' }
    ]);
  }

  const nf = await notasRepository.updateNota(id, updateData);

  await notasRepository.insertAudit({
    usuario_id: user.id,
    usuario_nome: user.nome,
    acao: 'atualizar',
    entidade: 'notas_fiscais',
    entidade_id: id,
    dados_antes: JSON.stringify(nfAntes),
    dados_depois: JSON.stringify(nf)
  });

  return { sucesso: true, dados: nf };
}

async function conferirNota(id, user) {
  const nf = await notasRepository.markConferida(id, user.id);
  if (!nf) {
    throw new AppError(404, 'NOT_FOUND', 'Nota fiscal não encontrada');
  }

  return { sucesso: true, dados: nf };
}

async function receberNota(id, user) {
  const nf = await notasRepository.markRecebidaAndEntradaEstoque(id, user.id);
  if (!nf) {
    throw new AppError(404, 'NOT_FOUND', 'Nota fiscal não encontrada');
  }

  return { sucesso: true, dados: nf };
}

async function deleteNota(id, user) {
  const nf = await notasRepository.findById(id);
  if (!nf) {
    throw new AppError(404, 'NOT_FOUND', 'Nota fiscal não encontrada');
  }

  if (nf.status === 'recebida') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Não é possível excluir nota fiscal já recebida');
  }

  await notasRepository.remove('notas_fiscais', id);
  await notasRepository.insertAudit({
    usuario_id: user.id,
    usuario_nome: user.nome,
    acao: 'excluir',
    entidade: 'notas_fiscais',
    entidade_id: id,
    dados_antes: JSON.stringify(nf)
  });

  return { sucesso: true, mensagem: 'Nota fiscal excluída' };
}

module.exports = {
  listNotas,
  getNotaById: baseNotasService.getNotaById,
  getItemsByNotaId: baseNotasService.getItemsByNotaId,
  getNotaByChave: baseNotasService.getNotaByChave,
  createNota: baseNotasService.createNota,
  updateNota,
  conferirNota,
  receberNota,
  deleteNota
};
