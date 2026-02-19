/**
 * Rotas v2 da API de NF-e
 * Endpoints para importação, validação e consulta de NF-e
 *
 * Endpoints:
 * - POST /api/nfe/v2/importar-xml   (multipart ou JSON com base64)
 * - POST /api/nfe/v2/validar        (apenas valida, não persiste)
 * - GET  /api/nfe/v2/:chave         (retorna metadados completos)
 * - GET  /api/nfe/v2/:chave/xml     (retorna XML)
 * - GET  /api/nfe/v2/listar         (lista NF-es importadas)
 * - DELETE /api/nfe/v2/:chave       (remove NF-e)
 *
 * @module nfe.routes.v2
 */

const express = require('express');
const multer = require('multer');

const router = express.Router();

// Configuração multer para upload de XML
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const isXml =
      file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.endsWith('.xml');
    if (isXml) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML são permitidos'));
    }
  }
});

// Instância do serviço (será configurada pelo server)
let nfeService = null;

/**
 * Configura a instância do serviço
 * @param {NfeImportServiceV2} service
 */
function setNfeService(service) {
  nfeService = service;
}

/**
 * Middleware para verificar se o serviço está disponível
 */
const checkService = (req, res, next) => {
  if (!nfeService) {
    return res.status(503).json({
      status: 'ERRO',
      errors: ['Serviço de NF-e não inicializado'],
      alerts: [],
      data: null
    });
  }
  next();
};

// ==========================================
// ROTAS
// ==========================================

/**
 * POST /api/nfe/v2/importar-xml
 * Importa NF-e via upload de arquivo XML ou base64
 *
 * Aceita:
 * - Form-data com campo 'file' (arquivo XML)
 * - JSON com { xmlBase64: string } ou { xml: string }
 *
 * Query params:
 * - sobrescrever=true (opcional)
 */
router.post('/importar-xml', checkService, upload.single('file'), async (req, res) => {
  try {
    const sobrescrever = req.query.sobrescrever === 'true';
    let resultado;

    // Upload via multipart
    if (req.file) {
      const xmlContent = req.file.buffer.toString('utf8');
      resultado = await nfeService.importarXml(xmlContent, { sobrescrever });
    }
    // JSON com base64
    else if (req.body.xmlBase64) {
      resultado = await nfeService.importarXmlBase64(req.body.xmlBase64, { sobrescrever });
    }
    // JSON com XML direto
    else if (req.body.xml) {
      resultado = await nfeService.importarXml(req.body.xml, { sobrescrever });
    }
    // Nenhum input válido
    else {
      return res.status(400).json({
        status: 'ERRO',
        errors: ['Nenhum XML fornecido. Envie arquivo via form-data (campo file) ou JSON (xmlBase64/xml)'],
        alerts: [],
        data: null
      });
    }

    // Define status HTTP baseado no resultado
    const httpStatus = resultado.status === 'ERRO' ? 400 : 200;
    res.status(httpStatus).json(resultado);
  } catch (error) {
    console.error('[NFE Routes V2] Erro em /importar-xml:', error);
    res.status(500).json({
      status: 'ERRO',
      errors: [`Erro interno: ${error.message}`],
      alerts: [],
      data: null
    });
  }
});

/**
 * POST /api/nfe/v2/validar
 * Valida XML sem importar (dry-run)
 *
 * Aceita mesmo formato do /importar-xml
 */
router.post('/validar', checkService, upload.single('file'), async (req, res) => {
  try {
    let xmlContent;

    if (req.file) {
      xmlContent = req.file.buffer.toString('utf8');
    } else if (req.body.xmlBase64) {
      xmlContent = Buffer.from(req.body.xmlBase64, 'base64').toString('utf8');
    } else if (req.body.xml) {
      xmlContent = req.body.xml;
    } else {
      return res.status(400).json({
        status: 'ERRO',
        errors: ['Nenhum XML fornecido'],
        alerts: [],
        data: null
      });
    }

    const resultado = await nfeService.validarXml(xmlContent);
    const httpStatus = resultado.status === 'ERRO' ? 400 : 200;
    res.status(httpStatus).json(resultado);
  } catch (error) {
    console.error('[NFE Routes V2] Erro em /validar:', error);
    res.status(500).json({
      status: 'ERRO',
      errors: [`Erro interno: ${error.message}`],
      alerts: [],
      data: null
    });
  }
});

