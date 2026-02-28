import { toLowerSafe } from '../../../shared/lib/format.js';

export function filtrarEmpenhosCadastro(empenhos, termoBusca, anoFiltro) {
  let filtrados = [...(empenhos || [])];

  if (anoFiltro) {
    filtrados = filtrados.filter((e) => String(e.ano) === String(anoFiltro));
  }

  if (termoBusca) {
    const termo = toLowerSafe(termoBusca);
    filtrados = filtrados.filter((e) => {
      const processo = e.processoSuap || e.codigoReferencia || e.processoNumero || e.processo || '';
      const texto = `${e.ano} ${e.numero} ${e.fornecedor || ''} ${processo}`.toLowerCase();
      return texto.includes(termo);
    });
  }

  return filtrados;
}

export function anosEmpenhos(empenhos) {
  const anos = [...new Set((empenhos || []).map((e) => e.ano || new Date(e.dataCriacao).getFullYear()))];
  return anos.sort((a, b) => b - a);
}
