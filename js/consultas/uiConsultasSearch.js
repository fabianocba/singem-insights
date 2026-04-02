import * as Cache from './cache.js';
import { DATASETS } from './datasetsConfig.js';
import {
  PRICE_INTELLIGENCE_DATASET,
  state,
  logPriceUi,
  isPriceIntelligenceDataset,
  isGovAnalyticsDataset,
  sanitizeCodesInput,
  getRequiredHint,
  canSearchWithFilters,
  normalizeText,
  hasAnyTextFilterTooShort,
  createSearchSignature
} from './uiConsultasState.js';
import { createPriceDashboardState } from './precosPraticadosRenderer.js';

async function fetchAiSearchHints(queryText, dataset = state.dataset) {
  void queryText;
  void dataset;
  return null;
}

function resolveAiFallbackQueryText(filters = {}, dataset = state.dataset) {
  const valuesByKey = Object.entries(filters || {}).reduce((acc, [key, value]) => {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(value || '').trim();
    if (!normalizedKey || !normalizedValue) {
      return acc;
    }

    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});

  const priorityKeys =
    dataset === PRICE_INTELLIGENCE_DATASET
      ? ['codigos', 'descricao', 'fornecedor', 'marca', 'modalidade', 'estado']
      : [
          'descricao',
          'objeto',
          'descricaoItem',
          'nomeUasg',
          'nomeOrgao',
          'fornecedor',
          'numeroAta',
          'codigoItem',
          'cnpjOrgao',
          'uasg',
          'numeroLicitacao',
          'codigoGrupo',
          'codigoClasse'
        ];

  const ignoredValues = new Set(['material', 'servico', 'ativo', 'inativo']);

  for (const key of priorityKeys) {
    const candidate = valuesByKey[key];
    if (!candidate) {
      continue;
    }

    const normalizedCandidate = normalizeText(candidate);
    if (normalizedCandidate.length >= 3 && !ignoredValues.has(normalizedCandidate)) {
      return candidate;
    }
  }

  const controlKeys = new Set([
    'pagina',
    'tipoCatalogo',
    'status',
    'periodo',
    'mes',
    'ano',
    'ordenacao',
    'forceRefresh',
    'forcaRefresh',
    'tamanhoPagina'
  ]);

  const fallbackEntry = Object.entries(valuesByKey).find(([key, value]) => {
    if (controlKeys.has(String(key || '').trim())) {
      return false;
    }

    const normalizedCandidate = normalizeText(value);
    return normalizedCandidate.length >= 3 && !ignoredValues.has(normalizedCandidate);
  });

  return fallbackEntry?.[1] || null;
}

