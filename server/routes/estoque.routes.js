/**
 * Rotas de Estoque - SINGEM
 * Movimentações e Saldos
 */

const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// GET /api/estoque/saldos - Lista saldos de estoque
// ============================================================================
router.get('/saldos', authenticate, async (req, res) => {
  try {
    const { busca, limite = 100, offset = 0 } = req.query;

    let sql = `
      SELECT
        sb.*,
        m.codigo,
        m.descricao,
        m.unidade,
        m.natureza_despesa
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
    params.push(parseInt(limite));

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(sql, params);

    res.json({
      sucesso: true,
      dados: result.rows
    });
  } catch (err) {
    console.error('[Estoque] Erro ao listar saldos:', err);
    res.status(500).json({ erro: 'Erro ao listar saldos' });
  }
});

// ============================================================================
// GET /api/estoque/saldos/:materialId - Saldo de um material
// ============================================================================
router.get('/saldos/:materialId', authenticate, async (req, res) => {
  try {
    const { materialId } = req.params;

    const result = await db.query(
      `SELECT
        sb.*,
        m.codigo,
        m.descricao,
        m.unidade
       FROM stock_balances sb
       JOIN materials m ON m.id = sb.material_id
       WHERE sb.material_id = $1`,
      [materialId]
    );

    if (result.rows.length === 0) {
      return res.json({
        sucesso: true,
        dados: { material_id: materialId, quantidade: 0, valor_total: 0 }
      });
    }

    res.json({ sucesso: true, dados: result.rows[0] });
  } catch (err) {
    console.error('[Estoque] Erro ao buscar saldo:', err);
    res.status(500).json({ erro: 'Erro ao buscar saldo' });
  }
});

// ============================================================================
// GET /api/estoque/movimentos - Lista movimentações
// ============================================================================
router.get('/movimentos', authenticate, async (req, res) => {
  try {
    const { material_id, tipo, data_inicio, data_fim, limite = 100, offset = 0 } = req.query;

    let sql = `
      SELECT
        sm.*,
        m.codigo,
        m.descricao as material_descricao,
        u.nome as usuario_nome
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
      params.push(parseInt(material_id));
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
      params.push(data_fim + ' 23:59:59');
    }

    sql += ' ORDER BY sm.created_at DESC, sm.id DESC';

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(parseInt(limite));

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(sql, params);

    res.json({
      sucesso: true,
      dados: result.rows
    });
  } catch (err) {
    console.error('[Estoque] Erro ao listar movimentos:', err);
    res.status(500).json({ erro: 'Erro ao listar movimentos' });
  }
});

