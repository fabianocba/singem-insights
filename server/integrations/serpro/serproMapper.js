/**
 * SERPRO Mapper - SINGEM
 * Converte dados do formato SERPRO para modelo interno
 *
 * O domínio do SINGEM não conhece detalhes do SERPRO.
 * Este mapper normaliza os dados para o formato interno.
 */

/**
 * Formato interno de pessoa física
 * @typedef {Object} PessoaFisica
 * @property {string} cpf - CPF (apenas dígitos)
 * @property {string} nome - Nome completo
 * @property {string} situacao - regular, irregular, pendente, etc
 * @property {string|null} dataNascimento - Data de nascimento
 * @property {Date} consultadoEm - Data da consulta
 * @property {object} metadados - Dados adicionais do SERPRO
 */

/**
 * Formato interno de pessoa jurídica
 * @typedef {Object} PessoaJuridica
 * @property {string} cnpj - CNPJ (apenas dígitos)
 * @property {string} razaoSocial - Razão social
 * @property {string|null} nomeFantasia - Nome fantasia
 * @property {string} situacao - ativa, baixada, inapta, etc
 * @property {object|null} endereco - Endereço normalizado
 * @property {Date} consultadoEm - Data da consulta
 * @property {object} metadados - Dados adicionais do SERPRO
 */

/**
 * Mapeia resposta SERPRO de CPF para formato interno
 * @param {object} serproResponse - Resposta do SERPRO
 * @returns {PessoaFisica}
 */
function cpfToInternal(serproResponse) {
  if (!serproResponse || !serproResponse.ni) {
    throw new Error('Resposta SERPRO CPF inválida');
  }

  const situacaoMap = {
    0: 'regular',
    1: 'pendente',
    2: 'suspensa',
    3: 'titular falecido',
    4: 'cancelada',
    5: 'nula'
  };

  return {
    cpf: serproResponse.ni.replace(/\D/g, ''),
    nome: serproResponse.nome || '',
    situacao: situacaoMap[serproResponse.situacao?.codigo] || 'desconhecida',
    dataNascimento: serproResponse.nascimento || null,
    consultadoEm: new Date(),
    metadados: {
      fonte: 'SERPRO',
      codigoSituacao: serproResponse.situacao?.codigo,
      descricaoSituacao: serproResponse.situacao?.descricao,
      anoObito: serproResponse.ano_obito
    }
  };
}

/**
 * Mapeia resposta SERPRO de CNPJ para formato interno
 * @param {object} serproResponse - Resposta do SERPRO
 * @returns {PessoaJuridica}
 */
function cnpjToInternal(serproResponse) {
  if (!serproResponse || !serproResponse.ni) {
    throw new Error('Resposta SERPRO CNPJ inválida');
  }

  const situacaoMap = {
    '01': 'nula',
    '02': 'ativa',
    '03': 'suspensa',
    '04': 'inapta',
    '08': 'baixada'
  };

  let endereco = null;
  if (serproResponse.endereco) {
    const e = serproResponse.endereco;
    endereco = {
      logradouro: e.logradouro || '',
      numero: e.numero || '',
      complemento: e.complemento || null,
      bairro: e.bairro || '',
      municipio: e.municipio?.descricao || e.municipio || '',
      uf: e.uf || '',
      cep: (e.cep || '').replace(/\D/g, '')
    };
  }

  return {
    cnpj: serproResponse.ni.replace(/\D/g, ''),
    razaoSocial: serproResponse.nome_empresarial || serproResponse.nome || '',
    nomeFantasia: serproResponse.nome_fantasia || null,
    situacao: situacaoMap[serproResponse.situacao_cadastral?.codigo] || 'desconhecida',
    endereco,
    consultadoEm: new Date(),
    metadados: {
      fonte: 'SERPRO',
      codigoSituacao: serproResponse.situacao_cadastral?.codigo,
      descricaoSituacao: serproResponse.situacao_cadastral?.descricao,
      dataAbertura: serproResponse.data_abertura,
      naturezaJuridica: serproResponse.natureza_juridica,
      atividadePrincipal: serproResponse.atividade_principal,
      capitalSocial: serproResponse.capital_social
    }
  };
}

/**
 * Normaliza CPF/CNPJ para formato de consulta
 * @param {string} documento - CPF ou CNPJ
 * @returns {{tipo: 'cpf'|'cnpj', valor: string}}
 */
function normalizeDocumento(documento) {
  const digitos = String(documento).replace(/\D/g, '');

  if (digitos.length === 11) {
    return { tipo: 'cpf', valor: digitos };
  }

  if (digitos.length === 14) {
    return { tipo: 'cnpj', valor: digitos };
  }

  throw new Error(`Documento inválido: deve ter 11 (CPF) ou 14 (CNPJ) dígitos`);
}

/**
 * Formata CPF para exibição
 * @param {string} cpf - CPF apenas dígitos
 * @returns {string}
 */
function formatCPF(cpf) {
  const d = String(cpf).replace(/\D/g, '').padStart(11, '0');
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Formata CNPJ para exibição
 * @param {string} cnpj - CNPJ apenas dígitos
 * @returns {string}
 */
function formatCNPJ(cnpj) {
  const d = String(cnpj).replace(/\D/g, '').padStart(14, '0');
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

module.exports = {
  cpfToInternal,
  cnpjToInternal,
  normalizeDocumento,
  formatCPF,
  formatCNPJ
};
