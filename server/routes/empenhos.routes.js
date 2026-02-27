/**
 * Rotas de Empenhos - SINGEM
 * CRUD completo com PostgreSQL
 */

const express = require('express');
const db = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { catmatObrigatorioMiddleware, logVinculoCatmat } = require('../src/utils/catmatValidation');

const router = express.Router();

// ============================================================================
// GET /api/empenhos - Lista todos os empenhos
// ============================================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { ano, status, cnpj, busca, limite = 100, offset = 0 } = req.query;

    let sql = 'SELECT * FROM empenhos WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Filtros
    if (ano) {
      paramCount++;
      sql += ` AND ano = $${paramCount}`;
      params.push(parseInt(ano));
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

    // Ordenação e paginação
    sql += ' ORDER BY ano DESC, numero DESC';

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(parseInt(limite));

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(sql, params);

    // Conta total para paginação
    let countSql = 'SELECT COUNT(*) as total FROM empenhos WHERE 1=1';
    const countParams = [];
    let countParamIdx = 0;

    if (ano) {
      countParamIdx++;
      countSql += ` AND ano = $${countParamIdx}`;
      countParams.push(parseInt(ano));
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
    console.error('[Empenhos] Erro ao listar:', err);
    res.status(500).json({ erro: 'Erro ao listar empenhos' });
  }
});

// ============================================================================
// GET /api/empenhos/:id - Busca empenho por ID
// ============================================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const empenho = await db.findById('empenhos', id);

    if (!empenho) {
      return res.status(404).json({ erro: 'Empenho não encontrado' });
    }

    res.json({ sucesso: true, dados: empenho });
  } catch (err) {
    console.error('[Empenhos] Erro ao buscar:', err);
    res.status(500).json({ erro: 'Erro ao buscar empenho' });
  }
});

// ============================================================================
// GET /api/empenhos/slug/:slug - Busca empenho por slug
// ============================================================================
router.get('/slug/:slug', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await db.query('SELECT * FROM empenhos WHERE slug = $1', [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Empenho não encontrado' });
    }

    res.json({ sucesso: true, dados: result.rows[0] });
  } catch (err) {
    console.error('[Empenhos] Erro ao buscar por slug:', err);
    res.status(500).json({ erro: 'Erro ao buscar empenho' });
  }
});

