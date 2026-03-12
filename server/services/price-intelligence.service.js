const crypto = require('crypto');
const XLSX = require('xlsx');

const db = require('../config/database');
const { config } = require('../config');
const integrationCache = require('../integrations/core/integrationCache');
const { ComprasGovClient, parseBoolean, sanitizeParams } = require('../integrations/comprasgov/client');
const AppError = require('../utils/appError');

const MEMORY_CACHE_NAMESPACE = 'price-intelligence:query';
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_CACHE_TTL_SECONDS = 30 * 60;
const DEFAULT_DB_CACHE_TTL_SECONDS = 6 * 60 * 60;
const DEFAULT_UPSTREAM_PAGE_SIZE = 100;
const DEFAULT_MAX_CODES = 10;
const DEFAULT_MAX_AUTO_PAGES = 12;
const DEFAULT_MAX_TOTAL_ITEMS = 5000;
const DEFAULT_MAX_RETURNED_RAW_ITEMS = 2000;
const DEFAULT_MAX_EXPORT_ITEMS = 10000;
const DEFAULT_TOP_LIMIT = 10;

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

function sha1(value) {
  return crypto
    .createHash('sha1')
    .update(String(value || ''))
    .digest('hex');
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(parsed, max));
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  const normalized = String(value).replace(/\./g, '').replace(',', '.').trim();
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

function safeText(value, maxLength = 300) {
  if (value === null || value === undefined) {
    return '';
  }

  const sanitized = sanitizeParams({ value }).value;
  return String(sanitized || '')
    .slice(0, maxLength)
    .trim();
}

function normalizeCatalogType(value) {
  const normalized = String(value || 'material')
    .trim()
    .toLowerCase();
  return normalized === 'servico' || normalized === 'catser' ? 'servico' : 'material';
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

function startOfMonth(year, month) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
}

function endOfMonth(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function resolvePresetRange(preset) {
  const normalized = String(preset || '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return { start: null, end: null, preset: null };
  }

  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const startDate = new Date(today);

  switch (normalized) {
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '180d':
      startDate.setDate(startDate.getDate() - 180);
      break;
    case '12m':
      startDate.setMonth(startDate.getMonth() - 12);
      break;
    case 'ano-atual':
      return { start: `${today.getFullYear()}-01-01`, end, preset: normalized };
    default:
      return { start: null, end: null, preset: null };
  }

  return {
    start: startDate.toISOString().slice(0, 10),
    end,
    preset: normalized
  };
}

function parseList(value, options = {}) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(/[;,\n]+/);
  const results = [];
  const seen = new Set();
  const maxItems = clampNumber(options.maxItems, 1, 50, 10);

  for (const raw of rawValues) {
    let normalized = String(raw || '').trim();
    if (!normalized) {
      continue;
    }

    if (options.digitsOnly) {
      normalized = digitsOnly(normalized);
    }

    if (!normalized) {
      continue;
    }

    normalized = safeText(options.uppercase ? normalized.toUpperCase() : normalized, options.maxLength || 60);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    results.push(normalized);

    if (results.length >= maxItems) {
      break;
    }
  }

  return results;
}

function parseCodes(value, maxCodes) {
  return parseList(value, {
    digitsOnly: true,
    maxItems: maxCodes,
    maxLength: 20
  });
}

function normalizeSort(value) {
  const allowed = new Set([
    'data-desc',
    'data-asc',
    'preco-desc',
    'preco-asc',
    'fornecedor-asc',
    'fornecedor-desc',
    'modalidade-asc'
  ]);
  const normalized = String(value || 'data-desc')
    .trim()
    .toLowerCase();
  return allowed.has(normalized) ? normalized : 'data-desc';
}

