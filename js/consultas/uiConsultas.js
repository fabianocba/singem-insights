/**
 * uiConsultas.js
 * Interface de usuário para Consulte Compras.gov (Dados Abertos Compras.gov.br)
 */

import * as API from './apiCompras.js';
import * as Mapeadores from './mapeadores.js';
import * as Cache from './cache.js';
import { renderPriceDetailsModalContent, renderPriceIntelligenceResults } from './precosPraticadosRenderer.js';

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
  currentView: 'menu', // 'menu' ou 'consulta'
  hasActiveSearch: false,
  lastSearchSignature: null,
  priceIntelligenceResponse: null,
  pageRawItems: []
};

let debouncedAutoSearch = null;
let listenersAttached = false;

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

export function hasAtLeastOneFilter(filtersObject) {
  return Object.values(filtersObject || {}).some((value) => String(value || '').trim() !== '');
}

function setSearchHint(message = '') {
  const hint = document.getElementById('consultaHint');
  if (!hint) {
    return;
  }

  hint.textContent = String(message || '');
}

function createSearchSignature(dataset, params) {
  const orderedEntries = Object.entries(params || {}).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  return `${dataset || 'none'}::${JSON.stringify(orderedEntries)}`;
}

function hasAnyTextFilterTooShort(filtersObject) {
  const config = DATASETS[state.dataset];
  if (!config?.filters) {
    return false;
  }

  if (config.autoSearch === false) {
    return false;
  }

  return config.filters
    .filter((filter) => filter.type === 'text')
    .some((filter) => {
      const value = filtersObject?.[filter.name];
      if (!value) {
        return false;
      }

      return normalizeText(value).length < 3;
    });
}

function isPriceIntelligenceDataset(dataset = state.dataset) {
  return dataset === PRICE_INTELLIGENCE_DATASET;
}

function getCatalogTypeForShortcut(dataset = state.dataset) {
  if (dataset === 'materiais') {
    return 'material';
  }

  if (dataset === 'servicos') {
    return 'servico';
  }

  return null;
}

function getRequiredFilters(config, filtersObject = {}) {
  const required = Array.isArray(config?.requiredFilters) ? config.requiredFilters : [];
  return required.filter((key) => !String(filtersObject[key] || '').trim());
}

function sanitizeCodesInput(value) {
  return String(value || '')
    .split(/[;,\n\s]+/)
    .map((entry) => entry.replace(/\D/g, '').trim())
    .filter(Boolean)
    .slice(0, 10)
    .join(', ');
}

function setFiltersOnForm(filters = {}) {
  const config = DATASETS[state.dataset];
  if (!config?.filters) {
    return;
  }

  config.filters.forEach((filter) => {
    if (!Object.prototype.hasOwnProperty.call(filters, filter.name)) {
      return;
    }

    const input = document.getElementById(`filter_${filter.name}`);
    if (!input) {
      return;
    }

    input.value = String(filters[filter.name] ?? '');
  });
}

function getRequiredHint(config) {
  if (!Array.isArray(config?.requiredFilters) || config.requiredFilters.length === 0) {
    return 'Preencha pelo menos um campo para realizar a pesquisa';
  }

  return `Preencha os campos obrigatórios: ${config.requiredFilters.join(', ')}`;
}

function canSearchWithFilters(filtersObject) {
  const config = DATASETS[state.dataset];
  if (!config) {
    return false;
  }

  if (Array.isArray(config.requiredFilters) && config.requiredFilters.length > 0) {
    return getRequiredFilters(config, filtersObject).length === 0;
  }

  return hasAtLeastOneFilter(filtersObject);
}

/**
 * Configuração de datasets disponíveis
 */
