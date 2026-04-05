function appendScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
    document.head.appendChild(script);
  });
}

async function appendScriptsSequential(sources) {
  for (const src of sources) {
    await appendScript(src);
  }
}

function waitForBootstrapDone(timeoutMs = 30000) {
  if (window.__SINGEM_BOOTSTRAP_DONE__ && window.app) {
    return Promise.resolve(window.app);
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('SINGEM:bootstrap:done', onDone);
      reject(new Error('Timeout aguardando bootstrap principal.'));
    }, timeoutMs);

    const onDone = () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('SINGEM:bootstrap:done', onDone);
      resolve(window.app || null);
    };

    window.addEventListener('SINGEM:bootstrap:done', onDone, { once: true });
  });
}

async function restoreAuthenticatedSession() {
  const apiClientModule = await import('./services/apiClient.js');
  const apiClient = apiClientModule.default;

  const me = await apiClient.get('/api/auth/me');
  const usuario = me?.usuario || me?.data?.usuario || me?.dados?.usuario;

  if (!usuario || !window.app) {
    return;
  }

  window.app.usuarioLogado = { ...usuario };
  window.app.authProvider = usuario.authProvider || 'local';

  if (window.settingsUsuarios) {
    window.settingsUsuarios.usuarioLogado = { ...usuario };
  }

  if (typeof window.app.carregarDadosIniciais === 'function') {
    await window.app.carregarDadosIniciais();
  }

  if (typeof window.app.atualizarUsuarioHeader === 'function') {
    window.app.atualizarUsuarioHeader();
  }

  if (typeof window.app.showScreen === 'function') {
    window.app.showScreen('homeScreen');
  }
}

async function loadCriticalLegacyScripts() {
  const criticalScripts = [
    'js/platform-core.js',
    'js/config.js',
    'js/db.js',
    'js/utils/dbSafe.js',
    'js/utils/uxHelpers.js',
    'js/core/protection.js',
    'js/core/dataBackup.js',
    'js/core/menuConfig.js',
    'js/nfValidator.js',
    'js/globalBridge.js'
  ];

  await appendScriptsSequential(criticalScripts);
}

function loadDeferredLegacyScripts() {
  const deferredScripts = [
    'js/pdfReader.js',
    'js/fsManager.js',
    'js/anexarPdfNE.js',
    'js/settings/index.js',
    'js/settings/unidade.js',
    'js/settings/arquivos.js',
    'js/ui/settings/protecao.js',
    'js/refine/patterns.js',
    'js/refine/logger.js',
    'js/refine/normalize.js',
    'js/refine/validate.js',
    'js/refine/analyzer.js',
    'js/refine/detectors.js',
    'js/refine/score.js',
    'js/refine/ocrFallback.js',
    'js/refine/extract/header.js',
    'js/refine/extract/items.js',
    'js/refine/extract/totals.js',
    'js/refine/index.js',
    'js/refine/ui-integration.js',
    'js/exportCSV.js',
    'js/authProvidersBootstrap.js'
  ];

  window.setTimeout(() => {
    void appendScriptsSequential(deferredScripts).catch((error) => {
      console.warn('[app-runtime-loader] Falha ao carregar scripts legados diferidos:', error?.message || error);
    });
  }, 0);
}

let runtimePromise = null;

export async function loadAppRuntime() {
  if (window.__SINGEM_APP_RUNTIME_READY__) {
    return window.app || null;
  }

  if (runtimePromise) {
    return runtimePromise;
  }

  runtimePromise = (async () => {
    await import('./ui/appShellMount.js');

    await loadCriticalLegacyScripts();

    await import('./versionManager.js');
    await import('./neParserInit.js');
    await import('./nfeIntegration.js');
    await import('./utils/formatters.js');
    await import('./settings/usuarios.js');
    await import('./settings/rede.js');
    await import('./settings/preferencias.js');
    await import('./ui/pageEnhancer.js');
    await import('./softInit.js');
    await import('./bootstrap.js');

    await waitForBootstrapDone();
    await restoreAuthenticatedSession();
    loadDeferredLegacyScripts();

    window.__SINGEM_APP_RUNTIME_READY__ = true;
    return window.app || null;
  })();

  return runtimePromise;
}
