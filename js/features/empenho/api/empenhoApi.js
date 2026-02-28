export async function listarEmpenhos(includeAll = true) {
  return window.dbManager.buscarEmpenhos(includeAll);
}

export async function excluirEmpenho(id) {
  return window.dbManager.deletarEmpenho(id);
}

export async function buscarEmpenhoPorId(id) {
  return window.dbManager.buscarEmpenhoPorId(id);
}
