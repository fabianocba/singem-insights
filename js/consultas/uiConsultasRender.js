import { escapeHTML as escapeHtmlContent } from '../utils/sanitize.js';
import { DATASETS } from './datasetsConfig.js';
import {
  state,
  isPriceIntelligenceDataset,
  isGovAnalyticsDataset,
  getCatalogTypeForShortcut
} from './uiConsultasState.js';
import {
  renderPriceIntelligenceErrorState,
  renderPriceIntelligenceLoadingState,
  renderPriceIntelligenceResults,
  renderPriceIntelligenceZeroState
} from './precosPraticadosRenderer.js';
import { renderGovAnalyticsPanel } from './govAnalyticsRenderer.js';

export function setupAPIModeToggle() {
  const btnToggle = document.getElementById('btnToggleAPIMode');
  if (btnToggle) {
    btnToggle.disabled = true;
    btnToggle.title = 'Modo demo desativado. Consultas operam somente em modo real.';
  }
}

export function updateAPIModeUI() {
  const statusText = document.getElementById('apiStatusText');
  const btnToggle = document.getElementById('btnToggleAPIMode');

  if (statusText && btnToggle) {
    statusText.textContent = '🌐 Modo: API Real';
    btnToggle.textContent = '🎭 Modo Demo Desativado';
  }
}

export function renderFilters(setSearchHint) {
  const container = document.getElementById('filtersContainer');
  if (!container) {
    return;
  }

  if (!state.dataset) {
    container.innerHTML = '<p class="text-muted">Selecione uma consulta no menu principal.</p>';
    return;
  }

  const config = DATASETS[state.dataset];
  if (!config || !config.filters) {
    container.innerHTML = '<p class="text-muted">Nenhum filtro disponível.</p>';
    return;
  }

  const isPriceModule = isPriceIntelligenceDataset();
  const isGovAnalyticsModule = isGovAnalyticsDataset();
  const isIntegratedAnalyticsModule = isPriceModule || isGovAnalyticsModule;
  const gridClass = isPriceModule ? 'filters-grid filters-grid--price' : 'filters-grid';
  const filtersSection = container.closest('.filters-section');

  if (filtersSection) {
    filtersSection.classList.toggle('filters-section--price', isPriceModule);
  }

  let html = '';

  if (isPriceModule) {
    html += `
      <div class="filters-header filters-header--price">
        <h4>Filtros executivos</h4>
        <p>Defina o recorte de analise por catalogo, periodo, modalidade, localidade e fornecedores.</p>
      </div>
    `;
  } else if (isGovAnalyticsModule) {
    html += `
      <div class="filters-header filters-header--price">
        <h4>Painel analítico integrado</h4>
        <p>Combine filtros oficiais de fornecedor/UASG com códigos CATMAT ou CATSER para cruzar histórico de preços.</p>
      </div>
    `;
  }

  html += `<div class="${gridClass}">`;

  config.filters.forEach((filter) => {
    const itemClasses = ['filter-item'];

    if (isIntegratedAnalyticsModule) {
      itemClasses.push('filter-item--price');

      if (
        [
          'codigos',
          'fornecedor',
          'marca',
          'nomeFornecedor',
          'cnpjCpfOrgao',
          'cnpjCpfOrgaoVinculado',
          'cnpjCpfOrgaoSuperior'
        ].includes(filter.name)
      ) {
        itemClasses.push('filter-item--wide');
      }

      if (['dataCompraInicio', 'dataCompraFim', 'ano', 'mes', 'estado', 'siglaUf', 'entity'].includes(filter.name)) {
        itemClasses.push('filter-item--compact');
      }
    }

    html += `<div class="${itemClasses.join(' ')}">`;
    html += `<label for="filter_${filter.name}">${filter.label}</label>`;

    if (filter.type === 'select') {
      html += `<select id="filter_${filter.name}" name="${filter.name}" data-filter-type="${filter.type}" class="form-control" aria-label="${filter.label}">`;
      filter.options.forEach((opt) => {
        const selected = state.filters[filter.name] === opt.value ? 'selected' : '';
        html += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
      });
      html += `</select>`;
    } else {
      const value = state.filters[filter.name] || '';
      const maxLength = filter.maxLength ? `maxlength="${filter.maxLength}"` : '';
      const placeholder = filter.placeholder || '';
      html += `<input type="${filter.type}" id="filter_${filter.name}" name="${filter.name}"
               class="form-control" placeholder="${placeholder}"
               value="${value}" data-filter-type="${filter.type}" ${maxLength} aria-label="${filter.label}">`;
    }

    html += `</div>`;
  });

  html += '</div>';

  const actionsHtml = config.supportsBackendExport
    ? `
      <button id="btnBuscar" class="btn btn-primary" aria-label="Buscar dados">
        Buscar
      </button>
      <button id="btnLimpar" class="btn btn-secondary" aria-label="Limpar filtros">
        Limpar
      </button>
      <button id="btnAtualizarAgora" class="btn btn-warning" aria-label="Atualizar dados no upstream">
        Atualizar
      </button>
      <button id="btnExportPriceDataTop" class="btn btn-success" aria-label="Exportar resultados filtrados">
        Exportar
      </button>
    `
    : `
      <button id="btnBuscar" class="btn btn-primary" aria-label="Buscar dados">
        Buscar
      </button>
      <button id="btnLimpar" class="btn btn-secondary" aria-label="Limpar filtros">
        Limpar filtros
      </button>
      <button id="btnLimparCache" class="btn btn-warning" aria-label="Limpar cache">
        Limpar cache
      </button>
    `;

  html += `
    <div class="filters-actions ${isPriceModule ? 'filters-actions--price' : ''}">
      ${actionsHtml}
    </div>
    ${
      config.backendHint
        ? `<p class="text-muted">${escapeHtmlContent(config.backendHint)}</p>`
        : config.supportsBackendExport
          ? '<p class="text-muted">Aceita multiplos codigos CATMAT/CATSER separados por virgula, espaco ou quebra de linha.</p>'
          : ''
    }
    <p id="consultaHint" class="text-muted" aria-live="polite"></p>
  `;

  container.innerHTML = html;
  setSearchHint('');
}

