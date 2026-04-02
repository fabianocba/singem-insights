import { estadoRelatorio, buildRelatorioSearchKey } from './state.js';

export async function carregarAnosDisponiveis() {
  try {
    const empenhos = estadoRelatorio.empenhos.length
      ? estadoRelatorio.empenhos
      : await window.dbManager.buscarEmpenhos(true);
    const anos = [...new Set(empenhos.map((e) => e.ano).filter(Boolean))].sort((a, b) => b - a);

    const selectAno = document.getElementById('filtroAnoRelatorio');
    if (selectAno) {
      selectAno.innerHTML = '<option value="">Todos os anos</option>';
      anos.forEach((ano) => {
        selectAno.innerHTML += `<option value="${ano}">${ano}</option>`;
      });
    }
  } catch (error) {
    console.error('[Relatórios] Erro ao carregar anos:', error);
  }
}

export async function calcularSaldosEmpenhos(empenhos) {
  const empenhosComSaldo = [];

  for (const emp of empenhos) {
    const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
    let valorUtilizado = 0;

    if (emp.id && window.dbManager?.buscarNotasFiscaisPorEmpenho) {
      try {
        const nfs = await window.dbManager.buscarNotasFiscaisPorEmpenho(emp.id);
        valorUtilizado = (nfs || []).reduce((acc, nf) => acc + (nf.valorTotal || 0), 0);
      } catch {
        // Ignorar erros de NFs para manter a listagem resiliente.
      }
    }

    const saldoDisponivel = valorEmpenho - valorUtilizado;
    const percentualUtilizado = valorEmpenho > 0 ? (valorUtilizado / valorEmpenho) * 100 : 0;

    empenhosComSaldo.push({
      ...emp,
      valorUtilizado,
      saldoDisponivel,
      percentualUtilizado,
      searchKey: emp.searchKey || buildRelatorioSearchKey(emp)
    });
  }

  return empenhosComSaldo;
}
