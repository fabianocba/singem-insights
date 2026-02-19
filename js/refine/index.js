/* index.js
 * Orquestrador: parsePdfRefined(arrayBuffer|file) -> { tipo, confidence, header, itens, totais, logs, warnings, errors, raw }
 * Tenta usar pdfjs (existente) e fallback para OCR. Executa pipeline e retorna resultado.
 */
(function (global) {
  const analyzer = global.refineAnalyzer;
  const detectors = global.refineDetectors;
  const extractHeader = global.refineExtractHeader;
  const extractItems = global.refineExtractItems;
  const extractTotals = global.refineExtractTotals;
  const normalize = global.refineNormalize;
  const validate = global.refineValidate;
  const score = global.refineScore;
  const ocr = global.refineOcrFallback;
  const RefineLogger = global.RefineLogger;

  async function textFromPdfArrayBuffer(arrayBuffer) {
    // tentativa: usar pdfjs se disponível
    const pageMap = [];
    try {
      let pdfjs = global.pdfjsLib || global.pdfjs;
      if (!pdfjs && global.window && global.window.pdfjsLib) {
        pdfjs = global.window.pdfjsLib;
      }
      if (!pdfjs) {
        throw new Error('pdfjs não encontrado');
      }
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const strings = textContent.items.map((it) => it.str).join(' ');
        pageMap.push({ page: i, text: strings });
      }
      return { pageMap, isText: true };
    } catch (e) {
      // sinaliza para usar OCR
      return { pageMap: [], isText: false, error: e.message };
    }
  }

  async function parsePdfRefined(input, options = {}) {
    const logger = new RefineLogger();
    const start = Date.now();
    let arrayBuffer = null;
    if (input instanceof ArrayBuffer) {
      arrayBuffer = input;
    } else if (input && input.arrayBuffer) {
      arrayBuffer = await input.arrayBuffer();
    } else {
      throw new Error('input deve ser ArrayBuffer ou File');
    }

    const result = {
      tipo: 'Desconhecida',
      detectorScore: null,
      confidence: 0,
      header: null,
      itens: [],
      totais: null,
      logs: [],
      warnings: [],
      errors: [],
      raw: { pageMap: [] }
    };

    const txtRes = await textFromPdfArrayBuffer(arrayBuffer);
    if (!txtRes.isText) {
      logger.warn('pdfjs.textUnavailable', { err: txtRes.error });
    }

    let pageMap = txtRes.pageMap;
    if (!txtRes.isText) {
      // o PDF pode ser imagem; tentar OCR com canvas extrator externo (se fornecido em options)
      if (options.pdfPagesCanvases) {
        try {
          pageMap = await ocr.pdfImageOcr(options.pdfPagesCanvases, options.progress, options.abortSignal);
        } catch (e) {
          logger.error('ocr.failed', { err: e.message });
        }
      } else {
        logger.warn('noOcrCanvas', 'Nenhum canvas para OCR fornecido');
      }
    }

    result.raw.pageMap = pageMap;

    // preprocess
    const pre = analyzer.preprocessPages(pageMap);
    const segments = analyzer.segmentSections(pre);

    // detect type
    const det = detectors.detectType(pre, logger);
    result.detectorScore = det.scores;
    result.tipo = det.type;

    // extract
    const h = extractHeader.extractHeader(segments.headerPages || pre, logger);
    result.header = h.raw;
    const items = extractItems.extractItems(segments.itemsCandidates || pre, logger);
    result.itens = items;
    const totals = extractTotals.extractTotals(segments.totalsCandidates || pre, logger);
    result.totais = totals;

    // normalize
    if (result.header.dataEmissao) {
      result.header.dataEmissaoISO = normalize.normalizeDate(result.header.dataEmissao);
    }
    if (result.header.cnpj) {
      result.header.cnpj = normalize.maskedCnpjCpf(result.header.cnpj);
    }
    // normalize item numbers
    result.itens = result.itens.map((it) => ({
      ...it,
      quantidade: normalize.parseNumber(it.quantidade),
      valorUnitario: normalize.parseNumber(it.valorUnitario),
      valorTotal: normalize.parseNumber(it.valorTotal)
    }));

    // validate
    try {
      if (result.header.cnpj && result.header.cnpj.digits) {
        const ok = validate.validCNPJ(result.header.cnpj.digits);
        if (!ok) {
          logger.warn('cnpj.dv', 'CNPJ falhou validação');
        }
      }
      if (result.header.chaveAcesso) {
        if (!validate.mod11Chave44(result.header.chaveAcesso)) {
          logger.warn('chave.dv', 'Chave 44 possivelmente inválida');
        }
      }
      const sumItems = result.itens.reduce((s, it) => s + (it.valorTotal || 0), 0);
      if (result.totais && typeof result.totais.vProd === 'number') {
        if (!validate.approxEqual(sumItems, result.totais.vProd, 0.6)) {
          logger.warn('sum.items.vprod', 'Soma de itens diverge de vProd');
        }
      }
    } catch (e) {
      logger.error('validation.err', { err: e.message });
    }

    // scoring
    const confMap = {};
    confMap.tipo = det.scores[det.type] || 0;
    confMap.header_numero = fieldConf(result.header.numero);
    confMap.header_data = fieldConf(result.header.dataEmissaoISO);
    confMap.header_cnpj = result.header.cnpj ? 0.9 : 0;
    confMap.itens = result.itens.length ? 0.9 : 0;
    confMap.totais = result.totais && result.totais.vNF ? 0.9 : 0;
    // aggregate
    result.confidence = score.aggregate(confMap);

    const end = Date.now();
    result.timing = { ms: end - start };
    const dump = logger.dump();
    result.logs = dump.info;
    result.warnings = dump.warnings;
    result.errors = dump.errors;
    result.anchors = dump.anchors;
    return result;
  }

  function fieldConf(v) {
    if (v === null || v === undefined) {
      return 0;
    }
    if (typeof v === 'number') {
      return 0.98;
    }
    return 0.9;
  }

  global.parsePdfRefined = parsePdfRefined;
  if (typeof module !== 'undefined') {
    module.exports = { parsePdfRefined };
  }
})(this);
