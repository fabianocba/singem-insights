const test = require('node:test');
const assert = require('node:assert/strict');

const aiCoreServices = require('../services/ai-core');

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

function loadAiRouter() {
  const routePath = require.resolve('../routes/ai.routes');
  delete require.cache[routePath];
  return require('../routes/ai.routes');
}

function findRouteHandler(router, method, path) {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.[method]);
  assert.ok(layer, `Rota ${method.toUpperCase()} nao encontrada: ${path}`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

test('rota de catalogo rankeado usa catalogSearchService com query e opcoes mapeadas', async () => {
  const originalBuscarMateriaisComRanking = aiCoreServices.catalogSearchService.buscarMateriaisComRanking;
  const captured = {
    query: null,
    options: null,
    context: null
  };

  aiCoreServices.catalogSearchService.buscarMateriaisComRanking = async (query, options, context) => {
    captured.query = query;
    captured.options = options;
    captured.context = context;

    return {
      query,
      totalRegistros: 1,
      rankedItems: [],
      groupedByPdm: []
    };
  };

  try {
    const router = loadAiRouter();
    const handler = findRouteHandler(router, 'post', '/catalog/search');
    const res = createResponseHarness();

    await handler(
      {
        body: {
          query_text: 'papel a4',
          codigoGrupo: '12',
          codigoClasse: '34',
          statusItem: '1',
          pagina: 2,
          tamanhoPagina: 15
        },
        requestId: 'req-ai-catalog-1',
        originalUrl: '/api/ai/catalog/search'
      },
      res,
      (error) => {
        throw error;
      }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload?.status, 'success');
    assert.equal(res.payload?.data?.query, 'papel a4');
    assert.equal(captured.query, 'papel a4');
    assert.deepEqual(captured.options, {
      codigoGrupo: '12',
      codigoClasse: '34',
      statusItem: '1',
      pagina: 2,
      tamanhoPagina: 15
    });
    assert.equal(captured.context?.requestId, 'req-ai-catalog-1');
    assert.equal(captured.context?.routeInterna, '/api/ai/catalog/search');
  } finally {
    aiCoreServices.catalogSearchService.buscarMateriaisComRanking = originalBuscarMateriaisComRanking;
  }
});

test('rota de insight usa reportInsightService sem alterar o contrato existente', async () => {
  const originalGerarInsight = aiCoreServices.reportInsightService.gerarInsight;
  const captured = {
    payload: null,
    context: null
  };

  aiCoreServices.reportInsightService.gerarInsight = async (payload, context) => {
    captured.payload = payload;
    captured.context = context;

    return {
      report_key: payload.report_key,
      summary: 'Resumo sintetico',
      insights: [],
      alerts: [],
      anomalies: [],
      confidence: 0.9,
      cached: false
    };
  };

  try {
    const router = loadAiRouter();
    const handler = findRouteHandler(router, 'post', '/report/summary');
    const res = createResponseHarness();

    await handler(
      {
        body: {
          report_key: 'relatorio_empenhos',
          context_module: 'empenhos',
          data: { total_empenhos: 3 }
        },
        requestId: 'req-ai-report-1',
        originalUrl: '/api/ai/report/summary'
      },
      res,
      (error) => {
        throw error;
      }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload?.status, 'success');
    assert.equal(res.payload?.data?.report_key, 'relatorio_empenhos');
    assert.equal(captured.payload?.report_key, 'relatorio_empenhos');
    assert.equal(captured.context?.requestId, 'req-ai-report-1');
    assert.equal(captured.context?.routeInterna, '/api/ai/report/summary');
  } finally {
    aiCoreServices.reportInsightService.gerarInsight = originalGerarInsight;
  }
});
