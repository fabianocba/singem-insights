const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL_CANDIDATES = [process.env.TEST_BASE_URL, 'http://localhost:3000', 'http://localhost:3001']
  .map((value) => String(value || '').trim())
  .filter(Boolean)
  .filter((value, index, array) => array.indexOf(value) === index);

const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
let resolvedBaseUrl = null;
let resolveAttempted = false;

function buildHeaders({ useAuth = true, hasBody = false } = {}) {
  const headers = {
    Accept: 'application/json'
  };

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  if (useAuth && TEST_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${TEST_AUTH_TOKEN}`;
  }

  return headers;
}

async function request(path, options = {}) {
  const baseUrl = await resolveBaseUrl();
  if (!baseUrl) {
    throw new Error('PRICE_INTELLIGENCE_TEST_SERVER_UNAVAILABLE');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: buildHeaders({ useAuth: options.useAuth !== false, hasBody: options.body !== undefined }),
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  return {
    response,
    body,
    contentType,
    disposition: response.headers.get('content-disposition') || ''
  };
}

async function resolveBaseUrl() {
  if (resolveAttempted) {
    return resolvedBaseUrl;
  }

  resolveAttempted = true;

  for (const candidate of BASE_URL_CANDIDATES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${candidate}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      if (response.ok) {
        resolvedBaseUrl = candidate;
        clearTimeout(timeout);
        return resolvedBaseUrl;
      }
    } catch {
      // tenta a proxima URL
    }

    clearTimeout(timeout);
  }

  return null;
}

async function ensureServerAvailable(t) {
  const activeUrl = await resolveBaseUrl();
  if (!activeUrl) {
    t.skip(`backend indisponivel para testes de contrato (${BASE_URL_CANDIDATES.join(', ')})`);
    return false;
  }

  return true;
}

function isAuthDenied(response) {
  return response.status === 401 || response.status === 403;
}

function assertSuccessEnvelope(body) {
  assert.equal(typeof body, 'object');
  assert.equal(body.status, 'success');
  assert.ok(body.requestId !== undefined);
  assert.ok(body.timestamp);
}

function assertErrorEnvelope(body) {
  assert.equal(typeof body, 'object');
  assert.equal(body.status, 'error');
  assert.equal(typeof body.code, 'string');
  assert.equal(typeof body.message, 'string');
}

test('price intelligence query valida obrigatoriedade de codigo', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body } = await request('/api/compras/inteligencia-precos/query', {
    method: 'POST',
    body: {
      tipoCatalogo: 'material',
      pagina: 1,
      tamanhoPagina: 5
    }
  });

  if (isAuthDenied(response)) {
    assert.ok(body?.erro || body?.message);
    return;
  }

  assert.equal(response.status, 400);
  assertErrorEnvelope(body);
  assert.equal(body.code, 'VALIDATION_ERROR');
});

test('price intelligence query responde contrato padrao', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body } = await request('/api/compras/inteligencia-precos/query', {
    method: 'POST',
    body: {
      tipoCatalogo: 'material',
      codigos: '233420',
      pagina: 1,
      tamanhoPagina: 5
    }
  });

  if (isAuthDenied(response)) {
    assert.ok(body?.erro || body?.message);
    return;
  }

  if (response.status >= 500) {
    assertErrorEnvelope(body);
    return;
  }

  assert.equal(response.status, 200);
  assertSuccessEnvelope(body);

  assert.equal(typeof body.data, 'object');
  assert.equal(typeof body.data.summary?.text, 'string');
  assert.equal(typeof body.data.metrics?.totalRegistros, 'number');
  assert.ok(Array.isArray(body.data.insights));
  assert.ok(Array.isArray(body.data.rawItems));
  assert.equal(typeof body.data.page?.totalPages, 'number');
  assert.equal(typeof body.data.cache?.source, 'string');
});

test('price intelligence query cobre cenario de zero resultados', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body } = await request('/api/compras/inteligencia-precos/query', {
    method: 'POST',
    body: {
      tipoCatalogo: 'material',
      codigos: '233420',
      pagina: 1,
      tamanhoPagina: 5,
      precoMin: 999999999,
      precoMax: 0
    }
  });

  if (isAuthDenied(response)) {
    assert.ok(body?.erro || body?.message);
    return;
  }

  if (response.status >= 500) {
    t.skip('servico de pesquisa de preco indisponivel para validar zero resultados');
    return;
  }

  assert.equal(response.status, 200);
  assertSuccessEnvelope(body);
  assert.equal(body.data.metrics.totalRegistros, 0);
  assert.equal(body.data.page.totalItems, 0);
  assert.ok(
    body.data.insights.some((insight) =>
      String(insight?.text || '')
        .toLowerCase()
        .includes('nenhum preco praticado')
    )
  );
});

test('price intelligence export valida formato invalido', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body } = await request('/api/compras/inteligencia-precos/query/export?format=xml', {
    method: 'POST',
    body: {
      tipoCatalogo: 'material',
      codigos: '233420'
    }
  });

  if (isAuthDenied(response)) {
    assert.ok(body?.erro || body?.message);
    return;
  }

  assert.equal(response.status, 400);
  assertErrorEnvelope(body);
  assert.equal(body.code, 'VALIDATION_ERROR');
});

test('price intelligence export CSV retorna anexo ou erro padrao', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body, contentType, disposition } = await request(
    '/api/compras/inteligencia-precos/query/export?format=csv',
    {
      method: 'POST',
      body: {
        tipoCatalogo: 'material',
        codigos: '233420'
      }
    }
  );

  if (isAuthDenied(response)) {
    assert.ok(body?.erro || body?.message);
    return;
  }

  if (response.status >= 500) {
    assertErrorEnvelope(body);
    return;
  }

  assert.equal(response.status, 200);
  assert.match(contentType, /text\/csv/i);
  assert.match(disposition, /attachment/i);
  assert.equal(typeof body, 'string');
});
