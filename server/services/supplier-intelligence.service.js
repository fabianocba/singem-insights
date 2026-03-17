'use strict';

const crypto = require('crypto');
const XLSX = require('xlsx');

const comprasGovGateway = require('./gov-api/comprasGovGatewayService');
const { digitsOnly, safeText } = require('./gov-api/comprasGovDataNormalizer');
const { priceIntelligenceService } = require('./price-intelligence.service');
const integrationCache = require('../integrations/core/integrationCache');
const AppError = require('../utils/appError');

const CACHE_NAMESPACE = 'supplier-intelligence:query';
const CACHE_TTL_SECONDS = 30 * 60;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGES = 5;
const DEFAULT_TOP_LIMIT = 10;

function sha1(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(parsed, max));
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (value === true || value === false) {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function diceCoefficient(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  if (a.length < 2 || b.length < 2) {
    return 0;
  }

  const pairs = new Map();
  for (let index = 0; index < a.length - 1; index += 1) {
    const pair = a.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) || 0) + 1);
  }

  let intersection = 0;
  for (let index = 0; index < b.length - 1; index += 1) {
    const pair = b.slice(index, index + 2);
    const count = pairs.get(pair) || 0;
    if (count > 0) {
      pairs.set(pair, count - 1);
      intersection += 1;
    }
  }

  return (2 * intersection) / (a.length + b.length - 2);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function parseCodes(value, maxItems = 10) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(/[;,\n]+/);
  const values = [];
  const seen = new Set();

  for (const raw of rawValues) {
    const normalized = digitsOnly(raw);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    values.push(normalized);
    if (values.length >= maxItems) {
      break;
    }
  }

  return values;
}

function normalizeCatalogType(value) {
  const normalized = String(value || 'material').trim().toLowerCase();
  return normalized === 'servico' || normalized === 'catser' ? 'servico' : 'material';
}

function paginate(items = [], page, pageSize) {
  const totalItems = items.length;
  const size = clamp(pageSize, 1, 200, DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const number = clamp(page, 1, totalPages, 1);
  const offset = (number - 1) * size;

  return {
    items: items.slice(offset, offset + size),
    number,
    size,
    totalItems,
    totalPages
  };
}

function buildCsv(rows = []) {
  if (!rows.length) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(';')];

  for (const row of rows) {
    csvRows.push(
      headers
        .map((header) => {
          const value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(';')
    );
  }

  return csvRows.join('\n');
}

function buildDocumentParams(document) {
  const digits = digitsOnly(document);
  if (!digits) {
    return null;
  }

  return digits.length === 11 ? { cpf: digits } : { cnpj: digits };
}

function scoreProfileName(queryText, profile) {
  const normalizedQuery = normalizeText(queryText);
  if (!normalizedQuery) {
    return 1;
  }

  const tokens = tokenize(normalizedQuery);
  const name = normalizeText(profile?.nomeFornecedor);
  const nameTokens = new Set(tokenize(name));
  const coverage = tokens.length ? tokens.filter((token) => nameTokens.has(token)).length / tokens.length : 0;
  const prefix = name.startsWith(normalizedQuery) ? 1 : 0;
  const phrase = name.includes(normalizedQuery) ? 1 : 0;
  const fuzzy = diceCoefficient(normalizedQuery, name);

  return Number((prefix * 0.35 + phrase * 0.25 + coverage * 0.25 + fuzzy * 0.15).toFixed(4));
}

function filterAndSortProfiles(profiles = [], queryText) {
  if (!queryText) {
    return profiles;
  }

  return profiles
    .map((profile) => ({
      profile,
      score: scoreProfileName(queryText, profile)
    }))
    .filter((entry) => entry.score > 0.15)
    .sort((left, right) => right.score - left.score || String(left.profile.nomeFornecedor || '').localeCompare(String(right.profile.nomeFornecedor || ''), 'pt-BR'))
    .map((entry) => entry.profile);
}

function mergeProfiles(primary = [], extra = []) {
  const map = new Map();

  for (const profile of [...primary, ...extra]) {
    const key = String(profile?.cnpjCpf || '').trim() || normalizeText(profile?.nomeFornecedor);
    if (!key) {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, profile);
      continue;
    }

    const current = map.get(key);
    map.set(key, {
      ...current,
      ...profile,
      raw: profile?.raw || current?.raw || null
    });
  }

  return [...map.values()];
}

function detectDuplicates(profiles = []) {
  const groups = new Map();

  for (const profile of profiles) {
    const nameKey = normalizeText(profile?.nomeFornecedor);
    if (!nameKey) {
      continue;
    }

    const current = groups.get(nameKey) || [];
    current.push(profile);
    groups.set(nameKey, current);
  }

  return [...groups.entries()]
    .filter(([, entries]) => unique(entries.map((entry) => entry.cnpjCpf)).length > 1)
    .map(([normalizedName, entries]) => ({
      normalizedName,
      documentos: unique(entries.map((entry) => entry.cnpjCpf)),
      perfis: entries
    }));
}

function buildSummary(query, metrics, priceContext) {
  const title = `Analise de fornecedor${metrics.totalProfiles === 1 ? '' : 'es'}`;
  const recortePreco = priceContext?.metrics?.totalRegistros
    ? ` Cruza ${priceContext.metrics.totalRegistros} registro(s) de preco com ${priceContext.metrics.totalCompras} compra(s) relacionada(s).`
    : '';

  return {
    title,
    text:
      `${metrics.totalProfiles} perfil(is) retornado(s), ${metrics.activeProfiles} ativo(s) e ${metrics.duplicateGroups} grupo(s) potencialmente duplicado(s).` +
      recortePreco +
      (query.nomeFornecedor ? ` Matching local aplicado para "${query.nomeFornecedor}".` : '')
  };
}

function buildInsights(metrics, duplicates = [], priceContext = null) {
  const insights = [];

  insights.push({
    type: 'summary',
    text: `${metrics.totalProfiles} fornecedor(es) analisado(s) no recorte atual.`
  });

  if (duplicates[0]) {
    insights.push({
      type: 'duplicate',
      text: `Possivel duplicidade cadastral para ${duplicates[0].perfis[0]?.nomeFornecedor || 'fornecedor'} com ${duplicates[0].documentos.length} documento(s) distinto(s).`
    });
  }

  if (priceContext?.suppliers?.topByFrequency?.[0]) {
    insights.push({
      type: 'price',
      text: `No historico de preco relacionado, ${priceContext.suppliers.topByFrequency[0].nomeFornecedor} lidera em frequencia com ${priceContext.suppliers.topByFrequency[0].totalRegistros} registro(s).`
    });
  }

  return insights;
}

function logSupplier(scope, payload = {}) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.log(`[SUPPLIER][${scope}] ${JSON.stringify(payload)}`);
}

