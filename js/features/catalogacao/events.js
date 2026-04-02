import { showLoading, hideLoading, notifySuccess, notifyError } from '../../ui/feedback.js';
import { on as onEventBus, off as offEventBus } from '../../core/eventBus.js';
import { state } from './state.js';
import { carregarPedidos, atualizarStatusPedido, excluirPedido } from './api.js';
import { abrirModalDetalhes, renderTabela } from './render.js';

export function bindEventos(container, tabelaContainer) {
  container.querySelector('#filtroStatusCat')?.addEventListener('change', (e) => {
    state.filtros.status = e.target.value;
  });

  container.querySelector('#filtroTermoCat')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      state.filtros.q = e.target.value;
      state.paginacao.pagina = 1;
      carregarPedidos().then(() => renderTabela(tabelaContainer));
    }
  });

  container.querySelector('#btnBuscarCat')?.addEventListener('click', () => {
    state.filtros.q = container.querySelector('#filtroTermoCat')?.value || '';
    state.paginacao.pagina = 1;
    carregarPedidos().then(() => renderTabela(tabelaContainer));
  });

  container.querySelector('#btnNovoPedido')?.addEventListener('click', () => {
    if (window.CatmatIntegration) {
      window.CatmatIntegration.abrirModalPedidoCatalogacao();
    }
  });

  tabelaContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) {
      return;
    }

    const id = btn.dataset.id;
    const pedido = state.pedidos.find((item) => String(item.id) === String(id));

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
      } catch (error) {
        hideLoading();
        notifyError(error.message);
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
      } catch (error) {
        hideLoading();
        notifyError(error.message);
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
      } catch (error) {
        hideLoading();
        notifyError(error.message);
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
      } catch (error) {
        hideLoading();
        notifyError(error.message);
      }
    }
  });

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
