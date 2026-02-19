/**
 * dadosMock.js
 * Dados de demonstração para modo offline
 * Simula respostas da API do Compras.gov.br
 */

export const MOCK_MATERIAIS = {
  _metadata: {
    paginaAtual: 1,
    totalPaginas: 850,
    tamanhoPagina: 10,
    totalRegistros: 8500
  },
  _embedded: {
    itens: [
      {
        codigo: '000001',
        descricao: 'CANETA ESFEROGRAFICA, CORPO EM PLASTICO, PONTA GROSSA, COR AZUL',
        unidadeFornecimento: 'UNIDADE',
        status: 1,
        dataAtualizacao: '2025-10-15',
        grupoMaterial: {
          codigo: '2300',
          descricao: 'MATERIAL DE EXPEDIENTE'
        },
        classeMaterial: {
          codigo: '2301',
          descricao: 'MATERIAL DE ESCRITORIO'
        },
        pdm: {
          codigo: 'PDM000001',
          descricao: 'Caneta Esferográfica Azul'
        },
        sustentavel: true
      },
      {
        codigo: '000002',
        descricao: 'PAPEL SULFITE A4, 75G/M2, BRANCO, RESMA COM 500 FOLHAS',
        unidadeFornecimento: 'RESMA',
        status: 1,
        dataAtualizacao: '2025-10-20',
        grupoMaterial: {
          codigo: '2300',
          descricao: 'MATERIAL DE EXPEDIENTE'
        },
        classeMaterial: {
          codigo: '2301',
          descricao: 'MATERIAL DE ESCRITORIO'
        },
        pdm: {
          codigo: 'PDM000002',
          descricao: 'Papel Sulfite A4 Branco 75g'
        },
        sustentavel: true
      },
      {
        codigo: '000003',
        descricao: 'GRAMPEADOR METAL, CAPACIDADE 25 FOLHAS, COM EXTRATOR DE GRAMPOS',
        unidadeFornecimento: 'UNIDADE',
        status: 1,
        dataAtualizacao: '2025-09-30',
        grupoMaterial: {
          codigo: '2300',
          descricao: 'MATERIAL DE EXPEDIENTE'
        },
        classeMaterial: {
          codigo: '2301',
          descricao: 'MATERIAL DE ESCRITORIO'
        },
        pdm: {
          codigo: 'PDM000003',
          descricao: 'Grampeador Metal 25 Folhas'
        },
        sustentavel: false
      },
      {
        codigo: '000004',
        descricao: 'PASTA SUSPENSA ARQUIVO, PLASTICO, COR VERDE, COM VISOR',
        unidadeFornecimento: 'UNIDADE',
        status: 1,
        dataAtualizacao: '2025-10-10',
        grupoMaterial: {
          codigo: '2300',
          descricao: 'MATERIAL DE EXPEDIENTE'
        },
        classeMaterial: {
          codigo: '2302',
          descricao: 'MATERIAL DE ARQUIVO'
        },
        pdm: {
          codigo: 'PDM000004',
          descricao: 'Pasta Suspensa Verde'
        },
        sustentavel: false
      },
      {
        codigo: '000005',
        descricao: 'TONER IMPRESSORA HP LASERJET, PRETO, MODELO CE285A',
        unidadeFornecimento: 'UNIDADE',
        status: 1,
        dataAtualizacao: '2025-11-01',
        grupoMaterial: {
          codigo: '1500',
          descricao: 'MATERIAL DE INFORMATICA'
        },
        classeMaterial: {
          codigo: '1501',
          descricao: 'CONSUMIVEL DE INFORMATICA'
        },
        pdm: {
          codigo: 'PDM000005',
          descricao: 'Toner HP CE285A Preto'
        },
        sustentavel: false
      }
    ]
  }
};

