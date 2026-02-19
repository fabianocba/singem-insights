/**
 * Validadores de NF-e
 * Funções de validação para chave de acesso, CPF/CNPJ, somatórios e estrutura
 *
 * @module NfeValidators
 */

/**
 * Valida dígito verificador de chave de acesso (módulo 11)
 * @param {string} chave - Chave de acesso (44 dígitos)
 * @returns {{valido: boolean, erro?: string}}
 */
function validarChaveAcesso(chave) {
  if (!chave || typeof chave !== 'string') {
    return { valido: false, erro: 'Chave de acesso não informada' };
  }

  const limpa = chave.replace(/\D/g, '');

  if (limpa.length !== 44) {
    return { valido: false, erro: `Chave deve ter 44 dígitos (tem ${limpa.length})` };
  }

  // Validação do dígito verificador (módulo 11)
  const base = limpa.substring(0, 43);
  const dvInformado = parseInt(limpa.charAt(43), 10);
  const dvCalculado = calcularDVChave(base);

  if (dvInformado !== dvCalculado) {
    return {
      valido: false,
      erro: `Dígito verificador inválido (informado: ${dvInformado}, calculado: ${dvCalculado})`
    };
  }

  return { valido: true };
}

/**
 * Calcula dígito verificador da chave de acesso (módulo 11)
 * @param {string} base - Primeiros 43 dígitos
 * @returns {number} Dígito verificador
 */
function calcularDVChave(base) {
  let peso = 2;
  let soma = 0;

  // Percorre da direita para esquerda
  for (let i = base.length - 1; i >= 0; i--) {
    soma += parseInt(base.charAt(i), 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Valida CPF (com dígitos verificadores)
 * @param {string} cpf - CPF (apenas dígitos ou formatado)
 * @returns {{valido: boolean, erro?: string}}
 */
function validarCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') {
    return { valido: false, erro: 'CPF não informado' };
  }

  const limpo = cpf.replace(/\D/g, '');

  if (limpo.length !== 11) {
    return { valido: false, erro: `CPF deve ter 11 dígitos (tem ${limpo.length})` };
  }

  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(limpo)) {
    return { valido: false, erro: 'CPF inválido (todos dígitos iguais)' };
  }

  // Validação do primeiro DV
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (10 - i);
  }
  let dv1 = (soma * 10) % 11;
  if (dv1 === 10) {
    dv1 = 0;
  }

  if (dv1 !== parseInt(limpo.charAt(9), 10)) {
    return { valido: false, erro: 'Primeiro dígito verificador do CPF inválido' };
  }

  // Validação do segundo DV
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (11 - i);
  }
  let dv2 = (soma * 10) % 11;
  if (dv2 === 10) {
    dv2 = 0;
  }

  if (dv2 !== parseInt(limpo.charAt(10), 10)) {
    return { valido: false, erro: 'Segundo dígito verificador do CPF inválido' };
  }

  return { valido: true };
}

/**
 * Valida CNPJ (com dígitos verificadores)
 * @param {string} cnpj - CNPJ (apenas dígitos ou formatado)
 * @returns {{valido: boolean, erro?: string}}
 */
function validarCNPJ(cnpj) {
  if (!cnpj || typeof cnpj !== 'string') {
    return { valido: false, erro: 'CNPJ não informado' };
  }

  const limpo = cnpj.replace(/\D/g, '');

  if (limpo.length !== 14) {
    return { valido: false, erro: `CNPJ deve ter 14 dígitos (tem ${limpo.length})` };
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(limpo)) {
    return { valido: false, erro: 'CNPJ inválido (todos dígitos iguais)' };
  }

  // Validação do primeiro DV
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(limpo.charAt(i), 10) * pesos1[i];
  }
  let dv1 = soma % 11;
  dv1 = dv1 < 2 ? 0 : 11 - dv1;

  if (dv1 !== parseInt(limpo.charAt(12), 10)) {
    return { valido: false, erro: 'Primeiro dígito verificador do CNPJ inválido' };
  }

  // Validação do segundo DV
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(limpo.charAt(i), 10) * pesos2[i];
  }
  let dv2 = soma % 11;
  dv2 = dv2 < 2 ? 0 : 11 - dv2;

  if (dv2 !== parseInt(limpo.charAt(13), 10)) {
    return { valido: false, erro: 'Segundo dígito verificador do CNPJ inválido' };
  }

  return { valido: true };
}

/**
 * Valida CPF ou CNPJ automaticamente pela quantidade de dígitos
 * @param {string} documento - CPF ou CNPJ
 * @returns {{valido: boolean, tipo?: 'CPF'|'CNPJ', erro?: string}}
 */
