const AppError = require('../../utils/appError');
const { parsePagination, buildMeta } = require('../../utils/pagination');
const repository = require('./almoxarifado.repository');
const dto = require('./almoxarifado.dto');
const { movementTypes, itemStatuses, solicitationStatuses, priorityLevels } = require('./almoxarifado.schemas');

function buildValidationError(message, path = 'body') {
  return new AppError(400, 'VALIDATION_ERROR', message, [{ path, message, code: 'custom' }]);
}

function requireContaContabil(item) {
  if (!item?.conta_contabil_id && !item?.conta_contabil?.id) {
    throw buildValidationError('Item deve possuir conta contábil vinculada');
  }
}

function requireCatmat(item) {
  if (!item?.catmat_codigo) {
    throw buildValidationError('Item deve possuir CATMAT vinculado');
  }
}

async function resolveCatalogReferences(data = {}, current = {}) {
  const resolved = { ...data };

  if (data.grupo_id !== undefined) {
    if (!data.grupo_id) {
      resolved.grupo_id = null;
      resolved.grupo = null;
    } else {
      const grupo = await repository.findGrupoById(data.grupo_id);
      if (!grupo) {
        throw new AppError(404, 'NOT_FOUND', 'Grupo de material não encontrado');
      }
      resolved.grupo_id = grupo.id;
      resolved.grupo = data.grupo || grupo.nome;
    }
  } else {
    resolved.grupo_id = current.grupo_id;
  }

  if (data.subgrupo_id !== undefined) {
    if (!data.subgrupo_id) {
      resolved.subgrupo_id = null;
      resolved.subgrupo = null;
    } else {
      const subgrupo = await repository.findSubgrupoById(data.subgrupo_id);
      if (!subgrupo) {
        throw new AppError(404, 'NOT_FOUND', 'Subgrupo de material não encontrado');
      }
      if (resolved.grupo_id && subgrupo.grupo_id !== resolved.grupo_id) {
        throw buildValidationError('Subgrupo não pertence ao grupo informado', 'subgrupo_id');
      }
      resolved.subgrupo_id = subgrupo.id;
      resolved.subgrupo = data.subgrupo || subgrupo.nome;

      if (!resolved.grupo_id) {
        const grupo = await repository.findGrupoById(subgrupo.grupo_id);
        resolved.grupo_id = grupo?.id || null;
        resolved.grupo = resolved.grupo || grupo?.nome || current.grupo || null;
      }
    }
  } else {
    resolved.subgrupo_id = current.subgrupo_id;
  }

  if (data.localizacao_id !== undefined) {
    if (!data.localizacao_id) {
      resolved.localizacao_id = null;
      resolved.localizacao = null;
    } else {
      const localizacao = await repository.findLocalizacaoById(data.localizacao_id);
      if (!localizacao) {
        throw new AppError(404, 'NOT_FOUND', 'Localização de estoque não encontrada');
      }
      resolved.localizacao_id = localizacao.id;
      resolved.localizacao = data.localizacao || localizacao.nome;
    }
  } else {
    resolved.localizacao_id = current.localizacao_id;
  }

  return resolved;
}

async function auditMutation({ acao, entidadeTipo, entidadeId, payload, user, requestId }) {
  if (!user?.id || !entidadeId) {
    return;
  }

  try {
    await repository.createAuditLog({
      acao,
      entidadeTipo,
      entidadeId,
      payload,
      userId: user.id,
      requestId
    });
  } catch (error) {
    console.warn('[Almoxarifado] Falha ao registrar auditoria dedicada:', error.message);
  }
}

async function assertContaContabilExists(contaContabilId) {
  const conta = await repository.findContaContabilById(contaContabilId);
  if (!conta) {
    throw new AppError(404, 'NOT_FOUND', 'Conta contábil não encontrada');
  }

  return conta;
}

async function checkDuplicateCandidates(descricao, ignoreDuplicate = false, excludeId = null) {
  const duplicates = await repository.findSimilarItems(descricao, excludeId);
  const normalizedDuplicates = duplicates.map(dto.normalizeDuplicateCandidate);

  if (normalizedDuplicates.length > 0 && !ignoreDuplicate) {
    throw new AppError(
      409,
      'DUPLICATE_CANDIDATES',
      'Foram encontrados itens possivelmente duplicados',
      normalizedDuplicates
    );
  }

  return normalizedDuplicates;
}

