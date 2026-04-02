const db = require('../../../db');
const baseEmpenhosRepository = require('../../repositories/empenhos.repository');

const SORT_FIELD_MAP = {
  createdAt: 'created_at',
  numero: 'numero',
  ano: 'ano',
  fornecedor: 'fornecedor',
  dataEmpenho: 'data_empenho',
  status: 'status_validacao',
  statusValidacao: 'status_validacao',
  valorTotal: 'valor_total'
};

async function findAllPaginated(input) {
  const { page, limit, offset, sortField, sortDir, q, status, unidadeId, dataInicio, dataFim, ano, cnpj } = input;

  const sortColumn = SORT_FIELD_MAP[sortField] || 'created_at';
  const direction = String(sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let where = ' WHERE 1=1';
  const params = [];
  let index = 0;

  if (q) {
    index++;
    where += ` AND (fornecedor ILIKE $${index} OR numero::text ILIKE $${index} OR processo_suap ILIKE $${index})`;
    params.push(`%${q}%`);
  }

  if (status) {
    index++;
    where += ` AND status_validacao = $${index}`;
    params.push(status);
  }

  if (unidadeId) {
    index++;
    where += ` AND unidade_id = $${index}`;
    params.push(unidadeId);
  }

  if (dataInicio) {
    index++;
    where += ` AND data_empenho >= $${index}`;
    params.push(dataInicio);
  }

  if (dataFim) {
    index++;
    where += ` AND data_empenho <= $${index}`;
    params.push(dataFim);
  }

  if (ano) {
    index++;
    where += ` AND ano = $${index}`;
    params.push(ano);
  }

  if (cnpj) {
    index++;
    where += ` AND cnpj_fornecedor = $${index}`;
    params.push(String(cnpj).replace(/\D/g, ''));
  }

  const listSql = `
    SELECT *
    FROM empenhos
    ${where}
    ORDER BY ${sortColumn} ${direction}, id DESC
    LIMIT $${index + 1}
    OFFSET $${index + 2}
  `;
  const listParams = [...params, limit, offset];

  const countSql = `SELECT COUNT(*) AS total FROM empenhos ${where}`;

  const [rowsResult, countResult] = await Promise.all([db.query(listSql, listParams), db.query(countSql, params)]);

  return {
    rows: rowsResult.rows,
    total: Number.parseInt(countResult.rows[0].total, 10),
    page,
    limit
  };
}

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
  findAllPaginated,
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
