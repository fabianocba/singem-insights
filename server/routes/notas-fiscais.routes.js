/**
 * Rotas de Notas Fiscais - SINGEM
 * CRUD completo com PostgreSQL
 */

const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { catmatObrigatorioMiddleware, logVinculoCatmat } = require('../src/utils/catmatValidation');

const router = express.Router();

// ============================================================================
// GET /api/notas-fiscais - Lista todas as notas fiscais
// ============================================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { empenho_id, status, cnpj, data_inicio, data_fim, busca, limite = 100, offset = 0 } = req.query;

    let sql = 'SELECT * FROM notas_fiscais WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (empenho_id) {
      paramCount++;
      sql += ` AND empenho_id = $${paramCount}`;
      params.push(parseInt(empenho_id));
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
    params.push(parseInt(limite));

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(sql, params);

    // Conta total
    let countSql = 'SELECT COUNT(*) as total FROM notas_fiscais WHERE 1=1';
    const countParams = [];
    let countIdx = 0;

    if (empenho_id) {
      countIdx++;
      countSql += ` AND empenho_id = $${countIdx}`;
      countParams.push(parseInt(empenho_id));
    }
    if (status) {
      countIdx++;
      countSql += ` AND status = $${countIdx}`;
      countParams.push(status);
    }

    const countResult = await db.query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      sucesso: true,
      dados: result.rows,
      paginacao: {
        total,
        limite: parseInt(limite),
        offset: parseInt(offset),
        paginas: Math.ceil(total / parseInt(limite))
      }
    });
  } catch (err) {
    console.error('[NotasFiscais] Erro ao listar:', err);
    res.status(500).json({ erro: 'Erro ao listar notas fiscais' });
  }
});

// ============================================================================
// GET /api/notas-fiscais/:id - Busca nota fiscal por ID
// ============================================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const nf = await db.findById('notas_fiscais', id);

    if (!nf) {
      return res.status(404).json({ erro: 'Nota fiscal não encontrada' });
    }

    res.json({ sucesso: true, dados: nf });
  } catch (err) {
    console.error('[NotasFiscais] Erro ao buscar:', err);
    res.status(500).json({ erro: 'Erro ao buscar nota fiscal' });
  }
});

// ============================================================================
// GET /api/notas-fiscais/:id/items - Lista itens da nota fiscal
// ============================================================================
router.get('/:id/items', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const items = await db.query('SELECT * FROM nota_fiscal_items WHERE nota_fiscal_id = $1 ORDER BY item_numero', [
      id
    ]);

    res.json({ sucesso: true, dados: items.rows });
  } catch (err) {
    console.error('[NotasFiscais] Erro ao listar itens:', err);
    res.status(500).json({ erro: 'Erro ao listar itens' });
  }
});

// ============================================================================
// GET /api/notas-fiscais/chave/:chave - Busca por chave de acesso
// ============================================================================
router.get('/chave/:chave', authenticate, async (req, res) => {
  try {
    const { chave } = req.params;

    const result = await db.query('SELECT * FROM notas_fiscais WHERE chave_acesso = $1', [chave.replace(/\D/g, '')]);

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Nota fiscal não encontrada' });
    }

    res.json({ sucesso: true, dados: result.rows[0] });
  } catch (err) {
    console.error('[NotasFiscais] Erro ao buscar por chave:', err);
    res.status(500).json({ erro: 'Erro ao buscar nota fiscal' });
  }
});

