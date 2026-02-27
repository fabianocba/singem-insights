const AppError = require('../utils/appError');
const empenhosRepository = require('../repositories/empenhos.repository');
const { logVinculoCatmat } = require('../utils/catmatValidation');

function parseItens(input) {
  if (!input?.itens) {
    return [];
  }

  if (Array.isArray(input.itens)) {
    return input.itens;
  }

  try {
    return JSON.parse(input.itens);
  } catch {
    return [];
  }
}

function buildEmpenhoCreatePayload(data, user) {
  const numero = String(data.numero).replace(/\D/g, '');
  const ano = data.ano || new Date().getFullYear();
  const slug = `${ano}-NE-${numero}`;

  return {
    numero,
    ano,
    slug,
    data_empenho: data.dataEmpenho || data.data_empenho || null,
    fornecedor: data.fornecedor || null,
    cnpj_fornecedor: (data.cnpjFornecedor || data.cnpj_fornecedor || '').replace(/\D/g, ''),
    valor_total: Number.parseFloat(data.valorTotal || data.valor_total) || 0,
    natureza_despesa: data.naturezaDespesa || data.natureza_despesa || null,
    processo_suap: data.processoSuap || data.processo_suap || null,
    status_validacao: data.statusValidacao || data.status_validacao || 'rascunho',
    itens: JSON.stringify(data.itens || []),
    pdf_data: data.pdfData || data.pdf_data || null,
    created_by: user.id
  };
}

function buildEmpenhoUpdatePayload(data, user) {
  const updateData = {};

  if (data.fornecedor !== undefined) {
    updateData.fornecedor = data.fornecedor;
  }
  if (data.cnpjFornecedor !== undefined) {
    updateData.cnpj_fornecedor = data.cnpjFornecedor.replace(/\D/g, '');
  }
  if (data.valorTotal !== undefined) {
    updateData.valor_total = Number.parseFloat(data.valorTotal) || 0;
  }
  if (data.naturezaDespesa !== undefined) {
    updateData.natureza_despesa = data.naturezaDespesa;
  }
  if (data.processoSuap !== undefined) {
    updateData.processo_suap = data.processoSuap;
  }
  if (data.dataEmpenho !== undefined) {
    updateData.data_empenho = data.dataEmpenho;
  }
  if (data.itens !== undefined) {
    updateData.itens = JSON.stringify(data.itens);
  }
  if (data.pdfData !== undefined) {
    updateData.pdf_data = data.pdfData;
  }

  if (data.statusValidacao !== undefined) {
    updateData.status_validacao = data.statusValidacao;
    if (data.statusValidacao === 'validado') {
      updateData.validado_em = new Date().toISOString();
      updateData.validado_por = user.id;
    }
  }

  return updateData;
}

async function logCreateItemCatmat(itens, user, meta) {
  if (!Array.isArray(itens)) {
    return;
  }

  for (let index = 0; index < itens.length; index++) {
    const item = itens[index];
    const codigo = item.catmat_codigo || item.catmatCodigo || item.catmat_id || null;
    if (!codigo) {
      continue;
    }

    await logVinculoCatmat({
      entidade: 'EMPENHO_ITEM',
      entidadeId: Number(item.seq || index + 1),
      materialId: item.material_id || null,
      catmatId: Number(codigo) || null,
      oldCatmat: null,
      newCatmat: String(codigo),
      acao: 'vincular',
      dadosAnteriores: null,
      usuarioId: user.id,
      usuarioNome: user.nome,
      ipAddress: meta.ip
    });
  }
}

