const baseNotasRepository = require('../../src/repositories/notasFiscais.repository');
const db = require('../../db');

const SORT_FIELD_MAP = {
  createdAt: 'created_at',
  numero: 'numero',
  fornecedor: 'fornecedor',
  dataEmissao: 'data_emissao',
  dataEntrada: 'data_entrada',
  situacao: 'status',
  status: 'status'
};

async function findAllPaginated(input) {
  const {
    page,
    limit,
    offset,
    sortField,
    sortDir,
    q,
    situacao,
    fornecedor,
    numero,
    chaveAcesso,
    dataInicio,
    dataFim,
    status,
    cnpj,
    empenho_id: empenhoId
  } = input;

  const sortColumn = SORT_FIELD_MAP[sortField] || 'created_at';
  const direction = String(sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let where = ' WHERE 1=1';
  const params = [];
  let index = 0;

  if (q) {
    index++;
    where += ` AND (fornecedor ILIKE $${index} OR numero::text ILIKE $${index} OR chave_acesso ILIKE $${index})`;
    params.push(`%${q}%`);
  }

  const statusFilter = situacao || status;
  if (statusFilter) {
    index++;
    where += ` AND status = $${index}`;
    params.push(statusFilter);
  }

  if (fornecedor) {
    index++;
    where += ` AND fornecedor ILIKE $${index}`;
    params.push(`%${fornecedor}%`);
  }

  if (numero) {
    index++;
    where += ` AND numero::text ILIKE $${index}`;
    params.push(`%${numero}%`);
  }

  if (chaveAcesso) {
    index++;
    where += ` AND chave_acesso = $${index}`;
    params.push(String(chaveAcesso).replace(/\D/g, ''));
  }

  if (dataInicio) {
    index++;
    where += ` AND data_emissao >= $${index}`;
    params.push(dataInicio);
  }

  if (dataFim) {
    index++;
    where += ` AND data_emissao <= $${index}`;
    params.push(dataFim);
  }

  if (cnpj) {
    index++;
    where += ` AND cnpj_fornecedor = $${index}`;
    params.push(String(cnpj).replace(/\D/g, ''));
  }

  if (empenhoId) {
    index++;
    where += ` AND empenho_id = $${index}`;
    params.push(empenhoId);
  }

  const listSql = `
    SELECT *
    FROM notas_fiscais
    ${where}
    ORDER BY ${sortColumn} ${direction}, id DESC
    LIMIT $${index + 1}
    OFFSET $${index + 2}
  `;
  const listParams = [...params, limit, offset];

  const countSql = `SELECT COUNT(*) AS total FROM notas_fiscais ${where}`;

  const [rowsResult, countResult] = await Promise.all([db.query(listSql, listParams), db.query(countSql, params)]);

  return {
    rows: rowsResult.rows,
    total: Number.parseInt(countResult.rows[0].total, 10),
    page,
    limit
  };
}

async function updateNota(id, updateData) {
  return db.update('notas_fiscais', id, updateData);
}

async function markConferida(id, userId) {
  const nf = await db.query(
    `UPDATE notas_fiscais
     SET status = 'conferida', conferida_por = $1, conferida_em = NOW(), updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [userId, id]
  );

  return nf.rows[0] || null;
}

async function markRecebidaAndEntradaEstoque(id, userId) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const nfResult = await client.query(
      `UPDATE notas_fiscais
       SET status = 'recebida', recebida_por = $1, recebida_em = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [userId, id]
    );

    if (nfResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const nf = nfResult.rows[0];

    const itensResult = await client.query('SELECT * FROM nota_fiscal_items WHERE nota_fiscal_id = $1', [id]);

    for (const item of itensResult.rows) {
      if (!item.material_id) {
        continue;
      }

      const saldoResult = await client.query('SELECT quantidade FROM stock_balances WHERE material_id = $1', [
        item.material_id
      ]);
      const saldoAnterior = saldoResult.rows[0]?.quantidade || 0;
      const saldoPosterior = Number.parseFloat(saldoAnterior) + Number.parseFloat(item.quantidade);

      await client.query(
        `INSERT INTO stock_movements
         (material_id, tipo, quantidade, valor_unitario, valor_total,
          nota_fiscal_id, nota_fiscal_item_id, documento, saldo_anterior, saldo_posterior, created_by)
         VALUES ($1, 'entrada', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          item.material_id,
          item.quantidade,
          item.valor_unitario,
          item.quantidade * item.valor_unitario,
          nf.id,
          item.id,
          `NF ${nf.numero}`,
          saldoAnterior,
          saldoPosterior,
          userId
        ]
      );

      await client.query(
        `INSERT INTO stock_balances (material_id, quantidade, ultima_entrada)
         VALUES ($1, $2, CURRENT_DATE)
         ON CONFLICT (material_id) DO UPDATE
         SET quantidade = stock_balances.quantidade + $2,
             ultima_entrada = CURRENT_DATE,
             updated_at = NOW()`,
        [item.material_id, item.quantidade]
      );
    }

    await client.query('COMMIT');
    return nf;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  findAllPaginated,
  findAll: baseNotasRepository.findAll,
  findById: baseNotasRepository.findById,
  findItemsByNotaId: baseNotasRepository.findItemsByNotaId,
  findByChave: baseNotasRepository.findByChave,
  findByChaveOnlyId: baseNotasRepository.findByChaveOnlyId,
  create: baseNotasRepository.create,
  createItem: baseNotasRepository.createItem,
  insertAudit: baseNotasRepository.insertAudit,
  updateNota,
  markConferida,
  markRecebidaAndEntradaEstoque,
  remove: db.remove
};
