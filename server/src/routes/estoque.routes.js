const express = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../middlewares/validate');
const asyncHandler = require('../middlewares/asyncHandler');
const controller = require('../controllers/estoque.controller');
const {
  listSaldosSchema,
  saldoByMaterialSchema,
  listMovimentosSchema,
  createMovimentoSchema
} = require('../validators/estoque.validators');

const legacyEstoqueRoutes = require('../../routes/estoque.routes');

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

router.use('/', legacyEstoqueRoutes);

module.exports = router;
