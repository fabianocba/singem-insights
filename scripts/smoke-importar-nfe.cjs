const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: 'playwright-core nao encontrado. Execute o wrapper scripts/smoke-importar-nfe.ps1.'
      },
      null,
      2
    )
  );
  process.exit(2);
}

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.SINGEM_NFE_SMOKE_URL || 'http://localhost:8000/config/importar-nfe.html',
    useRealBackend: false,
    allowWrite: false,
    browserPath: process.env.SINGEM_SMOKE_BROWSER || '',
    authToken: process.env.SINGEM_SMOKE_TOKEN || '',
    apiBaseUrl: process.env.SINGEM_SMOKE_API_BASE || '',
    login: process.env.SINGEM_SMOKE_LOGIN || '',
    password: process.env.SINGEM_SMOKE_PASSWORD || '',
    storageState: process.env.SINGEM_SMOKE_STORAGE_STATE || ''
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--real-backend') {
      options.useRealBackend = true;
      continue;
    }

    if (arg === '--allow-write') {
      options.allowWrite = true;
      continue;
    }

    if (arg === '--base-url' && argv[index + 1]) {
      options.baseUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--browser' && argv[index + 1]) {
      options.browserPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--auth-token' && argv[index + 1]) {
      options.authToken = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--api-base-url' && argv[index + 1]) {
      options.apiBaseUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--login' && argv[index + 1]) {
      options.login = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--password' && argv[index + 1]) {
      options.password = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--storage-state' && argv[index + 1]) {
      options.storageState = argv[index + 1];
      index += 1;
    }
  }

  return options;
}

function resolveApiBaseUrl(baseUrl, explicitApiBaseUrl = '') {
  if (explicitApiBaseUrl) {
    return explicitApiBaseUrl.replace(/\/$/, '');
  }

  const parsed = new URL(baseUrl);
  if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    return 'http://localhost:3000';
  }

  return parsed.origin;
}

function requestJson(requestUrl, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(requestUrl);
    const client = targetUrl.protocol === 'https:' ? https : http;
    const serializedBody = body === undefined ? null : JSON.stringify(body);

    const request = client.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || undefined,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method,
        headers: {
          ...(serializedBody
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(serializedBody)
              }
            : {}),
          ...headers
        }
      },
      (response) => {
        let raw = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          raw += chunk;
        });

        response.on('end', () => {
          let data = {};
          if (raw) {
            try {
              data = JSON.parse(raw);
            } catch {
              data = { raw };
            }
          }

          const statusCode = Number(response.statusCode || 0);
          if (statusCode >= 200 && statusCode < 300) {
            resolve({ status: statusCode, data, headers: response.headers });
            return;
          }

          const error = new Error(data?.erro || data?.message || data?.error || `HTTP ${statusCode || 'UNKNOWN'}`);
          error.status = statusCode;
          error.data = data;
          reject(error);
        });
      }
    );

    request.on('error', reject);
    request.setTimeout(15000, () => {
      request.destroy(new Error('Timeout ao acessar endpoint HTTP.'));
    });

    if (serializedBody) {
      request.write(serializedBody);
    }

    request.end();
  });
}

async function resolveAuthBootstrap(options, logs) {
  if (options.authToken) {
    return {
      accessToken: options.authToken,
      refreshToken: '',
      user: null,
      source: 'auth-token'
    };
  }

  if (!options.login && !options.password) {
    return {
      accessToken: '',
      refreshToken: '',
      user: null,
      source: options.storageState ? 'storage-state' : 'none'
    };
  }

  if (!options.login || !options.password) {
    throw new Error('Forneca login e password juntos para autenticar via API.');
  }

  const apiBaseUrl = resolveApiBaseUrl(options.baseUrl, options.apiBaseUrl);
  const payload = options.login.includes('@')
    ? { email: options.login, password: options.password }
    : { login: options.login, senha: options.password };

  logs.push(`[info] Autenticando via API em ${apiBaseUrl}/api/auth/login`);

  const response = await requestJson(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    body: payload
  });

  return {
    accessToken: response.data?.accessToken || '',
    refreshToken: response.data?.refreshToken || '',
    user: response.data?.usuario || response.data?.user || null,
    source: 'api-login'
  };
}

function resolveBrowserPath(explicitPath = '') {
  if (explicitPath) {
    if (!fs.existsSync(explicitPath)) {
      throw new Error(`Browser nao encontrado em: ${explicitPath}`);
    }
    return explicitPath;
  }

  const candidates = [
    process.env['ProgramFiles(x86)'] &&
      path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env['ProgramFiles(x86)'] &&
      path.join(process.env['ProgramFiles(x86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe')
  ].filter(Boolean);

  const browserPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!browserPath) {
    throw new Error('Nenhum navegador Chromium local encontrado (Edge/Chrome).');
  }

  return browserPath;
}

