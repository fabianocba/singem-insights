const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL_CANDIDATES = [process.env.TEST_BASE_URL, 'http://localhost:3000', 'http://localhost:3001']
  .map((value) => String(value || '').trim())
  .filter(Boolean)
  .filter((value, index, array) => array.indexOf(value) === index);

const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
const HAS_AUTH_TOKEN = Boolean(TEST_AUTH_TOKEN);
let resolvedBaseUrl = null;
let resolveAttempted = false;

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
      // tenta a próxima URL
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

async function request(path, options = {}) {
  const baseUrl = await resolveBaseUrl();
  if (!baseUrl) {
    throw new Error('ALMOXARIFADO_CONTRACT_TEST_SERVER_UNAVAILABLE');
  }

  const headers = {
    Accept: 'application/json'
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.useAuth !== false && TEST_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${TEST_AUTH_TOKEN}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  return { response, body };
}

function assertSuccessEnvelope(body) {
  assert.equal(typeof body, 'object');
  assert.equal(body.status, 'success');
  assert.ok(body.requestId !== undefined);
  assert.ok(body.timestamp);
}

function assertAuthDenied(response, body) {
  assert.equal(response.status, 401);
  assert.equal(typeof body, 'object');
  assert.ok(body?.erro);
}

test('meta do almoxarifado exige autenticação', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body } = await request('/api/almoxarifado/meta', { useAuth: false });
  assertAuthDenied(response, body);
});

const testIfAuth = HAS_AUTH_TOKEN ? test : test.skip;

testIfAuth('fluxo autenticado do almoxarifado valida contratos principais', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const contaCodigo = `ALMX-${suffix}`.slice(0, 30);
  const itemDescricao = `Item de contrato almox ${suffix}`;
  const notaNumero = String(Date.now()).slice(-9);

  const metaResult = await request('/api/almoxarifado/meta');
  assert.equal(metaResult.response.status, 200);
  assertSuccessEnvelope(metaResult.body);
  assert.ok(Array.isArray(metaResult.body.data?.movement_types));
  assert.ok(Array.isArray(metaResult.body.data?.contas_contabeis));

  const contaResult = await request('/api/almoxarifado/contas-contabeis', {
    method: 'POST',
    body: {
      codigo: contaCodigo,
      descricao: `Conta de teste ${suffix}`,
      categoria: 'consumo'
    }
  });

  assert.equal(contaResult.response.status, 201);
  assertSuccessEnvelope(contaResult.body);

  const contaId = contaResult.body.data.id;
  assert.equal(typeof contaId, 'number');

  const itemResult = await request('/api/almoxarifado/itens', {
    method: 'POST',
    body: {
      codigo_interno: `ITEM-${suffix}`.slice(0, 40),
      descricao: itemDescricao,
      descricao_resumida: 'Item de teste automatizado',
      catmat_codigo: `CAT-${String(Date.now()).slice(-6)}`,
      catmat_descricao: 'Material de expediente de teste contratual',
      unidade: 'UN',
      grupo: 'Contrato',
      subgrupo: 'Teste automatizado',
      conta_contabil_id: contaId,
      estoque_minimo: 2,
      ponto_reposicao: 3,
      localizacao: 'Ala de testes',
      status: 'ativo',
      imagens: []
    }
  });

  assert.equal(itemResult.response.status, 201);
  assertSuccessEnvelope(itemResult.body);

  const itemId = itemResult.body.data.id;
  assert.equal(typeof itemId, 'number');

  const notaResult = await request('/api/almoxarifado/notas-entrada', {
    method: 'POST',
    body: {
      numero: notaNumero,
      serie: '1',
      data_emissao: '2026-01-15',
      data_entrada: '2026-01-16',
      fornecedor: `Fornecedor teste ${suffix}`,
      cnpj_fornecedor: '12345678000190',
      valor_total: 150,
      tipo: 'entrada',
      observacoes: 'Carga automatizada de contrato',
      itens: [
        {
          material_id: itemId,
          item_numero: 1,
          descricao_nf: itemDescricao,
          quantidade: 10,
          valor_unitario: 15,
          conta_contabil_id: contaId
        }
      ]
    }
  });

  assert.equal(notaResult.response.status, 201);
  assertSuccessEnvelope(notaResult.body);

  const solicitacaoResult = await request('/api/almoxarifado/solicitacoes', {
    method: 'POST',
    body: {
      setor: 'Tecnologia',
      solicitante: 'Teste de Contrato',
      prioridade: 'alta',
      centro_custo: 'CC-ALMOX-01',
      observacoes: 'Fluxo automatizado de validação',
      itens: [
        {
          item_id: itemId,
          quantidade: 2
        }
      ]
    }
  });

  assert.equal(solicitacaoResult.response.status, 201);
  assertSuccessEnvelope(solicitacaoResult.body);

  const solicitacaoId = solicitacaoResult.body.data.id;

  const atenderResult = await request(`/api/almoxarifado/solicitacoes/${solicitacaoId}/status`, {
    method: 'PATCH',
    body: {
      status: 'atendida',
      observacoes: 'Atendimento automatizado para contrato',
      itens: [
        {
          item_id: itemId,
          quantidade_atendida: 2
        }
      ]
    }
  });

  assert.equal(atenderResult.response.status, 200);
  assertSuccessEnvelope(atenderResult.body);
  assert.equal(atenderResult.body.data.status, 'atendida');

  const itensResult = await request('/api/almoxarifado/itens?q=contrato&limit=5');
  assert.equal(itensResult.response.status, 200);
  assertSuccessEnvelope(itensResult.body);
  assert.ok(Array.isArray(itensResult.body.data));
  assert.ok(itensResult.body.meta);

  const movimentosResult = await request(`/api/almoxarifado/movimentacoes?item_id=${itemId}&limit=10`);
  assert.equal(movimentosResult.response.status, 200);
  assertSuccessEnvelope(movimentosResult.body);
  assert.ok(Array.isArray(movimentosResult.body.data));
  assert.ok(movimentosResult.body.data.length >= 2);

  const dashboardResult = await request('/api/almoxarifado/dashboard');
  assert.equal(dashboardResult.response.status, 200);
  assertSuccessEnvelope(dashboardResult.body);
  assert.equal(typeof dashboardResult.body.data.total_itens, 'number');

  const resumoResult = await request('/api/almoxarifado/relatorios/resumo');
  assert.equal(resumoResult.response.status, 200);
  assertSuccessEnvelope(resumoResult.body);
  assert.equal(typeof resumoResult.body.data, 'object');

  const auditoriaResult = await request('/api/almoxarifado/auditoria?limit=10');
  assert.equal(auditoriaResult.response.status, 200);
  assertSuccessEnvelope(auditoriaResult.body);
  assert.ok(Array.isArray(auditoriaResult.body.data));
  assert.ok(auditoriaResult.body.data.some((entry) => entry.entidade_tipo === 'item'));
});
