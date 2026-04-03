const express = require('express');
const multer = require('multer');
const { authenticate, requirePermission } = require('../../../middleware/auth');
const { catmatObrigatorioMiddleware } = require('../../utils/catmatValidation');
const validate = require('../../../middlewares/validate');
const controller = require('./notas-fiscais.controller');
const { storageConfig } = require('../../config/storage');
const {
  listNotasSchema,
  idNotaSchema,
  idNotaArquivoSchema,
  chaveNotaSchema,
  createNotaSchema,
  updateNotaSchema
} = require('./notas-fiscais.validation');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storageConfig.policy.maxFileSizeBytes
  }
});

router.get('/', authenticate, validate(listNotasSchema), controller.list);
router.get('/chave/:chave', authenticate, validate(chaveNotaSchema), controller.getByChave);
router.get(
  '/:id/arquivos',
  authenticate,
  requirePermission('gestao_almoxarifado', 'VISUALIZAR'),
  validate(idNotaSchema),
  controller.listArquivos
);
router.get(
  '/:id/arquivos/:arquivoId/download',
  authenticate,
  requirePermission('gestao_almoxarifado', 'VISUALIZAR'),
  validate(idNotaArquivoSchema),
  controller.downloadArquivo
);
router.post(
  '/:id/arquivos/upload',
  authenticate,
  requirePermission('gestao_almoxarifado', 'CADASTRAR'),
  validate(idNotaSchema),
  upload.single('file'),
  controller.uploadArquivo
);
router.get('/:id/items', authenticate, validate(idNotaSchema), controller.getItems);
router.get('/:id', authenticate, validate(idNotaSchema), controller.getById);
router.post(
  '/',
  authenticate,
  requirePermission('gestao_almoxarifado', 'CADASTRAR'),
  catmatObrigatorioMiddleware('nota_fiscal_items'),
  validate(createNotaSchema),
  controller.create
);
router.put(
  '/:id',
  authenticate,
  requirePermission('gestao_almoxarifado', 'EDITAR'),
  catmatObrigatorioMiddleware('nota_fiscal_items'),
  validate(updateNotaSchema),
  controller.update
);
router.put(
  '/:id/conferir',
  authenticate,
  requirePermission('gestao_almoxarifado', 'APROVAR'),
  validate(idNotaSchema),
  controller.conferir
);
router.put(
  '/:id/receber',
  authenticate,
  requirePermission('gestao_almoxarifado', 'APROVAR'),
  validate(idNotaSchema),
  controller.receber
);
router.delete(
  '/:id',
  authenticate,
  requirePermission('gestao_almoxarifado', 'EXCLUIR'),
  validate(idNotaSchema),
  controller.remove
);

module.exports = router;
