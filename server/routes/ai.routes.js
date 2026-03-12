const express = require('express');

const { requireAdmin } = require('../middleware/auth');
const validate = require('../middlewares/validate');
const { ok } = require('../utils/httpResponse');
const aiCoreClient = require('../services/aiCoreClient');
const {
  aiSearchSchema,
  aiSuggestItemSchema,
  aiSuggestFornecedorSchema,
  aiMatchEntitySchema,
  aiReportSummarySchema,
  aiFeedbackSchema,
  aiReindexSchema,
  aiClearIndexSchema
} = require('../src/validators/ai.validators');

const router = express.Router();

router.get('/health', async (req, res) => {
  const result = await aiCoreClient.healthCheck({ requestId: req.requestId });
  return ok(req, res, result);
});

router.post('/search', validate(aiSearchSchema), async (req, res, next) => {
  try {
    const result = await aiCoreClient.search(req.body, { requestId: req.requestId });
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/suggest/item', validate(aiSuggestItemSchema), async (req, res, next) => {
  try {
    const result = await aiCoreClient.suggestItem(req.body, { requestId: req.requestId });
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/suggest/fornecedor', validate(aiSuggestFornecedorSchema), async (req, res, next) => {
  try {
    const result = await aiCoreClient.suggestFornecedor(req.body, { requestId: req.requestId });
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/match/entity', validate(aiMatchEntitySchema), async (req, res, next) => {
  try {
    const result = await aiCoreClient.matchEntity(req.body, { requestId: req.requestId });
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/report/summary', validate(aiReportSummarySchema), async (req, res, next) => {
  try {
    const result = await aiCoreClient.reportSummary(req.body, { requestId: req.requestId });
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/feedback', validate(aiFeedbackSchema), async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      user_id: req.body.user_id || String(req.user?.id || req.user?.login || ''),
      context: {
        ...(req.body.context || {}),
        usuario: req.user
          ? {
              id: req.user.id,
              login: req.user.login,
              perfil: req.user.perfil
            }
          : null
      }
    };
    const result = await aiCoreClient.saveFeedback(payload, { requestId: req.requestId });
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/index/rebuild', requireAdmin, validate(aiReindexSchema), async (req, res, next) => {
  try {
    const result = await aiCoreClient.rebuildIndex(req.body, { requestId: req.requestId });
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/index/clear', requireAdmin, validate(aiClearIndexSchema), async (req, res, next) => {
  try {
    const result = await aiCoreClient.clearIndex(req.body, { requestId: req.requestId });
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
