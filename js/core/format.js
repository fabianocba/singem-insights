/**
 * @fileoverview Funções utilitárias de formatação para dados brasileiros
 * @module core/format
 * @version 1.0.0
 *
 * REGRAS:
 * - Banco de dados: armazenar SEMPRE em formato "limpo" (dígitos, Number)
 * - Interface: exibir SEMPRE formatado (pt-BR)
 */

/**
 * Remove tudo que não é dígito de uma string
 * @param {string} str - String de entrada
 * @returns {string} Apenas dígitos
 */
export function onlyDigits(str) {
  if (!str) {
    return '';
  }
  return String(str).replace(/\D/g, '');
}

/**
 * Formata CNPJ para exibição
 * @param {string} digits - 14 dígitos do CNPJ
 * @returns {string} CNPJ formatado (XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(digits) {
  const d = onlyDigits(digits);
  if (d.length !== 14) {
    return d;
  } // Retorna sem formatar se inválido

  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Formata telefone para exibição
 * @param {string} digits - 10 ou 11 dígitos do telefone
 * @returns {string} Telefone formatado
 *   - 10 dígitos: (XX) XXXX-XXXX
 *   - 11 dígitos: (XX) 9XXXX-XXXX
 */
export function formatPhone(digits) {
  const d = onlyDigits(digits);

  if (d.length === 10) {
    // Fixo: (77) 3456-7890
    return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  if (d.length === 11) {
    // Celular: (77) 99876-5432
    return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  return d; // Retorna sem formatar se tamanho inválido
}

/**
 * Converte string pt-BR para Number
 * @param {string} str - Valor em formato brasileiro (ex: "238.294,40")
 * @returns {number} Valor numérico (ex: 238294.40)
 */
export function parseMoneyBR(str) {
  if (typeof str === 'number') {
    return str;
  }
  if (!str) {
    return 0;
  }

  // Remove tudo exceto dígitos, vírgula e ponto
  let cleaned = String(str).trim();

  // Detecta formato: se tem vírgula como decimal (pt-BR)
  if (cleaned.includes(',')) {
    // Remove pontos de milhar, troca vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formata número para exibição em pt-BR
 * @param {number} value - Valor numérico
 * @param {number} [decimals=2] - Casas decimais
 * @returns {string} Valor formatado (ex: "238.294,40")
 */
export function formatMoneyBR(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    value = 0;
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formata valor como moeda brasileira (com R$)
 * @param {number} value - Valor numérico
 * @returns {string} Valor formatado (ex: "R$ 238.294,40")
 */
export function formatCurrencyBR(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    value = 0;
  }

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

/**
 * Detecta se uma string parece ser um "código de referência"
 * Padrão: XXXXX.XXXXXX.XXXX-XX (com pontos e hífen)
 * @param {string} str - String para verificar
 * @returns {boolean} true se parece ser código de referência
 */
export function isCodigoReferencia(str) {
  if (!str) {
    return false;
  }
  // Padrão: 5 dígitos.6 dígitos.4 dígitos-2 dígitos
  const pattern = /^\d{5}\.\d{6}\.\d{4}-\d{2}$/;
  return pattern.test(str.trim());
}

/**
 * Valida formato de processo SUAP (validação leve)
 * Aceita: 23000.000000/2024-00 ou 23327.250285.2024-98
 * @param {string} str - String para verificar
 * @returns {boolean} true se formato válido
 */
export function isProcessoSuapValido(str) {
  if (!str) {
    return false;
  }
  const valor = String(str).trim();
  // Aceita tanto formato com / quanto com . como separador do ano
  // 23000.000000/2024-00 ou 23327.250285.2024-98
  const pattern = /^\d{5}\.\d{6}[/.]\d{4}-\d{2}$/;
  return pattern.test(valor);
}

/**
 * Constrói URL de consulta do processo no SUAP
 * @param {string} processo - Número do processo
 * @returns {string} URL completa para consulta
 */
export function buildSuapProcessUrl(processo) {
  const base = 'https://suap.ifbaiano.edu.br/admin/processo_eletronico/processo/';
  const p = (processo || '').trim();
  if (!p) {
    return base;
  }
  return `${base}?q=${encodeURIComponent(p)}`;
}

/**
 * Migra dados antigos de processo para processoSuap
 * Prioridade: processoSuap > codigoReferencia > processoNumero > processo
 * @param {object} empenho - Objeto empenho com campos antigos
 * @returns {string} Valor do processoSuap migrado
 */
export function migrarParaProcessoSuap(empenho) {
  if (!empenho) {
    return '';
  }
  // Prioridade: processoSuap já existente > codigoReferencia > processoNumero > processo antigo
  return empenho.processoSuap || empenho.codigoReferencia || empenho.processoNumero || empenho.processo || '';
}

/**
 * @deprecated Use migrarParaProcessoSuap() em vez disso
 * Migra campo "processo" antigo para os novos campos
 * @param {string} processoAntigo - Valor do campo processo antigo
 * @returns {{ processoNumero: string, codigoReferencia: string }}
 */
export function migrarProcesso(processoAntigo) {
  if (!processoAntigo) {
    return { processoNumero: '', codigoReferencia: '' };
  }

  const valor = String(processoAntigo).trim();

  if (isCodigoReferencia(valor)) {
    return { processoNumero: '', codigoReferencia: valor };
  }

  return { processoNumero: valor, codigoReferencia: '' };
}

/**
 * Aplica máscara de CNPJ durante digitação
 * @param {HTMLInputElement} input - Elemento input
 */
export function applyCNPJMask(input) {
  if (!input) {
    return;
  }

  input.addEventListener('input', (e) => {
    let value = onlyDigits(e.target.value);
    if (value.length > 14) {
      value = value.substring(0, 14);
    }

    // Aplica formatação progressiva
    if (value.length > 12) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    } else if (value.length > 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
    }

    e.target.value = value;
  });
}

/**
 * Aplica máscara de telefone durante digitação
 * @param {HTMLInputElement} input - Elemento input
 */
export function applyPhoneMask(input) {
  if (!input) {
    return;
  }

  input.addEventListener('input', (e) => {
    let value = onlyDigits(e.target.value);
    if (value.length > 11) {
      value = value.substring(0, 11);
    }

    // Aplica formatação progressiva
    if (value.length > 10) {
      // Celular: (XX) 9XXXX-XXXX
      value = value.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 6) {
      // Fixo: (XX) XXXX-XXXX
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (value.length > 0) {
      value = value.replace(/^(\d{0,2})/, '($1');
    }

    e.target.value = value;
  });
}

/**
 * Aplica máscara de valor monetário durante digitação
 * @param {HTMLInputElement} input - Elemento input
 */
export function applyMoneyMask(input) {
  if (!input) {
    return;
  }

  input.addEventListener('blur', (e) => {
    const value = parseMoneyBR(e.target.value);
    e.target.value = formatMoneyBR(value);
  });
}

/**
 * Abre o SUAP para consultar o processo digitado no formulário
 * Função global chamada pelo onclick do botão
 */
function consultarProcessoSuap() {
  const input = document.getElementById('processoSuapEmpenho');
  const processo = input?.value?.trim() || '';
  const url = buildSuapProcessUrl(processo);
  window.open(url, '_blank');
}

// Exportar objeto global para compatibilidade
window.FormatUtils = {
  onlyDigits,
  formatCNPJ,
  formatPhone,
  parseMoneyBR,
  formatMoneyBR,
  formatCurrencyBR,
  isCodigoReferencia,
  isProcessoSuapValido,
  buildSuapProcessUrl,
  migrarParaProcessoSuap,
  migrarProcesso,
  applyCNPJMask,
  applyPhoneMask,
  applyMoneyMask,
  consultarProcessoSuap
};

// Exportar função global para onclick do HTML
window.consultarProcessoSuap = consultarProcessoSuap;

export default {
  onlyDigits,
  formatCNPJ,
  formatPhone,
  parseMoneyBR,
  formatMoneyBR,
  formatCurrencyBR,
  isCodigoReferencia,
  isProcessoSuapValido,
  buildSuapProcessUrl,
  migrarParaProcessoSuap,
  migrarProcesso,
  applyCNPJMask,
  applyPhoneMask,
  applyMoneyMask,
  consultarProcessoSuap
};
