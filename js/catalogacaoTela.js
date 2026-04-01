/**
 * Tela de Pedidos de Catalogação - SINGEM Frontend
 * Lista, filtra e gerencia pedidos de catalogação CATMAT
 */

import { showLoading, hideLoading, notifySuccess, notifyError } from './ui/feedback.js';
import { httpRequest } from './shared/lib/http.js';
import { on as onEventBus, off as offEventBus } from './core/eventBus.js';

/**
 * Estado da tela
 */
const state = {
  pedidos: [],
  filtros: {
    status: '',
    q: ''
  },
  paginacao: {
    pagina: 1,
    limite: 20,
    total: 0
  },
  listeners: {
    domNovoPedido: null,
    busNovoPedido: null
  }
};

/**
 * Busca pedidos da API
 */
export async function carregarPedidos(filtros = {}) {
  try {
    const params = new URLSearchParams({
      ...state.filtros,
      ...filtros,
      limite: state.paginacao.limite,
      offset: (state.paginacao.pagina - 1) * state.paginacao.limite
    });

    const response = await httpRequest(`/api/catalogacao-pedidos?${params.toString()}`);
    if (!response.ok) {
      throw new Error(response.error?.message || 'Erro ao carregar pedidos');
    }

    const result = response.data || {};
    state.pedidos = result.dados || [];
    state.paginacao.total = result.paginacao?.total || 0;

    return result;
  } catch (err) {
    console.error('[Catalogação] Erro ao carregar:', err);
    throw err;
  }
}

