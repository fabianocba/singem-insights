/**
 * Rotas de Sincronização - SINGEM
 * Processa operações offline pendentes
 */

const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// POST /api/sync - Processa operações pendentes
// ============================================================================
router.post('/', authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { operacoes } = req.body;

    if (!Array.isArray(operacoes) || operacoes.length === 0) {
      return res.status(400).json({ erro: 'Array de operações é obrigatório' });
    }

    console.log(`[Sync] Processando ${operacoes.length} operações para usuário ${req.user.id}`);

    await client.query('BEGIN');

    const resultados = [];

    for (const op of operacoes) {
      const { op_id, tipo, entidade, entidade_id, dados } = op;

      // Verifica se operação já foi processada (idempotência)
      const jaProcessada = await client.query('SELECT id, status FROM sync_operations WHERE op_id = $1', [op_id]);

      if (jaProcessada.rows.length > 0) {
        resultados.push({
          op_id,
          status: 'duplicado',
          mensagem: 'Operação já processada anteriormente'
        });
        continue;
      }

      // Registra operação
      await client.query(
        `INSERT INTO sync_operations (op_id, usuario_id, tipo, entidade, entidade_id, dados, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pendente')`,
        [op_id, req.user.id, tipo, entidade, entidade_id, JSON.stringify(dados)]
      );

      try {
        let resultado;

        switch (entidade) {
          case 'empenhos':
            resultado = await processarEmpenho(client, tipo, entidade_id, dados, req.user);
            break;
          case 'notas_fiscais':
            resultado = await processarNotaFiscal(client, tipo, entidade_id, dados, req.user);
            break;
          case 'materials':
            resultado = await processarMaterial(client, tipo, entidade_id, dados);
            break;
          case 'stock_movements':
            resultado = await processarMovimento(client, tipo, entidade_id, dados, req.user);
            break;
          default:
            resultado = { erro: `Entidade não suportada: ${entidade}` };
        }

        // Atualiza status da operação
        await client.query(`UPDATE sync_operations SET status = 'processado', processed_at = NOW() WHERE op_id = $1`, [
          op_id
        ]);

        resultados.push({
          op_id,
          status: 'sucesso',
          resultado
        });
      } catch (err) {
        // Marca erro na operação
        await client.query(`UPDATE sync_operations SET status = 'erro', erro = $1 WHERE op_id = $2`, [
          err.message,
          op_id
        ]);

        resultados.push({
          op_id,
          status: 'erro',
          erro: err.message
        });
      }
    }

    await client.query('COMMIT');

    const sucesso = resultados.filter((r) => r.status === 'sucesso').length;
    const erros = resultados.filter((r) => r.status === 'erro').length;
    const duplicados = resultados.filter((r) => r.status === 'duplicado').length;

    console.log(`[Sync] Resultado: ${sucesso} ok, ${erros} erros, ${duplicados} duplicados`);

    return res.json({
      sucesso: true,
      resumo: { total: operacoes.length, sucesso, erros, duplicados },
      resultados
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Sync] Erro ao processar:', err);
    return res.status(500).json({ erro: 'Erro ao processar sincronização' });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/sync/pendentes - Lista operações pendentes/com erro
// ============================================================================
router.get('/pendentes', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sync_operations
       WHERE usuario_id = $1 AND status IN ('pendente', 'erro')
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ sucesso: true, dados: result.rows });
  } catch (err) {
    console.error('[Sync] Erro ao listar pendentes:', err);
    res.status(500).json({ erro: 'Erro ao listar operações pendentes' });
  }
});

// ============================================================================
// DELETE /api/sync/:opId - Remove operação específica
// ============================================================================
router.delete('/:opId', authenticate, async (req, res) => {
  try {
    const { opId } = req.params;

    await db.query('DELETE FROM sync_operations WHERE op_id = $1 AND usuario_id = $2', [opId, req.user.id]);

    res.json({ sucesso: true, mensagem: 'Operação removida' });
  } catch (err) {
    console.error('[Sync] Erro ao remover:', err);
    res.status(500).json({ erro: 'Erro ao remover operação' });
  }
});

// ============================================================================
// PROCESSADORES POR ENTIDADE
// ============================================================================

