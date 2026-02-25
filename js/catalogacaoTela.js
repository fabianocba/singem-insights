/**
 * Tela de Pedidos de Catalogação - SINGEM Frontend
 * Lista, filtra e gerencia pedidos de catalogação CATMAT
 */

import { showLoading, hideLoading, notifySuccess, notifyError } from './ui/feedback.js';

const API_BASE = window.SINGEM_API_URL || '';

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
  }
};

/**
 * Busca pedidos da API
 */
export async function carregarPedidos(filtros = {}) {
  try {
    const token = localStorage.getItem('singem_token') || sessionStorage.getItem('singem_token');
    const params = new URLSearchParams({
      ...state.filtros,
      ...filtros,
      limite: state.paginacao.limite,
      offset: (state.paginacao.pagina - 1) * state.paginacao.limite
    });

    const response = await fetch(`${API_BASE}/api/catalogacao-pedidos?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao carregar pedidos');
    }

    const result = await response.json();
    state.pedidos = result.dados || [];
    state.paginacao.total = result.paginacao?.total || 0;

    return result;
  } catch (err) {
    console.error('[Catalogação] Erro ao carregar:', err);
    throw err;
  }
}

/**
 * Atualiza status de um pedido
 */
export async function atualizarStatusPedido(id, novoStatus, dados = {}) {
  const token = localStorage.getItem('singem_token') || sessionStorage.getItem('singem_token');
  const response = await fetch(`${API_BASE}/api/catalogacao-pedidos/${id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: novoStatus, ...dados })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.erro || 'Erro ao atualizar status');
  }

  return await response.json();
}

/**
 * Renderiza badge de status
 */