export function createConsultaSearchController({ renderTable, processResults, setSearchHint }) {
  function collectFilters() {
    const config = DATASETS[state.dataset];
    if (!config) {
      return;
    }

    state.filters = {};

    config.filters.forEach((filter) => {
      const input = document.getElementById(`filter_${filter.name}`);
      if (!input) {
        return;
      }

      let value = input.value.trim();
      if (!value) {
        return;
      }

      if (isPriceIntelligenceDataset() || isGovAnalyticsDataset()) {
        if (filter.name === 'codigos') {
          value = sanitizeCodesInput(value);
          input.value = value;
        }

        if (filter.name === 'estado' || filter.name === 'siglaUf') {
          value = value.toUpperCase();
          input.value = value;
        }
      }

      state.filters[filter.name] = value;
    });

    if (isPriceIntelligenceDataset()) {
      logPriceUi('FILTERS', {
        filtros: { ...state.filters },
        pagina: state.currentPage
      });
    }
  }

  function validateSearchExecution(config) {
    if (!state.dataset) {
      state.hasActiveSearch = false;
      alert('Selecione um conjunto de dados.');
      return false;
    }

    if (!config || !config.apiFunction) {
      state.hasActiveSearch = false;
      alert('Dataset inválido.');
      return false;
    }

    if (!canSearchWithFilters(state.filters)) {
      state.hasActiveSearch = false;
      setSearchHint(getRequiredHint(config));
      return false;
    }

    return true;
  }

  function buildSearchParams(force, isPriceDataset) {
    const params = {
      ...state.filters,
      pagina: state.currentPage,
      tipoCatalogo: state.filters.tipoCatalogo || 'material'
    };

    if ((isPriceDataset || isGovAnalyticsDataset()) && force) {
      params.forceRefresh = true;
    }

    return params;
  }

  function describeSearchError(error) {
    const info = {
      title: 'Erro ao buscar dados',
      message: error?.message || 'Falha inesperada na consulta.',
      details: ''
    };

    const errorMessage = String(error?.message || '');

    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('conectar com a API')) {
      const apiBase = window.__API_BASE_URL__ || window.CONFIG?.api?.baseUrl || window.location.origin;
      const healthUrl = `${String(apiBase).replace(/\/+$/, '')}/api/compras/health`;

      info.title = 'Erro de Conexão';
      info.details =
        'Possíveis causas:\n' +
        '• Sem conexão com a internet\n' +
        '• Proxy backend do SINGEM indisponível\n' +
        '• Upstream do Compras.gov.br fora do ar\n\n' +
        'Teste acessar no navegador:\n' +
        healthUrl;
      return info;
    }

    if (errorMessage.includes('CORS')) {
      info.title = 'Erro de Proxy';
      info.details =
        'As consultas devem passar pelo backend do SINGEM.\n' +
        'Verifique se o servidor está ativo e se /api/compras está acessível.';
      return info;
    }

    if (errorMessage.includes('tempo limite') || errorMessage.includes('Timeout')) {
      info.title = 'Timeout';
      info.details = 'A requisição demorou mais de 30 segundos.\nTente novamente ou ajuste os filtros.';
      return info;
    }

    if (errorMessage.includes('404')) {
      info.title = 'Endpoint não encontrado';
      info.details = 'O endpoint da API não existe ou foi alterado.';
      return info;
    }

    if (errorMessage.includes('429')) {
      info.title = 'Muitas requisições';
      info.details = 'A API está limitando o número de requisições.\nAguarde alguns segundos e tente novamente.';
    }

    return info;
  }

  function presentSearchError(errorInfo, isPriceDataset) {
    if (isPriceDataset) {
      state.priceUiError = {
        title: errorInfo.title,
        message: errorInfo.message,
        details: errorInfo.details
      };

      logPriceUi('LOAD', {
        status: 'error',
        titulo: errorInfo.title,
        mensagem: errorInfo.message
      });

      renderTable();
      return;
    }

    if (typeof window.mostrarErroCopivel === 'function') {
      window.mostrarErroCopivel(errorInfo.title, errorInfo.message, errorInfo.details);
    } else {
      alert(`${errorInfo.title}\n\n${errorInfo.message}${errorInfo.details ? '\n\n' + errorInfo.details : ''}`);
    }

    renderTable();
  }

  async function executeSearch({ force = false } = {}) {
    const config = DATASETS[state.dataset];
    if (!validateSearchExecution(config)) {
      return;
    }

    const isPriceDataset = isPriceIntelligenceDataset();
    const isAnalyticsDataset = isGovAnalyticsDataset();
    if (isPriceDataset) {
      state.priceUiError = null;
    }

    if (isAnalyticsDataset) {
      state.analyticsResponse = null;
    }

    const params = buildSearchParams(force, isPriceDataset);
    if (isPriceDataset) {
      logPriceUi('LOAD', {
        tipo: force ? 'force-refresh' : 'query',
        pagina: state.currentPage,
        filtros: { ...state.filters }
      });
    }

    const signature = createSearchSignature(state.dataset, params);
    if (!force && signature === state.lastSearchSignature) {
      return;
    }

    state.lastSearchSignature = signature;
    state.inFlightSignature = signature;

    const cached = Cache.get(state.dataset, params);
    if (cached) {
      if (isPriceDataset) {
        logPriceUi('LOAD', { origem: 'cache-local', pagina: state.currentPage });
      }

      state.hasActiveSearch = true;
      state.inFlightSignature = null;
      processResults(cached);
      return;
    }

    state.loading = true;
    renderTable();

    try {
      const data = await config.apiFunction(params, {
        forceRefresh: isPriceDataset && force
      });

      if (state.inFlightSignature !== signature) {
        return;
      }

      Cache.set(state.dataset, params, data);
      processResults(data);
      if (state.inFlightSignature === signature) {
        state.inFlightSignature = null;
      }
    } catch (error) {
      if (error?.name === 'AbortError' || error?.isAbort === true) {
        if (state.inFlightSignature === signature) {
          state.inFlightSignature = null;
        }
        state.loading = false;
        renderTable();
        return;
      }

      if (state.inFlightSignature === signature) {
        state.inFlightSignature = null;
      }
      state.loading = false;
      state.hasActiveSearch = false;
      state.lastSearchSignature = null;
      state.analyticsResponse = null;
      console.error('❌ Erro na busca:', error);
      console.error('   Dataset:', state.dataset);
      console.error('   Filtros:', state.filters);

      presentSearchError(describeSearchError(error), isPriceDataset);
    }
  }

  function triggerSearch({ source = 'manual', force = false, resetPage = false } = {}) {
    collectFilters();

    if (!canSearchWithFilters(state.filters)) {
      state.hasActiveSearch = false;
      setSearchHint(getRequiredHint(DATASETS[state.dataset]));
      return;
    }

    if (!force && source === 'auto' && hasAnyTextFilterTooShort(state.filters)) {
      setSearchHint('Digite pelo menos 3 caracteres para pesquisar');
      return;
    }

    if (resetPage) {
      state.currentPage = 1;

      if (isPriceIntelligenceDataset()) {
        state.priceDashboard = createPriceDashboardState({
          ...state.priceDashboard,
          tablePage: 1
        });
      }
    }

    if (isPriceIntelligenceDataset()) {
      state.priceUiError = null;
    } else if (isGovAnalyticsDataset()) {
      state.analyticsResponse = null;
    }

    setSearchHint('');
    executeSearch({ force });

    const firstTextFilter = Object.values(state.filters).find((value) => String(value || '').trim().length >= 3);
    const fallbackQueryText = resolveAiFallbackQueryText(state.filters, state.dataset);
    const queryText = firstTextFilter || fallbackQueryText;
    if (queryText) {
      fetchAiSearchHints(queryText, state.dataset).catch(() => {});
    }
  }

  return {
    collectFilters,
    executeSearch,
    triggerSearch
  };
}
