/**
 * CATMAT Integration - SINGEM Frontend
 * Componente de autocomplete e modal de pedido de catalogação
 */

import { debounce } from './utils/throttle.js';
import { showLoading, hideLoading, notifySuccess, notifyError, notifyInfo } from './ui/feedback.js';
import { httpRequest } from './shared/lib/http.js';

/**
 * Configuração do módulo
 */
const config = {
  minChars: 3,
  debounceMs: 300,
  maxResults: 20
};

/**
 * Estado interno
 */
const state = {
  searchAbortController: null,
  selectedMaterial: null,
  currentInputId: null
};

/**
 * Busca materiais na API CATMAT
 * @param {string} query - Termo de busca
 * @returns {Promise<{dados: Array, total: number}>}
 */
export async function searchCatmat(query, { offset = 0, limite = config.maxResults } = {}) {
  if (!query || query.length < config.minChars) {
    return { dados: [], total: 0, offset, limite };
  }

  // Cancela busca anterior se houver
  if (state.searchAbortController) {
    state.searchAbortController.abort();
  }
  state.searchAbortController = new AbortController();

  try {
    const response = await httpRequest(
      `/api/catmat/search?q=${encodeURIComponent(query)}&limite=${limite}&offset=${offset}`,
      {
        signal: state.searchAbortController.signal
      }
    );

    if (!response.ok) {
      throw new Error(response.error?.message || 'Erro na busca CATMAT');
    }

    const result = response.data || {};
    return {
      ...result,
      offset,
      limite
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { dados: [], total: 0 };
    }
    console.error('[CATMAT] Erro na busca:', err);
    throw err;
  }
}

/**
 * Busca material por código
 * @param {string|number} codigo
 * @returns {Promise<Object|null>}
 */
