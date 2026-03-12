const express = require('express');

const { ok } = require('../utils/httpResponse');
const { priceIntelligenceService } = require('../services/price-intelligence.service');

const router = express.Router();

function buildContext(req) {
  return {
    requestId: req.requestId || null,
    user: req.user || null,
    routeInterna: req.originalUrl || req.url || '/api/inteligencia-precos'
  };
}

function mergeRequestData(req) {
  return {
    ...(req.query || {}),
    ...(req.body || {})
  };
}

async function execute(res, req, next, operation) {
  try {
    const data = await operation();
    return ok(req, res, data);
  } catch (error) {
    return next(error);
  }
}

async function executeExport(res, req, next, operation) {
  try {
    const exported = await operation();
    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    return res.status(200).send(exported.body);
  } catch (error) {
    return next(error);
  }
}

function registerCatalogRoutes(type, collectionPath, itemPath) {
  router.post(`/${collectionPath}`, (req, res, next) =>
    execute(res, req, next, () =>
      priceIntelligenceService.query(
        {
          ...mergeRequestData(req),
          tipoCatalogo: type
        },
        buildContext(req)
      )
    )
  );

  router.get(`/${itemPath}/:codigo`, (req, res, next) =>
    execute(res, req, next, () =>
      priceIntelligenceService.querySingle(type, req.params.codigo, mergeRequestData(req), buildContext(req))
    )
  );

  router.get(`/${itemPath}/:codigo/resumo`, (req, res, next) =>
    execute(res, req, next, async () => {
      const data = await priceIntelligenceService.querySingle(
        type,
        req.params.codigo,
        mergeRequestData(req),
        buildContext(req)
      );
      return {
        summary: data.summary,
        metrics: data.metrics,
        insights: data.insights,
        cache: data.cache,
        meta: data.meta
      };
    })
  );

  router.get(`/${itemPath}/:codigo/fornecedores`, (req, res, next) =>
    execute(res, req, next, async () => {
      const data = await priceIntelligenceService.querySingle(
        type,
        req.params.codigo,
        mergeRequestData(req),
        buildContext(req)
      );
      return data.suppliers;
    })
  );

  router.get(`/${itemPath}/:codigo/orgaos`, (req, res, next) =>
    execute(res, req, next, async () => {
      const data = await priceIntelligenceService.querySingle(
        type,
        req.params.codigo,
        mergeRequestData(req),
        buildContext(req)
      );
      return data.buyers;
    })
  );

  router.get(`/${itemPath}/:codigo/evolucao`, (req, res, next) =>
    execute(res, req, next, async () => {
      const data = await priceIntelligenceService.querySingle(
        type,
        req.params.codigo,
        mergeRequestData(req),
        buildContext(req)
      );
      return data.timeline;
    })
  );

  router.get(`/${itemPath}/:codigo/export`, (req, res, next) =>
    executeExport(res, req, next, () =>
      priceIntelligenceService.exportQuery(
        {
          ...mergeRequestData(req),
          tipoCatalogo: type,
          codigos: [req.params.codigo]
        },
        req.query.format || 'csv',
        buildContext(req)
      )
    )
  );
}

router.post('/query', (req, res, next) =>
  execute(res, req, next, () => priceIntelligenceService.query(mergeRequestData(req), buildContext(req)))
);

router.post('/query/export', (req, res, next) =>
  executeExport(res, req, next, () =>
    priceIntelligenceService.exportQuery(
      mergeRequestData(req),
      req.query.format || req.body?.format || 'csv',
      buildContext(req)
    )
  )
);

registerCatalogRoutes('material', 'materiais', 'material');
registerCatalogRoutes('servico', 'servicos', 'servico');

module.exports = router;
