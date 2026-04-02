import { carregarPedidos, atualizarStatusPedido, excluirPedido } from './api.js';
import { bindEventos } from './events.js';
import { renderLayout, renderTabela } from './render.js';

export { carregarPedidos, atualizarStatusPedido, excluirPedido };

export function initTelaCatalogacao(containerId = 'catalogacaoPedidosContainer') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('[Catalogação] Container não encontrado:', containerId);
    return;
  }

  renderLayout(container);

  const tabelaContainer = container.querySelector('#tabelaPedidosCat');

  carregarPedidos()
    .then(() => {
      renderTabela(tabelaContainer);
      bindEventos(container, tabelaContainer);
    })
    .catch((error) => {
      tabelaContainer.innerHTML = `
      <div class="catalogacao-error-state">
        <p>Erro ao carregar pedidos: ${error.message}</p>
        <button type="button" class="btn btn-secondary" onclick="location.reload()">Tentar Novamente</button>
      </div>
    `;
    });
}

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
