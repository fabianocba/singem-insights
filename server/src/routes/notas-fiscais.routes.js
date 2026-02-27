const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { catmatObrigatorioMiddleware } = require('../utils/catmatValidation');
const validate = require('../middlewares/validate');
const asyncHandler = require('../middlewares/asyncHandler');
const controller = require('../controllers/notasFiscais.controller');
const {
  listNotasSchema,
  idNotaSchema,
  chaveNotaSchema,
  createNotaSchema
} = require('../validators/notasFiscais.validators');

const legacyNotasRoutes = require('../../routes/notas-fiscais.routes');

const router = express.Router();

router.get('/', authenticate, validate(listNotasSchema), asyncHandler(controller.list));
router.get('/chave/:chave', authenticate, validate(chaveNotaSchema), asyncHandler(controller.getByChave));
router.get('/:id/items', authenticate, validate(idNotaSchema), asyncHandler(controller.getItems));
router.get('/:id', authenticate, validate(idNotaSchema), asyncHandler(controller.getById));
router.post(
  '/',
  authenticate,
  catmatObrigatorioMiddleware('nota_fiscal_items'),
  validate(createNotaSchema),
  asyncHandler(controller.create)
);

router.use('/', legacyNotasRoutes);

module.exports = router;
