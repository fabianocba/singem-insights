const test = require('node:test');
const assert = require('node:assert/strict');

const AppError = require('../utils/appError');
const {
  PriceIntelligenceService,
  normalizeQueryInput,
  normalizePriceItem
} = require('../services/price-intelligence.service');

const MODULE_CONFIG = {
  maxCodesPerQuery: 10,
  maxAutoPages: 12,
  upstreamPageSize: 100,
  maxTotalItems: 5000,
  maxReturnedRawItems: 2000,
  maxExportItems: 10000,
  topLimit: 10
};

function createCacheMock() {
  const storage = new Map();
  return {
    get(namespace, key) {
      return storage.get(`${namespace}:${key}`) || null;
    },
    set(namespace, key, payload) {
      storage.set(`${namespace}:${key}`, payload);
    }
  };
}

function createDbMock() {
  return {
    writes: [],
    async query(sql, params) {
      if (/SELECT\s+normalized_payload/i.test(sql)) {
        return { rows: [] };
      }

      this.writes.push({ sql, params });
      return { rows: [] };
    }
  };
}

function createWorkbookMock() {
  return {
    utils: {
      book_new() {
        return { sheets: [] };
      },
      json_to_sheet(rows) {
        return rows;
      },
      book_append_sheet(workbook, sheet, name) {
        workbook.sheets.push({ name, sheet });
      }
    },
    write(workbook) {
      return Buffer.from(`mock-xlsx:${workbook.sheets.length}`, 'utf8');
    }
  };
}

function buildRawItem(overrides = {}) {
  return {
    idCompra: 'COMPRA-001',
    numeroItemCompra: 1,
    descricaoItem: 'Papel A4 75g',
    codigoItemCatalogo: '233420',
    siglaUnidadeMedida: 'UN',
    nomeUnidadeFornecimento: 'PACOTE',
    siglaUnidadeFornecimento: 'PCT',
    capacidadeUnidadeFornecimento: 500,
    quantidade: 20,
    precoUnitario: 12.5,
    niFornecedor: '12345678000190',
    nomeFornecedor: 'Fornecedor Alpha Ltda',
    marca: 'Marca X',
    codigoUasg: '158129',
    nomeUasg: 'IF Baiano - Guanambi',
    estado: 'BA',
    dataCompra: '2025-01-10',
    modalidade: 5,
    forma: 'Pregao',
    ...overrides
  };
}

function createServiceHarness({ resultsByCode = {}, errorsByCode = {}, dbCacheEnabled = false } = {}) {
  const cache = createCacheMock();
  const db = createDbMock();
  const calls = { count: 0 };

  const comprasGovClient = {
    async requestDomain(payload) {
      calls.count += 1;
      const code = String(payload?.params?.codigoItemCatalogo || '');

      if (errorsByCode[code]) {
        throw errorsByCode[code];
      }

      return {
        resultado: Array.isArray(resultsByCode[code]) ? resultsByCode[code] : []
      };
    }
  };

  const service = new PriceIntelligenceService({
    comprasGovClient,
    cache,
    db,
    workbook: createWorkbookMock(),
    now: () => new Date('2026-03-12T12:00:00.000Z')
  });

  service.getModuleConfig = () => ({
    cacheTtlSeconds: 120,
    dbCacheEnabled,
    dbCacheTtlSeconds: 1200,
    maxCodesPerQuery: 10,
    upstreamPageSize: 100,
    maxAutoPages: 12,
    maxTotalItems: 5000,
    maxReturnedRawItems: 2000,
    maxExportItems: 10000,
    topLimit: 10
  });

  return { service, calls, db };
}

test('normalizeQueryInput parseia codigos e periodo por ano/mes', () => {
  const query = normalizeQueryInput(
    {
      tipoCatalogo: 'material',
      codigos: '233420, 233421',
      ano: '2025',
      mes: '2',
      ordenacao: 'preco-asc',
      pagina: 2,
      tamanhoPagina: 50
    },
    MODULE_CONFIG
  );

  assert.equal(query.catalogType, 'material');
  assert.deepEqual(query.codes, ['233420', '233421']);
  assert.equal(query.dateStart, '2025-02-01');
  assert.equal(query.dateEnd, '2025-02-28');
  assert.equal(query.sort, 'preco-asc');
  assert.equal(query.page, 2);
  assert.equal(query.pageSize, 50);
});