export async function excluirPedido(id) {
  const response = await httpRequest(`/api/catalogacao-pedidos/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(response.error?.message || 'Erro ao excluir pedido');
  }

  return response.data;
}

/**
 * Atualiza status de um pedido
 */
export async function atualizarStatusPedido(id, novoStatus, dados = {}) {
  const response = await httpRequest(`/api/catalogacao-pedidos/${id}/status`, {
    method: 'PATCH',
    body: { status: novoStatus, ...dados }
  });

  if (!response.ok) {
    throw new Error(response.error?.message || 'Erro ao atualizar status');
  }

  return response.data;
}

/**
 * Renderiza badge de status
 */
function renderStatusBadge(status) {
  const configs = {
    NAO_SOLICITADO: { className: 'nao-solicitado', label: 'Não Solicitado' },
    SOLICITADO: { className: 'solicitado', label: 'Solicitado' },
    APROVADO: { className: 'aprovado', label: 'Aprovado' },
    DEVOLVIDO: { className: 'devolvido', label: 'Devolvido' },
    CANCELADO: { className: 'cancelado', label: 'Cancelado' }
  };

  const cfg = configs[status] || configs.NAO_SOLICITADO;
  return `<span class="badge-status catalogacao-status catalogacao-status--${cfg.className}">${cfg.label}</span>`;
}

/**
 * Renderiza linha da tabela
 */
function renderPedidoRow(pedido) {
  const dataFormatada = pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('pt-BR') : '-';

  return `
    <tr data-id="${pedido.id}">
      <td>${pedido.id}</td>
      <td>${pedido.tipo || 'CATMAT'}</td>
      <td title="${pedido.descricao_solicitada}">
        <strong>${pedido.termo_busca}</strong><br>
        <small class="catalogacao-row-preview">${(pedido.descricao_solicitada || '').substring(0, 60)}${(pedido.descricao_solicitada || '').length > 60 ? '...' : ''}</small>
      </td>
      <td>${renderStatusBadge(pedido.status)}</td>
      <td>${pedido.solicitante_nome || '-'}</td>
      <td>${dataFormatada}</td>
      <td>
        <button type="button" class="btn-acao btn-ver" data-id="${pedido.id}" title="Ver detalhes">
          Ver
        </button>
        ${
          pedido.status === 'NAO_SOLICITADO'
            ? `
          <button type="button" class="btn-acao btn-solicitar" data-id="${pedido.id}" title="Marcar como Solicitado">
            Solicitar
          </button>
        `
            : ''
        }
        ${
          pedido.status === 'SOLICITADO'
            ? `
          <button type="button" class="btn-acao btn-aprovar" data-id="${pedido.id}" title="Marcar como Aprovado">
            Aprovar
          </button>
          <button type="button" class="btn-acao btn-devolver" data-id="${pedido.id}" title="Marcar como Devolvido">
            Devolver
          </button>
        `
            : ''
        }
        ${
          ['NAO_SOLICITADO'].includes(pedido.status)
            ? `
          <button type="button" class="btn-acao btn-excluir" data-id="${pedido.id}" title="Excluir">
            Excluir
          </button>
        `
            : ''
        }
      </td>
    </tr>
  `;
}

/**
 * Renderiza tabela completa
 */
function renderTabela(container) {
  if (!container) {
    return;
  }

  if (state.pedidos.length === 0) {
    container.innerHTML = `
      <div class="catalogacao-empty-state">
        <p class="catalogacao-empty-icon material-symbols-outlined" aria-hidden="true">list_alt</p>
        <p>Nenhum pedido de catalogação encontrado.</p>
        <button type="button" id="btnNovoPedidoCat" class="btn btn-primary">
          + Novo Pedido
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="catalogacao-table-shell sg-table-shell">
    <table class="tabela-pedidos sg-table catalogacao-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Tipo</th>
          <th>Termo/Descrição</th>
          <th>Status</th>
          <th>Solicitante</th>
          <th>Data</th>
          <th class="catalogacao-col-actions">Ações</th>
        </tr>
      </thead>
      <tbody>
        ${state.pedidos.map(renderPedidoRow).join('')}
      </tbody>
    </table>
    </div>

    ${
      state.paginacao.total > state.paginacao.limite
        ? `
      <div class="catalogacao-pagination pagination-controls">
        <button type="button" class="btn btn-secondary btn-pag-ant" ${state.paginacao.pagina <= 1 ? 'disabled' : ''}>
          Anterior
        </button>
        <span class="pagination-info">
          Página ${state.paginacao.pagina} de ${Math.ceil(state.paginacao.total / state.paginacao.limite)}
        </span>
        <button type="button" class="btn btn-secondary btn-pag-prox" ${state.paginacao.pagina >= Math.ceil(state.paginacao.total / state.paginacao.limite) ? 'disabled' : ''}>
          Próxima →
        </button>
      </div>
    `
        : ''
    }
  `;
}

/**
 * Modal de detalhes do pedido
 */
function abrirModalDetalhes(pedido) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay catalogacao-modal-overlay';

  modal.innerHTML = `
    <div class="modal-content modal-card catalogacao-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="catalogacao-modal-title">Pedido #${pedido.id}</h2>
        <button type="button" class="btn-fechar catalogacao-btn-fechar">&times;</button>
      </div>

      <div class="modal-body">
        <div class="catalogacao-detail-grid">
          <div>
            <label class="catalogacao-detail-label">TIPO</label>
            <p class="catalogacao-detail-value">${pedido.tipo || 'CATMAT'}</p>
          </div>

          <div>
            <label class="catalogacao-detail-label">TERMO BUSCADO</label>
            <p class="catalogacao-detail-value">${pedido.termo_busca}</p>
          </div>

          <div>
            <label class="catalogacao-detail-label">DESCRIÇÃO SOLICITADA</label>
            <p class="catalogacao-detail-value">${pedido.descricao_solicitada || '-'}</p>
          </div>

          <div>
            <label class="catalogacao-detail-label">UNIDADE SUGERIDA</label>
            <p class="catalogacao-detail-value">${pedido.unidade_sugerida || 'UN'}</p>
          </div>

          <div>
            <label class="catalogacao-detail-label">STATUS</label>
            <p class="catalogacao-detail-value">${renderStatusBadge(pedido.status)}</p>
          </div>

          ${
            pedido.justificativa
              ? `
            <div>
              <label class="catalogacao-detail-label">JUSTIFICATIVA</label>
              <p class="catalogacao-detail-value">${pedido.justificativa}</p>
            </div>
          `
              : ''
          }

          ${
            pedido.observacoes
              ? `
            <div>
              <label class="catalogacao-detail-label">OBSERVAÇÕES</label>
              <p class="catalogacao-detail-value">${pedido.observacoes}</p>
            </div>
          `
              : ''
          }

          ${
            pedido.link_externo
              ? `
            <div>
              <label class="catalogacao-detail-label">LINK EXTERNO</label>
              <p class="catalogacao-detail-value"><a href="${pedido.link_externo}" target="_blank">${pedido.link_externo}</a></p>
            </div>
          `
              : ''
          }

          ${
            pedido.catmat_codigo_aprovado
              ? `
            <div>
              <label class="catalogacao-detail-label">CÓDIGO CATMAT APROVADO</label>
              <p class="catalogacao-detail-value catalogacao-detail-value--aprovado">${pedido.catmat_codigo_aprovado}</p>
            </div>
          `
              : ''
          }

          <div class="catalogacao-detail-grid catalogacao-detail-grid--cols2">
            <div>
              <label class="catalogacao-detail-label">SOLICITANTE</label>
              <p class="catalogacao-detail-value">${pedido.solicitante_nome || '-'}</p>
            </div>
            <div>
              <label class="catalogacao-detail-label">DATA CRIAÇÃO</label>
              <p class="catalogacao-detail-value">${pedido.created_at ? new Date(pedido.created_at).toLocaleString('pt-BR') : '-'}</p>
            </div>
          </div>
        </div>

        <div class="catalogacao-info-box">
          <p class="catalogacao-info-title">
            Acompanhar no Compras.gov.br
          </p>
          <a href="https://www.gov.br/compras/pt-br/sistemas/sistema-de-catalogacao"
             target="_blank"
             class="catalogacao-info-link">
            Abrir Portal de Compras →
          </a>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.btn-fechar')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Inicializa a tela de pedidos de catalogação
 */
export function initTelaCatalogacao(containerId = 'catalogacaoPedidosContainer') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('[Catalogação] Container não encontrado:', containerId);
    return;
  }

  // Render inicial: filtros + tabela
  container.innerHTML = `
    <div class="catalogacao-filtros sg-toolbar">
      <div class="form-group catalogacao-filtro-grow">
        <input type="text" id="filtroTermoCat" placeholder="Buscar por termo ou descricao..."
          class="sg-input" />
      </div>

      <div class="form-group">
        <select id="filtroStatusCat" class="sg-select catalogacao-filtro-status">
          <option value="">Todos os Status</option>
          <option value="NAO_SOLICITADO">Não Solicitado</option>
          <option value="SOLICITADO">Solicitado</option>
          <option value="APROVADO">Aprovado</option>
          <option value="DEVOLVIDO">Devolvido</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <button type="button" id="btnBuscarCat" class="btn btn-primary">
        Filtrar
      </button>

      <button type="button" id="btnNovoPedido" class="btn btn-secondary catalogacao-btn-novo">
        + Novo Pedido
      </button>
    </div>

    <div id="tabelaPedidosCat" class="catalogacao-tabela">
      <p class="catalogacao-loading">Carregando...</p>
    </div>
  `;

  const tabelaContainer = container.querySelector('#tabelaPedidosCat');

  // Carrega dados iniciais
  carregarPedidos()
    .then(() => {
      renderTabela(tabelaContainer);
      bindEventos(container, tabelaContainer);
    })
    .catch((err) => {
      tabelaContainer.innerHTML = `
      <div class="catalogacao-error-state">
        <p>Erro ao carregar pedidos: ${err.message}</p>
        <button type="button" class="btn btn-secondary" onclick="location.reload()">Tentar Novamente</button>
      </div>
    `;
    });
}

