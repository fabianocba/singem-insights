import { httpRequest } from '../../shared/lib/http.js';
import { state } from './state.js';

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
  } catch (error) {
    console.error('[Catalogação] Erro ao carregar:', error);
    throw error;
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
