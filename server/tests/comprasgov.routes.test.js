const test = require('node:test');
const assert = require('node:assert/strict');

process.env.COMPRASGOV_AUDIT_ENABLED = 'false';
process.env.INTEGRACOES_AUDIT_ENABLED = 'false';

const gateway = require('../services/gov-api/comprasGovGatewayService');
const comprasGov = require('../integrations/comprasgov');

function createResponseHarness() {
  const state = {
    statusCode: 200,
    payload: null
  };

  return {
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.payload = payload;
      return this;
    },
    get statusCode() {
      return state.statusCode;
    },
    get payload() {
      return state.payload;
    }
  };
}

function loadComprasRouter() {
  const routePath = require.resolve('../routes/compras.routes');
  delete require.cache[routePath];
  return require('../routes/compras.routes');
}

function findGetHandler(router, path) {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.get);
  assert.ok(layer, `Rota GET nao encontrada: ${path}`);
  return layer.route.stack[0].handle;
}

test('proxy publico ignora flags internas como unico filtro', async () => {
  const originalConsultarPrecoMaterial = gateway.consultarPrecoMaterial;
  let called = false;

  gateway.consultarPrecoMaterial = async () => {
    called = true;
    return { resultado: [] };
  };

  try {
    const router = loadComprasRouter();
    const handler = findGetHandler(router, '/modulo-pesquisa-preco/material');
    const res = createResponseHarness();

    await handler(
      {
        query: { buscarTodasPaginas: 'true', maxPaginas: '5' },
        headers: {},
        originalUrl: '/api/compras/modulo-pesquisa-preco/material'
      },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.payload?.errorCode, 'EMPTY_FILTER');
    assert.equal(called, false);
  } finally {
    gateway.consultarPrecoMaterial = originalConsultarPrecoMaterial;
  }
});

test('proxy publico separa filtros reais de controles internos ao chamar o gateway', async () => {
  const originalConsultarPrecoMaterial = gateway.consultarPrecoMaterial;
  const captured = {
    params: null,
    paginacao: null,
    context: null
  };

  gateway.consultarPrecoMaterial = async (params, paginacao, context) => {
    captured.params = params;
    captured.paginacao = paginacao;
    captured.context = context;

    return {
      resultado: [{ codigoItemCatalogo: params.codigoItemCatalogo }],
      totalRegistros: 1,
      totalPaginas: 1
    };
  };

  try {
    const router = loadComprasRouter();
    const handler = findGetHandler(router, '/modulo-pesquisa-preco/material');
    const res = createResponseHarness();

    await handler(
      {
        query: {
          codigoItemCatalogo: '12345',
          pagina: '2',
          tamanhoPagina: '15',
          buscarTodasPaginas: 'true',
          maxPaginas: '3'
        },
        headers: { 'x-request-id': 'req-proxy-1' },
        originalUrl: '/api/compras/modulo-pesquisa-preco/material'
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(captured.params, { codigoItemCatalogo: '12345' });
    assert.deepEqual(captured.paginacao, {
      pagina: '2',
      tamanhoPagina: '15',
      buscarTodasPaginas: true,
      maxPaginas: '3'
    });
    assert.equal(captured.context?.requestId, 'req-proxy-1');
    assert.equal(captured.context?.routeInterna, '/api/compras/modulo-pesquisa-preco/material');
  } finally {
    gateway.consultarPrecoMaterial = originalConsultarPrecoMaterial;
  }
});

test('endpoint enterprise de detalhe propaga buscarTodasPaginas para o gateway', async () => {
  const originalConsultarPrecoMaterialDetalhe = gateway.consultarPrecoMaterialDetalhe;
  const captured = {
    params: null,
    paginacao: null,
    context: null
  };

  gateway.consultarPrecoMaterialDetalhe = async (params, paginacao, context) => {
    captured.params = params;
    captured.paginacao = paginacao;
    captured.context = context;
    return { resultado: [] };
  };

  try {
    const result = await comprasGov.getPesquisaPrecoMaterialDetalhe({
      query: {
        codigoItemCatalogo: '778899',
        pagina: '1',
        tamanhoPagina: '20',
        buscarTodasPaginas: 'true',
        maxPaginas: '4'
      },
      originalUrl: '/api/integracoes/comprasgov/pesquisa-preco/material/detalhe'
    });

    assert.ok(result);
    assert.deepEqual(captured.params, { codigoItemCatalogo: '778899' });
    assert.deepEqual(captured.paginacao, {
      pagina: '1',
      tamanhoPagina: '20',
      buscarTodasPaginas: true,
      maxPaginas: '4'
    });
    assert.equal(captured.context?.routeInterna, '/api/integracoes/comprasgov/pesquisa-preco/material/detalhe');
  } finally {
    gateway.consultarPrecoMaterialDetalhe = originalConsultarPrecoMaterialDetalhe;
  }
});