function resolveSupplierNameInput(input = {}) {
  return safeText(input.nomeFornecedor || input.nome || input.query || input.fornecedor, 180);
}

function resolveSupplierCodesInput(input = {}) {
  return parseCodes(input.codigos || input.codigo || input.codigoItemCatalogo, 10);
}

function hasSupplierSeedFilters(query = {}) {
  return Boolean(
    query.cnpj ||
      query.cpf ||
      query.codigos?.length ||
      query.nomeFornecedor ||
      query.naturezaJuridicaId ||
      query.porteEmpresaId ||
      query.codigoCnae
  );
}

function requiresOfficialSupplierFilter(query = {}) {
  return Boolean(
    query.nomeFornecedor &&
      !query.codigos?.length &&
      !query.cnpj &&
      !query.cpf &&
      !query.naturezaJuridicaId &&
      !query.porteEmpresaId &&
      !query.codigoCnae
  );
}

function normalizeQueryInput(input = {}) {
  const cnpj = digitsOnly(input.cnpj);
  const cpf = digitsOnly(input.cpf);
  const nomeFornecedor = resolveSupplierNameInput(input);
  const codigos = resolveSupplierCodesInput(input);
  const active = input.ativo === undefined ? true : parseBoolean(input.ativo, true);
  const query = {
    cnpj,
    cpf,
    nomeFornecedor,
    naturezaJuridicaId: safeText(input.naturezaJuridicaId, 30),
    porteEmpresaId: safeText(input.porteEmpresaId, 30),
    codigoCnae: safeText(input.codigoCnae, 30),
    ativo: active,
    codigos,
    tipoCatalogo: normalizeCatalogType(input.tipoCatalogo || input.tipo),
    codigoUasg: safeText(input.codigoUasg, 20),
    estado: safeText(input.estado, 4).toUpperCase(),
    page: clamp(input.pagina || input.page, 1, 100000, 1),
    pageSize: clamp(input.tamanhoPagina || input.pageSize, 1, 200, DEFAULT_PAGE_SIZE),
    fetchAllPages: input.buscarTodasPaginas === undefined ? true : parseBoolean(input.buscarTodasPaginas, true),
    maxPages: clamp(input.maxPaginas, 1, 20, DEFAULT_MAX_PAGES),
    includePriceContext: input.includePriceContext === undefined ? true : parseBoolean(input.includePriceContext, true),
    topLimit: clamp(input.topLimit, 1, 20, DEFAULT_TOP_LIMIT),
    forceRefresh: parseBoolean(input.forceRefresh, false)
  };

  if (!hasSupplierSeedFilters(query)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Informe ao menos cnpj, cpf, naturezaJuridicaId, porteEmpresaId, codigoCnae ou codigos para cruzamento analitico.'
    );
  }

  if (requiresOfficialSupplierFilter(query)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Busca por nome semelhante exige codigos de preco relacionados ou outro filtro oficial do modulo fornecedor.'
    );
  }

  return query;
}

