import { bootstrapApp } from './app.js';
import * as Consultas from './consultas/index.js';
import { initReportsUI } from './reports/reportUI.js';

function onDomReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
}

function waitForDB(intervalMs = 100, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (window.dbManager?.loja || window.dbManager?.db || window.repository) {
        resolve();
        return;
      }

      if (Date.now() >= deadline) {
        console.warn(
          '[bootstrap.js] waitForDB: timeout após ' + timeoutMs + 'ms — prosseguindo sem IndexedDB inicializado.'
        );
        resolve();
        return;
      }

      window.setTimeout(check, intervalMs);
    };

    check();
  });
}

function registerConsultasModule() {
  const consultasModule = (window.ConsultasModule = window.ConsultasModule || {
    UIConsultas: null,
    initialized: false,
    loading: false
  });

  console.log('🔄 Importando módulos de Consultas...');
  console.log('✅ Módulos importados:', Consultas);

  consultasModule.UIConsultas = {
    init: Consultas.init,
    showConsulta: Consultas.showConsulta,
    showMenu: Consultas.showMenu,
    openPriceIntelligence: Consultas.openPriceIntelligence,
    openPriceIntelligenceByCode: Consultas.openPriceIntelligenceByCode
  };
  consultasModule.initialized = true;
  consultasModule.loading = false;

  console.log('✅ Módulo PRONTO em window.ConsultasModule:', consultasModule);

  window.initConsultas = () => {
    console.log('🚀 initConsultas chamado');

    try {
      Consultas.init();
      console.log('✅ Consultas.init() executado com sucesso');
    } catch (error) {
      console.error('❌ Erro em init():', error);
      alert('❌ Erro ao inicializar:\n\n' + error.message);
    }
  };

  console.log('✅ Setup completo!');
  console.log('   - window.initConsultas:', typeof window.initConsultas);
  console.log('   - window.abrirConsulta:', typeof window.abrirConsulta);
  console.log('   - window.abrirConsultaPrecosPraticados:', typeof window.abrirConsultaPrecosPraticados);
  console.log('   - window.ConsultasModule.initialized:', consultasModule.initialized);
}

let reportsBootstrapPromise = null;

async function bootstrapReports() {
  if (reportsBootstrapPromise) {
    return reportsBootstrapPromise;
  }

  reportsBootstrapPromise = (async () => {
    try {
      await waitForDB();
      await initReportsUI();
      console.log('[bootstrap.js] ✅ Módulo de relatórios inicializado');
    } catch (error) {
      console.error('[bootstrap.js] ❌ Erro ao inicializar relatórios:', error);
    }
  })();

  return reportsBootstrapPromise;
}

registerConsultasModule();

onDomReady(() => {
  void bootstrapApp();
  void bootstrapReports();
});
