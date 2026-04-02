/* eslint-disable max-lines -- modulo legado grande; sera quebrado em submodulos no roadmap */
/**
 * uiConsultas.js
 * Interface de usuário para Consulte Compras.gov (Dados Abertos Compras.gov.br)
 * Interface para consultas e painéis analíticos integrados
 */

import * as API from './apiCompras.js';
// Fornecedor já exportado do mesmo módulo apiCompras.js
import * as Cache from './cache.js';
import { escapeHTML as escapeHtmlContent } from '../utils/sanitize.js';
import {
  createPriceDashboardState,
  renderPriceIntelligenceErrorState,
  renderPriceIntelligenceLoadingState,
  renderPriceIntelligenceResults,
  renderPriceIntelligenceZeroState
} from './precosPraticadosRenderer.js';
import { renderGovAnalyticsPanel } from './govAnalyticsRenderer.js';
import {
  activatePriceDetailTab,
  exportConsultaResults,
  exportGovAnalyticsData,
  exportPriceIntelligenceData,
  processConsultaResults,
  showConsultaJsonModal,
  showPriceDetailModal
} from './uiConsultasActions.js';

const AUTO_SEARCH_DEBOUNCE_MS = 650;
const PRICE_INTELLIGENCE_DATASET = 'precos-praticados';

/**
 * Estado atual da aplicação
 */
