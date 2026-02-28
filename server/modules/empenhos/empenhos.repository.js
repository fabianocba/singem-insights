const db = require('../../config/database');
const baseEmpenhosRepository = require('../../src/repositories/empenhos.repository');

async function findBySlugOnlyId(slug) {
  return baseEmpenhosRepository.findBySlugOnlyId(slug);
}

async function create(data) {
  return baseEmpenhosRepository.create(data);
}

async function update(id, data) {
  return baseEmpenhosRepository.update(id, data);
}

async function remove(id) {
  return baseEmpenhosRepository.remove(id);
}

async function createSyncIfMissing(data) {
  const numero = String(data.numero).replace(/\D/g, '');
  const ano = data.ano || new Date().getFullYear();
  const slug = `${ano}-NE-${numero}`;

  const exists = await findBySlugOnlyId(slug);
  if (exists) {
    return { id: exists.id, status: 'existente' };
  }

  const novo = await create({
    numero,
    ano,
    slug,
    fornecedor: data.fornecedor,
    cnpj_fornecedor: (data.cnpjFornecedor || '').replace(/\D/g, ''),
    valor_total: Number.parseFloat(data.valorTotal) || 0,
    itens: JSON.stringify(data.itens || []),
    status_validacao: data.statusValidacao || 'rascunho',
    created_by: data.createdBy
  });

  return { id: novo.id, status: 'criado' };
}

async function updateSync(id, data) {
  const atualizado = await update(id, {
    fornecedor: data.fornecedor,
    valor_total: Number.parseFloat(data.valorTotal) || 0,
    itens: JSON.stringify(data.itens || [])
  });

  return { id, status: atualizado ? 'atualizado' : 'erro' };
}

async function removeSync(id) {
  await remove(id);
  return { id, status: 'excluido' };
}

module.exports = {
  findAll: baseEmpenhosRepository.findAll,
  findById: baseEmpenhosRepository.findById,
  findBySlug: baseEmpenhosRepository.findBySlug,
  findBySlugOnlyId,
  create,
  update,
  remove,
  createSyncIfMissing,
  updateSync,
  removeSync,
  query: db.query
};