test('normalizeQueryInput exige codigo valido', () => {
  assert.throws(
    () => normalizeQueryInput({ tipoCatalogo: 'material' }, MODULE_CONFIG),
    (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR'
  );
});

test('normalizePriceItem interpreta numeros em string sem distorcer decimais', () => {
  const normalized = normalizePriceItem(
    buildRawItem({
      precoUnitario: '12.5',
      quantidade: '1.250',
      capacidadeUnidadeFornecimento: '500,5'
    }),
    'material',
    '233420'
  );

  assert.equal(normalized.precoUnitario, 12.5);
  assert.equal(normalized.quantidade, 1250);
  assert.equal(normalized.capacidadeUnidadeFornecimento, 500.5);
});

test('query consolida resposta e reutiliza cache em memoria', async () => {
  const rawA = buildRawItem();
  const rawB = buildRawItem({
    idCompra: 'COMPRA-002',
    numeroItemCompra: 2,
    precoUnitario: 10.2,
    quantidade: 12,
    dataCompra: '2025-02-05',
    nomeFornecedor: 'Fornecedor Beta SA',
    niFornecedor: '98765432000110',
    codigoUasg: '158130'
  });

  const { service, calls } = createServiceHarness({
    resultsByCode: {
      233420: [rawA, rawB]
    }
  });

  const input = {
    tipoCatalogo: 'material',
    codigos: '233420',
    pagina: 1,
    tamanhoPagina: 10
  };

  const first = await service.query(input, { requestId: 'req-1' });
  assert.equal(first.cache.source, 'upstream');
  assert.equal(first.metrics.totalRegistros, 2);
  assert.equal(first.page.items.length, 2);
  assert.equal(calls.count, 1);

  const second = await service.query(input, { requestId: 'req-2' });
  assert.equal(second.cache.source, 'memory');
  assert.equal(second.metrics.totalRegistros, 2);
  assert.equal(calls.count, 1);
});

test('query retorna resumo consistente quando nao ha resultados', async () => {
  const { service } = createServiceHarness({
    resultsByCode: {
      233420: []
    }
  });

  const response = await service.query({
    tipoCatalogo: 'material',
    codigos: '233420',
    pagina: 1,
    tamanhoPagina: 10
  });

  assert.equal(response.metrics.totalRegistros, 0);
  assert.equal(response.page.totalItems, 0);
  assert.equal(response.page.items.length, 0);
  assert.ok(Array.isArray(response.insights));
  assert.ok(
    response.insights.some((insight) =>
      String(insight?.text || '')
        .toLowerCase()
        .includes('nenhum preco praticado')
    )
  );
});

test('query propaga erro padronizado quando todos os codigos falham no upstream', async () => {
  const timeoutError = new Error('timeout no upstream');
  timeoutError.code = 'COMPRASGOV_TIMEOUT';
  timeoutError.statusCode = 504;

  const { service } = createServiceHarness({
    errorsByCode: {
      233420: timeoutError
    }
  });

  await assert.rejects(
    service.query({
      tipoCatalogo: 'material',
      codigos: '233420',
      pagina: 1,
      tamanhoPagina: 10
    }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 502 &&
      error.code === 'PRICE_INTELLIGENCE_UPSTREAM_ERROR' &&
      Array.isArray(error.details?.partialErrors)
  );
});

test('exportQuery gera CSV, JSON e XLSX com contrato esperado', async () => {
  const { service } = createServiceHarness();

  service.query = async () => ({
    query: {
      catalogType: 'material',
      codes: ['233420']
    },
    summary: {
      text: 'Resumo sintetico de teste.'
    },
    metrics: {
      totalRegistros: 1,
      totalCompras: 1,
      totalQuantidade: 20,
      precoMedio: 12.5,
      precoMediano: 12.5,
      precoMinimo: 12.5,
      precoMaximo: 12.5,
      desvioPadrao: null,
      valorTotalEstimado: 250,
      fornecedoresUnicos: 1,
      orgaosUnicos: 1,
      uasgsUnicas: 1
    },
    suppliers: { topByFrequency: [] },
    buyers: { topUasgs: [] },
    timeline: { byMonth: [] },
    rawItems: [
      {
        dataCompra: '2025-01-10',
        codigoItemCatalogo: '233420',
        idItemCompra: 'COMPRA-001-0001',
        descricaoItem: 'Papel A4 75g',
        quantidade: 20,
        precoUnitario: 12.5,
        nomeFornecedor: 'Fornecedor Alpha Ltda',
        niFornecedor: '12345678000190',
        marca: 'Marca X',
        codigoUasg: '158129',
        nomeUasg: 'IF Baiano - Guanambi',
        nomeOrgao: 'IF Baiano',
        estado: 'BA',
        modalidadeNome: 'Pregao',
        poder: 'Executivo',
        esfera: 'Federal'
      }
    ]
  });

  const csv = await service.exportQuery({ tipoCatalogo: 'material', codigos: '233420' }, 'csv');
  assert.match(csv.filename, /\.csv$/);
  assert.equal(csv.contentType, 'text/csv; charset=utf-8');
  assert.ok(Buffer.isBuffer(csv.body));
  assert.ok(csv.body.toString('utf8').includes('CodigoCatalogo'));

  const json = await service.exportQuery({ tipoCatalogo: 'material', codigos: '233420' }, 'json');
  assert.match(json.filename, /\.json$/);
  assert.equal(json.contentType, 'application/json; charset=utf-8');
  assert.ok(Buffer.isBuffer(json.body));
  assert.ok(json.body.toString('utf8').includes('Resumo sintetico de teste'));

  const xlsx = await service.exportQuery({ tipoCatalogo: 'material', codigos: '233420' }, 'xlsx');
  assert.match(xlsx.filename, /\.xlsx$/);
  assert.match(xlsx.contentType, /spreadsheetml\.sheet/);
  assert.ok(Buffer.isBuffer(xlsx.body));
  assert.ok(xlsx.body.toString('utf8').includes('mock-xlsx'));
});

test('exportQuery valida formato permitido', async () => {
  const { service } = createServiceHarness();

  await assert.rejects(
    service.exportQuery({ tipoCatalogo: 'material', codigos: '233420' }, 'xml'),
    (error) => error instanceof AppError && error.statusCode === 400 && error.code === 'VALIDATION_ERROR'
  );
});

test('[PATH 2] normalizeQueryInput agora padroa includeRaw=false (otimizacao de payload)', () => {
  const query = normalizeQueryInput(
    {
      tipoCatalogo: 'material',
      codigos: '233420'
      // note: sem includeRaw => deve ser false agora
    },
    MODULE_CONFIG
  );

  assert.equal(query.includeRaw, false, 'Padrao deve ser false para payload leve');
});

test('[PATH 2] normalizeQueryInput respeita includeRaw=true quando passado explicitamente', () => {
  const queryWithRaw = normalizeQueryInput(
    {
      tipoCatalogo: 'material',
      codigos: '233420',
      includeRaw: 'true'
    },
    MODULE_CONFIG
  );

  assert.equal(queryWithRaw.includeRaw, true, 'Deve respeitar includeRaw=true explicito');

  const queryWithoutRaw = normalizeQueryInput(
    {
      tipoCatalogo: 'material',
      codigos: '233420',
      includeRaw: 'false'
    },
    MODULE_CONFIG
  );

  assert.equal(queryWithoutRaw.includeRaw, false, 'Deve respeitar includeRaw=false explicito');
});

test('[PATH 2] shapeResponse retorna array vazio em rawItems quando includeRaw=false', async () => {
  const { service } = createServiceHarness({
    resultsByCode: {
      233420: [buildRawItem(), buildRawItem({ idCompra: 'COMPRA-002', precoUnitario: 11.0 })]
    }
  });

  // Sem includeRaw (padrao false)
  const response = await service.query({
    tipoCatalogo: 'material',
    codigos: '233420',
    pagina: 1,
    tamanhoPagina: 10
    // note: sem includeRaw => false
  });

  assert.equal(response.rawItems.length, 0, 'rawItems deve estar vazio quando includeRaw=false');
  assert.ok(response.metrics.totalRegistros > 0, 'Metricas ainda devem ser retornadas');
  assert.ok(
    response.suppliers && typeof response.suppliers === 'object',
    'Analytics (suppliers) devem estar disponiveis'
  );
  assert.ok(response.metrics, 'Métricas devem estar disponiveis');
});

test('[PATH 2] shapeResponse retorna rawItems quando includeRaw=true explicitamente', async () => {
  const { service } = createServiceHarness({
    resultsByCode: {
      233420: [buildRawItem(), buildRawItem({ idCompra: 'COMPRA-002', precoUnitario: 11.0 })]
    }
  });

  // Com includeRaw=true explicito
  const response = await service.query({
    tipoCatalogo: 'material',
    codigos: '233420',
    pagina: 1,
    tamanhoPagina: 10,
    includeRaw: 'true'
  });

  assert.ok(response.rawItems.length > 0, 'rawItems deve estar preenchido quando includeRaw=true');
  assert.equal(response.query.includeRaw, true);
});