class SupplierIntelligenceService {
  constructor(options = {}) {
    this.gateway = options.gateway || comprasGovGateway;
    this.priceIntelligenceService = options.priceIntelligenceService || priceIntelligenceService;
    this.cache = options.cache || integrationCache;
    this.workbook = options.workbook || XLSX;
  }

  buildCacheKey(query) {
    return sha1(JSON.stringify(query));
  }

  readCache(cacheKey) {
    return this.cache.get(CACHE_NAMESPACE, cacheKey);
  }

  writeCache(cacheKey, payload) {
    this.cache.set(CACHE_NAMESPACE, cacheKey, payload, CACHE_TTL_SECONDS);
  }

  async lookupProfiles(documents = [], context = {}) {
    const items = [];

    for (const document of unique(documents.map(digitsOnly))) {
      const params = buildDocumentParams(document);
      if (!params) {
        continue;
      }

      const result = await this.gateway.consultarFornecedor(
        params,
        {
          pagina: 1,
          tamanhoPagina: 10,
          buscarTodasPaginas: false
        },
        context
      );

      items.push(...(result?.normalized?.items || []));
    }

    return mergeProfiles(items, []);
  }

  async buildPriceContext(query, context = {}) {
    if (!query.includePriceContext || !query.codigos.length) {
      return null;
    }

    return this.priceIntelligenceService.query(
      {
        tipoCatalogo: query.tipoCatalogo,
        codigos: query.codigos,
        fornecedor: query.cnpj || query.cpf || query.nomeFornecedor || undefined,
        codigoUasg: query.codigoUasg || undefined,
        estado: query.estado || undefined,
        includeRaw: false,
        pagina: 1,
        tamanhoPagina: 50
      },
      {
        ...context,
        routeInterna: context.routeInterna || '/api/inteligencia-compras/query'
      }
    );
  }

  async buildCachePayload(query, context = {}) {
    logSupplier('QUERY', {
      cnpj: query.cnpj,
      cpf: query.cpf,
      nomeFornecedor: query.nomeFornecedor,
      codigos: query.codigos,
      ativo: query.ativo
    });

    const gatewayParams = {
      cnpj: query.cnpj || undefined,
      cpf: query.cpf || undefined,
      naturezaJuridicaId: query.naturezaJuridicaId || undefined,
      porteEmpresaId: query.porteEmpresaId || undefined,
      codigoCnae: query.codigoCnae || undefined,
      ativo: query.ativo
    };

    let profiles = [];
    const hasOfficialFilters = Object.values(gatewayParams).some((value) => value !== undefined && value !== null && value !== '');
    if (hasOfficialFilters) {
      const result = await this.gateway.consultarFornecedor(
        gatewayParams,
        {
          pagina: 1,
          tamanhoPagina: 100,
          buscarTodasPaginas: query.fetchAllPages,
          maxPaginas: query.maxPages
        },
        context
      );
      profiles = result?.normalized?.items || [];
    }

    const priceContext = await this.buildPriceContext(query, context);
    if (query.codigos.length && priceContext?.page?.items?.length) {
      const candidateDocs = priceContext.page.items
        .map((item) => item?.niFornecedor)
        .filter(Boolean);
      const candidateProfiles = await this.lookupProfiles(candidateDocs, context);
      profiles = mergeProfiles(profiles, candidateProfiles);
    }

    if (query.nomeFornecedor) {
      logSupplier('MATCH', {
        nomeFornecedor: query.nomeFornecedor,
        candidatos: profiles.length
      });
      profiles = filterAndSortProfiles(profiles, query.nomeFornecedor);
    }

    const duplicates = detectDuplicates(profiles);
    const activeProfiles = profiles.filter((profile) => profile.ativo !== false).length;
    const metrics = {
      totalProfiles: profiles.length,
      activeProfiles,
      inactiveProfiles: Math.max(0, profiles.length - activeProfiles),
      duplicateGroups: duplicates.length,
      relatedPriceRecords: Number(priceContext?.metrics?.totalRegistros || 0),
      relatedPurchases: Number(priceContext?.metrics?.totalCompras || 0),
      relatedUasgs: Number(priceContext?.metrics?.uasgsUnicas || 0)
    };
    const summary = buildSummary(query, metrics, priceContext);
    const insights = buildInsights(metrics, duplicates, priceContext);

    return {
      query,
      items: profiles,
      duplicates,
      summary,
      metrics,
      priceContext,
      insights,
      aiReadyContext: {
        summary: summary.text,
        metrics,
        sampleProfiles: profiles.slice(0, 10),
        relatedPriceMetrics: priceContext?.metrics || null
      },
      meta: {
        generatedAt: new Date().toISOString(),
        source: 'Compras.gov.br - Modulo Fornecedor',
        hasOfficialFilters,
        relatedCodes: query.codigos
      }
    };
  }

