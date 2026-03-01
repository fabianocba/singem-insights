function normalizarCnpj(valor) {
  return String(valor || '').replace(/\D/g, '');
}

export async function listarFornecedores() {
  if (typeof window.dbManager?.buscarFornecedores === 'function') {
    return window.dbManager.buscarFornecedores();
  }

  return [];
}

export async function buscarFornecedorPorCnpj(cnpj) {
  const cnpjNormalizado = normalizarCnpj(cnpj);
  if (cnpjNormalizado.length !== 14) {
    return null;
  }

  const fornecedores = await listarFornecedores();
  return fornecedores.find((item) => normalizarCnpj(item.cnpj) === cnpjNormalizado) || null;
}