async function logUpdateItemCatmat(itensNovos, itensAntes, user, meta) {
  if (!Array.isArray(itensNovos)) {
    return;
  }

  for (let index = 0; index < itensNovos.length; index++) {
    const itemNovo = itensNovos[index];
    const itemAntigo = itensAntes[index] || {};
    const codigoNovo = itemNovo.catmat_codigo || itemNovo.catmatCodigo || itemNovo.catmat_id || '';
    const codigoAntigo = itemAntigo.catmat_codigo || itemAntigo.catmatCodigo || itemAntigo.catmat_id || '';

    if (String(codigoNovo || '') === String(codigoAntigo || '')) {
      continue;
    }

    await logVinculoCatmat({
      entidade: 'EMPENHO_ITEM',
      entidadeId: Number(itemNovo.seq || itemAntigo.seq || index + 1),
      materialId: itemNovo.material_id || itemAntigo.material_id || null,
      catmatId: Number(codigoNovo) || null,
      oldCatmat: codigoAntigo ? String(codigoAntigo) : null,
      newCatmat: codigoNovo ? String(codigoNovo) : null,
      acao: codigoAntigo && codigoNovo ? 'alterar' : codigoNovo ? 'vincular' : 'desvincular',
      dadosAnteriores: itemAntigo,
      usuarioId: user.id,
      usuarioNome: user.nome,
      ipAddress: meta.ip
    });
  }
}

async function listEmpenhos(filters) {
  const limite = Number.parseInt(filters.limite, 10) || 100;
  const offset = Number.parseInt(filters.offset, 10) || 0;
  const result = await empenhosRepository.findAll({ ...filters, limite, offset });

  return {
    sucesso: true,
    dados: result.rows,
    paginacao: {
      total: result.total,
      limite,
      offset,
      paginas: Math.ceil(result.total / limite)
    }
  };
}

async function getEmpenhoById(id) {
  const empenho = await empenhosRepository.findById(id);
  if (!empenho) {
    throw new AppError(404, 'NOT_FOUND', 'Empenho não encontrado');
  }

  return { sucesso: true, dados: empenho };
}

async function getEmpenhoBySlug(slug) {
  const empenho = await empenhosRepository.findBySlug(slug);
  if (!empenho) {
    throw new AppError(404, 'NOT_FOUND', 'Empenho não encontrado');
  }

  return { sucesso: true, dados: empenho };
}

async function createEmpenho(data, user, meta) {
  if (!data.numero) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Número do empenho é obrigatório');
  }

  const createPayload = buildEmpenhoCreatePayload(data, user);

  const exists = await empenhosRepository.findBySlugOnlyId(createPayload.slug);
  if (exists) {
    throw new AppError(409, 'CONFLICT', 'Empenho já existe', { id: exists.id });
  }

  const empenho = await empenhosRepository.create(createPayload);
  await logCreateItemCatmat(data.itens, user, meta);

  return {
    sucesso: true,
    mensagem: 'Empenho criado com sucesso',
    dados: empenho
  };
}

async function updateEmpenho(id, data, user, meta) {
  const current = await empenhosRepository.findById(id);
  if (!current) {
    throw new AppError(404, 'NOT_FOUND', 'Empenho não encontrado');
  }

  const itensAntes = parseItens(current);
  const updateData = buildEmpenhoUpdatePayload(data, user);

  const updated = await empenhosRepository.update(id, updateData);
  await logUpdateItemCatmat(data.itens, itensAntes, user, meta);

  return {
    sucesso: true,
    mensagem: 'Empenho atualizado com sucesso',
    dados: updated
  };
}

async function deleteEmpenho(id) {
  const current = await empenhosRepository.findById(id);
  if (!current) {
    throw new AppError(404, 'NOT_FOUND', 'Empenho não encontrado');
  }

  if (current.status_validacao === 'validado') {
    throw new AppError(403, 'FORBIDDEN', 'Não é possível excluir empenho validado');
  }

  await empenhosRepository.remove(id);
  return {
    sucesso: true,
    mensagem: 'Empenho excluído com sucesso'
  };
}

module.exports = {
  listEmpenhos,
  getEmpenhoById,
  getEmpenhoBySlug,
  createEmpenho,
  updateEmpenho,
  deleteEmpenho
};
