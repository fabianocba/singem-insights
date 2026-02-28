const baseNotasRepository = require('../../src/repositories/notasFiscais.repository');
const db = require('../../config/database');

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
  const client = await db.pool.connect();

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
