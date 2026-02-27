const AppError = require('../utils/appError');
const notasRepository = require('../repositories/notasFiscais.repository');
const { logVinculoCatmat } = require('../utils/catmatValidation');

async function ensureNotaNotExistsByChave(chaveAcesso) {
  if (!chaveAcesso) {
    return;
  }

  const existing = await notasRepository.findByChaveOnlyId(chaveAcesso);
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Nota fiscal já cadastrada', { id: existing.id });
  }
}

function buildNotaCreatePayload(data, user) {
  return {
    empenho_id: data.empenho_id || null,
    numero: data.numero,
    serie: data.serie || '1',
    chave_acesso: data.chave_acesso,
    data_emissao: data.data_emissao,
    data_entrada: data.data_entrada || new Date().toISOString().split('T')[0],
    fornecedor: data.fornecedor,
    cnpj_fornecedor: data.cnpj_fornecedor?.replace(/\D/g, ''),
    valor_total: data.valor_total || 0,
    valor_icms: data.valor_icms || 0,
    valor_ipi: data.valor_ipi || 0,
    valor_frete: data.valor_frete || 0,
    valor_desconto: data.valor_desconto || 0,
    status: 'pendente',
    xml_data: data.xml_data,
    observacoes: data.observacoes,
    created_by: user.id
  };
}

async function createNotaItens(itens, notaId, user, meta) {
  if (!Array.isArray(itens)) {
    return;
  }

  for (let index = 0; index < itens.length; index++) {
    const item = itens[index];
    const itemCreated = await notasRepository.createItem({
      nota_fiscal_id: notaId,
      empenho_item_id: item.empenho_item_id || null,
      material_id: item.material_id || null,
      catmat_codigo: item.catmat_codigo || item.catmatCodigo || null,
      catmat_descricao: item.catmat_descricao || item.catmatDescricao || item.descricao || null,
      item_numero: index + 1,
      codigo_produto: item.codigo_produto,
      descricao: item.descricao,
      ncm: item.ncm,
      cfop: item.cfop,
      unidade: item.unidade || 'UN',
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_icms: item.valor_icms || 0,
      valor_ipi: item.valor_ipi || 0
    });

    const codigo = item.catmat_codigo || item.catmatCodigo || item.catmat_id || null;
    if (!codigo) {
      continue;
    }

    await logVinculoCatmat({
      entidade: 'NF_ITEM',
      entidadeId: itemCreated.id,
      materialId: itemCreated.material_id || null,
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

async function createNotaAudit(nota, user) {
  await notasRepository.insertAudit({
    usuario_id: user.id,
    usuario_nome: user.nome,
    acao: 'criar',
    entidade: 'notas_fiscais',
    entidade_id: nota.id,
    dados_depois: JSON.stringify(nota)
  });
}

async function listNotas(filters) {
  const limite = Number.parseInt(filters.limite, 10) || 100;
  const offset = Number.parseInt(filters.offset, 10) || 0;
  const result = await notasRepository.findAll({ ...filters, limite, offset });

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

async function getNotaById(id) {
  const nota = await notasRepository.findById(id);
  if (!nota) {
    throw new AppError(404, 'NOT_FOUND', 'Nota fiscal não encontrada');
  }

  return { sucesso: true, dados: nota };
}

async function getItemsByNotaId(id) {
  const rows = await notasRepository.findItemsByNotaId(id);
  return { sucesso: true, dados: rows };
}

async function getNotaByChave(chave) {
  const nota = await notasRepository.findByChave(chave);
  if (!nota) {
    throw new AppError(404, 'NOT_FOUND', 'Nota fiscal não encontrada');
  }

  return { sucesso: true, dados: nota };
}

async function createNota(data, user, meta) {
  await ensureNotaNotExistsByChave(data.chave_acesso);

  const nota = await notasRepository.create(buildNotaCreatePayload(data, user));
  await createNotaItens(data.itens, nota.id, user, meta);
  await createNotaAudit(nota, user);

  return { sucesso: true, dados: nota };
}

module.exports = {
  listNotas,
  getNotaById,
  getItemsByNotaId,
  getNotaByChave,
  createNota
};