// ============================================================================
// POST /api/estoque/movimentos - Cria movimento manual
// ============================================================================
router.post('/movimentos', authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { material_id, tipo, quantidade, valor_unitario, documento, observacoes } = req.body;

    if (!material_id || !tipo || !quantidade) {
      return res.status(400).json({
        erro: 'material_id, tipo e quantidade são obrigatórios'
      });
    }

    if (!['entrada', 'saida', 'ajuste'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido' });
    }

    await client.query('BEGIN');

    // Verifica se material existe
    const material = await client.query('SELECT id FROM materials WHERE id = $1', [material_id]);

    if (material.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Material não encontrado' });
    }

    // Busca saldo atual
    const saldoResult = await client.query('SELECT quantidade FROM stock_balances WHERE material_id = $1', [
      material_id
    ]);
    const saldoAnterior = parseFloat(saldoResult.rows[0]?.quantidade || 0);

    // Calcula novo saldo
    let saldoPosterior;
    if (tipo === 'entrada') {
      saldoPosterior = saldoAnterior + parseFloat(quantidade);
    } else if (tipo === 'saida') {
      saldoPosterior = saldoAnterior - parseFloat(quantidade);
      if (saldoPosterior < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          erro: 'Saldo insuficiente',
          saldo_atual: saldoAnterior
        });
      }
    } else {
      // ajuste
      saldoPosterior = parseFloat(quantidade);
    }

    // Cria movimento
    const movResult = await client.query(
      `INSERT INTO stock_movements
       (material_id, tipo, quantidade, valor_unitario, valor_total,
        documento, observacoes, saldo_anterior, saldo_posterior, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        material_id,
        tipo,
        quantidade,
        valor_unitario || 0,
        quantidade * (valor_unitario || 0),
        documento || `MOV-${Date.now()}`,
        observacoes,
        saldoAnterior,
        saldoPosterior,
        req.user.id
      ]
    );

    // Atualiza saldo
    const updateField = tipo === 'entrada' ? 'ultima_entrada' : tipo === 'saida' ? 'ultima_saida' : null;

    await client.query(
      `INSERT INTO stock_balances (material_id, quantidade, ${updateField || 'updated_at'})
       VALUES ($1, $2, ${updateField ? 'CURRENT_DATE' : 'NOW()'})
       ON CONFLICT (material_id) DO UPDATE
       SET quantidade = $2,
           ${updateField ? `${updateField} = CURRENT_DATE,` : ''}
           updated_at = NOW()`,
      [material_id, saldoPosterior]
    );

    await client.query('COMMIT');

    // Log
    await db.insert('audit_log', {
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'criar',
      entidade: 'stock_movements',
      entidade_id: movResult.rows[0].id,
      dados_depois: JSON.stringify(movResult.rows[0])
    });

    res.status(201).json({ sucesso: true, dados: movResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Estoque] Erro ao criar movimento:', err);
    res.status(500).json({ erro: 'Erro ao criar movimento' });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/estoque/materiais - Lista materiais (catálogo)
// ============================================================================
router.get('/materiais', authenticate, async (req, res) => {
  try {
    const { busca, natureza, limite = 200, offset = 0 } = req.query;

    let sql = 'SELECT * FROM materials WHERE ativo = true';
    const params = [];
    let paramCount = 0;

    if (busca) {
      paramCount++;
      sql += ` AND (codigo ILIKE $${paramCount} OR descricao ILIKE $${paramCount})`;
      params.push(`%${busca}%`);
    }

    if (natureza) {
      paramCount++;
      sql += ` AND natureza_despesa = $${paramCount}`;
      params.push(natureza);
    }

    sql += ' ORDER BY descricao';

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(parseInt(limite));

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(sql, params);

    res.json({ sucesso: true, dados: result.rows });
  } catch (err) {
    console.error('[Estoque] Erro ao listar materiais:', err);
    res.status(500).json({ erro: 'Erro ao listar materiais' });
  }
});

// ============================================================================
// POST /api/estoque/materiais - Cria material
// ============================================================================
router.post('/materiais', authenticate, async (req, res) => {
  try {
    const { codigo, descricao, unidade, natureza_despesa, subelemento } = req.body;

    if (!descricao) {
      return res.status(400).json({ erro: 'Descrição é obrigatória' });
    }

    // Verifica duplicidade
    if (codigo) {
      const existente = await db.query('SELECT id FROM materials WHERE codigo = $1', [codigo]);
      if (existente.rows.length > 0) {
        return res.status(409).json({ erro: 'Código já cadastrado' });
      }
    }

    const material = await db.insert('materials', {
      codigo: codigo || null,
      descricao,
      unidade: unidade || 'UN',
      natureza_despesa: natureza_despesa || null,
      subelemento: subelemento || null
    });

    res.status(201).json({ sucesso: true, dados: material });
  } catch (err) {
    console.error('[Estoque] Erro ao criar material:', err);
    res.status(500).json({ erro: 'Erro ao criar material' });
  }
});

// ============================================================================
// PUT /api/estoque/materiais/:id - Atualiza material
// ============================================================================
router.put('/materiais/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, descricao, unidade, natureza_despesa, subelemento, ativo } = req.body;

    const updateData = {};
    if (codigo !== undefined) {
      updateData.codigo = codigo;
    }
    if (descricao !== undefined) {
      updateData.descricao = descricao;
    }
    if (unidade !== undefined) {
      updateData.unidade = unidade;
    }
    if (natureza_despesa !== undefined) {
      updateData.natureza_despesa = natureza_despesa;
    }
    if (subelemento !== undefined) {
      updateData.subelemento = subelemento;
    }
    if (ativo !== undefined) {
      updateData.ativo = ativo;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
    }

    const material = await db.update('materials', id, updateData);

    if (!material) {
      return res.status(404).json({ erro: 'Material não encontrado' });
    }

    res.json({ sucesso: true, dados: material });
  } catch (err) {
    console.error('[Estoque] Erro ao atualizar material:', err);
    res.status(500).json({ erro: 'Erro ao atualizar material' });
  }
});

module.exports = router;
