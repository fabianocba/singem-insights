const express = require('express');
const comprasGov = require('../integrations/comprasgov');

const router = express.Router();

function getStatusCode(error) {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  if (statusCode >= 400 && statusCode <= 599) {
    return statusCode;
  }

  return 500;
}

function sendError(res, req, error) {
  const statusCode = getStatusCode(error);

  return res.status(statusCode).json({
    success: false,
    status: 'error',
    code: error?.code || 'COMPRASGOV_REQUEST_ERROR',
    message: error?.message || 'Falha na integração com Compras.gov.br',
    requestId: req.requestId || null,
    timestamp: new Date().toISOString(),
    externalStatus: Number(error?.statusCode || statusCode),
    details: error?.details || null
  });
}

async function execute(res, req, operation) {
  try {
    const result = await operation(req);

    return res.status(200).json({
      success: true,
      status: 'success',
      data: result,
      requestId: req.requestId || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return sendError(res, req, error);
  }
}

router.get('/health', (req, res) => execute(res, req, (request) => comprasGov.health(request)));

router.get('/catmat/itens', (req, res) => execute(res, req, (request) => comprasGov.searchItemMaterial(request)));
router.get('/catmat/grupos', (req, res) => execute(res, req, (request) => comprasGov.getGruposMaterial(request)));
router.get('/catmat/classes', (req, res) => execute(res, req, (request) => comprasGov.getClassesMaterial(request)));
router.get('/catmat/pdm', (req, res) => execute(res, req, (request) => comprasGov.getPdmMaterial(request)));
router.get('/catmat/natureza-despesa', (req, res) =>
  execute(res, req, (request) => comprasGov.getMaterialNaturezaDespesa(request))
);
router.get('/catmat/unidades-fornecimento', (req, res) =>
  execute(res, req, (request) => comprasGov.getMaterialUnidadeFornecimento(request))
);
router.get('/catmat/caracteristicas', (req, res) =>
  execute(res, req, (request) => comprasGov.getMaterialCaracteristicas(request))
);

router.get('/catser/itens', (req, res) => execute(res, req, (request) => comprasGov.searchItemServico(request)));
router.get('/catser/grupos', (req, res) => execute(res, req, (request) => comprasGov.getGruposServico(request)));
router.get('/catser/classes', (req, res) => execute(res, req, (request) => comprasGov.getClassesServico(request)));

router.get('/pesquisa-preco/material', (req, res) =>
  execute(res, req, (request) => comprasGov.consultaPesquisaPrecoMaterial(request))
);
router.get('/pesquisa-preco/servico', (req, res) =>
  execute(res, req, (request) => comprasGov.consultaPesquisaPrecoServico(request))
);

router.get('/uasg', (req, res) => execute(res, req, (request) => comprasGov.getUasg(request)));
router.get('/uasg/orgao', (req, res) => execute(res, req, (request) => comprasGov.getOrgao(request)));
router.get('/fornecedor', (req, res) => execute(res, req, (request) => comprasGov.getFornecedor(request)));
router.get('/contratacoes', (req, res) => execute(res, req, (request) => comprasGov.getContratacoes(request)));
router.get('/contratacoes/itens', (req, res) =>
  execute(res, req, (request) => comprasGov.getContratacoesItens(request))
);
router.get('/contratacoes/resultados-itens', (req, res) =>
  execute(res, req, (request) => comprasGov.getContratacoesResultadosItens(request))
);
router.get('/arp', (req, res) => execute(res, req, (request) => comprasGov.getArp(request)));
router.get('/contratos', (req, res) => execute(res, req, (request) => comprasGov.getContratos(request)));
router.get('/contratos/itens', (req, res) => execute(res, req, (request) => comprasGov.getContratosItem(request)));
router.get('/legado/licitacoes', (req, res) => execute(res, req, (request) => comprasGov.getLegadoLicitacoes(request)));
router.get('/legado/itens', (req, res) => execute(res, req, (request) => comprasGov.getLegadoItens(request)));
router.get('/ocds', (req, res) => execute(res, req, (request) => comprasGov.getOcds(request)));
router.get('/pesquisa-preco/material/detalhe', (req, res) =>
  execute(res, req, (request) => comprasGov.getPesquisaPrecoMaterialDetalhe(request))
);
router.get('/pesquisa-preco/servico/detalhe', (req, res) =>
  execute(res, req, (request) => comprasGov.getPesquisaPrecoServicoDetalhe(request))
);

module.exports = router;
