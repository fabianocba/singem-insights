/**
 * CATMAT Integration - SINGEM Frontend
 * Componente de autocomplete e modal de pedido de catalogação
 * Integração com serviços de consulta e apoio à catalogação
 */

import { debounce } from './utils/throttle.js';
import { showLoading, hideLoading, notifySuccess, notifyError, notifyInfo } from './ui/feedback.js';
import { httpRequest } from './shared/lib/http.js';
import { emit } from './core/eventBus.js';
import { escapeHTML } from './utils/sanitize.js';

/**
 * Configuração do módulo
 */
const config = {
  minChars: 3,
  debounceMs: 300,
  maxResults: 20,
  searchCacheTtlMs: 60000,
  codigoCacheTtlMs: 300000
};

/**
 * Estado interno
 */
const state = {
  searchControllers: new Map(),
  searchSeqByContext: new Map(),
  searchCache: new Map(),
  codigoCache: new Map(),
  selectedSuggestionByContext: new Map(),
  selectedPdmByContext: new Map(),
  outsideClickContexts: new Set(),
  outsideClickBound: false,
  initializedInputs: new WeakSet(),
  selectedMaterial: null,
  currentInputId: null
};

function toNumberSafe(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isNumericCodeQuery(value) {
  return /^\d+$/.test(String(value || '').trim());
}

function extractSearchItems(root, resultObject) {
  if (Array.isArray(resultObject.dados)) {
    return resultObject.dados;
  }

  if (Array.isArray(resultObject.resultado)) {
    return resultObject.resultado;
  }

  if (Array.isArray(resultObject.items)) {
    return resultObject.items;
  }

  return Array.isArray(root) ? root : [];
}

function resolveSearchMode(resultObject) {
  if (resultObject.modo) {
    return resultObject.modo;
  }

  return Array.isArray(resultObject.sugestoes) && resultObject.sugestoes.length > 0 ? 'suggestions' : 'items';
}

function resolveSelectedContext(resultObject) {
  return resultObject.contextoSelecionado && typeof resultObject.contextoSelecionado === 'object'
    ? resultObject.contextoSelecionado
    : null;
}

function normalizeSearchPayload(payload, { offset = 0, limite = config.maxResults } = {}) {
  const envelope = payload && typeof payload === 'object' ? payload : {};
  const root = envelope.data !== undefined ? envelope.data : envelope;
  const meta = envelope.meta && typeof envelope.meta === 'object' ? envelope.meta : {};

  const resultObject = root && typeof root === 'object' && !Array.isArray(root) ? root : {};
  const dados = extractSearchItems(root, resultObject);

  const totalRaw =
    resultObject.total ?? resultObject.totalRegistros ?? resultObject.count ?? meta.total ?? meta.totalRegistros;
  const total = Math.max(dados.length, toNumberSafe(totalRaw, dados.length));

  return {
    dados,
    total,
    offset: Math.max(0, toNumberSafe(resultObject.offset ?? meta.offset, offset)),
    limite: Math.max(1, toNumberSafe(resultObject.limite ?? meta.limite, limite)),
    aviso: resultObject.aviso ?? meta.aviso ?? null,
    fonte: resultObject.fonte ?? meta.fonte ?? null,
    modo: resolveSearchMode(resultObject),
    sugestoes: Array.isArray(resultObject.sugestoes) ? resultObject.sugestoes : [],
    filtros: resultObject.filtros && typeof resultObject.filtros === 'object' ? resultObject.filtros : {},
    contextoSelecionado: resolveSelectedContext(resultObject)
  };
}

function normalizeMaterialPayload(payload) {
  const envelope = payload && typeof payload === 'object' ? payload : {};
  const root = envelope.data !== undefined ? envelope.data : envelope;

  if (root && typeof root === 'object' && !Array.isArray(root)) {
    if (root.dados && typeof root.dados === 'object') {
      return root.dados;
    }

    return root;
  }

  return null;
}

function buildSearchCacheKey(query, offset, limite, codigoPdm = null, detalhar = false) {
  return `${String(query || '')
    .trim()
    .toLowerCase()}|${offset}|${limite}|${String(codigoPdm || '').trim()}|${detalhar ? 1 : 0}`;
}

function readSearchCache(cacheKey) {
  const cached = state.searchCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    state.searchCache.delete(cacheKey);
    return null;
  }

  return cached.value;
}

