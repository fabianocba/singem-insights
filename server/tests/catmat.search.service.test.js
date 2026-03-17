const test = require('node:test');
const assert = require('node:assert/strict');

process.env.COMPRASGOV_AUDIT_ENABLED = 'false';
process.env.INTEGRACOES_AUDIT_ENABLED = 'false';

const comprasGovGateway = require('../services/gov-api/comprasGovGatewayService');
const catalogSearchService = require('../services/ai-core/catalogSearchService');
const catmatService = require('../integrations/catmat/catmatService');
const db = require('../config/database');

test('catalogSearchService usa descricaoItem e retorna sugestoes agrupadas por PDM', async () => {
  const originalConsultarItemMaterial = comprasGovGateway.consultarItemMaterial;
  const captured = {
    params: null,
    paginacao: null,
    context: null
  };

  comprasGovGateway.consultarItemMaterial = async (params, paginacao, context) => {
    captured.params = params;
    captured.paginacao = paginacao;
    captured.context = context;

    return {
      resultado: [
        {
          codigoItem: '1001',
          descricaoItem: 'Copo descartavel 200 ml',
          codigoGrupo: '10',
          descricaoGrupo: 'Utensilios domesticos',
          codigoClasse: '101',
          descricaoClasse: 'Descartaveis',
          codigoPdm: '7001',
          descricaoPdm: 'Copos descartaveis',
          unidadeFornecimento: 'CX',
          statusItem: 'ATIVO'
        },
        {
          codigoItem: '1002',
          descricaoItem: 'Copo termico 300 ml',
          codigoGrupo: '10',
          descricaoGrupo: 'Utensilios domesticos',
          codigoClasse: '101',
          descricaoClasse: 'Descartaveis',
          codigoPdm: '7001',
          descricaoPdm: 'Copos descartaveis',
          unidadeFornecimento: 'UN',
          statusItem: 'ATIVO'
        },
        {
          codigoItem: '1003',
          descricaoItem: 'Tampa para copo descartavel',
          codigoGrupo: '10',
          descricaoGrupo: 'Utensilios domesticos',
          codigoClasse: '102',
          descricaoClasse: 'Acessorios',
          codigoPdm: '7002',
          descricaoPdm: 'Acessorios para copos',
          unidadeFornecimento: 'UN',
          statusItem: 'ATIVO'
        }
      ],
      totalRegistros: 3
    };
  };

  try {
    const result = await catalogSearchService.buscarMateriaisComRanking(
      'copo',
      {
        limite: 10,
        statusItem: '1'
      },
      {
        requestId: 'req-catmat-suggest-1',
        routeInterna: '/api/catmat/search'
      }
    );

    assert.deepEqual(captured.params, {
      descricaoItem: 'copo',
      codigoGrupo: undefined,
      codigoClasse: undefined,
      codigoPdm: undefined,
      statusItem: '1'
    });
    assert.deepEqual(captured.paginacao, {
      pagina: 1,
      tamanhoPagina: 80
    });
    assert.equal(captured.context?.requestId, 'req-catmat-suggest-1');
    assert.equal(result.modo, 'suggestions');
    assert.equal(result.groupedByPdm.length, 2);
    assert.equal(result.sugestoes[0]?.tipo, 'todos_grupos');
    assert.equal(result.sugestoes[0]?.label, 'Todos os grupos - copo');
    assert.equal(result.sugestoes[1]?.codigoPdm, '7001');
    assert.equal(result.sugestoes[1]?.descricaoGrupo, 'Utensilios domesticos');
    assert.equal(result.sugestoes[1]?.descricaoClasse, 'Descartaveis');
    assert.equal(result.sugestoes[1]?.totalItens, 2);
    assert.equal(result.dados[0]?.codigoItem, '1001');
  } finally {
    comprasGovGateway.consultarItemMaterial = originalConsultarItemMaterial;
  }
});

test('catalogSearchService usa codigoItem em busca numerica e retorna itens sem sugestoes', async () => {
  const originalConsultarItemMaterial = comprasGovGateway.consultarItemMaterial;
  const captured = {
    params: null,
    paginacao: null
  };

  comprasGovGateway.consultarItemMaterial = async (params, paginacao) => {
    captured.params = params;
    captured.paginacao = paginacao;

    return {
      resultado: [
        {
          codigoItem: '151046',
          descricaoItem: 'Parafuso sextavado galvanizado',
          codigoGrupo: '53',
          descricaoGrupo: 'Ferragens',
          codigoClasse: '5310',
          descricaoClasse: 'Parafusos',
          codigoPdm: '9801',
          descricaoPdm: 'Elementos de fixacao',
          unidadeFornecimento: 'UN',
          statusItem: 'ATIVO'
        }
      ],
      totalRegistros: 1
    };
  };

  try {
    const result = await catalogSearchService.buscarMateriaisComRanking('151046', { limite: 5 }, {});

    assert.deepEqual(captured.params, {
      codigoItem: '151046',
      codigoGrupo: undefined,
      codigoClasse: undefined,
      codigoPdm: undefined,
      statusItem: '1'
    });
    assert.deepEqual(captured.paginacao, {
      pagina: 1,
      tamanhoPagina: 5
    });
    assert.equal(result.modo, 'items');
    assert.deepEqual(result.sugestoes, []);
    assert.equal(result.dados.length, 1);
    assert.equal(result.dados[0]?.codigoItem, '151046');
    assert.equal(result.dados[0]?.descricaoItem, 'Parafuso sextavado galvanizado');
  } finally {
    comprasGovGateway.consultarItemMaterial = originalConsultarItemMaterial;
  }
});

test('catmatService.findByCodigo prioriza gateway oficial e evita fallback legado quando encontra material', async () => {
  const originalDbQuery = db.query;
  const originalConsultarItemMaterial = comprasGovGateway.consultarItemMaterial;
  const originalFetchOfficial = catmatService._fetchOfficial;
  const originalUpsertCache = catmatService._upsertCache;
  let fallbackCalls = 0;
  let upsertCalls = 0;

  db.query = async () => ({ rows: [] });
  comprasGovGateway.consultarItemMaterial = async (params) => {
    assert.deepEqual(params, { codigoItem: '151046' });

    return {
      resultado: [
        {
          codigoItem: '151046',
          descricaoItem: 'Parafuso sextavado galvanizado',
          codigoGrupo: '53',
          descricaoGrupo: 'Ferragens',
          codigoClasse: '5310',
          descricaoClasse: 'Parafusos',
          codigoPdm: '9801',
          descricaoPdm: 'Elementos de fixacao',
          unidadeFornecimento: 'UN',
          statusItem: 'ATIVO'
        }
      ]
    };
  };
  catmatService._fetchOfficial = async () => {
    fallbackCalls += 1;
    throw new Error('fallback legado nao deveria ser acionado');
  };
  catmatService._upsertCache = async () => {
    upsertCalls += 1;
  };

  try {
    const result = await catmatService.findByCodigo('151046');

    assert.equal(result?.codigo, '151046');
    assert.equal(result?.catmat_id, 151046);
    assert.equal(result?.descricao, 'Parafuso sextavado galvanizado');
    assert.equal(result?.id_pdm, '9801');
    assert.equal(result?.fonte, 'api_oficial_compras');
    assert.equal(fallbackCalls, 0);
    assert.equal(upsertCalls, 1);
  } finally {
    db.query = originalDbQuery;
    comprasGovGateway.consultarItemMaterial = originalConsultarItemMaterial;
    catmatService._fetchOfficial = originalFetchOfficial;
    catmatService._upsertCache = originalUpsertCache;
  }
});
