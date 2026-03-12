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

async function request(path, options = {}) {
  const baseUrl = await resolveBaseUrl();
  if (!baseUrl) {
    throw new Error('AI_CONTRACT_TEST_SERVER_UNAVAILABLE');
  }

  const method = options.method || 'GET';
  const useAuth = options.useAuth !== false;

  const headers = {
    Accept: 'application/json'
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (useAuth && TEST_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${TEST_AUTH_TOKEN}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
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

test('ai health exige autenticacao', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body } = await request('/api/ai/health', { useAuth: false });

  assert.equal(response.status, 401);
  assert.ok(body?.erro);
});

test('ai report summary exige autenticacao', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body } = await request('/api/ai/report/summary', {
    method: 'POST',
    useAuth: false,
    body: {
      report_key: 'relatorio_empenhos',
      context_module: 'empenhos',
      data: {
        total_empenhos: 1
      }
    }
  });

  assert.equal(response.status, 401);
  assert.ok(body?.erro);
});

const testIfAuth = HAS_AUTH_TOKEN ? test : test.skip;

testIfAuth('ai health autenticado responde contrato', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body } = await request('/api/ai/health');

  assert.equal(response.status, 200);
  assertSuccessEnvelope(body);
  assert.equal(typeof body.data, 'object');
  assert.equal(typeof body.data.enabled, 'boolean');
  assert.equal(typeof body.data.status, 'string');
});

testIfAuth('ai report summary valida payload obrigatorio', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const { response, body } = await request('/api/ai/report/summary', {
    method: 'POST',
    body: {
      context_module: 'empenhos',
      data: {
        total_empenhos: 2
      }
    }
  });

  assert.equal(response.status, 400);
  assert.equal(body.status, 'error');
  assert.equal(body.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(body.details));
});

testIfAuth('ai report summary retorna leitura especializada para empenhos', async (t) => {
  if (!(await ensureServerAvailable(t))) {
    return;
  }

  const health = await request('/api/ai/health');
  assert.equal(health.response.status, 200);

  if (!health.body?.data?.enabled || !health.body?.data?.ok) {
    t.skip('Servico de IA indisponivel neste ambiente');
    return;
  }

  const { response, body } = await request('/api/ai/report/summary', {
    method: 'POST',
    body: {
      report_key: 'relatorio_empenhos',
      context_module: 'empenhos',
      force_refresh: true,
      data: {
        total_empenhos: 8,
        valor_total_empenhado: 125000.5,
        valor_total_utilizado: 92000,
        saldo_total_disponivel: 33000.5,
        ticket_medio_empenho: 15625.06,
        percentual_medio_utilizado: 73.6,
        percentual_validados: 75,
        percentual_com_saldo: 62.5,
        percentual_sem_saldo: 37.5,
        total_empenhos_com_saldo: 5,
        total_empenhos_sem_saldo: 3,
        total_rascunhos_pendentes: 2,
        total_validados: 6,
        total_fornecedores_unicos: 4,
        total_anos_cobertos: 2,
        alerta_empenhos_sem_saldo: 3,
        alerta_rascunhos_pendentes: 2,
        anomalia_empenhos_criticos: 2,
        anomalia_concentracao_fornecedor_pct: 50,
        tipo_relatorio: 'todos',
        ano_filtro: 'todos',
        busca_aplicada: 'sem filtro textual',
        ordenacao_aplicada: 'recente'
      }
    }
  });

  assert.equal(response.status, 200);
  assertSuccessEnvelope(body);
  assert.equal(body.data.report_key, 'relatorio_empenhos');
  assert.equal(typeof body.data.summary, 'string');

  const summaryText = String(body.data.summary || '').toLowerCase();
  assert.ok(summaryText.length > 20);
  assert.ok(summaryText.includes('empenh'));
  assert.ok(summaryText.includes('saldo'));

  assert.ok(Array.isArray(body.data.insights));
  const insightTexts = body.data.insights.map((item) => String(item?.text || item || '').toLowerCase()).filter(Boolean);
  assert.ok(insightTexts.length > 0);
  assert.ok(insightTexts.some((text) => /(saldo|empenh|fornecedor|ticket|utiliza)/.test(text)));

  assert.ok(Array.isArray(body.data.alerts));
  assert.ok(Array.isArray(body.data.anomalies));
  assert.equal(typeof body.data.confidence, 'number');
});