function validarCpfCnpj(documento) {
  if (!documento || typeof documento !== 'string') {
    return { valido: false, erro: 'Documento não informado' };
  }

  const limpo = documento.replace(/\D/g, '');

  if (limpo.length === 11) {
    const resultado = validarCPF(limpo);
    return { ...resultado, tipo: 'CPF' };
  }

  if (limpo.length === 14) {
    const resultado = validarCNPJ(limpo);
    return { ...resultado, tipo: 'CNPJ' };
  }

  return { valido: false, erro: `Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos (tem ${limpo.length})` };
}

/**
 * Valida somatório dos itens vs total informado
 * @param {number[]} valoresItens - Array com valores dos itens (vProd)
 * @param {number} totalInformado - Valor total informado (vProd do ICMSTot)
 * @param {number} tolerancia - Tolerância em reais (default: 0.05)
 * @returns {{valido: boolean, somaCalculada: number, diferenca: number, erro?: string}}
 */
function validarSomatorioItens(valoresItens, totalInformado, tolerancia = 0.05) {
  if (!Array.isArray(valoresItens)) {
    return { valido: false, somaCalculada: 0, diferenca: 0, erro: 'Lista de valores inválida' };
  }

  const somaCalculada = valoresItens.reduce((acc, val) => {
    const num = parseFloat(val) || 0;
    return acc + num;
  }, 0);

  // Arredonda para 2 casas decimais
  const somaArredondada = Math.round(somaCalculada * 100) / 100;
  const totalArredondado = Math.round((parseFloat(totalInformado) || 0) * 100) / 100;
  const diferenca = Math.abs(somaArredondada - totalArredondado);

  // Tolerância percentual adicional (0.5%)
  const toleranciaPercentual = totalArredondado * 0.005;
  const toleranciaFinal = Math.max(tolerancia, toleranciaPercentual);

  if (diferenca > toleranciaFinal) {
    return {
      valido: false,
      somaCalculada: somaArredondada,
      diferenca: Math.round(diferenca * 100) / 100,
      erro: `Soma dos itens (${somaArredondada.toFixed(2)}) difere do total (${totalArredondado.toFixed(2)}) em R$ ${diferenca.toFixed(2)}`
    };
  }

  return { valido: true, somaCalculada: somaArredondada, diferenca: 0 };
}

/**
 * Valida coerência do valor total da NF-e
 * vNF = vProd + vFrete + vSeg + vOutro - vDesc + vIPI + vST (aproximado)
 * @param {Object} totais - Objeto com valores dos totais
 * @param {number} tolerancia - Tolerância em reais
 * @returns {{valido: boolean, calculado: number, diferenca: number, erro?: string}}
 */
function validarValorTotalNF(totais, tolerancia = 0.1) {
  const vProd = parseFloat(totais.valorProdutos) || 0;
  const vFrete = parseFloat(totais.valorFrete) || 0;
  const vSeg = parseFloat(totais.valorSeguro) || 0;
  const vOutro = parseFloat(totais.valorOutros) || 0;
  const vDesc = parseFloat(totais.valorDesconto) || 0;
  const vIPI = parseFloat(totais.valorIPI) || 0;
  const vST = parseFloat(totais.valorST) || 0;
  const vNF = parseFloat(totais.valorNF) || 0;

  // Fórmula simplificada (pode variar dependendo do tipo de operação)
  const calculado = vProd + vFrete + vSeg + vOutro - vDesc + vIPI + vST;
  const calculadoArredondado = Math.round(calculado * 100) / 100;
  const vNFArredondado = Math.round(vNF * 100) / 100;
  const diferenca = Math.abs(calculadoArredondado - vNFArredondado);

  // Tolerância percentual (1%)
  const toleranciaPercentual = vNFArredondado * 0.01;
  const toleranciaFinal = Math.max(tolerancia, toleranciaPercentual);

  if (diferenca > toleranciaFinal) {
    return {
      valido: false,
      calculado: calculadoArredondado,
      diferenca: Math.round(diferenca * 100) / 100,
      erro: `Valor NF (${vNFArredondado.toFixed(2)}) difere do calculado (${calculadoArredondado.toFixed(2)}) em R$ ${diferenca.toFixed(2)}`
    };
  }

  return { valido: true, calculado: calculadoArredondado, diferenca: 0 };
}

/**
 * Valida sequência dos itens (nItem deve ser sequencial sem duplicatas)
 * @param {Object[]} itens - Array de itens com propriedade 'numero'
 * @returns {{valido: boolean, erro?: string, detalhes?: string[]}}
 */
function validarSequenciaItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return { valido: true }; // Sem itens = ok (erro será reportado em outro lugar)
  }

  const numeros = itens.map((item) => parseInt(item.numero, 10));
  const erros = [];

  // Verifica duplicatas
  const vistos = new Set();
  for (const num of numeros) {
    if (vistos.has(num)) {
      erros.push(`Item ${num} duplicado`);
    }
    vistos.add(num);
  }

  // Verifica sequência (deve começar em 1 e ser contínua)
  const ordenados = [...numeros].sort((a, b) => a - b);
  for (let i = 0; i < ordenados.length; i++) {
    const esperado = i + 1;
    if (ordenados[i] !== esperado) {
      erros.push(`Sequência quebrada: esperado item ${esperado}, encontrado ${ordenados[i]}`);
      break;
    }
  }

  if (erros.length > 0) {
    return { valido: false, erro: 'Problemas na sequência dos itens', detalhes: erros };
  }

  return { valido: true };
}

/**
 * Validação completa de dados extraídos da NF-e
 * @param {Object} dadosNfe - Dados extraídos pelo parser
 * @returns {{status: 'OK'|'OK_COM_ALERTAS'|'ERRO', errors: string[], alerts: string[]}}
 */
function validarNfeCompleta(dadosNfe) {
  const errors = [];
  const alerts = [];

  // 1. Validar chave de acesso
  if (dadosNfe.chaveAcesso) {
    const chaveResult = validarChaveAcesso(dadosNfe.chaveAcesso);
    if (!chaveResult.valido) {
      errors.push(`Chave de acesso: ${chaveResult.erro}`);
    }
  } else {
    errors.push('Chave de acesso não encontrada no XML');
  }

  // 2. Validar campos obrigatórios
  if (!dadosNfe.numero) {
    errors.push('Número da NF-e não encontrado');
  }
  if (!dadosNfe.dataEmissao) {
    errors.push('Data de emissão não encontrada');
  }
  if (!dadosNfe.totais?.valorNF && dadosNfe.totais?.valorNF !== 0) {
    errors.push('Valor total da NF-e não encontrado');
  }

  // 3. Validar emitente
  if (!dadosNfe.emitente?.cnpj && !dadosNfe.emitente?.cpf) {
    errors.push('CNPJ/CPF do emitente não encontrado');
  } else {
    const docEmit = dadosNfe.emitente.cnpj || dadosNfe.emitente.cpf;
    const resultEmit = validarCpfCnpj(docEmit);
    if (!resultEmit.valido) {
      alerts.push(`${resultEmit.tipo || 'Documento'} do emitente: ${resultEmit.erro}`);
    }
  }

  if (!dadosNfe.emitente?.razaoSocial) {
    alerts.push('Razão social do emitente não encontrada');
  }

  // 4. Validar destinatário
  if (!dadosNfe.destinatario?.cnpj && !dadosNfe.destinatario?.cpf) {
    alerts.push('CNPJ/CPF do destinatário não encontrado');
  } else {
    const docDest = dadosNfe.destinatario.cnpj || dadosNfe.destinatario.cpf;
    const resultDest = validarCpfCnpj(docDest);
    if (!resultDest.valido) {
      alerts.push(`${resultDest.tipo || 'Documento'} do destinatário: ${resultDest.erro}`);
    }
  }

  // 5. Validar itens
  if (!dadosNfe.itens || dadosNfe.itens.length === 0) {
    errors.push('NF-e sem itens');
  } else {
    // Validar sequência
    const seqResult = validarSequenciaItens(dadosNfe.itens);
    if (!seqResult.valido) {
      alerts.push(`Sequência dos itens: ${seqResult.erro}`);
    }

    // Validar somatório dos itens
    const valoresItens = dadosNfe.itens.map((item) => item.valorTotal || 0);
    const somaResult = validarSomatorioItens(valoresItens, dadosNfe.totais?.valorProdutos || 0);
    if (!somaResult.valido) {
      alerts.push(`Somatório dos itens: ${somaResult.erro}`);
    }
  }

  // 6. Validar valor total da NF
  if (dadosNfe.totais) {
    const totalResult = validarValorTotalNF(dadosNfe.totais);
    if (!totalResult.valido) {
      alerts.push(`Valor total NF: ${totalResult.erro}`);
    }
  }

  // 7. Validar versão
  if (dadosNfe.versao) {
    const versaoNum = parseFloat(dadosNfe.versao);
    if (versaoNum < 3.1 || versaoNum > 4.0) {
      alerts.push(`Versão do XML (${dadosNfe.versao}) pode não ser totalmente suportada`);
    }
  } else {
    alerts.push('Versão do XML não identificada');
  }

  // Determinar status final
  let status;
  if (errors.length > 0) {
    status = 'ERRO';
  } else if (alerts.length > 0) {
    status = 'OK_COM_ALERTAS';
  } else {
    status = 'OK';
  }

  return { status, errors, alerts };
}

module.exports = {
  validarChaveAcesso,
  calcularDVChave,
  validarCPF,
  validarCNPJ,
  validarCpfCnpj,
  validarSomatorioItens,
  validarValorTotalNF,
  validarSequenciaItens,
  validarNfeCompleta
};
