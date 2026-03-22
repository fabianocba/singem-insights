'use strict';

const crypto = require('crypto');
const XLSX = require('xlsx');

const comprasGovGateway = require('./gov-api/comprasGovGatewayService');
const { digitsOnly, safeText } = require('./gov-api/comprasGovDataNormalizer');
const { priceIntelligenceService } = require('./price-intelligence.service');
const integrationCache = require('../integrations/core/integrationCache');
const AppError = require('../utils/appError');

const CACHE_NAMESPACE = 'buyer-intelligence:query';
const CACHE_TTL_SECONDS = 30 * 60;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGES = 5;

function sha1(value) {
  return crypto
    .createHash('sha1')
    .update(String(value || ''))
    .digest('hex');
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

function normalizeCatalogType(value) {
  const normalized = String(value || 'material')
    .trim()
    .toLowerCase();
  return normalized === 'servico' || normalized === 'catser' ? 'servico' : 'material';
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

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mergeByKey(items = [], resolver) {
  const map = new Map();

  for (const item of items) {
    const key = resolver(item);
    if (!key) {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, item);
      continue;
    }

    const current = map.get(key);
    map.set(key, {
      ...current,
      ...item,
      raw: item?.raw || current?.raw || null
    });
  }

  return [...map.values()];
}

function buildSummary(query, metrics, priceContext) {
  const scopeLabel = query.entity === 'orgao' ? 'orgaos' : 'UASGs';
  const recortePreco = priceContext?.metrics?.totalRegistros
    ? ` Cruzamento com ${priceContext.metrics.totalRegistros} registro(s) de preco ativos no recorte.`
    : '';

  return {
    title: `Analise de ${scopeLabel}`,
    text:
      `${metrics.totalProfiles} ${scopeLabel} retornado(s), ${metrics.activeProfiles} ativo(s) e ${metrics.usingSisg} com uso SISG ativo.` +
      recortePreco
  };
}

function buildInsights(metrics, topBuyer, priceContext) {
  const insights = [
    {
      type: 'summary',
      text: `${metrics.totalProfiles} perfil(is) institucional(is) analisado(s).`
    }
  ];

  if (topBuyer) {
    insights.push({
      type: 'buyer',
      text: `Perfil lider no recorte: ${topBuyer.nomeUasg || topBuyer.orgao || topBuyer.codigoUasg || topBuyer.codigoOrgao}.`
    });
  }

  if (priceContext?.buyers?.topUasgs?.[0]) {
    insights.push({
      type: 'price',
      text: `No historico de preco relacionado, a UASG ${priceContext.buyers.topUasgs[0].codigoUasg || '-'} aparece em ${priceContext.buyers.topUasgs[0].totalRegistros} registro(s).`
    });
  }

  return insights;
}

function logBuyer(scope, payload = {}) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.log(`[BUYER][${scope}] ${JSON.stringify(payload)}`);
}

