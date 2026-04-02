const express = require('express');
const { authenticate } = require('../../../middleware/auth');
const { catmatObrigatorioMiddleware } = require('../../utils/catmatValidation');
const validate = require('../../../middlewares/validate');
const controller = require('./empenhos.controller');
const {
  listEmpenhosSchema,
  idEmpenhoSchema,
  slugEmpenhoSchema,
  createEmpenhoSchema,
  updateEmpenhoSchema,
  syncEmpenhosSchema
} = require('./empenhos.validation');

const router = express.Router();

router.get('/', authenticate, validate(listEmpenhosSchema), controller.list);
router.get('/slug/:slug', authenticate, validate(slugEmpenhoSchema), controller.getBySlug);
router.get('/:id', authenticate, validate(idEmpenhoSchema), controller.getById);
router.post(
  '/',
  authenticate,
  catmatObrigatorioMiddleware('empenho_items'),
  validate(createEmpenhoSchema),
  controller.create
);
router.put(
  '/:id',
  authenticate,
  catmatObrigatorioMiddleware('empenho_items'),
  validate(updateEmpenhoSchema),
  controller.update
);
router.delete('/:id', authenticate, validate(idEmpenhoSchema), controller.remove);
router.post('/sync', authenticate, validate(syncEmpenhosSchema), controller.sync);

module.exports = router;