function writeSearchCache(cacheKey, value) {
  state.searchCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + config.searchCacheTtlMs
  });
}

function readCodigoCache(codigo) {
  const cacheKey = String(codigo || '').replace(/\D/g, '');
  const cached = state.codigoCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    state.codigoCache.delete(cacheKey);
    return null;
  }

  return cached.value;
}

function writeCodigoCache(codigo, value) {
  const cacheKey = String(codigo || '').replace(/\D/g, '');
  if (!cacheKey || !value) {
    return;
  }

  state.codigoCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + config.codigoCacheTtlMs
  });
}

function normalizeSearchOptions(
  query,
  { offset = 0, limite = config.maxResults, contextKey = 'global', codigoPdm = null, detalhar = false } = {}
) {
  return {
    safeQuery: String(query || '').trim(),
    safeOffset: Math.max(0, toNumberSafe(offset, 0)),
    safeLimite: Math.max(1, Math.min(toNumberSafe(limite, config.maxResults), 100)),
    safeContextKey: String(contextKey || 'global'),
    safeCodigoPdm: String(codigoPdm || '').trim() || null,
    safeDetalhar: detalhar === true || String(detalhar).toLowerCase() === 'true'
  };
}

function buildEmptySearchResult(offset, limite, extra = {}) {
  return {
    dados: [],
    total: 0,
    offset,
    limite,
    ...extra
  };
}

function emitSearchDone(search, result, cache) {
  emit('catmat.search:done', {
    contextKey: search.safeContextKey,
    query: search.safeQuery,
    offset: search.safeOffset,
    limite: search.safeLimite,
    codigoPdm: search.safeCodigoPdm,
    detalhar: search.safeDetalhar,
    total: result.total,
    cache,
    fonte: result.fonte || null
  });
}

function beginSearchRequest(search) {
  const previousController = state.searchControllers.get(search.safeContextKey);
  if (previousController) {
    previousController.abort();
  }

  const controller = new AbortController();
  state.searchControllers.set(search.safeContextKey, controller);

  const seq = (state.searchSeqByContext.get(search.safeContextKey) || 0) + 1;
  state.searchSeqByContext.set(search.safeContextKey, seq);

  emit('catmat.search:start', {
    contextKey: search.safeContextKey,
    query: search.safeQuery,
    offset: search.safeOffset,
    limite: search.safeLimite,
    codigoPdm: search.safeCodigoPdm,
    detalhar: search.safeDetalhar
  });

  return { controller, seq };
}

function buildCatmatSearchParams(search) {
  const params = new URLSearchParams({
    q: search.safeQuery,
    limite: String(search.safeLimite),
    offset: String(search.safeOffset)
  });

  if (search.safeCodigoPdm) {
    params.set('codigoPdm', search.safeCodigoPdm);
  }

  if (search.safeDetalhar) {
    params.set('detalhar', 'true');
  }

  return params;
}

async function requestCatmatSearch(search, controller) {
  const response = await httpRequest(`/api/catmat/search?${buildCatmatSearchParams(search).toString()}`, {
    signal: controller.signal
  });

  if (!response.ok && response.error?.isAbort) {
    const abortError = new Error('Busca CATMAT cancelada por nova requisição.');
    abortError.name = 'AbortError';
    throw abortError;
  }

  if (!response.ok) {
    throw new Error(response.error?.message || 'Erro na busca CATMAT');
  }

  return response.data;
}

function shouldEnrichWithAi(search, normalized) {
  return (
    search.safeOffset === 0 &&
    !search.safeCodigoPdm &&
    !search.safeDetalhar &&
    normalized.modo !== 'suggestions' &&
    !isNumericCodeQuery(search.safeQuery) &&
    normalized.dados.length < 3
  );
}

