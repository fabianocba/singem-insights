import repository from './core/repository.js';

function onDomReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForDbManager(maxRetries = 20, intervalMs = 100) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    if (window.dbManager) {
      return window.dbManager;
    }

    await sleep(intervalMs);
  }

  throw new Error('dbManager não foi carregado a tempo. Recarregue a página com Ctrl+F5.');
}

async function ensureDbReady() {
  const dbManager = await waitForDbManager();

  if (dbManager.db) {
    return dbManager;
  }

  console.log('[ConfigPage] 🔄 Inicializando banco...');

  if (typeof dbManager.initSafe === 'function') {
    await dbManager.initSafe({ maxRetries: 3, retryDelay: 300 });
  } else {
    await dbManager.init();
  }

  return dbManager;
}

function dispatchBootstrapEvents(dbManager) {
  window.dispatchEvent(
    new CustomEvent('dbReady', {
      detail: { db: dbManager.db }
    })
  );

  if (!window.__SINGEM_BOOTSTRAP_DONE__) {
    window.__SINGEM_BOOTSTRAP_DONE__ = true;
    window.dispatchEvent(
      new CustomEvent('SINGEM:bootstrap:done', {
        detail: { ts: Date.now(), page: 'configuracoes' }
      })
    );
  }
}

function resolveInitialSection() {
  const activeTab = document.querySelector('.tab-button.active, .settings-tab.active');
  return activeTab?.dataset.tab || activeTab?.dataset.section || 'unidade';
}

async function waitForSettingsManager(maxRetries = 20, intervalMs = 100) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    if (window.settingsManager) {
      return window.settingsManager;
    }

    await sleep(intervalMs);
  }

  return null;
}

async function bootstrapConfiguracoesPage() {
  try {
    console.log('[ConfigPage] 🔄 Carregando repository...');
    window.repository = repository;

    const dbManager = await ensureDbReady();

    console.log('[ConfigPage] ✅ Banco inicializado:', dbManager.db?.name, dbManager.db?.version);
    dispatchBootstrapEvents(dbManager);

    const settingsManager = await waitForSettingsManager();
    if (settingsManager) {
      const initialSection = resolveInitialSection();
      window.setTimeout(() => {
        settingsManager.showSection(initialSection);
        void settingsManager.verificarPermissoes();
        console.log('[ConfigPage] ✅ Sistema de configurações pronto para uso!');
      }, 250);
      return;
    }

    console.warn('[ConfigPage] ⚠️ settingsManager não ficou disponível a tempo.');
  } catch (error) {
    console.error('[ConfigPage] ❌ Erro ao inicializar página de configurações:', error);
    alert(`❌ Falha ao inicializar configurações:\n${error.message}\n\nRecarregue com CTRL+F5`);
  }
}

onDomReady(() => {
  void bootstrapConfiguracoesPage();
});