async function createItemInternal(data) {
  await assertContaContabilExists(data.conta_contabil_id);
  await checkDuplicateCandidates(data.descricao, Boolean(data.ignorar_duplicidade));

  const created = await repository.createItem(data);
  if (Array.isArray(data.imagens) && data.imagens.length > 0) {
    await repository.replaceItemImages(created.id, data.imagens);
  }

  return repository.findItemById(created.id);
}

async function ensureResolvedItemForNota(itemInput) {
  if (itemInput.material_id) {
    const existing = await repository.findItemById(itemInput.material_id);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Item informado na nota fiscal não foi encontrado');
    }

    requireCatmat(existing);
    requireContaContabil(existing);

    return {
      material_id: existing.id,
      conta_contabil_id: itemInput.conta_contabil_id || existing.conta_contabil_id,
      catmat_codigo: itemInput.catmat_codigo || existing.catmat_codigo,
      catmat_descricao: itemInput.catmat_descricao || existing.catmat_descricao,
      unidade: existing.unidade,
      item_numero: itemInput.item_numero,
      descricao_nf: itemInput.descricao_nf,
      quantidade: itemInput.quantidade,
      valor_unitario: itemInput.valor_unitario
    };
  }

  if (!itemInput.create_item) {
    throw buildValidationError('Cada item da nota deve referenciar um item existente ou create_item');
  }

  const createItemPayload = {
    ...itemInput.create_item,
    descricao: itemInput.create_item.descricao || itemInput.descricao_nf,
    unidade: itemInput.create_item.unidade || 'UN',
    conta_contabil_id: itemInput.conta_contabil_id || itemInput.create_item.conta_contabil_id
  };

  requireCatmat(createItemPayload);
  requireContaContabil(createItemPayload);

  const created = await createItemInternal(createItemPayload);

  return {
    material_id: created.id,
    conta_contabil_id: createItemPayload.conta_contabil_id,
    catmat_codigo: createItemPayload.catmat_codigo,
    catmat_descricao: createItemPayload.catmat_descricao,
    unidade: created.unidade,
    item_numero: itemInput.item_numero,
    descricao_nf: itemInput.descricao_nf,
    quantidade: itemInput.quantidade,
    valor_unitario: itemInput.valor_unitario
  };
}

async function getMeta() {
  const meta = await repository.listMetaCatalogs();

  return dto.normalizeMeta({
    ...meta,
    movementTypes,
    solicitationStatuses,
    itemStatuses,
    priorityLevels
  });
}

async function getDashboard(filters) {
  const summary = await repository.getDashboardSummary(filters);
  return dto.normalizeDashboard(summary);
}

async function listContasContabeis(query) {
  const pagination = parsePagination(
    { page: query.page, limit: query.limit },
    { sortField: 'codigo', sortDir: 'asc', sort: 'codigo:asc' },
    ['codigo']
  );

  const result = await repository.listContasContabeis({
    q: query.q,
    limit: pagination.limit,
    offset: pagination.offset
  });

  return {
    items: result.rows.map(dto.normalizeContaContabil),
    meta: buildMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      sort: pagination.sort
    })
  };
}

async function createContaContabil(data, user, requestId) {
  const existing = await repository.findContaContabilByCodigo(data.codigo);
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Já existe conta contábil com este código');
  }

  const conta = await repository.createContaContabil(data);
  const normalized = dto.normalizeContaContabil(conta);

  await auditMutation({
    acao: 'conta_contabil.criada',
    entidadeTipo: 'conta_contabil',
    entidadeId: normalized.id,
    payload: normalized,
    user,
    requestId
  });

  return normalized;
}

