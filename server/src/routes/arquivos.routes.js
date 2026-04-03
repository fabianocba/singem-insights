const express = require('express');
const multer = require('multer');

const { authenticate, requirePermission } = require('../../middleware/auth');
const { storageConfig } = require('../config/storage');
const fileStorageService = require('../services/fileStorageService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storageConfig.policy.maxFileSizeBytes
  }
});

router.post(
  '/upload',
  authenticate,
  requirePermission('gestao_almoxarifado', 'CADASTRAR'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ erro: 'Arquivo é obrigatório' });
      }

      const modulo = String(req.body.modulo || 'uploads').trim();
      const categoria = String(req.body.categoria || 'geral').trim();
      const entidadeTipo = req.body.entidadeTipo ? String(req.body.entidadeTipo) : null;
      const entidadeId = req.body.entidadeId ? String(req.body.entidadeId) : null;
      const modoRegistro = req.body.modoRegistro === 'simulado' ? 'simulado' : storageConfig.policy.defaultMode;

      const saved = await fileStorageService.saveBuffer({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        modulo,
        categoria,
        entidadeTipo,
        entidadeId,
        usuarioCriador: req.user?.id || null,
        prefix:
          modulo
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_')
            .slice(0, 20) || 'FILE',
        modoRegistro
      });

      return res.status(201).json({
        sucesso: true,
        arquivo: {
          id: saved.id,
          modulo: saved.modulo,
          categoria: saved.categoria,
          nomeOriginal: saved.nome_original,
          nomeArmazenado: saved.nome_armazenado,
          tamanhoBytes: saved.tamanho_bytes,
          mimeType: saved.mime_type,
          caminhoRelativo: saved.caminho_relativo,
          modoRegistro: saved.modo_registro,
          status: saved.status,
          criadoEm: saved.criado_em
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/:id/download',
  authenticate,
  requirePermission('gestao_almoxarifado', 'VISUALIZAR'),
  async (req, res, next) => {
    try {
      const payload = await fileStorageService.createReadStreamById(req.params.id);
      if (!payload) {
        return res.status(404).json({ erro: 'Arquivo não encontrado' });
      }

      const { metadata, stream } = payload;
      res.setHeader('Content-Type', metadata.mime_type || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${metadata.nome_original || metadata.nome_armazenado}"`
      );

      stream.on('error', next);
      stream.pipe(res);
      return undefined;
    } catch (error) {
      return next(error);
    }
  }
);

router.delete('/:id', authenticate, requirePermission('gestao_almoxarifado', 'EXCLUIR'), async (req, res, next) => {
  try {
    const deleted = await fileStorageService.deleteFileById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ erro: 'Arquivo não encontrado' });
    }

    return res.json({ sucesso: true, arquivo: deleted });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
