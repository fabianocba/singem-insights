/**
 * Validators - Validação de campos obrigatórios
 * Previne salvamento de dados incompletos
 */

/**
 * Verifica se um valor é vazio
 * @param {*} value - Valor a verificar
 * @returns {boolean}
 */
function isEmpty(value) {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'number' && isNaN(value)) ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Valida campos obrigatórios em uma entidade
 * @param {Object} entity - Entidade a validar
 * @param {Array<string>} fields - Lista de campos obrigatórios
 * @throws {Error} Se algum campo obrigatório estiver vazio
 */
export function assertRequired(entity, fields) {
  const missing = [];

  for (const field of fields) {
    // Suporta campos aninhados com notação de ponto
    const keys = field.split('.');
    let value = entity;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    if (isEmpty(value)) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    const fieldList = missing.map((f) => `"${f}"`).join(', ');
    throw new Error(
      `❌ Campos obrigatórios faltando: ${fieldList}\n\n` +
        `Por favor, preencha todos os campos marcados com * antes de salvar.`
    );
  }
}

/**
 * Valida campos de um Empenho
 * @param {Object} empenho - Dados do empenho
 */
export function validateEmpenhoDraft(empenho) {
  assertRequired(empenho, ['numero', 'data', 'fornecedor', 'cnpjFornecedor', 'valorTotal']);

  // Para rascunho, itens são opcionais, mas se existirem precisam ser consistentes
  if (empenho.itens && empenho.itens.length > 0) {
    empenho.itens.forEach((item, index) => {
      try {
        assertRequired(item, ['descricao', 'quantidade', 'valorUnitario', 'valorTotal']);
      } catch (err) {
        throw new Error(`❌ Item ${index + 1}: ${err.message}`);
      }

      if (item.quantidade <= 0) {
        throw new Error(`❌ Item ${index + 1}: quantidade deve ser maior que zero`);
      }
      if (item.valorUnitario < 0) {
        throw new Error(`❌ Item ${index + 1}: valor unitário não pode ser negativo`);
      }
      if (item.valorTotal <= 0) {
        throw new Error(`❌ Item ${index + 1}: valor total deve ser maior que zero`);
      }
    });
  }
}

export function validateEmpenhoCompleto(empenho) {
  assertRequired(empenho, ['numero', 'data', 'fornecedor', 'cnpjFornecedor', 'valorTotal']);

  if (!empenho.itens || empenho.itens.length === 0) {
    throw new Error('❌ O empenho deve ter pelo menos um item cadastrado.');
  }

  empenho.itens.forEach((item, index) => {
    try {
      assertRequired(item, ['descricao', 'quantidade', 'valorUnitario', 'valorTotal']);
    } catch (err) {
      throw new Error(`❌ Item ${index + 1}: ${err.message}`);
    }

    if (item.quantidade <= 0) {
      throw new Error(`❌ Item ${index + 1}: quantidade deve ser maior que zero`);
    }
    if (item.valorUnitario < 0) {
      throw new Error(`❌ Item ${index + 1}: valor unitário não pode ser negativo`);
    }
    if (item.valorTotal <= 0) {
      throw new Error(`❌ Item ${index + 1}: valor total deve ser maior que zero`);
    }
  });
}

export function validateEmpenho(empenho, { modo = 'completo' } = {}) {
  if (modo === 'rascunho') {
    return validateEmpenhoDraft(empenho);
  }
  return validateEmpenhoCompleto(empenho);
}

/**
 * Valida campos de uma Nota Fiscal
 * @param {Object} notaFiscal - Dados da nota fiscal
 */
export function validateNotaFiscal(notaFiscal) {
  // Aceita cnpjFornecedor OU cnpjEmitente (compatibilidade)
  const cnpjEmitente = notaFiscal.cnpjEmitente || notaFiscal.cnpjFornecedor;
  const cnpjDestinatario = notaFiscal.cnpjDestinatario;

  assertRequired({ ...notaFiscal, cnpjEmitente, cnpjDestinatario }, [
    'numero',
    'dataNotaFiscal',
    'cnpjEmitente',
    'cnpjDestinatario',
    'valorTotal'
  ]);

  // Validar itens
  if (!notaFiscal.itens || notaFiscal.itens.length === 0) {
    throw new Error('❌ A nota fiscal deve ter pelo menos um item cadastrado.');
  }

  // Validar cada item
  notaFiscal.itens.forEach((item, index) => {
    try {
      assertRequired(item, ['descricao', 'quantidade', 'valorUnitario', 'valorTotal']);
    } catch (err) {
      throw new Error(`❌ Item ${index + 1}: ${err.message}`);
    }
  });
}

console.log('[Validators] Sistema de validação inicializado');
