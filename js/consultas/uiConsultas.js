/* eslint-disable max-lines -- modulo legado grande; sera quebrado em submodulos no roadmap */
/**
 * uiConsultas.js
 * Interface de usuário para Consulte Compras.gov (Dados Abertos Compras.gov.br)
 * Interface para consultas e painéis analíticos integrados
 */

import * as Cache from './cache.js';
import { DATASETS } from './datasetsConfig.js';
import {
  PRICE_INTELLIGENCE_DATASET,
  state,
  resetConsultaState,
  logPriceUi,
  isPriceIntelligenceDataset,
  isGovAnalyticsDataset,
  getDefaultFiltersForDataset,
  setSearchHint,
  getRequiredHint,
  sanitizeCodesInput,
  canSearchWithFilters,
  createDebouncedSearch,
  shouldAutoSearch,
  setFiltersOnForm,
  getCatalogTypeForShortcut
} from './uiConsultasState.js';
import { createPriceDashboardState } from './precosPraticadosRenderer.js';
import {
  setupAPIModeToggle,
  updateAPIModeUI,
  renderFilters,
  renderPagination,
  renderTable
} from './uiConsultasRender.js';
import {
  activatePriceDetailTab,
  exportConsultaResults,
  exportGovAnalyticsData,
  exportPriceIntelligenceData,
  processConsultaResults,
  showConsultaJsonModal,
  showPriceDetailModal
} from './uiConsultasActions.js';
import { createConsultaNavigation } from './uiConsultasNavigation.js';
import { createConsultaSearchController } from './uiConsultasSearch.js';

let debouncedAutoSearch = null;
let listenersAttached = false;

function processResults(data) {
  processConsultaResults(getConsultaResultDeps(), data);
}

const { collectFilters, executeSearch, triggerSearch } = createConsultaSearchController({
  renderTable,
  processResults,
  setSearchHint
});

const { showMenu, showConsulta } = createConsultaNavigation({
  renderFilters,
  renderPagination,
  renderTable,
  setSearchHint
});

export { showMenu, showConsulta };

function getConsultaResultDeps() {
  return {
    state,
    isPriceIntelligenceDataset,
    isGovAnalyticsDataset,
    renderPagination,
    renderTable,
    saveToLocalStorage,
    logPriceUi
  };
}

function getConsultaActionDeps() {
  return {
    state,
    isPriceIntelligenceDataset,
    isGovAnalyticsDataset,
    collectFilters,
    canSearchWithFilters,
    setSearchHint,
    getRequiredHint,
    datasets: DATASETS
  };
}

/**
 * Inicializa a interface
 */
export function init() {
  console.log('🔍 Iniciando módulo Consulte Compras.gov...');

  // Verifica se elementos existem
  const menu = document.getElementById('menuConsultas');
  const tela = document.getElementById('telaConsulta');

  console.log('📦 Menu encontrado:', !!menu);
  console.log('🔎 Tela de consulta encontrada:', !!tela);

  debouncedAutoSearch = createDebouncedSearch(() => {
    triggerSearch({ source: 'auto', force: false });
  });

  attachEventListeners();
  setupAPIModeToggle();
  updateAPIModeUI();
  showMenu();
  loadFromLocalStorage();

  console.log('✅ Módulo Consulte Compras.gov inicializado!');
  console.log("📝 Use window.abrirConsulta('materiais') ou window.abrirConsultaPrecosPraticados('233420') para testar");
}

/**
 * Anexa event listeners
 */
