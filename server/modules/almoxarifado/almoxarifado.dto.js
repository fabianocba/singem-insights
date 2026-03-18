function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseImages(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeContaContabil(row) {
  if (!row || !row.id) {
    return null;
  }

  return {
    id: row.id,
    codigo: row.codigo,
    descricao: row.descricao,
    categoria: row.categoria || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function normalizeItem(row) {
  if (!row) {
    return null;
  }

  const saldo = toNumber(row.saldo_quantidade ?? row.quantidade ?? row.saldo_atual);
  const estoqueMinimo = toNumber(row.estoque_minimo);
  const pontoReposicao = toNumber(row.ponto_reposicao);

  return {
    id: row.id,
    public_id: row.public_id || null,
    version: Number.parseInt(row.version || 1, 10),
    codigo_interno: row.codigo_interno || row.codigo || null,
    descricao: row.descricao,
    descricao_resumida: row.descricao_resumida || null,
    catmat_codigo: row.catmat_codigo || null,
    catmat_descricao: row.catmat_descricao || null,
    unidade: row.unidade || 'UN',
    grupo_id: row.grupo_id || null,
    grupo: row.grupo_nome_dim || row.grupo || null,
    subgrupo_id: row.subgrupo_id || null,
    subgrupo: row.subgrupo_nome_dim || row.subgrupo || null,
    localizacao_id: row.localizacao_id || null,
    localizacao: row.localizacao_nome_dim || row.localizacao || null,
    localizacao_detalhe: row.localizacao_id
      ? {
          id: row.localizacao_id,
          nome: row.localizacao_nome_dim || row.localizacao || null,
          bloco: row.localizacao_bloco || null,
          prateleira: row.localizacao_prateleira || null,
          nivel: row.localizacao_nivel || null
        }
      : null,
    status: row.status || 'ativo',
    conta_contabil: row.conta_contabil_id
      ? {
          id: row.conta_contabil_id,
          codigo: row.conta_contabil_codigo || null,
          descricao: row.conta_contabil_descricao || null,
          categoria: row.conta_contabil_categoria || null
        }
      : null,
    estoque: {
      saldo,
      valor_medio: toNumber(row.valor_medio),
      valor_total: toNumber(row.valor_total),
      estoque_minimo: estoqueMinimo,
      estoque_maximo: toNumber(row.estoque_maximo),
      ponto_reposicao: pontoReposicao,
      alerta_estoque: saldo <= Math.max(estoqueMinimo, pontoReposicao)
    },
    imagens: parseImages(row.imagens).map((image) => ({
      id: image.id,
      url: image.url,
      tipo: image.tipo || 'principal',
      created_at: image.created_at || null
    })),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function normalizeMovimentacao(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    item_id: row.material_id,
    tipo: row.tipo,
    quantidade: toNumber(row.quantidade),
    valor_unitario: toNumber(row.valor_unitario),
    valor_total: toNumber(row.valor_total),
    saldo_anterior: toNumber(row.saldo_anterior),
    saldo_posterior: toNumber(row.saldo_posterior),
    origem: row.origem || 'manual',
    documento: row.documento || null,
    justificativa: row.justificativa || null,
    localizacao_destino: row.localizacao_destino || null,
    solicitacao_id: row.solicitacao_id || null,
    usuario: row.usuario_id || row.created_by
      ? {
          id: row.usuario_id || row.created_by,
          nome: row.usuario_nome || null
        }
      : null,
    item: {
      codigo_interno: row.codigo_interno || row.codigo || null,
      descricao: row.material_descricao || row.descricao || null,
      unidade: row.unidade || null
    },
    created_at: row.created_at || null
  };
}

function normalizeNotaEntrada(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    public_id: row.public_id || null,
    numero: row.numero,
    serie: row.serie || null,
    chave_acesso: row.chave_acesso || null,
    data_emissao: row.data_emissao || null,
    data_entrada: row.data_entrada || null,
    fornecedor_id: row.fornecedor_id || null,
    fornecedor: row.fornecedor || null,
    cnpj_fornecedor: row.cnpj_fornecedor || null,
    valor_total: toNumber(row.valor_total),
    tipo: row.tipo || 'entrada',
    status: row.status || null,
    itens_count: Number.parseInt(row.itens_count || 0, 10),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function normalizeSolicitacao(row) {
  if (!row) {
    return null;
  }

  const itens = Array.isArray(row.itens) ? row.itens : parseImages(row.itens);

  return {
    id: row.id,
    public_id: row.public_id || null,
    setor: row.setor,
    solicitante: row.solicitante,
    status: row.status,
    prioridade: row.prioridade || 'normal',
    centro_custo: row.centro_custo || null,
    data: row.data,
    observacoes: row.observacoes || null,
    responsavel_analise_id: row.responsavel_analise_id || null,
    analisado_em: row.analisado_em || null,
    atendido_em: row.atendido_em || null,
    itens: itens.map((item) => ({
      id: item.id,
      item_id: item.item_id,
      codigo_interno: item.codigo_interno || null,
      descricao: item.descricao || null,
      quantidade: toNumber(item.quantidade),
      quantidade_atendida: toNumber(item.quantidade_atendida),
      status: item.status || 'pendente'
    })),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function normalizeDashboard(row) {
  return {
    total_itens: Number.parseInt(row?.total_itens || 0, 10),
    total_estoque: toNumber(row?.total_estoque),
    valor_total_estoque: toNumber(row?.valor_total_estoque),
    itens_criticos: Number.parseInt(row?.itens_criticos || 0, 10),
    itens_bloqueados: Number.parseInt(row?.itens_bloqueados || 0, 10),
    entradas_hoje: toNumber(row?.entradas_hoje),
    saidas_hoje: toNumber(row?.saidas_hoje),
    solicitacoes_pendentes: Number.parseInt(row?.solicitacoes_pendentes || 0, 10),
    solicitacoes_em_separacao: Number.parseInt(row?.solicitacoes_em_separacao || 0, 10)
  };
}

function normalizeMeta(data = {}) {
  return {
    movement_types: Array.isArray(data.movementTypes) ? data.movementTypes : [],
    solicitation_statuses: Array.isArray(data.solicitationStatuses) ? data.solicitationStatuses : [],
    item_statuses: Array.isArray(data.itemStatuses) ? data.itemStatuses : [],
    priority_levels: Array.isArray(data.priorityLevels) ? data.priorityLevels : [],
    contas_contabeis: Array.isArray(data.contasContabeis)
      ? data.contasContabeis.map(normalizeContaContabil).filter(Boolean)
      : [],
    grupos: Array.isArray(data.grupos)
      ? data.grupos.map((row) => ({
          id: row.id,
          codigo: row.codigo || null,
          nome: row.nome,
          total_itens: Number.parseInt(row.total_itens || 0, 10)
        }))
      : [],
    subgrupos: Array.isArray(data.subgrupos)
      ? data.subgrupos.map((row) => ({
          id: row.id,
          grupo_id: row.grupo_id,
          codigo: row.codigo || null,
          nome: row.nome,
          total_itens: Number.parseInt(row.total_itens || 0, 10)
        }))
      : [],
    localizacoes: Array.isArray(data.localizacoes)
      ? data.localizacoes.map((row) => ({
          id: row.id,
          nome: row.nome,
          bloco: row.bloco || null,
          prateleira: row.prateleira || null,
          nivel: row.nivel || null,
          ativo: row.ativo !== false,
          total_itens: Number.parseInt(row.total_itens || 0, 10)
        }))
      : [],
    fornecedores: Array.isArray(data.fornecedores)
      ? data.fornecedores.map((row) => ({
          id: row.id,
          public_id: row.public_id || null,
          razao_social: row.razao_social,
          nome_fantasia: row.nome_fantasia || null,
          cnpj: row.cnpj || null,
          ativo: row.ativo !== false
        }))
      : []
  };
}

function normalizeAudit(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    public_id: row.public_id || null,
    acao: row.acao,
    entidade_tipo: row.entidade_tipo,
    entidade_id: row.entidade_id,
    request_id: row.request_id || null,
    usuario: row.usuario_id
      ? {
          id: row.usuario_id,
          nome: row.usuario_nome || null
        }
      : null,
    payload: row.payload || null,
    created_at: row.created_at || null
  };
}

function normalizeDuplicateCandidate(row) {
  return {
    id: row.id,
    codigo_interno: row.codigo_interno || row.codigo || null,
    descricao: row.descricao,
    similaridade: toNumber(row.similaridade)
  };
}

module.exports = {
  normalizeContaContabil,
  normalizeItem,
  normalizeMovimentacao,
  normalizeNotaEntrada,
  normalizeSolicitacao,
  normalizeDashboard,
  normalizeMeta,
  normalizeAudit,
  normalizeDuplicateCandidate,
  toNumber
};
