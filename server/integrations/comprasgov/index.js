const { ComprasGovClient, parseBoolean, sanitizeParams } = require('./client');

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
    return client.health(buildContext(req));
  },

  async searchItemMaterial(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return client.requestDomain({
      domain: 'catalogoMaterial',
      operation: 'itens',
      params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
  },

  async getGruposMaterial(req) {
    return client.requestDomain({
      domain: 'catalogoMaterial',
      operation: 'grupos',
      pagina: 1,
      tamanhoPagina: 100,
      params: cleanQuery(req.query),
      ...buildContext(req)
    });
  },

  async getClassesMaterial(req) {
    return client.requestDomain({
      domain: 'catalogoMaterial',
      operation: 'classes',
      pagina: 1,
      tamanhoPagina: 100,
      params: cleanQuery(req.query),
      ...buildContext(req)
    });
  },

  async searchItemServico(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return client.requestDomain({
      domain: 'catalogoServico',
      operation: 'itens',
      params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
  },

  async getGruposServico(req) {
    return client.requestDomain({
      domain: 'catalogoServico',
      operation: 'grupos',
      pagina: 1,
      tamanhoPagina: 100,
      params: cleanQuery(req.query),
      ...buildContext(req)
    });
  },

  async getClassesServico(req) {
    return client.requestDomain({
      domain: 'catalogoServico',
      operation: 'classes',
      pagina: 1,
      tamanhoPagina: 100,
      params: cleanQuery(req.query),
      ...buildContext(req)
    });
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

    const result = await client.requestDomain({
      domain: 'pesquisaPreco',
      operation: 'material',
      params: filtros,
      ...pagination,
      ...fetchAll,
      ...context
    });

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

    const result = await client.requestDomain({
      domain: 'pesquisaPreco',
      operation: 'servico',
      params: filtros,
      ...pagination,
      ...fetchAll,
      ...context
    });

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

    return client.requestDomain({
      domain: 'uasgOrgao',
      operation: 'consulta',
      params: cleanQuery(
        {
          statusUasg: req.query.statusUasg ?? 'true',
          ...req.query
        },
        ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']
      ),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
  },

  async getFornecedor(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return client.requestDomain({
      domain: 'fornecedor',
      operation: 'consulta',
      params: cleanQuery(
        {
          ativo: req.query.ativo ?? 'true',
          ...req.query
        },
        ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']
      ),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
  },

  async getContratacoes(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return client.requestDomain({
      domain: 'contratacoes',
      operation: 'consulta',
      params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
  },

  async getArp(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return client.requestDomain({
      domain: 'arp',
      operation: 'consulta',
      params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
  },

  async getContratos(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return client.requestDomain({
      domain: 'contratos',
      operation: 'consulta',
      params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
  },

  async getLegadoLicitacoes(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return client.requestDomain({
      domain: 'legado',
      operation: 'licitacoes',
      params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
  },

  async getLegadoItens(req) {
    const pagination = readPagination(req.query);
    const fetchAll = readFetchAll(req.query);

    return client.requestDomain({
      domain: 'legado',
      operation: 'itens',
      params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
      ...pagination,
      ...fetchAll,
      ...buildContext(req)
    });
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
  }
};
