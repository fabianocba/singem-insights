/**
 * Rotas SERPRO - SINGEM
 * Endpoints para integrações com APIs do SERPRO
 *
 * STUB: Endpoints placeholder para integração futura
 */

const express = require('express');
const serproClient = require('./serproClient.stub');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// ============================================================================
// GET /api/integrations/serpro/health - Status da integração
// ============================================================================
router.get('/health', authenticate, async (req, res) => {
  const config = serproClient.getConfig();
  const health = await serproClient.healthCheck();

  res.json({
    sucesso: true,
    habilitado: process.env.SERPRO_ENABLED === 'true',
    configurado: config.configured,
    gateway: config.baseUrl,
    status: health.online ? 'online' : 'offline',
    _stub: true,
    _message: 'Integração SERPRO em desenvolvimento'
  });
});

// ============================================================================
// POST /api/integrations/serpro/test-connection - Testa conexão
// ============================================================================
router.post('/test-connection', authenticate, requireAdmin, async (req, res) => {
  const result = await serproClient.testConnection();

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
    mensagem: 'Conexão estabelecida com sucesso',
    _stub: true
  });
});

// ============================================================================
// GET /api/integrations/serpro/cpf/:cpf - Consulta CPF
// ============================================================================
router.get('/cpf/:cpf', authenticate, async (req, res) => {
  const { cpf } = req.params;

  // Validação básica
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    return res.status(400).json({
      sucesso: false,
      erro: 'CPF inválido - deve conter 11 dígitos'
    });
  }

  const result = await serproClient.consultarCPF(cpfLimpo);

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
    dados: result.data,
    _stub: true
  });
});

// ============================================================================
// GET /api/integrations/serpro/cnpj/:cnpj - Consulta CNPJ
// ============================================================================
router.get('/cnpj/:cnpj', authenticate, async (req, res) => {
  const { cnpj } = req.params;

  // Validação básica
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) {
    return res.status(400).json({
      sucesso: false,
      erro: 'CNPJ inválido - deve conter 14 dígitos'
    });
  }

  const result = await serproClient.consultarCNPJ(cnpjLimpo);

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
    dados: result.data,
    _stub: true
  });
});

// ============================================================================
// GET /api/integrations/serpro/apis - Lista APIs disponíveis
// ============================================================================
router.get('/apis', authenticate, (_req, res) => {
  const apis = serproClient.getAvailableApis();

  res.json({
    sucesso: true,
    apis: apis,
    _stub: true
  });
});

// ============================================================================
// GET /api/integrations/serpro/contract - Documentação
// ============================================================================
router.get('/contract', (_req, res) => {
  res.json({
    titulo: 'Contrato de Integração SERPRO',
    versao: '1.0.0',
    status: 'STUB - Não implementado',
    descricao: 'Integração com APIs do SERPRO para consulta de dados',
    gateway: 'https://gateway.apiserpro.serpro.gov.br',
    documentacao: 'https://servicos.serpro.gov.br/api-serpro/',
    autenticacao: {
      tipo: 'OAuth2 Client Credentials',
      variaveis: [
        'SERPRO_ENABLED=true',
        'SERPRO_BASE_URL=https://gateway.apiserpro.serpro.gov.br',
        'SERPRO_API_KEY=<obtida no portal SERPRO>',
        'SERPRO_CONSUMER_SECRET=<obtido no portal SERPRO>'
      ]
    },
    endpoints: {
      'GET /health': 'Status da integração',
      'POST /test-connection': 'Testa autenticação com SERPRO',
      'GET /cpf/:cpf': 'Consulta dados de CPF',
      'GET /cnpj/:cnpj': 'Consulta dados de CNPJ',
      'GET /apis': 'Lista APIs disponíveis'
    },
    apisDisponiveis: serproClient.getAvailableApis()
  });
});

module.exports = router;
