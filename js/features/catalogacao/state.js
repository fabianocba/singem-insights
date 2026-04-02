export const state = {
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
