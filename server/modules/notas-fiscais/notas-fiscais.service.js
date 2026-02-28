const baseNotasService = require('../../src/services/notasFiscais.service');
const AppError = require('../../utils/appError');
const notasRepository = require('./notas-fiscais.repository');

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
  listNotas: baseNotasService.listNotas,
  getNotaById: baseNotasService.getNotaById,
  getItemsByNotaId: baseNotasService.getItemsByNotaId,
  getNotaByChave: baseNotasService.getNotaByChave,
  createNota: baseNotasService.createNota,
  updateNota,
  conferirNota,
  receberNota,
  deleteNota
};
