export const TIPOS_RELATORIO = {
  todos: {
    titulo: '📋 Todos os Empenhos',
    descricao: 'Lista completa de empenhos cadastrados',
    filtro: () => true
  },
  ano: {
    titulo: '📅 Empenhos por Ano',
    descricao: 'Empenhos filtrados pelo ano selecionado',
    filtro: (emp, filtros) => !filtros.ano || emp.ano === filtros.ano
  },
  'com-saldo': {
    titulo: '💰 Empenhos com Saldo',
    descricao: 'Empenhos que ainda possuem saldo disponível',
    filtro: (emp) => {
      const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
      const valorUtilizado = emp.valorUtilizado ?? 0;
      return valorEmpenho - valorUtilizado > 0;
    }
  },
  'sem-saldo': {
    titulo: '🔴 Empenhos Sem Saldo',
    descricao: 'Empenhos totalmente utilizados ou com saldo zerado',
    filtro: (emp) => {
      const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
      const valorUtilizado = emp.valorUtilizado ?? 0;
      return valorEmpenho - valorUtilizado <= 0;
    }
  },
  rascunho: {
    titulo: '📝 Em Fase de Cadastro',
    descricao: 'Empenhos ainda em fase de cadastro (rascunho)',
    filtro: (emp) => emp.statusValidacao === 'rascunho' || !emp.statusValidacao
  },
  validado: {
    titulo: '✅ Empenhos Validados',
    descricao: 'Empenhos validados e prontos para uso',
    filtro: (emp) => emp.statusValidacao === 'validado'
  }
};

export const estadoRelatorio = {
  tipoAtual: 'todos',
  empenhos: [],
  empenhosComSaldo: [],
  filtros: {
    ano: '',
    busca: ''
  },
  ordenacao: 'recente'
};

export function buildRelatorioSearchKey(emp) {
  return [
    String(emp.ano || ''),
    String(emp.numero || ''),
    String(emp.fornecedor || ''),
    String(emp.processoSuap || emp.processo || ''),
    String(emp.cnpjDigits || emp.cnpjFornecedor || '')
  ]
    .join(' ')
    .toLowerCase();
}

export const DEBUG_REL_EMP = false;
