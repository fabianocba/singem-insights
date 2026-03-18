const express = require('express');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const validate = require('../../middlewares/validate');
const controller = require('./almoxarifado.controller');
const {
  dashboardSchema,
  listContasContabeisSchema,
  createContaContabilSchema,
  listItensSchema,
  getItemSchema,
  createItemSchema,
  updateItemSchema,
  listNotasEntradaSchema,
  createNotaEntradaSchema,
  listMovimentacoesSchema,
  createMovimentacaoSchema,
  listSolicitacoesSchema,
  createSolicitacaoSchema,
  updateSolicitacaoStatusSchema,
  relatorioResumoSchema,
  listAuditoriaSchema
} = require('./almoxarifado.schemas');

const router = express.Router();

router.get('/meta', authenticate, controller.getMeta);
router.get('/dashboard', authenticate, validate(dashboardSchema), controller.getDashboard);

router.get('/contas-contabeis', authenticate, validate(listContasContabeisSchema), controller.listContas);
router.post('/contas-contabeis', authenticate, validate(createContaContabilSchema), controller.createConta);

router.get('/itens', authenticate, validate(listItensSchema), controller.listItens);
router.get('/itens/:id', authenticate, validate(getItemSchema), controller.getItem);
router.post('/itens', authenticate, validate(createItemSchema), controller.createItem);
router.put('/itens/:id', authenticate, validate(updateItemSchema), controller.updateItem);

router.get('/notas-entrada', authenticate, validate(listNotasEntradaSchema), controller.listNotasEntrada);
router.post('/notas-entrada', authenticate, validate(createNotaEntradaSchema), controller.createNotaEntrada);

router.get('/movimentacoes', authenticate, validate(listMovimentacoesSchema), controller.listMovimentacoes);
router.post('/movimentacoes', authenticate, validate(createMovimentacaoSchema), controller.createMovimentacao);

router.get('/solicitacoes', authenticate, validate(listSolicitacoesSchema), controller.listSolicitacoes);
router.post('/solicitacoes', authenticate, validate(createSolicitacaoSchema), controller.createSolicitacao);
router.patch(
  '/solicitacoes/:id/status',
  authenticate,
  validate(updateSolicitacaoStatusSchema),
  controller.updateSolicitacaoStatus
);

router.get('/relatorios/resumo', authenticate, validate(relatorioResumoSchema), controller.getResumoRelatorio);
router.get('/auditoria', authenticate, requireAdmin, validate(listAuditoriaSchema), controller.listAuditoria);

module.exports = router;