async function listItems(query) {
  const pagination = parsePagination(query, { sortField: 'createdAt', sortDir: 'desc', sort: 'createdAt:desc' }, [
    'createdAt',
    'descricao',
    'grupo',
    'status',
    'saldo',
    'catmat'
  ]);

  const result = await repository.findItemsPaginated({
    ...pagination,
    q: query.q || query.busca,
    busca: query.busca,
    grupo: query.grupo,
    subgrupo: query.subgrupo,
    status: query.status,
    contaContabilId: query.conta_contabil_id,
    catmatCodigo: query.catmat_codigo,
    somenteCriticos: query.somenteCriticos
  });

  return {
    items: result.rows.map(dto.normalizeItem),
    meta: buildMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      sort: pagination.sort
    })
  };
}

async function getItemById(id) {
  const item = await repository.findItemById(id);
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Item não encontrado');
  }

  return dto.normalizeItem(item);
}

async function createItem(data, user, requestId) {
  const resolvedData = await resolveCatalogReferences(data);

  requireCatmat(resolvedData);
  requireContaContabil(resolvedData);

  const item = await createItemInternal(resolvedData);
  const normalized = dto.normalizeItem(item);

  await auditMutation({
    acao: 'item.criado',
    entidadeTipo: 'item',
    entidadeId: normalized.id,
    payload: normalized,
    user,
    requestId
  });

  return normalized;
}

async function updateItem(id, data, user, requestId) {
  const current = await repository.findItemById(id);
  if (!current) {
    throw new AppError(404, 'NOT_FOUND', 'Item não encontrado');
  }

  const resolvedData = await resolveCatalogReferences(data, current);

  const merged = {
    ...current,
    ...resolvedData,
    conta_contabil_id: resolvedData.conta_contabil_id || current.conta_contabil?.id || current.conta_contabil_id
  };

  requireCatmat(merged);
  requireContaContabil(merged);

  if (resolvedData.conta_contabil_id) {
    await assertContaContabilExists(resolvedData.conta_contabil_id);
  }

  if (resolvedData.descricao && resolvedData.descricao !== current.descricao) {
    await checkDuplicateCandidates(resolvedData.descricao, Boolean(resolvedData.ignorar_duplicidade), id);
  }

  await repository.updateItem(id, resolvedData);
  if (Array.isArray(resolvedData.imagens)) {
    await repository.replaceItemImages(id, resolvedData.imagens);
  }

  const updated = await repository.findItemById(id);
  const normalized = dto.normalizeItem(updated);

  await auditMutation({
    acao: 'item.atualizado',
    entidadeTipo: 'item',
    entidadeId: normalized.id,
    payload: normalized,
    user,
    requestId
  });

  return normalized;
}

async function listNotasEntrada(query) {
  const pagination = parsePagination(query, { sortField: 'createdAt', sortDir: 'desc', sort: 'createdAt:desc' }, [
    'createdAt',
    'numero',
    'fornecedor',
    'dataEmissao',
    'dataEntrada',
    'valorTotal'
  ]);

  const result = await repository.listNotasEntrada({
    ...pagination,
    q: query.q,
    fornecedor: query.fornecedor,
    numero: query.numero,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim
  });

  return {
    items: result.rows.map(dto.normalizeNotaEntrada),
    meta: buildMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      sort: pagination.sort
    })
  };
}

async function createNotaEntrada(data, user, requestId) {
  if (!Array.isArray(data.itens) || data.itens.length === 0) {
    throw buildValidationError('A nota fiscal deve possuir ao menos um item', 'itens');
  }

  const itens = [];
  for (const item of data.itens) {
    itens.push(await ensureResolvedItemForNota(item));
  }

  const nota = await repository.createNotaEntrada(
    {
      ...data,
      itens
    },
    user?.id
  );

  const normalized = dto.normalizeNotaEntrada(nota);

  await auditMutation({
    acao: 'nota_entrada.criada',
    entidadeTipo: 'nota_entrada',
    entidadeId: normalized.id,
    payload: normalized,
    user,
    requestId
  });

  return normalized;
}

async function listMovimentacoes(query) {
  const pagination = parsePagination(query, { sortField: 'createdAt', sortDir: 'desc', sort: 'createdAt:desc' }, [
    'createdAt',
    'tipo',
    'quantidade'
  ]);

  const result = await repository.listMovimentacoes({
    ...pagination,
    itemId: query.item_id,
    tipo: query.tipo,
    origem: query.origem,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim
  });

  return {
    items: result.rows.map(dto.normalizeMovimentacao),
    meta: buildMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      sort: pagination.sort
    })
  };
}

