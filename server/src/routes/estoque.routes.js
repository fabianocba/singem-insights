const express = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../middlewares/validate');
const asyncHandler = require('../middlewares/asyncHandler');
const controller = require('../controllers/estoque.controller');
const {
  listSaldosSchema,
  saldoByMaterialSchema,
  listMovimentosSchema,
  createMovimentoSchema,
  listMateriaisSchema,
  createMaterialSchema,
  updateMaterialSchema
} = require('../validators/estoque.validators');

const router = express.Router();

router.get('/saldos', authenticate, validate(listSaldosSchema), asyncHandler(controller.listSaldos));
router.get(
  '/saldos/:materialId',
  authenticate,
  validate(saldoByMaterialSchema),
  asyncHandler(controller.getSaldoByMaterial)
);
router.get('/movimentos', authenticate, validate(listMovimentosSchema), asyncHandler(controller.listMovimentos));
router.post('/movimentos', authenticate, validate(createMovimentoSchema), asyncHandler(controller.createMovimento));
router.get('/materiais', authenticate, validate(listMateriaisSchema), asyncHandler(controller.listMateriais));
router.post('/materiais', authenticate, validate(createMaterialSchema), asyncHandler(controller.createMaterial));
router.put('/materiais/:id', authenticate, validate(updateMaterialSchema), asyncHandler(controller.updateMaterial));

module.exports = router;
