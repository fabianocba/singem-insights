const db = require('../../../db');
const AppError = require('../../../utils/appError');

const ITEM_SORT_FIELDS = {
  createdAt: 'm.created_at',
  descricao: 'm.descricao',
  grupo: 'm.grupo',
  status: "COALESCE(m.status, CASE WHEN m.ativo THEN 'ativo' ELSE 'inativo' END)",
  saldo: 'COALESCE(sb.quantidade, 0)',
  catmat: 'm.catmat_codigo'
};

const NOTE_SORT_FIELDS = {
  createdAt: 'nf.created_at',
  numero: 'nf.numero',
  fornecedor: 'nf.fornecedor',
  dataEmissao: 'nf.data_emissao',
  dataEntrada: 'nf.data_entrada',
  valorTotal: 'nf.valor_total'
};

const MOVEMENT_SORT_FIELDS = {
  createdAt: 'sm.created_at',
  tipo: 'sm.tipo',
  quantidade: 'sm.quantidade'
};

const SOLICITACAO_SORT_FIELDS = {
  createdAt: 's.created_at',
  data: 's.data',
  prioridade: 's.prioridade',
  status: 's.status',
  setor: 's.setor'
};

const AUDIT_SORT_FIELDS = {
  createdAt: 'l.created_at',
  acao: 'l.acao',
  entidade: 'l.entidade_tipo'
};

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveSort(sortField, sortDir, allowedMap, fallback) {
  const column = allowedMap[sortField] || fallback;
  const direction = String(sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { column, direction };
}

async function findContaContabilById(id, executor = db) {
  const result = await executor.query('SELECT * FROM contas_contabeis WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findContaContabilByCodigo(codigo, executor = db) {
  const result = await executor.query('SELECT * FROM contas_contabeis WHERE codigo = $1', [codigo]);
  return result.rows[0] || null;
}

async function findGrupoById(id, executor = db) {
  const result = await executor.query('SELECT * FROM grupos_materiais WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findSubgrupoById(id, executor = db) {
  const result = await executor.query('SELECT * FROM subgrupos_materiais WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findLocalizacaoById(id, executor = db) {
  const result = await executor.query('SELECT * FROM localizacoes_estoque WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listMetaCatalogs() {
  const [contasContabeis, grupos, subgrupos, localizacoes, fornecedores] = await Promise.all([
    db.query('SELECT * FROM contas_contabeis ORDER BY codigo ASC'),
    db.query(
      `SELECT g.*, COUNT(m.id) AS total_itens
       FROM grupos_materiais g
       LEFT JOIN materials m ON m.grupo_id = g.id AND m.deleted_at IS NULL
       GROUP BY g.id
       ORDER BY g.nome ASC`
    ),
    db.query(
      `SELECT sg.*, COUNT(m.id) AS total_itens
       FROM subgrupos_materiais sg
       LEFT JOIN materials m ON m.subgrupo_id = sg.id AND m.deleted_at IS NULL
       GROUP BY sg.id
       ORDER BY sg.nome ASC`
    ),
    db.query(
      `SELECT l.*, COUNT(m.id) AS total_itens
       FROM localizacoes_estoque l
       LEFT JOIN materials m ON m.localizacao_id = l.id AND m.deleted_at IS NULL
       GROUP BY l.id
       ORDER BY l.nome ASC`
    ),
    db.query(
      `SELECT id, public_id, cnpj, razao_social, nome_fantasia, ativo
       FROM fornecedores_almoxarifado
       WHERE deleted_at IS NULL
       ORDER BY razao_social ASC
       LIMIT 200`
    )
  ]);

  return {
    contasContabeis: contasContabeis.rows,
    grupos: grupos.rows,
    subgrupos: subgrupos.rows,
    localizacoes: localizacoes.rows,
    fornecedores: fornecedores.rows
  };
}

async function listContasContabeis({ q, limit, offset }) {
  let where = ' WHERE 1=1';
  const params = [];
  let index = 0;

  if (q) {
    index += 1;
    where += ` AND (codigo ILIKE $${index} OR descricao ILIKE $${index})`;
    params.push(`%${q}%`);
  }

  const listSql = `
    SELECT *
    FROM contas_contabeis
    ${where}
    ORDER BY codigo ASC
    LIMIT $${index + 1}
    OFFSET $${index + 2}
  `;

  const [rowsResult, countResult] = await Promise.all([
    db.query(listSql, [...params, limit, offset]),
    db.query(`SELECT COUNT(*) AS total FROM contas_contabeis ${where}`, params)
  ]);

  return {
    rows: rowsResult.rows,
    total: Number.parseInt(countResult.rows[0].total, 10)
  };
}

async function createContaContabil(data, executor = db) {
  const result = await executor.query(
    `INSERT INTO contas_contabeis (codigo, descricao, categoria)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.codigo, data.descricao, data.categoria || null]
  );

  return result.rows[0];
}

function buildItemFilters(filters) {
  const clauses = ['1=1'];
  const params = [];

  const push = (sql, value) => {
    params.push(value);
    clauses.push(sql.replace('?', `$${params.length}`));
  };

  const search = filters.q || filters.busca;
  if (search) {
    const term = `%${search}%`;
    params.push(term, term, term, term);
    clauses.push(
      `(m.codigo_interno ILIKE $${params.length - 3} OR m.codigo ILIKE $${params.length - 2} OR m.descricao ILIKE $${params.length - 1} OR COALESCE(m.catmat_codigo, '') ILIKE $${params.length})`
    );
  }

  if (filters.grupo) {
    push('m.grupo = ?', filters.grupo);
  }

  if (filters.subgrupo) {
    push('m.subgrupo = ?', filters.subgrupo);
  }

  if (filters.status) {
    push("COALESCE(m.status, CASE WHEN m.ativo THEN 'ativo' ELSE 'inativo' END) = ?", filters.status);
  }

  if (filters.contaContabilId) {
    push('m.conta_contabil_id = ?', filters.contaContabilId);
  }

  if (filters.catmatCodigo) {
    push('m.catmat_codigo = ?', filters.catmatCodigo);
  }

  if (filters.somenteCriticos) {
    clauses.push(
      'COALESCE(sb.quantidade, 0) <= GREATEST(COALESCE(m.ponto_reposicao, 0), COALESCE(m.estoque_minimo, 0))'
    );
  }

  return {
    where: ` WHERE ${clauses.join(' AND ')}`,
    params
  };
}

async function findItemsPaginated(filters) {
  const { where, params } = buildItemFilters(filters);
  const { column, direction } = resolveSort(filters.sortField, filters.sortDir, ITEM_SORT_FIELDS, 'm.created_at');

  const listSql = `
    SELECT
      m.id,
      m.public_id,
      m.version,
      m.codigo,
      m.codigo_interno,
      m.descricao,
      m.descricao_resumida,
      m.catmat_codigo,
      m.catmat_descricao,
      m.unidade,
      m.grupo_id,
      m.grupo,
      gm.codigo AS grupo_codigo_dim,
      gm.nome AS grupo_nome_dim,
      m.subgrupo_id,
      m.subgrupo,
      sgm.codigo AS subgrupo_codigo_dim,
      sgm.nome AS subgrupo_nome_dim,
      m.localizacao_id,
      m.localizacao,
      le.nome AS localizacao_nome_dim,
      le.bloco AS localizacao_bloco,
      le.prateleira AS localizacao_prateleira,
      le.nivel AS localizacao_nivel,
      COALESCE(m.status, CASE WHEN m.ativo THEN 'ativo' ELSE 'inativo' END) AS status,
      m.estoque_minimo,
      m.estoque_maximo,
      m.ponto_reposicao,
      m.created_at,
      m.updated_at,
      m.conta_contabil_id,
      c.codigo AS conta_contabil_codigo,
      c.descricao AS conta_contabil_descricao,
      c.categoria AS conta_contabil_categoria,
      COALESCE(sb.quantidade, 0) AS saldo_quantidade,
      COALESCE(sb.valor_medio, 0) AS valor_medio,
      COALESCE(sb.valor_total, 0) AS valor_total,
      imgs.imagens
    FROM materials m
    LEFT JOIN contas_contabeis c ON c.id = m.conta_contabil_id
    LEFT JOIN grupos_materiais gm ON gm.id = m.grupo_id
    LEFT JOIN subgrupos_materiais sgm ON sgm.id = m.subgrupo_id
    LEFT JOIN localizacoes_estoque le ON le.id = m.localizacao_id
    LEFT JOIN stock_balances sb ON sb.material_id = m.id
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        json_agg(
          json_build_object('id', ii.id, 'url', ii.url, 'tipo', ii.tipo, 'created_at', ii.created_at)
          ORDER BY ii.id
        ),
        '[]'::json
      ) AS imagens
      FROM item_imagens ii
      WHERE ii.item_id = m.id
    ) imgs ON TRUE
    ${where}
    ORDER BY ${column} ${direction}, m.id DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const [rowsResult, countResult] = await Promise.all([
    db.query(listSql, [...params, filters.limit, filters.offset]),
    db.query(
      `SELECT COUNT(*) AS total FROM materials m LEFT JOIN stock_balances sb ON sb.material_id = m.id ${where}`,
      params
    )
  ]);

  return {
    rows: rowsResult.rows,
    total: Number.parseInt(countResult.rows[0].total, 10)
  };
}

async function findItemById(id, executor = db) {
  const result = await executor.query(
    `SELECT
      m.id,
      m.public_id,
      m.version,
      m.codigo,
      m.codigo_interno,
      m.descricao,
      m.descricao_resumida,
      m.catmat_codigo,
      m.catmat_descricao,
      m.unidade,
      m.grupo_id,
      m.grupo,
      gm.codigo AS grupo_codigo_dim,
      gm.nome AS grupo_nome_dim,
      m.subgrupo_id,
      m.subgrupo,
      sgm.codigo AS subgrupo_codigo_dim,
      sgm.nome AS subgrupo_nome_dim,
      m.localizacao_id,
      m.localizacao,
      le.nome AS localizacao_nome_dim,
      le.bloco AS localizacao_bloco,
      le.prateleira AS localizacao_prateleira,
      le.nivel AS localizacao_nivel,
      COALESCE(m.status, CASE WHEN m.ativo THEN 'ativo' ELSE 'inativo' END) AS status,
      m.estoque_minimo,
      m.estoque_maximo,
      m.ponto_reposicao,
      m.created_at,
      m.updated_at,
      m.conta_contabil_id,
      c.codigo AS conta_contabil_codigo,
      c.descricao AS conta_contabil_descricao,
      c.categoria AS conta_contabil_categoria,
      COALESCE(sb.quantidade, 0) AS saldo_quantidade,
      COALESCE(sb.valor_medio, 0) AS valor_medio,
      COALESCE(sb.valor_total, 0) AS valor_total,
      imgs.imagens
    FROM materials m
    LEFT JOIN contas_contabeis c ON c.id = m.conta_contabil_id
    LEFT JOIN grupos_materiais gm ON gm.id = m.grupo_id
    LEFT JOIN subgrupos_materiais sgm ON sgm.id = m.subgrupo_id
    LEFT JOIN localizacoes_estoque le ON le.id = m.localizacao_id
    LEFT JOIN stock_balances sb ON sb.material_id = m.id
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        json_agg(
          json_build_object('id', ii.id, 'url', ii.url, 'tipo', ii.tipo, 'created_at', ii.created_at)
          ORDER BY ii.id
        ),
        '[]'::json
      ) AS imagens
      FROM item_imagens ii
      WHERE ii.item_id = m.id
    ) imgs ON TRUE
    WHERE m.id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

async function findSimilarItems(description, excludeId = null, limit = 5) {
  const params = [description];
  let where = 'WHERE m.descricao IS NOT NULL';

  if (excludeId) {
    params.push(excludeId);
    where += ` AND m.id <> $${params.length}`;
  }

  params.push(limit);

  const result = await db.query(
    `SELECT
      m.id,
      COALESCE(m.codigo_interno, m.codigo) AS codigo_interno,
      m.descricao,
      similarity(lower(m.descricao), lower($1)) AS similaridade
    FROM materials m
    ${where}
      AND similarity(lower(m.descricao), lower($1)) >= 0.45
    ORDER BY similaridade DESC, m.descricao ASC
    LIMIT $${params.length}`,
    params
  );

  return result.rows;
}

async function createItem(data, executor = db) {
  const result = await executor.query(
    `INSERT INTO materials (
      codigo,
      codigo_interno,
      descricao,
      descricao_resumida,
      catmat_codigo,
      catmat_descricao,
      unidade,
      grupo_id,
      grupo,
      subgrupo_id,
      subgrupo,
      conta_contabil_id,
      estoque_minimo,
      estoque_maximo,
      ponto_reposicao,
      localizacao_id,
      localizacao,
      status,
      ativo
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    ) RETURNING *`,
    [
      data.codigo_interno || null,
      data.codigo_interno || null,
      data.descricao,
      data.descricao_resumida || null,
      data.catmat_codigo,
      data.catmat_descricao,
      data.unidade || 'UN',
      data.grupo_id || null,
      data.grupo || null,
      data.subgrupo_id || null,
      data.subgrupo || null,
      data.conta_contabil_id,
      toNumber(data.estoque_minimo),
      toNumber(data.estoque_maximo),
      toNumber(data.ponto_reposicao),
      data.localizacao_id || null,
      data.localizacao || null,
      data.status || 'ativo',
      (data.status || 'ativo') !== 'inativo'
    ]
  );

  await executor.query(
    `INSERT INTO stock_balances (material_id, quantidade, valor_medio, valor_total)
     VALUES ($1, 0, 0, 0)
     ON CONFLICT (material_id) DO NOTHING`,
    [result.rows[0].id]
  );

  return result.rows[0];
}

// eslint-disable-next-line complexity -- atualizacao parcial com varios campos opcionais do dominio
async function updateItem(id, data, executor = db) {
  const fields = [];
  const values = [];

  const assign = (column, value) => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  if (data.codigo_interno !== undefined) {
    assign('codigo', data.codigo_interno || null);
    assign('codigo_interno', data.codigo_interno || null);
  }
  if (data.descricao !== undefined) {
    assign('descricao', data.descricao);
  }
  if (data.descricao_resumida !== undefined) {
    assign('descricao_resumida', data.descricao_resumida || null);
  }
  if (data.catmat_codigo !== undefined) {
    assign('catmat_codigo', data.catmat_codigo || null);
  }
  if (data.catmat_descricao !== undefined) {
    assign('catmat_descricao', data.catmat_descricao || null);
  }
  if (data.unidade !== undefined) {
    assign('unidade', data.unidade || 'UN');
  }
  if (data.grupo_id !== undefined) {
    assign('grupo_id', data.grupo_id || null);
  }
  if (data.grupo !== undefined) {
    assign('grupo', data.grupo || null);
  }
  if (data.subgrupo_id !== undefined) {
    assign('subgrupo_id', data.subgrupo_id || null);
  }
  if (data.subgrupo !== undefined) {
    assign('subgrupo', data.subgrupo || null);
  }
  if (data.conta_contabil_id !== undefined) {
    assign('conta_contabil_id', data.conta_contabil_id || null);
  }
  if (data.estoque_minimo !== undefined) {
    assign('estoque_minimo', toNumber(data.estoque_minimo));
  }
  if (data.estoque_maximo !== undefined) {
    assign('estoque_maximo', toNumber(data.estoque_maximo));
  }
  if (data.ponto_reposicao !== undefined) {
    assign('ponto_reposicao', toNumber(data.ponto_reposicao));
  }
  if (data.localizacao_id !== undefined) {
    assign('localizacao_id', data.localizacao_id || null);
  }
  if (data.localizacao !== undefined) {
    assign('localizacao', data.localizacao || null);
  }
  if (data.status !== undefined) {
    assign('status', data.status || 'ativo');
    assign('ativo', (data.status || 'ativo') !== 'inativo');
  }

  if (fields.length === 0) {
    return findItemById(id, executor);
  }

  values.push(id);
  const result = await executor.query(
    `UPDATE materials
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

async function replaceItemImages(itemId, imagens = [], executor = db) {
  await executor.query('DELETE FROM item_imagens WHERE item_id = $1', [itemId]);

  for (const image of imagens) {
    await executor.query(
      `INSERT INTO item_imagens (item_id, url, tipo)
       VALUES ($1, $2, $3)`,
      [itemId, image.url, image.tipo || 'principal']
    );
  }
}

async function getBalanceState(client, materialId) {
  const result = await client.query(
    `SELECT quantidade, valor_total, valor_medio
     FROM stock_balances
     WHERE material_id = $1
     FOR UPDATE`,
    [materialId]
  );

  if (result.rows.length === 0) {
    return {
      quantidade: 0,
      valor_total: 0,
      valor_medio: 0
    };
  }

  return {
    quantidade: toNumber(result.rows[0].quantidade),
    valor_total: toNumber(result.rows[0].valor_total),
    valor_medio: toNumber(result.rows[0].valor_medio)
  };
}

async function upsertBalance(client, materialId, nextState, tipo) {
  const lastEntrada = ['entrada', 'devolucao'].includes(tipo) ? 'CURRENT_DATE' : 'stock_balances.ultima_entrada';
  const lastSaida = tipo === 'saida' ? 'CURRENT_DATE' : 'stock_balances.ultima_saida';

  await client.query(
    `INSERT INTO stock_balances (material_id, quantidade, valor_medio, valor_total, ultima_entrada, ultima_saida)
     VALUES ($1, $2, $3, $4, ${['entrada', 'devolucao'].includes(tipo) ? 'CURRENT_DATE' : 'NULL'}, ${tipo === 'saida' ? 'CURRENT_DATE' : 'NULL'})
     ON CONFLICT (material_id) DO UPDATE
     SET quantidade = $2,
         valor_medio = $3,
         valor_total = $4,
         ultima_entrada = ${lastEntrada},
         ultima_saida = ${lastSaida},
         updated_at = NOW()`,
    [materialId, nextState.quantidade, nextState.valor_medio, nextState.valor_total]
  );
}

// eslint-disable-next-line complexity -- consolidacao de regras de negocio por tipo de movimentacao
async function applyStockMovement(client, payload) {
  const current = await getBalanceState(client, payload.materialId);

  const quantidade = toNumber(payload.quantidade);
  const valorUnitarioEntrada = toNumber(payload.valorUnitario, current.valor_medio);
  const valorMedioAtual = current.quantidade > 0 ? current.valor_total / current.quantidade : current.valor_medio;

  let saldoPosterior = current.quantidade;
  let valorTotalPosterior = current.valor_total;
  let valorTotalMovimento = quantidade * valorUnitarioEntrada;

  switch (payload.tipo) {
    case 'entrada':
    case 'devolucao':
      saldoPosterior += quantidade;
      valorTotalPosterior += valorTotalMovimento;
      break;
    case 'saida':
      saldoPosterior -= quantidade;
      valorTotalMovimento = quantidade * valorMedioAtual;
      valorTotalPosterior -= valorTotalMovimento;
      break;
    case 'ajuste':
      saldoPosterior += quantidade;
      valorTotalMovimento = quantidade >= 0 ? quantidade * valorUnitarioEntrada : quantidade * valorMedioAtual;
      valorTotalPosterior += valorTotalMovimento;
      break;
    case 'transferencia':
      if (!payload.localizacaoDestino) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Informe a localização de destino para a transferência');
      }
      if (current.quantidade < quantidade && !payload.allowNegative) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Saldo insuficiente para transferência', [
          { path: 'quantidade', message: 'Saldo insuficiente para transferência', code: 'custom' }
        ]);
      }
      saldoPosterior = current.quantidade;
      valorTotalMovimento = quantidade * valorMedioAtual;
      valorTotalPosterior = current.valor_total;
      break;
    default:
      throw new AppError(400, 'VALIDATION_ERROR', 'Tipo de movimentação inválido');
  }

  if (saldoPosterior < 0 && !payload.allowNegative) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Saldo insuficiente para movimentação', [
      { path: 'quantidade', message: 'Saldo insuficiente para movimentação', code: 'custom' }
    ]);
  }

  valorTotalPosterior = Math.max(0, valorTotalPosterior);

  const nextState = {
    quantidade: saldoPosterior,
    valor_total: valorTotalPosterior,
    valor_medio: saldoPosterior > 0 ? valorTotalPosterior / saldoPosterior : 0
  };

  const movementResult = await client.query(
    `INSERT INTO stock_movements (
      material_id,
      tipo,
      quantidade,
      valor_unitario,
      valor_total,
      nota_fiscal_id,
      nota_fiscal_item_id,
      documento,
      observacoes,
      saldo_anterior,
      saldo_posterior,
      origem,
      justificativa,
      solicitacao_id,
      localizacao_destino,
      created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    ) RETURNING *`,
    [
      payload.materialId,
      payload.tipo,
      quantidade,
      payload.tipo === 'saida' || payload.tipo === 'transferencia' ? valorMedioAtual : valorUnitarioEntrada,
      Math.abs(valorTotalMovimento),
      payload.notaFiscalId || null,
      payload.notaFiscalItemId || null,
      payload.documento || null,
      payload.observacoes || null,
      current.quantidade,
      nextState.quantidade,
      payload.origem || 'manual',
      payload.justificativa || null,
      payload.solicitacaoId || null,
      payload.localizacaoDestino || null,
      payload.userId
    ]
  );

  await upsertBalance(client, payload.materialId, nextState, payload.tipo);

  if (payload.tipo === 'transferencia' && payload.localizacaoDestino) {
    await client.query('UPDATE materials SET localizacao = $1, updated_at = NOW() WHERE id = $2', [
      payload.localizacaoDestino,
      payload.materialId
    ]);
  }

  return movementResult.rows[0];
}

