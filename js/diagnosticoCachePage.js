function onDomReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
}

function log(message, type = 'info') {
  const results = document.getElementById('results');
  if (!results) {
    return;
  }

  const div = document.createElement('div');
  div.className = `status ${type}`;
  div.innerHTML = message;
  results.appendChild(div);
}

function clearResults() {
  document.getElementById('results')?.replaceChildren();
}

function updateTechnicalInfo() {
  const info = {
    'User Agent': navigator.userAgent,
    Plataforma: navigator.platform,
    Idioma: navigator.language,
    'Cookies Habilitados': navigator.cookieEnabled,
    'URL Atual': window.location.href,
    Timestamp: new Date().toISOString(),
    'IndexedDB Suportado': !!window.indexedDB,
    'ServiceWorker Suportado': !!navigator.serviceWorker
  };

  const technicalInfo = document.getElementById('technical-info');
  if (technicalInfo) {
    technicalInfo.textContent = JSON.stringify(info, null, 2);
  }
}

async function runTests() {
  clearResults();

  const expectedVersion = window.APP_BUILD || window.APP_VERSION || '1.2.1';

  log('🔄 Iniciando testes de diagnóstico...', 'info');
  log('📝 Teste 1: Verificando carregamento de db.js...', 'info');

  try {
    const timestamp = Date.now();
    const response = await fetch(`../js/db.js?v=${expectedVersion}&t=${timestamp}`);
    const headers = response.headers;

    const cacheControl = headers.get('cache-control');
    const pragma = headers.get('pragma');
    const expires = headers.get('expires');

    log(
      `✅ db.js carregado com sucesso!<br>
                 <span class="timestamp">Cache-Control: ${cacheControl || 'não definido'}</span><br>
                 <span class="timestamp">Pragma: ${pragma || 'não definido'}</span><br>
                 <span class="timestamp">Expires: ${expires || 'não definido'}</span>`,
      'success'
    );

    if (cacheControl && cacheControl.includes('no-cache')) {
      log('✅ Cache desabilitado corretamente!', 'success');
    } else {
      log(
        '⚠️ Cache NÃO está desabilitado! Reinicie o frontend usando o servidor local sem cache (npm run serve:dev ou scripts/dev-up.ps1).',
        'warning'
      );
    }
  } catch (error) {
    log(`❌ Erro ao carregar db.js: ${error.message}`, 'error');
  }

  log('📝 Teste 2: Verificando DatabaseManager...', 'info');

  await new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });

  if (window.dbManager) {
    log(
      `✅ window.dbManager está disponível!<br>
                 <span class="timestamp">Tipo: ${typeof window.dbManager}</span><br>
                 <span class="timestamp">Constructor: ${window.dbManager.constructor.name}</span>`,
      'success'
    );
  } else {
    log('❌ window.dbManager NÃO está disponível!', 'error');
  }

  log('📝 Teste 3: Verificando versão...', 'info');
  log(
    `ℹ️ Versão esperada: <code>${expectedVersion}</code><br>
             <span class="timestamp">Timestamp atual: ${new Date().toISOString()}</span>`,
    'info'
  );

  updateTechnicalInfo();
}

function clearCache() {
  if (window.confirm('Isso irá recarregar a página e tentar limpar o cache. Continuar?')) {
    window.location.reload();
  }
}

window.runTests = runTests;
window.clearCache = clearCache;

onDomReady(() => {
  void runTests();
});