async function createMovimentacao(data, user) {
  if (data.tipo === 'saida') {
    throw buildValidationError('Saídas devem ocorrer pelo fluxo de solicitação atendida');
  }

  if (data.tipo === 'ajuste' && !data.justificativa) {
    throw buildValidationError('Ajustes exigem justificativa', 'justificativa');
  }

  if (data.tipo === 'transferencia' && !data.localizacao_destino) {
    throw buildValidationError('Transferências exigem localização de destino', 'localizacao_destino');
  }

  const item = await repository.findItemById(data.item_id);
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Item não encontrado para movimentação');
  }

  const movimento = await repository.createMovimentacaoManual(data, user);
  return dto.normalizeMovimentacao({
    ...movimento,
    codigo: item.codigo,
    codigo_interno: item.codigo_interno,
    material_descricao: item.descricao,
    unidade: item.unidade
  });
}

async function createMovimentacaoWithAudit(data, user, requestId) {
  const normalized = await createMovimentacao(data, user);

  await auditMutation({
    acao: 'movimentacao.criada',
    entidadeTipo: 'movimentacao',
    entidadeId: normalized.id,
    payload: normalized,
    user,
    requestId
  });

  return normalized;
}

async function listSolicitacoes(query) {
  const pagination = parsePagination(query, { sortField: 'data', sortDir: 'desc', sort: 'data:desc' }, [
    'createdAt',
    'data',
    'prioridade',
    'status',
    'setor'
  ]);

  const result = await repository.listSolicitacoes({
    ...pagination,
    status: query.status,
    prioridade: query.prioridade,
    setor: query.setor,
    solicitante: query.solicitante,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim
  });

  return {
    items: result.rows.map(dto.normalizeSolicitacao),
    meta: buildMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      sort: pagination.sort
    })
  };
}

async function createSolicitacao(data, user, requestId) {
  for (const item of data.itens) {
    const existing = await repository.findItemById(item.item_id);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Item ${item.item_id} não encontrado para a solicitação`);
    }
  }

  const solicitacao = await repository.createSolicitacao(data, user.id);
  const fullRecord = await repository.getSolicitacaoById(solicitacao.id);
  const normalized = dto.normalizeSolicitacao(fullRecord);

  await auditMutation({
    acao: 'solicitacao.criada',
    entidadeTipo: 'solicitacao',
    entidadeId: normalized.id,
    payload: normalized,
    user,
    requestId
  });

  return normalized;
}

async function updateSolicitacaoStatus(id, payload, user, requestId) {
  const updated = await repository.updateSolicitacaoStatus(id, payload, user);
  const normalized = dto.normalizeSolicitacao(updated);

  await auditMutation({
    acao: 'solicitacao.status_atualizado',
    entidadeTipo: 'solicitacao',
    entidadeId: normalized.id,
    payload: normalized,
    user,
    requestId
  });

  return normalized;
}

async function getResumoRelatorio(query) {
  return repository.getResumoRelatorio(query);
}

async function listAuditoria(query) {
  const pagination = parsePagination(query, { sortField: 'createdAt', sortDir: 'desc', sort: 'createdAt:desc' }, [
    'createdAt',
    'acao',
    'entidade'
  ]);

  const result = await repository.listAuditLogs({
    ...pagination,
    acao: query.acao,
    entidadeTipo: query.entidade_tipo,
    usuarioId: query.usuario_id
  });

  return {
    items: result.rows.map(dto.normalizeAudit),
    meta: buildMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      sort: pagination.sort
    })
  };
}

module.exports = {
  getMeta,
  getDashboard,
  listContasContabeis,
  createContaContabil,
  listItems,
  getItemById,
  createItem,
  updateItem,
  listNotasEntrada,
  createNotaEntrada,
  listMovimentacoes,
  createMovimentacao: createMovimentacaoWithAudit,
  listSolicitacoes,
  createSolicitacao,
  updateSolicitacaoStatus,
  getResumoRelatorio,
  listAuditoria
};
