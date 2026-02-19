/**
 * Rotas de Integrações - SINGEM
 * CATMAT e SERPRO consolidados
 */

const express = require('express');
const catmat = require('../integrations/catmat');
const serpro = require('../integrations/serpro');

const router = express.Router();

// ============================================================================
// CATMAT
// ============================================================================

/**
 * POST /api/integrations/catmat/import - Inicia importação CATMAT
 */
router.post('/catmat/import', async (req, res) => {
  try {
    const { since } = req.body ?? {};
    const result = await catmat.importMaterials({ since });
    return res.json(result);
  } catch (err) {
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      error: err.message,
      code: err.code,
      _stub: err._stub
    });
  }
});

/**
 * GET /api/integrations/catmat/status - Status de um job
 */
router.get('/catmat/status', async (req, res) => {
  try {
    const { jobId } = req.query ?? {};
    const result = catmat.getStatus(jobId);
    if (!result) {
      return res.status(404).json({ error: 'Job não encontrado', jobId });
    }
    return res.json(result);
  } catch (err) {
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      error: err.message
    });
  }
});

/**
 * GET /api/integrations/catmat/jobs - Lista jobs recentes
 */
router.get('/catmat/jobs', async (_req, res) => {
  try {
    const jobs = catmat.listJobs();
    return res.json({ jobs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// SERPRO
// ============================================================================

/**
 * GET /api/integrations/serpro/health - Saúde do gateway
 */
router.get('/serpro/health', async (_req, res) => {
  try {
    const result = await serpro.health();
    return res.json(result);
  } catch (err) {
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      error: err.message,
      code: err.code,
      _stub: err._stub
    });
  }
});

/**
 * POST /api/integrations/serpro/test-connection - Testa conexão OAuth2
 */
router.post('/serpro/test-connection', async (_req, res) => {
  try {
    const result = await serpro.testConnection();
    return res.json(result);
  } catch (err) {
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      error: err.message,
      code: err.code,
      _stub: err._stub
    });
  }
});

/**
 * GET /api/integrations/serpro/configured - Verifica configuração
 */
router.get('/serpro/configured', async (_req, res) => {
  return res.json({ configured: serpro.isConfigured() });
});

module.exports = router;