/**
 * Bind de eventos
 */
function bindEventos(container, tabelaContainer) {
  // Filtro por status
  container.querySelector('#filtroStatusCat')?.addEventListener('change', (e) => {
    state.filtros.status = e.target.value;
  });

  // Filtro por termo
  container.querySelector('#filtroTermoCat')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      state.filtros.q = e.target.value;
      state.paginacao.pagina = 1;
      carregarPedidos().then(() => renderTabela(tabelaContainer));
    }
  });

  // Botão filtrar
  container.querySelector('#btnBuscarCat')?.addEventListener('click', () => {
    state.filtros.q = container.querySelector('#filtroTermoCat')?.value || '';
    state.paginacao.pagina = 1;
    carregarPedidos().then(() => renderTabela(tabelaContainer));
  });

  // Botão novo pedido
  container.querySelector('#btnNovoPedido')?.addEventListener('click', () => {
    if (window.CatmatIntegration) {
      window.CatmatIntegration.abrirModalPedidoCatalogacao();
    }
  });

  // Event delegation para botões na tabela
  tabelaContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) {
      return;
    }

    const id = btn.dataset.id;
    const pedido = state.pedidos.find((p) => String(p.id) === String(id));

    if (btn.classList.contains('btn-ver')) {
      abrirModalDetalhes(pedido);
    }

    if (btn.classList.contains('btn-solicitar')) {
      const linkExterno = prompt('Informe o link/protocolo do pedido no Compras.gov.br (opcional):');
      try {
        showLoading('Atualizando...');
        await atualizarStatusPedido(id, 'SOLICITADO', { link_externo: linkExterno });
        await carregarPedidos();
        renderTabela(tabelaContainer);
        hideLoading();
        notifySuccess('Status atualizado para Solicitado');
      } catch (err) {
        hideLoading();
        notifyError(err.message);
      }
    }

    if (btn.classList.contains('btn-aprovar')) {
      const codigo = prompt('Informe o código CATMAT aprovado (se houver):');
      try {
        showLoading('Atualizando...');
        await atualizarStatusPedido(id, 'APROVADO', { catmat_codigo_aprovado: codigo });
        await carregarPedidos();
        renderTabela(tabelaContainer);
        hideLoading();
        notifySuccess('Status atualizado para Aprovado! 🎉');
      } catch (err) {
        hideLoading();
        notifyError(err.message);
      }
    }

    if (btn.classList.contains('btn-devolver')) {
      const obs = prompt('Motivo da devolução:');
      try {
        showLoading('Atualizando...');
        await atualizarStatusPedido(id, 'DEVOLVIDO', { observacoes: obs });
        await carregarPedidos();
        renderTabela(tabelaContainer);
        hideLoading();
        notifySuccess('Status atualizado para Devolvido');
      } catch (err) {
        hideLoading();
        notifyError(err.message);
      }
    }

    if (btn.classList.contains('btn-excluir')) {
      if (!confirm('Tem certeza que deseja excluir este pedido?')) {
        return;
      }
      try {
        showLoading('Excluindo...');
        await excluirPedido(id);
        await carregarPedidos();
        renderTabela(tabelaContainer);
        hideLoading();
        notifySuccess('Pedido excluído');
      } catch (err) {
        hideLoading();
        notifyError(err.message);
      }
    }
  });

  // Paginação
  tabelaContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-pag-ant')) {
      state.paginacao.pagina--;
      await carregarPedidos();
      renderTabela(tabelaContainer);
    }
    if (e.target.classList.contains('btn-pag-prox')) {
      state.paginacao.pagina++;
      await carregarPedidos();
      renderTabela(tabelaContainer);
    }
  });

  const refreshPedidos = async () => {
    await carregarPedidos();
    renderTabela(tabelaContainer);
  };

  // Escuta legado (DOM Event) e barramento oficial (EventBus).
  if (state.listeners.domNovoPedido) {
    document.removeEventListener('catalogacao:novo-pedido', state.listeners.domNovoPedido);
  }
  state.listeners.domNovoPedido = refreshPedidos;
  document.addEventListener('catalogacao:novo-pedido', state.listeners.domNovoPedido);

  if (state.listeners.busNovoPedido) {
    offEventBus('catalogacao.pedido:novo', state.listeners.busNovoPedido);
  }
  state.listeners.busNovoPedido = refreshPedidos;
  onEventBus('catalogacao.pedido:novo', state.listeners.busNovoPedido);
}

// Exporta para uso global
if (typeof window !== 'undefined') {
  window.CatalogacaoTela = {
    initTelaCatalogacao,
    carregarPedidos,
    atualizarStatusPedido
  };
}

export default {
  initTelaCatalogacao,
  carregarPedidos,
  atualizarStatusPedido,
  excluirPedido
};
