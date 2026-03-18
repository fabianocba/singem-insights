import * as UI from './consultas/uiConsultas.js';

function onDomReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
}

function registerGlobalShortcuts() {
  window.abrirConsulta = (dataset) => UI.showConsulta(dataset);

  window.abrirConsultaPrecosPraticados = (codigoOuParametros, opcoes = {}) => {
    const parametros =
      codigoOuParametros && typeof codigoOuParametros === 'object'
        ? codigoOuParametros
        : { codigo: codigoOuParametros, ...opcoes };

    if (typeof UI.openPriceIntelligence === 'function') {
      UI.openPriceIntelligence({
        ...parametros,
        autoSearch: parametros.autoSearch !== false
      });
      return;
    }

    UI.showConsulta('precos-praticados');
  };
}

function syncPaginationContainers() {
  const source = document.getElementById('paginationContainer');
  const target = document.getElementById('paginationContainer2');

  if (!source || !target) {
    return;
  }

  const sync = () => {
    target.innerHTML = source.innerHTML;
  };

  sync();

  const observer = new MutationObserver(sync);
  observer.observe(source, {
    childList: true,
    subtree: true
  });
}

onDomReady(() => {
  registerGlobalShortcuts();
  UI.init();
  syncPaginationContainers();
  console.log('Consulte Compras.gov inicializado');
});