  shapeResponse(cachePayload, query, cacheInfo) {
    const page = paginate(cachePayload.items, query.page, query.pageSize);

    return {
      focus: 'supplier',
      query: {
        ...query,
        page: page.number,
        pageSize: page.size
      },
      summary: cachePayload.summary,
      metrics: cachePayload.metrics,
      page,
      duplicates: cachePayload.duplicates,
      priceContext: cachePayload.priceContext,
      insights: cachePayload.insights,
      cache: cacheInfo,
      meta: {
        ...cachePayload.meta,
        totalPages: page.totalPages
      },
      aiReadyContext: cachePayload.aiReadyContext
    };
  }

  async query(input = {}, context = {}) {
    const query = normalizeQueryInput(input);
    const cacheKey = this.buildCacheKey(query);

    if (!query.forceRefresh) {
      const cached = this.readCache(cacheKey);
      if (cached) {
        return this.shapeResponse(cached, query, {
          source: 'memory',
          key: cacheKey,
          fetchedAt: cached.meta?.generatedAt || null
        });
      }
    }

    const cachePayload = await this.buildCachePayload(query, context);
    this.writeCache(cacheKey, cachePayload);
    return this.shapeResponse(cachePayload, query, {
      source: 'upstream',
      key: cacheKey,
      fetchedAt: cachePayload.meta?.generatedAt || null
    });
  }

  async querySingle(document, input = {}, context = {}) {
    const digits = digitsOnly(document);
    if (!digits) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Documento do fornecedor invalido.');
    }

    return this.query(
      {
        ...input,
        ...(digits.length === 11 ? { cpf: digits } : { cnpj: digits })
      },
      context
    );
  }

  async exportQuery(input = {}, format = 'csv', context = {}) {
    const normalizedFormat = String(format || 'csv').trim().toLowerCase();
    if (!['csv', 'xlsx', 'json'].includes(normalizedFormat)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Formato de exportacao invalido. Use csv, xlsx ou json.');
    }

    const response = await this.query(
      {
        ...input,
        pagina: 1,
        tamanhoPagina: 500
      },
      context
    );

    if (normalizedFormat === 'json') {
      return {
        filename: `inteligencia-fornecedor-${Date.now()}.json`,
        contentType: 'application/json; charset=utf-8',
        body: Buffer.from(JSON.stringify(response, null, 2), 'utf8')
      };
    }

    const rows = response.page.items.map((item) => ({
      Documento: item.cnpjCpf,
      NomeFornecedor: item.nomeFornecedor,
      NaturezaJuridica: item.naturezaJuridica,
      NaturezaJuridicaId: item.naturezaJuridicaId,
      PorteEmpresa: item.porteEmpresa,
      PorteEmpresaId: item.porteEmpresaId,
      CodigoCnae: item.codigoCnae,
      Ativo: item.ativo ? 'Sim' : 'Nao'
    }));

    if (normalizedFormat === 'csv') {
      return {
        filename: `inteligencia-fornecedor-${Date.now()}.csv`,
        contentType: 'text/csv; charset=utf-8',
        body: Buffer.from(`\uFEFF${buildCsv(rows)}`, 'utf8')
      };
    }

    const workbook = this.workbook.utils.book_new();
    this.workbook.utils.book_append_sheet(workbook, this.workbook.utils.json_to_sheet(rows), 'Fornecedores');
    this.workbook.utils.book_append_sheet(
      workbook,
      this.workbook.utils.json_to_sheet([
        {
          TotalPerfis: response.metrics.totalProfiles,
          Ativos: response.metrics.activeProfiles,
          Duplicidades: response.metrics.duplicateGroups,
          PrecosRelacionados: response.metrics.relatedPriceRecords,
          ComprasRelacionadas: response.metrics.relatedPurchases,
          Resumo: response.summary.text
        }
      ]),
      'Resumo'
    );

    return {
      filename: `inteligencia-fornecedor-${Date.now()}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: this.workbook.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    };
  }
}

const supplierIntelligenceService = new SupplierIntelligenceService();

module.exports = {
  SupplierIntelligenceService,
  supplierIntelligenceService,
  normalizeSupplierQueryInput: normalizeQueryInput
};