async function enrichSearchWithAi(search, normalized) {
  if (!shouldEnrichWithAi(search, normalized)) {
    return;
  }

  try {
    const aiResults = await fetchAiSuggestions(search.safeQuery, 5);
    if (!aiResults.length) {
      return;
    }

    const existingIds = new Set(normalized.dados.map((item) => String(item.codigo || item.catmat_id || '')));
    const uniqueAi = aiResults.filter((item) => !existingIds.has(String(item.codigo || item.catmat_id || '')));

    if (!uniqueAi.length) {
      return;
    }

    normalized.dados.push(...uniqueAi);
    normalized.total = Math.max(normalized.total, normalized.dados.length);
    normalized.aiEnriched = true;
  } catch {
    // AI complementar é best-effort
  }
}

function emitSearchError(search, err) {
  emit('catmat.search:error', {
    contextKey: search.safeContextKey,
    query: search.safeQuery,
    offset: search.safeOffset,
    limite: search.safeLimite,
    codigoPdm: search.safeCodigoPdm,
    detalhar: search.safeDetalhar,
    erro: err?.message || 'Erro desconhecido'
  });
}

function ensureOutsideClickHandler() {
  if (state.outsideClickBound) {
    return;
  }

  document.addEventListener('click', (event) => {
    for (const context of Array.from(state.outsideClickContexts)) {
      const { inputElement, dropdown } = context;

      if (!inputElement?.isConnected || !dropdown?.isConnected) {
        state.outsideClickContexts.delete(context);
        continue;
      }

      if (!inputElement.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
      }
    }
  });

  state.outsideClickBound = true;
}

/**
 * Busca sugestões AI para complementar resultados CATMAT
 * @param {string} query - Termo de busca
 * @param {number} limit - Máximo de sugestões
 * @returns {Promise<Array>} Itens sugeridos pela IA
 */
async function fetchAiSuggestions(query, limit = 5) {
  void query;
  void limit;
  return [];
}

/**
 * Busca materiais na API CATMAT
 * @param {string} query - Termo de busca
 * @returns {Promise<{dados: Array, total: number}>}
 */
export async function searchCatmat(
  query,
  { offset = 0, limite = config.maxResults, contextKey = 'global', codigoPdm = null, detalhar = false } = {}
) {
  const search = normalizeSearchOptions(query, { offset, limite, contextKey, codigoPdm, detalhar });

  if (search.safeQuery.length < config.minChars) {
    return buildEmptySearchResult(search.safeOffset, search.safeLimite);
  }

  const cacheKey = buildSearchCacheKey(
    search.safeQuery,
    search.safeOffset,
    search.safeLimite,
    search.safeCodigoPdm,
    search.safeDetalhar
  );
  const cached = readSearchCache(cacheKey);
  if (cached) {
    emitSearchDone(search, cached, 'HIT');
    return cached;
  }

  const { controller, seq } = beginSearchRequest(search);

  try {
    const rawData = await requestCatmatSearch(search, controller);

    // Ignora respostas antigas para manter consistência do campo ativo.
    if (state.searchSeqByContext.get(search.safeContextKey) !== seq) {
      return buildEmptySearchResult(search.safeOffset, search.safeLimite, { descartado: true });
    }

    const normalized = normalizeSearchPayload(rawData, {
      offset: search.safeOffset,
      limite: search.safeLimite
    });

    await enrichSearchWithAi(search, normalized);

    writeSearchCache(cacheKey, normalized);
    emitSearchDone(search, normalized, 'MISS');

    return normalized;
  } catch (err) {
    if (err.name === 'AbortError') {
      return buildEmptySearchResult(search.safeOffset, search.safeLimite, { abortado: true });
    }

    emitSearchError(search, err);

    console.error('[CATMAT] Erro na busca:', err);
    throw err;
  } finally {
    if (state.searchControllers.get(search.safeContextKey) === controller) {
      state.searchControllers.delete(search.safeContextKey);
    }
  }
}

/**
 * Busca material por código
 * @param {string|number} codigo
 * @returns {Promise<Object|null>}
 */