function buildMockDbScript() {
  return `
    window.__mockSavedNotas = [];
    window.dbManager = {
      db: { name: 'MockDB', version: 1, objectStoreNames: ['empenhos', 'notasFiscais'] },
      async init() { return this.db; },
      async buscarEmpenhos() {
        return [{
          id: 'E1',
          ano: '2026',
          numero: '12345',
          fornecedor: 'Fornecedor Teste Ltda',
          cnpjFornecedor: '12345678000195',
          statusValidacao: 'validado',
          itens: [{
            itemCompra: '001',
            descricao: 'PAPEL A4',
            unidade: 'UN',
            quantidade: 2,
            saldoQuantidade: 2,
            valorUnitario: 5,
            valorTotal: 10
          }]
        }];
      },
      async salvarNotaFiscal(notaFiscal) {
        window.__mockSavedNotas.push(notaFiscal);
        return 987;
      }
    };
  `;
}

async function configureRoutes(context, options) {
  if (options.useRealBackend) {
    return;
  }

  await context.route('**/js/db.js*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: buildMockDbScript()
    });
  });
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCnpj(value) {
  const match = String(value || '').match(/(\d{2}\.?(\d{3})\.?(\d{3})\/?\d{4}-?\d{2})/);
  return match ? match[1].replace(/\D/g, '') : '';
}

async function capturePageDiagnostics(page) {
  return page.evaluate(() => ({
    alertText: document.getElementById('alertBox')?.innerText || '',
    listaEmpenhosText: document.getElementById('listaEmpenhos')?.innerText || '',
    modalText: document.getElementById('modalBody')?.innerText || ''
  }));
}

async function waitForEmpenhos(page, timeoutMs = 15000) {
  await page.waitForFunction(
    () => {
      const card = document.querySelector('.empenho-card');
      const empty = document.querySelector('#listaEmpenhos .empenho-empty');
      const alert = document.getElementById('alertBox');
      return Boolean(card || empty || (alert && alert.textContent.trim()));
    },
    { timeout: timeoutMs }
  );

  const hasCards = await page.locator('.empenho-card').count();
  if (hasCards > 0) {
    return;
  }

  const diagnostics = await capturePageDiagnostics(page);
  throw new Error(
    `Nenhum empenho selecionavel carregado. alerta="${normalizeWhitespace(
      diagnostics.alertText
    )}" lista="${normalizeWhitespace(diagnostics.listaEmpenhosText)}"`
  );
}

async function fillBaseForm(page) {
  const selectedCard = await page.evaluate(() => {
    const card = document.querySelector('.empenho-card.selected');
    return {
      info: card?.querySelector('.empenho-info')?.innerText || '',
      numero: card?.querySelector('.empenho-numero')?.innerText || ''
    };
  });

  const cnpj = extractCnpj(selectedCard.info) || '12345678000195';
  const fornecedor = normalizeWhitespace(selectedCard.info.split('•')[0]) || 'Fornecedor Smoke';
  const numeroNf = String(Date.now()).slice(-6);

  await page.fill('#chaveAcesso', '35150312345678000195550010000000011000000010');
  await page.fill('#numeroNF', numeroNf);
  await page.fill('#serie', '1');
  await page.fill('#cnpjEmitente', cnpj);
  await page.fill('#razaoSocial', fornecedor);

  return { cnpj, fornecedor, numeroNf, cardNumber: normalizeWhitespace(selectedCard.numero) };
}

async function addFirstEmpenhoItem(page) {
  await page.click('#btnAddItemFromEmpenho');
  await page.waitForSelector('#modalItensEmpenho.open', { timeout: 10000 });

  const checkbox = page.locator('#modalItensEmpenhoLista .chkItemEmpenho:not(:disabled)').first();
  if ((await checkbox.count()) === 0) {
    throw new Error('Nenhum item disponivel para adicionar a partir do empenho selecionado.');
  }

  await checkbox.check();
  await page.click('button:has-text("Adicionar Selecionados")');
  await page.waitForFunction(() => document.querySelectorAll('#itensBody tr').length > 0, {
    timeout: 10000
  });

  const itemData = await page.evaluate(() => {
    const row = document.querySelector('#itensBody tr');
    return {
      itemCompra: row?.querySelector('[name^="itemCompra_"]')?.value || '',
      descricao: row?.querySelector('[name^="desc_"]')?.value || '',
      total: row?.querySelector('[name^="total_"]')?.value || '0,00'
    };
  });

  await page.fill('#valorTotal', itemData.total);
  await page.fill('#valorProdutos', itemData.total);

  return itemData;
}

async function validateForm(page) {
  await page.click('#btnValidar');
  await page.waitForFunction(
    () => {
      const modal = document.getElementById('modalDivergencias');
      return modal && modal.style.display === 'flex';
    },
    { timeout: 10000 }
  );

  return page.evaluate(() => ({
    modalText: document.getElementById('modalBody')?.innerText || '',
    btnSalvarDisabledBefore: Boolean(document.getElementById('btnSalvar')?.disabled)
  }));
}

