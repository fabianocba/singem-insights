import { TIPOS_RELATORIO, estadoRelatorio, buildRelatorioSearchKey } from './state.js';

export function ordenarEmpenhos(empenhos) {
  const ordenacao = estadoRelatorio.ordenacao;

  const comparadores = {
    recente: (a, b) => new Date(b.dataEmpenho || b.dataCriacao || 0) - new Date(a.dataEmpenho || a.dataCriacao || 0),
    antigo: (a, b) => new Date(a.dataEmpenho || a.dataCriacao || 0) - new Date(b.dataEmpenho || b.dataCriacao || 0),
    numero: (a, b) => {
      const anoA = parseInt(a.ano, 10) || 0;
      const anoB = parseInt(b.ano, 10) || 0;
      if (anoB !== anoA) {
        return anoB - anoA;
      }
      return (parseInt(b.numero, 10) || 0) - (parseInt(a.numero, 10) || 0);
    },
    'valor-desc': (a, b) => (b.valorTotalEmpenho ?? b.valorTotal ?? 0) - (a.valorTotalEmpenho ?? a.valorTotal ?? 0),
    'valor-asc': (a, b) => (a.valorTotalEmpenho ?? a.valorTotal ?? 0) - (b.valorTotalEmpenho ?? b.valorTotal ?? 0),
    'saldo-desc': (a, b) => (b.saldoDisponivel ?? 0) - (a.saldoDisponivel ?? 0),
    'saldo-asc': (a, b) => (a.saldoDisponivel ?? 0) - (b.saldoDisponivel ?? 0)
  };

  const comparar = comparadores[ordenacao] || (() => 0);

  return [...empenhos].sort((a, b) => comparar(a, b));
}

export function filtrarEmpenhos() {
  const config = TIPOS_RELATORIO[estadoRelatorio.tipoAtual];
  if (!config) {
    return estadoRelatorio.empenhosComSaldo;
  }

  let resultado = estadoRelatorio.empenhosComSaldo.filter((emp) => config.filtro(emp, estadoRelatorio.filtros));

  if (estadoRelatorio.filtros.ano) {
    resultado = resultado.filter((emp) => String(emp.ano) === String(estadoRelatorio.filtros.ano));
  }

  if (estadoRelatorio.filtros.busca) {
    const termo = estadoRelatorio.filtros.busca;
    resultado = resultado.filter((emp) => {
      const searchKey = emp.searchKey || buildRelatorioSearchKey(emp);
      return searchKey.includes(termo);
    });
  }

  return ordenarEmpenhos(resultado);
}