/**
 * GET /api/nfe/v2/:chave
 * Obtém metadados completos de uma NF-e
 *
 * Params: chave (44 dígitos)
 */
router.get('/:chave', checkService, async (req, res) => {
  try {
    const { chave } = req.params;
    const resultado = await nfeService.obterNfe(chave);

    const httpStatus = resultado.status === 'ERRO' ? 404 : 200;
    res.status(httpStatus).json(resultado);
  } catch (error) {
    console.error('[NFE Routes V2] Erro em GET /:chave:', error);
    res.status(500).json({
      status: 'ERRO',
      errors: [`Erro interno: ${error.message}`],
      alerts: [],
      data: null
    });
  }
});

/**
 * GET /api/nfe/v2/:chave/xml
 * Obtém XML original de uma NF-e
 *
 * Params: chave (44 dígitos)
 */
router.get('/:chave/xml', checkService, async (req, res) => {
  try {
    const { chave } = req.params;
    const resultado = await nfeService.obterXml(chave);

    if (resultado.sucesso) {
      res.set('Content-Type', 'application/xml');
      res.set('Content-Disposition', `attachment; filename="${chave}.xml"`);
      res.send(resultado.xml);
    } else {
      res.status(404).json({
        status: 'ERRO',
        errors: [resultado.erro],
        alerts: [],
        data: null
      });
    }
  } catch (error) {
    console.error('[NFE Routes V2] Erro em GET /:chave/xml:', error);
    res.status(500).json({
      status: 'ERRO',
      errors: [`Erro interno: ${error.message}`],
      alerts: [],
      data: null
    });
  }
});

/**
 * GET /api/nfe/v2/listar
 * Lista todas NF-e importadas
 *
 * Query params (opcionais):
 * - cnpjEmitente
 * - cnpjDestinatario
 * - dataInicio (ISO)
 * - dataFim (ISO)
 */
router.get('/', checkService, async (req, res) => {
  try {
    const filtros = {
      cnpjEmitente: req.query.cnpjEmitente,
      cnpjDestinatario: req.query.cnpjDestinatario,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim
    };

    const resultado = await nfeService.listarNfes(filtros);

    if (resultado.sucesso) {
      res.json({
        status: 'OK',
        errors: [],
        alerts: [],
        data: {
          nfes: resultado.nfes,
          total: resultado.total
        }
      });
    } else {
      res.status(500).json({
        status: 'ERRO',
        errors: [resultado.erro],
        alerts: [],
        data: null
      });
    }
  } catch (error) {
    console.error('[NFE Routes V2] Erro em GET /:', error);
    res.status(500).json({
      status: 'ERRO',
      errors: [`Erro interno: ${error.message}`],
      alerts: [],
      data: null
    });
  }
});

/**
 * DELETE /api/nfe/v2/:chave
 * Remove uma NF-e importada
 *
 * Params: chave (44 dígitos)
 */
router.delete('/:chave', checkService, async (req, res) => {
  try {
    const { chave } = req.params;
    const resultado = await nfeService.removerNfe(chave);

    if (resultado.sucesso) {
      res.json({
        status: 'OK',
        errors: [],
        alerts: [],
        data: { removido: true, chave }
      });
    } else {
      res.status(400).json({
        status: 'ERRO',
        errors: [resultado.erro],
        alerts: [],
        data: null
      });
    }
  } catch (error) {
    console.error('[NFE Routes V2] Erro em DELETE /:chave:', error);
    res.status(500).json({
      status: 'ERRO',
      errors: [`Erro interno: ${error.message}`],
      alerts: [],
      data: null
    });
  }
});

/**
 * GET /api/nfe/v2/status
 * Status do serviço
 */
router.get('/service/status', (req, res) => {
  res.json({
    status: 'OK',
    errors: [],
    alerts: [],
    data: {
      servico: nfeService ? 'ativo' : 'inativo',
      versao: '2.0.0',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = { router, setNfeService };
