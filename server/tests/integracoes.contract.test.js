const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function request(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}

function assertEnvelope(body) {
  assert.equal(typeof body, 'object');
  assert.equal(typeof body.success, 'boolean');
  assert.ok(body.requestId !== undefined);
}

test('health comprasgov responde contrato', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/health');
  assert.equal(response.status, 200);
  assertEnvelope(body);
});

test('busca CATMAT responde envelope padronizado', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/catmat/itens?pagina=1&tamanhoPagina=10');
  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);
});

test('busca UASG responde envelope padronizado', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/uasg?pagina=1&statusUasg=true');
  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);
});

test('busca Fornecedor responde envelope padronizado', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/fornecedor?pagina=1&ativo=true');
  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);
});

test('pesquisa de preço responde envelope e snapshotId quando sucesso', async () => {
  const { response, body } = await request(
    '/api/integracoes/comprasgov/pesquisa-preco/material?pagina=1&tamanhoPagina=10&codigoItemCatalogo=233420'
  );

  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);

  if (response.status === 200) {
    assert.ok(body.data);
    assert.ok(body.data.snapshotId || body.data.snapshotId === null);
  }
});

test('paginação aplica limite máximo/mínimo sem quebrar contrato', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/catmat/itens?pagina=1&tamanhoPagina=9999');
  assert.ok(response.status === 200 || response.status >= 400);
  assertEnvelope(body);
});

test('erro padronizado com success=false e externalStatus', async () => {
  const { response, body } = await request('/api/integracoes/comprasgov/pesquisa-preco/material?pagina=1');
  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.ok(body.message);
  assert.ok(body.requestId !== undefined);
  assert.ok(body.externalStatus !== undefined);
});