const DATASETS = {
  materiais: {
    label: 'Catálogo – Material',
    apiFunction: API.getMateriais,
    filters: [
      {
        name: 'descricao',
        label: 'Nome/Descrição do Material',
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
        name: 'status',
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
  servicos: {
    label: 'Catálogo – Serviço',
    apiFunction: API.getServicos,
    filters: [
      {
        name: 'descricao',
        label: 'Nome/Descrição do Serviço',
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
        name: 'status',
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
    label: 'UASG (Unidades)',
    apiFunction: API.getUASG,
    filters: [
      {
        name: 'nomeUasg',
        label: 'Nome da UASG',
        type: 'text',
        placeholder: 'Ex: Instituto Federal'
      },
      {
        name: 'nomeOrgao',
        label: 'Nome do Órgão',
        type: 'text',
        placeholder: 'Ex: Ministério da Educação'
      },
      {
        name: 'codigoUasg',
        label: 'Código UASG',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'uf',
        label: 'UF',
        type: 'text',
        placeholder: 'Ex: BA',
        maxLength: 2
      },
      {
        name: 'status',
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
  arp: {
    label: 'ARP – Itens (Atas de Registro de Preços)',
    apiFunction: API.getARP,
    filters: [
      {
        name: 'descricaoItem',
        label: 'Nome/Descrição do Item',
        type: 'text',
        placeholder: 'Ex: toner impressora'
      },
      {
        name: 'fornecedor',
        label: 'Nome do Fornecedor',
        type: 'text',
        placeholder: 'Ex: Comércio LTDA'
      },
      {
        name: 'numeroAta',
        label: 'Número da Ata',
        type: 'text',
        placeholder: 'Ex: 12345'
      },
      {
        name: 'anoAta',
        label: 'Ano da Ata',
        type: 'text',
        placeholder: 'Ex: 2025'
      },
      {
        name: 'orgao',
        label: 'Código do Órgão',
        type: 'text',
        placeholder: 'Ex: 26000'
      },
      {
        name: 'codigoItem',
        label: 'Código do Item',
        type: 'text',
        placeholder: 'Ex: 123'
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
    filters: [
      {
        name: 'objeto',
        label: 'Nome/Objeto da Licitação',
        type: 'text',
        placeholder: 'Ex: material de expediente'
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
      },
      { name: 'ano', label: 'Ano', type: 'text', placeholder: 'Ex: 2024' }
    ]
  },
  'legado-itens': {
    label: 'Legado – Itens de Licitação',
    apiFunction: API.getLegadoItens,
    filters: [
      {
        name: 'descricao',
        label: 'Nome/Descrição do Item',
        type: 'text',
        placeholder: 'Ex: caneta esferográfica'
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
        placeholder: 'Ex: 1'
      },
      {
        name: 'numeroLicitacao',
        label: 'Número da Licitação',
        type: 'text',
        placeholder: 'Ex: 12345'
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
  showMenu(); // Mostra menu inicial
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
 * Adiciona event listeners diretos nos cards
 * DESABILITADA - Estava causando conflito ao clonar elementos
 * Os cards agora usam onclick inline diretamente
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
    menu.style.display = 'block';
    console.log('✅ Menu exibido');
  } else {
    console.error('❌ Elemento menuConsultas não encontrado!');
  }

  if (tela) {
    tela.classList.add('hidden');
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
  state.priceIntelligenceResponse = null;
  state.pageRawItems = [];

  console.log('✅ Estado resetado para menu');

  // Não precisa mais re-adicionar listeners pois usamos onclick inline
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
  state.filters = isPriceIntelligenceDataset(dataset) ? { tipoCatalogo: 'material' } : {};
  state.results = [];
  state.currentPage = 1;
  state.totalPages = 0;
  state.totalRecords = 0;
  state.hasActiveSearch = false;
  state.lastSearchSignature = null;
  state.priceIntelligenceResponse = null;
  state.pageRawItems = [];

  console.log('📊 Estado atualizado:', {
    dataset,
    currentView: state.currentView
  });

  // Atualiza UI
  if (menu) {
    menu.style.display = 'none';
    console.log('✅ Menu ocultado');
  }
  if (tela) {
    tela.classList.remove('hidden');
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

  let html = '<div class="filters-grid">';

  config.filters.forEach((filter) => {
    html += `<div class="filter-item">`;
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
      html += `<input type="${filter.type}" id="filter_${filter.name}" name="${filter.name}"
               class="form-control" placeholder="${filter.placeholder}"
               value="${value}" data-filter-type="${filter.type}" ${maxLength} aria-label="${filter.label}">`;
    }

    html += `</div>`;
  });

  html += '</div>';

  const actionsHtml = config.supportsBackendExport
    ? `
      <button id="btnBuscar" class="btn btn-primary" aria-label="Buscar dados">
        🔍 Buscar
      </button>
      <button id="btnAtualizarAgora" class="btn btn-warning" aria-label="Atualizar dados no upstream">
        🔄 Atualizar Agora
      </button>
      <button id="btnExportPriceDataTop" class="btn btn-success" aria-label="Exportar resultados filtrados">
        📥 Exportar
      </button>
      <button id="btnLimpar" class="btn btn-secondary" aria-label="Limpar filtros">
        🗑️ Limpar Filtros
      </button>
    `
    : `
      <button id="btnBuscar" class="btn btn-primary" aria-label="Buscar dados">
        🔍 Buscar
      </button>
      <button id="btnLimpar" class="btn btn-secondary" aria-label="Limpar filtros">
        🗑️ Limpar Filtros
      </button>
      <button id="btnLimparCache" class="btn btn-warning" aria-label="Limpar cache">
        ⚡ Limpar Cache
      </button>
    `;

  html += `
    <div class="filters-actions">
      ${actionsHtml}
    </div>
    ${config.supportsBackendExport ? '<p class="text-muted">Módulo 3: informe um ou mais códigos CATMAT/CATSER separados por vírgula.</p>' : ''}
    <p id="consultaHint" class="text-muted" aria-live="polite"></p>
  `;

  container.innerHTML = html;
}

/**
 * Renderiza controles de paginação
 */
function renderPagination() {
  const container = document.getElementById('paginationContainer');
  if (!container) {
    return;
  }

  if (!state.dataset || state.totalPages === 0) {
    container.innerHTML = '';
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

  container.innerHTML = html;
}

/**
 * Renderiza tabela de resultados
 */
function renderTable() {
  const container = document.getElementById('resultsTable');
  if (!container) {
    return;
  }

  if (state.loading) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Carregando dados...</p>
      </div>
    `;
    return;
  }

  if (isPriceIntelligenceDataset() && state.priceIntelligenceResponse) {
    container.innerHTML = renderPriceIntelligenceResults(state.priceIntelligenceResponse, state.results || []);
    return;
  }

  if (!state.results || state.results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📋 Nenhum resultado encontrado.</p>
        <p class="text-muted">Ajuste os filtros e tente novamente.</p>
      </div>
    `;
    return;
  }

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
            <th>Código</th>
            <th>Descrição</th>
            <th>Unidade/UF</th>
            <th>Órgão/UASG</th>
            <th>Status</th>
            <th>Atualização</th>
            <th>Valor</th>
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
        <td>${row.codigo}</td>
        <td class="description-cell" title="${row.descricao}">${row.descricao}</td>
        <td>${row.unidade}</td>
        <td class="orgao-cell" title="${row.orgao}">${row.orgao}</td>
        <td>${row.status}</td>
        <td>${row.dataAtualizacao}</td>
        <td>${row.valor}</td>
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

  container.innerHTML = html;
}

/**
 * Anexa event listeners
 */
function attachEventListeners() {
  if (listenersAttached) {
    return;
  }

  console.log('🎯 Configurando event listeners...');

  // O clique nos cards já é tratado por onclick inline em index.html.
  // Aqui tratamos apenas voltar ao menu para evitar disparos duplicados.
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btnVoltarMenu' || e.target.closest('#btnVoltarMenu')) {
      console.log('🔙 Voltando ao menu...');
      e.preventDefault();
      e.stopPropagation();
      showMenu();
    }
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
      state.filters = {};
      state.currentPage = 1;
      state.results = [];
      state.totalPages = 0;
      state.totalRecords = 0;
      state.hasActiveSearch = false;
      state.priceIntelligenceResponse = null;
      state.pageRawItems = [];
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

    if (e.target.id === 'btnAtualizarAgora') {
      triggerSearch({ source: 'manual', force: true, resetPage: true });
    }

    if (e.target.id === 'btnExportPriceDataTop' || e.target.id === 'btnExportPriceData') {
      exportPriceIntelligence();
    }
  });

  // Ver JSON
  document.addEventListener('click', (e) => {
    const jsonButton = e.target.closest('.btn-view-json');
    if (jsonButton) {
      const index = parseInt(jsonButton.dataset.index, 10);
      showJSONModal(index);
    }

    const detailsButton = e.target.closest('.btn-price-details');
    if (detailsButton) {
      const index = parseInt(detailsButton.dataset.index, 10);
      showPriceDetailsModal(index);
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
  }

  setSearchHint('');
  executeSearch({ force });
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

    if (isPriceIntelligenceDataset()) {
      if (filter.name === 'codigos') {
        value = sanitizeCodesInput(value);
        input.value = value;
      }

      if (filter.name === 'estado') {
        value = value.toUpperCase();
        input.value = value;
      }
    }

    state.filters[filter.name] = value;
  });
}

/**
 * Executa busca na API
 */
async function executeSearch({ force = false } = {}) {
  if (!state.dataset) {
    state.hasActiveSearch = false;
    alert('Selecione um conjunto de dados.');
    return;
  }

  const config = DATASETS[state.dataset];
  if (!config || !config.apiFunction) {
    state.hasActiveSearch = false;
    alert('Dataset inválido.');
    return;
  }

  if (!canSearchWithFilters(state.filters)) {
    state.hasActiveSearch = false;
    setSearchHint(getRequiredHint(config));
    return;
  }

  // Verifica cache
  const params = {
    ...state.filters,
    pagina: state.currentPage,
    tipoCatalogo: state.filters.tipoCatalogo || 'material'
  };

  if (isPriceIntelligenceDataset() && force) {
    params.forceRefresh = true;
  }

  const signature = createSearchSignature(state.dataset, params);

  if (!force && signature === state.lastSearchSignature) {
    return;
  }

  state.lastSearchSignature = signature;
  const cached = Cache.get(state.dataset, params);

  if (cached) {
    console.log('Usando resultado do cache');
    state.hasActiveSearch = true;
    processResults(cached);
    return;
  }

  // Busca na API
  state.loading = true;
  renderTable();

  try {
    const data = await config.apiFunction(params, {
      forceRefresh: isPriceIntelligenceDataset() && force
    });

    // Armazena no cache
    Cache.set(state.dataset, params, data);

    processResults(data);
  } catch (error) {
    if (error?.name === 'AbortError' || error?.isAbort === true) {
      state.loading = false;
      renderTable();
      return;
    }

    state.loading = false;
    state.hasActiveSearch = false;
    state.lastSearchSignature = null;
    console.error('❌ Erro na busca:', error);
    console.error('   Dataset:', state.dataset);
    console.error('   Filtros:', state.filters);

    let titulo = 'Erro ao buscar dados';
    const mensagem = error.message;
    let detalhes = '';

    // Detecção de tipo de erro
    if (error.message.includes('Failed to fetch') || error.message.includes('conectar com a API')) {
      titulo = 'Erro de Conexão';
      detalhes =
        'Possíveis causas:\n' +
        '• Sem conexão com a internet\n' +
        '• Proxy backend do SINGEM indisponível\n' +
        '• Upstream do Compras.gov.br fora do ar\n\n' +
        'Teste acessar no navegador:\n' +
        'http://localhost:3000/api/compras/health';
    } else if (error.message.includes('CORS')) {
      titulo = 'Erro de Proxy';
      detalhes =
        'As consultas devem passar pelo backend do SINGEM.\n' +
        'Verifique se o servidor está ativo e se /api/compras está acessível.';
    } else if (error.message.includes('tempo limite') || error.message.includes('Timeout')) {
      titulo = 'Timeout';
      detalhes = 'A requisição demorou mais de 30 segundos.\n' + 'Tente novamente ou ajuste os filtros.';
    } else if (error.message.includes('404')) {
      titulo = 'Endpoint não encontrado';
      detalhes = 'O endpoint da API não existe ou foi alterado.';
    } else if (error.message.includes('429')) {
      titulo = 'Muitas requisições';
      detalhes = 'A API está limitando o número de requisições.\nAguarde alguns segundos e tente novamente.';
    }

    // Usa a função global de erro copiável se existir
    if (typeof window.mostrarErroCopivel === 'function') {
      window.mostrarErroCopivel(titulo, mensagem, detalhes);
    } else {
      // Fallback para alert
      alert(`${titulo}\n\n${mensagem}${detalhes ? '\n\n' + detalhes : ''}`);
    }

    renderTable();
  }
}

/**
 * Processa resultados da API
 * @param {Object} data - Resposta da API
 */
function processResults(data) {
  state.loading = false;
  state.hasActiveSearch = true;
  state.rawData = data;

  if (isPriceIntelligenceDataset()) {
    state.priceIntelligenceResponse = data._priceIntelligence || data._raw || null;
  } else {
    state.priceIntelligenceResponse = null;
  }

  // Extrai metadados
  const metadata = data._metadata || data.metadata || {};
  state.totalRecords =
    metadata.totalRecords || metadata.total || state.priceIntelligenceResponse?.page?.totalItems || 0;
  state.totalPages = metadata.totalPages || metadata.pages || state.priceIntelligenceResponse?.page?.totalPages || 1;

  // Extrai itens (vários formatos possíveis)
  let items = [];

  if (data._embedded) {
    // Formato HAL (comum em APIs REST)
    const keys = Object.keys(data._embedded);
    if (keys.length > 0) {
      items = data._embedded[keys[0]];
    }
  } else if (data.items || data.itens) {
    items = data.items || data.itens;
  } else if (data.data) {
    items = data.data;
  } else if (Array.isArray(data)) {
    items = data;
  }

  state.pageRawItems = Array.isArray(items) ? items : [];

  // Mapeia para formato padronizado
  state.results = Mapeadores.mapear(state.dataset, items);

  renderPagination();
  renderTable();
  saveToLocalStorage();

  console.log(`Resultados: ${state.results.length} itens | Página ${state.currentPage}/${state.totalPages}`);
}

/**
 * Exporta resultados para CSV
 */
function exportToCSV() {
  if (isPriceIntelligenceDataset()) {
    exportPriceIntelligence('csv');
    return;
  }

  if (!state.results || state.results.length === 0) {
    alert('Nenhum dado para exportar.');
    return;
  }

  // Cabeçalhos
  const headers = ['Código', 'Descrição', 'Unidade/UF', 'Órgão/UASG', 'Status', 'Atualização', 'Valor'];

  // Linhas
  const rows = state.results.map((row) => [
    row.codigo,
    `"${row.descricao.replace(/"/g, '""')}"`,
    row.unidade,
    `"${row.orgao.replace(/"/g, '""')}"`,
    row.status,
    row.dataAtualizacao,
    row.valor
  ]);

  // Monta CSV
  let csv = headers.join(';') + '\n';
  csv += rows.map((row) => row.join(';')).join('\n');

  // Download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `consulta_${state.dataset}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlobFile(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

async function exportPriceIntelligence(explicitFormat = null) {
  if (!isPriceIntelligenceDataset()) {
    return;
  }

  collectFilters();

  if (!canSearchWithFilters(state.filters)) {
    setSearchHint(getRequiredHint(DATASETS[state.dataset]));
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
    console.error('❌ Falha ao exportar Módulo 3:', error);
    const mensagem = error?.message || 'Falha ao exportar os dados filtrados.';

    if (typeof window.mostrarErroCopivel === 'function') {
      window.mostrarErroCopivel('Falha na exportação', mensagem, 'Tente novamente com filtros mais restritos.');
    } else {
      alert(`Falha na exportação\n\n${mensagem}`);
    }
  }
}

/**
 * Mostra modal com JSON completo
 * @param {number} index - Índice do resultado
 */
function showJSONModal(index) {
  const row = state.results[index];
  if (!row) {
    return;
  }

  const json = JSON.stringify(row.extras || row, null, 2);

  const modal = `
    <div class="modal-overlay" id="jsonModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>JSON Completo - ${row.codigo}</h3>
          <button class="btn-close" onclick="document.getElementById('jsonModal').remove()" aria-label="Fechar">×</button>
        </div>
        <div class="modal-body">
          <pre><code>${json}</code></pre>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('jsonModal').remove()">Fechar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modal);
}

function showPriceDetailsModal(index) {
  if (!isPriceIntelligenceDataset()) {
    return;
  }

  const item = state.pageRawItems[index] || state.results[index]?.extras || state.results[index];
  if (!item) {
    return;
  }

  const modal = `
    <div class="modal-overlay" id="priceDetailsModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Detalhes do Registro - ${item.codigoItemCatalogo || item.idItemCompra || 'Módulo 3'}</h3>
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
