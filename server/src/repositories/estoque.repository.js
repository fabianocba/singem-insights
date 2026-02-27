const db = require('../../config/database');

async function listSaldos(filters) {
  const { busca, limite, offset } = filters;

  let sql = `
    SELECT
      sb.*, m.codigo, m.descricao, m.unidade, m.natureza_despesa
    FROM stock_balances sb
    JOIN materials m ON m.id = sb.material_id
    WHERE m.ativo = true
  `;
  const params = [];
  let paramCount = 0;

  if (busca) {
    paramCount++;
    sql += ` AND (m.codigo ILIKE $${paramCount} OR m.descricao ILIKE $${paramCount})`;
    params.push(`%${busca}%`);
  }

  sql += ' ORDER BY m.descricao';

  paramCount++;
  sql += ` LIMIT $${paramCount}`;
  params.push(limite);

  paramCount++;
  sql += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await db.query(sql, params);
  return result.rows;
}

async function getSaldoByMaterial(materialId) {
  const result = await db.query(
    `SELECT sb.*, m.codigo, m.descricao, m.unidade
     FROM stock_balances sb
     JOIN materials m ON m.id = sb.material_id
     WHERE sb.material_id = $1`,
    [materialId]
  );

  return result.rows[0] || null;
}

async function listMovimentos(filters) {
  const { material_id, tipo, data_inicio, data_fim, limite, offset } = filters;

  let sql = `
    SELECT sm.*, m.codigo, m.descricao as material_descricao, u.nome as usuario_nome
    FROM stock_movements sm
    JOIN materials m ON m.id = sm.material_id
    LEFT JOIN usuarios u ON u.id = sm.created_by
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 0;

  if (material_id) {
    paramCount++;
    sql += ` AND sm.material_id = $${paramCount}`;
    params.push(material_id);
  }
  if (tipo) {
    paramCount++;
    sql += ` AND sm.tipo = $${paramCount}`;
    params.push(tipo);
  }
  if (data_inicio) {
    paramCount++;
    sql += ` AND sm.created_at >= $${paramCount}`;
    params.push(data_inicio);
  }
  if (data_fim) {
    paramCount++;
    sql += ` AND sm.created_at <= $${paramCount}`;
    params.push(`${data_fim} 23:59:59`);
  }

  sql += ' ORDER BY sm.created_at DESC, sm.id DESC';

  paramCount++;
  sql += ` LIMIT $${paramCount}`;
  params.push(limite);

  paramCount++;
  sql += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await db.query(sql, params);
  return result.rows;
}

async function createMovimento(data, userId) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const material = await client.query('SELECT id FROM materials WHERE id = $1', [data.material_id]);
    if (material.rows.length === 0) {
      throw Object.assign(new Error('Material não encontrado'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    const saldoResult = await client.query('SELECT quantidade FROM stock_balances WHERE material_id = $1', [
      data.material_id
    ]);
    const saldoAnterior = Number.parseFloat(saldoResult.rows[0]?.quantidade || 0);

    const quantidade = Number.parseFloat(data.quantidade);
    const valorUnitario = Number.parseFloat(data.valor_unitario || 0);

    let saldoPosterior = saldoAnterior;
    if (data.tipo === 'entrada') {
      saldoPosterior = saldoAnterior + quantidade;
    } else if (data.tipo === 'saida') {
      saldoPosterior = saldoAnterior - quantidade;
      if (saldoPosterior < 0) {
        throw Object.assign(new Error('Saldo insuficiente'), {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: { saldo_atual: saldoAnterior }
        });
      }
    } else {
      saldoPosterior = quantidade;
    }

    const moveResult = await client.query(
      `INSERT INTO stock_movements
       (material_id, tipo, quantidade, valor_unitario, valor_total,
        documento, observacoes, saldo_anterior, saldo_posterior, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.material_id,
        data.tipo,
        quantidade,
        valorUnitario,
        quantidade * valorUnitario,
        data.documento || `MOV-${Date.now()}`,
        data.observacoes,
        saldoAnterior,
        saldoPosterior,
        userId
      ]
    );

    const updateField = data.tipo === 'entrada' ? 'ultima_entrada' : data.tipo === 'saida' ? 'ultima_saida' : null;

    await client.query(
      `INSERT INTO stock_balances (material_id, quantidade, ${updateField || 'updated_at'})
       VALUES ($1, $2, ${updateField ? 'CURRENT_DATE' : 'NOW()'})
       ON CONFLICT (material_id) DO UPDATE
       SET quantidade = $2,
           ${updateField ? `${updateField} = CURRENT_DATE,` : ''}
           updated_at = NOW()`,
      [data.material_id, saldoPosterior]
    );

    await client.query('COMMIT');
    return moveResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function insertAudit(data) {
  return db.insert('audit_log', data);
}

module.exports = {
  listSaldos,
  getSaldoByMaterial,
  listMovimentos,
  createMovimento,
  insertAudit
};