const state = {
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

let debouncedAutoSearch = null;
let listenersAttached = false;

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

function logPriceUi(scope, payload = {}) {
  if (!isPriceUiDebugEnabled()) {
    return;
  }

  try {
    console.log(`[PRICE_UI][${scope}]`, payload);
  } catch {
    // noop
  }
}

function isPriceIntelligenceDataset(dataset = state.dataset) {
  return dataset === PRICE_INTELLIGENCE_DATASET;
}

function isGovAnalyticsDataset(dataset = state.dataset) {
  return dataset === 'fornecedor' || dataset === 'uasg';
}

function getDefaultFiltersForDataset(dataset = state.dataset) {
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

function setSearchHint(message = '') {
  const hint = document.getElementById('consultaHint');
  if (!hint) {
    return;
  }

  hint.textContent = String(message || '').trim();
}

function sanitizeCodesInput(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[\s,;\n\r]+/);
  const uniqueCodes = [];
  const seen = new Set();

  source.forEach((entry) => {
    const normalized = String(entry || '').replace(/\D/g, '');
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    uniqueCodes.push(normalized);
  });

  return uniqueCodes.join(', ');
}

function getRequiredHint(config = DATASETS[state.dataset]) {
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

function canSearchWithFilters(filters = {}, dataset = state.dataset) {
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

function hasAnyTextFilterTooShort(filters = {}, dataset = state.dataset) {
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

async function fetchAiSearchHints(queryText, dataset = state.dataset) {
  void queryText;
  void dataset;
  return null;
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function createSearchSignature(dataset, params = {}) {
  return stableSerialize({ dataset, params });
}

function setFiltersOnForm(filters = {}) {
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

function getCatalogTypeForShortcut(dataset = state.dataset) {
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

export function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

export function shouldAutoSearch(text) {
  return normalizeText(text).length >= 3;
}

const DATASETS = {
  materiais: {
    label: 'Catálogo – Material',
    apiFunction: API.getMateriais,
    filters: [
      {
        name: 'codigoItem',
        label: 'Código CATMAT',
        type: 'text',
        placeholder: 'Ex: 233420'
      },
      {
        name: 'descricaoItem',
        label: 'Descrição do Material',
        type: 'text',
        placeholder: 'Ex: papel sulfite'
      },
      {
        name: 'codigoGrupo',
        label: 'Código do Grupo',
        type: 'text',
        placeholder: 'Ex: 1'
      },
      {
        name: 'codigoClasse',
        label: 'Código da Classe',
        type: 'text',
        placeholder: 'Ex: 10'
      },
      {
        name: 'codigoPdm',
        label: 'Código PDM',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'statusItem',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: '1', label: 'Ativo' },
          { value: '0', label: 'Inativo' }
        ]
      },
      {
        name: 'bps',
        label: 'BPS',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'codigo_ncm',
        label: 'Código NCM',
        type: 'text',
        placeholder: 'Ex: 48025610'
      }
    ]
  },
  servicos: {
    label: 'Catálogo – Serviço',
    apiFunction: API.getServicos,
    filters: [
      {
        name: 'descricaoItem',
        label: 'Descrição do Serviço',
        type: 'text',
        placeholder: 'Ex: manutenção predial'
      },
      {
        name: 'codigoGrupo',
        label: 'Código do Grupo',
        type: 'text',
        placeholder: 'Ex: 1'
      },
      {
        name: 'codigoClasse',
        label: 'Código da Classe',
        type: 'text',
        placeholder: 'Ex: 10'
      },
      {
        name: 'statusItem',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: '1', label: 'Ativo' },
          { value: '0', label: 'Inativo' }
        ]
      }
    ]
  },
  'precos-praticados': {
    label: 'Módulo 3 - Preços Praticados (CATMAT/CATSER)',
    apiFunction: API.getPrecosPraticados,
    requiredFilters: ['codigos'],
    autoSearch: false,
    supportsBackendExport: true,
    filters: [
      {
        name: 'tipoCatalogo',
        label: 'Catálogo',
        type: 'select',
        options: [
          { value: 'material', label: 'CATMAT (Material)' },
          { value: 'servico', label: 'CATSER (Serviço)' }
        ]
      },
      {
        name: 'codigos',
        label: 'Códigos CATMAT/CATSER',
        type: 'text',
        placeholder: 'Ex: 233420, 233421'
      },
      {
        name: 'periodo',
        label: 'Período rápido',
        type: 'select',
        options: [
          { value: '', label: 'Sem período rápido' },
          { value: '30d', label: 'Últimos 30 dias' },
          { value: '90d', label: 'Últimos 90 dias' },
          { value: '180d', label: 'Últimos 180 dias' },
          { value: '12m', label: 'Últimos 12 meses' },
          { value: 'ano-atual', label: 'Ano atual' }
        ]
      },
      {
        name: 'dataCompraInicio',
        label: 'Data inicial',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'dataCompraFim',
        label: 'Data final',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'ano',
        label: 'Ano',
        type: 'number',
        placeholder: 'Ex: 2025'
      },
      {
        name: 'mes',
        label: 'Mês',
        type: 'select',
        options: [
          { value: '', label: 'Todos os meses' },
          { value: '1', label: '01 - Janeiro' },
          { value: '2', label: '02 - Fevereiro' },
          { value: '3', label: '03 - Março' },
          { value: '4', label: '04 - Abril' },
          { value: '5', label: '05 - Maio' },
          { value: '6', label: '06 - Junho' },
          { value: '7', label: '07 - Julho' },
          { value: '8', label: '08 - Agosto' },
          { value: '9', label: '09 - Setembro' },
          { value: '10', label: '10 - Outubro' },
          { value: '11', label: '11 - Novembro' },
          { value: '12', label: '12 - Dezembro' }
        ]
      },
      {
        name: 'modalidade',
        label: 'Modalidade',
        type: 'text',
        placeholder: 'Ex: pregão, dispensa, concorrência'
      },
      {
        name: 'estado',
        label: 'Estado (UF)',
        type: 'text',
        placeholder: 'Ex: BA',
        maxLength: 2
      },
      {
        name: 'codigoUasg',
        label: 'Código UASG',
        type: 'text',
        placeholder: 'Ex: 158129'
      },
      {
        name: 'fornecedor',
        label: 'Fornecedor',
        type: 'text',
        placeholder: 'Razão social ou CNPJ'
      },
      {
        name: 'marca',
        label: 'Marca',
        type: 'text',
        placeholder: 'Ex: HP'
      },
      {
        name: 'precoMin',
        label: 'Preço mínimo',
        type: 'number',
        placeholder: 'Ex: 10.50'
      },
      {
        name: 'precoMax',
        label: 'Preço máximo',
        type: 'number',
        placeholder: 'Ex: 200.00'
      },
      {
        name: 'ordenacao',
        label: 'Ordenação',
        type: 'select',
        options: [
          { value: 'data-desc', label: 'Data mais recente' },
          { value: 'data-asc', label: 'Data mais antiga' },
          { value: 'preco-desc', label: 'Maior preço' },
          { value: 'preco-asc', label: 'Menor preço' },
          { value: 'fornecedor-asc', label: 'Fornecedor (A-Z)' },
          { value: 'fornecedor-desc', label: 'Fornecedor (Z-A)' }
        ]
      }
    ]
  },
  uasg: {
    label: '05 - UASG',
    apiFunction: API.getUASG,
    supportsBackendExport: true,
    backendHint: 'Use filtros oficiais de UASG/órgão. Códigos CATMAT/CATSER ativam o cruzamento com preços praticados.',
    columns: [
      { label: 'Código UASG', key: 'codigo' },
      { label: 'Nome UASG', key: 'descricao' },
      { label: 'Órgão', key: 'orgao' },
      { label: 'UF', key: 'unidade' },
      { label: 'Status', key: 'status' },
      { label: 'Uso SISG', key: 'usoSisg' }
    ],
    filters: [
      {
        name: 'entity',
        label: 'Entidade',
        type: 'select',
        options: [
          { value: 'uasg', label: 'UASG' },
          { value: 'orgao', label: 'Órgão' }
        ]
      },
      {
        name: 'codigoUasg',
        label: 'Código UASG',
        type: 'text',
        placeholder: 'Ex: 158129'
      },
      {
        name: 'codigoOrgao',
        label: 'Código do Órgão',
        type: 'text',
        placeholder: 'Ex: 26232'
      },
      {
        name: 'cnpjCpfOrgao',
        label: 'CNPJ do Órgão',
        type: 'text',
        placeholder: 'Ex: 10773122000176'
      },
      {
        name: 'cnpjCpfOrgaoVinculado',
        label: 'CNPJ Órgão Vinculado',
        type: 'text',
        placeholder: 'Ex: 10773122000176'
      },
      {
        name: 'cnpjCpfOrgaoSuperior',
        label: 'CNPJ Órgão Superior',
        type: 'text',
        placeholder: 'Ex: 00394445000108'
      },
      {
        name: 'siglaUf',
        label: 'UF',
        type: 'text',
        placeholder: 'Ex: BA',
        maxLength: 2
      },
      {
        name: 'statusUasg',
        label: 'Status UASG',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Ativa' },
          { value: 'false', label: 'Inativa' }
        ]
      },
      {
        name: 'statusOrgao',
        label: 'Status Órgão',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' }
        ]
      },
      {
        name: 'usoSisg',
        label: 'Uso SISG',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' }
        ]
      },
      {
        name: 'tipoCatalogo',
        label: 'Catálogo p/ cruzamento',
        type: 'select',
        options: [
          { value: 'material', label: 'CATMAT (Material)' },
          { value: 'servico', label: 'CATSER (Serviço)' }
        ]
      },
      {
        name: 'codigos',
        label: 'Códigos CATMAT/CATSER',
        type: 'text',
        placeholder: 'Ex: 233420, 302295'
      }
    ]
  },
  fornecedor: {
    label: '10 - Fornecedor',
    apiFunction: API.getFornecedor,
    supportsBackendExport: true,
    backendHint:
      'Use filtros oficiais do fornecedor. Para busca aproximada por nome, informe também códigos CATMAT/CATSER para cruzamento analítico.',
    columns: [
      { label: 'CNPJ/CPF', key: 'codigo' },
      { label: 'Nome', key: 'descricao' },
      { label: 'Natureza Jurídica', key: 'naturezaJuridica' },
      { label: 'Porte', key: 'porte' },
      { label: 'CNAE', key: 'codigoCnae' },
      { label: 'Status', key: 'status' }
    ],
    filters: [
      {
        name: 'cnpj',
        label: 'CNPJ',
        type: 'text',
        placeholder: 'Ex: 10773122000176'
      },
      {
        name: 'cpf',
        label: 'CPF',
        type: 'text',
        placeholder: 'Ex: 12345678901'
      },
      {
        name: 'nomeFornecedor',
        label: 'Nome do Fornecedor',
        type: 'text',
        placeholder: 'Ex: Papelaria Bahia Ltda'
      },
      {
        name: 'naturezaJuridicaId',
        label: 'Natureza Jurídica',
        type: 'text',
        placeholder: 'Ex: 2062'
      },
      {
        name: 'porteEmpresaId',
        label: 'Porte',
        type: 'text',
        placeholder: 'Ex: 3'
      },
      {
        name: 'codigoCnae',
        label: 'CNAE',
        type: 'text',
        placeholder: 'Ex: 4751201'
      },
      {
        name: 'ativo',
        label: 'Ativo',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' }
        ]
      },
      {
        name: 'codigoUasg',
        label: 'Código UASG relacionado',
        type: 'text',
        placeholder: 'Ex: 158129'
      },
      {
        name: 'estado',
        label: 'UF relacionada',
        type: 'text',
        placeholder: 'Ex: BA',
        maxLength: 2
      },
      {
        name: 'tipoCatalogo',
        label: 'Catálogo p/ cruzamento',
        type: 'select',
        options: [
          { value: 'material', label: 'CATMAT (Material)' },
          { value: 'servico', label: 'CATSER (Serviço)' }
        ]
      },
      {
        name: 'codigos',
        label: 'Códigos CATMAT/CATSER',
        type: 'text',
        placeholder: 'Ex: 233420, 302295'
      }
    ]
  },
  arp: {
    label: 'ARP – Itens (Atas de Registro de Preços)',
    apiFunction: API.getARP,
    requiredFilters: ['dataVigenciaInicial', 'dataVigenciaFinal'],
    filters: [
      {
        name: 'dataVigenciaInicial',
        label: 'Vigência inicial',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'dataVigenciaFinal',
        label: 'Vigência final',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'numeroAtaRegistroPreco',
        label: 'Número da Ata',
        type: 'text',
        placeholder: 'Ex: 15/2025'
      },
      {
        name: 'codigoUnidadeGerenciadora',
        label: 'Código da Unidade Gerenciadora',
        type: 'text',
        placeholder: 'Ex: 158129'
      },
      {
        name: 'codigoModalidadeCompra',
        label: 'Modalidade da Compra',
        type: 'text',
        placeholder: 'Ex: 5'
      },
      {
        name: 'codigoItem',
        label: 'Código do Item',
        type: 'text',
        placeholder: 'Ex: 233420'
      },
      {
        name: 'codigoPdm',
        label: 'Código PDM',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'niFornecedor',
        label: 'CNPJ do Fornecedor',
        type: 'text',
        placeholder: 'Ex: 10773122000176'
      },
      {
        name: 'numeroCompra',
        label: 'Número da Compra',
        type: 'text',
        placeholder: 'Ex: 00015/2025'
      }
    ]
  },
  pncp: {
    label: 'Contratações – PNCP/Lei 14.133',
    apiFunction: API.getPNCP,
    filters: [
      {
        name: 'objeto',
        label: 'Nome/Objeto da Contratação',
        type: 'text',
        placeholder: 'Ex: aquisição de notebooks'
      },
      {
        name: 'cnpjOrgao',
        label: 'CNPJ do Órgão',
        type: 'text',
        placeholder: 'Ex: 12345678000190'
      },
      { name: 'ano', label: 'Ano', type: 'text', placeholder: 'Ex: 2025' },
      {
        name: 'modalidade',
        label: 'Modalidade',
        type: 'text',
        placeholder: 'Ex: pregao_eletronico'
      },
      {
        name: 'situacao',
        label: 'Situação',
        type: 'text',
        placeholder: 'Ex: em_andamento'
      }
    ]
  },
  'legado-licitacoes': {
    label: 'Legado – Licitações (Sistema Antigo)',
    apiFunction: API.getLegadoLicitacoes,
    requiredFilters: ['data_publicacao_inicial', 'data_publicacao_final'],
    filters: [
      {
        name: 'data_publicacao_inicial',
        label: 'Data publicação inicial',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'data_publicacao_final',
        label: 'Data publicação final',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'uasg',
        label: 'Código UASG',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'modalidade',
        label: 'Modalidade',
        type: 'text',
        placeholder: 'Ex: 1 (Pregão)'
      }
    ]
  },
  'legado-itens': {
    label: 'Legado – Itens de Licitação',
    apiFunction: API.getLegadoItens,
    requiredFilters: ['modalidade'],
    filters: [
      {
        name: 'modalidade',
        label: 'Modalidade',
        type: 'text',
        placeholder: 'Ex: 1'
      },
      {
        name: 'uasg',
        label: 'Código UASG',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'numeroLicitacao',
        label: 'Número da Licitação',
        type: 'text',
        placeholder: 'Ex: 12345'
      },
      {
        name: 'descricao',
        label: 'Nome/Descrição do Item',
        type: 'text',
        placeholder: 'Ex: caneta esferográfica'
      }
    ]
  }
};

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
 * Configura toggle de modo API
 */