export async function getCatmatByCodigo(codigo) {
  const cleanCode = String(codigo || '').replace(/\D/g, '');
  if (!cleanCode) {
    return null;
  }

  const cached = readCodigoCache(cleanCode);
  if (cached) {
    return cached;
  }

  try {
    const response = await httpRequest(`/api/catmat/${cleanCode}`);

    if (!response.ok) {
      return null;
    }

    const material = normalizeMaterialPayload(response.data);
    if (material) {
      writeCodigoCache(cleanCode, material);
    }

    return material;
  } catch (err) {
    console.error('[CATMAT] Erro ao buscar código:', err);
    return null;
  }
}

/**
 * Cria pedido de catalogação
 * @param {Object} dados
 * @returns {Promise<Object>}
 */
export async function criarPedidoCatalogacao(dados) {
  const response = await httpRequest('/api/catalogacao-pedidos', {
    method: 'POST',
    body: dados
  });

  if (!response.ok) {
    throw new Error(response.error?.message || 'Erro ao criar pedido');
  }

  return response.data;
}

/**
 * Cria dropdown de resultados
 */
function createDropdown(inputElement) {
  const existingDropdown = inputElement.parentElement.querySelector('.catmat-dropdown');
  if (existingDropdown) {
    return existingDropdown;
  }

  const dropdown = document.createElement('div');
  dropdown.className = 'catmat-dropdown';
  dropdown.classList.add('catmat-dropdown--panel');

  // Wrapper com position relative
  inputElement.parentElement.classList.add('catmat-dropdown-host');

  inputElement.parentElement.appendChild(dropdown);
  return dropdown;
}

function buildMaterialContext(material = {}) {
  const pdmCode = material.id_pdm || material.codigoPdm || material.pdm?.codigo || null;
  const groupCode = material.id_grupo || material.codigoGrupo || material.grupoMaterial?.codigo || null;
  const classCode = material.id_classe || material.codigoClasse || material.classeMaterial?.codigo || null;
  const parts = [];

  if (material.descricaoPdm || pdmCode) {
    parts.push(`PDM ${pdmCode || '-'}${material.descricaoPdm ? ` - ${material.descricaoPdm}` : ''}`);
  }

  if (material.descricaoGrupo || groupCode) {
    parts.push(`Grupo ${groupCode || '-'}${material.descricaoGrupo ? ` - ${material.descricaoGrupo}` : ''}`);
  }

  if (material.descricaoClasse || classCode) {
    parts.push(`Classe ${classCode || '-'}${material.descricaoClasse ? ` - ${material.descricaoClasse}` : ''}`);
  }

  return parts.join(' | ');
}

function buildSuggestionContext(suggestion = {}) {
  return [suggestion.descricaoGrupo, suggestion.descricaoClasse].filter(Boolean).join(' | ');
}

/**
 * Renderiza resultados no dropdown
 */
