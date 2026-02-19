/**
 * Rotas Gov.br - SINGEM
 * Endpoints para autenticação via Login Único gov.br
 *
 * STUB: Endpoints placeholder para integração futura
 */

const express = require('express');
const identityService = require('../domain/identity/identityService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// GET /api/auth/govbr/status - Status da integração
// ============================================================================
router.get('/status', (_req, res) => {
  const providers = identityService.getProvidersInfo();

  res.json({
    sucesso: true,
    govbr: {
      habilitado: providers.govbr.enabled,
      issuer: providers.govbr.issuer,
      _stub: true,
      _message: 'Esta é uma implementação stub. Aguardando credenciais gov.br.'
    }
  });
});

// ============================================================================
// GET /api/auth/govbr/authorize - Inicia fluxo OAuth2
// ============================================================================
router.get('/authorize', async (req, res) => {
  try {
    const { state, nonce, redirectUri } = req.query ?? {};
    const result = await identityService.getAuthorizationUrl('govbr', { state, nonce, redirectUri });

    // Em produção, faria redirect para result.url
    return res.json({
      sucesso: true,
      ...result,
      _stub: true,
      _message: 'Em produção, este endpoint redirecionaria para o gov.br'
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      sucesso: false,
      erro: err.message,
      _stub: err._stub,
      _contract: err._contract
    });
  }
});

// ============================================================================
// GET /api/auth/govbr/callback - Callback OAuth2
// ============================================================================
router.get('/callback', async (req, res) => {
  const { code, redirectUri, error, error_description } = req.query;

  // Erro retornado pelo gov.br
  if (error) {
    return res.status(400).json({
      sucesso: false,
      erro: error_description || error,
      _stub: true
    });
  }

  if (!code) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Parâmetro code é obrigatório',
      _stub: true
    });
  }

  try {
    const profile = await identityService.exchangeCodeForProfile('govbr', { code, redirectUri });

    // STUB: Em produção, vincularia profile ao usuário e emitiria tokens
    return res.status(501).json({
      sucesso: false,
      mensagem: 'Callback gov.br stub - vinculação + emissão de token ainda não implementadas',
      profile,
      _stub: true
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      sucesso: false,
      erro: err.message,
      _stub: err._stub,
      _contract: err._contract
    });
  }
});

// ============================================================================
// POST /api/auth/govbr/link - Vincula conta gov.br a usuário local
// ============================================================================
router.post('/link', authenticate, async (_req, res) => {
  // Futuro: vincular conta gov.br (cpf/sub) a user interno existente
  return res.status(501).json({
    sucesso: false,
    mensagem: 'Vinculação gov.br <-> usuário interno ainda não implementada',
    _stub: true
  });
});

// ============================================================================
// DELETE /api/auth/govbr/link - Remove vinculação gov.br
// ============================================================================
router.delete('/link', authenticate, async (_req, res) => {
  return res.status(501).json({
    sucesso: false,
    mensagem: 'Remoção de vinculação gov.br ainda não implementada',
    _stub: true
  });
});

// ============================================================================
// GET /api/auth/govbr/contract - Documentação do contrato de integração
// ============================================================================
router.get('/contract', (_req, res) => {
  res.json({
    titulo: 'Contrato de Integração Gov.br',
    versao: '1.0.0',
    status: 'STUB - Não implementado',
    endpoints: {
      'GET /authorize': {
        descricao: 'Retorna URL de autorização gov.br',
        parametros: ['state', 'nonce', 'redirectUri'],
        resposta: { url: 'string', state: 'string', nonce: 'string' }
      },
      'GET /callback': {
        descricao: 'Recebe callback do OAuth2 gov.br',
        parametros: ['code', 'redirectUri'],
        resposta: { profile: 'NormalizedProfile' }
      },
      'POST /link': {
        descricao: 'Vincula conta gov.br a usuário existente',
        autenticacao: 'Bearer token SINGEM',
        body: { govBrToken: 'string' },
        resposta: { sucesso: true }
      },
      'DELETE /link': {
        descricao: 'Remove vinculação gov.br do usuário',
        autenticacao: 'Bearer token SINGEM',
        resposta: { sucesso: true }
      }
    },
    normalizedProfile: {
      provider: 'govbr',
      providerUserId: 'sub do token',
      cpf: '00000000000',
      name: 'Nome completo',
      email: 'email@gov.br',
      level: 'bronze | prata | ouro'
    },
    configuracao: {
      variaveis_env: [
        'GOVBR_ENABLED=true',
        'GOVBR_CLIENT_ID=<obtido no portal gov.br>',
        'GOVBR_CLIENT_SECRET=<obtido no portal gov.br>',
        'GOVBR_REDIRECT_URI=https://seu-dominio/api/auth/govbr/callback',
        'GOVBR_ISSUER=https://sso.acesso.gov.br'
      ],
      documentacao: 'https://manual-roteiro-integracao-login-unico.servicos.gov.br/'
    }
  });
});

module.exports = router;