function setupAPIModeToggle() {
  const btnToggle = document.getElementById('btnToggleAPIMode');
  if (btnToggle) {
    btnToggle.disabled = true;
    btnToggle.title = 'Modo demo desativado. Consultas operam somente em modo real.';
  }
}

/**
 * Atualiza UI do modo API
 */
function updateAPIModeUI() {
  const statusText = document.getElementById('apiStatusText');
  const btnToggle = document.getElementById('btnToggleAPIMode');

  if (statusText && btnToggle) {
    statusText.textContent = '🌐 Modo: API Real';
    btnToggle.textContent = '🎭 Modo Demo Desativado';
  }
}

/**
 * Implementação legada preservada apenas como referência histórica.
 * O menu ativo usa delegação de eventos em attachEventListeners().
 */
/*
function addCardListeners() {
  const cards = document.querySelectorAll(".menu-item-consulta");
  console.log(`🎯 Adicionando listeners em ${cards.length} cards...`);

  cards.forEach((card, index) => {
    const dataset = card.dataset.consulta;
    console.log(`   Card ${index + 1}: ${dataset}`);

    // Remove listener anterior se existir
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);

    // Adiciona novo listener
    newCard.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("🖱️ CLIQUE DIRETO no card:", dataset);
      showConsulta(dataset);
    });

    // Muda cursor para indicar que é clicável
    newCard.style.cursor = "pointer";
  });

  console.log("✅ Listeners adicionados aos cards!");
}
*/

