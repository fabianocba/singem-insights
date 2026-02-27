const db = require('../../config/database');

async function findAll(filters) {
  const { empenho_id, status, cnpj, data_inicio, data_fim, busca, limite, offset } = filters;

  let sql = 'SELECT * FROM notas_fiscais WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (empenho_id) {
    paramCount++;
    sql += ` AND empenho_id = $${paramCount}`;
    params.push(empenho_id);
  }
  if (status) {
    paramCount++;
    sql += ` AND status = $${paramCount}`;
    params.push(status);
  }
  if (cnpj) {
    paramCount++;
    sql += ` AND cnpj_fornecedor = $${paramCount}`;
    params.push(cnpj.replace(/\D/g, ''));
  }
  if (data_inicio) {
    paramCount++;
    sql += ` AND data_emissao >= $${paramCount}`;
    params.push(data_inicio);
  }
  if (data_fim) {
    paramCount++;
    sql += ` AND data_emissao <= $${paramCount}`;
    params.push(data_fim);
  }
  if (busca) {
    paramCount++;
    sql += ` AND (
      fornecedor ILIKE $${paramCount} OR
      numero ILIKE $${paramCount} OR
      chave_acesso ILIKE $${paramCount}
    )`;
    params.push(`%${busca}%`);
  }

  sql += ' ORDER BY data_emissao DESC, id DESC';

  paramCount++;
  sql += ` LIMIT $${paramCount}`;
  params.push(limite);

  paramCount++;
  sql += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await db.query(sql, params);

  let countSql = 'SELECT COUNT(*) as total FROM notas_fiscais WHERE 1=1';
  const countParams = [];
  let countIdx = 0;

  if (empenho_id) {
    countIdx++;
    countSql += ` AND empenho_id = $${countIdx}`;
    countParams.push(empenho_id);
  }
  if (status) {
    countIdx++;
    countSql += ` AND status = $${countIdx}`;
    countParams.push(status);
  }

  const countResult = await db.query(countSql, countParams);

  return {
    rows: result.rows,
    total: Number.parseInt(countResult.rows[0].total, 10)
  };
}

async function findById(id) {
  return db.findById('notas_fiscais', id);
}

async function findItemsByNotaId(id) {
  const result = await db.query('SELECT * FROM nota_fiscal_items WHERE nota_fiscal_id = $1 ORDER BY item_numero', [id]);
  return result.rows;
}

async function findByChave(chave) {
  const result = await db.query('SELECT * FROM notas_fiscais WHERE chave_acesso = $1', [chave.replace(/\D/g, '')]);
  return result.rows[0] || null;
}

async function findByChaveOnlyId(chave) {
  const result = await db.query('SELECT id FROM notas_fiscais WHERE chave_acesso = $1', [chave]);
  return result.rows[0] || null;
}

async function create(data) {
  return db.insert('notas_fiscais', data);
}

async function createItem(data) {
  return db.insert('nota_fiscal_items', data);
}

async function insertAudit(data) {
  return db.insert('audit_log', data);
}

module.exports = {
  findAll,
  findById,
  findItemsByNotaId,
  findByChave,
  findByChaveOnlyId,
  create,
  createItem,
  insertAudit
};
