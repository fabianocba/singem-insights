'use strict';

const MODALIDADE_LABELS = {
  1: 'Convite',
  2: 'Tomada de Precos',
  3: 'Concorrencia',
  4: 'Concurso',
  5: 'Pregao',
  6: 'Dispensa de Licitacao',
  7: 'Inexigibilidade',
  8: 'Leilao',
  9: 'RDC',
  10: 'Dialogo Competitivo',
  11: 'Credenciamento'
};

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function safeText(value, maxLength = 300) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim().slice(0, maxLength);
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  const raw = String(value).trim();
  if (!raw) {
    return fallback;
  }

  const sanitized = raw.replace(/\s+/g, '').replace(/[^\d,.-]/g, '');
  if (!sanitized || sanitized === '-' || sanitized === '.' || sanitized === ',') {
    return fallback;
  }

  const hasComma = sanitized.includes(',');
  const hasDot = sanitized.includes('.');
  let normalized = sanitized;

  if (hasComma && hasDot) {
    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';

    normalized = sanitized.split(thousandSeparator).join('');
    if (decimalSeparator === ',') {
      normalized = normalized.replace(',', '.');
    }
  } else if (hasComma) {
    normalized = sanitized.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeDateOnly(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function getModalidadeNome(modalidade, forma) {
  const formaText = safeText(forma, 120);
  if (formaText) {
    return formaText;
  }

  const modalidadeNumber = toInteger(modalidade, null);
  if (modalidadeNumber !== null && MODALIDADE_LABELS[modalidadeNumber]) {
    return MODALIDADE_LABELS[modalidadeNumber];
  }

  if (modalidade !== null && modalidade !== undefined && modalidade !== '') {
    return `Modalidade ${modalidade}`;
  }

  return 'Nao informada';
}

function normalizeBooleanStatus(value, truthyLabel = 'ATIVO', falsyLabel = 'INATIVO') {
  if (value === true || String(value).toLowerCase() === 'true' || String(value).toUpperCase() === 'ATIVO') {
    return truthyLabel;
  }

  if (value === false || String(value).toLowerCase() === 'false' || String(value).toUpperCase() === 'INATIVO') {
    return falsyLabel;
  }

  return safeText(value, 30) || null;
}

function normalizePriceRecord(rawItem = {}) {
  const raw = rawItem && typeof rawItem === 'object' ? rawItem : {};
  const idCompra = safeText(raw.idCompra, 80);
  const numeroItemCompra = toInteger(raw.numeroItemCompra, null);
  const generatedItemId =
    idCompra && numeroItemCompra !== null ? `${idCompra}-${String(numeroItemCompra).padStart(4, '0')}` : '';

  return {
    idCompra,
    numeroItemCompra,
    idItemCompra: generatedItemId || safeText(raw.idItemCompra, 80),
    descricaoItem: safeText(pickFirst(raw.descricaoItem, raw.descricaoDetalhadaItem, raw.objetoCompra), 500),
    codigoItemCatalogo: safeText(raw.codigoItemCatalogo, 20),
    siglaUnidadeMedida: safeText(raw.siglaUnidadeMedida, 20),
    nomeUnidadeFornecimento: safeText(raw.nomeUnidadeFornecimento, 120),
    siglaUnidadeFornecimento: safeText(raw.siglaUnidadeFornecimento, 20),
    capacidadeUnidadeFornecimento: toNumber(raw.capacidadeUnidadeFornecimento, null),
    quantidade: toNumber(raw.quantidade, 0) || 0,
    precoUnitario: toNumber(raw.precoUnitario, 0) || 0,
    niFornecedor: digitsOnly(pickFirst(raw.niFornecedor, raw.cnpjFornecedor, raw.cnpj, raw.cpf)),
    nomeFornecedor: safeText(pickFirst(raw.nomeFornecedor, raw.razaoSocialFornecedor, raw.fornecedor), 180),
    marca: safeText(raw.marca, 120),
    codigoUasg: safeText(raw.codigoUasg, 20),
    nomeUasg: safeText(raw.nomeUasg, 180),
    codigoOrgao: safeText(raw.codigoOrgao, 20),
    nomeOrgao: safeText(raw.nomeOrgao, 180),
    estado: safeText(raw.estado, 4).toUpperCase(),
    dataCompra: normalizeDateOnly(raw.dataCompra),
    modalidade: toInteger(raw.modalidade, null),
    modalidadeNome: getModalidadeNome(raw.modalidade, raw.forma),
    poder: safeText(raw.poder, 30),
    esfera: safeText(raw.esfera, 30),
    codigoClasse: safeText(raw.codigoClasse, 20),
    raw
  };
}

function normalizeSupplierProfile(rawItem = {}) {
  const raw = rawItem && typeof rawItem === 'object' ? rawItem : {};
  const cnpj = digitsOnly(pickFirst(raw.cnpj, raw.cnpjCpf, raw.niFornecedor));
  const cpf = digitsOnly(raw.cpf);

  return {
    cnpjCpf: cnpj || cpf || '',
    nomeFornecedor: safeText(pickFirst(raw.razaoSocial, raw.nomeFornecedor, raw.nomeEmpresarial, raw.nome), 220),
    naturezaJuridica: safeText(pickFirst(raw.naturezaJuridicaDescricao, raw.naturezaJuridica?.descricao), 180),
    naturezaJuridicaId: safeText(pickFirst(raw.naturezaJuridicaId, raw.naturezaJuridica?.id), 30),
    porteEmpresa: safeText(pickFirst(raw.porteEmpresaDescricao, raw.porteEmpresa?.descricao, raw.porte), 180),
    porteEmpresaId: safeText(pickFirst(raw.porteEmpresaId, raw.porteEmpresa?.id), 30),
    codigoCnae: safeText(pickFirst(raw.codigoCnae, raw.cnae), 30),
    ativo: String(pickFirst(raw.ativo, raw.status, true)).toLowerCase() !== 'false',
    cnpj,
    cpf,
    raw
  };
}

function normalizeOrgaoProfile(rawItem = {}) {
  const raw = rawItem && typeof rawItem === 'object' ? rawItem : {};
  return {
    codigoOrgao: safeText(pickFirst(raw.codigoOrgao, raw.codigo), 20),
    orgao: safeText(pickFirst(raw.nomeOrgao, raw.orgao, raw.descricao), 220),
    cnpjCpfOrgao: digitsOnly(pickFirst(raw.cnpjCpfOrgao, raw.cnpj, raw.cpf)),
    uf: safeText(pickFirst(raw.siglaUf, raw.uf), 4).toUpperCase(),
    statusOrgao: normalizeBooleanStatus(pickFirst(raw.statusOrgao, raw.status), 'ATIVO', 'INATIVO'),
    raw
  };
}

function normalizeUasgProfile(rawItem = {}) {
  const raw = rawItem && typeof rawItem === 'object' ? rawItem : {};
  return {
    codigoUasg: safeText(pickFirst(raw.codigoUasg, raw.codigo), 20),
    nomeUasg: safeText(pickFirst(raw.nomeUasg, raw.nome, raw.descricao), 220),
    orgao: safeText(pickFirst(raw.nomeOrgao, raw.orgaoVinculado?.nome, raw.orgao), 220),
    codigoOrgao: safeText(pickFirst(raw.codigoOrgao, raw.orgaoVinculado?.codigo), 20),
    cnpjCpfOrgao: digitsOnly(pickFirst(raw.cnpjCpfOrgao, raw.orgaoVinculado?.cnpjCpfOrgao, raw.cnpj)),
    uf: safeText(pickFirst(raw.siglaUf, raw.uf), 4).toUpperCase(),
    usoSisg: raw.usoSisg === true || String(raw.usoSisg).toLowerCase() === 'true',
    statusUasg: normalizeBooleanStatus(pickFirst(raw.statusUasg, raw.status), 'ATIVA', 'INATIVA'),
    raw
  };
}

function attachNormalizedCollection(payload = {}, type, normalizer) {
  const source = Array.isArray(payload?.resultado) ? payload.resultado : [];
  const items = source.map((item) => normalizer(item)).filter(Boolean);

  return {
    ...payload,
    normalized: {
      type,
      items,
      totalRegistros: payload?.totalRegistros ?? items.length,
      pagina: payload?.pagina ?? 1,
      tamanhoPagina: payload?.tamanhoPagina ?? items.length,
      dataHoraConsulta: payload?.dataHoraConsulta || null
    }
  };
}

module.exports = {
  normalizePriceRecord,
  normalizeSupplierProfile,
  normalizeUasgProfile,
  normalizeOrgaoProfile,
  attachNormalizedCollection,
  digitsOnly,
  normalizeDateOnly,
  safeText,
  toInteger,
  toNumber,
  pickFirst
};