function formatDateLabel(dateValue) {
  const iso = normalizeDateOnly(dateValue);
  if (!iso) {
    return '-';
  }

  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatCurrency(value) {
  const amount = toNumber(value, null);
  if (amount === null) {
    return 'R$ 0,00';
  }

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatPercent(value) {
  const amount = toNumber(value, null);
  if (amount === null) {
    return '0%';
  }

  return `${amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`;
}

function mean(values = []) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values = []) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function standardDeviation(values = []) {
  if (values.length <= 1) {
    return null;
  }

  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function buildPresentationUnit(item) {
  const unit = safeText(item.siglaUnidadeFornecimento || item.nomeUnidadeFornecimento || item.siglaUnidadeMedida, 40);
  const capacity = toNumber(item.capacidadeUnidadeFornecimento, null);
  if (unit && capacity !== null) {
    return `${capacity} ${unit}`.trim();
  }

  return unit || safeText(item.nomeUnidadeMedida, 60) || '-';
}

function getModalidadeNome(modalidade, forma) {
  const formaText = safeText(forma, 80);
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

function normalizePriceItem(rawItem, catalogType, requestedCode) {
  const raw = rawItem && typeof rawItem === 'object' ? rawItem : {};
  const idCompra = safeText(raw.idCompra, 80);
  const numeroItemCompra = toInteger(raw.numeroItemCompra, null);
  const generatedItemId =
    idCompra && numeroItemCompra !== null ? `${idCompra}-${String(numeroItemCompra).padStart(4, '0')}` : '';

  return {
    idCompra,
    numeroItemCompra,
    idItemCompra: generatedItemId || safeText(raw.idItemCompra, 80) || safeText(`${idCompra}-${requestedCode}`, 120),
    idItemCompraOficial: raw.idItemCompra ?? null,
    descricaoItem: safeText(raw.descricaoItem || raw.descricaoDetalhadaItem || raw.objetoCompra, 500),
    descricaoDetalhadaItem: safeText(raw.descricaoDetalhadaItem, 2000),
    codigoItemCatalogo: safeText(raw.codigoItemCatalogo || requestedCode, 20),
    siglaUnidadeMedida: safeText(raw.siglaUnidadeMedida, 20),
    nomeUnidadeMedida: safeText(raw.nomeUnidadeMedida, 80),
    nomeUnidadeFornecimento: safeText(raw.nomeUnidadeFornecimento, 120),
    siglaUnidadeFornecimento: safeText(raw.siglaUnidadeFornecimento, 20),
    capacidadeUnidadeFornecimento: toNumber(raw.capacidadeUnidadeFornecimento, null),
    unidadeApresentacao: buildPresentationUnit(raw),
    quantidade: toNumber(raw.quantidade, 0) || 0,
    precoUnitario: toNumber(raw.precoUnitario, 0) || 0,
    niFornecedor: digitsOnly(raw.niFornecedor),
    nomeFornecedor: safeText(raw.nomeFornecedor, 180) || 'Fornecedor nao informado',
    marca: safeText(raw.marca, 120),
    codigoUasg: safeText(raw.codigoUasg, 20),
    nomeUasg: safeText(raw.nomeUasg, 180),
    codigoOrgao: toInteger(raw.codigoOrgao, null),
    nomeOrgao: safeText(raw.nomeOrgao, 180),
    estado: safeText(raw.estado, 4).toUpperCase(),
    municipio: safeText(raw.municipio, 120),
    codigoMunicipio: toInteger(raw.codigoMunicipio, null),
    dataCompra: normalizeDateOnly(raw.dataCompra),
    dataResultado: normalizeDateOnly(raw.dataResultado),
    modalidade: toInteger(raw.modalidade, null),
    modalidadeNome: getModalidadeNome(raw.modalidade, raw.forma),
    forma: safeText(raw.forma, 120),
    criterioJulgamento: safeText(raw.criterioJulgamento, 160),
    poder: safeText(raw.poder, 30),
    esfera: safeText(raw.esfera, 30),
    codigoClasse: toInteger(raw.codigoClasse, null),
    nomeClasse: safeText(raw.nomeClasse, 120),
    objetoCompra: safeText(raw.objetoCompra, 500),
    sourceType: catalogType,
    codigoConsultado: safeText(requestedCode, 20),
    raw
  };
}

function dedupeItems(items = []) {
  const map = new Map();

  for (const item of items) {
    const key = [
      item.idCompra,
      item.numeroItemCompra,
      item.codigoItemCatalogo,
      item.niFornecedor,
      item.precoUnitario,
      item.quantidade,
      item.dataCompra
    ].join('|');

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}

function normalizeTextCompare(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function containsText(haystack, needle) {
  if (!needle) {
    return true;
  }

  return normalizeTextCompare(haystack).includes(normalizeTextCompare(needle));
}

function matchesAnyModalidade(item, modalidades = []) {
  if (!modalidades.length) {
    return true;
  }

  const modalidadeCode = item.modalidade !== null ? String(item.modalidade) : '';
  const modalidadeNome = normalizeTextCompare(item.modalidadeNome);

  return modalidades.some((value) => {
    const normalized = normalizeTextCompare(value);
    return normalized === modalidadeCode || modalidadeNome.includes(normalized);
  });
}

function applyLocalFilters(items = [], query) {
  return items.filter((item) => {
    if (query.estado && normalizeTextCompare(item.estado) !== normalizeTextCompare(query.estado)) {
      return false;
    }

    if (query.codigoUasg && String(item.codigoUasg || '') !== String(query.codigoUasg)) {
      return false;
    }

    if (
      query.fornecedor &&
      !containsText(item.nomeFornecedor, query.fornecedor) &&
      !containsText(item.niFornecedor, query.fornecedor)
    ) {
      return false;
    }

    if (query.marca && !containsText(item.marca, query.marca)) {
      return false;
    }

    if (!matchesAnyModalidade(item, query.modalidades)) {
      return false;
    }

    if (query.precoMin !== null && item.precoUnitario < query.precoMin) {
      return false;
    }

    if (query.precoMax !== null && item.precoUnitario > query.precoMax) {
      return false;
    }

    if (query.dateStart && item.dataCompra && item.dataCompra < query.dateStart) {
      return false;
    }

    if (query.dateEnd && item.dataCompra && item.dataCompra > query.dateEnd) {
      return false;
    }

    if (query.year && item.dataCompra) {
      const year = toInteger(item.dataCompra.slice(0, 4), null);
      if (year !== query.year) {
        return false;
      }
    }

    if (query.month && item.dataCompra) {
      const month = toInteger(item.dataCompra.slice(5, 7), null);
      if (month !== query.month) {
        return false;
      }
    }

    return true;
  });
}

function compareNullableStrings(left, right) {
  return String(left || '').localeCompare(String(right || ''), 'pt-BR', { sensitivity: 'base' });
}

function sortItems(items = [], sortKey = 'data-desc') {
  const sorted = [...items];

  sorted.sort((left, right) => {
    if (sortKey === 'preco-asc') {
      return left.precoUnitario - right.precoUnitario;
    }

    if (sortKey === 'preco-desc') {
      return right.precoUnitario - left.precoUnitario;
    }

    if (sortKey === 'fornecedor-asc') {
      return compareNullableStrings(left.nomeFornecedor, right.nomeFornecedor);
    }

    if (sortKey === 'fornecedor-desc') {
      return compareNullableStrings(right.nomeFornecedor, left.nomeFornecedor);
    }

    if (sortKey === 'modalidade-asc') {
      return compareNullableStrings(left.modalidadeNome, right.modalidadeNome);
    }

    if (sortKey === 'data-asc') {
      return compareNullableStrings(left.dataCompra, right.dataCompra);
    }

    return compareNullableStrings(right.dataCompra, left.dataCompra);
  });

  return sorted;
}

function paginate(items = [], page, pageSize) {
  const safePageSize = clampNumber(pageSize, 1, 500, DEFAULT_PAGE_SIZE);
  const safePage = clampNumber(page, 1, 10000, 1);
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const offset = (currentPage - 1) * safePageSize;

  return {
    number: currentPage,
    size: safePageSize,
    totalPages,
    totalItems: items.length,
    items: items.slice(offset, offset + safePageSize)
  };
}

function buildMetrics(items = []) {
  const prices = items.map((item) => item.precoUnitario).filter((value) => Number.isFinite(value) && value >= 0);
  const totalQuantidade = items.reduce(
    (sum, item) => sum + (Number.isFinite(item.quantidade) ? item.quantidade : 0),
    0
  );
  const valorTotalEstimado = items.reduce((sum, item) => {
    const quantity = Number.isFinite(item.quantidade) ? item.quantidade : 0;
    const price = Number.isFinite(item.precoUnitario) ? item.precoUnitario : 0;
    return sum + quantity * price;
  }, 0);

  return {
    totalRegistros: items.length,
    totalCompras: new Set(items.map((item) => item.idCompra).filter(Boolean)).size,
    totalQuantidade,
    precoMedio: mean(prices),
    precoMediano: median(prices),
    precoMinimo: prices.length ? Math.min(...prices) : null,
    precoMaximo: prices.length ? Math.max(...prices) : null,
    desvioPadrao: standardDeviation(prices),
    valorTotalEstimado,
    fornecedoresUnicos: new Set(items.map((item) => item.niFornecedor || item.nomeFornecedor).filter(Boolean)).size,
    orgaosUnicos: new Set(items.map((item) => item.nomeOrgao).filter(Boolean)).size,
    uasgsUnicas: new Set(items.map((item) => item.codigoUasg).filter(Boolean)).size,
    estadosUnicos: new Set(items.map((item) => item.estado).filter(Boolean)).size,
    marcasUnicas: new Set(items.map((item) => item.marca).filter(Boolean)).size
  };
}

function buildSupplierAnalytics(items = [], limit = DEFAULT_TOP_LIMIT) {
  const totalRecords = Math.max(1, items.length);
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantidade || 0), 0);
  const supplierMap = new Map();

  for (const item of items) {
    const key = item.niFornecedor || item.nomeFornecedor || 'fornecedor-nao-informado';
    const current = supplierMap.get(key) || {
      niFornecedor: item.niFornecedor || null,
      nomeFornecedor: item.nomeFornecedor || 'Fornecedor nao informado',
      totalRegistros: 0,
      totalQuantidade: 0,
      somaPrecos: 0,
      totalComPreco: 0
    };

    current.totalRegistros += 1;
    current.totalQuantidade += item.quantidade || 0;

    if (Number.isFinite(item.precoUnitario)) {
      current.somaPrecos += item.precoUnitario;
      current.totalComPreco += 1;
    }

    supplierMap.set(key, current);
  }

  const rows = [...supplierMap.values()].map((entry) => {
    const participationBase = totalQuantity > 0 ? totalQuantity : totalRecords;
    const participationValue = totalQuantity > 0 ? entry.totalQuantidade : entry.totalRegistros;
    return {
      ...entry,
      precoMedio: entry.totalComPreco > 0 ? entry.somaPrecos / entry.totalComPreco : null,
      participacaoPercentual: participationBase > 0 ? (participationValue / participationBase) * 100 : 0
    };
  });

  return {
    topByFrequency: [...rows].sort((a, b) => b.totalRegistros - a.totalRegistros).slice(0, limit),
    topByQuantity: [...rows].sort((a, b) => b.totalQuantidade - a.totalQuantidade).slice(0, limit),
    topByLowestAveragePrice: [...rows]
      .filter((entry) => entry.precoMedio !== null)
      .sort((a, b) => a.precoMedio - b.precoMedio)
      .slice(0, limit),
    topByParticipation: [...rows].sort((a, b) => b.participacaoPercentual - a.participacaoPercentual).slice(0, limit)
  };
}

function buildBuyerAnalytics(items = [], limit = DEFAULT_TOP_LIMIT) {
  const buildRows = (keyResolver, seedResolver) => {
    const map = new Map();

    for (const item of items) {
      const key = keyResolver(item);
      if (!key) {
        continue;
      }

      const current = map.get(key) || seedResolver(item);
      current.totalRegistros += 1;
      current.totalQuantidade += item.quantidade || 0;
      current.somaPrecos += item.precoUnitario || 0;
      current.totalComPreco += Number.isFinite(item.precoUnitario) ? 1 : 0;
      map.set(key, current);
    }

    return [...map.values()].map((entry) => ({
      ...entry,
      precoMedio: entry.totalComPreco > 0 ? entry.somaPrecos / entry.totalComPreco : null
    }));
  };

  const orgaos = buildRows(
    (item) => item.nomeOrgao || null,
    (item) => ({
      codigoOrgao: item.codigoOrgao,
      nomeOrgao: item.nomeOrgao,
      totalRegistros: 0,
      totalQuantidade: 0,
      somaPrecos: 0,
      totalComPreco: 0
    })
  );

  const uasgs = buildRows(
    (item) => item.codigoUasg || null,
    (item) => ({
      codigoUasg: item.codigoUasg,
      nomeUasg: item.nomeUasg,
      estado: item.estado,
      totalRegistros: 0,
      totalQuantidade: 0,
      somaPrecos: 0,
      totalComPreco: 0
    })
  );

  return {
    topOrgaos: [...orgaos]
      .sort((a, b) => b.totalQuantidade - a.totalQuantidade || b.totalRegistros - a.totalRegistros)
      .slice(0, limit),
    topUasgs: [...uasgs]
      .sort((a, b) => b.totalQuantidade - a.totalQuantidade || b.totalRegistros - a.totalRegistros)
      .slice(0, limit)
  };
}

function buildModalidadeAnalytics(items = [], limit = DEFAULT_TOP_LIMIT) {
  const map = new Map();

  for (const item of items) {
    const key = item.modalidadeNome || 'Nao informada';
    const current = map.get(key) || {
      modalidade: item.modalidade,
      modalidadeNome: key,
      totalRegistros: 0,
      totalQuantidade: 0,
      somaPrecos: 0,
      totalComPreco: 0
    };

    current.totalRegistros += 1;
    current.totalQuantidade += item.quantidade || 0;
    current.somaPrecos += item.precoUnitario || 0;
    current.totalComPreco += Number.isFinite(item.precoUnitario) ? 1 : 0;
    map.set(key, current);
  }

  const rows = [...map.values()].map((entry) => ({
    ...entry,
    precoMedio: entry.totalComPreco > 0 ? entry.somaPrecos / entry.totalComPreco : null
  }));

  return {
    distribution: [...rows].sort((a, b) => b.totalRegistros - a.totalRegistros).slice(0, limit),
    averagePrice: [...rows]
      .filter((entry) => entry.precoMedio !== null)
      .sort((a, b) => a.precoMedio - b.precoMedio)
      .slice(0, limit)
  };
}

function buildTimelineSeries(items = []) {
  const createSeries = (labelResolver, sortResolver) => {
    const map = new Map();

    for (const item of items) {
      if (!item.dataCompra) {
        continue;
      }

      const label = labelResolver(item.dataCompra);
      const current = map.get(label) || {
        periodo: label,
        totalRegistros: 0,
        totalQuantidade: 0,
        somaPrecos: 0,
        totalComPreco: 0,
        precoMinimo: null,
        precoMaximo: null
      };

      current.totalRegistros += 1;
      current.totalQuantidade += item.quantidade || 0;

      if (Number.isFinite(item.precoUnitario)) {
        current.somaPrecos += item.precoUnitario;
        current.totalComPreco += 1;
        current.precoMinimo =
          current.precoMinimo === null ? item.precoUnitario : Math.min(current.precoMinimo, item.precoUnitario);
        current.precoMaximo =
          current.precoMaximo === null ? item.precoUnitario : Math.max(current.precoMaximo, item.precoUnitario);
      }

      map.set(label, current);
    }

    return [...map.values()]
      .map((entry) => ({
        ...entry,
        precoMedio: entry.totalComPreco > 0 ? entry.somaPrecos / entry.totalComPreco : null
      }))
      .sort((a, b) => sortResolver(a.periodo, b.periodo));
  };

  const byMonth = createSeries(
    (date) => date.slice(0, 7),
    (left, right) => left.localeCompare(right, 'pt-BR')
  );
  const byQuarter = createSeries(
    (date) => {
      const year = date.slice(0, 4);
      const month = Number(date.slice(5, 7));
      const quarter = Math.ceil(month / 3);
      return `${year}-T${quarter}`;
    },
    (left, right) => left.localeCompare(right, 'pt-BR')
  );
  const byYear = createSeries(
    (date) => date.slice(0, 4),
    (left, right) => left.localeCompare(right, 'pt-BR')
  );

  const trendBase = byMonth.length >= 2 ? byMonth : byYear;
  let trend = null;
  if (trendBase.length >= 2) {
    const first = trendBase[0];
    const last = trendBase[trendBase.length - 1];
    const firstValue = toNumber(first.precoMedio, null);
    const lastValue = toNumber(last.precoMedio, null);

    if (firstValue !== null && lastValue !== null && firstValue > 0) {
      const deltaPercent = ((lastValue - firstValue) / firstValue) * 100;
      trend = {
        direction: deltaPercent > 3 ? 'alta' : deltaPercent < -3 ? 'queda' : 'estavel',
        deltaPercent,
        firstPeriod: first.periodo,
        lastPeriod: last.periodo,
        firstAveragePrice: firstValue,
        lastAveragePrice: lastValue
      };
    }
  }

  return {
    byMonth,
    byQuarter,
    byYear,
    trend
  };
}

function buildGeographyAnalytics(items = [], limit = DEFAULT_TOP_LIMIT) {
  const map = new Map();

  for (const item of items) {
    if (!item.estado) {
      continue;
    }

    const current = map.get(item.estado) || {
      estado: item.estado,
      totalRegistros: 0,
      totalQuantidade: 0,
      somaPrecos: 0,
      totalComPreco: 0
    };

    current.totalRegistros += 1;
    current.totalQuantidade += item.quantidade || 0;
    current.somaPrecos += item.precoUnitario || 0;
    current.totalComPreco += Number.isFinite(item.precoUnitario) ? 1 : 0;
    map.set(item.estado, current);
  }

  return {
    byState: [...map.values()]
      .map((entry) => ({
        ...entry,
        precoMedio: entry.totalComPreco > 0 ? entry.somaPrecos / entry.totalComPreco : null
      }))
      .sort((a, b) => b.totalRegistros - a.totalRegistros)
      .slice(0, limit)
  };
}

function buildSummary(query, metrics, suppliers, buyers, modalities, timeline) {
  const principalModalidade = modalities.distribution[0]?.modalidadeNome || 'sem modalidade dominante';
  const principalFornecedor = suppliers.topByFrequency[0]?.nomeFornecedor || 'fornecedor nao identificado';
  const principalUasg = buyers.topUasgs[0]?.nomeUasg || buyers.topUasgs[0]?.codigoUasg || 'UASG nao identificada';
  const catalogLabel = query.catalogType === 'material' ? 'CATMAT' : 'CATSER';
  const periodLabel =
    query.dateStart || query.dateEnd
      ? `${formatDateLabel(query.dateStart)} a ${formatDateLabel(query.dateEnd)}`
      : 'todo o historico retornado';
  const trendText = timeline.trend
    ? timeline.trend.direction === 'alta'
      ? `Houve tendencia de alta de ${formatPercent(Math.abs(timeline.trend.deltaPercent))}.`
      : timeline.trend.direction === 'queda'
        ? `Houve tendencia de queda de ${formatPercent(Math.abs(timeline.trend.deltaPercent))}.`
        : 'A serie temporal permaneceu estavel no periodo.'
    : 'Nao ha massa critica suficiente para inferir tendencia temporal.';

  return {
    title: 'Inteligencia de Precos Publicos',
    text:
      `A consulta consolidou ${metrics.totalRegistros} registro(s) de ${metrics.totalCompras} compra(s) para ${query.codes.length} codigo(s) ${catalogLabel} em ${periodLabel}. ` +
      `O preco medio observado foi ${formatCurrency(metrics.precoMedio)}, com faixa entre ${formatCurrency(metrics.precoMinimo)} e ${formatCurrency(metrics.precoMaximo)}. ` +
      `A modalidade predominante foi ${principalModalidade}, o fornecedor mais recorrente foi ${principalFornecedor} e a UASG com maior presenca foi ${principalUasg}. ${trendText}`,
    totalCodigos: query.codes.length,
    catalogType: query.catalogType,
    periodo: periodLabel,
    totalRegistros: metrics.totalRegistros,
    totalCompras: metrics.totalCompras,
    fornecedoresUnicos: metrics.fornecedoresUnicos,
    orgaosUnicos: metrics.orgaosUnicos,
    uasgsUnicas: metrics.uasgsUnicas
  };
}

function buildInsights(metrics, suppliers, buyers, modalities, timeline, meta = {}) {
  const insights = [];

  if (metrics.totalRegistros === 0) {
    insights.push({
      type: 'warning',
      text: 'Nenhum preco praticado foi encontrado para os filtros informados.'
    });
    return insights;
  }

  insights.push({
    type: 'info',
    text: `Preco medio do recorte atual: ${formatCurrency(metrics.precoMedio)}.`
  });
  insights.push({
    type: 'info',
    text: `Menor preco observado: ${formatCurrency(metrics.precoMinimo)}; maior preco observado: ${formatCurrency(metrics.precoMaximo)}.`
  });

  if (suppliers.topByFrequency[0]) {
    insights.push({
      type: 'success',
      text: `Fornecedor mais recorrente: ${suppliers.topByFrequency[0].nomeFornecedor} com ${suppliers.topByFrequency[0].totalRegistros} registro(s).`
    });
  }

  if (buyers.topUasgs[0]) {
    insights.push({
      type: 'info',
      text: `Maior concentracao de compras na UASG ${buyers.topUasgs[0].codigoUasg || '-'} - ${buyers.topUasgs[0].nomeUasg || 'Nao informado'}.`
    });
  }

  if (modalities.distribution[0]) {
    insights.push({
      type: 'info',
      text: `Modalidade com maior recorrencia: ${modalities.distribution[0].modalidadeNome}.`
    });
  }

  if (timeline.trend) {
    const directionText =
      timeline.trend.direction === 'alta'
        ? 'tendencia de alta'
        : timeline.trend.direction === 'queda'
          ? 'tendencia de queda'
          : 'estabilidade';

    insights.push({
      type: timeline.trend.direction === 'queda' ? 'success' : timeline.trend.direction === 'alta' ? 'warning' : 'info',
      text: `A evolucao temporal indica ${directionText} de ${formatPercent(Math.abs(timeline.trend.deltaPercent))} entre ${timeline.trend.firstPeriod} e ${timeline.trend.lastPeriod}.`
    });
  }

  if (meta.truncated) {
    insights.push({
      type: 'warning',
      text: `A consulta atingiu o limite seguro de ${meta.maxTotalItems} registros consolidados; refine os filtros para maior precisao.`
    });
  }

  if (Array.isArray(meta.partialErrors) && meta.partialErrors.length > 0) {
    insights.push({
      type: 'warning',
      text: `${meta.partialErrors.length} codigo(s) nao puderam ser consolidados no momento e foram ignorados nesta resposta.`
    });
  }

  return insights;
}

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (text.includes(';') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsv(rows = []) {
  if (!rows.length) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const output = [headers.map((header) => escapeCsv(header)).join(';')];

  for (const row of rows) {
    output.push(headers.map((header) => escapeCsv(row[header])).join(';'));
  }

  return output.join('\n');
}

function normalizeQueryInput(input = {}, moduleConfig) {
  const catalogType = normalizeCatalogType(input.tipoCatalogo || input.catalogType || input.tipo || input.type);
  const codes = parseCodes(
    input.codigos ||
      input.codes ||
      input.codigoItemCatalogo ||
      input.codigoCatmat ||
      input.codigoCatser ||
      input.codigo,
    moduleConfig.maxCodesPerQuery
  );

  if (!codes.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Informe pelo menos um codigo CATMAT/CATSER valido.');
  }

  const year = toInteger(input.ano, null);
  const month = clampNumber(input.mes, 1, 12, null);
  const explicitStart = normalizeDateOnly(input.dataCompraInicio || input.dataInicio);
  const explicitEnd = normalizeDateOnly(input.dataCompraFim || input.dataFim);
  const presetRange =
    !explicitStart && !explicitEnd
      ? resolvePresetRange(input.periodo || input.periodPreset)
      : { start: null, end: null, preset: null };

  let dateStart = explicitStart || presetRange.start;
  let dateEnd = explicitEnd || presetRange.end;

  if (!dateStart && !dateEnd && year && month) {
    dateStart = startOfMonth(year, month);
    dateEnd = endOfMonth(year, month);
  } else if (!dateStart && !dateEnd && year) {
    dateStart = `${year}-01-01`;
    dateEnd = `${year}-12-31`;
  }

  if (dateStart && dateEnd && dateStart > dateEnd) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Intervalo de datas invalido: data inicial maior que a final.');
  }

  const pageSize = clampNumber(input.tamanhoPagina || input.pageSize, 1, 500, DEFAULT_PAGE_SIZE);

  return {
    catalogType,
    codes,
    year,
    month,
    periodo: presetRange.preset,
    dateStart,
    dateEnd,
    modalidades: parseList(input.modalidade || input.modalidades, { maxItems: 10, maxLength: 60 }),
    estado: safeText(input.estado, 4).toUpperCase(),
    codigoUasg: safeText(input.codigoUasg, 20),
    fornecedor: safeText(input.fornecedor, 120),
    marca: safeText(input.marca, 120),
    precoMin: toNumber(input.precoMin || input.faixaPrecoMin, null),
    precoMax: toNumber(input.precoMax || input.faixaPrecoMax, null),
    poder: safeText(input.poder, 30),
    esfera: safeText(input.esfera, 30),
    codigoMunicipio: toInteger(input.codigoMunicipio, null),
    idCompra: safeText(input.idCompra, 80),
    codigoClasse: catalogType === 'material' ? toInteger(input.codigoClasse, null) : null,
    dataResultado: input.dataResultado === undefined ? null : parseBoolean(input.dataResultado),
    fetchAllPages: input.buscarTodasPaginas === undefined ? true : parseBoolean(input.buscarTodasPaginas),
    maxPages: clampNumber(input.maxPaginas, 1, moduleConfig.maxAutoPages, moduleConfig.maxAutoPages),
    upstreamPageSize: clampNumber(
      input.tamanhoPaginaConsulta || input.upstreamPageSize,
      10,
      500,
      moduleConfig.upstreamPageSize
    ),
    page: clampNumber(input.pagina || input.page, 1, 100000, 1),
    pageSize,
    sort: normalizeSort(input.ordenacao || input.sort),
    includeRaw: input.includeRaw === undefined ? true : parseBoolean(input.includeRaw),
    forceRefresh: parseBoolean(input.forceRefresh || input.atualizarAgora || false),
    maxTotalItems: moduleConfig.maxTotalItems,
    rawItemsLimit: moduleConfig.maxReturnedRawItems,
    exportLimit: moduleConfig.maxExportItems,
    topLimit: moduleConfig.topLimit
  };
}

class PriceIntelligenceService {
  constructor(options = {}) {
    this.comprasGovClient = options.comprasGovClient || new ComprasGovClient();
    this.cache = options.cache || integrationCache;
    this.db = options.db || db;
    this.workbook = options.workbook || XLSX;
    this.now = options.now || (() => new Date());
  }

  getModuleConfig() {
    const cfg = config.priceIntelligence || {};

    return {
      cacheTtlSeconds: clampNumber(cfg.cacheTtlSeconds, 60, 86400, DEFAULT_CACHE_TTL_SECONDS),
      dbCacheEnabled: cfg.dbCacheEnabled !== false,
      dbCacheTtlSeconds: clampNumber(cfg.dbCacheTtlSeconds, 60, 604800, DEFAULT_DB_CACHE_TTL_SECONDS),
      maxCodesPerQuery: clampNumber(cfg.maxCodesPerQuery, 1, 25, DEFAULT_MAX_CODES),
      upstreamPageSize: clampNumber(cfg.upstreamPageSize, 10, 500, DEFAULT_UPSTREAM_PAGE_SIZE),
      maxAutoPages: clampNumber(cfg.maxAutoPages, 1, 50, DEFAULT_MAX_AUTO_PAGES),
      maxTotalItems: clampNumber(cfg.maxTotalItems, 50, 50000, DEFAULT_MAX_TOTAL_ITEMS),
      maxReturnedRawItems: clampNumber(cfg.maxReturnedRawItems, 10, 10000, DEFAULT_MAX_RETURNED_RAW_ITEMS),
      maxExportItems: clampNumber(cfg.maxExportItems, 10, 50000, DEFAULT_MAX_EXPORT_ITEMS),
      topLimit: clampNumber(cfg.topLimit, 3, 20, DEFAULT_TOP_LIMIT)
    };
  }

  buildCacheIdentity(query) {
    return {
      catalogType: query.catalogType,
      codes: query.codes,
      year: query.year,
      month: query.month,
      period: query.periodo,
      dateStart: query.dateStart,
      dateEnd: query.dateEnd,
      modalidades: query.modalidades,
      estado: query.estado,
      codigoUasg: query.codigoUasg,
      fornecedor: query.fornecedor,
      marca: query.marca,
      precoMin: query.precoMin,
      precoMax: query.precoMax,
      poder: query.poder,
      esfera: query.esfera,
      codigoMunicipio: query.codigoMunicipio,
      idCompra: query.idCompra,
      codigoClasse: query.codigoClasse,
      dataResultado: query.dataResultado,
      fetchAllPages: query.fetchAllPages,
      maxPages: query.maxPages,
      upstreamPageSize: query.upstreamPageSize,
      sort: query.sort
    };
  }

  buildCacheKey(query) {
    return sha1(JSON.stringify(this.buildCacheIdentity(query)));
  }

  readMemoryCache(cacheKey) {
    return this.cache.get(MEMORY_CACHE_NAMESPACE, cacheKey);
  }

  writeMemoryCache(cacheKey, payload, ttlSeconds) {
    this.cache.set(MEMORY_CACHE_NAMESPACE, cacheKey, payload, ttlSeconds);
  }

  async readPersistentCache(cacheKey) {
    const moduleConfig = this.getModuleConfig();
    if (!moduleConfig.dbCacheEnabled) {
      return null;
    }

    try {
      const result = await this.db.query(
        `
        SELECT normalized_payload, fetched_at, expires_at
        FROM price_intelligence_cache
        WHERE cache_key = $1
          AND expires_at > NOW()
        LIMIT 1
        `,
        [cacheKey]
      );

      if (!result.rows[0]) {
        return null;
      }

      return {
        payload: result.rows[0].normalized_payload,
        fetchedAt: result.rows[0].fetched_at,
        expiresAt: result.rows[0].expires_at
      };
    } catch (error) {
      console.warn(`[PRICE_INTELLIGENCE] cache persistente indisponivel: ${error.message}`);
      return null;
    }
  }

  async writePersistentCache(cacheKey, query, payload) {
    const moduleConfig = this.getModuleConfig();
    if (!moduleConfig.dbCacheEnabled) {
      return;
    }

    try {
      await this.db.query(
        `
        INSERT INTO price_intelligence_cache (
          cache_key,
          catalog_type,
          codes_json,
          filters_json,
          normalized_payload,
          total_registros,
          fetched_at,
          expires_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3::jsonb,
          $4::jsonb,
          $5::jsonb,
          $6,
          NOW(),
          NOW() + ($7 || ' seconds')::interval,
          NOW()
        )
        ON CONFLICT (cache_key)
        DO UPDATE SET
          catalog_type = EXCLUDED.catalog_type,
          codes_json = EXCLUDED.codes_json,
          filters_json = EXCLUDED.filters_json,
          normalized_payload = EXCLUDED.normalized_payload,
          total_registros = EXCLUDED.total_registros,
          fetched_at = NOW(),
          expires_at = NOW() + ($7 || ' seconds')::interval,
          updated_at = NOW()
        `,
        [
          cacheKey,
          query.catalogType,
          JSON.stringify(query.codes),
          JSON.stringify(this.buildCacheIdentity(query)),
          JSON.stringify(payload),
          payload?.meta?.totalAfterFilter || 0,
          moduleConfig.dbCacheTtlSeconds
        ]
      );
    } catch (error) {
      console.warn(`[PRICE_INTELLIGENCE] falha ao gravar cache persistente: ${error.message}`);
    }
  }

  buildUpstreamParams(query, code) {
    const params = {
      codigoItemCatalogo: code,
      codigoUasg: query.codigoUasg || undefined,
      estado: query.estado || undefined,
      codigoMunicipio: query.codigoMunicipio || undefined,
      dataResultado: query.dataResultado === null ? undefined : query.dataResultado,
      poder: query.poder || undefined,
      esfera: query.esfera || undefined,
      idCompra: query.idCompra || undefined,
      dataCompraInicio: query.dateStart || undefined,
      dataCompraFim: query.dateEnd || undefined
    };

    if (query.catalogType === 'material' && query.codigoClasse) {
      params.codigoClasse = query.codigoClasse;
    }

    return params;
  }

  async fetchCodeData(query, code, context) {
    return this.comprasGovClient.requestDomain({
      domain: 'pesquisaPreco',
      operation: query.catalogType === 'material' ? 'material' : 'servico',
      pagina: 1,
      tamanhoPagina: query.upstreamPageSize,
      params: this.buildUpstreamParams(query, code),
      requestId: context.requestId,
      user: context.user || null,
      routeInterna: context.routeInterna || '/api/inteligencia-precos/query',
      buscarTodasPaginas: query.fetchAllPages,
      maxPaginas: query.maxPages
    });
  }

  async buildCachePayload(query, context = {}) {
    const combinedItems = [];
    const partialErrors = [];
    let fetchedRecords = 0;
    let truncated = false;

    for (const code of query.codes) {
      try {
        const result = await this.fetchCodeData(query, code, context);
        const rawItems = Array.isArray(result?.resultado) ? result.resultado : [];
        fetchedRecords += rawItems.length;

        for (const rawItem of rawItems) {
          combinedItems.push(normalizePriceItem(rawItem, query.catalogType, code));

          if (combinedItems.length >= query.maxTotalItems) {
            truncated = true;
            break;
          }
        }
      } catch (error) {
        partialErrors.push({
          code,
          message: error.message,
          statusCode: Number(error.statusCode || error.status || 500),
          errorCode: error.code || 'PRICE_INTELLIGENCE_UPSTREAM_ERROR'
        });
      }

      if (truncated) {
        break;
      }
    }

    if (!combinedItems.length && partialErrors.length > 0) {
      throw new AppError(502, 'PRICE_INTELLIGENCE_UPSTREAM_ERROR', partialErrors[0].message, { partialErrors });
    }

    const deduped = dedupeItems(combinedItems);
    const filtered = sortItems(applyLocalFilters(deduped, query), query.sort);
    const metrics = buildMetrics(filtered);
    const suppliers = buildSupplierAnalytics(filtered, query.topLimit);
    const buyers = buildBuyerAnalytics(filtered, query.topLimit);
    const modalities = buildModalidadeAnalytics(filtered, query.topLimit);
    const timeline = buildTimelineSeries(filtered);
    const geography = buildGeographyAnalytics(filtered, query.topLimit);
    const summary = buildSummary(query, metrics, suppliers, buyers, modalities, timeline);
    const meta = {
      generatedAt: this.now().toISOString(),
      source: 'Compras.gov.br - Modulo 03 Precos Praticados',
      totalFetchedBeforeFilter: fetchedRecords,
      totalAfterFilter: filtered.length,
      truncated,
      maxTotalItems: query.maxTotalItems,
      partialErrors,
      catalogType: query.catalogType,
      codes: query.codes
    };
    const insights = buildInsights(metrics, suppliers, buyers, modalities, timeline, meta);

    return {
      query: this.buildCacheIdentity(query),
      summary,
      metrics,
      suppliers,
      buyers,
      modalities,
      geography,
      timeline,
      allItems: filtered,
      insights,
      meta,
      aiReadyContext: {
        summary: summary.text,
        metrics,
        suppliers: suppliers.topByFrequency.slice(0, 5),
        buyers: buyers.topUasgs.slice(0, 5),
        timeline: timeline.byMonth.slice(-12),
        sampleItems: filtered.slice(0, 20)
      }
    };
  }

  shapeResponse(cachePayload, query, cacheInfo) {
    const page = paginate(cachePayload.allItems, query.page, query.pageSize);
    const rawItems = query.includeRaw ? cachePayload.allItems.slice(0, query.rawItemsLimit) : [];

    return {
      query: {
        ...cachePayload.query,
        page: page.number,
        pageSize: page.size,
        includeRaw: query.includeRaw
      },
      summary: cachePayload.summary,
      metrics: cachePayload.metrics,
      suppliers: cachePayload.suppliers,
      buyers: cachePayload.buyers,
      modalities: cachePayload.modalities,
      geography: cachePayload.geography,
      timeline: cachePayload.timeline,
      page,
      rawItems,
      insights: cachePayload.insights,
      cache: cacheInfo,
      meta: {
        ...cachePayload.meta,
        rawItemsReturned: rawItems.length,
        totalPages: page.totalPages
      },
      aiReadyContext: cachePayload.aiReadyContext
    };
  }

  async query(input = {}, context = {}) {
    const moduleConfig = this.getModuleConfig();
    const query = normalizeQueryInput(input, moduleConfig);
    const cacheKey = this.buildCacheKey(query);

    if (!query.forceRefresh) {
      const memoryHit = this.readMemoryCache(cacheKey);
      if (memoryHit) {
        return this.shapeResponse(memoryHit, query, {
          source: 'memory',
          memoryHit: true,
          persisted: false,
          key: cacheKey,
          fetchedAt: memoryHit.meta?.generatedAt || null,
          expiresAt: null
        });
      }

      const persistentHit = await this.readPersistentCache(cacheKey);
      if (persistentHit?.payload) {
        this.writeMemoryCache(cacheKey, persistentHit.payload, moduleConfig.cacheTtlSeconds);
        return this.shapeResponse(persistentHit.payload, query, {
          source: 'database',
          memoryHit: false,
          persisted: true,
          key: cacheKey,
          fetchedAt: persistentHit.fetchedAt,
          expiresAt: persistentHit.expiresAt
        });
      }
    }

    const cachePayload = await this.buildCachePayload(query, context);
    this.writeMemoryCache(cacheKey, cachePayload, moduleConfig.cacheTtlSeconds);
    await this.writePersistentCache(cacheKey, query, cachePayload);

    return this.shapeResponse(cachePayload, query, {
      source: 'upstream',
      memoryHit: false,
      persisted: moduleConfig.dbCacheEnabled,
      key: cacheKey,
      fetchedAt: cachePayload.meta?.generatedAt || null,
      expiresAt: null
    });
  }

  async querySingle(catalogType, code, input = {}, context = {}) {
    return this.query(
      {
        ...input,
        tipoCatalogo: catalogType,
        codigos: [code]
      },
      context
    );
  }

  async exportQuery(input = {}, format = 'csv', context = {}) {
    const normalizedFormat = String(format || 'csv')
      .trim()
      .toLowerCase();
    if (!['csv', 'xlsx', 'json'].includes(normalizedFormat)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Formato de exportacao invalido. Use csv, xlsx ou json.');
    }

    const response = await this.query(
      {
        ...input,
        includeRaw: true,
        page: 1,
        pageSize: this.getModuleConfig().maxExportItems
      },
      context
    );
    const exportItems = response.rawItems.slice(0, this.getModuleConfig().maxExportItems);

    if (normalizedFormat === 'json') {
      return {
        filename: `inteligencia-precos-${response.query.catalogType}-${Date.now()}.json`,
        contentType: 'application/json; charset=utf-8',
        body: Buffer.from(JSON.stringify(response, null, 2), 'utf8')
      };
    }

    const itemsSheet = exportItems.map((item) => ({
      Data: item.dataCompra,
      CodigoCatalogo: item.codigoItemCatalogo,
      IDItemCompra: item.idItemCompra,
      Descricao: item.descricaoItem,
      Quantidade: item.quantidade,
      PrecoUnitario: item.precoUnitario,
      Fornecedor: item.nomeFornecedor,
      CNPJFornecedor: item.niFornecedor,
      Marca: item.marca,
      CodigoUasg: item.codigoUasg,
      NomeUasg: item.nomeUasg,
      Orgao: item.nomeOrgao,
      Estado: item.estado,
      Modalidade: item.modalidadeNome,
      Poder: item.poder,
      Esfera: item.esfera
    }));

    if (normalizedFormat === 'csv') {
      return {
        filename: `inteligencia-precos-${response.query.catalogType}-${Date.now()}.csv`,
        contentType: 'text/csv; charset=utf-8',
        body: Buffer.from(`\uFEFF${buildCsv(itemsSheet)}`, 'utf8')
      };
    }

    const workbook = this.workbook.utils.book_new();
    const resumoSheet = this.workbook.utils.json_to_sheet([
      {
        Catalogo: response.query.catalogType,
        Codigos: response.query.codes.join(', '),
        TotalRegistros: response.metrics.totalRegistros,
        TotalCompras: response.metrics.totalCompras,
        TotalQuantidade: response.metrics.totalQuantidade,
        PrecoMedio: response.metrics.precoMedio,
        PrecoMediano: response.metrics.precoMediano,
        PrecoMinimo: response.metrics.precoMinimo,
        PrecoMaximo: response.metrics.precoMaximo,
        DesvioPadrao: response.metrics.desvioPadrao,
        ValorTotalEstimado: response.metrics.valorTotalEstimado,
        FornecedoresUnicos: response.metrics.fornecedoresUnicos,
        OrgaosUnicos: response.metrics.orgaosUnicos,
        UasgsUnicas: response.metrics.uasgsUnicas,
        Resumo: response.summary.text
      }
    ]);
    const fornecedoresSheet = this.workbook.utils.json_to_sheet(response.suppliers.topByFrequency);
    const orgaosSheet = this.workbook.utils.json_to_sheet(response.buyers.topUasgs);
    const timelineSheet = this.workbook.utils.json_to_sheet(response.timeline.byMonth);
    const itemsWorkbookSheet = this.workbook.utils.json_to_sheet(itemsSheet);

    this.workbook.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
    this.workbook.utils.book_append_sheet(workbook, fornecedoresSheet, 'Fornecedores');
    this.workbook.utils.book_append_sheet(workbook, orgaosSheet, 'UASGs');
    this.workbook.utils.book_append_sheet(workbook, timelineSheet, 'Evolucao');
    this.workbook.utils.book_append_sheet(workbook, itemsWorkbookSheet, 'Registros');

    return {
      filename: `inteligencia-precos-${response.query.catalogType}-${Date.now()}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: this.workbook.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx'
      })
    };
  }
}

const priceIntelligenceService = new PriceIntelligenceService();

module.exports = {
  PriceIntelligenceService,
  priceIntelligenceService,
  normalizeQueryInput,
  normalizePriceItem,
  dedupeItems,
  applyLocalFilters,
  sortItems,
  buildMetrics,
  buildSupplierAnalytics,
  buildBuyerAnalytics,
  buildModalidadeAnalytics,
  buildTimelineSeries,
  buildGeographyAnalytics,
  buildSummary,
  buildInsights,
  buildCsv
};
