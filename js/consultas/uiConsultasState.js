import { DATASETS } from './datasetsConfig.js';
import { createPriceDashboardState } from './precosPraticadosRenderer.js';
import { shouldAutoSearch } from './uiConsultasFilters.js';

export { sanitizeCodesInput, normalizeText, shouldAutoSearch, createSearchSignature } from './uiConsultasFilters.js';

export const AUTO_SEARCH_DEBOUNCE_MS = 650;
export const PRICE_INTELLIGENCE_DATASET = 'precos-praticados';

export const state = {
  dataset: null,
  filters: {},
  currentPage: 1,
  totalPages: 0,
  totalRecords: 0,
  results: [],
  rawData: null,
  loading: false,
  currentView: 'menu',
  hasActiveSearch: false,
  lastSearchSignature: null,
  inFlightSignature: null,
  priceIntelligenceResponse: null,
  analyticsResponse: null,
  pageRawItems: [],
  priceUiError: null,
  priceDashboard: createPriceDashboardState()
};

export function resetConsultaState({ dataset = null, currentView = 'menu' } = {}) {
  state.dataset = dataset;
  state.currentView = currentView;
  state.filters = dataset ? getDefaultFiltersForDataset(dataset) : {};
  state.results = [];
  state.currentPage = 1;
  state.totalPages = 0;
  state.totalRecords = 0;
  state.hasActiveSearch = false;
  state.lastSearchSignature = null;
  state.inFlightSignature = null;
  state.rawData = null;
  state.priceIntelligenceResponse = null;
  state.analyticsResponse = null;
  state.pageRawItems = [];
  state.priceUiError = null;
  state.priceDashboard = createPriceDashboardState();
}

function isPriceUiDebugEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.SINGEM_DEBUG_PRICE_UI === true) {
    return true;
  }

  const host = String(window.location?.hostname || '');
  return host === 'localhost' || host === '127.0.0.1';
}

export function logPriceUi(scope, payload = {}) {
  if (!isPriceUiDebugEnabled()) {
    return;
  }

  try {
    console.log(`[PRICE_UI][${scope}]`, payload);
  } catch {
    // noop
  }
}

export function isPriceIntelligenceDataset(dataset = state.dataset) {
  return dataset === PRICE_INTELLIGENCE_DATASET;
}

export function isGovAnalyticsDataset(dataset = state.dataset) {
  return dataset === 'fornecedor' || dataset === 'uasg';
}

export function getDefaultFiltersForDataset(dataset = state.dataset) {
  if (isPriceIntelligenceDataset(dataset)) {
    return { tipoCatalogo: 'material' };
  }

  if (dataset === 'uasg') {
    return {
      entity: 'uasg',
      tipoCatalogo: 'material'
    };
  }

  if (dataset === 'fornecedor') {
    return { tipoCatalogo: 'material' };
  }

  return {};
}

export function setSearchHint(message = '') {
  const hint = document.getElementById('consultaHint');
  if (!hint) {
    return;
  }

  hint.textContent = String(message || '').trim();
}

export function getRequiredHint(config = DATASETS[state.dataset]) {
  if (isPriceIntelligenceDataset()) {
    return 'Informe ao menos um código CATMAT/CATSER para gerar o painel de preços.';
  }

  if (state.dataset === 'fornecedor') {
    return 'Informe um filtro oficial do fornecedor ou códigos CATMAT/CATSER para cruzamento analítico.';
  }

  if (state.dataset === 'uasg') {
    return 'Informe código UASG/órgão, CNPJ, UF, uso SISG ou códigos CATMAT/CATSER.';
  }

  const requiredFilters = Array.isArray(config?.requiredFilters) ? config.requiredFilters : [];
  if (!requiredFilters.length) {
    return 'Informe ao menos um filtro para pesquisar.';
  }

  const labels = (config?.filters || [])
    .filter((filter) => requiredFilters.includes(filter.name))
    .map((filter) => filter.label);

  return `Preencha: ${(labels.length ? labels : requiredFilters).join(', ')}.`;
}

export function canSearchWithFilters(filters = {}, dataset = state.dataset) {
  const hasValue = (name) => {
    const value = filters?.[name];
    return value !== undefined && value !== null && String(value).trim() !== '';
  };

  if (isPriceIntelligenceDataset(dataset)) {
    return hasValue('codigos');
  }

  if (dataset === 'fornecedor') {
    return (
      hasValue('cnpj') ||
      hasValue('cpf') ||
      hasValue('naturezaJuridicaId') ||
      hasValue('porteEmpresaId') ||
      hasValue('codigoCnae') ||
      hasValue('ativo') ||
      hasValue('codigos')
    );
  }

  if (dataset === 'uasg') {
    return (
      hasValue('codigoUasg') ||
      hasValue('codigoOrgao') ||
      hasValue('cnpjCpfOrgao') ||
      hasValue('cnpjCpfOrgaoVinculado') ||
      hasValue('cnpjCpfOrgaoSuperior') ||
      hasValue('siglaUf') ||
      hasValue('usoSisg') ||
      hasValue('codigos')
    );
  }

  const requiredFilters = Array.isArray(DATASETS[dataset]?.requiredFilters) ? DATASETS[dataset].requiredFilters : [];
  if (requiredFilters.length) {
    return requiredFilters.every((name) => hasValue(name));
  }

  return Object.values(filters || {}).some((value) => String(value || '').trim() !== '');
}

export function hasAnyTextFilterTooShort(filters = {}, dataset = state.dataset) {
  const config = DATASETS[dataset];
  if (!config?.filters) {
    return false;
  }

  const ignoredFields = new Set([
    'codigoItem',
    'codigoGrupo',
    'codigoClasse',
    'codigoPdm',
    'codigoUasg',
    'codigoOrgao',
    'cnpj',
    'cpf',
    'cnpjCpfOrgao',
    'cnpjCpfOrgaoVinculado',
    'cnpjCpfOrgaoSuperior',
    'siglaUf',
    'estado',
    'codigoCnae',
    'naturezaJuridicaId',
    'porteEmpresaId',
    'bps',
    'codigo_ncm',
    'numeroAtaRegistroPreco',
    'codigoUnidadeGerenciadora',
    'codigoModalidadeCompra',
    'numeroCompra',
    'niFornecedor',
    'uasg',
    'numeroLicitacao',
    'modalidade',
    'ano',
    'mes'
  ]);

  return config.filters.some((filter) => {
    if (filter.type !== 'text' || ignoredFields.has(filter.name)) {
      return false;
    }

    const value = String(filters?.[filter.name] || '').trim();
    return value.length > 0 && !shouldAutoSearch(value);
  });
}

export function setFiltersOnForm(filters = {}) {
  const config = DATASETS[state.dataset];
  if (!config?.filters) {
    return;
  }

  config.filters.forEach((filter) => {
    const input = document.getElementById(`filter_${filter.name}`);
    if (!input || filters[filter.name] === undefined || filters[filter.name] === null) {
      return;
    }

    input.value = Array.isArray(filters[filter.name]) ? filters[filter.name].join(', ') : String(filters[filter.name]);
  });
}

export function getCatalogTypeForShortcut(dataset = state.dataset) {
  if (dataset === 'servicos') {
    return 'servico';
  }

  if (dataset === 'materiais') {
    return 'material';
  }

  if (dataset === PRICE_INTELLIGENCE_DATASET) {
    return state.filters.tipoCatalogo || 'material';
  }

  return null;
}

export function createDebouncedSearch(callback, delay = AUTO_SEARCH_DEBOUNCE_MS) {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
