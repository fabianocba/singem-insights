/**
 * IFDESK - Validadores Utilitários
 * @module utils/validate
 *
 * Funções de validação reutilizáveis.
 * NÃO substitui validações existentes - apenas adiciona helpers novos.
 */

// @ts-check

/**
 * Valida CNPJ
 * @param {string} cnpj - CNPJ a validar
 * @returns {boolean} True se válido
 */
export function validateCNPJ(cnpj) {
  if (!cnpj) {
    return false;
  }

  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/[^\d]/g, '');

  if (cnpj.length !== 14) {
    return false;
  }

  // Elimina CNPJs inválidos conhecidos
  if (/^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  // Valida DVs
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);

  if (resultado !== parseInt(digitos.charAt(0))) {
    return false;
  }

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);

  return resultado === parseInt(digitos.charAt(1));
}

/**
 * Valida CPF
 * @param {string} cpf - CPF a validar
 * @returns {boolean} True se válido
 */
export function validateCPF(cpf) {
  if (!cpf) {
    return false;
  }

  cpf = cpf.replace(/[^\d]/g, '');

  if (cpf.length !== 11) {
    return false;
  }

  // Elimina CPFs inválidos conhecidos
  if (/^(\d)\1+$/.test(cpf)) {
    return false;
  }

  // Valida 1º dígito
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  const digito1 = resto === 10 || resto === 11 ? 0 : resto;

  if (digito1 !== parseInt(cpf.charAt(9))) {
    return false;
  }

  // Valida 2º dígito
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  const digito2 = resto === 10 || resto === 11 ? 0 : resto;

  return digito2 === parseInt(cpf.charAt(10));
}

/**
 * Verifica se string é data ISO válida
 * @param {string} str - String a verificar
 * @returns {boolean} True se for data ISO válida
 */
export function isISODate(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }

  const date = new Date(str);
  return !isNaN(date.getTime()) && str.includes('-');
}

/**
 * Converte string brasileira para número
 * @param {string} str - String no formato brasileiro (1.234,56)
 * @returns {number|null} Número ou null se inválido
 */
export function asNumberBR(str) {
  if (!str || typeof str !== 'string') {
    return null;
  }

  try {
    // Remove pontos e substitui vírgula por ponto
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleaned);
    return isNaN(number) ? null : number;
  } catch {
    return null;
  }
}

/**
 * Formata número como moeda brasileira
 * @param {number} value - Valor numérico
 * @param {boolean} [includeSymbol=true] - Se deve incluir R$
 * @returns {string} Valor formatado
 */
export function asMoney(value, includeSymbol = true) {
  if (typeof value !== 'number' || isNaN(value)) {
    return includeSymbol ? 'R$ 0,00' : '0,00';
  }

  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return includeSymbol ? `R$ ${formatted}` : formatted;
}

/**
 * Valida email
 * @param {string} email - Email a validar
 * @returns {boolean} True se válido
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 simplificado
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida URL
 * @param {string} url - URL a validar
 * @returns {boolean} True se válida
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida se string está vazia ou apenas whitespace
 * @param {string} str - String a verificar
 * @returns {boolean} True se vazia
 */
export function isEmpty(str) {
  return !str || typeof str !== 'string' || str.trim().length === 0;
}

/**
 * Valida se valor está entre min e max
 * @param {number} value - Valor a verificar
 * @param {number} min - Mínimo
 * @param {number} max - Máximo
 * @returns {boolean} True se está no range
 */
export function inRange(value, min, max) {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Normaliza CNPJ (remove formatação)
 * @param {string} cnpj - CNPJ formatado
 * @returns {string} CNPJ apenas números
 */
export function normalizeCNPJ(cnpj) {
  return cnpj ? cnpj.replace(/[^\d]/g, '') : '';
}

/**
 * Formata CNPJ
 * @param {string} cnpj - CNPJ sem formatação
 * @returns {string} CNPJ formatado (XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(cnpj) {
  cnpj = normalizeCNPJ(cnpj);

  if (cnpj.length !== 14) {
    return cnpj;
  }

  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Normaliza CPF (remove formatação)
 * @param {string} cpf - CPF formatado
 * @returns {string} CPF apenas números
 */
export function normalizeCPF(cpf) {
  return cpf ? cpf.replace(/[^\d]/g, '') : '';
}

/**
 * Formata CPF
 * @param {string} cpf - CPF sem formatação
 * @returns {string} CPF formatado (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf) {
  cpf = normalizeCPF(cpf);

  if (cpf.length !== 11) {
    return cpf;
  }

  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

console.info('✅ Módulo de validação carregado');
