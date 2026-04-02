export function formatarCNPJ(cnpj) {
  if (typeof cnpj !== 'string') {
    return cnpj;
  }

  const numerosCNPJ = cnpj.replace(/\D/g, '');
  if (numerosCNPJ.length === 14) {
    return numerosCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  return cnpj;
}

export function converterMoedaParaNumero(valor) {
  if (typeof valor === 'number') {
    return valor;
  }

  return (
    parseFloat(
      valor
        .toString()
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0
  );
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}