function attachEventListeners() {
  if (listenersAttached) {
    return;
  }

  console.log('🎯 Configurando event listeners...');

  document.addEventListener('click', (e) => {
    const consultaCard = e.target.closest('.menu-item-consulta[data-consulta]');
    if (consultaCard && consultaCard.closest('#menuConsultas')) {
      e.preventDefault();
      showConsulta(consultaCard.dataset.consulta);
      return;
    }

    if (
      e.target.id === 'btnVoltarMenu' ||
      e.target.closest('#btnVoltarMenu') ||
      e.target.id === 'btnVoltar' ||
      e.target.closest('#btnVoltar')
    ) {
      console.log('🔙 Voltando ao menu...');
      e.preventDefault();
      e.stopPropagation();
      showMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    const consultaCard = e.target.closest('.menu-item-consulta[data-consulta]');
    if (!consultaCard || !consultaCard.closest('#menuConsultas')) {
      return;
    }

    if (e.key !== 'Enter' && e.key !== ' ') {
      return;
    }

    e.preventDefault();
    showConsulta(consultaCard.dataset.consulta);
  });

  // Buscar
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btnBuscar') {
      triggerSearch({ source: 'manual', force: true, resetPage: true });
    }
  });

  // Auto busca com debounce para campos textuais (somente digitação real)
  document.addEventListener('keyup', (e) => {
    const target = e.target;
    if (!target?.id?.startsWith('filter_')) {
      return;
    }

    const config = DATASETS[state.dataset];
    if (config?.autoSearch === false) {
      return;
    }

    if (target.dataset.filterType !== 'text') {
      return;
    }

    if (e.key === 'Enter') {
      return;
    }

    const typedText = String(target.value || '');
    if (!typedText.trim()) {
      collectFilters();
      setSearchHint('');
      return;
    }

    if (!shouldAutoSearch(typedText)) {
      setSearchHint('Digite pelo menos 3 caracteres para pesquisar');
      return;
    }

    if (debouncedAutoSearch) {
      debouncedAutoSearch();
    }
  });

  // Mudança em selects dispara busca imediata se já houver filtros válidos
  document.addEventListener('change', (e) => {
    const target = e.target;

    if (target?.id === 'piSupplierCriterion' && isPriceIntelligenceDataset()) {
      state.priceDashboard = createPriceDashboardState({
        ...state.priceDashboard,
        supplierCriterion: target.value
      });
      renderTable();
      return;
    }

    if (target?.id === 'piPageSize' && isPriceIntelligenceDataset()) {
      state.priceDashboard = createPriceDashboardState({
        ...state.priceDashboard,
        tablePageSize: Number(target.value || 15),
        tablePage: 1
      });
      renderTable();
      return;
    }

    if (!target?.id?.startsWith('filter_')) {
      return;
    }

    const config = DATASETS[state.dataset];
    if (config?.autoSearch === false) {
      return;
    }

    if (target.dataset.filterType === 'select') {
      triggerSearch({ source: 'manual', force: true, resetPage: true });
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target?.id === 'piQuickFilter' && isPriceIntelligenceDataset()) {
      state.priceDashboard = createPriceDashboardState({
        ...state.priceDashboard,
        tableQuickFilter: target.value,
        tablePage: 1
      });
      renderTable();
    }
  });

  // ENTER força busca (exceto sem filtros)
  document.addEventListener('keydown', (e) => {
    const target = e.target;
    if (!target?.id?.startsWith('filter_')) {
      return;
    }

    if (e.key !== 'Enter') {
      return;
    }

    e.preventDefault();
    triggerSearch({ source: 'enter', force: true, resetPage: true });
  });

  // Limpar filtros
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btnLimpar') {
      resetConsultaState({
        filters: getDefaultFiltersForDataset(state.dataset),
        priceDashboard: createPriceDashboardState()
      });
      renderFilters(setSearchHint);
      renderPagination();
      renderTable();
      setSearchHint('');
      saveToLocalStorage();
    }
  });

  // Limpar cache
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btnLimparCache') {
      Cache.clear();
      alert('Cache limpo com sucesso!');
    }
  });

  // Paginação
  document.addEventListener('click', (e) => {
    const localPageButton = e.target.closest('.pi-table-page-btn');
    if (localPageButton && isPriceIntelligenceDataset()) {
      const pageAction = localPageButton.dataset.pageAction;
      const pageNumber = Number(localPageButton.dataset.pageNumber || 0);

      if (pageAction === 'prev') {
        state.priceDashboard = createPriceDashboardState({
          ...state.priceDashboard,
          tablePage: Math.max(1, state.priceDashboard.tablePage - 1)
        });
        renderTable();
        return;
      }

      if (pageAction === 'next') {
        state.priceDashboard = createPriceDashboardState({
          ...state.priceDashboard,
          tablePage: state.priceDashboard.tablePage + 1
        });
        renderTable();
        return;
      }

      if (Number.isFinite(pageNumber) && pageNumber > 0) {
        state.priceDashboard = createPriceDashboardState({
          ...state.priceDashboard,
          tablePage: pageNumber
        });
        renderTable();
        return;
      }
    }

    if (e.target.id === 'btnPrevPage' && state.currentPage > 1) {
      if (!state.hasActiveSearch || !canSearchWithFilters(state.filters)) {
        setSearchHint(getRequiredHint(DATASETS[state.dataset]));
        return;
      }

      state.currentPage--;
      executeSearch({ force: false });
    }

    if (e.target.id === 'btnNextPage' && state.currentPage < state.totalPages) {
      if (!state.hasActiveSearch || !canSearchWithFilters(state.filters)) {
        setSearchHint(getRequiredHint(DATASETS[state.dataset]));
        return;
      }

      state.currentPage++;
      executeSearch({ force: false });
    }
  });

  // Exportar CSV
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btnExportCSV') {
      exportToCSV();
    }

    if (
      e.target.id === 'btnAtualizarAgora' ||
      e.target.id === 'btnAtualizarAgoraHeader' ||
      e.target.id === 'btnPriceRetry'
    ) {
      triggerSearch({ source: 'manual', force: true, resetPage: true });
    }

    if (
      e.target.id === 'btnExportPriceDataTop' ||
      e.target.id === 'btnExportPriceData' ||
      e.target.id === 'btnExportPriceDataHeader'
    ) {
      if (isPriceIntelligenceDataset()) {
        exportPriceIntelligence();
      } else if (isGovAnalyticsDataset()) {
        exportGovAnalytics();
      }
    }
  });

  // Ver JSON
  document.addEventListener('click', (e) => {
    const sortButton = e.target.closest('.pi-sort-btn');
    if (sortButton && isPriceIntelligenceDataset()) {
      const sortKey = sortButton.dataset.sortKey;
      if (sortKey) {
        const isSameKey = state.priceDashboard.tableSortBy === sortKey;
        const nextDir = isSameKey && state.priceDashboard.tableSortDir === 'asc' ? 'desc' : 'asc';
        state.priceDashboard = createPriceDashboardState({
          ...state.priceDashboard,
          tableSortBy: sortKey,
          tableSortDir: nextDir,
          tablePage: 1
        });
        renderTable();
      }
      return;
    }

    const detailTab = e.target.closest('.pi-detail-tab');
    if (detailTab) {
      activatePriceDetailTab(detailTab);
      return;
    }

    const jsonButton = e.target.closest('.btn-view-json');
    if (jsonButton) {
      const index = parseInt(jsonButton.dataset.sourceIndex || jsonButton.dataset.index, 10);
      showJSONModal(index);
      return;
    }

    const detailsButton = e.target.closest('.btn-price-details');
    if (detailsButton) {
      const index = parseInt(detailsButton.dataset.sourceIndex || detailsButton.dataset.index, 10);
      showPriceDetailsModal(index);
      return;
    }

    const shortcutButton = e.target.closest('.btn-open-price-intelligence');
    if (shortcutButton) {
      const index = parseInt(shortcutButton.dataset.index, 10);
      const row = state.results[index];
      const catalogType = shortcutButton.dataset.catalogType || getCatalogTypeForShortcut();

      if (!row?.codigo || row.codigo === '-') {
        setSearchHint('Codigo do item indisponivel para abrir o Módulo 3.');
        return;
      }

      openPriceIntelligenceByCode(row.codigo, {
        tipoCatalogo: catalogType || 'material',
        forceRefresh: false,
        autoSearch: true
      });
    }
  });

  listenersAttached = true;
  console.log('✅ Event listeners globais configurados');
}

