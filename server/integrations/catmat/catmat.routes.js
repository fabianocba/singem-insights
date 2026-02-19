/**
 * Rotas CATMAT - SINGEM
 * Endpoints para importação e consulta de materiais CATMAT
 *
 * STUB: Endpoints placeholder para integração futura
 */

const express = require('express');
const catmatService = require('./catmatService');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// ============================================================================
// GET /api/integrations/catmat/status - Status da integração
// ============================================================================
router.get('/status', authenticate, async (req, res) => {
  const stats = await catmatService.getStats();
  const importStatus = catmatService.getImportStatus();

  res.json({
    sucesso: true,
    habilitado: process.env.CATMAT_ENABLED === 'true',
    estatisticas: stats.dados,
    ultimaImportacao: importStatus,
    _stub: true,
    _message: 'Integração CATMAT em desenvolvimento'
  });
});

// ============================================================================
// POST /api/integrations/catmat/import - Importa arquivo CATMAT
// ============================================================================
router.post('/import', authenticate, requireAdmin, async (req, res) => {
  // STUB: Em produção, usaria multer para upload
  const { fileContent, fileType } = req.body;

  if (!fileContent) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Conteúdo do arquivo é obrigatório',
      _stub: true,
      _contract: {
        descricao: 'Endpoint para upload de arquivo CATMAT',
        metodoReal: 'POST multipart/form-data',
        campos: {
          file: 'Arquivo CSV, JSON ou ZIP',
          replaceAll: 'boolean - Se deve substituir todos os materiais'
        },
        resposta: {
          sucesso: true,
          importados: 'number',
          atualizados: 'number',
          erros: 'number',
          tempoProcessamento: 'number (ms)'
        }
      }
    });
  }

  const result = await catmatService.importFromFile(Buffer.from(fileContent, 'base64'), fileType || 'csv');

  if (!result.success) {
    return res.status(400).json({
      sucesso: false,
      erro: result.error,
      _stub: result._stub,
      _contract: result._contract
    });
  }

  return res.json({
    sucesso: true,
    importados: result.imported,
    erros: result.errors,
    _stub: true
  });
});

// ============================================================================
// GET /api/integrations/catmat/search - Busca no CATMAT
// ============================================================================
router.get('/search', authenticate, async (req, res) => {
  const { q: _q, grupo: _grupo, classe: _classe, sustentavel: _sustentavel, limite: _limite = 50 } = req.query;

  // STUB: Busca simples no banco local
  res.json({
    sucesso: false,
    erro: 'Busca CATMAT não implementada',
    _stub: true,
    _contract: {
      descricao: 'Busca materiais no catálogo CATMAT local',
      parametros: {
        q: 'string - Termo de busca na descrição',
        grupo: 'number - Código do grupo',
        classe: 'number - Código da classe',
        sustentavel: 'boolean - Filtrar sustentáveis',
        limite: 'number - Máximo de resultados (padrão 50)'
      },
      resposta: {
        sucesso: true,
        dados: ['array de materiais'],
        total: 'number'
      }
    }
  });
});

// ============================================================================
// GET /api/integrations/catmat/item/:id - Busca item específico
// ============================================================================
router.get('/item/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const material = await catmatService.findByCatmatId(parseInt(id));

  if (!material) {
    return res.status(404).json({
      sucesso: false,
      erro: 'Material CATMAT não encontrado',
      _stub: true
    });
  }

  return res.json({
    sucesso: true,
    dados: material
  });
});

// ============================================================================
// GET /api/integrations/catmat/contract - Documentação
// ============================================================================
router.get('/contract', (_req, res) => {
  res.json({
    titulo: 'Contrato de Integração CATMAT',
    versao: '1.0.0',
    status: 'STUB - Não implementado',
    descricao: 'Importação e consulta de materiais do Catálogo de Materiais (CATMAT/SIASG)',
    fontesDados: ['Portal de Compras Governamentais', 'Download manual de planilhas', 'API do ComprasNet (futuro)'],
    formatosSuportados: ['CSV', 'JSON', 'ZIP'],
    endpoints: {
      'GET /status': 'Estatísticas do catálogo local',
      'POST /import': 'Upload e importação de arquivo',
      'GET /search': 'Busca de materiais',
      'GET /item/:id': 'Busca por código CATMAT'
    },
    tabelaAlvo: 'materials',
    camposEspecificos: [
      'catmat_id',
      'catmat_grupo',
      'catmat_classe',
      'catmat_padrao_desc',
      'catmat_sustentavel',
      'catmat_atualizado_em'
    ]
  });
});

module.exports = router;