// ============================================================================
// POST /api/notas-fiscais - Cria nova nota fiscal
// ============================================================================
router.post('/', authenticate, catmatObrigatorioMiddleware('nota_fiscal_items'), async (req, res) => {
  try {
    const data = req.body;

    // Verifica duplicidade por chave de acesso
    if (data.chave_acesso) {
      const existente = await db.query('SELECT id FROM notas_fiscais WHERE chave_acesso = $1', [data.chave_acesso]);
      if (existente.rows.length > 0) {
        return res.status(409).json({
          erro: 'Nota fiscal já cadastrada',
          id: existente.rows[0].id
        });
      }
    }

    const nfData = {
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
      created_by: req.user.id
    };

    const nf = await db.insert('notas_fiscais', nfData);

    // Insere itens se fornecidos
    if (data.itens && Array.isArray(data.itens)) {
      for (let i = 0; i < data.itens.length; i++) {
        const item = data.itens[i];
        const itemCriado = await db.insert('nota_fiscal_items', {
          nota_fiscal_id: nf.id,
          empenho_item_id: item.empenho_item_id || null,
          material_id: item.material_id || null,
          catmat_codigo: item.catmat_codigo || item.catmatCodigo || null,
          catmat_descricao: item.catmat_descricao || item.catmatDescricao || item.descricao || null,
          item_numero: i + 1,
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
        if (codigo) {
          await logVinculoCatmat({
            entidade: 'NF_ITEM',
            entidadeId: itemCriado.id,
            materialId: itemCriado.material_id || null,
            catmatId: Number(codigo) || null,
            oldCatmat: null,
            newCatmat: String(codigo),
            acao: 'vincular',
            dadosAnteriores: null,
            usuarioId: req.user.id,
            usuarioNome: req.user.nome,
            ipAddress: req.ip
          });
        }
      }
    }

    // Log de auditoria
    await db.insert('audit_log', {
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'criar',
      entidade: 'notas_fiscais',
      entidade_id: nf.id,
      dados_depois: JSON.stringify(nf)
    });

    res.status(201).json({ sucesso: true, dados: nf });
  } catch (err) {
    console.error('[NotasFiscais] Erro ao criar:', err);
    res.status(500).json({ erro: 'Erro ao criar nota fiscal' });
  }
});

// ============================================================================
// PUT /api/notas-fiscais/:id - Atualiza nota fiscal
// ============================================================================
router.put('/:id', authenticate, catmatObrigatorioMiddleware('nota_fiscal_items'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const nfAntes = await db.findById('notas_fiscais', id);
    if (!nfAntes) {
      return res.status(404).json({ erro: 'Nota fiscal não encontrada' });
    }

    const updateData = {};
    const fields = [
      'empenho_id',
      'numero',
      'serie',
      'data_emissao',
      'data_entrada',
      'fornecedor',
      'cnpj_fornecedor',
      'valor_total',
      'valor_icms',
      'valor_ipi',
      'valor_frete',
      'valor_desconto',
      'status',
      'observacoes'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updateData[field] = field === 'cnpj_fornecedor' ? data[field]?.replace(/\D/g, '') : data[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
    }

    const nf = await db.update('notas_fiscais', id, updateData);

    // Log de auditoria
    await db.insert('audit_log', {
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'atualizar',
      entidade: 'notas_fiscais',
      entidade_id: id,
      dados_antes: JSON.stringify(nfAntes),
      dados_depois: JSON.stringify(nf)
    });

    res.json({ sucesso: true, dados: nf });
  } catch (err) {
    console.error('[NotasFiscais] Erro ao atualizar:', err);
    res.status(500).json({ erro: 'Erro ao atualizar nota fiscal' });
  }
});

// ============================================================================
// PUT /api/notas-fiscais/:id/conferir - Marca como conferida
// ============================================================================
router.put('/:id/conferir', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const nf = await db.query(
      `UPDATE notas_fiscais
       SET status = 'conferida', conferida_por = $1, conferida_em = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    );

    if (nf.rows.length === 0) {
      return res.status(404).json({ erro: 'Nota fiscal não encontrada' });
    }

    res.json({ sucesso: true, dados: nf.rows[0] });
  } catch (err) {
    console.error('[NotasFiscais] Erro ao conferir:', err);
    res.status(500).json({ erro: 'Erro ao conferir nota fiscal' });
  }
});

// ============================================================================
// PUT /api/notas-fiscais/:id/receber - Marca como recebida + entrada estoque
// ============================================================================
router.put('/:id/receber', authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Atualiza NF
    const nfResult = await client.query(
      `UPDATE notas_fiscais
       SET status = 'recebida', recebida_por = $1, recebida_em = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    );

    if (nfResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Nota fiscal não encontrada' });
    }

    const nf = nfResult.rows[0];

    // Busca itens
    const itensResult = await client.query('SELECT * FROM nota_fiscal_items WHERE nota_fiscal_id = $1', [id]);

    // Cria movimentos de estoque para itens com material_id
    for (const item of itensResult.rows) {
      if (item.material_id) {
        // Busca saldo atual
        const saldoResult = await client.query('SELECT quantidade FROM stock_balances WHERE material_id = $1', [
          item.material_id
        ]);
        const saldoAnterior = saldoResult.rows[0]?.quantidade || 0;
        const saldoPosterior = parseFloat(saldoAnterior) + parseFloat(item.quantidade);

        // Cria movimento
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
            req.user.id
          ]
        );

        // Atualiza/cria saldo
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
    }

    await client.query('COMMIT');

    res.json({ sucesso: true, dados: nf });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[NotasFiscais] Erro ao receber:', err);
    res.status(500).json({ erro: 'Erro ao receber nota fiscal' });
  } finally {
    client.release();
  }
});

// ============================================================================
// DELETE /api/notas-fiscais/:id - Remove nota fiscal
// ============================================================================
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const nf = await db.findById('notas_fiscais', id);
    if (!nf) {
      return res.status(404).json({ erro: 'Nota fiscal não encontrada' });
    }

    if (nf.status === 'recebida') {
      return res.status(400).json({
        erro: 'Não é possível excluir nota fiscal já recebida'
      });
    }

    await db.remove('notas_fiscais', id);

    // Log
    await db.insert('audit_log', {
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'excluir',
      entidade: 'notas_fiscais',
      entidade_id: id,
      dados_antes: JSON.stringify(nf)
    });

    res.json({ sucesso: true, mensagem: 'Nota fiscal excluída' });
  } catch (err) {
    console.error('[NotasFiscais] Erro ao excluir:', err);
    res.status(500).json({ erro: 'Erro ao excluir nota fiscal' });
  }
});

module.exports = router;
