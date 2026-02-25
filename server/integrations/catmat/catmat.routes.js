/**
 * Rotas CATMAT - SINGEM
 * Endpoints para busca e consulta de materiais CATMAT no cache local
 */

const express = require('express');
const catmatService = require('./catmatService');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// ============================================================================
// GET /api/catmat/search - Busca materiais (autocomplete)
// ============================================================================
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, limite = 20, offset = 0, ativos = 'true' } = req.query;

    if (!q || q.length < 3) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Termo de busca deve ter pelo menos 3 caracteres',
        dados: []
      });
    }

    const result = await catmatService.search(q, {
      limite: Math.min(parseInt(limite) || 20, 100),
      offset: parseInt(offset) || 0,
      apenasAtivos: ativos !== 'false'
    });

    return res.json({
      sucesso: true,
      ...result
    });
  } catch (err) {
    console.error('[CATMAT] Erro na busca:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// ============================================================================
// GET /api/catmat/:codigo - Busca material por código
// ============================================================================
router.get('/:codigo', authenticate, async (req, res) => {
  try {
    const { codigo } = req.params;

    const material = await catmatService.findByCodigo(codigo);

    if (!material) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Material CATMAT não encontrado'
      });
    }

    return res.json({
      sucesso: true,
      dados: material
    });
  } catch (err) {
    console.error('[CATMAT] Erro ao buscar código:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// ============================================================================
// GET /api/catmat/stats - Estatísticas do cache
// ============================================================================
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await catmatService.getStats();
    return res.json(stats);
  } catch (err) {
    console.error('[CATMAT] Erro ao obter stats:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

module.exports = router;
