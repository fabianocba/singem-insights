const express = require('express');

const { getSystemStatus } = require('../services/health/systemHealth');

function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function createSystemStatusRouter({ nodeEnv, nfeService, nfeServiceV2 }) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    const cleanUrl = String(req.originalUrl || '').split('?')[0];
    if (cleanUrl.endsWith('/')) {
      return next();
    }

    setNoCacheHeaders(res);

    const payload = await getSystemStatus({
      requestId: req.requestId,
      nfeService,
      nfeServiceV2,
      nodeEnv
    });

    if (nodeEnv === 'production' && payload?.error) {
      delete payload.error;
    }

    return res.json(payload);
  });

  return router;
}

module.exports = {
  createSystemStatusRouter
};