// ============================================================================
// POST /api/empenhos - Cria novo empenho
// ============================================================================
router.post('/', authenticate, catmatObrigatorioMiddleware('empenho_items'), async (req, res) => {
  try {
    const data = req.body;

    // Validações básicas
    if (!data.numero) {
      return res.status(400).json({ erro: 'Número do empenho é obrigatório' });
    }

    // Normaliza dados
    const numero = String(data.numero).replace(/\D/g, '');
    const ano = data.ano || new Date().getFullYear();
    const slug = `${ano}-NE-${numero}`;

    // Verifica duplicidade
    const existe = await db.query('SELECT id FROM empenhos WHERE slug = $1', [slug]);

    if (existe.rows.length > 0) {
      return res.status(409).json({ erro: 'Empenho já existe', id: existe.rows[0].id });
    }

    // Prepara dados para inserção
    const empenhoData = {
      numero,
      ano,
      slug,
      data_empenho: data.dataEmpenho || data.data_empenho || null,
      fornecedor: data.fornecedor || null,
      cnpj_fornecedor: (data.cnpjFornecedor || data.cnpj_fornecedor || '').replace(/\D/g, ''),
      valor_total: parseFloat(data.valorTotal || data.valor_total) || 0,
      natureza_despesa: data.naturezaDespesa || data.natureza_despesa || null,
      processo_suap: data.processoSuap || data.processo_suap || null,
      status_validacao: data.statusValidacao || data.status_validacao || 'rascunho',
      itens: JSON.stringify(data.itens || []),
      pdf_data: data.pdfData || data.pdf_data || null,
      created_by: req.user.id
    };

    const empenho = await db.insert('empenhos', empenhoData);

    if (Array.isArray(data.itens)) {
      for (let index = 0; index < data.itens.length; index++) {
        const item = data.itens[index];
        const codigo = item.catmat_codigo || item.catmatCodigo || item.catmat_id || null;
        if (!codigo) {
          continue;
        }
        await logVinculoCatmat({
          entidade: 'EMPENHO_ITEM',
          entidadeId: Number(item.seq || index + 1),
          materialId: item.material_id || null,
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

    res.status(201).json({
      sucesso: true,
      mensagem: 'Empenho criado com sucesso',
      dados: empenho
    });
  } catch (err) {
    console.error('[Empenhos] Erro ao criar:', err);
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Empenho já existe' });
    }
    res.status(500).json({ erro: 'Erro ao criar empenho' });
  }
});

// ============================================================================
// PUT /api/empenhos/:id - Atualiza empenho
// ============================================================================
router.put('/:id', authenticate, catmatObrigatorioMiddleware('empenho_items'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Verifica se existe
    const existe = await db.findById('empenhos', id);
    if (!existe) {
      return res.status(404).json({ erro: 'Empenho não encontrado' });
    }

    const itensAntes = (() => {
      if (!existe?.itens) {
        return [];
      }
      if (Array.isArray(existe.itens)) {
        return existe.itens;
      }
      try {
        return JSON.parse(existe.itens);
      } catch {
        return [];
      }
    })();

    // Prepara dados para atualização
    const updateData = {};

    if (data.fornecedor !== undefined) {
      updateData.fornecedor = data.fornecedor;
    }
    if (data.cnpjFornecedor !== undefined) {
      updateData.cnpj_fornecedor = data.cnpjFornecedor.replace(/\D/g, '');
    }
    if (data.valorTotal !== undefined) {
      updateData.valor_total = parseFloat(data.valorTotal) || 0;
    }
    if (data.naturezaDespesa !== undefined) {
      updateData.natureza_despesa = data.naturezaDespesa;
    }
    if (data.processoSuap !== undefined) {
      updateData.processo_suap = data.processoSuap;
    }
    if (data.dataEmpenho !== undefined) {
      updateData.data_empenho = data.dataEmpenho;
    }
    if (data.itens !== undefined) {
      updateData.itens = JSON.stringify(data.itens);
    }
    if (data.pdfData !== undefined) {
      updateData.pdf_data = data.pdfData;
    }

    // Atualiza status de validação
    if (data.statusValidacao !== undefined) {
      updateData.status_validacao = data.statusValidacao;
      if (data.statusValidacao === 'validado') {
        updateData.validado_em = new Date().toISOString();
        updateData.validado_por = req.user.id;
      }
    }

    const empenho = await db.update('empenhos', id, updateData);

    if (Array.isArray(data.itens)) {
      for (let index = 0; index < data.itens.length; index++) {
        const itemNovo = data.itens[index];
        const itemAntigo = itensAntes[index] || {};
        const codigoNovo = itemNovo.catmat_codigo || itemNovo.catmatCodigo || itemNovo.catmat_id || '';
        const codigoAntigo = itemAntigo.catmat_codigo || itemAntigo.catmatCodigo || itemAntigo.catmat_id || '';

        if (String(codigoNovo || '') === String(codigoAntigo || '')) {
          continue;
        }

        await logVinculoCatmat({
          entidade: 'EMPENHO_ITEM',
          entidadeId: Number(itemNovo.seq || itemAntigo.seq || index + 1),
          materialId: itemNovo.material_id || itemAntigo.material_id || null,
          catmatId: Number(codigoNovo) || null,
          oldCatmat: codigoAntigo ? String(codigoAntigo) : null,
          newCatmat: codigoNovo ? String(codigoNovo) : null,
          acao: codigoAntigo && codigoNovo ? 'alterar' : codigoNovo ? 'vincular' : 'desvincular',
          dadosAnteriores: itemAntigo,
          usuarioId: req.user.id,
          usuarioNome: req.user.nome,
          ipAddress: req.ip
        });
      }
    }

    res.json({
      sucesso: true,
      mensagem: 'Empenho atualizado com sucesso',
      dados: empenho
    });
  } catch (err) {
    console.error('[Empenhos] Erro ao atualizar:', err);
    res.status(500).json({ erro: 'Erro ao atualizar empenho' });
  }
});

// ============================================================================
// DELETE /api/empenhos/:id - Remove empenho
// ============================================================================
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se existe
    const existe = await db.findById('empenhos', id);
    if (!existe) {
      return res.status(404).json({ erro: 'Empenho não encontrado' });
    }

    // Verifica se está validado (não permite exclusão)
    if (existe.status_validacao === 'validado') {
      return res.status(403).json({ erro: 'Não é possível excluir empenho validado' });
    }

    await db.remove('empenhos', id);

    res.json({
      sucesso: true,
      mensagem: 'Empenho excluído com sucesso'
    });
  } catch (err) {
    console.error('[Empenhos] Erro ao excluir:', err);
    res.status(500).json({ erro: 'Erro ao excluir empenho' });
  }
});

