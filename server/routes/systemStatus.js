const express = require('express');

const { getSystemStatus, buildDownPayload } = require('../services/systemStatusService');
const { readVersion } = require('../utils/version');

function setHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
}

function createSystemStatusRouter({ nfeService, nfeServiceV2 }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    setHeaders(res);

    try {
      const payload = await getSystemStatus({
        requestId: req.requestId,
        nfeService,
        nfeServiceV2
      });

      return res.status(200).json(payload);
    } catch (error) {
      console.error('[system-status] error', error?.message || error);

      return res.status(200).json(buildDownPayload(readVersion()));
    }
  });

  return router;
}

module.exports = {
  createSystemStatusRouter
};