function normalizeQueryInput(input = {}) {
  const entity =
    String(input.entity || input.scope || 'uasg')
      .trim()
      .toLowerCase() === 'orgao'
      ? 'orgao'
      : 'uasg';
  const codigos = parseCodes(input.codigos || input.codigo || input.codigoItemCatalogo, 10);
  const codigoUasg = safeText(input.codigoUasg, 20);
  const codigoOrgao = safeText(input.codigoOrgao, 20);
  const cnpjCpfOrgao = digitsOnly(input.cnpjCpfOrgao || input.cnpjOrgao);
  const cnpjCpfOrgaoVinculado = digitsOnly(input.cnpjCpfOrgaoVinculado);
  const cnpjCpfOrgaoSuperior = digitsOnly(input.cnpjCpfOrgaoSuperior);

  if (
    !codigoUasg &&
    !codigoOrgao &&
    !cnpjCpfOrgao &&
    !cnpjCpfOrgaoVinculado &&
    !cnpjCpfOrgaoSuperior &&
    !input.siglaUf &&
    !codigos.length &&
    input.usoSisg === undefined
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Informe ao menos codigoUasg, codigoOrgao, cnpjCpfOrgao, cnpjCpfOrgaoVinculado, cnpjCpfOrgaoSuperior, siglaUf, usoSisg ou codigos para cruzamento analitico.'
    );
  }

  return {
    entity,
    codigoUasg,
    codigoOrgao,
    cnpjCpfOrgao,
    cnpjCpfOrgaoVinculado,
    cnpjCpfOrgaoSuperior,
    siglaUf: safeText(input.siglaUf || input.uf, 4).toUpperCase(),
    statusUasg: input.statusUasg === undefined ? true : parseBoolean(input.statusUasg, true),
    statusOrgao: input.statusOrgao === undefined ? undefined : parseBoolean(input.statusOrgao, true),
    usoSisg: input.usoSisg === undefined ? undefined : parseBoolean(input.usoSisg, true),
    codigos,
    tipoCatalogo: normalizeCatalogType(input.tipoCatalogo || input.tipo),
    page: clamp(input.pagina || input.page, 1, 100000, 1),
    pageSize: clamp(input.tamanhoPagina || input.pageSize, 1, 200, DEFAULT_PAGE_SIZE),
    fetchAllPages: input.buscarTodasPaginas === undefined ? true : parseBoolean(input.buscarTodasPaginas, true),
    maxPages: clamp(input.maxPaginas, 1, 20, DEFAULT_MAX_PAGES),
    includePriceContext: input.includePriceContext === undefined ? true : parseBoolean(input.includePriceContext, true),
    forceRefresh: parseBoolean(input.forceRefresh, false)
  };
}

class BuyerIntelligenceService {
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

  async lookupUasgProfiles(codes = [], context = {}) {
    const profiles = [];

    for (const code of [...new Set(codes.map((value) => digitsOnly(value)).filter(Boolean))]) {
      const result = await this.gateway.consultarUasg(
        { codigoUasg: code },
        { pagina: 1, tamanhoPagina: 10, buscarTodasPaginas: false },
        context
      );
      profiles.push(...(result?.normalized?.items || []));
    }

    return mergeByKey(profiles, (item) => item.codigoUasg);
  }