async function saveForm(page, options) {
  if (options.useRealBackend && !options.allowWrite) {
    return {
      saveSkipped: true,
      reason: 'Real backend mode defaults to validate-only. Use --allow-write to persist.'
    };
  }

  await page.click('#btnSalvar');

  if (options.useRealBackend) {
    await page.waitForFunction(
      () => {
        const alert = document.getElementById('alertBox');
        return alert && alert.innerText.trim().length > 0;
      },
      { timeout: 15000 }
    );

    const diagnostics = await capturePageDiagnostics(page);
    return {
      saveSkipped: false,
      alertText: diagnostics.alertText
    };
  }

  await page.waitForFunction(() => Array.isArray(window.__mockSavedNotas) && window.__mockSavedNotas.length === 1, {
    timeout: 10000
  });

  return page.evaluate(() => {
    const saved = window.__mockSavedNotas[0] || {};
    return {
      saveSkipped: false,
      savedSummary: {
        numero: saved.numero,
        serie: saved.serie,
        empenhoNumero: saved.empenhoNumero,
        qtdItens: saved.qtdItens,
        valorTotal: saved.valorTotal,
        cnpjFornecedor: saved.cnpjFornecedor
      },
      alertText: document.getElementById('alertBox')?.innerText || ''
    };
  });
}

async function runSmoke(options) {
  const executablePath = resolveBrowserPath(options.browserPath);
  const browser = await chromium.launch({ headless: true, executablePath });
  const logs = [];
  const contextOptions = {};

  if (options.storageState) {
    if (!fs.existsSync(options.storageState)) {
      throw new Error(`Storage state nao encontrado em: ${options.storageState}`);
    }

    contextOptions.storageState = options.storageState;
  }

  const context = await browser.newContext(contextOptions);

  await configureRoutes(context, options);

  const authBootstrap = await resolveAuthBootstrap(options, logs);

  if (authBootstrap.accessToken || authBootstrap.refreshToken || authBootstrap.user) {
    await context.addInitScript((authData) => {
      window.__SINGEM_AUTH = {
        ...(window.__SINGEM_AUTH || {}),
        accessToken: authData.accessToken || window.__SINGEM_AUTH?.accessToken || null,
        refreshToken: authData.refreshToken || window.__SINGEM_AUTH?.refreshToken || null,
        user: authData.user || window.__SINGEM_AUTH?.user || null
      };
    }, authBootstrap);
  }

  const page = await context.newPage();
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (request) => {
    logs.push(
      `[requestfailed] ${request.failure()?.errorText || 'Request failed'} ${request.method()} ${request.url()}`
    );
  });
  page.on('response', async (response) => {
    if (!response.url().includes('/api/')) {
      return;
    }

    if (response.status() < 400) {
      return;
    }

    let body = '';
    try {
      body = normalizeWhitespace((await response.text()).slice(0, 200));
    } catch {
      body = '';
    }

    logs.push(`[response ${response.status()}] ${response.request().method()} ${response.url()} ${body}`);
  });

  try {
    try {
      if (options.useRealBackend && authBootstrap.source === 'none') {
        logs.push(
          '[warning] Nenhum token, login ou storage state informado para o modo real; a API pode responder 401.'
        );
      }

      if (options.storageState && authBootstrap.source === 'storage-state') {
        logs.push('[info] Contexto carregado com storage state externo.');
      }

      await page.goto(options.baseUrl, { waitUntil: 'domcontentloaded' });
      await waitForEmpenhos(page, options.useRealBackend ? 50000 : 15000);

      await page.locator('.empenho-card').first().click();
      const formData = await fillBaseForm(page);
      const itemData = await addFirstEmpenhoItem(page);
      const validation = await validateForm(page);
      const saveResult = await saveForm(page, options);
      const diagnostics = await capturePageDiagnostics(page);

      return {
        ok: true,
        mode: options.useRealBackend ? 'real-backend' : 'mock',
        authMode: authBootstrap.source,
        allowWrite: options.allowWrite,
        pageUrl: options.baseUrl,
        selectedEmpenho: formData.cardNumber,
        itemData,
        validation,
        saveResult,
        diagnostics,
        logs: logs.slice(-20)
      };
    } catch (error) {
      error.smokeDiagnostics = await capturePageDiagnostics(page).catch(() => null);
      error.smokeLogs = logs.slice(-20);
      error.smokeUrl = page.url();
      error.smokeAuthMode = authBootstrap.source;
      throw error;
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runSmoke(options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message,
        authMode: error.smokeAuthMode,
        pageUrl: error.smokeUrl,
        diagnostics: error.smokeDiagnostics,
        logs: error.smokeLogs,
        stack: error.stack
      },
      null,
      2
    )
  );
  process.exit(1);
});