export function renderPagination() {
  const containers = [
    document.getElementById('paginationContainer'),
    document.getElementById('paginationContainer2')
  ].filter(Boolean);

  if (!containers.length) {
    return;
  }

  if (!state.dataset || state.totalPages === 0) {
    containers.forEach((container) => {
      container.innerHTML = '';
    });
    return;
  }

  const html = `
    <div class="pagination-controls">
      <button id="btnPrevPage" class="btn btn-sm btn-secondary"
              ${state.currentPage <= 1 ? 'disabled' : ''}
              aria-label="Página anterior">
        ◀ Anterior
      </button>

      <span class="pagination-info">
        Página <strong>${state.currentPage}</strong> de <strong>${state.totalPages}</strong>
        ${state.totalRecords > 0 ? `| Total: <strong>${state.totalRecords}</strong> registros` : ''}
      </span>

      <button id="btnNextPage" class="btn btn-sm btn-secondary"
              ${state.currentPage >= state.totalPages ? 'disabled' : ''}
              aria-label="Próxima página">
        Próxima ▶
      </button>
    </div>
  `;

  containers.forEach((container) => {
    container.innerHTML = html;
  });
}

export function renderTable() {
  const container = document.getElementById('resultsTable');
  if (!container) {
    return;
  }

  const analyticsPanelHtml =
    isGovAnalyticsDataset() && state.analyticsResponse
      ? renderGovAnalyticsPanel(state.analyticsResponse, state.dataset)
      : '';

  if (state.loading) {
    if (isPriceIntelligenceDataset()) {
      container.innerHTML = renderPriceIntelligenceLoadingState();
      return;
    }

    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Carregando dados...</p>
      </div>
    `;
    return;
  }

  if (isPriceIntelligenceDataset()) {
    if (state.priceUiError) {
      container.innerHTML = renderPriceIntelligenceErrorState(state.priceUiError);
      return;
    }

    if (state.priceIntelligenceResponse) {
      container.innerHTML = renderPriceIntelligenceResults(
        state.priceIntelligenceResponse,
        state.results || [],
        state.priceDashboard
      );
      return;
    }

    container.innerHTML = renderPriceIntelligenceZeroState({
      title: 'Nenhuma consulta executada',
      message: 'Configure os filtros premium e clique em Buscar para gerar o dashboard executivo.'
    });
    return;
  }

  if (!state.results || state.results.length === 0) {
    container.innerHTML = `${analyticsPanelHtml}
      <div class="empty-state">
        <p>📋 Nenhum resultado encontrado.</p>
        <p class="text-muted">Ajuste os filtros e tente novamente.</p>
      </div>
    `;
    return;
  }

  const config = DATASETS[state.dataset] || {};
  const columns =
    Array.isArray(config.columns) && config.columns.length > 0
      ? config.columns
      : [
          { label: 'Código', key: 'codigo' },
          { label: 'Descrição', key: 'descricao' },
          { label: 'Unidade/UF', key: 'unidade' },
          { label: 'Órgão/UASG', key: 'orgao' },
          { label: 'Status', key: 'status' },
          { label: 'Atualização', key: 'dataAtualizacao' },
          { label: 'Valor', key: 'valor' }
        ];

  const readColumnValue = (row, key) => {
    const value = row?.[key] ?? row?.extras?.[key];
    return value === undefined || value === null || value === '' ? '-' : String(value);
  };

  let html = `
    <div class="table-actions">
      <button id="btnExportCSV" class="btn btn-success" aria-label="Exportar para CSV">
        📥 Exportar CSV
      </button>
      <span class="text-muted">${state.results.length} registros exibidos</span>
    </div>

    <div class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            ${columns.map((column) => `<th>${escapeHtmlContent(column.label)}</th>`).join('')}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  const shortcutCatalogType = getCatalogTypeForShortcut();

  state.results.forEach((row, index) => {
    const hasShortcutCode = row?.codigo && row.codigo !== '-';
    const shortcutButton =
      shortcutCatalogType && hasShortcutCode
        ? `<button class="btn btn-sm btn-primary btn-open-price-intelligence" data-index="${index}" data-catalog-type="${shortcutCatalogType}"
                  aria-label="Abrir Módulo 3 para este item" title="Ver preços praticados deste item">
            📈 Preços
          </button>`
        : '';

    html += `
      <tr>
        ${columns
          .map((column) => {
            const rawValue = readColumnValue(row, column.key);
            const safeValue = escapeHtmlContent(rawValue);
            const cellClass =
              column.key === 'descricao' ? 'description-cell' : column.key === 'orgao' ? 'orgao-cell' : '';
            return `<td class="${cellClass}" title="${safeValue}">${safeValue}</td>`;
          })
          .join('')}
        <td>
          ${shortcutButton}
          <button class="btn btn-sm btn-info btn-view-json" data-index="${index}"
                  aria-label="Ver JSON completo" title="Ver JSON completo">
            📄 JSON
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = `${analyticsPanelHtml}${html}`;
}