export async function getCatmatByCodigo(codigo) {
  try {
    const response = await httpRequest(`/api/catmat/${codigo}`);

    if (!response.ok) {
      return null;
    }

    const data = response.data || {};
    return data.dados;
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
  dropdown.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 1000;
    display: none;
  `;

  // Wrapper com position relative
  if (inputElement.parentElement.style.position !== 'relative') {
    inputElement.parentElement.style.position = 'relative';
  }

  inputElement.parentElement.appendChild(dropdown);
  return dropdown;
}

/**
 * Renderiza resultados no dropdown
 */
function renderResults(dropdown, results, inputElement, onSelect, options = {}) {
  const { aviso = null, hasMore = false, onLoadMore = null } = options;
  dropdown.innerHTML = '';

  if (aviso) {
    const avisoEl = document.createElement('div');
    avisoEl.style.cssText = `
      padding: 8px 10px;
      background: #fff3cd;
      color: #856404;
      border-bottom: 1px solid #f0d98c;
      font-size: 12px;
    `;
    avisoEl.textContent = aviso;
    dropdown.appendChild(avisoEl);
  }

  if (results.length === 0) {
    dropdown.innerHTML = `
      <div style="padding: 12px; text-align: center;">
        <p style="margin: 0 0 10px; color: #666;">Nenhum material encontrado</p>
        <button type="button" class="btn-criar-pedido" style="
          background: #1351B4;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">
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
    item.style.cssText = `
      padding: 10px 12px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
      display: flex;
      flex-direction: column;
      gap: 2px;
    `;

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong style="color: #1351B4;">${material.catmat_id || material.codigo || '-'}</strong>
        <span style="font-size: 12px; color: #666;">${material.unidade || 'UN'}</span>
      </div>
      <div style="font-size: 13px; color: #333; line-height: 1.4;">
        ${material.descricao}
      </div>
      ${material.catmat_sustentavel ? '<span style="font-size: 11px; color: green;">🌿 Sustentável</span>' : ''}
    `;

    item.addEventListener('mouseenter', () => {
      item.style.background = '#f5f5f5';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'white';
    });

    item.addEventListener('click', () => {
      onSelect(material);
      dropdown.style.display = 'none';
    });

    dropdown.appendChild(item);
  });

  // Botão de "não encontrei" no final
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 10px;
    text-align: center;
    background: #f9f9f9;
    border-top: 1px solid #ddd;
  `;
  footer.innerHTML = `
    <button type="button" class="btn-criar-pedido-footer" style="
      background: none;
      color: #1351B4;
      border: none;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 13px;
      text-decoration: underline;
    ">
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
    loadMore.textContent = 'Carregar mais resultados';
    loadMore.style.cssText = `
      width: 100%;
      padding: 8px 10px;
      border: none;
      border-top: 1px solid #ddd;
      background: #f5f8ff;
      color: #1351B4;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    `;
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

  const dropdown = createDropdown(inputElement);
  let currentQuery = '';
  let currentOffset = 0;
  let currentResults = [];
  let currentTotal = 0;
  let currentAviso = null;

  const runSearch = async (query, { append = false } = {}) => {
    const targetOffset = append ? currentOffset + config.maxResults : 0;
    const result = await searchCatmat(query, {
      offset: targetOffset,
      limite: config.maxResults
    });
    const dados = result.dados || [];

    currentQuery = query;
    currentOffset = targetOffset;
    currentTotal = Number(result.total || 0);
    currentAviso = result.aviso || null;
    currentResults = append ? [...currentResults, ...dados] : dados;

    const hasMore = currentTotal > 0 && currentResults.length < currentTotal;

    renderResults(
      dropdown,
      currentResults,
      inputElement,
      (material) => {
        state.selectedMaterial = material;
        if (onSelect) {
          onSelect(material);
        }
      },
      {
        aviso: currentAviso,
        hasMore,
        onLoadMore: hasMore
          ? async () => {
              try {
                await runSearch(currentQuery, { append: true });
              } catch {
                dropdown.style.display = 'none';
              }
            }
          : null
      }
    );
  };

  const debouncedSearch = debounce(async (query) => {
    if (query.length < config.minChars) {
      dropdown.style.display = 'none';
      return;
    }

    try {
      await runSearch(query, { append: false });
    } catch {
      dropdown.style.display = 'none';
    }
  }, config.debounceMs);

  // Event listeners
  inputElement.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  inputElement.addEventListener('focus', (e) => {
    if (e.target.value.length >= config.minChars) {
      debouncedSearch(e.target.value);
    }
  });

  // Fecha dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    if (!inputElement.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
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

  const modal = document.createElement('div');
  modal.id = 'modalCatalogacao';
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  modal.innerHTML = `
    <div class="modal-content" style="
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    ">
      <div class="modal-header" style="
        padding: 20px;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h2 style="margin: 0; font-size: 18px; color: #1351B4;">
          📝 Pedido de Catalogação CATMAT
        </h2>
        <button type="button" class="btn-fechar-modal" style="
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
      </div>

      <form id="formPedidoCatalogacao" style="padding: 20px;">
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">
            Termo Buscado *
          </label>
          <input type="text" id="pedidoTermoBusca" required
            value="${termoBusca}"
            style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"
            placeholder="Digite o termo que você buscou">
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">
            Descrição Completa do Material *
          </label>
          <textarea id="pedidoDescricao" required rows="4"
            style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"
            placeholder="Descreva o material com o máximo de detalhes possível (mínimo 10 caracteres)"></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">
              Unidade de Medida
            </label>
            <select id="pedidoUnidade" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
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
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">
              Tipo
            </label>
            <select id="pedidoTipo" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
              <option value="CATMAT">CATMAT - Material</option>
              <option value="CATSER">CATSER - Serviço</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">
            Justificativa
          </label>
          <textarea id="pedidoJustificativa" rows="2"
            style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"
            placeholder="Por que este material é necessário para o órgão?"></textarea>
        </div>

        <div style="
          background: #E8F0FE;
          border-left: 4px solid #1351B4;
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: 0 4px 4px 0;
        ">
          <p style="margin: 0 0 8px; font-weight: 500; color: #1351B4;">
            ℹ️ Próximos Passos
          </p>
          <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #333;">
            <li>Este pedido será registrado no sistema SINGEM</li>
            <li>Acesse o <a href="https://www.gov.br/compras/pt-br/sistemas/sistema-de-catalogacao" target="_blank" style="color: #1351B4;">Portal de Compras</a> para solicitar oficialmente</li>
            <li>Atualize o status aqui quando houver resposta</li>
          </ol>
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" class="btn-cancelar" style="
            padding: 10px 20px;
            border: 1px solid #ccc;
            background: white;
            border-radius: 4px;
            cursor: pointer;
          ">Cancelar</button>
          <button type="submit" style="
            padding: 10px 20px;
            background: #1351B4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Registrar Pedido</button>
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

      // Dispara evento para atualizar lista de pedidos se existir
      document.dispatchEvent(new CustomEvent('catalogacao:novo-pedido', { detail: result.dados }));
    } catch (err) {
      hideLoading();
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
