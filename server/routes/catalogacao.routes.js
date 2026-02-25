/**
 * Rotas de Pedidos de Catalogação - SINGEM
 * Fluxo interno para solicitar novos itens no CATMAT
 */

const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Status válidos para transições
const STATUS_TRANSITIONS = {
  NAO_SOLICITADO: ['SOLICITADO', 'CANCELADO'],
  SOLICITADO: ['APROVADO', 'DEVOLVIDO', 'CANCELADO'],
  DEVOLVIDO: ['SOLICITADO', 'CANCELADO'],
  APROVADO: [], // Estado final
  CANCELADO: [] // Estado final
};

// ============================================================================
// GET /api/catalogacao-pedidos - Lista pedidos com filtros
// ============================================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, tipo, solicitante, q, limite = 50, offset = 0 } = req.query;

    let sql = `
      SELECT
        cp.*,
        u.nome as solicitante_nome,
        u.login as solicitante_login
      FROM catalogacao_pedidos cp
      LEFT JOIN usuarios u ON u.id = cp.created_by
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 0;

    // Filtro por status
    if (status) {
      paramIdx++;
      sql += ` AND cp.status = $${paramIdx}`;
      params.push(status.toUpperCase());
    }

    // Filtro por tipo
    if (tipo) {
      paramIdx++;
      sql += ` AND cp.tipo = $${paramIdx}`;
      params.push(tipo.toUpperCase());
    }

    // Filtro por solicitante
    if (solicitante) {
      paramIdx++;
      sql += ` AND cp.created_by = $${paramIdx}`;
      params.push(parseInt(solicitante));
    }

    // Busca por termo
    if (q && q.length >= 2) {
      paramIdx++;
      sql += ` AND (
        cp.termo_busca ILIKE $${paramIdx}
        OR cp.descricao_solicitada ILIKE $${paramIdx}
      )`;
      params.push(`%${q}%`);
    }

    // Conta total
    const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await db.query(countSql.split('ORDER BY')[0], params);
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Ordenação e paginação
    sql += ' ORDER BY cp.created_at DESC';

    paramIdx++;
    sql += ` LIMIT $${paramIdx}`;
    params.push(parseInt(limite));

    paramIdx++;
    sql += ` OFFSET $${paramIdx}`;
    params.push(parseInt(offset));

    const result = await db.query(sql, params);

    return res.json({
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
    console.error('[Catalogação] Erro ao listar:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// ============================================================================
// GET /api/catalogacao-pedidos/:id - Busca pedido por ID
// ============================================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT
        cp.*,
        u.nome as solicitante_nome,
        u.login as solicitante_login
      FROM catalogacao_pedidos cp
      LEFT JOIN usuarios u ON u.id = cp.created_by
      WHERE cp.id = $1
    `,
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Pedido não encontrado'
      });
    }

    return res.json({
      sucesso: true,
      dados: result.rows[0]
    });
  } catch (err) {
    console.error('[Catalogação] Erro ao buscar:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// ============================================================================
// POST /api/catalogacao-pedidos - Cria novo pedido
// ============================================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      tipo = 'CATMAT',
      termo_busca,
      descricao_solicitada,
      unidade_sugerida = 'UN',
      justificativa,
      observacoes
    } = req.body;

    // Validações
    if (!termo_busca || termo_busca.trim().length < 3) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Termo de busca deve ter pelo menos 3 caracteres'
      });
    }

    if (!descricao_solicitada || descricao_solicitada.trim().length < 10) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Descrição solicitada deve ter pelo menos 10 caracteres'
      });
    }

    const pedido = await db.insert('catalogacao_pedidos', {
      tipo: tipo.toUpperCase(),
      termo_busca: termo_busca.trim(),
      descricao_solicitada: descricao_solicitada.trim(),
      unidade_sugerida: unidade_sugerida.toUpperCase(),
      justificativa: justificativa?.trim() || null,
      observacoes: observacoes?.trim() || null,
      status: 'NAO_SOLICITADO',
      created_by: req.user?.id || null
    });

    // Busca link do Compras.gov.br
    const configResult = await db.query(`SELECT valor FROM configuracoes WHERE chave = 'catmat_link_pedido'`);
    const linkPedido = configResult.rows[0]?.valor
      ? JSON.parse(configResult.rows[0].valor)
      : 'https://www.gov.br/compras/pt-br/sistemas/sistema-de-catalogacao';

    return res.status(201).json({
      sucesso: true,
      dados: pedido,
      instrucoes: {
        mensagem: 'Pedido registrado com sucesso. Para solicitar oficialmente:',
        passos: [
          '1. Acesse o Portal de Compras Governamentais',
          '2. Vá em: Área de Trabalho → Materiais e Serviços → Catálogo → Pedido de Catalogação',
          '3. Preencha o formulário com as informações do pedido',
          '4. Após enviar, atualize o status neste sistema para "SOLICITADO"'
        ],
        link: linkPedido
      }
    });
  } catch (err) {
    console.error('[Catalogação] Erro ao criar:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// ============================================================================
// PATCH /api/catalogacao-pedidos/:id/status - Atualiza status do pedido
// ============================================================================
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacoes, link_externo, catmat_codigo_aprovado } = req.body;

    // Busca pedido atual
    const pedidoAtual = await db.findById('catalogacao_pedidos', parseInt(id));

    if (!pedidoAtual) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Pedido não encontrado'
      });
    }

    // Valida transição de status
    const statusNovo = status?.toUpperCase();
    const transicoesValidas = STATUS_TRANSITIONS[pedidoAtual.status] || [];

    if (!transicoesValidas.includes(statusNovo)) {
      return res.status(400).json({
        sucesso: false,
        erro: `Transição de status inválida: ${pedidoAtual.status} → ${statusNovo}`,
        transicoesPermitidas: transicoesValidas
      });
    }

    // Monta dados de atualização
    const dadosUpdate = {
      status: statusNovo,
      updated_by: req.user?.id || null
    };

    // Adiciona campos opcionais
    if (observacoes !== undefined) {
      dadosUpdate.observacoes = observacoes;
    }
    if (link_externo !== undefined) {
      dadosUpdate.link_externo = link_externo;
    }

    // Campos específicos por status
    switch (statusNovo) {
      case 'SOLICITADO':
        dadosUpdate.solicitado_em = new Date();
        break;
      case 'APROVADO':
        dadosUpdate.aprovado_em = new Date();
        if (catmat_codigo_aprovado) {
          dadosUpdate.catmat_codigo_aprovado = parseInt(catmat_codigo_aprovado);
        }
        break;
      case 'DEVOLVIDO':
        dadosUpdate.devolvido_em = new Date();
        break;
      case 'CANCELADO':
        dadosUpdate.cancelado_em = new Date();
        break;
    }

    const pedidoAtualizado = await db.update('catalogacao_pedidos', parseInt(id), dadosUpdate);

    return res.json({
      sucesso: true,
      dados: pedidoAtualizado,
      statusAnterior: pedidoAtual.status
    });
  } catch (err) {
    console.error('[Catalogação] Erro ao atualizar status:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// ============================================================================
// DELETE /api/catalogacao-pedidos/:id - Remove pedido (apenas NAO_SOLICITADO)
// ============================================================================
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await db.findById('catalogacao_pedidos', parseInt(id));

    if (!pedido) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Pedido não encontrado'
      });
    }

    if (pedido.status !== 'NAO_SOLICITADO') {
      return res.status(400).json({
        sucesso: false,
        erro: 'Apenas pedidos não solicitados podem ser excluídos'
      });
    }

    await db.remove('catalogacao_pedidos', parseInt(id));

    return res.json({
      sucesso: true,
      mensagem: 'Pedido excluído com sucesso'
    });
  } catch (err) {
    console.error('[Catalogação] Erro ao excluir:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// ============================================================================
// GET /api/catalogacao-pedidos/config/link - Retorna link do Compras.gov.br
// ============================================================================
router.get('/config/link', authenticate, async (req, res) => {
  try {
    const result = await db.query(`SELECT valor FROM configuracoes WHERE chave = 'catmat_link_pedido'`);

    const link = result.rows[0]?.valor
      ? JSON.parse(result.rows[0].valor)
      : 'https://www.gov.br/compras/pt-br/sistemas/sistema-de-catalogacao';

    return res.json({
      sucesso: true,
      link,
      instrucoes: {
        titulo: 'Como solicitar catalogação no Compras.gov.br',
        passos: [
          '1. Acesse o link abaixo e faça login com sua conta gov.br',
          '2. Navegue até: Área de Trabalho → Materiais e Serviços → Catálogo',
          '3. Clique em "Pedido de Catalogação"',
          '4. Preencha o formulário com a descrição detalhada do material',
          '5. Anexe documentação técnica se disponível',
          '6. Envie e anote o número do protocolo',
          '7. Retorne aqui e atualize o status do pedido para "SOLICITADO"'
        ]
      }
    });
  } catch (err) {
    return res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

module.exports = router;