  async buildPriceContext(query, context = {}) {
    if (!query.includePriceContext || !query.codigos.length) {
      return null;
    }

    return this.priceIntelligenceService.query(
      {
        tipoCatalogo: query.tipoCatalogo,
        codigos: query.codigos,
        codigoUasg: query.codigoUasg || undefined,
        estado: query.siglaUf || undefined,
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
    logBuyer('QUERY', {
      entity: query.entity,
      codigoUasg: query.codigoUasg,
      codigoOrgao: query.codigoOrgao,
      siglaUf: query.siglaUf,
      codigos: query.codigos
    });

    let profiles = [];
    if (query.entity === 'orgao') {
      const result = await this.gateway.consultarOrgao(
        {
          codigoOrgao: query.codigoOrgao || undefined,
          cnpjCpfOrgao: query.cnpjCpfOrgao || undefined,
          siglaUf: query.siglaUf || undefined,
          statusOrgao: query.statusOrgao
        },
        {
          pagina: 1,
          tamanhoPagina: 100,
          buscarTodasPaginas: query.fetchAllPages,
          maxPaginas: query.maxPages
        },
        context
      );
      profiles = result?.normalized?.items || [];
    } else {
      const result = await this.gateway.consultarUasg(
        {
          codigoUasg: query.codigoUasg || undefined,
          usoSisg: query.usoSisg,
          cnpjCpfOrgao: query.cnpjCpfOrgao || undefined,
          cnpjCpfOrgaoVinculado: query.cnpjCpfOrgaoVinculado || undefined,
          cnpjCpfOrgaoSuperior: query.cnpjCpfOrgaoSuperior || undefined,
          siglaUf: query.siglaUf || undefined,
          statusUasg: query.statusUasg
        },
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
    if (query.codigos.length && priceContext?.buyers?.topUasgs?.length) {
      const enriched = await this.lookupUasgProfiles(
        priceContext.buyers.topUasgs.map((entry) => entry.codigoUasg),
        context
      );
      logBuyer('ENRICH', {
        requested: priceContext.buyers.topUasgs.length,
        matched: enriched.length
      });
      profiles = mergeByKey(
        profiles.concat(enriched),
        (item) => item.codigoUasg || `${normalizeText(item.orgao)}:${item.codigoOrgao || ''}`
      );
    }

    const activeProfiles = profiles.filter(
      (profile) =>
        String(profile.statusUasg || profile.statusOrgao || '').toUpperCase() !== 'INATIVA' &&
        String(profile.statusUasg || profile.statusOrgao || '').toUpperCase() !== 'INATIVO'
    ).length;
    const usingSisg = profiles.filter((profile) => profile.usoSisg === true).length;
    const metrics = {
      totalProfiles: profiles.length,
      activeProfiles,
      inactiveProfiles: Math.max(0, profiles.length - activeProfiles),
      usingSisg,
      relatedPriceRecords: Number(priceContext?.metrics?.totalRegistros || 0),
      relatedSuppliers: Number(priceContext?.metrics?.fornecedoresUnicos || 0),
      relatedPurchases: Number(priceContext?.metrics?.totalCompras || 0)
    };
    const topBuyer = profiles[0] || null;
    const summary = buildSummary(query, metrics, priceContext);
    const insights = buildInsights(metrics, topBuyer, priceContext);

    return {
      query,
      items: profiles,
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
        source: query.entity === 'orgao' ? 'Compras.gov.br - Modulo Orgao' : 'Compras.gov.br - Modulo UASG',
        relatedCodes: query.codigos
      }
    };
  }

  shapeResponse(cachePayload, query, cacheInfo) {
    const page = paginate(cachePayload.items, query.page, query.pageSize);

    return {
      focus: 'buyer',
      entity: query.entity,
      query: {
        ...query,
        page: page.number,
        pageSize: page.size
      },
      summary: cachePayload.summary,
      metrics: cachePayload.metrics,
      page,
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
        pagina: 1,
        tamanhoPagina: 500
      },
      context
    );

    if (normalizedFormat === 'json') {
      return {
        filename: `inteligencia-uasg-${Date.now()}.json`,
        contentType: 'application/json; charset=utf-8',
        body: Buffer.from(JSON.stringify(response, null, 2), 'utf8')
      };
    }

    const rows = response.page.items.map((item) => ({
      CodigoUasg: item.codigoUasg || '',
      NomeUasg: item.nomeUasg || '',
      Orgao: item.orgao || '',
      CodigoOrgao: item.codigoOrgao || '',
      CnpjCpfOrgao: item.cnpjCpfOrgao || '',
      UF: item.uf || '',
      UsoSisg: item.usoSisg === true ? 'Sim' : item.usoSisg === false ? 'Nao' : '',
      Status: item.statusUasg || item.statusOrgao || ''
    }));

    if (normalizedFormat === 'csv') {
      return {
        filename: `inteligencia-uasg-${Date.now()}.csv`,
        contentType: 'text/csv; charset=utf-8',
        body: Buffer.from(`\uFEFF${buildCsv(rows)}`, 'utf8')
      };
    }

    const workbook = this.workbook.utils.book_new();
    this.workbook.utils.book_append_sheet(workbook, this.workbook.utils.json_to_sheet(rows), 'Perfis');
    this.workbook.utils.book_append_sheet(
      workbook,
      this.workbook.utils.json_to_sheet([
        {
          TotalPerfis: response.metrics.totalProfiles,
          Ativos: response.metrics.activeProfiles,
          UsoSisg: response.metrics.usingSisg,
          PrecosRelacionados: response.metrics.relatedPriceRecords,
          FornecedoresRelacionados: response.metrics.relatedSuppliers,
          Resumo: response.summary.text
        }
      ]),
      'Resumo'
    );

    return {
      filename: `inteligencia-uasg-${Date.now()}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: this.workbook.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    };
  }
}

const buyerIntelligenceService = new BuyerIntelligenceService();

module.exports = {
  BuyerIntelligenceService,
  buyerIntelligenceService,
  normalizeBuyerQueryInput: normalizeQueryInput
};