// ============================================================================
// POST /api/empenhos/sync - Sincronização em lote (offline → online)
// ============================================================================
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { operacoes } = req.body;

    if (!Array.isArray(operacoes)) {
      return res.status(400).json({ erro: 'Lista de operações é obrigatória' });
    }

    const resultados = [];

    for (const op of operacoes) {
      try {
        let resultado;

        switch (op.tipo) {
          case 'criar':
            // Usa o endpoint de criação
            const numeroCreate = String(op.dados.numero).replace(/\D/g, '');
            const anoCreate = op.dados.ano || new Date().getFullYear();
            const slugCreate = `${anoCreate}-NE-${numeroCreate}`;

            const existeCreate = await db.query('SELECT id FROM empenhos WHERE slug = $1', [slugCreate]);

            if (existeCreate.rows.length > 0) {
              resultado = { id: existeCreate.rows[0].id, status: 'existente' };
            } else {
              const novo = await db.insert('empenhos', {
                numero: numeroCreate,
                ano: anoCreate,
                slug: slugCreate,
                fornecedor: op.dados.fornecedor,
                cnpj_fornecedor: (op.dados.cnpjFornecedor || '').replace(/\D/g, ''),
                valor_total: parseFloat(op.dados.valorTotal) || 0,
                itens: JSON.stringify(op.dados.itens || []),
                status_validacao: op.dados.statusValidacao || 'rascunho',
                created_by: req.user.id
              });
              resultado = { id: novo.id, status: 'criado' };
            }
            break;

          case 'atualizar':
            const atualizado = await db.update('empenhos', op.id, {
              fornecedor: op.dados.fornecedor,
              valor_total: parseFloat(op.dados.valorTotal) || 0,
              itens: JSON.stringify(op.dados.itens || [])
            });
            resultado = { id: op.id, status: atualizado ? 'atualizado' : 'erro' };
            break;

          case 'excluir':
            await db.remove('empenhos', op.id);
            resultado = { id: op.id, status: 'excluido' };
            break;

          default:
            resultado = { id: op.id, status: 'operacao_desconhecida' };
        }

        resultados.push({ ...op, resultado });
      } catch (opErr) {
        resultados.push({ ...op, resultado: { status: 'erro', mensagem: opErr.message } });
      }
    }

    res.json({
      sucesso: true,
      processados: resultados.length,
      resultados
    });
  } catch (err) {
    console.error('[Empenhos] Erro no sync:', err);
    res.status(500).json({ erro: 'Erro na sincronização' });
  }
});

module.exports = router;
