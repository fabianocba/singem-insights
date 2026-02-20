/**
 * Módulo de Validação de Entrada - SINGEM
 * Valida e sanitiza dados de formulários antes do processamento
 */

export class InputValidator {
  /**
   * Valida dados de empenho
   * @param {Object} empenho - Dados do empenho a validar
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validateEmpenho(empenho) {
    const errors = [];

    // Validar número do empenho
    if (!empenho.numero || !/^\d{1,10}$/.test(empenho.numero)) {
      errors.push('Número do empenho inválido (deve conter apenas dígitos)');
    }

    // Validar data
    if (!empenho.data || !this.isValidDate(empenho.data)) {
      errors.push('Data do empenho inválida');
    }

    // Validar fornecedor
    if (!empenho.fornecedor || empenho.fornecedor.trim().length < 3) {
      errors.push('Nome do fornecedor deve ter pelo menos 3 caracteres');
    }

    // Validar CNPJ
    if (!empenho.cnpjFornecedor || !this.isValidCNPJ(empenho.cnpjFornecedor)) {
      errors.push('CNPJ do fornecedor inválido');
    }

    // Validar valor total
    if (!empenho.valorTotal || empenho.valorTotal <= 0) {
      errors.push('Valor total deve ser maior que zero');
    }

    // Validar itens
    if (!empenho.itens || !Array.isArray(empenho.itens) || empenho.itens.length === 0) {
      errors.push('Empenho deve ter pelo menos um item');
    } else {
      empenho.itens.forEach((item, index) => {
        const itemErrors = this.validateItem(item, index + 1);
        errors.push(...itemErrors);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida dados de nota fiscal
   * @param {Object} nf - Dados da nota fiscal
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validateNotaFiscal(nf) {
    const errors = [];

    // Validar número
    if (!nf.numero || nf.numero.trim().length === 0) {
      errors.push('Número da nota fiscal é obrigatório');
    }

    // Validar data
    if (!nf.dataNotaFiscal || !this.isValidDate(nf.dataNotaFiscal)) {
      errors.push('Data da nota fiscal inválida');
    }

    // Validar CNPJs
    if (!nf.cnpjEmitente || !this.isValidCNPJ(nf.cnpjEmitente)) {
      errors.push('CNPJ do emitente inválido');
    }

    if (!nf.cnpjDestinatario || !this.isValidCNPJ(nf.cnpjDestinatario)) {
      errors.push('CNPJ do destinatário inválido');
    }

    // Validar valor total
    if (!nf.valorTotal || nf.valorTotal <= 0) {
      errors.push('Valor total deve ser maior que zero');
    }

    // Validar itens
    if (!nf.itens || !Array.isArray(nf.itens) || nf.itens.length === 0) {
      errors.push('Nota fiscal deve ter pelo menos um item');
    } else {
      nf.itens.forEach((item, index) => {
        const itemErrors = this.validateItem(item, index + 1);
        errors.push(...itemErrors);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida item de empenho/nota fiscal
   * @param {Object} item - Item a validar
   * @param {number} index - Índice do item
   * @returns {string[]} Lista de erros
   */
  static validateItem(item, index) {
    const errors = [];
    const prefix = `Item ${index}:`;

    if (!item.descricao || item.descricao.trim().length < 3) {
      errors.push(`${prefix} Descrição deve ter pelo menos 3 caracteres`);
    }

    if (!item.quantidade || item.quantidade <= 0) {
      errors.push(`${prefix} Quantidade deve ser maior que zero`);
    }

    if (!item.valorUnitario || item.valorUnitario <= 0) {
      errors.push(`${prefix} Valor unitário deve ser maior que zero`);
    }

    if (!item.valorTotal || item.valorTotal <= 0) {
      errors.push(`${prefix} Valor total deve ser maior que zero`);
    }

    // Validar consistência: quantidade * valorUnitario ≈ valorTotal
    const calculado = item.quantidade * item.valorUnitario;
    const diferenca = Math.abs(calculado - item.valorTotal);
    if (diferenca > 0.02) {
      // Tolerância de 2 centavos
      errors.push(`${prefix} Valor total inconsistente com quantidade × valor unitário`);
    }

    return errors;
  }

  /**
   * Valida se uma string é uma data válida
   * @param {string} dateString - String de data
   * @returns {boolean}
   */
  static isValidDate(dateString) {
    if (!dateString) {
      return false;
    }

    // Aceitar formatos: YYYY-MM-DD, DD/MM/YYYY
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Tentar formato brasileiro DD/MM/YYYY
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const brDate = new Date(`${year}-${month}-${day}`);
        return !isNaN(brDate.getTime());
      }
      return false;
    }

    return true;
  }

  /**
   * Valida CNPJ
   * @param {string} cnpj - CNPJ a validar
   * @returns {boolean}
   */
  static isValidCNPJ(cnpj) {
    if (!cnpj) {
      return false;
    }

    // Remove formatação
    cnpj = cnpj.replace(/\D/g, '');

    // Valida tamanho
    if (cnpj.length !== 14) {
      return false;
    }

    // Valida se não são todos dígitos iguais
    if (/^(\d)\1+$/.test(cnpj)) {
      return false;
    }

    // Validação dos dígitos verificadores
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
   * Sanitiza string removendo caracteres perigosos
   * @param {string} str - String a sanitizar
   * @returns {string}
   */
  static sanitizeString(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }

    // Remove tags HTML
    str = str.replace(/<[^>]*>/g, '');

    // Remove caracteres de controle
    // eslint-disable-next-line no-control-regex
    str = str.replace(/[\x00-\x1F\x7F]/g, '');

    // Trim
    return str.trim();
  }

  /**
   * Valida e sanitiza número
   * @param {*} value - Valor a validar
   * @returns {number|null}
   */
  static sanitizeNumber(value) {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Valida arquivo PDF
   * @param {File} file - Arquivo a validar
   * @returns {Object} { valid: boolean, error: string }
   */
  static validatePDFFile(file) {
    if (!file) {
      return { valid: false, error: 'Nenhum arquivo selecionado' };
    }

    // Validar tipo
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'Arquivo deve ser PDF' };
    }

    // Validar tamanho (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'Arquivo muito grande (máximo 50MB)' };
    }

    // Validar tamanho mínimo (1KB)
    if (file.size < 1024) {
      return { valid: false, error: 'Arquivo muito pequeno (mínimo 1KB)' };
    }

    return { valid: true };
  }

  /**
   * Valida credenciais de login
   * @param {string} login - Login do usuário
   * @param {string} senha - Senha do usuário
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validateCredentials(login, senha) {
    const errors = [];

    if (!login || login.trim().length < 3) {
      errors.push('Login deve ter pelo menos 3 caracteres');
    }

    if (!senha || senha.length < 4) {
      errors.push('Senha deve ter pelo menos 4 caracteres');
    }

    // Validar caracteres permitidos no login (alfanuméricos + . _ -)
    if (login && !/^[a-zA-Z0-9._-]+$/.test(login)) {
      errors.push('Login contém caracteres inválidos');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

console.log('[InputValidator] Módulo de validação de entrada carregado');

export default InputValidator;
