export function createAppBootstrap({
  APP_VERSION,
  APP_BUILD,
  ControleMaterialApp,
  dbGateway,
  initInfrastructureInfo,
  logVersion,
  normalizeVersionMeta,
  repository,
  resolveCanonicalVersionMeta
}) {
  let bootstrapPromise = null;

  async function waitForRepository(maxRetries = 3, baseDelay = 300) {
    console.log('[Bootstrap] � Aguardando repository...');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!repository) {
          throw new Error('repository não foi importado');
        }

        if (typeof repository.saveUnidade !== 'function') {
          throw new Error('saveUnidade não encontrado no repository');
        }

        if (!dbGateway.hasDbManager()) {
          console.warn(`[Bootstrap] Tentativa ${attempt}/${maxRetries}: dbManager ainda não disponível`);

          if (attempt < maxRetries) {
            const delay = baseDelay * attempt;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw new Error('dbManager não inicializado após múltiplas tentativas');
        }

        console.log('[Bootstrap] ✅ Repository pronto para uso');
        return true;
      } catch (error) {
        console.error(`[Bootstrap] Tentativa ${attempt}/${maxRetries} falhou:`, error);

        if (attempt >= maxRetries) {
          throw new Error(`Repository não inicializou após ${maxRetries} tentativas: ${error.message}`);
        }

        const delay = baseDelay * attempt;
        console.log(`[Bootstrap] ⏳ Aguardando ${delay}ms antes de retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  function logBootstrapReport(
    meta = normalizeVersionMeta({}, { version: APP_VERSION, build: APP_BUILD, channel: 'dev' })
  ) {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   📊 RELATÓRIO DE INICIALIZAÇÃO       ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('📦 Versão:', meta.version);
    console.log('🏗️  Build:', meta.build);
    console.log('🗄️  DB:', dbGateway.getDbName() || 'N/A');
    console.log('📊 DB Versão:', dbGateway.getDbVersion() || 'N/A');
    console.log('✅ Repository:', typeof repository);
    console.log('✅ Repository.saveUnidade:', typeof repository?.saveUnidade);
    console.log('✅ Repository.saveUsuario:', typeof repository?.saveUsuario);
    console.log('✅ Repository.saveEmpenho:', typeof repository?.saveEmpenho);
    console.log('✅ window.repository:', typeof window.repository);
    console.log('✅ window.dbManager:', dbGateway.getManagerType());
    console.log('✅ window.app:', typeof window.app);
    console.log('════════════════════════════════════════\n');
  }

  function renderBootstrapError(error) {
    console.error('[Bootstrap] ❌ ERRO FATAL na inicialização:', error);
    console.error('[Bootstrap] Stack:', error.stack);

    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #dc3545;
      color: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 600px;
      z-index: 99999;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    errorDiv.innerHTML = `
      <h2 style="margin-top: 0;">❌ Erro ao Inicializar</h2>
      <p><strong>Não foi possível inicializar o sistema.</strong></p>
      <p style="font-size: 14px; opacity: 0.9;">${error.message}</p>
      <hr style="border: 1px solid rgba(255,255,255,0.3); margin: 20px 0;">
      <p style="font-size: 13px;">
        <strong>Soluções:</strong><br>
        1. Pressione Ctrl+Shift+R para recarregar<br>
        2. Limpe o cache do navegador<br>
        3. Verifique o console (F12) para mais detalhes
      </p>
      <button onclick="location.reload(true)" style="
        background: white;
        color: #dc3545;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        margin-top: 10px;
      ">🔄 Recarregar Página</button>
    `;
    document.body.appendChild(errorDiv);
  }

  async function bootstrapApp() {
    if (window.__SINGEM_BOOTSTRAP_DONE__ && window.app) {
      return window.app;
    }

    if (window.__SINGEM_BOOTSTRAP_PROMISE__) {
      return window.__SINGEM_BOOTSTRAP_PROMISE__;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = (async () => {
      try {
        const versionMeta = await resolveCanonicalVersionMeta({ defaultVersion: APP_VERSION, defaultBuild: APP_BUILD });
        window.__SINGEM_VERSION_META = versionMeta;
        window.APP_VERSION = versionMeta.version;
        window.APP_BUILD = versionMeta.build;

        console.log('[App] 📦 Versão:', versionMeta.version, 'Build:', versionMeta.build);
        console.log('[Bootstrap] 🚀 Iniciando aplicação SINGEM...');

        await waitForRepository();

        console.log('[Bootstrap] ℹ️ Fluxo de diretório externo removido (modo banco/API).');
        console.log('[Bootstrap] 🔧 Expondo módulos globalmente...');
        window.repository = repository;

        window.app = new ControleMaterialApp();
        logBootstrapReport(versionMeta);

        window.__SINGEM_BOOTSTRAP_DONE__ = true;
        window.dispatchEvent(
          new CustomEvent('SINGEM:bootstrap:done', {
            detail: { ts: Date.now(), version: versionMeta.version, build: versionMeta.build }
          })
        );

        logVersion();
        initInfrastructureInfo();

        console.log('[Bootstrap] ✅ Aplicação inicializada com sucesso!');
        return window.app;
      } catch (error) {
        renderBootstrapError(error);
        bootstrapPromise = null;
        throw error;
      }
    })();

    window.__SINGEM_BOOTSTRAP_PROMISE__ = bootstrapPromise;
    return bootstrapPromise;
  }

  return {
    bootstrapApp,
    logBootstrapReport,
    waitForRepository
  };
}