/**
 * Exporta resultados para CSV
 */
function exportToCSV() {
  return exportConsultaResults(getConsultaActionDeps());
}

async function exportPriceIntelligence(explicitFormat = null) {
  return exportPriceIntelligenceData(getConsultaActionDeps(), explicitFormat);
}

async function exportGovAnalytics(explicitFormat = null) {
  return exportGovAnalyticsData(getConsultaActionDeps(), explicitFormat);
}

/**
 * Mostra modal com JSON completo
 * @param {number} sourceIndex - Índice de origem do resultado
 */
function showJSONModal(sourceIndex) {
  return showConsultaJsonModal({ state }, sourceIndex);
}

function showPriceDetailsModal(sourceIndex) {
  return showPriceDetailModal({ state, isPriceIntelligenceDataset }, sourceIndex);
}

/**
 * Persistência local desativada (modo server-only)
 */
function saveToLocalStorage() {
  return;
}

/**
 * Persistência local desativada (modo server-only)
 */
function loadFromLocalStorage() {
  return;
}

export function openPriceIntelligence(options = {}) {
  const optionsFilters = options.filters && typeof options.filters === 'object' ? options.filters : {};
  const codesSource =
    options.codigos || options.codes || options.codigo || options.codigoItemCatalogo || optionsFilters.codigos || '';

  const normalizedCodigos = sanitizeCodesInput(Array.isArray(codesSource) ? codesSource.join(', ') : codesSource);
  const initialFilters = {
    tipoCatalogo: options.tipoCatalogo || optionsFilters.tipoCatalogo || 'material',
    ...optionsFilters,
    codigos: normalizedCodigos
  };

  showConsulta(PRICE_INTELLIGENCE_DATASET);
  state.priceDashboard = createPriceDashboardState();
  state.priceUiError = null;

  requestAnimationFrame(() => {
    setFiltersOnForm(initialFilters);
    collectFilters();

    if (options.autoSearch === false) {
      setSearchHint(getRequiredHint(DATASETS[PRICE_INTELLIGENCE_DATASET]));
      return;
    }

    if (!canSearchWithFilters(state.filters)) {
      setSearchHint(getRequiredHint(DATASETS[PRICE_INTELLIGENCE_DATASET]));
      return;
    }

    triggerSearch({
      source: 'manual',
      force: options.forceRefresh === true,
      resetPage: true
    });
  });
}

export function openPriceIntelligenceByCode(codigo, options = {}) {
  openPriceIntelligence({
    ...options,
    codigo,
    autoSearch: options.autoSearch !== false
  });
}
