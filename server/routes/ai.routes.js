const express = require('express');

const { requireAdmin } = require('../middleware/auth');
const validate = require('../middlewares/validate');
const { ok } = require('../utils/httpResponse');
const aiCoreServices = require('../services/ai-core');
const aiCoreClient = require('../services/aiCoreClient');
const {
  aiSearchSchema,
  aiCatalogSearchSchema,
  aiSuggestItemSchema,
  aiSuggestFornecedorSchema,
  aiMatchEntitySchema,
  aiReportSummarySchema,
  aiFeedbackSchema,
  aiReindexSchema,
  aiClearIndexSchema
} = require('../src/validators/ai.validators');

const router = express.Router();

function buildAiContext(req) {
  return {
    requestId: req.requestId || null,
    routeInterna: req.originalUrl || req.url || '/api/ai'
  };
}

router.get('/health', async (req, res) => {
  const result = await aiCoreServices.aiCoreService.health(buildAiContext(req));
  return ok(req, res, result);
});

router.post('/search', validate(aiSearchSchema), async (req, res, next) => {
  try {
    const result = await aiCoreServices.aiCoreService.searchCatalog(req.body, buildAiContext(req));
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/catalog/search', validate(aiCatalogSearchSchema), async (req, res, next) => {
  try {
    const { query_text: queryText, ...options } = req.body;
    const result = await aiCoreServices.catalogSearchService.buscarMateriaisComRanking(
      queryText,
      options,
      buildAiContext(req)
    );
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/suggest/item', validate(aiSuggestItemSchema), async (req, res, next) => {
  try {
    const result = await aiCoreServices.aiCoreService.suggestCatalogItem(req.body, buildAiContext(req));
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/suggest/fornecedor', validate(aiSuggestFornecedorSchema), async (req, res, next) => {
  try {
    const result = await aiCoreServices.aiCoreService.suggestSupplier(req.body, buildAiContext(req));
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/match/entity', validate(aiMatchEntitySchema), async (req, res, next) => {
  try {
    const result = await aiCoreServices.entityMatchService.conciliarEntidade(req.body, buildAiContext(req));
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/report/summary', validate(aiReportSummarySchema), async (req, res, next) => {
  try {
    const result = await aiCoreServices.reportInsightService.gerarInsight(req.body, buildAiContext(req));
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
    const result = await aiCoreClient.saveFeedback(payload, buildAiContext(req));
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/index/rebuild', requireAdmin, validate(aiReindexSchema), async (req, res, next) => {
  try {
    const result = await aiCoreClient.rebuildIndex(req.body, buildAiContext(req));
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/index/clear', requireAdmin, validate(aiClearIndexSchema), async (req, res, next) => {
  try {
    const result = await aiCoreClient.clearIndex(req.body, buildAiContext(req));
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