function renderResults(dropdown, results, inputElement, onSelect, options = {}) {
  const {
    aviso = null,
    hasMore = false,
    onLoadMore = null,
    modo = 'items',
    sugestoes = [],
    contextoSelecionado = null,
    detalhandoTodosGrupos = false,
    onPickSuggestion = null,
    onBackToSuggestions = null
  } = options;
  dropdown.innerHTML = '';

  if ((contextoSelecionado || detalhandoTodosGrupos) && typeof onBackToSuggestions === 'function') {
    const contextHeader = document.createElement('div');
    contextHeader.className = 'catmat-context-header';

    const title = detalhandoTodosGrupos
      ? `Todos os grupos - ${String(inputElement?.value || '').trim()}`
      : contextoSelecionado.descricaoPdm || `PDM ${contextoSelecionado.codigoPdm || '-'}`;
    const subtitle = detalhandoTodosGrupos
      ? 'Resultados detalhados em todo o catálogo CATMAT'
      : [contextoSelecionado.descricaoGrupo, contextoSelecionado.descricaoClasse].filter(Boolean).join(' | ');
    contextHeader.innerHTML = `
      <div class="catmat-context-copy">
        <div class="catmat-context-label">Contexto selecionado</div>
        <div class="catmat-context-title">${escapeHTML(title)}</div>
        ${subtitle ? `<div class="catmat-context-subtitle">${escapeHTML(subtitle)}</div>` : ''}
      </div>
      <button type="button" class="btn-voltar-grupos btn btn-primary btn-sm">
        Voltar aos grupos
      </button>
    `;

    contextHeader.querySelector('.btn-voltar-grupos')?.addEventListener('click', (event) => {
      event.preventDefault();
      onBackToSuggestions();
    });
    dropdown.appendChild(contextHeader);
  }

  if (aviso) {
    const avisoEl = document.createElement('div');
    avisoEl.className = 'catmat-aviso';
    avisoEl.textContent = aviso;
    dropdown.appendChild(avisoEl);
  }

  if (modo === 'suggestions' && Array.isArray(sugestoes) && sugestoes.length > 0) {
    sugestoes.forEach((suggestion) => {
      const item = document.createElement('div');
      item.className = 'catmat-item catmat-item--suggestion';

      const secondary = suggestion.tipo === 'todos_grupos' ? '' : buildSuggestionContext(suggestion);
      const preview = suggestion.previewDescricao
        ? `Ex.: ${suggestion.previewCodigo ? `${suggestion.previewCodigo} - ` : ''}${suggestion.previewDescricao}`
        : '';

      item.innerHTML = `
        <div class="catmat-item-head">
          <strong class="catmat-item-title">${escapeHTML(
            suggestion.label || suggestion.descricaoPdm || 'Sugestão CATMAT'
          )}</strong>
          <span class="catmat-item-count">${Number(suggestion.totalItens || 0)} item(ns)</span>
        </div>
        ${secondary ? `<div class="catmat-item-meta">${escapeHTML(secondary)}</div>` : ''}
        ${preview ? `<div class="catmat-item-preview">${escapeHTML(preview)}</div>` : ''}
      `;
      item.addEventListener('click', () => {
        onPickSuggestion?.(suggestion);
      });

      dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
    return;
  }

  if (results.length === 0) {
    dropdown.innerHTML = `
      <div class="catmat-empty-state">
        <p class="catmat-empty-copy">Nenhum material encontrado</p>
        <button type="button" class="btn-criar-pedido btn btn-primary btn-sm">
          📝 Criar Pedido de Catalogação
        </button>
      </div>
    `;

    dropdown.querySelector('.btn-criar-pedido')?.addEventListener('click', () => {
      dropdown.style.display = 'none';
      abrirModalPedidoCatalogacao(inputElement.value);
    });

    dropdown.style.display = 'block';
    return;
  }

  results.forEach((material) => {
    const item = document.createElement('div');
    item.className = 'catmat-item';

    const aiBadge = material._aiSource ? '<span class="catmat-item-ai-badge">IA</span>' : '';
    const contextLine = buildMaterialContext(material);

    item.innerHTML = `
      <div class="catmat-item-head">
        <strong class="catmat-item-code">${escapeHTML(String(material.catmat_id || material.codigo || '-'))}${aiBadge}</strong>
        <span class="catmat-item-unit">${escapeHTML(String(material.unidade || 'UN'))}</span>
      </div>
      <div class="catmat-item-description">
        ${escapeHTML(String(material.descricao || ''))}
      </div>
      ${contextLine ? `<div class="catmat-item-meta">${escapeHTML(contextLine)}</div>` : ''}
      ${material.catmat_sustentavel ? '<span class="catmat-item-sustentavel">🌿 Sustentável</span>' : ''}
    `;

    item.addEventListener('click', () => {
      onSelect(material);
      dropdown.style.display = 'none';
    });

    dropdown.appendChild(item);
  });

  // Botão de "não encontrei" no final
  const footer = document.createElement('div');
  footer.className = 'catmat-dropdown-footer';
  footer.innerHTML = `
    <button type="button" class="btn-criar-pedido-footer catmat-link-btn">
      Não encontrei o item - Criar pedido de catalogação
    </button>
  `;
  footer.querySelector('.btn-criar-pedido-footer')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    abrirModalPedidoCatalogacao(inputElement.value);
  });
  dropdown.appendChild(footer);

  if (hasMore && typeof onLoadMore === 'function') {
    const loadMore = document.createElement('button');
    loadMore.type = 'button';
    loadMore.className = 'catmat-load-more';
    loadMore.textContent = 'Carregar mais resultados';
    loadMore.addEventListener('click', (e) => {
      e.preventDefault();
      onLoadMore();
    });
    dropdown.appendChild(loadMore);
  }

  dropdown.style.display = 'block';
}

