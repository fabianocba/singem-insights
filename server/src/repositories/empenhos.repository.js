const db = require('../../config/database');

async function findAll(filters) {
  const { ano, status, cnpj, busca, limite, offset } = filters;

  let sql = 'SELECT * FROM empenhos WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (ano) {
    paramCount++;
    sql += ` AND ano = $${paramCount}`;
    params.push(ano);
  }

  if (status) {
    paramCount++;
    sql += ` AND status_validacao = $${paramCount}`;
    params.push(status);
  }

  if (cnpj) {
    paramCount++;
    sql += ` AND cnpj_fornecedor = $${paramCount}`;
    params.push(cnpj.replace(/\D/g, ''));
  }

  if (busca) {
    paramCount++;
    sql += ` AND (
      fornecedor ILIKE $${paramCount} OR
      numero ILIKE $${paramCount} OR
      processo_suap ILIKE $${paramCount}
    )`;
    params.push(`%${busca}%`);
  }

  sql += ' ORDER BY ano DESC, numero DESC';

  paramCount++;
  sql += ` LIMIT $${paramCount}`;
  params.push(limite);

  paramCount++;
  sql += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await db.query(sql, params);

  let countSql = 'SELECT COUNT(*) as total FROM empenhos WHERE 1=1';
  const countParams = [];
  let countParamIdx = 0;

  if (ano) {
    countParamIdx++;
    countSql += ` AND ano = $${countParamIdx}`;
    countParams.push(ano);
  }
  if (status) {
    countParamIdx++;
    countSql += ` AND status_validacao = $${countParamIdx}`;
    countParams.push(status);
  }
  if (cnpj) {
    countParamIdx++;
    countSql += ` AND cnpj_fornecedor = $${countParamIdx}`;
    countParams.push(cnpj.replace(/\D/g, ''));
  }

  const countResult = await db.query(countSql, countParams);

  return {
    rows: result.rows,
    total: Number.parseInt(countResult.rows[0].total, 10)
  };
}

async function findById(id) {
  return db.findById('empenhos', id);
}

async function findBySlug(slug) {
  const result = await db.query('SELECT * FROM empenhos WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

async function findBySlugOnlyId(slug) {
  const result = await db.query('SELECT id FROM empenhos WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

async function create(data) {
  return db.insert('empenhos', data);
}

async function update(id, data) {
  return db.update('empenhos', id, data);
}

async function remove(id) {
  return db.remove('empenhos', id);
}

module.exports = {
  findAll,
  findById,
  findBySlug,
  findBySlugOnlyId,
  create,
  update,
  remove
};