export const MOCK_SERVICOS = {
  _metadata: {
    paginaAtual: 1,
    totalPaginas: 450,
    tamanhoPagina: 10,
    totalRegistros: 4500
  },
  _embedded: {
    itens: [
      {
        codigo: 'S00001',
        descricao: 'LIMPEZA E CONSERVACAO PREDIAL',
        unidadeFornecimento: 'MES',
        status: 1,
        dataAtualizacao: '2025-10-25',
        grupoServico: {
          codigo: '9000',
          descricao: 'SERVICOS DE MANUTENCAO'
        },
        classeServico: {
          codigo: '9001',
          descricao: 'LIMPEZA E CONSERVACAO'
        }
      },
      {
        codigo: 'S00002',
        descricao: 'MANUTENCAO PREVENTIVA AR CONDICIONADO',
        unidadeFornecimento: 'SERVICO',
        status: 1,
        dataAtualizacao: '2025-10-18',
        grupoServico: {
          codigo: '9000',
          descricao: 'SERVICOS DE MANUTENCAO'
        },
        classeServico: {
          codigo: '9002',
          descricao: 'MANUTENCAO EQUIPAMENTOS'
        }
      },
      {
        codigo: 'S00003',
        descricao: 'VIGILANCIA ARMADA 24 HORAS',
        unidadeFornecimento: 'MES',
        status: 1,
        dataAtualizacao: '2025-11-02',
        grupoServico: {
          codigo: '8500',
          descricao: 'SERVICOS DE SEGURANCA'
        },
        classeServico: {
          codigo: '8501',
          descricao: 'VIGILANCIA'
        }
      }
    ]
  }
};

export const MOCK_UASG = {
  _metadata: {
    paginaAtual: 1,
    totalPaginas: 120,
    tamanhoPagina: 10,
    totalRegistros: 1200
  },
  _embedded: {
    itens: [
      {
        codigoUasg: '153001',
        nome: 'MINISTERIO DA EDUCACAO',
        uf: 'DF',
        municipio: 'BRASILIA',
        status: 1,
        orgaoSuperior: 'MINISTERIO DA EDUCACAO',
        dataAtualizacao: '2025-10-01'
      },
      {
        codigoUasg: '153002',
        nome: 'SECRETARIA DE EDUCACAO BASICA',
        uf: 'DF',
        municipio: 'BRASILIA',
        status: 1,
        orgaoSuperior: 'MINISTERIO DA EDUCACAO',
        dataAtualizacao: '2025-10-01'
      },
      {
        codigoUasg: '110001',
        nome: 'MINISTERIO DA SAUDE',
        uf: 'DF',
        municipio: 'BRASILIA',
        status: 1,
        orgaoSuperior: 'MINISTERIO DA SAUDE',
        dataAtualizacao: '2025-09-28'
      }
    ]
  }
};

export const MOCK_ARP = {
  _metadata: {
    paginaAtual: 1,
    totalPaginas: 300,
    tamanhoPagina: 10,
    totalRegistros: 3000
  },
  _embedded: {
    itens: [
      {
        numeroAta: '00001/2025',
        anoAta: 2025,
        orgao: 'MINISTERIO DA EDUCACAO',
        codigoItem: '000001',
        descricaoItem: 'CANETA ESFEROGRAFICA AZUL',
        valorUnitario: 0.5,
        quantidade: 10000,
        unidade: 'UNIDADE',
        dataInicio: '2025-01-15',
        dataFim: '2025-12-31',
        situacao: 'VIGENTE'
      },
      {
        numeroAta: '00002/2025',
        anoAta: 2025,
        orgao: 'MINISTERIO DA SAUDE',
        codigoItem: '000002',
        descricaoItem: 'PAPEL SULFITE A4',
        valorUnitario: 18.5,
        quantidade: 5000,
        unidade: 'RESMA',
        dataInicio: '2025-02-01',
        dataFim: '2025-12-31',
        situacao: 'VIGENTE'
      }
    ]
  }
};

export const MODO_DEMO_ATIVO = {
  ativo: true,
  mensagem: '⚠️ MODO DEMONSTRAÇÃO: API do Compras.gov.br indisponível. Usando dados de exemplo.'
};
