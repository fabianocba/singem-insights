const test = require('node:test');
const assert = require('node:assert/strict');

process.env.COMPRASGOV_AUDIT_ENABLED = 'false';
process.env.INTEGRACOES_AUDIT_ENABLED = 'false';

const { config } = require('../config');
const { ComprasGovClient, __testHooks } = require('../integrations/comprasgov/client');

function createHarness() {
  const cacheStore = new Map();
  const client = new ComprasGovClient();

  client.readCache = (domain, key) => cacheStore.get(`${domain}:${key}`) || null;
  client.writeCache = (domain, key, value) => {
    cacheStore.set(`${domain}:${key}`, value);
  };

  return { client, cacheStore };
}

test('requestDomain avanca pagina ao buscar todas as paginas', async () => {
  const { client } = createHarness();
  const pagesRequested = [];

  const makeRows = (prefix, count) =>
    Array.from({ length: count }, (_, index) => ({
      id: `${prefix}${index + 1}`
    }));

  const rowsByPage = {
    1: makeRows('1', 10),
    2: makeRows('2', 10),
    3: makeRows('3', 1)
  };

  client.fetchJson = async ({ queryParams }) => {
    const currentPage = Number(queryParams?.pagina || 1);
    pagesRequested.push(currentPage);

    return {
      statusCode: 200,
      data: {
        resultado: rowsByPage[currentPage] || []
      }
    };
  };

  const result = await client.requestDomain({
    domain: 'catalogoMaterial',
    operation: 'itens',
    pagina: 1,
    tamanhoPagina: 10,
    params: { descricaoItem: 'papel' },
    requestId: 'test-paginas',
    buscarTodasPaginas: true,
    maxPaginas: 5
  });

  assert.deepEqual(pagesRequested, [1, 2, 3]);
  assert.equal(result.resultado.length, 21);
  assert.equal(result.paginacaoAutomatica.habilitada, true);
  assert.equal(result.paginacaoAutomatica.paginasConsumidas, 3);
});

test('requestDomain separa cache entre modo paginado e modo simples', async () => {
  const { client } = createHarness();
  let fetchCount = 0;

  client.fetchJson = async ({ queryParams }) => {
    fetchCount += 1;
    return {
      statusCode: 200,
      data: {
        resultado: [{ pagina: Number(queryParams?.pagina || 1), item: `R${fetchCount}` }]
      }
    };
  };

  const payloadBase = {
    domain: 'catalogoMaterial',
    operation: 'itens',
    pagina: 1,
    tamanhoPagina: 10,
    params: { descricaoItem: 'caneta' },
    requestId: 'test-cache-modes'
  };

  await client.requestDomain({
    ...payloadBase,
    buscarTodasPaginas: true,
    maxPaginas: 4
  });

  await client.requestDomain({
    ...payloadBase,
    buscarTodasPaginas: false
  });

  await client.requestDomain({
    ...payloadBase,
    buscarTodasPaginas: false
  });

  assert.equal(fetchCount, 2);
});

test('waitRateLimit serializa chamadas concorrentes entre instancias', async () => {
  const originalRateLimitMs = config.comprasGov.rateLimitMs;
  const marks = [];

  __testHooks.resetRateLimitRuntime();
  config.comprasGov.rateLimitMs = 20;

  try {
    await Promise.all(
      [new ComprasGovClient(), new ComprasGovClient(), new ComprasGovClient()].map(async (client) => {
        await client.waitRateLimit();
        marks.push(Date.now());
      })
    );
  } finally {
    config.comprasGov.rateLimitMs = originalRateLimitMs;
    __testHooks.resetRateLimitRuntime();
  }

  marks.sort((left, right) => left - right);

  assert.equal(marks.length, 3);
  assert.ok(marks[1] - marks[0] >= 15, `intervalo insuficiente entre chamada 1 e 2: ${marks[1] - marks[0]}ms`);
  assert.ok(marks[2] - marks[1] >= 15, `intervalo insuficiente entre chamada 2 e 3: ${marks[2] - marks[1]}ms`);
});

test('comprasApiClient respeita timeout configurado via namespace COMPRASGOV', async () => {
  const comprasApiClientPath = require.resolve('../services/comprasApiClient');
  const configPath = require.resolve('../config');
  const originalFetch = global.fetch;
  const originalApiTimeout = process.env.COMPRAS_API_TIMEOUT_MS;
  const originalGovTimeout = process.env.COMPRASGOV_TIMEOUT_MS;
  const originalApiRetries = process.env.COMPRAS_API_MAX_RETRIES;
  const originalGovRetries = process.env.COMPRASGOV_MAX_RETRIES;

  delete process.env.COMPRAS_API_TIMEOUT_MS;
  process.env.COMPRASGOV_TIMEOUT_MS = '32000';
  delete process.env.COMPRAS_API_MAX_RETRIES;
  process.env.COMPRASGOV_MAX_RETRIES = '0';

  delete require.cache[comprasApiClientPath];
  delete require.cache[configPath];

  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    const err = new Error('abort');
    err.name = 'AbortError';
    throw err;
  };

  try {
    const comprasApiClient = require('../services/comprasApiClient');

    await assert.rejects(
      comprasApiClient.get('/modulo-arp/1_consultarARP'),
      (error) => {
        assert.equal(error.code, 'COMPRAS_TIMEOUT');
        assert.match(error.message, /32000 ms/);
        assert.equal(attempts, 1);
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;

    if (originalApiTimeout === undefined) {
      delete process.env.COMPRAS_API_TIMEOUT_MS;
    } else {
      process.env.COMPRAS_API_TIMEOUT_MS = originalApiTimeout;
    }

    if (originalGovTimeout === undefined) {
      delete process.env.COMPRASGOV_TIMEOUT_MS;
    } else {
      process.env.COMPRASGOV_TIMEOUT_MS = originalGovTimeout;
    }

    if (originalApiRetries === undefined) {
      delete process.env.COMPRAS_API_MAX_RETRIES;
    } else {
      process.env.COMPRAS_API_MAX_RETRIES = originalApiRetries;
    }

    if (originalGovRetries === undefined) {
      delete process.env.COMPRASGOV_MAX_RETRIES;
    } else {
      process.env.COMPRASGOV_MAX_RETRIES = originalGovRetries;
    }

    delete require.cache[comprasApiClientPath];
    delete require.cache[configPath];
  }
});
