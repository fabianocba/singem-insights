import * as API from './apiCompras.js';

export const DATASETS = {
  materiais: {
    label: 'Catálogo – Material',
    apiFunction: API.getMateriais,
    filters: [
      {
        name: 'codigoItem',
        label: 'Código CATMAT',
        type: 'text',
        placeholder: 'Ex: 233420'
      },
      {
        name: 'descricaoItem',
        label: 'Descrição do Material',
        type: 'text',
        placeholder: 'Ex: papel sulfite'
      },
      {
        name: 'codigoGrupo',
        label: 'Código do Grupo',
        type: 'text',
        placeholder: 'Ex: 1'
      },
      {
        name: 'codigoClasse',
        label: 'Código da Classe',
        type: 'text',
        placeholder: 'Ex: 10'
      },
      {
        name: 'codigoPdm',
        label: 'Código PDM',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'statusItem',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: '1', label: 'Ativo' },
          { value: '0', label: 'Inativo' }
        ]
      },
      {
        name: 'bps',
        label: 'BPS',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'codigo_ncm',
        label: 'Código NCM',
        type: 'text',
        placeholder: 'Ex: 48025610'
      }
    ]
  },
  servicos: {
    label: 'Catálogo – Serviço',
    apiFunction: API.getServicos,
    filters: [
      {
        name: 'descricaoItem',
        label: 'Descrição do Serviço',
        type: 'text',
        placeholder: 'Ex: manutenção predial'
      },
      {
        name: 'codigoGrupo',
        label: 'Código do Grupo',
        type: 'text',
        placeholder: 'Ex: 1'
      },
      {
        name: 'codigoClasse',
        label: 'Código da Classe',
        type: 'text',
        placeholder: 'Ex: 10'
      },
      {
        name: 'statusItem',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: '1', label: 'Ativo' },
          { value: '0', label: 'Inativo' }
        ]
      }
    ]
  },
  'precos-praticados': {
    label: 'Módulo 3 - Preços Praticados (CATMAT/CATSER)',
    apiFunction: API.getPrecosPraticados,
    requiredFilters: ['codigos'],
    autoSearch: false,
    supportsBackendExport: true,
    filters: [
      {
        name: 'tipoCatalogo',
        label: 'Catálogo',
        type: 'select',
        options: [
          { value: 'material', label: 'CATMAT (Material)' },
          { value: 'servico', label: 'CATSER (Serviço)' }
        ]
      },
      {
        name: 'codigos',
        label: 'Códigos CATMAT/CATSER',
        type: 'text',
        placeholder: 'Ex: 233420, 233421'
      },
      {
        name: 'periodo',
        label: 'Período rápido',
        type: 'select',
        options: [
          { value: '', label: 'Sem período rápido' },
          { value: '30d', label: 'Últimos 30 dias' },
          { value: '90d', label: 'Últimos 90 dias' },
          { value: '180d', label: 'Últimos 180 dias' },
          { value: '12m', label: 'Últimos 12 meses' },
          { value: 'ano-atual', label: 'Ano atual' }
        ]
      },
      {
        name: 'dataCompraInicio',
        label: 'Data inicial',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'dataCompraFim',
        label: 'Data final',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'ano',
        label: 'Ano',
        type: 'number',
        placeholder: 'Ex: 2025'
      },
      {
        name: 'mes',
        label: 'Mês',
        type: 'select',
        options: [
          { value: '', label: 'Todos os meses' },
          { value: '1', label: '01 - Janeiro' },
          { value: '2', label: '02 - Fevereiro' },
          { value: '3', label: '03 - Março' },
          { value: '4', label: '04 - Abril' },
          { value: '5', label: '05 - Maio' },
          { value: '6', label: '06 - Junho' },
          { value: '7', label: '07 - Julho' },
          { value: '8', label: '08 - Agosto' },
          { value: '9', label: '09 - Setembro' },
          { value: '10', label: '10 - Outubro' },
          { value: '11', label: '11 - Novembro' },
          { value: '12', label: '12 - Dezembro' }
        ]
      },
      {
        name: 'modalidade',
        label: 'Modalidade',
        type: 'text',
        placeholder: 'Ex: pregão, dispensa, concorrência'
      },
      {
        name: 'estado',
        label: 'Estado (UF)',
        type: 'text',
        placeholder: 'Ex: BA',
        maxLength: 2
      },
      {
        name: 'codigoUasg',
        label: 'Código UASG',
        type: 'text',
        placeholder: 'Ex: 158129'
      },
      {
        name: 'fornecedor',
        label: 'Fornecedor',
        type: 'text',
        placeholder: 'Razão social ou CNPJ'
      },
      {
        name: 'marca',
        label: 'Marca',
        type: 'text',
        placeholder: 'Ex: HP'
      },
      {
        name: 'precoMin',
        label: 'Preço mínimo',
        type: 'number',
        placeholder: 'Ex: 10.50'
      },
      {
        name: 'precoMax',
        label: 'Preço máximo',
        type: 'number',
        placeholder: 'Ex: 200.00'
      },
      {
        name: 'ordenacao',
        label: 'Ordenação',
        type: 'select',
        options: [
          { value: 'data-desc', label: 'Data mais recente' },
          { value: 'data-asc', label: 'Data mais antiga' },
          { value: 'preco-desc', label: 'Maior preço' },
          { value: 'preco-asc', label: 'Menor preço' },
          { value: 'fornecedor-asc', label: 'Fornecedor (A-Z)' },
          { value: 'fornecedor-desc', label: 'Fornecedor (Z-A)' }
        ]
      }
    ]
  },
  uasg: {
    label: '05 - UASG',
    apiFunction: API.getUASG,
    supportsBackendExport: true,
    backendHint: 'Use filtros oficiais de UASG/órgão. Códigos CATMAT/CATSER ativam o cruzamento com preços praticados.',
    columns: [
      { label: 'Código UASG', key: 'codigo' },
      { label: 'Nome UASG', key: 'descricao' },
      { label: 'Órgão', key: 'orgao' },
      { label: 'UF', key: 'unidade' },
      { label: 'Status', key: 'status' },
      { label: 'Uso SISG', key: 'usoSisg' }
    ],
    filters: [
      {
        name: 'entity',
        label: 'Entidade',
        type: 'select',
        options: [
          { value: 'uasg', label: 'UASG' },
          { value: 'orgao', label: 'Órgão' }
        ]
      },
      {
        name: 'codigoUasg',
        label: 'Código UASG',
        type: 'text',
        placeholder: 'Ex: 158129'
      },
      {
        name: 'codigoOrgao',
        label: 'Código do Órgão',
        type: 'text',
        placeholder: 'Ex: 26232'
      },
      {
        name: 'cnpjCpfOrgao',
        label: 'CNPJ do Órgão',
        type: 'text',
        placeholder: 'Ex: 10773122000176'
      },
      {
        name: 'cnpjCpfOrgaoVinculado',
        label: 'CNPJ Órgão Vinculado',
        type: 'text',
        placeholder: 'Ex: 10773122000176'
      },
      {
        name: 'cnpjCpfOrgaoSuperior',
        label: 'CNPJ Órgão Superior',
        type: 'text',
        placeholder: 'Ex: 00394445000108'
      },
      {
        name: 'siglaUf',
        label: 'UF',
        type: 'text',
        placeholder: 'Ex: BA',
        maxLength: 2
      },
      {
        name: 'statusUasg',
        label: 'Status UASG',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Ativa' },
          { value: 'false', label: 'Inativa' }
        ]
      },
      {
        name: 'statusOrgao',
        label: 'Status Órgão',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' }
        ]
      },
      {
        name: 'usoSisg',
        label: 'Uso SISG',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' }
        ]
      },
      {
        name: 'tipoCatalogo',
        label: 'Catálogo p/ cruzamento',
        type: 'select',
        options: [
          { value: 'material', label: 'CATMAT (Material)' },
          { value: 'servico', label: 'CATSER (Serviço)' }
        ]
      },
      {
        name: 'codigos',
        label: 'Códigos CATMAT/CATSER',
        type: 'text',
        placeholder: 'Ex: 233420, 302295'
      }
    ]
  },
  fornecedor: {
    label: '10 - Fornecedor',
    apiFunction: API.getFornecedor,
    supportsBackendExport: true,
    backendHint:
      'Use filtros oficiais do fornecedor. Para busca aproximada por nome, informe também códigos CATMAT/CATSER para cruzamento analítico.',
    columns: [
      { label: 'CNPJ/CPF', key: 'codigo' },
      { label: 'Nome', key: 'descricao' },
      { label: 'Natureza Jurídica', key: 'naturezaJuridica' },
      { label: 'Porte', key: 'porte' },
      { label: 'CNAE', key: 'codigoCnae' },
      { label: 'Status', key: 'status' }
    ],
    filters: [
      {
        name: 'cnpj',
        label: 'CNPJ',
        type: 'text',
        placeholder: 'Ex: 10773122000176'
      },
      {
        name: 'cpf',
        label: 'CPF',
        type: 'text',
        placeholder: 'Ex: 12345678901'
      },
      {
        name: 'nomeFornecedor',
        label: 'Nome do Fornecedor',
        type: 'text',
        placeholder: 'Ex: Papelaria Bahia Ltda'
      },
      {
        name: 'naturezaJuridicaId',
        label: 'Natureza Jurídica',
        type: 'text',
        placeholder: 'Ex: 2062'
      },
      {
        name: 'porteEmpresaId',
        label: 'Porte',
        type: 'text',
        placeholder: 'Ex: 3'
      },
      {
        name: 'codigoCnae',
        label: 'CNAE',
        type: 'text',
        placeholder: 'Ex: 4751201'
      },
      {
        name: 'ativo',
        label: 'Ativo',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' }
        ]
      },
      {
        name: 'codigoUasg',
        label: 'Código UASG relacionado',
        type: 'text',
        placeholder: 'Ex: 158129'
      },
      {
        name: 'estado',
        label: 'UF relacionada',
        type: 'text',
        placeholder: 'Ex: BA',
        maxLength: 2
      },
      {
        name: 'tipoCatalogo',
        label: 'Catálogo p/ cruzamento',
        type: 'select',
        options: [
          { value: 'material', label: 'CATMAT (Material)' },
          { value: 'servico', label: 'CATSER (Serviço)' }
        ]
      },
      {
        name: 'codigos',
        label: 'Códigos CATMAT/CATSER',
        type: 'text',
        placeholder: 'Ex: 233420, 302295'
      }
    ]
  },
  arp: {
    label: 'ARP – Itens (Atas de Registro de Preços)',
    apiFunction: API.getARP,
    requiredFilters: ['dataVigenciaInicial', 'dataVigenciaFinal'],
    filters: [
      {
        name: 'dataVigenciaInicial',
        label: 'Vigência inicial',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'dataVigenciaFinal',
        label: 'Vigência final',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'numeroAtaRegistroPreco',
        label: 'Número da Ata',
        type: 'text',
        placeholder: 'Ex: 15/2025'
      },
      {
        name: 'codigoUnidadeGerenciadora',
        label: 'Código da Unidade Gerenciadora',
        type: 'text',
        placeholder: 'Ex: 158129'
      },
      {
        name: 'codigoModalidadeCompra',
        label: 'Modalidade da Compra',
        type: 'text',
        placeholder: 'Ex: 5'
      },
      {
        name: 'codigoItem',
        label: 'Código do Item',
        type: 'text',
        placeholder: 'Ex: 233420'
      },
      {
        name: 'codigoPdm',
        label: 'Código PDM',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'niFornecedor',
        label: 'CNPJ do Fornecedor',
        type: 'text',
        placeholder: 'Ex: 10773122000176'
      },
      {
        name: 'numeroCompra',
        label: 'Número da Compra',
        type: 'text',
        placeholder: 'Ex: 00015/2025'
      }
    ]
  },
  pncp: {
    label: 'Contratações – PNCP/Lei 14.133',
    apiFunction: API.getPNCP,
    filters: [
      {
        name: 'objeto',
        label: 'Nome/Processo SUAP da Contratação',
        type: 'text',
        placeholder: 'Ex: aquisição de notebooks'
      },
      {
        name: 'cnpjOrgao',
        label: 'CNPJ do Órgão',
        type: 'text',
        placeholder: 'Ex: 12345678000190'
      },
      { name: 'ano', label: 'Ano', type: 'text', placeholder: 'Ex: 2025' },
      {
        name: 'modalidade',
        label: 'Modalidade',
        type: 'text',
        placeholder: 'Ex: pregao_eletronico'
      },
      {
        name: 'situacao',
        label: 'Situação',
        type: 'text',
        placeholder: 'Ex: em_andamento'
      }
    ]
  },
  'legado-licitacoes': {
    label: 'Legado – Licitações (Sistema Antigo)',
    apiFunction: API.getLegadoLicitacoes,
    requiredFilters: ['data_publicacao_inicial', 'data_publicacao_final'],
    filters: [
      {
        name: 'data_publicacao_inicial',
        label: 'Data publicação inicial',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'data_publicacao_final',
        label: 'Data publicação final',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'uasg',
        label: 'Código UASG',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'modalidade',
        label: 'Modalidade',
        type: 'text',
        placeholder: 'Ex: 1 (Pregão)'
      }
    ]
  },
  'legado-itens': {
    label: 'Legado – Itens de Licitação',
    apiFunction: API.getLegadoItens,
    requiredFilters: ['modalidade'],
    filters: [
      {
        name: 'modalidade',
        label: 'Modalidade',
        type: 'text',
        placeholder: 'Ex: 1'
      },
      {
        name: 'uasg',
        label: 'Código UASG',
        type: 'text',
        placeholder: 'Ex: 123456'
      },
      {
        name: 'numeroLicitacao',
        label: 'Número da Licitação',
        type: 'text',
        placeholder: 'Ex: 12345'
      },
      {
        name: 'descricao',
        label: 'Nome/Descrição do Item',
        type: 'text',
        placeholder: 'Ex: caneta esferográfica'
      }
    ]
  }
};
