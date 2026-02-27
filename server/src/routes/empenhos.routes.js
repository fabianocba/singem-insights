const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { catmatObrigatorioMiddleware } = require('../utils/catmatValidation');
const validate = require('../middlewares/validate');
const asyncHandler = require('../middlewares/asyncHandler');
const controller = require('../controllers/empenhos.controller');
const {
  listEmpenhosSchema,
  idEmpenhoSchema,
  slugEmpenhoSchema,
  createEmpenhoSchema,
  updateEmpenhoSchema
} = require('../validators/empenhos.validators');

const legacyEmpenhosRoutes = require('../../routes/empenhos.routes');

const router = express.Router();

router.get('/', authenticate, validate(listEmpenhosSchema), asyncHandler(controller.list));
router.get('/slug/:slug', authenticate, validate(slugEmpenhoSchema), asyncHandler(controller.getBySlug));
router.get('/:id', authenticate, validate(idEmpenhoSchema), asyncHandler(controller.getById));
router.post(
  '/',
  authenticate,
  catmatObrigatorioMiddleware('empenho_items'),
  validate(createEmpenhoSchema),
  asyncHandler(controller.create)
);
router.put(
  '/:id',
  authenticate,
  catmatObrigatorioMiddleware('empenho_items'),
  validate(updateEmpenhoSchema),
  asyncHandler(controller.update)
);
router.delete('/:id', authenticate, validate(idEmpenhoSchema), asyncHandler(controller.remove));

router.use('/', legacyEmpenhosRoutes);

module.exports = router;
