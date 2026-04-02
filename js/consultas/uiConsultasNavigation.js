import { DATASETS } from './datasetsConfig.js';
import { state, resetConsultaState, getDefaultFiltersForDataset } from './uiConsultasState.js';
import { createPriceDashboardState } from './precosPraticadosRenderer.js';

export function createConsultaNavigation({ renderFilters, renderPagination, renderTable, setSearchHint }) {
  function showMenu() {
    const menu = document.getElementById('menuConsultas');
    const tela = document.getElementById('telaConsulta');

    if (menu) {
      menu.classList.remove('hidden');
      menu.setAttribute('aria-hidden', 'false');
    }

    if (tela) {
      tela.classList.add('hidden');
      tela.setAttribute('aria-hidden', 'true');
    }

    state.currentView = 'menu';
    resetConsultaState({
      filters: {},
      priceDashboard: createPriceDashboardState()
    });
  }

  function showConsulta(dataset) {
    const menu = document.getElementById('menuConsultas');
    const tela = document.getElementById('telaConsulta');
    const titulo = document.getElementById('tituloConsulta');

    if (!DATASETS[dataset]) {
      console.error('Dataset inválido:', dataset);
      return;
    }

    state.dataset = dataset;
    state.currentView = 'consulta';
    resetConsultaState({
      filters: getDefaultFiltersForDataset(dataset),
      priceDashboard: createPriceDashboardState()
    });

    if (menu) {
      menu.classList.add('hidden');
      menu.setAttribute('aria-hidden', 'true');
    }

    if (tela) {
      tela.classList.remove('hidden');
      tela.setAttribute('aria-hidden', 'false');
    }

    if (titulo) {
      titulo.textContent = DATASETS[dataset].label;
    }

    renderFilters(setSearchHint);
    renderPagination();
    renderTable();
    setSearchHint('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return {
    showMenu,
    showConsulta
  };
}
