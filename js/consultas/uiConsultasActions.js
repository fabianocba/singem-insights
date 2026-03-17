import * as API from './apiCompras.js';
import * as Mapeadores from './mapeadores.js';
import { escapeHTML as escapeHtmlContent } from '../utils/sanitize.js';
import { createPriceDashboardState, renderPriceDetailsModalContent } from './precosPraticadosRenderer.js';

function resolveResponseItems(data) {
  if (data._embedded) {
    const keys = Object.keys(data._embedded);
    if (keys.length > 0) {
      return data._embedded[keys[0]];
    }
  }

  if (data.items || data.itens) {
    return data.items || data.itens;
  }

  if (data.data) {
    return data.data;
  }

  return Array.isArray(data) ? data : [];
}

function resolveResponseMetadata(data, state) {
  const metadata = data._metadata || data.metadata || {};

  return {
    totalRecords:
      metadata.totalRecords ||
      metadata.total ||
      state.priceIntelligenceResponse?.page?.totalItems ||
      state.analyticsResponse?.page?.totalItems ||
      0,
    totalPages:
      metadata.totalPages ||
      metadata.pages ||
      state.priceIntelligenceResponse?.page?.totalPages ||
      state.analyticsResponse?.page?.totalPages ||
      1
  };
}

function applyDatasetResponses(state, data, isPriceDataset, isAnalyticsDataset) {
  if (isPriceDataset) {
    state.priceIntelligenceResponse = data._priceIntelligence || data._raw || null;
    state.analyticsResponse = null;
    state.priceUiError = null;
    return;
  }

  state.priceIntelligenceResponse = null;
  state.analyticsResponse = isAnalyticsDataset ? data._analytics || data._raw || null : null;
}

export function processConsultaResults(deps, data) {
  const {
    state,
    isPriceIntelligenceDataset,
    isGovAnalyticsDataset,
    renderPagination,
    renderTable,
    saveToLocalStorage,
    logPriceUi
  } = deps;

  const isPriceDataset = isPriceIntelligenceDataset();
  const isAnalyticsDataset = isGovAnalyticsDataset();

  state.loading = false;
  state.hasActiveSearch = true;
  state.aiResults = null;
  state.rawData = data;

  applyDatasetResponses(state, data, isPriceDataset, isAnalyticsDataset);

  const metadata = resolveResponseMetadata(data, state);
  state.totalRecords = metadata.totalRecords;
  state.totalPages = metadata.totalPages;

  const items = resolveResponseItems(data);
  state.pageRawItems = Array.isArray(items) ? items : [];
  state.results = Mapeadores.mapear(state.dataset, items).map((row, index) => ({
    ...row,
    __sourceIndex: index
  }));

  if (isPriceDataset) {
    state.priceDashboard = createPriceDashboardState({
      ...state.priceDashboard,
      tablePage: 1
    });
  }

  renderPagination();
  renderTable();
  saveToLocalStorage();

  if (isPriceDataset) {
    logPriceUi('LOAD', {
      status: 'success',
      registros: state.results.length,
      total: state.totalRecords,
      paginas: state.totalPages
    });
  }

  console.log(`Resultados: ${state.results.length} itens | Página ${state.currentPage}/${state.totalPages}`);
}

function buildGenericCsv(state) {
  const headers = ['Código', 'Descrição', 'Unidade/UF', 'Órgão/UASG', 'Status', 'Atualização', 'Valor'];
  const rows = state.results.map((row) => [
    row.codigo,
    `"${row.descricao.replace(/"/g, '""')}"`,
    row.unidade,
    `"${row.orgao.replace(/"/g, '""')}"`,
    row.status,
    row.dataAtualizacao,
    row.valor
  ]);

  let csv = headers.join(';') + '\n';
  csv += rows.map((row) => row.join(';')).join('\n');

  return new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
}