/**
 * Inicializa autocomplete CATMAT em um input
 * @param {HTMLInputElement} inputElement - Campo de descrição do item
 * @param {Function} onSelect - Callback quando material é selecionado
 */
export function initCatmatAutocomplete(inputElement, onSelect) {
  if (!inputElement) {
    return;
  }

  if (state.initializedInputs.has(inputElement)) {
    return;
  }
  state.initializedInputs.add(inputElement);

  const dropdown = createDropdown(inputElement);
  const contextKey =
    inputElement.dataset.catmatContextKey ||
    `${inputElement.id || 'catmat-input'}-${Math.random().toString(36).slice(2, 8)}`;
  inputElement.dataset.catmatContextKey = contextKey;
  state.currentInputId = contextKey;

  for (const context of Array.from(state.outsideClickContexts)) {
    if (!context.inputElement?.isConnected || !context.dropdown?.isConnected) {
      state.outsideClickContexts.delete(context);
    }
  }

  const outsideContext = { inputElement, dropdown };
  state.outsideClickContexts.add(outsideContext);
  ensureOutsideClickHandler();

  let currentQuery = '';
  let currentOffset = 0;
  let currentResults = [];
  let currentTotal = 0;
  let currentAviso = null;
  let currentMode = 'items';
  let currentSuggestions = [];
  let currentCodigoPdm = null;
  let currentContextoSelecionado = null;
  let currentDetalharView = false;

  const runSearch = async (query, { append = false, codigoPdm = null, detalhar = false } = {}) => {
    const safeQuery = String(query || '').trim();
    const targetOffset = append ? currentOffset + config.maxResults : 0;
    const result = await searchCatmat(safeQuery, {
      offset: targetOffset,
      limite: config.maxResults,
      contextKey,
      codigoPdm,
      detalhar
    });
    if (result.descartado || result.abortado) {
      return;
    }

    const dados = Array.isArray(result.dados) ? result.dados : [];

    currentQuery = safeQuery;
    currentOffset = targetOffset;
    currentTotal = Number(result.total || 0);
    currentAviso = result.aviso || null;
    currentMode = result.modo || 'items';
    currentSuggestions = Array.isArray(result.sugestoes) ? result.sugestoes : [];
    currentCodigoPdm = result.filtros?.codigoPdm || codigoPdm || null;
    currentContextoSelecionado = result.contextoSelecionado || null;
    currentDetalharView = result.filtros?.detalhar === true || detalhar === true;
    currentResults = append ? [...currentResults, ...dados] : dados;

    const hasMore = currentMode !== 'suggestions' && currentTotal > 0 && currentResults.length < currentTotal;

    renderResults(
      dropdown,
      currentResults,
      inputElement,
      (material) => {
        state.selectedMaterial = material;
        emit('catmat.item:select', {
          contextKey,
          material
        });

        if (onSelect) {
          onSelect(material);
        }
      },
      {
        aviso: currentAviso,
        modo: currentMode,
        sugestoes: currentSuggestions,
        contextoSelecionado: currentContextoSelecionado,
        detalhandoTodosGrupos: currentDetalharView && !currentCodigoPdm,
        onPickSuggestion: async (suggestion) => {
          state.selectedSuggestionByContext.set(contextKey, suggestion);
          state.selectedPdmByContext.set(contextKey, suggestion.codigoPdm || null);
          await runSearch(currentQuery, {
            append: false,
            codigoPdm: suggestion.codigoPdm || null,
            detalhar: true
          });
        },
        onBackToSuggestions:
          currentCodigoPdm || currentContextoSelecionado
            ? async () => {
                state.selectedSuggestionByContext.delete(contextKey);
                state.selectedPdmByContext.delete(contextKey);
                await runSearch(currentQuery, {
                  append: false,
                  codigoPdm: null,
                  detalhar: false
                });
              }
            : null,
        hasMore,
        onLoadMore: hasMore
          ? async () => {
              try {
                await runSearch(currentQuery, {
                  append: true,
                  codigoPdm: currentCodigoPdm,
                  detalhar: currentDetalharView
                });
              } catch {
                dropdown.style.display = 'none';
              }
            }
          : null
      }
    );
  };

  const debouncedSearch = debounce(async (query) => {
    const safeQuery = String(query || '').trim();
    if (safeQuery.length < config.minChars) {
      dropdown.style.display = 'none';
      return;
    }

    try {
      state.selectedSuggestionByContext.delete(contextKey);
      state.selectedPdmByContext.delete(contextKey);
      currentCodigoPdm = null;
      currentContextoSelecionado = null;
      await runSearch(safeQuery, {
        append: false,
        codigoPdm: null,
        detalhar: false
      });
    } catch {
      dropdown.style.display = 'none';
    }
  }, config.debounceMs);

  // Event listeners
  inputElement.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  inputElement.addEventListener('focus', (e) => {
    if (String(e.target.value || '').trim().length >= config.minChars) {
      debouncedSearch(e.target.value);
    }
  });

  inputElement.addEventListener('blur', () => {
    setTimeout(() => {
      if (dropdown.style.display !== 'none' && !dropdown.matches(':hover')) {
        dropdown.style.display = 'none';
      }

      if (!inputElement.isConnected || !dropdown.isConnected) {
        state.outsideClickContexts.delete(outsideContext);
      }
    }, 120);
  });

  // Navegação por teclado
  inputElement.addEventListener('keydown', (e) => {
    if (dropdown.style.display === 'none') {
      return;
    }

    const items = dropdown.querySelectorAll('.catmat-item');
    const currentIndex = Array.from(items).findIndex((i) => i.classList.contains('selected'));

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          items[currentIndex]?.classList.remove('selected');
          items[currentIndex + 1]?.classList.add('selected');
          items[currentIndex + 1]?.scrollIntoView({ block: 'nearest' });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex]?.classList.remove('selected');
          items[currentIndex - 1]?.classList.add('selected');
          items[currentIndex - 1]?.scrollIntoView({ block: 'nearest' });
        }
        break;
      case 'Enter': {
        e.preventDefault();
        const selectedItem = items[currentIndex >= 0 ? currentIndex : 0];
        selectedItem?.click();
        break;
      }
      case 'Escape':
        dropdown.style.display = 'none';
        break;
    }
  });
}

