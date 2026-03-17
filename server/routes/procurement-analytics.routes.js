const express = require('express');

const { ok } = require('../utils/httpResponse');
const { procurementAnalyticsService } = require('../services/procurement-analytics.service');

const router = express.Router();

function buildContext(req) {
  return {
    requestId: req.requestId || null,
    user: req.user || null,
    routeInterna: req.originalUrl || req.url || '/api/inteligencia-compras'
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

router.post('/query', (req, res, next) =>
  execute(res, req, next, () => procurementAnalyticsService.query(mergeRequestData(req), buildContext(req)))
);

router.post('/query/export', (req, res, next) =>
  executeExport(res, req, next, () =>
    procurementAnalyticsService.exportQuery(
      mergeRequestData(req),
      req.query.format || req.body?.format || 'csv',
      buildContext(req)
    )
  )
);

module.exports = router;
