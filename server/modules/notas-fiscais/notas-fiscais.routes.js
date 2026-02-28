const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { catmatObrigatorioMiddleware } = require('../../src/utils/catmatValidation');
const validate = require('../../middlewares/validate');
const controller = require('./notas-fiscais.controller');
const {
  listNotasSchema,
  idNotaSchema,
  chaveNotaSchema,
  createNotaSchema,
  updateNotaSchema
} = require('./notas-fiscais.schemas');

const router = express.Router();

router.get('/', authenticate, validate(listNotasSchema), controller.list);
router.get('/chave/:chave', authenticate, validate(chaveNotaSchema), controller.getByChave);
router.get('/:id/items', authenticate, validate(idNotaSchema), controller.getItems);
router.get('/:id', authenticate, validate(idNotaSchema), controller.getById);
router.post(
  '/',
  authenticate,
  catmatObrigatorioMiddleware('nota_fiscal_items'),
  validate(createNotaSchema),
  controller.create
);
router.put(
  '/:id',
  authenticate,
  catmatObrigatorioMiddleware('nota_fiscal_items'),
  validate(updateNotaSchema),
  controller.update
);
router.put('/:id/conferir', authenticate, validate(idNotaSchema), controller.conferir);
router.put('/:id/receber', authenticate, validate(idNotaSchema), controller.receber);
router.delete('/:id', authenticate, validate(idNotaSchema), controller.remove);

module.exports = router;