async function processarEmpenho(client, tipo, id, dados, user) {
  switch (tipo) {
    case 'criar': {
      const empData = {
        numero: dados.numero,
        ano: dados.ano,
        slug: dados.slug || `NE${dados.numero}/${dados.ano}`,
        data_empenho: dados.dataEmpenho || dados.data_empenho,
        fornecedor: dados.fornecedor,
        cnpj_fornecedor: dados.cnpjFornecedor?.replace(/\D/g, '') || dados.cnpj_fornecedor,
        valor_total: dados.valorTotal || dados.valor_total || 0,
        natureza_despesa: dados.naturezaDespesa || dados.natureza_despesa,
        processo_suap: dados.processoSuap || dados.processo_suap,
        status_validacao: dados.statusValidacao || dados.status_validacao || 'rascunho',
        observacoes: dados.observacoes,
        created_by: user.id
      };

      const result = await client.query(
        `INSERT INTO empenhos (numero, ano, slug, data_empenho, fornecedor, cnpj_fornecedor,
          valor_total, natureza_despesa, processo_suap, status_validacao, observacoes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (ano, numero) DO UPDATE SET
           fornecedor = EXCLUDED.fornecedor,
           cnpj_fornecedor = EXCLUDED.cnpj_fornecedor,
           valor_total = EXCLUDED.valor_total,
           updated_at = NOW()
         RETURNING *`,
        [
          empData.numero,
          empData.ano,
          empData.slug,
          empData.data_empenho,
          empData.fornecedor,
          empData.cnpj_fornecedor,
          empData.valor_total,
          empData.natureza_despesa,
          empData.processo_suap,
          empData.status_validacao,
          empData.observacoes,
          empData.created_by
        ]
      );
      return { id: result.rows[0].id, dados: result.rows[0] };
    }

    case 'atualizar': {
      const fields = [];
      const values = [];
      let idx = 0;

      const map = {
        numero: 'numero',
        dataEmpenho: 'data_empenho',
        data_empenho: 'data_empenho',
        fornecedor: 'fornecedor',
        cnpjFornecedor: 'cnpj_fornecedor',
        cnpj_fornecedor: 'cnpj_fornecedor',
        valorTotal: 'valor_total',
        valor_total: 'valor_total',
        naturezaDespesa: 'natureza_despesa',
        natureza_despesa: 'natureza_despesa',
        processoSuap: 'processo_suap',
        processo_suap: 'processo_suap',
        statusValidacao: 'status_validacao',
        status_validacao: 'status_validacao',
        observacoes: 'observacoes'
      };

      for (const [key, col] of Object.entries(map)) {
        if (dados[key] !== undefined) {
          idx++;
          let val = dados[key];
          if (col === 'cnpj_fornecedor' && val) {
            val = val.replace(/\D/g, '');
          }
          fields.push(`${col} = $${idx}`);
          values.push(val);
        }
      }

      if (fields.length === 0) {
        return { mensagem: 'Nenhum campo para atualizar' };
      }

      idx++;
      values.push(id);

      const result = await client.query(
        `UPDATE empenhos SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
        values
      );

      return { dados: result.rows[0] };
    }

    case 'excluir': {
      await client.query('DELETE FROM empenhos WHERE id = $1', [id]);
      return { mensagem: 'Empenho excluído' };
    }

    default:
      throw new Error(`Tipo de operação inválido: ${tipo}`);
  }
}

async function processarNotaFiscal(client, tipo, id, dados, user) {
  switch (tipo) {
    case 'criar': {
      const result = await client.query(
        `INSERT INTO notas_fiscais
         (empenho_id, numero, serie, chave_acesso, data_emissao, fornecedor,
          cnpj_fornecedor, valor_total, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendente', $9)
         RETURNING *`,
        [
          dados.empenho_id,
          dados.numero,
          dados.serie || '1',
          dados.chave_acesso,
          dados.data_emissao,
          dados.fornecedor,
          dados.cnpj_fornecedor?.replace(/\D/g, ''),
          dados.valor_total || 0,
          user.id
        ]
      );
      return { id: result.rows[0].id, dados: result.rows[0] };
    }

    case 'atualizar': {
      const result = await client.query(
        `UPDATE notas_fiscais SET
         empenho_id = COALESCE($1, empenho_id),
         status = COALESCE($2, status),
         observacoes = COALESCE($3, observacoes),
         updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [dados.empenho_id, dados.status, dados.observacoes, id]
      );
      return { dados: result.rows[0] };
    }

    case 'excluir': {
      await client.query('DELETE FROM notas_fiscais WHERE id = $1', [id]);
      return { mensagem: 'Nota fiscal excluída' };
    }

    default:
      throw new Error(`Tipo de operação inválido: ${tipo}`);
  }
}

async function processarMaterial(client, tipo, id, dados) {
  switch (tipo) {
    case 'criar': {
      const result = await client.query(
        `INSERT INTO materials (codigo, descricao, unidade, natureza_despesa, subelemento)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (codigo) DO UPDATE SET descricao = EXCLUDED.descricao
         RETURNING *`,
        [dados.codigo, dados.descricao, dados.unidade || 'UN', dados.natureza_despesa, dados.subelemento]
      );
      return { id: result.rows[0].id, dados: result.rows[0] };
    }

    case 'atualizar': {
      const result = await client.query(
        `UPDATE materials SET
         descricao = COALESCE($1, descricao),
         unidade = COALESCE($2, unidade),
         updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [dados.descricao, dados.unidade, id]
      );
      return { dados: result.rows[0] };
    }

    default:
      throw new Error(`Tipo de operação inválido: ${tipo}`);
  }
}

async function processarMovimento(client, tipo, id, dados, user) {
  if (tipo !== 'criar') {
    throw new Error('Movimentos de estoque só podem ser criados');
  }

  // Busca saldo atual
  const saldoResult = await client.query('SELECT quantidade FROM stock_balances WHERE material_id = $1', [
    dados.material_id
  ]);
  const saldoAnterior = parseFloat(saldoResult.rows[0]?.quantidade || 0);

  let saldoPosterior;
  if (dados.tipo === 'entrada') {
    saldoPosterior = saldoAnterior + parseFloat(dados.quantidade);
  } else if (dados.tipo === 'saida') {
    saldoPosterior = saldoAnterior - parseFloat(dados.quantidade);
    if (saldoPosterior < 0) {
      throw new Error('Saldo insuficiente');
    }
  } else {
    saldoPosterior = parseFloat(dados.quantidade);
  }

  const movResult = await client.query(
    `INSERT INTO stock_movements
     (material_id, tipo, quantidade, valor_unitario, documento, observacoes,
      saldo_anterior, saldo_posterior, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      dados.material_id,
      dados.tipo,
      dados.quantidade,
      dados.valor_unitario || 0,
      dados.documento,
      dados.observacoes,
      saldoAnterior,
      saldoPosterior,
      user.id
    ]
  );

  // Atualiza saldo
  await client.query(
    `INSERT INTO stock_balances (material_id, quantidade)
     VALUES ($1, $2)
     ON CONFLICT (material_id) DO UPDATE SET quantidade = $2, updated_at = NOW()`,
    [dados.material_id, saldoPosterior]
  );

  return { id: movResult.rows[0].id, dados: movResult.rows[0] };
}

module.exports = router;
