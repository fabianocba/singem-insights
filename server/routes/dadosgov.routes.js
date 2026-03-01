const express = require('express');
const dadosGov = require('../integrations/dadosgov');

const router = express.Router();

function getStatusCode(error) {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  if (statusCode >= 400 && statusCode <= 599) {
    return statusCode;
  }
  return 500;
}

function sendError(res, req, error) {
  const statusCode = getStatusCode(error);

  return res.status(statusCode).json({
    success: false,
    status: 'error',
    code: error?.code || 'DADOSGOV_CKAN_REQUEST_ERROR',
    message: error?.message || 'Falha na integração CKAN do dados.gov.br',
    requestId: req.requestId || null,
    timestamp: new Date().toISOString(),
    externalStatus: Number(error?.statusCode || statusCode),
    details: error?.details || null
  });
}

async function execute(res, req, operation) {
  try {
    const data = await operation(req);
    return res.status(200).json({
      success: true,
      status: 'success',
      data,
      requestId: req.requestId || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return sendError(res, req, error);
  }
}

router.get('/ckan/package-search', (req, res) => execute(res, req, (request) => dadosGov.packageSearch(request)));
router.get('/ckan/package-show', (req, res) => execute(res, req, (request) => dadosGov.packageShow(request)));
router.get('/ckan/package_search', (req, res) => execute(res, req, (request) => dadosGov.packageSearch(request)));
router.get('/ckan/package_show', (req, res) => execute(res, req, (request) => dadosGov.packageShow(request)));
router.get('/ckan/health', (req, res) => execute(res, req, (request) => dadosGov.health(request)));

router.get('/ckan/resource-download', async (req, res) => {
  try {
    const file = await dadosGov.downloadResource(req);
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(file.sizeBytes || file.bodyBuffer?.length || 0));
    return res.status(200).send(file.bodyBuffer);
  } catch (error) {
    return sendError(res, req, error);
  }
});

router.get('/ckan/resource_download', async (req, res) => {
  try {
    const file = await dadosGov.downloadResource(req);
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(file.sizeBytes || file.bodyBuffer?.length || 0));
    return res.status(200).send(file.bodyBuffer);
  } catch (error) {
    return sendError(res, req, error);
  }
});

module.exports = router;