// eslint-disable-next-line complexity -- transacao unica de nota fiscal com itens e movimentacoes
async function createNotaEntrada(data, userId, executor = null) {
  const usesExternalExecutor = Boolean(executor);
  const client = executor || (await db.getClient());
  const itensRegistrados = [];

  try {
    if (!usesExternalExecutor) {
      await client.query('BEGIN');
    }

    const notaResult = await client.query(
      `INSERT INTO notas_fiscais (
        empenho_id,
        numero,
        serie,
        chave_acesso,
        data_emissao,
        data_entrada,
        fornecedor,
        fornecedor_id,
        cnpj_fornecedor,
        valor_total,
        status,
        xml_data,
        pdf_data,
        observacoes,
        created_by,
        recebida_por,
        recebida_em,
        tipo
      ) VALUES (
        $1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8, $9, $10, 'recebida', $11, $12, $13, $14, $14, NOW(), $15
      ) RETURNING *`,
      [
        data.empenho_id || null,
        data.numero,
        data.serie || null,
        data.chave_acesso || null,
        data.data_emissao,
        data.data_entrada || null,
        data.fornecedor,
        data.fornecedor_id || null,
        data.cnpj_fornecedor || null,
        toNumber(data.valor_total),
        data.xml_data || null,
        data.pdf_data || null,
        data.observacoes || null,
        userId,
        data.tipo || 'entrada'
      ]
    );

    const nota = notaResult.rows[0];

    for (let position = 0; position < data.itens.length; position += 1) {
      const item = data.itens[position];
      const itemResult = await client.query(
        `INSERT INTO nota_fiscal_items (
          nota_fiscal_id,
          material_id,
          item_numero,
          descricao,
          unidade,
          quantidade,
          valor_unitario,
          conta_contabil_id,
          catmat_codigo,
          catmat_descricao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          nota.id,
          item.material_id,
          item.item_numero || position + 1,
          item.descricao_nf,
          item.unidade || 'UN',
          toNumber(item.quantidade),
          toNumber(item.valor_unitario),
          item.conta_contabil_id || null,
          item.catmat_codigo || null,
          item.catmat_descricao || null
        ]
      );

      itensRegistrados.push(itemResult.rows[0]);

      await applyStockMovement(client, {
        materialId: item.material_id,
        tipo: item.tipo_movimento || (data.tipo === 'devolucao' ? 'devolucao' : 'entrada'),
        quantidade: item.quantidade,
        valorUnitario: item.valor_unitario,
        documento: `NF ${data.numero}/${data.serie || '1'}`,
        observacoes: item.descricao_nf,
        origem: 'nota_fiscal',
        notaFiscalId: nota.id,
        notaFiscalItemId: itemResult.rows[0].id,
        userId
      });
    }

    if (!usesExternalExecutor) {
      await client.query('COMMIT');
    }

    return {
      ...nota,
      itens_registrados: itensRegistrados
    };
  } catch (error) {
    if (!usesExternalExecutor) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (!usesExternalExecutor) {
      client.release();
    }
  }
}

async function listNotasEntrada(filters) {
  const params = [];
  const clauses = ["COALESCE(nf.tipo, 'entrada') IN ('entrada', 'devolucao')"];
  const push = (sql, value) => {
    params.push(value);
    clauses.push(sql.replace('?', `$${params.length}`));
  };

  if (filters.q) {
    const term = `%${filters.q}%`;
    params.push(term, term, term);
    clauses.push(
      `(nf.numero::text ILIKE $${params.length - 2} OR nf.fornecedor ILIKE $${params.length - 1} OR COALESCE(nf.chave_acesso, '') ILIKE $${params.length})`
    );
  }
  if (filters.fornecedor) {
    push('nf.fornecedor ILIKE ?', `%${filters.fornecedor}%`);
  }
  if (filters.numero) {
    push('nf.numero::text ILIKE ?', `%${filters.numero}%`);
  }
  if (filters.dataInicio) {
    push('nf.data_emissao >= ?', filters.dataInicio);
  }
  if (filters.dataFim) {
    push('nf.data_emissao <= ?', filters.dataFim);
  }

  const where = ` WHERE ${clauses.join(' AND ')}`;
  const { column, direction } = resolveSort(filters.sortField, filters.sortDir, NOTE_SORT_FIELDS, 'nf.created_at');

  const listSql = `
    SELECT nf.*, COUNT(nfi.id) AS itens_count
    FROM notas_fiscais nf
    LEFT JOIN nota_fiscal_items nfi ON nfi.nota_fiscal_id = nf.id
    ${where}
    GROUP BY nf.id
    ORDER BY ${column} ${direction}, nf.id DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const [rowsResult, countResult] = await Promise.all([
    db.query(listSql, [...params, filters.limit, filters.offset]),
    db.query(`SELECT COUNT(*) AS total FROM notas_fiscais nf ${where}`, params)
  ]);

  return {
    rows: rowsResult.rows,
    total: Number.parseInt(countResult.rows[0].total, 10)
  };
}

async function createMovimentacaoManual(data, user) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const movement = await applyStockMovement(client, {
      materialId: data.item_id,
      tipo: data.tipo,
      quantidade: data.quantidade,
      valorUnitario: data.valor_unitario,
      documento: data.documento,
      observacoes: data.observacoes,
      origem: data.origem || 'manual',
      justificativa: data.justificativa,
      solicitacaoId: data.solicitacao_id,
      localizacaoDestino: data.localizacao_destino,
      allowNegative: user?.perfil === 'admin',
      userId: user.id
    });

    await client.query('COMMIT');
    return movement;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listMovimentacoes(filters) {
  const params = [];
  const clauses = ['1=1'];
  const push = (sql, value) => {
    params.push(value);
    clauses.push(sql.replace('?', `$${params.length}`));
  };

  if (filters.itemId) {
    push('sm.material_id = ?', filters.itemId);
  }
  if (filters.tipo) {
    push('sm.tipo = ?', filters.tipo);
  }
  if (filters.origem) {
    push('sm.origem = ?', filters.origem);
  }
  if (filters.dataInicio) {
    push('sm.created_at >= ?', filters.dataInicio);
  }
  if (filters.dataFim) {
    push('sm.created_at <= ?', `${filters.dataFim} 23:59:59`);
  }

  const where = ` WHERE ${clauses.join(' AND ')}`;
  const { column, direction } = resolveSort(filters.sortField, filters.sortDir, MOVEMENT_SORT_FIELDS, 'sm.created_at');

  const listSql = `
    SELECT
      sm.*,
      m.codigo,
      m.codigo_interno,
      m.descricao AS material_descricao,
      m.unidade,
      u.nome AS usuario_nome
    FROM stock_movements sm
    JOIN materials m ON m.id = sm.material_id
    LEFT JOIN usuarios u ON u.id = sm.created_by
    ${where}
    ORDER BY ${column} ${direction}, sm.id DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const [rowsResult, countResult] = await Promise.all([
    db.query(listSql, [...params, filters.limit, filters.offset]),
    db.query(`SELECT COUNT(*) AS total FROM stock_movements sm ${where}`, params)
  ]);

  return {
    rows: rowsResult.rows,
    total: Number.parseInt(countResult.rows[0].total, 10)
  };
}

async function createSolicitacao(data, userId) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const solicitacaoResult = await client.query(
      `INSERT INTO solicitacoes (setor, solicitante, status, observacoes, created_by, prioridade, centro_custo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.setor,
        data.solicitante,
        data.status || 'enviada',
        data.observacoes || null,
        userId,
        data.prioridade || 'normal',
        data.centro_custo || null
      ]
    );

    const solicitacao = solicitacaoResult.rows[0];

    for (const item of data.itens) {
      await client.query(
        `INSERT INTO solicitacao_itens (solicitacao_id, item_id, quantidade, status)
         VALUES ($1, $2, $3, 'pendente')`,
        [solicitacao.id, item.item_id, toNumber(item.quantidade)]
      );
    }

    await client.query('COMMIT');
    return solicitacao;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getSolicitacaoById(id, executor = db) {
  const result = await executor.query(
    `SELECT
      s.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', si.id,
            'item_id', si.item_id,
            'quantidade', si.quantidade,
            'quantidade_atendida', si.quantidade_atendida,
            'status', si.status,
            'codigo_interno', COALESCE(m.codigo_interno, m.codigo),
            'descricao', m.descricao
          ) ORDER BY si.id
        ) FILTER (WHERE si.id IS NOT NULL),
        '[]'::json
      ) AS itens
    FROM solicitacoes s
    LEFT JOIN solicitacao_itens si ON si.solicitacao_id = s.id
    LEFT JOIN materials m ON m.id = si.item_id
    WHERE s.id = $1
    GROUP BY s.id`,
    [id]
  );

  return result.rows[0] || null;
}

async function listSolicitacoes(filters) {
  const params = [];
  const clauses = ['1=1'];
  const push = (sql, value) => {
    params.push(value);
    clauses.push(sql.replace('?', `$${params.length}`));
  };

  if (filters.status) {
    push('s.status = ?', filters.status);
  }
  if (filters.prioridade) {
    push('s.prioridade = ?', filters.prioridade);
  }
  if (filters.setor) {
    push('s.setor ILIKE ?', `%${filters.setor}%`);
  }
  if (filters.solicitante) {
    push('s.solicitante ILIKE ?', `%${filters.solicitante}%`);
  }
  if (filters.dataInicio) {
    push('s.data >= ?', filters.dataInicio);
  }
  if (filters.dataFim) {
    push('s.data <= ?', `${filters.dataFim} 23:59:59`);
  }

  const where = ` WHERE ${clauses.join(' AND ')}`;
  const { column, direction } = resolveSort(filters.sortField, filters.sortDir, SOLICITACAO_SORT_FIELDS, 's.data');

  const listSql = `
    SELECT
      s.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', si.id,
            'item_id', si.item_id,
            'quantidade', si.quantidade,
            'quantidade_atendida', si.quantidade_atendida,
            'status', si.status,
            'codigo_interno', COALESCE(m.codigo_interno, m.codigo),
            'descricao', m.descricao
          ) ORDER BY si.id
        ) FILTER (WHERE si.id IS NOT NULL),
        '[]'::json
      ) AS itens
    FROM solicitacoes s
    LEFT JOIN solicitacao_itens si ON si.solicitacao_id = s.id
    LEFT JOIN materials m ON m.id = si.item_id
    ${where}
    GROUP BY s.id
    ORDER BY ${column} ${direction}, s.id DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const [rowsResult, countResult] = await Promise.all([
    db.query(listSql, [...params, filters.limit, filters.offset]),
    db.query(`SELECT COUNT(*) AS total FROM solicitacoes s ${where}`, params)
  ]);

  return {
    rows: rowsResult.rows,
    total: Number.parseInt(countResult.rows[0].total, 10)
  };
}

async function updateSolicitacaoStatus(id, payload, user) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const current = await getSolicitacaoById(id, client);
    if (!current) {
      throw new AppError(404, 'NOT_FOUND', 'Solicitação não encontrada');
    }

    await client.query(
      `UPDATE solicitacoes
       SET status = $1,
           observacoes = COALESCE($2, observacoes),
           responsavel_analise_id = CASE WHEN $1 IN ('em_analise', 'aprovada', 'recusada') THEN $3 ELSE responsavel_analise_id END,
           analisado_em = CASE WHEN $1 IN ('em_analise', 'aprovada', 'recusada') THEN NOW() ELSE analisado_em END,
           atendido_em = CASE WHEN $1 IN ('atendida', 'parcial', 'parcialmente_atendida', 'estornada') THEN NOW() ELSE atendido_em END,
           updated_at = NOW()
       WHERE id = $4`,
      [payload.status, payload.observacoes || null, user?.id || null, id]
    );

    if (payload.status === 'em_separacao') {
      await client.query(
        `UPDATE solicitacao_itens
         SET status = CASE WHEN status = 'pendente' THEN 'reservado' ELSE status END,
             observacoes = COALESCE($1, observacoes)
         WHERE solicitacao_id = $2`,
        [payload.observacoes || null, id]
      );
    }

    if (['atendida', 'parcial', 'parcialmente_atendida'].includes(payload.status)) {
      for (const itemPayload of payload.itens || []) {
        const itemRowResult = await client.query(
          `SELECT *
           FROM solicitacao_itens
           WHERE solicitacao_id = $1 AND item_id = $2
           FOR UPDATE`,
          [id, itemPayload.item_id]
        );

        if (itemRowResult.rows.length === 0) {
          throw new AppError(404, 'NOT_FOUND', 'Item da solicitação não encontrado');
        }

        const itemRow = itemRowResult.rows[0];
        const restante = toNumber(itemRow.quantidade) - toNumber(itemRow.quantidade_atendida);
        const quantidadeAtendida = toNumber(itemPayload.quantidade_atendida);

        if (quantidadeAtendida <= 0) {
          continue;
        }

        if (quantidadeAtendida > restante) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Quantidade atendida maior que o saldo da solicitação', [
            {
              path: 'itens',
              message: 'Quantidade atendida maior que o saldo da solicitação',
              code: 'custom'
            }
          ]);
        }

        await applyStockMovement(client, {
          materialId: itemPayload.item_id,
          tipo: 'saida',
          quantidade: quantidadeAtendida,
          documento: `SOL-${id}`,
          observacoes: `Atendimento da solicitação ${id}`,
          origem: 'solicitacao',
          solicitacaoId: id,
          allowNegative: user?.perfil === 'admin',
          userId: user.id
        });

        const novoAtendido = toNumber(itemRow.quantidade_atendida) + quantidadeAtendida;
        const novoStatus = novoAtendido >= toNumber(itemRow.quantidade) ? 'atendido' : 'parcial';

        await client.query(
          `UPDATE solicitacao_itens
           SET quantidade_atendida = $1,
               status = $2,
               observacoes = COALESCE($3, observacoes)
           WHERE id = $4`,
          [novoAtendido, novoStatus, payload.observacoes || null, itemRow.id]
        );
      }
    }

    if (['cancelada', 'recusada', 'estornada'].includes(payload.status)) {
      await client.query(
        `UPDATE solicitacao_itens
         SET status = 'cancelado', observacoes = COALESCE($1, observacoes)
         WHERE solicitacao_id = $2 AND status <> 'atendido'`,
        [payload.observacoes || null, id]
      );
    }

    await client.query('COMMIT');
    return getSolicitacaoById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getDashboardSummary(filters = {}) {
  const params = [];
  let movementRange = 'sm.created_at::date = CURRENT_DATE';

  if (filters.dataInicio) {
    params.push(filters.dataInicio);
    movementRange = `sm.created_at >= $${params.length}`;
  }
  if (filters.dataFim) {
    params.push(`${filters.dataFim} 23:59:59`);
    movementRange = `${movementRange} AND sm.created_at <= $${params.length}`;
  }

  const result = await db.query(
    `SELECT
      (SELECT COUNT(*) FROM materials WHERE COALESCE(status, CASE WHEN ativo THEN 'ativo' ELSE 'inativo' END) = 'ativo') AS total_itens,
      (SELECT COALESCE(SUM(quantidade), 0) FROM stock_balances) AS total_estoque,
      (SELECT COALESCE(SUM(valor_total), 0) FROM stock_balances) AS valor_total_estoque,
      (
        SELECT COUNT(*)
        FROM materials m
        LEFT JOIN stock_balances sb ON sb.material_id = m.id
        WHERE COALESCE(sb.quantidade, 0) <= GREATEST(COALESCE(m.ponto_reposicao, 0), COALESCE(m.estoque_minimo, 0))
      ) AS itens_criticos,
      (
        SELECT COUNT(*)
        FROM materials
        WHERE COALESCE(status, CASE WHEN ativo THEN 'ativo' ELSE 'inativo' END) = 'bloqueado'
      ) AS itens_bloqueados,
      (SELECT COALESCE(SUM(sm.quantidade), 0) FROM stock_movements sm WHERE sm.tipo IN ('entrada', 'devolucao') AND ${movementRange}) AS entradas_hoje,
      (SELECT COALESCE(SUM(sm.quantidade), 0) FROM stock_movements sm WHERE sm.tipo = 'saida' AND ${movementRange}) AS saidas_hoje,
      (SELECT COUNT(*) FROM solicitacoes WHERE status IN ('enviada', 'em_analise', 'aprovada', 'em_separacao', 'parcial', 'parcialmente_atendida')) AS solicitacoes_pendentes,
      (SELECT COUNT(*) FROM solicitacoes WHERE status = 'em_separacao') AS solicitacoes_em_separacao`,
    params
  );

  return result.rows[0];
}

async function getResumoRelatorio(filters = {}) {
  const params = [];
  const clauses = ['1=1'];
  const push = (sql, value) => {
    params.push(value);
    clauses.push(sql.replace('?', `$${params.length}`));
  };

  if (filters.dataInicio) {
    push('sm.created_at >= ?', filters.dataInicio);
  }
  if (filters.dataFim) {
    push('sm.created_at <= ?', `${filters.dataFim} 23:59:59`);
  }

  const movementWhere = ` WHERE ${clauses.join(' AND ')}`;
  const setorClause = filters.setor ? ' AND s.setor = $1' : '';
  const setorParams = filters.setor ? [filters.setor] : [];

  const [movimentos, contas, criticos, consumoSetor] = await Promise.all([
    db.query(
      `SELECT tipo, COALESCE(SUM(quantidade), 0) AS quantidade, COUNT(*) AS total
       FROM stock_movements sm
       ${movementWhere}
       GROUP BY tipo`,
      params
    ),
    db.query(
      `SELECT c.codigo, c.descricao, COALESCE(SUM(sb.valor_total), 0) AS valor_total
       FROM contas_contabeis c
       LEFT JOIN materials m ON m.conta_contabil_id = c.id
       LEFT JOIN stock_balances sb ON sb.material_id = m.id
       GROUP BY c.id
       ORDER BY valor_total DESC, c.codigo ASC`
    ),
    db.query(
      `SELECT m.id, COALESCE(m.codigo_interno, m.codigo) AS codigo_interno, m.descricao, COALESCE(sb.quantidade, 0) AS saldo
       FROM materials m
       LEFT JOIN stock_balances sb ON sb.material_id = m.id
       WHERE COALESCE(sb.quantidade, 0) <= GREATEST(COALESCE(m.ponto_reposicao, 0), COALESCE(m.estoque_minimo, 0))
       ORDER BY saldo ASC, m.descricao ASC
       LIMIT 20`
    ),
    db.query(
      `SELECT s.setor, COALESCE(SUM(si.quantidade_atendida), 0) AS quantidade_atendida
       FROM solicitacoes s
       JOIN solicitacao_itens si ON si.solicitacao_id = s.id
       WHERE s.status IN ('atendida', 'parcial', 'parcialmente_atendida')${setorClause}
       GROUP BY s.setor
       ORDER BY quantidade_atendida DESC, s.setor ASC`,
      setorParams
    )
  ]);

  return {
    movimentacoes: movimentos.rows,
    saldos_por_conta: contas.rows,
    itens_criticos: criticos.rows,
    consumo_por_setor: consumoSetor.rows
  };
}

async function createAuditLog(entry, executor = db) {
  const result = await executor.query(
    `INSERT INTO logs_auditoria_almoxarifado (usuario_id, acao, entidade_tipo, entidade_id, request_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      entry.userId || null,
      entry.acao,
      entry.entidadeTipo,
      String(entry.entidadeId),
      entry.requestId || null,
      entry.payload ? JSON.stringify(entry.payload) : null
    ]
  );

  return result.rows[0];
}

async function listAuditLogs(filters) {
  const params = [];
  const clauses = ['1=1'];
  const push = (sql, value) => {
    params.push(value);
    clauses.push(sql.replace('?', `$${params.length}`));
  };

  if (filters.acao) {
    push('l.acao = ?', filters.acao);
  }
  if (filters.entidadeTipo) {
    push('l.entidade_tipo = ?', filters.entidadeTipo);
  }
  if (filters.usuarioId) {
    push('l.usuario_id = ?', filters.usuarioId);
  }

  const where = ` WHERE ${clauses.join(' AND ')}`;
  const { column, direction } = resolveSort(filters.sortField, filters.sortDir, AUDIT_SORT_FIELDS, 'l.created_at');

  const [rowsResult, countResult] = await Promise.all([
    db.query(
      `SELECT l.*, u.nome AS usuario_nome
       FROM logs_auditoria_almoxarifado l
       LEFT JOIN usuarios u ON u.id = l.usuario_id
       ${where}
       ORDER BY ${column} ${direction}, l.id DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, filters.limit, filters.offset]
    ),
    db.query(`SELECT COUNT(*) AS total FROM logs_auditoria_almoxarifado l ${where}`, params)
  ]);

  return {
    rows: rowsResult.rows,
    total: Number.parseInt(countResult.rows[0].total, 10)
  };
}

module.exports = {
  findContaContabilById,
  findContaContabilByCodigo,
  findGrupoById,
  findSubgrupoById,
  findLocalizacaoById,
  listMetaCatalogs,
  listContasContabeis,
  createContaContabil,
  findItemsPaginated,
  findItemById,
  findSimilarItems,
  createItem,
  updateItem,
  replaceItemImages,
  createNotaEntrada,
  listNotasEntrada,
  createMovimentacaoManual,
  listMovimentacoes,
  createSolicitacao,
  getSolicitacaoById,
  listSolicitacoes,
  updateSolicitacaoStatus,
  getDashboardSummary,
  getResumoRelatorio,
  createAuditLog,
  listAuditLogs
};
