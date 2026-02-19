/**
 * @fileoverview Utilitários de formatação de valores
 * Formata números, moedas e datas no padrão brasileiro
 */

/**
 * Formata número para moeda brasileira (R$ 1.234,56)
 * @param {number} valor - Valor numérico
 * @param {boolean} comSimbolo - Se deve incluir "R$" (padrão: true)
 * @returns {string} Valor formatado
 */
export function formatarMoeda(valor, comSimbolo = true) {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return comSimbolo ? 'R$ 0,00' : '0,00';
  }

  const valorNumerico = typeof valor === 'string' ? parseFloat(valor) : valor;

  if (comSimbolo) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valorNumerico);
  }

  // Sem símbolo: retorna apenas o número formatado
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valorNumerico);
}

/**
 * Formata número decimal com separadores brasileiros (1.234,56)
 * @param {number} valor - Valor numérico
 * @param {number} casasDecimais - Número de casas decimais (padrão: 2)
 * @returns {string} Valor formatado
 */
export function formatarNumero(valor, casasDecimais = 2) {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return '0,00';
  }

  const valorNumerico = typeof valor === 'string' ? parseFloat(valor) : valor;

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais
  }).format(valorNumerico);
}

/**
 * Converte string de moeda brasileira para número
 * Aceita: "R$ 1.234,56", "1.234,56", "1234,56", "1234.56"
 * @param {string} valorStr - String de moeda
 * @returns {number} Valor numérico
 */
export function converterMoedaParaNumero(valorStr) {
  if (!valorStr || typeof valorStr !== 'string') {
    return 0;
  }

  // Remove "R$", espaços e pontos (separador de milhar)
  let valor = valorStr
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .trim();

  // Substitui vírgula por ponto (separador decimal)
  valor = valor.replace(',', '.');

  const numero = parseFloat(valor);
  return isNaN(numero) ? 0 : numero;
}

/**
 * Formata input de moeda para exibição (usado em inputs type="text")
 * @param {HTMLInputElement} input - Elemento input
 */
export function formatarInputMoeda(input) {
  let valor = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito

  if (valor === '') {
    input.value = '';
    return;
  }

  valor = parseInt(valor, 10);

  // Converte para formato de moeda
  const valorFormatado = (valor / 100).toFixed(2);
  input.value = formatarNumero(parseFloat(valorFormatado));
}

/**
 * Configura input para aceitar apenas moeda brasileira
 * @param {HTMLInputElement} input - Elemento input
 * @param {Function} onChange - Callback opcional chamado quando o valor muda
 */
export function configurarInputMoeda(input, onChange = null) {
  input.addEventListener('input', () => {
    formatarInputMoeda(input);
    if (onChange) {
      onChange(converterMoedaParaNumero(input.value));
    }
  });

  input.addEventListener('blur', () => {
    if (input.value) {
      const numero = converterMoedaParaNumero(input.value);
      input.value = formatarNumero(numero);
    }
  });
}

/**
 * Formata data para padrão brasileiro (DD/MM/AAAA)
 * @param {Date|string} data - Data a formatar
 * @returns {string} Data formatada
 */
export function formatarData(data) {
  if (!data) {
    return '';
  }

  const dataObj = data instanceof Date ? data : new Date(data);

  if (isNaN(dataObj.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR').format(dataObj);
}

/**
 * Formata data e hora para padrão brasileiro (DD/MM/AAAA HH:mm)
 * @param {Date|string} data - Data a formatar
 * @returns {string} Data e hora formatadas
 */
export function formatarDataHora(data) {
  if (!data) {
    return '';
  }

  const dataObj = data instanceof Date ? data : new Date(data);

  if (isNaN(dataObj.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dataObj);
}

/**
 * Formata CNPJ (00.000.000/0000-00)
 * @param {string} cnpj - CNPJ sem formatação
 * @returns {string} CNPJ formatado
 */
export function formatarCNPJ(cnpj) {
  if (!cnpj) {
    return '';
  }

  const numeros = cnpj.replace(/\D/g, '');

  if (numeros.length !== 14) {
    return cnpj;
  }

  return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata CPF (000.000.000-00)
 * @param {string} cpf - CPF sem formatação
 * @returns {string} CPF formatado
 */
export function formatarCPF(cpf) {
  if (!cpf) {
    return '';
  }

  const numeros = cpf.replace(/\D/g, '');

  if (numeros.length !== 11) {
    return cpf;
  }

  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Expõe globalmente para uso em HTML inline e console
if (typeof window !== 'undefined') {
  window.formatarMoeda = formatarMoeda;
  window.formatarNumero = formatarNumero;
  window.converterMoedaParaNumero = converterMoedaParaNumero;
  window.formatarData = formatarData;
  window.formatarDataHora = formatarDataHora;
  window.formatarCNPJ = formatarCNPJ;
  window.formatarCPF = formatarCPF;
}