/**
 * Mostra menu de consultas
 */
export function showMenu() {
  console.log('📋 Mostrando menu de consultas...');

  const menu = document.getElementById('menuConsultas');
  const tela = document.getElementById('telaConsulta');

  if (menu) {
    menu.classList.remove('hidden');
    menu.setAttribute('aria-hidden', 'false');
    console.log('✅ Menu exibido');
  } else {
    console.error('❌ Elemento menuConsultas não encontrado!');
  }

  if (tela) {
    tela.classList.add('hidden');
    tela.setAttribute('aria-hidden', 'true');
    console.log('✅ Tela de consulta ocultada');
  } else {
    console.error('❌ Elemento telaConsulta não encontrado!');
  }

  state.currentView = 'menu';
  state.dataset = null;
  state.filters = {};
  state.results = [];
  state.currentPage = 1;
  state.hasActiveSearch = false;
  state.lastSearchSignature = null;
  state.inFlightSignature = null;
  state.rawData = null;
  state.priceIntelligenceResponse = null;
  state.analyticsResponse = null;
  state.pageRawItems = [];
  state.priceUiError = null;
  state.priceDashboard = createPriceDashboardState();

  console.log('✅ Estado resetado para menu');
}

/**
 * Mostra tela de consulta específica
 * @param {string} dataset - Tipo do dataset
 */
