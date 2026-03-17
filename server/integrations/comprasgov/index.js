const { ComprasGovClient, parseBoolean, sanitizeParams } = require('./client');
const gateway = require('../../services/gov-api/comprasGovGatewayService');

const client = new ComprasGovClient();

function readPagination(query = {}) {
  return {
    pagina: query.pagina,
    tamanhoPagina: query.tamanhoPagina || query.limite || query.limit
  };
}

function readFetchAll(query = {}) {
  return {
    buscarTodasPaginas: parseBoolean(query.buscarTodasPaginas),
    maxPaginas: query.maxPaginas
  };
}

function buildContext(req) {
  return {
    requestId: req.requestId || null,
    user: req.user || null,
    routeInterna: req.originalUrl || req.url || '/api/integracoes/comprasgov'
  };
}

function cleanQuery(query = {}, blocked = []) {
  const filtered = { ...query };
  for (const key of blocked) {
    delete filtered[key];
  }
  return sanitizeParams(filtered);
}

function normalizeArpFilters(query = {}) {
  const filters = cleanQuery(query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas', 'variant']);

  if (filters.dataVigenciaInicial && !filters.dataVigenciaInicialMin) {
    filters.dataVigenciaInicialMin = filters.dataVigenciaInicial;
  }

  if (filters.dataVigenciaFinal && !filters.dataVigenciaInicialMax) {
    filters.dataVigenciaInicialMax = filters.dataVigenciaFinal;
  }

  delete filters.dataVigenciaInicial;
  delete filters.dataVigenciaFinal;

  return filters;
}

function assertRequired(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    const error = new Error(`Parâmetro obrigatório ausente: ${fieldName}`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
}

module.exports = {
  async health(req) {
    return gateway.health(buildContext(req));
  },

  async searchItemMaterial(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return gateway.consultarItemMaterial(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getGruposMaterial(req) {
    return gateway.consultarGrupoMaterial(cleanQuery(req.query), buildContext(req));
  },

  async getClassesMaterial(req) {
    return gateway.consultarClasseMaterial(cleanQuery(req.query), buildContext(req));
  },

  async getPdmMaterial(req) {
    return gateway.consultarPdmMaterial(cleanQuery(req.query), buildContext(req));
  },

  async getMaterialNaturezaDespesa(req) {
    return gateway.consultarMaterialNaturezaDespesa(cleanQuery(req.query), buildContext(req));
  },

  async getMaterialUnidadeFornecimento(req) {
    return gateway.consultarMaterialUnidadeFornecimento(cleanQuery(req.query), buildContext(req));
  },

  async getMaterialCaracteristicas(req) {
    return gateway.consultarMaterialCaracteristicas(cleanQuery(req.query), buildContext(req));
  },

  async searchItemServico(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return gateway.consultarItemServico(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getGruposServico(req) {
    return gateway.consultarGrupoServico(cleanQuery(req.query), buildContext(req));
  },

  async getClassesServico(req) {
    return gateway.consultarClasseServico(cleanQuery(req.query), buildContext(req));
  },

  async consultaPesquisaPrecoMaterial(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);
    const filtros = cleanQuery(req.query, [
      'pagina',
      'tamanhoPagina',
      'limite',
      'limit',
      'buscarTodasPaginas',
      'maxPaginas'
    ]);
    const context = buildContext(req);
    assertRequired(filtros.codigoItemCatalogo, 'codigoItemCatalogo');

    const result = await gateway.consultarPrecoMaterial(filtros, { ...pagination, ...fetchAll }, context);

    await client.snapshotPesquisaPreco({
      ...context,
      route: 'pesquisa-preco/material',
      filtros,
      resultado: result
    });

    return result;
  },

  async consultaPesquisaPrecoServico(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);
    const filtros = cleanQuery(req.query, [
      'pagina',
      'tamanhoPagina',
      'limite',
      'limit',
      'buscarTodasPaginas',
      'maxPaginas'
    ]);
    const context = buildContext(req);
    assertRequired(filtros.codigoItemCatalogo, 'codigoItemCatalogo');

    const result = await gateway.consultarPrecoServico(filtros, { ...pagination, ...fetchAll }, context);

    await client.snapshotPesquisaPreco({
      ...context,
      route: 'pesquisa-preco/servico',
      filtros,
      resultado: result
    });

    return result;
  },

  async getUasg(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return gateway.consultarUasg(
      cleanQuery(
        {
          statusUasg: req.query.statusUasg ?? 'true',
          ...req.query
        },
        ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']
      ),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getFornecedor(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return gateway.consultarFornecedor(
      cleanQuery(
        {
          ativo: req.query.ativo ?? 'true',
          ...req.query
        },
        ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']
      ),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getContratacoes(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return gateway.consultarContratacoesPncp(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getContratacoesItens(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return gateway.consultarItensContratacoesPncp(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getContratacoesResultadosItens(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return gateway.consultarResultadosItensContratacoesPncp(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getArp(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);
    const variant = (req.query.variant || 'consulta').toLowerCase();
    const filters = normalizeArpFilters(req.query);
    const context = buildContext(req);

    // Validar parâmetros obrigatórios por variante
    if (variant === 'consulta' || variant === 'item') {
      if (!filters.dataVigenciaInicialMin || !filters.dataVigenciaInicialMax) {
        const error = new Error('Parâmetros obrigatórios para ARP: dataVigenciaInicialMin e dataVigenciaInicialMax');
        error.code = 'VALIDATION_ERROR';
        error.statusCode = 400;
        throw error;
      }
    }
    if (variant === 'consultaid' || variant === 'itemid') {
      if (!req.query.numeroControlePncpAta) {
        const error = new Error('Parâmetro obrigatório para ARP por ID: numeroControlePncpAta');
        error.code = 'VALIDATION_ERROR';
        error.statusCode = 400;
        throw error;
      }
    }

    // Mapear variante para operation correta
    const operationMap = {
      consulta: 'consulta',
      item: 'item',
      consultaid: 'consultaId',
      itemid: 'itemId'
    };
    const operation = operationMap[variant] || 'consulta';

    if (operation === 'consulta') {
      return gateway.consultarArp(filters, { ...pagination, ...fetchAll }, context);
    }

    if (operation === 'item') {
      return gateway.consultarArpItem(filters, { ...pagination, ...fetchAll }, context);
    }

    return client.requestDomain({
      domain: 'arp',
      operation,
      params: filters,
      ...pagination,
      ...fetchAll,
      ...context
    });
  },

  async getContratos(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    // Validar parâmetros obrigatórios
    if (!req.query.dataVigenciaInicialMin || !req.query.dataVigenciaInicialMax) {
      const error = new Error('Parâmetros obrigatórios para Contratos: dataVigenciaInicialMin e dataVigenciaInicialMax');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    return gateway.consultarContratos(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getContratosItem(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    // Validar parâmetros obrigatórios
    if (!req.query.dataVigenciaInicialMin || !req.query.dataVigenciaInicialMax) {
      const error = new Error('Parâmetros obrigatórios para itens de Contratos: dataVigenciaInicialMin e dataVigenciaInicialMax');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    return gateway.consultarItensContratos(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getLegadoLicitacoes(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    // VALIDAÇÃO: datas são obrigatórias para licitações
    // Conforme spec real https://documenter.getpostman.com/view/13166820/2sA3XJjPpR
    if (!req.query.data_publicacao_inicial || !req.query.data_publicacao_final) {
      throw new Error('Parâmetros obrigatórios ausentes: data_publicacao_inicial e data_publicacao_final (YYYY-MM-DD)');
    }

    return gateway.consultarLicitacoesLegado(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getLegadoItens(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    // VALIDAÇÃO CRÍTICA: modalidade é obrigatória na API real
    // Confirmado em https://documenter.getpostman.com/view/13166820/2sA3XJjPpR
    if (!req.query.modalidade) {
      throw new Error('Parâmetro obrigatório ausente: modalidade (requerido para /modulo-legado/2_consultarItemLicitacao)');
    }

    return gateway.consultarItensLicitacaoLegado(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getOcds(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return client.requestDomain({
      domain: 'ocds',
      operation: 'consulta',
      params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
  },

  async getOrgao(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return gateway.consultarOrgao(
      cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      { ...pagination, ...fetchAll },
      buildContext(req)
    );
  },

  async getPesquisaPrecoMaterialDetalhe(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);
    const filtros = cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']);
    assertRequired(filtros.codigoItemCatalogo, 'codigoItemCatalogo');

    return gateway.consultarPrecoMaterialDetalhe(filtros, { ...pagination, ...fetchAll }, buildContext(req));
  },

  async getPesquisaPrecoServicoDetalhe(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);
    const filtros = cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']);
    assertRequired(filtros.codigoItemCatalogo, 'codigoItemCatalogo');

    return gateway.consultarPrecoServicoDetalhe(filtros, { ...pagination, ...fetchAll }, buildContext(req));
  }
};
