/**
 * Formatadores de exibição usados pela casca principal do app.
 */

/**
 * Formata CNPJ durante digitação (event handler)
 * @param {Event} e
 */
export function formatarCNPJInput(e) {
  let value = e.target.value.replace(/\D/g, '');
  value = value.replace(/^(\d{2})(\d)/, '$1.$2');
  value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
  value = value.replace(/(\d{4})(\d)/, '$1-$2');
  e.target.value = value;
}

/**
 * Formata número para exibição em pt-BR
 * @param {*} valor
 * @returns {string}
 */
export function formatarNumero(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '-';
  }

  const num = parseFloat(valor);
  if (isNaN(num)) {
    return '-';
  }

  if (Number.isInteger(num)) {
    return num.toLocaleString('pt-BR');
  }

  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
}
