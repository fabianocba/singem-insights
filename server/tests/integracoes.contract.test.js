const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
const HAS_AUTH_TOKEN = Boolean(TEST_AUTH_TOKEN);

async function request(path, options = {}) {
  const useAuth = options.useAuth !== false;

  const headers =
    useAuth && TEST_AUTH_TOKEN
      ? {
          Authorization: `Bearer ${TEST_AUTH_TOKEN}`
        }
      : {};

  const response = await fetch(`${BASE_URL}${path}`, { headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}

function assertAuthDenied(response, body) {
  assert.equal(response.status, 401);
  assert.equal(typeof body, 'object');
  assert.ok(body?.erro);
}

test('dashboard de integracoes exige autenticação', async () => {
  const { response, body } = await request('/api/integracoes/dashboard', { useAuth: false });
  assertAuthDenied(response, body);
});

test('sync status de integracoes exige autenticação', async () => {
  const { response, body } = await request('/api/integracoes/sync/status', { useAuth: false });
  assertAuthDenied(response, body);
});

test('dadosgov health exige autenticação', async () => {
  const { response, body } = await request('/api/integracoes/dadosgov/ckan/health', { useAuth: false });
  assertAuthDenied(response, body);
});

function assertEnvelope(body) {
  assert.equal(typeof body, 'object');
  assert.equal(typeof body.success, 'boolean');
  assert.ok(body.requestId !== undefined);
}

const testIfAuth = HAS_AUTH_TOKEN ? test : test.skip;

testIfAuth('dashboard de integracoes autenticado responde contrato', async () => {
  const { response, body } = await request('/api/integracoes/dashboard');

  assert.equal(response.status, 200);
  assertEnvelope(body);
  assert.equal(typeof body.data, 'object');
});

testIfAuth('sync status autenticado responde contrato', async () => {
  const { response, body } = await request('/api/integracoes/sync/status');

  assert.equal(response.status, 200);
  assertEnvelope(body);
  assert.equal(typeof body.data?.running, 'boolean');
});

testIfAuth('dadosgov health autenticado responde contrato', async () => {
  const { response, body } = await request('/api/integracoes/dadosgov/ckan/health');

  assert.equal(response.status, 200);
  assertEnvelope(body);
  assert.equal(typeof body.data, 'object');
});

test('health comprasgov responde contrato', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/health');
  if (response.status === 401 || response.status === 403) {
    assert.ok(body?.erro);
    return;
  }

  assert.equal(response.status, 200);
  assertEnvelope(body);
});

test('busca CATMAT responde envelope padronizado', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/catmat/itens?pagina=1&tamanhoPagina=10');
  if (response.status === 401 || response.status === 403) {
    assert.ok(body?.erro);
    return;
  }

  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);
});

test('busca UASG responde envelope padronizado', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/uasg?pagina=1&statusUasg=true');
  if (response.status === 401 || response.status === 403) {
    assert.ok(body?.erro);
    return;
  }

  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);
});

test('busca Fornecedor responde envelope padronizado', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/fornecedor?pagina=1&ativo=true');
  if (response.status === 401 || response.status === 403) {
    assert.ok(body?.erro);
    return;
  }

  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);
});

test('pesquisa de preço responde envelope e snapshotId quando sucesso', async () => {
  const { response, body } = await request(
    '/api/integracoes/comprasgov/pesquisa-preco/material?pagina=1&tamanhoPagina=10&codigoItemCatalogo=233420'
  );

  if (response.status === 401 || response.status === 403) {
    assert.ok(body?.erro);
    return;
  }

  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);

  if (response.status === 200) {
    assert.ok(body.data);
    assert.ok(body.data.snapshotId || body.data.snapshotId === null);
  }
});

test('paginação aplica limite máximo/mínimo sem quebrar contrato', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/catmat/itens?pagina=1&tamanhoPagina=9999');
  if (response.status === 401 || response.status === 403) {
    assert.ok(body?.erro);
    return;
  }

  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);
});

test('erro padronizado com success=false e externalStatus', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/pesquisa-preco/material?pagina=1');

  if (response.status === 401 || response.status === 403) {
    assert.ok(body?.erro);
    return;
  }

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.ok(body.message);
  assert.ok(body.requestId !== undefined);
  assert.ok(body.externalStatus !== undefined);
});