function renderStatusBadge(status) {
  const cores = {
    NAO_SOLICITADO: { bg: '#E8E8E8', color: '#333', label: 'Não Solicitado' },
    SOLICITADO: { bg: '#FFF3CD', color: '#856404', label: 'Solicitado' },
    APROVADO: { bg: '#D4EDDA', color: '#155724', label: 'Aprovado' },
    DEVOLVIDO: { bg: '#FFE5E5', color: '#721C24', label: 'Devolvido' },
    CANCELADO: { bg: '#D6D6D6', color: '#666', label: 'Cancelado' }
  };

  const cfg = cores[status] || cores.NAO_SOLICITADO;
  return `<span class="badge-status" style="
    background: ${cfg.bg};
    color: ${cfg.color};
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  ">${cfg.label}</span>`;
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
        <small style="color: #666;">${(pedido.descricao_solicitada || '').substring(0, 60)}${(pedido.descricao_solicitada || '').length > 60 ? '...' : ''}</small>
      </td>
      <td>${renderStatusBadge(pedido.status)}</td>
      <td>${pedido.solicitante_nome || '-'}</td>
      <td>${dataFormatada}</td>
      <td>
        <button type="button" class="btn-acao btn-ver" data-id="${pedido.id}" title="Ver detalhes">
          👁️
        </button>
        ${
          pedido.status === 'NAO_SOLICITADO'
            ? `
          <button type="button" class="btn-acao btn-solicitar" data-id="${pedido.id}" title="Marcar como Solicitado">
            📤
          </button>
        `
            : ''
        }
        ${
          pedido.status === 'SOLICITADO'
            ? `
          <button type="button" class="btn-acao btn-aprovar" data-id="${pedido.id}" title="Marcar como Aprovado">
            ✅
          </button>
          <button type="button" class="btn-acao btn-devolver" data-id="${pedido.id}" title="Marcar como Devolvido">
            ↩️
          </button>
        `
            : ''
        }
        ${
          ['NAO_SOLICITADO'].includes(pedido.status)
            ? `
          <button type="button" class="btn-acao btn-excluir" data-id="${pedido.id}" title="Excluir">
            🗑️
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
      <div style="text-align: center; padding: 40px; color: #666;">
        <p style="font-size: 48px; margin: 0;">📋</p>
        <p>Nenhum pedido de catalogação encontrado.</p>
        <button type="button" id="btnNovoPedidoCat" class="btn btn-primary">
          + Novo Pedido
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="tabela-pedidos" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">ID</th>
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Tipo</th>
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Termo/Descrição</th>
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Solicitante</th>
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Data</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Ações</th>
        </tr>
      </thead>
      <tbody>
        ${state.pedidos.map(renderPedidoRow).join('')}
      </tbody>
    </table>

    ${
      state.paginacao.total > state.paginacao.limite
        ? `
      <div style="display: flex; justify-content: center; gap: 8px; margin-top: 20px;">
        <button type="button" class="btn btn-secondary btn-pag-ant" ${state.paginacao.pagina <= 1 ? 'disabled' : ''}>
          ← Anterior
        </button>
        <span style="padding: 8px;">
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

  // Adiciona CSS para as linhas
  container.querySelectorAll('tbody tr').forEach((tr) => {
    tr.style.cssText = 'border-bottom: 1px solid #eee;';
    tr.addEventListener('mouseenter', () => {
      tr.style.background = '#f9f9f9';
    });
    tr.addEventListener('mouseleave', () => {
      tr.style.background = '';
    });
  });

  container.querySelectorAll('td').forEach((td) => {
    td.style.padding = '12px';
  });

  container.querySelectorAll('.btn-acao').forEach((btn) => {
    btn.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      font-size: 16px;
    `;
  });
}

/**
 * Modal de detalhes do pedido
 */
function abrirModalDetalhes(pedido) {
  const modal = document.createElement('div');
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
    ">
      <div style="padding: 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 18px;">📋 Pedido #${pedido.id}</h2>
        <button type="button" class="btn-fechar" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
      </div>

      <div style="padding: 20px;">
        <div style="display: grid; gap: 16px;">
          <div>
            <label style="font-weight: 500; color: #666; font-size: 12px;">TIPO</label>
            <p style="margin: 4px 0;">${pedido.tipo || 'CATMAT'}</p>
          </div>

          <div>
            <label style="font-weight: 500; color: #666; font-size: 12px;">TERMO BUSCADO</label>
            <p style="margin: 4px 0;">${pedido.termo_busca}</p>
          </div>

          <div>
            <label style="font-weight: 500; color: #666; font-size: 12px;">DESCRIÇÃO SOLICITADA</label>
            <p style="margin: 4px 0;">${pedido.descricao_solicitada || '-'}</p>
          </div>

          <div>
            <label style="font-weight: 500; color: #666; font-size: 12px;">UNIDADE SUGERIDA</label>
            <p style="margin: 4px 0;">${pedido.unidade_sugerida || 'UN'}</p>
          </div>

          <div>
            <label style="font-weight: 500; color: #666; font-size: 12px;">STATUS</label>
            <p style="margin: 4px 0;">${renderStatusBadge(pedido.status)}</p>
          </div>

          ${
            pedido.justificativa
              ? `
            <div>
              <label style="font-weight: 500; color: #666; font-size: 12px;">JUSTIFICATIVA</label>
              <p style="margin: 4px 0;">${pedido.justificativa}</p>
            </div>
          `
              : ''
          }

          ${
            pedido.observacoes
              ? `
            <div>
              <label style="font-weight: 500; color: #666; font-size: 12px;">OBSERVAÇÕES</label>
              <p style="margin: 4px 0;">${pedido.observacoes}</p>
            </div>
          `
              : ''
          }

          ${
            pedido.link_externo
              ? `
            <div>
              <label style="font-weight: 500; color: #666; font-size: 12px;">LINK EXTERNO</label>
              <p style="margin: 4px 0;"><a href="${pedido.link_externo}" target="_blank">${pedido.link_externo}</a></p>
            </div>
          `
              : ''
          }

          ${
            pedido.catmat_codigo_aprovado
              ? `
            <div>
              <label style="font-weight: 500; color: #666; font-size: 12px;">CÓDIGO CATMAT APROVADO</label>
              <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: green;">${pedido.catmat_codigo_aprovado}</p>
            </div>
          `
              : ''
          }

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="font-weight: 500; color: #666; font-size: 12px;">SOLICITANTE</label>
              <p style="margin: 4px 0;">${pedido.solicitante_nome || '-'}</p>
            </div>
            <div>
              <label style="font-weight: 500; color: #666; font-size: 12px;">DATA CRIAÇÃO</label>
              <p style="margin: 4px 0;">${pedido.created_at ? new Date(pedido.created_at).toLocaleString('pt-BR') : '-'}</p>
            </div>
          </div>
        </div>

        <div style="
          background: #E8F0FE;
          border-left: 4px solid #1351B4;
          padding: 12px 16px;
          margin-top: 20px;
          border-radius: 0 4px 4px 0;
        ">
          <p style="margin: 0 0 8px; font-weight: 500; color: #1351B4;">
            📌 Acompanhar no Compras.gov.br
          </p>
          <a href="https://www.gov.br/compras/pt-br/sistemas/sistema-de-catalogacao"
             target="_blank"
             style="color: #1351B4;">
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
    <div class="catalogacao-filtros" style="
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      align-items: center;
    ">
      <div class="form-group" style="flex: 1; min-width: 200px;">
        <input type="text" id="filtroTermoCat" placeholder="🔍 Buscar por termo ou descrição..."
          style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" />
      </div>

      <div class="form-group">
        <select id="filtroStatusCat" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px; min-width: 150px;">
          <option value="">Todos os Status</option>
          <option value="NAO_SOLICITADO">Não Solicitado</option>
          <option value="SOLICITADO">Solicitado</option>
          <option value="APROVADO">Aprovado</option>
          <option value="DEVOLVIDO">Devolvido</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <button type="button" id="btnBuscarCat" class="btn btn-primary" style="padding: 10px 20px;">
        Filtrar
      </button>

      <button type="button" id="btnNovoPedido" class="btn btn-secondary" style="padding: 10px 20px; margin-left: auto;">
        + Novo Pedido
      </button>
    </div>

    <div id="tabelaPedidosCat" class="catalogacao-tabela">
      <p style="text-align: center; padding: 40px; color: #666;">Carregando...</p>
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
      <div style="text-align: center; padding: 40px; color: #C53030;">
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
    const pedido = state.pedidos.find((p) => p.id == id);

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
        const token = localStorage.getItem('singem_token') || sessionStorage.getItem('singem_token');
        await fetch(`${API_BASE}/api/catalogacao-pedidos/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
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

  // Escuta novo pedido criado
  document.addEventListener('catalogacao:novo-pedido', async () => {
    await carregarPedidos();
    renderTabela(tabelaContainer);
  });
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
  atualizarStatusPedido
};
