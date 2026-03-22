/**
 * comprasGovGatewayService.js
 *
 * Gateway central de integração com a API Compras.gov.br (dadosabertos.compras.gov.br).
 *
 * Este serviço é a ÚNICA porta de entrada para chamadas externas ao Compras.gov.br.
 * Encapsula: roteamento de endpoint, paginação, cache, retry, rate-limit e logs técnicos.
 *
 * Tags de log:
 *   [GOV_GATEWAY][REQUEST]   — chamada iniciada
 *   [GOV_GATEWAY][RESPONSE]  — chamada concluída com sucesso
 *   [GOV_GATEWAY][CACHE_HIT] — resposta entregue do cache
 *   [GOV_GATEWAY][ERROR]     — falha na chamada
 *   [CATMAT][QUERY]          — busca CATMAT material
 *   [CATMAT][RANKING]        — resultado ranqueado de busca CATMAT
 *   [PRICE][QUERY]           — pesquisa de preços praticados
 *   [UASG][QUERY]            — consulta UASG/Órgão
 *   [FORNECEDOR][QUERY]      — consulta Fornecedor
 *
 * NÃO reimplemente chamadas HTTP diretamente aqui — use ComprasGovClient.
 */

'use strict';

const { ComprasGovClient } = require('../../integrations/comprasgov/client');
const {
  attachNormalizedCollection,
  normalizeOrgaoProfile,
  normalizePriceRecord,
  normalizeSupplierProfile,
  normalizeUasgProfile
} = require('./comprasGovDataNormalizer');

const _client = new ComprasGovClient();

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários de log técnico padronizados
// ─────────────────────────────────────────────────────────────────────────────

function logRequest(tag, domain, operation, params = {}, requestId = null) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  console.log(
    `[GOV_GATEWAY][REQUEST] tag=${tag} domain=${domain} operation=${operation}` +
      ` requestId=${requestId || 'null'} params=${JSON.stringify(params)}`
  );
}

function logResponse(tag, domain, operation, meta = {}, requestId = null) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  console.log(
    `[GOV_GATEWAY][RESPONSE] tag=${tag} domain=${domain} operation=${operation}` +
      ` requestId=${requestId || 'null'} totalRegistros=${meta.totalRegistros ?? '?'}` +
      ` latencyMs=${meta.latencyMs ?? '?'}`
  );
}