export function showConsulta(dataset) {
  console.log('🔍 Abrindo consulta:', dataset);

  const menu = document.getElementById('menuConsultas');
  const tela = document.getElementById('telaConsulta');
  const titulo = document.getElementById('tituloConsulta');

  console.log('🔍 Elementos encontrados:');
  console.log('  - menuConsultas:', !!menu);
  console.log('  - telaConsulta:', !!tela);
  console.log('  - tituloConsulta:', !!titulo);

  if (!DATASETS[dataset]) {
    console.error('❌ Dataset inválido:', dataset);
    console.log('📋 Datasets disponíveis:', Object.keys(DATASETS));
    return;
  }

  console.log('✅ Dataset válido:', DATASETS[dataset].label);

  // Atualiza estado
  state.dataset = dataset;
  state.currentView = 'consulta';
  state.filters = getDefaultFiltersForDataset(dataset);
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

  console.log('📊 Estado atualizado:', {
    dataset,
    currentView: state.currentView
  });

  // Atualiza UI
  if (menu) {
    menu.classList.add('hidden');
    menu.setAttribute('aria-hidden', 'true');
    console.log('✅ Menu ocultado');
  }
  if (tela) {
    tela.classList.remove('hidden');
    tela.setAttribute('aria-hidden', 'false');
    console.log('✅ Tela de consulta exibida');
  }
  if (titulo) {
    titulo.textContent = DATASETS[dataset].label;
    console.log('✅ Título atualizado:', DATASETS[dataset].label);
  }

  console.log('🎨 Renderizando componentes...');

  // Renderiza componentes
  renderFilters();
  renderPagination();
  renderTable();
  setSearchHint('');

  console.log('✅ Consulta aberta com sucesso!');

  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Renderiza área de filtros dinâmicos
 */
function renderFilters() {
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
}

/**
 * Renderiza controles de paginação
 */
function renderPagination() {
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

/**
 * Renderiza tabela de resultados
 */
function renderTable() {
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
      state.filters = getDefaultFiltersForDataset(state.dataset);
      state.currentPage = 1;
      state.results = [];
      state.rawData = null;
      state.totalPages = 0;
      state.totalRecords = 0;
      state.hasActiveSearch = false;
      state.lastSearchSignature = null;
      state.inFlightSignature = null;
      state.priceIntelligenceResponse = null;
      state.analyticsResponse = null;
      state.pageRawItems = [];
      state.priceUiError = null;
      state.priceDashboard = createPriceDashboardState();
      renderFilters();
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

  // Busca sugestões AI em paralelo (best-effort)
  const firstTextFilter = Object.values(state.filters).find((v) => String(v || '').trim().length >= 3);
  if (firstTextFilter) {
    fetchAiSearchHints(firstTextFilter, state.dataset).catch(() => {});
  }
}

/**
 * Coleta valores dos filtros
 */
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

/**
 * Executa busca na API
 */
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

function _resolveAiFallbackQueryText(filters = {}, dataset = state.dataset) {
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
    console.log('Usando resultado do cache');
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

/**
 * Processa resultados da API
 * @param {Object} data - Resposta da API
 */
function processResults(data) {
  processConsultaResults(getConsultaResultDeps(), data);
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