function downloadBlobFile(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

export function exportConsultaResults(deps) {
  const { state, isPriceIntelligenceDataset, isGovAnalyticsDataset } = deps;

  if (isPriceIntelligenceDataset()) {
    return exportPriceIntelligenceData(deps, 'csv');
  }

  if (isGovAnalyticsDataset()) {
    return exportGovAnalyticsData(deps, 'csv');
  }

  if (!state.results || state.results.length === 0) {
    alert('Nenhum dado para exportar.');
    return null;
  }

  return downloadBlobFile(
    buildGenericCsv(state),
    `consulta_${state.dataset}_${new Date().toISOString().slice(0, 10)}.csv`
  );
}

function handleExportError(title, error) {
  console.error(`❌ ${title}:`, error);
  const mensagem = error?.message || 'Falha ao exportar os dados filtrados.';

  if (typeof window.mostrarErroCopivel === 'function') {
    window.mostrarErroCopivel('Falha na exportação', mensagem, 'Tente novamente com filtros mais restritos.');
    return;
  }

  alert(`Falha na exportação\n\n${mensagem}`);
}

function canExportCurrentFilters({ state, collectFilters, canSearchWithFilters, setSearchHint, getRequiredHint, datasets }) {
  collectFilters();

  if (canSearchWithFilters(state.filters)) {
    return true;
  }

  setSearchHint(getRequiredHint(datasets[state.dataset]));
  return false;
}

export async function exportPriceIntelligenceData(deps, explicitFormat = null) {
  const { state, collectFilters, canSearchWithFilters, setSearchHint, getRequiredHint, datasets } = deps;

  if (!deps.isPriceIntelligenceDataset()) {
    return;
  }

  if (!canExportCurrentFilters({ state, collectFilters, canSearchWithFilters, setSearchHint, getRequiredHint, datasets })) {
    return;
  }

  const formatSelector = document.getElementById('priceExportFormat');
  const selectedFormat = explicitFormat || formatSelector?.value || 'csv';
  const payload = {
    ...state.filters,
    pagina: state.currentPage,
    tipoCatalogo: state.filters.tipoCatalogo || 'material'
  };

  try {
    const exported = await API.exportPrecosPraticados(payload, selectedFormat);
    downloadBlobFile(exported.blob, exported.filename || `inteligencia-precos.${selectedFormat}`);
  } catch (error) {
    handleExportError('Falha ao exportar Módulo 3', error);
  }
}

export async function exportGovAnalyticsData(deps, explicitFormat = null) {
  const { state, collectFilters, canSearchWithFilters, setSearchHint, getRequiredHint, datasets } = deps;

  if (!deps.isGovAnalyticsDataset()) {
    return;
  }

  if (!canExportCurrentFilters({ state, collectFilters, canSearchWithFilters, setSearchHint, getRequiredHint, datasets })) {
    return;
  }

  const selectedFormat = explicitFormat || 'csv';
  const payload = {
    ...state.filters,
    pagina: state.currentPage,
    tipoCatalogo: state.filters.tipoCatalogo || 'material'
  };

  const exporter = state.dataset === 'fornecedor' ? API.exportFornecedorAnalytics : API.exportUASGAnalytics;

  try {
    const exported = await exporter(payload, selectedFormat);
    downloadBlobFile(exported.blob, exported.filename || `inteligencia-${state.dataset}.${selectedFormat}`);
  } catch (error) {
    handleExportError('Falha ao exportar painel analítico', error);
  }
}

function resolvePriceRowBySourceIndex(state, sourceIndex) {
  const parsed = Number.parseInt(sourceIndex, 10);
  if (!Number.isFinite(parsed)) {
    return {
      row: null,
      rawItem: null
    };
  }

  const row = state.results.find((entry) => Number(entry.__sourceIndex) === parsed) || null;
  const fallbackRow = row || state.results[parsed] || null;
  const rawItem = state.pageRawItems[parsed] || fallbackRow?.extras || fallbackRow;

  return {
    row: fallbackRow,
    rawItem
  };
}

export function showConsultaJsonModal({ state }, sourceIndex) {
  const { row, rawItem } = resolvePriceRowBySourceIndex(state, sourceIndex);
  if (!row) {
    return;
  }

  const json = JSON.stringify(rawItem || row.extras || row, null, 2);
  const modal = `
    <div class="modal-overlay" id="jsonModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>JSON Completo - ${escapeHtmlContent(row.codigo)}</h3>
          <button class="btn-close" onclick="document.getElementById('jsonModal').remove()" aria-label="Fechar">×</button>
        </div>
        <div class="modal-body">
          <pre><code>${escapeHtmlContent(json)}</code></pre>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('jsonModal').remove()">Fechar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modal);
}

export function activatePriceDetailTab(tabButton) {
  const tabValue = tabButton?.dataset?.detailTab;
  if (!tabValue) {
    return;
  }

  const root = tabButton.closest('.modal-body');
  if (!root) {
    return;
  }

  root.querySelectorAll('.pi-detail-tab').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.detailTab === tabValue);
  });

  root.querySelectorAll('.pi-detail-panel').forEach((panel) => {
    const shouldActivate = panel.dataset.detailPanel === tabValue;
    panel.classList.toggle('is-active', shouldActivate);
    panel.hidden = !shouldActivate;
  });
}

export function showPriceDetailModal({ state, isPriceIntelligenceDataset }, sourceIndex) {
  if (!isPriceIntelligenceDataset()) {
    return;
  }

  const { rawItem } = resolvePriceRowBySourceIndex(state, sourceIndex);
  const item = rawItem;
  if (!item) {
    return;
  }

  const modal = `
    <div class="modal-overlay" id="priceDetailsModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Detalhes do Registro - ${escapeHtmlContent(item.codigoItemCatalogo || item.idItemCompra || 'Modulo 3')}</h3>
          <button class="btn-close" onclick="document.getElementById('priceDetailsModal').remove()" aria-label="Fechar">×</button>
        </div>
        <div class="modal-body">
          ${renderPriceDetailsModalContent(item)}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('priceDetailsModal').remove()">Fechar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modal);
}
