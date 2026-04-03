const express = require('express');
const multer = require('multer');
const { authenticate, requirePermission } = require('../../../middleware/auth');
const { catmatObrigatorioMiddleware } = require('../../utils/catmatValidation');
const validate = require('../../../middlewares/validate');
const controller = require('./empenhos.controller');
const { storageConfig } = require('../../config/storage');
const {
  listEmpenhosSchema,
  idEmpenhoSchema,
  idEmpenhoArquivoSchema,
  slugEmpenhoSchema,
  createEmpenhoSchema,
  updateEmpenhoSchema,
  syncEmpenhosSchema
} = require('./empenhos.validation');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storageConfig.policy.maxFileSizeBytes
  }
});

router.get('/', authenticate, validate(listEmpenhosSchema), controller.list);
router.get('/slug/:slug', authenticate, validate(slugEmpenhoSchema), controller.getBySlug);
router.get(
  '/:id/arquivos',
  authenticate,
  requirePermission('gestao_almoxarifado', 'VISUALIZAR'),
  validate(idEmpenhoSchema),
  controller.listArquivos
);
router.get(
  '/:id/arquivos/:arquivoId/download',
  authenticate,
  requirePermission('gestao_almoxarifado', 'VISUALIZAR'),
  validate(idEmpenhoArquivoSchema),
  controller.downloadArquivo
);
router.post(
  '/:id/arquivos/upload',
  authenticate,
  requirePermission('gestao_almoxarifado', 'CADASTRAR'),
  validate(idEmpenhoSchema),
  upload.single('file'),
  controller.uploadArquivo
);
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