function logError(tag, domain, operation, error, requestId = null) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  console.error(
    `[GOV_GATEWAY][ERROR] tag=${tag} domain=${domain} operation=${operation}` +
      ` requestId=${requestId || 'null'} status=${error?.statusCode || error?.status || 0}` +
      ` message=${error?.message || 'erro desconhecido'}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chamada base com logs — roteada via ComprasGovClient
// ─────────────────────────────────────────────────────────────────────────────

async function call({
  tag,
  domain,
  operation,
  params = {},
  pagina = 1,
  tamanhoPagina = 20,
  buscarTodasPaginas = false,
  maxPaginas,
  context = {}
}) {
  const requestId = context.requestId || null;
  logRequest(tag, domain, operation, params, requestId);

  const start = Date.now();
  try {
    const result = await _client.requestDomain({
      domain,
      operation,
      params,
      pagina,
      tamanhoPagina,
      buscarTodasPaginas,
      maxPaginas,
      ...context
    });

    const meta = {
      totalRegistros: result?.totalRegistros ?? result?._metadata?.totalRegistros,
      latencyMs: Date.now() - start
    };
    logResponse(tag, domain, operation, meta, requestId);
    return result;
  } catch (error) {
    logError(tag, domain, operation, error, requestId);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATMAT — Catálogo de Materiais
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta grupos do catálogo de material.
 * GET /modulo-material/1_consultarGrupoMaterial
 */
async function consultarGrupoMaterial(params = {}, context = {}) {
  return call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoMaterial',
    operation: 'grupos',
    params,
    pagina: 1,
    tamanhoPagina: 100,
    context
  });
}

/**
 * Consulta classes do catálogo de material.
 * GET /modulo-material/2_consultarClasseMaterial
 */
async function consultarClasseMaterial(params = {}, context = {}) {
  return call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoMaterial',
    operation: 'classes',
    params,
    pagina: 1,
    tamanhoPagina: 100,
    context
  });
}

async function consultarPdmMaterial(params = {}, context = {}) {
  return call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoMaterial',
    operation: 'pdm',
    params,
    pagina: 1,
    tamanhoPagina: 100,
    context
  });
}

async function consultarMaterialNaturezaDespesa(params = {}, context = {}) {
  return call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoMaterial',
    operation: 'naturezaDespesa',
    params,
    pagina: 1,
    tamanhoPagina: 100,
    context
  });
}

async function consultarMaterialUnidadeFornecimento(params = {}, context = {}) {
  return call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoMaterial',
    operation: 'unidadeFornecimento',
    params,
    pagina: 1,
    tamanhoPagina: 100,
    context
  });
}

async function consultarMaterialCaracteristicas(params = {}, context = {}) {
  return call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoMaterial',
    operation: 'caracteristicas',
    params,
    pagina: 1,
    tamanhoPagina: 100,
    context
  });
}

/**
 * Consulta itens do catálogo de material (CATMAT).
 *
 * Parâmetros aceitos (API oficial):
 *   codigoItem       — código numérico CATMAT (busca por código)
 *   descricaoItem    — descrição textual (busca por texto)
 *   codigoGrupo      — filtro por grupo
 *   codigoClasse     — filtro por classe
 *   codigoPdm        — filtro por PDM
 *   statusItem       — 1=Ativo, 0=Inativo
 *   bps              — BPS (Boa Prática de Saúde)
 *   codigo_ncm       — NCM do item
 *   pagina / tamanhoPagina
 *
 * GET /modulo-material/4_consultarItemMaterial
 */
async function consultarItemMaterial(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  console.log(`[CATMAT][QUERY] descricaoItem=${params.descricaoItem || ''} codigoItem=${params.codigoItem || ''}`);
  const result = await call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoMaterial',
    operation: 'itens',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
  console.log(`[CATMAT][RANKING] totalRegistros=${result?.totalRegistros ?? 0}`);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATSER — Catálogo de Serviços
// ─────────────────────────────────────────────────────────────────────────────

async function consultarGrupoServico(params = {}, context = {}) {
  return call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoServico',
    operation: 'grupos',
    params,
    pagina: 1,
    tamanhoPagina: 100,
    context
  });
}

async function consultarClasseServico(params = {}, context = {}) {
  return call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoServico',
    operation: 'classes',
    params,
    pagina: 1,
    tamanhoPagina: 100,
    context
  });
}

/**
 * Consulta itens do catálogo de serviços (CATSER).
 *
 * Parâmetros aceitos:
 *   descricaoItem, codigoGrupo, codigoClasse, statusItem, pagina, tamanhoPagina
 *
 * GET /modulo-servico/6_consultarItemServico
 */
async function consultarItemServico(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  return call({
    tag: '[CATMAT][QUERY]',
    domain: 'catalogoServico',
    operation: 'itens',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PESQUISA DE PREÇO — Preços praticados em compras públicas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta preços praticados para material (CATMAT).
 *
 * Parâmetros aceitos (API oficial):
 *   codigoItemCatalogo (OBRIGATÓRIO)
 *   codigoUasg, estado, codigoMunicipio, dataResultado
 *   codigoClasse, poder, esfera, idCompra
 *   dataCompraInicio, dataCompraFim
 *   pagina, tamanhoPagina
 *
 * GET /modulo-pesquisa-preco/1_consultarMaterial
 */
async function consultarPrecoMaterial(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  if (!params.codigoItemCatalogo) {
    const err = new Error('Parâmetro obrigatório: codigoItemCatalogo');
    err.statusCode = 400;
    throw err;
  }
  console.log(`[PRICE][QUERY] codigoItemCatalogo=${params.codigoItemCatalogo}`);
  const result = await call({
    tag: '[PRICE][QUERY]',
    domain: 'pesquisaPreco',
    operation: 'material',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });

  return attachNormalizedCollection(result, 'price-record', normalizePriceRecord);
}

/**
 * Consulta detalhe de preço de material.
 * GET /modulo-pesquisa-preco/2_consultarMaterialDetalhe
 */
async function consultarPrecoMaterialDetalhe(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  if (!params.codigoItemCatalogo) {
    const err = new Error('Parâmetro obrigatório: codigoItemCatalogo');
    err.statusCode = 400;
    throw err;
  }
  const result = await call({
    tag: '[PRICE][DETAIL]',
    domain: 'pesquisaPreco',
    operation: 'materialDetalhe',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });

  return attachNormalizedCollection(result, 'price-record', normalizePriceRecord);
}

/**
 * Consulta preços praticados para serviço (CATSER).
 * GET /modulo-pesquisa-preco/3_consultarServico
 */
async function consultarPrecoServico(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  if (!params.codigoItemCatalogo) {
    const err = new Error('Parâmetro obrigatório: codigoItemCatalogo');
    err.statusCode = 400;
    throw err;
  }
  console.log(`[PRICE][QUERY] codigoItemCatalogo=${params.codigoItemCatalogo} tipo=servico`);
  const result = await call({
    tag: '[PRICE][QUERY]',
    domain: 'pesquisaPreco',
    operation: 'servico',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });

  return attachNormalizedCollection(result, 'price-record', normalizePriceRecord);
}

/**
 * Consulta detalhe de preço de serviço.
 * GET /modulo-pesquisa-preco/4_consultarServicoDetalhe
 */
async function consultarPrecoServicoDetalhe(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  if (!params.codigoItemCatalogo) {
    const err = new Error('Parâmetro obrigatório: codigoItemCatalogo');
    err.statusCode = 400;
    throw err;
  }
  const result = await call({
    tag: '[PRICE][DETAIL]',
    domain: 'pesquisaPreco',
    operation: 'servicoDetalhe',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });

  return attachNormalizedCollection(result, 'price-record', normalizePriceRecord);
}

// ─────────────────────────────────────────────────────────────────────────────
// UASG — Unidades Administrativas de Serviços Gerais
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta UASGs.
 *
 * Parâmetros aceitos (API oficial):
 *   codigoUasg, usoSisg, cnpjCpfOrgao, cnpjCpfOrgaoVinculado, cnpjCpfOrgaoSuperior
 *   siglaUf, statusUasg, pagina, tamanhoPagina
 *
 * GET /modulo-uasg/1_consultarUasg
 */
async function consultarUasg(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  console.log(`[UASG][QUERY] codigoUasg=${params.codigoUasg || ''} siglaUf=${params.siglaUf || ''}`);
  const result = await call({
    tag: '[UASG][QUERY]',
    domain: 'uasgOrgao',
    operation: 'consulta',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });

  return attachNormalizedCollection(result, 'uasg-profile', normalizeUasgProfile);
}

/**
 * Consulta órgãos.
 *
 * Parâmetros aceitos:
 *   cnpjCpfOrgao, statusOrgao, siglaUf, pagina, tamanhoPagina
 *
 * GET /modulo-uasg/2_consultarOrgao
 */
async function consultarOrgao(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  console.log(`[UASG][QUERY] tipo=orgao cnpjCpfOrgao=${params.cnpjCpfOrgao || ''}`);
  const result = await call({
    tag: '[UASG][QUERY]',
    domain: 'uasgOrgao',
    operation: 'orgao',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });

  return attachNormalizedCollection(result, 'orgao-profile', normalizeOrgaoProfile);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORNECEDOR — Pesquisa de fornecedores cadastrados
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta fornecedores.
 *
 * Parâmetros aceitos (API oficial):
 *   cnpj, cpf, naturezaJuridicaId, porteEmpresaId, codigoCnae
 *   ativo (default: true)
 *   pagina, tamanhoPagina
 *
 * GET /modulo-fornecedor/1_consultarFornecedor
 */
async function consultarFornecedor(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  console.log(`[SUPPLIER][QUERY] cnpj=${params.cnpj || ''} cpf=${params.cpf || ''} ativo=${params.ativo ?? 'true'}`);
  const result = await call({
    tag: '[SUPPLIER][QUERY]',
    domain: 'fornecedor',
    operation: 'consulta',
    params: { ativo: 'true', ...params },
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });

  return attachNormalizedCollection(result, 'supplier-profile', normalizeSupplierProfile);
}

// ─────────────────────────────────────────────────────────────────────────────
// PNCP / CONTRATAÇÕES — Lei 14.133/2021
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta contratações PNCP (Lei 14.133/2021).
 * GET /modulo-contratacoes/1_consultarContratacoes_PNCP_14133
 */
async function consultarContratacoesPncp(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  return call({
    tag: '[GOV_GATEWAY][REQUEST]',
    domain: 'contratacoes',
    operation: 'consulta',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

async function consultarItensContratacoesPncp(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  return call({
    tag: '[GOV_GATEWAY][REQUEST]',
    domain: 'contratacoes',
    operation: 'itens',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

async function consultarResultadosItensContratacoesPncp(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  return call({
    tag: '[GOV_GATEWAY][REQUEST]',
    domain: 'contratacoes',
    operation: 'resultadosItens',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

function normalizeArpIntervalParams(params = {}) {
  const normalizedParams = { ...params };

  if (normalizedParams.dataVigenciaInicialMin === undefined && normalizedParams.dataVigenciaInicial !== undefined) {
    normalizedParams.dataVigenciaInicialMin = normalizedParams.dataVigenciaInicial;
  }

  if (normalizedParams.dataVigenciaInicialMax === undefined && normalizedParams.dataVigenciaFinal !== undefined) {
    normalizedParams.dataVigenciaInicialMax = normalizedParams.dataVigenciaFinal;
  }

  delete normalizedParams.dataVigenciaInicial;
  delete normalizedParams.dataVigenciaFinal;

  return normalizedParams;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARP — Atas de Registro de Preços
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta cabeçalhos de ARPs.
 *
 * Parâmetros obrigatórios: dataVigenciaInicialMin, dataVigenciaInicialMax
 * Parâmetros opcionais: codigoUnidadeGerenciadora, codigoModalidadeCompra,
 *   numeroAtaRegistroPreco, dataAssinaturaInicial, dataAssinaturaFinal
 * Compatibilidade: aceita aliases legados dataVigenciaInicial/dataVigenciaFinal
 *
 * GET /modulo-arp/1_consultarARP
 */
async function consultarArp(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  const normalizedParams = normalizeArpIntervalParams(params);

  if (!normalizedParams.dataVigenciaInicialMin || !normalizedParams.dataVigenciaInicialMax) {
    const err = new Error('Parâmetros obrigatórios para ARP: dataVigenciaInicialMin e dataVigenciaInicialMax');
    err.statusCode = 400;
    throw err;
  }

  return call({
    tag: '[GOV_GATEWAY][REQUEST]',
    domain: 'arp',
    operation: 'consulta',
    params: normalizedParams,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

/**
 * Consulta itens de ARP.
 * Parâmetros obrigatórios: dataVigenciaInicialMin, dataVigenciaInicialMax
 * Compatibilidade: aceita aliases legados dataVigenciaInicial/dataVigenciaFinal
 * GET /modulo-arp/2_consultarARPItem
 */
async function consultarArpItem(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  const normalizedParams = normalizeArpIntervalParams(params);

  if (!normalizedParams.dataVigenciaInicialMin || !normalizedParams.dataVigenciaInicialMax) {
    const err = new Error('Parâmetros obrigatórios para ARP itens: dataVigenciaInicialMin e dataVigenciaInicialMax');
    err.statusCode = 400;
    throw err;
  }

  return call({
    tag: '[GOV_GATEWAY][REQUEST]',
    domain: 'arp',
    operation: 'item',
    params: normalizedParams,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRATOS — Contratos firmados
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta contratos.
 *
 * Parâmetros obrigatórios: dataVigenciaInicialMin, dataVigenciaInicialMax
 * GET /modulo-contratos/1_consultarContratos
 */
async function consultarContratos(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  if (!params.dataVigenciaInicialMin || !params.dataVigenciaInicialMax) {
    const err = new Error('Parâmetros obrigatórios para Contratos: dataVigenciaInicialMin e dataVigenciaInicialMax');
    err.statusCode = 400;
    throw err;
  }
  return call({
    tag: '[GOV_GATEWAY][REQUEST]',
    domain: 'contratos',
    operation: 'consulta',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

/**
 * Consulta itens de contratos.
 * GET /modulo-contratos/2_consultarContratosItem
 */
async function consultarItensContratos(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  if (!params.dataVigenciaInicialMin || !params.dataVigenciaInicialMax) {
    const err = new Error(
      'Parâmetros obrigatórios para itens de Contratos: dataVigenciaInicialMin e dataVigenciaInicialMax'
    );
    err.statusCode = 400;
    throw err;
  }
  return call({
    tag: '[GOV_GATEWAY][REQUEST]',
    domain: 'contratos',
    operation: 'item',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGADO — Sistema ComprasNet (pré Lei 14.133)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta licitações do sistema legado.
 *
 * Parâmetros obrigatórios: data_publicacao_inicial, data_publicacao_final (YYYY-MM-DD)
 * GET /modulo-legado/1_consultarLicitacao
 */
async function consultarLicitacoesLegado(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 20, buscarTodasPaginas = false, maxPaginas } = paginacao;
  if (!params.data_publicacao_inicial || !params.data_publicacao_final) {
    const err = new Error('Parâmetros obrigatórios: data_publicacao_inicial e data_publicacao_final (YYYY-MM-DD)');
    err.statusCode = 400;
    throw err;
  }
  return call({
    tag: '[GOV_GATEWAY][REQUEST]',
    domain: 'legado',
    operation: 'licitacoes',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

/**
 * Consulta itens de licitações do sistema legado.
 *
 * Parâmetros obrigatórios: modalidade (CRÍTICO — API retorna erro sem este parâmetro)
 *
 * AVISO: Este endpoint retorna até 3.5 milhões de registros sem filtros adicionais.
 * Sempre use tamanhoPagina=500 e envie filtros específicos para volume controlável.
 *
 * GET /modulo-legado/2_consultarItemLicitacao
 */
async function consultarItensLicitacaoLegado(params = {}, paginacao = {}, context = {}) {
  const { pagina = 1, tamanhoPagina = 500, buscarTodasPaginas = false, maxPaginas } = paginacao;
  if (!params.modalidade) {
    const err = new Error(
      'Parâmetro obrigatório: modalidade (necessário para /modulo-legado/2_consultarItemLicitacao)'
    );
    err.statusCode = 400;
    throw err;
  }
  return call({
    tag: '[GOV_GATEWAY][REQUEST]',
    domain: 'legado',
    operation: 'itens',
    params,
    pagina,
    tamanhoPagina,
    buscarTodasPaginas,
    maxPaginas,
    context
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────

async function health(context = {}) {
  return _client.health(context);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // CATMAT
  consultarGrupoMaterial,
  consultarClasseMaterial,
  consultarPdmMaterial,
  consultarItemMaterial,
  consultarMaterialNaturezaDespesa,
  consultarMaterialUnidadeFornecimento,
  consultarMaterialCaracteristicas,

  // CATSER
  consultarGrupoServico,
  consultarClasseServico,
  consultarItemServico,

  // Pesquisa de Preço
  consultarPrecoMaterial,
  consultarPrecoMaterialDetalhe,
  consultarPrecoServico,
  consultarPrecoServicoDetalhe,

  // UASG
  consultarUasg,
  consultarOrgao,

  // Fornecedor
  consultarFornecedor,

  // PNCP / Contratações
  consultarContratacoesPncp,
  consultarItensContratacoesPncp,
  consultarResultadosItensContratacoesPncp,

  // ARP
  consultarArp,
  consultarArpItem,

  // Contratos
  consultarContratos,
  consultarItensContratos,

  // Legado
  consultarLicitacoesLegado,
  consultarItensLicitacaoLegado,

  // Health
  health
};
