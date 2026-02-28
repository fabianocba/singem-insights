import repository from '../../../core/repository.js';

export async function salvarNotaFiscal(notaFiscal) {
  return repository.saveNotaFiscal(notaFiscal);
}

export async function buscarEmpenhoPorId(empenhoId) {
  return window.dbManager.buscarEmpenhoPorId(parseInt(empenhoId, 10));
}

export async function compararComEmpenho(notaFiscal, empenhoId) {
  return window.dbManager.compararNotaFiscalComEmpenho(notaFiscal, parseInt(empenhoId, 10));
}
