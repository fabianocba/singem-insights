/**
 * Rotas da API de NF-e
 * Endpoints para importação e consulta de NF-e
 *
 * @description Rotas Express para integração frontend
 */

const express = require('express');
const multer = require('multer');

const router = express.Router();

// Configuração multer para upload de XML
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML são permitidos'));
    }
  }
});

// Instância do serviço (será configurada no server)
let nfeService = null;

/**
 * Middleware para verificar se o serviço está inicializado
 */
const checkService = (req, res, next) => {
  if (!nfeService) {
    return res.status(503).json({
      sucesso: false,
      erro: 'Serviço de NF-e não inicializado',
      codigo: 'SERVICO_NAO_INICIADO'
    });
  }
  return next();
};

/**
 * POST /api/nfe/importar
 * Importa NF-e por chave de acesso via SEFAZ
 *
 * Body: { chaveAcesso: string }
 */
router.post('/importar', checkService, async (req, res) => {
  try {
    const { chaveAcesso } = req.body;

    if (!chaveAcesso) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Chave de acesso é obrigatória',
        codigo: 'CHAVE_OBRIGATORIA'
      });
    }

    const resultado = await nfeService.importarPorChave(chaveAcesso);

    if (resultado.sucesso) {
      return res.json(resultado);
    }
    return res.status(400).json(resultado);
  } catch (error) {
    console.error('[NFE Routes] Erro em /importar:', error);
    return res.status(500).json({
      sucesso: false,
      erro: 'Erro interno ao importar NF-e',
      codigo: 'ERRO_INTERNO'
    });
  }
});

/**
 * POST /api/nfe/upload
 * Upload manual de arquivo XML da NF-e
 *
 * Form-data: file (XML)
 */
router.post('/upload', checkService, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Arquivo XML é obrigatório',
        codigo: 'ARQUIVO_OBRIGATORIO'
      });
    }

    const xmlContent = req.file.buffer.toString('utf8');
    const resultado = await nfeService.importarXml(xmlContent);

    if (resultado.sucesso) {
      return res.json(resultado);
    }
    return res.status(400).json(resultado);
  } catch (error) {
    console.error('[NFE Routes] Erro em /upload:', error);
    return res.status(500).json({
      sucesso: false,
      erro: error.message || 'Erro interno ao processar upload',
      codigo: 'ERRO_INTERNO'
    });
  }
});

/**
 * POST /api/nfe/upload-text
 * Upload de XML como texto (alternativa para frontend sem FormData)
 *
 * Body: { xml: string }
 */
router.post('/upload-text', checkService, async (req, res) => {
  try {
    const { xml } = req.body;

    if (!xml) {
      return res.status(400).json({
        sucesso: false,
        erro: 'XML é obrigatório',
        codigo: 'XML_OBRIGATORIO'
      });
    }

    const resultado = await nfeService.importarXml(xml);

    if (resultado.sucesso) {
      return res.json(resultado);
    }
    return res.status(400).json(resultado);
  } catch (error) {
    console.error('[NFE Routes] Erro em /upload-text:', error);
    return res.status(500).json({
      sucesso: false,
      erro: 'Erro interno ao processar XML',
      codigo: 'ERRO_INTERNO'
    });
  }
});

/**
 * GET /api/nfe/danfe/:chave
 * Obtém PDF do DANFE
 *
 * Params: chave (44 dígitos)
 */
router.get('/danfe/:chave', checkService, async (req, res) => {
  try {
    const { chave } = req.params;

    const resultado = await nfeService.obterDanfe(chave);

    if (resultado.sucesso) {
      return res.sendFile(resultado.caminho);
    }
    return res.status(404).json(resultado);
  } catch (error) {
    console.error('[NFE Routes] Erro em /danfe:', error);
    return res.status(500).json({
      sucesso: false,
      erro: 'Erro interno ao obter DANFE',
      codigo: 'ERRO_INTERNO'
    });
  }
});

/**
 * GET /api/nfe/xml/:chave
 * Obtém XML da NF-e
 *
 * Params: chave (44 dígitos)
 */
router.get('/xml/:chave', checkService, async (req, res) => {
  try {
    const { chave } = req.params;

    const resultado = await nfeService.obterXml(chave);

    if (resultado.sucesso) {
      res.set('Content-Type', 'application/xml');
      res.send(resultado.xml);
    } else {
      res.status(404).json(resultado);
    }
  } catch (error) {
    console.error('[NFE Routes] Erro em /xml:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno ao obter XML',
      codigo: 'ERRO_INTERNO'
    });
  }
});

/**
 * GET /api/nfe/listar
 * Lista todas NF-e importadas
 */
router.get('/listar', checkService, async (req, res) => {
  try {
    const resultado = await nfeService.listarImportadas();
    return res.json(resultado);
  } catch (error) {
    console.error('[NFE Routes] Erro em /listar:', error);
    return res.status(500).json({
      sucesso: false,
      erro: 'Erro interno ao listar NF-e',
      codigo: 'ERRO_INTERNO'
    });
  }
});

/**
 * POST /api/nfe/consultar-ultimas
 * Consulta últimas NF-e disponíveis no SEFAZ para um CNPJ
 *
 * Body: { cnpj: string }
 */
router.post('/consultar-ultimas', checkService, async (req, res) => {
  try {
    const { cnpj } = req.body;

    if (!cnpj) {
      return res.status(400).json({
        sucesso: false,
        erro: 'CNPJ é obrigatório',
        codigo: 'CNPJ_OBRIGATORIO'
      });
    }

    const resultado = await nfeService.consultarUltimasNfe(cnpj);

    if (resultado.sucesso) {
      return res.json(resultado);
    }
    return res.status(400).json(resultado);
  } catch (error) {
    console.error('[NFE Routes] Erro em /consultar-ultimas:', error);
    return res.status(500).json({
      sucesso: false,
      erro: 'Erro interno ao consultar SEFAZ',
      codigo: 'ERRO_INTERNO'
    });
  }
});

/**
 * GET /api/nfe/status
 * Retorna status do serviço de NF-e
 */
router.get('/status', (req, res) => {
  res.json({
    sucesso: true,
    servico: nfeService ? 'ativo' : 'inativo',
    sefazConfigurado: nfeService?.dfeClient ? true : false,
    ambiente: nfeService?.config?.ambiente || 'desconhecido',
    timestamp: new Date().toISOString()
  });
});

/**
 * Configura a instância do serviço
 * @param {NfeImportService} service - Instância configurada do serviço
 */
function setNfeService(service) {
  nfeService = service;
}

module.exports = { router, setNfeService };