/**
 * Abre modal de pedido de catalogação
 */
export function abrirModalPedidoCatalogacao(termoBusca = '') {
  // Remove modal anterior se existir
  const existingModal = document.getElementById('modalCatalogacao');
  if (existingModal) {
    existingModal.remove();
  }

  emit('catalogacao.pedido:modal-open', {
    termoBusca: String(termoBusca || '').trim()
  });

  const modal = document.createElement('div');
  modal.id = 'modalCatalogacao';
  modal.className = 'modal-overlay catalogacao-modal-overlay';

  modal.innerHTML = `
    <div class="modal-content modal-card catalogacao-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="catalogacao-modal-title">
          📝 Pedido de Catalogação CATMAT
        </h2>
        <button type="button" class="btn-fechar-modal catalogacao-btn-fechar">&times;</button>
      </div>

      <form id="formPedidoCatalogacao" class="catalogacao-form modal-body">
        <div class="form-group">
          <label class="catalogacao-field-label">
            Termo Buscado *
          </label>
          <input type="text" id="pedidoTermoBusca" required
            value="${termoBusca}"
            class="sg-input"
            placeholder="Digite o termo que você buscou">
        </div>

        <div class="form-group">
          <label class="catalogacao-field-label">
            Descrição Completa do Material *
          </label>
          <textarea id="pedidoDescricao" required rows="4"
            class="sg-textarea"
            placeholder="Descreva o material com o máximo de detalhes possível (mínimo 10 caracteres)"></textarea>
        </div>

        <div class="catalogacao-form-grid-2">
          <div class="form-group">
            <label class="catalogacao-field-label">
              Unidade de Medida
            </label>
            <select id="pedidoUnidade" class="sg-select">
              <option value="UN">UN - Unidade</option>
              <option value="CX">CX - Caixa</option>
              <option value="PC">PC - Pacote</option>
              <option value="KG">KG - Quilograma</option>
              <option value="LT">LT - Litro</option>
              <option value="MT">MT - Metro</option>
              <option value="M2">M² - Metro Quadrado</option>
              <option value="M3">M³ - Metro Cúbico</option>
              <option value="GL">GL - Galão</option>
              <option value="RL">RL - Rolo</option>
              <option value="FL">FL - Folha</option>
              <option value="RS">RS - Resma</option>
            </select>
          </div>

          <div class="form-group">
            <label class="catalogacao-field-label">
              Tipo
            </label>
            <select id="pedidoTipo" class="sg-select">
              <option value="CATMAT">CATMAT - Material</option>
              <option value="CATSER">CATSER - Serviço</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="catalogacao-field-label">
            Justificativa
          </label>
          <textarea id="pedidoJustificativa" rows="2"
            class="sg-textarea"
            placeholder="Por que este material é necessário para o órgão?"></textarea>
        </div>

        <div class="catalogacao-info-box">
          <p class="catalogacao-info-title">
            ℹ️ Próximos Passos
          </p>
          <ol class="catalogacao-info-list">
            <li>Este pedido será registrado no sistema SINGEM</li>
            <li>Acesse o <a href="https://www.gov.br/compras/pt-br/sistemas/sistema-de-catalogacao" target="_blank" class="catalogacao-info-link">Portal de Compras</a> para solicitar oficialmente</li>
            <li>Atualize o status aqui quando houver resposta</li>
          </ol>
        </div>

        <div class="catalogacao-form-actions">
          <button type="button" class="btn-cancelar btn btn-outline">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Pedido</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.querySelector('.btn-fechar-modal')?.addEventListener('click', () => modal.remove());
  modal.querySelector('.btn-cancelar')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Submit do formulário
  modal.querySelector('#formPedidoCatalogacao')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dados = {
      termo_busca: document.getElementById('pedidoTermoBusca')?.value,
      descricao_solicitada: document.getElementById('pedidoDescricao')?.value,
      unidade_sugerida: document.getElementById('pedidoUnidade')?.value,
      tipo: document.getElementById('pedidoTipo')?.value,
      justificativa: document.getElementById('pedidoJustificativa')?.value
    };

    try {
      showLoading('Registrando pedido...');
      const result = await criarPedidoCatalogacao(dados);
      hideLoading();

      modal.remove();

      notifySuccess('✅ Pedido de catalogação registrado com sucesso!');

      // Mostra instruções
      if (result.instrucoes) {
        setTimeout(() => {
          notifyInfo(result.instrucoes.mensagem);
        }, 500);
      }

      const pedidoCriado = result?.dados || result?.data || null;

      // EventBus oficial para comunicação entre módulos/submódulos.
      emit('catalogacao.pedido:novo', {
        pedido: pedidoCriado,
        origem: 'catmatIntegration'
      });

      // Compatibilidade com listeners legados.
      document.dispatchEvent(new CustomEvent('catalogacao:novo-pedido', { detail: pedidoCriado }));
    } catch (err) {
      hideLoading();
      emit('catalogacao.pedido:error', {
        erro: err?.message || 'Erro ao registrar pedido'
      });
      notifyError(`Erro ao registrar pedido: ${err.message}`);
    }
  });

  // Foca no primeiro campo
  setTimeout(() => {
    document.getElementById('pedidoDescricao')?.focus();
  }, 100);
}

/**
 * Exporta módulo para uso global
 */
if (typeof window !== 'undefined') {
  window.CatmatIntegration = {
    searchCatmat,
    getCatmatByCodigo,
    criarPedidoCatalogacao,
    initCatmatAutocomplete,
    abrirModalPedidoCatalogacao
  };
}

export default {
  searchCatmat,
  getCatmatByCodigo,
  criarPedidoCatalogacao,
  initCatmatAutocomplete,
  abrirModalPedidoCatalogacao
};
