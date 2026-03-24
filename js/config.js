/**
 * Configurações do Sistema - Controle de Material IF Baiano
 *
 * Este arquivo contém configurações que podem ser personalizadas
 * conforme as necessidades específicas do campus.
 */

window.CONFIG = {
  storage: {
    mode: 'server',
    provider: 'postgres',
    persistLocalConfig: false
  },
  api: {
    // Em dev e produção, preferir mesmo origin e usar proxy /api do Nginx.
    baseUrl: window.location.origin
  },
  // Informações da Instituição
  instituicao: {
    nome: 'Instituto Federal de Educação, Ciência e Tecnologia Baiano',
    sigla: 'IF Baiano',
    campus: 'Campus - [Nome do Campus]',
    cnpj: '00.000.000/0000-00' // Substitua pelo CNPJ real
  },

  // Configurações do Sistema
  sistema: {
    versao: '1.0.0',
    dataVersao: '2025-10-30',
    desenvolvedor: 'Equipe TI - IF Baiano',
    ambiente: 'producao' // 'desenvolvimento' ou 'producao'
  },

  // Configurações de Upload
  upload: {
    tamanhoMaximo: 10 * 1024 * 1024, // 10MB em bytes
    tiposPermitidos: ['application/pdf'],
    mensagensErro: {
      tamanhoExcedido: 'Arquivo muito grande. Máximo permitido: 10MB',
      tipoInvalido: 'Tipo de arquivo não permitido. Use apenas PDFs',
      erroProcessamento: 'Erro ao processar arquivo. Tente novamente'
    }
  },

  // Configurações de Extração de PDF
  extracao: {
    // Padrões regex personalizados para o campus
    padroes: {
      numeroEmpenho: [
        /(?:nota de empenho|empenho)[\s\n]*(?:n[ºº°]?[\s]*)?(\d{4,})/i,
        /empenho[\s]*(?::|-)[\s]*(\d{4,})/i,
        /ne[\s]*(?::|-)[\s]*(\d{4,})/i
      ],
      numeroNF: [/(?:nota fiscal|nf-e)[\s\n]*(?:n[ºº°]?[\s]*)?(\d{3,})/i, /(?:nº|n°|numero)[\s]*(\d{3,})/i],
      cnpj: /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g,
      data: /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      valor: /r?\$?[\s]*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
    },

    // Palavras-chave para identificar seções
    palavrasChave: {
      fornecedor: ['fornecedor', 'razão social', 'empresa'],
      itens: ['item', 'descrição', 'quantidade', 'produto'],
      totais: ['total', 'subtotal', 'valor total']
    }
  },

  // Configurações de Validação
  validacao: {
    camposObrigatorios: {
      empenho: ['numero', 'dataEmpenho', 'fornecedor', 'cnpjFornecedor'],
      entrega: ['empenhoId', 'dataEntrega'],
      notaFiscal: ['numero', 'dataNotaFiscal', 'cnpjFornecedor']
    },

    formatacao: {
      cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
      data: /^\d{4}-\d{2}-\d{2}$/,
      numeroEmpenho: /^\d{4,}$/,
      numeroNF: /^\d{3,}$/
    }
  },

  // Configurações de Relatórios
  relatorios: {
    formatosExportacao: ['pdf', 'csv', 'excel'],
    configuracoesPDF: {
      orientacao: 'portrait', // 'portrait' ou 'landscape'
      margens: { top: 20, right: 20, bottom: 20, left: 20 },
      fonte: 'Helvetica',
      tamanhoFonte: 10
    },

    // Cabeçalhos padrão para relatórios
    cabecalhos: {
      empenhos: ['Número', 'Data', 'Fornecedor', 'CNPJ', 'Valor Total', 'Status'],
      entregas: ['Data Entrega', 'Empenho', 'Fornecedor', 'Itens Recebidos', 'Observações'],
      notasFiscais: ['Número', 'Data', 'CNPJ', 'Chave Acesso', 'Empenho', 'Valor Total'],
      divergencias: ['Tipo', 'Campo', 'Valor NF', 'Valor Empenho', 'Descrição']
    }
  },

  // Configurações de Interface
  interface: {
    tema: 'ifbaiano', // Tema padrão
    cores: {
      primaria: '#2E7D32',
      secundaria: '#FF9800',
      sucesso: '#4CAF50',
      aviso: '#FF9800',
      erro: '#F44336',
      info: '#2196F3'
    },

    // Mensagens personalizadas
    mensagens: {
      boas_vindas: 'Bem-vindo ao Sistema de Controle de Material',
      sucesso_empenho: 'Empenho cadastrado com sucesso!',
      sucesso_entrega: 'Entrega registrada com sucesso!',
      sucesso_nf: 'Nota fiscal cadastrada com sucesso!',
      erro_generico: 'Ocorreu um erro. Tente novamente.',
      confirmacao_exclusao: 'Tem certeza que deseja excluir este registro?'
    },

    // Configurações de paginação
    paginacao: {
      itensPorPagina: 50,
      mostrarTodos: false
    }
  },

  // Configurações de Backup
  backup: {
    automatico: false, // Em desenvolvimento
    intervalo: 24 * 60 * 60 * 1000, // 24 horas em milissegundos
    formatoExportacao: 'json',
    incluirPDFs: false // PDFs ocupam muito espaço
  },

  // Configurações de Segurança
  seguranca: {
    // Em desenvolvimento - para futuras implementações
    criptografia: false,
    logAuditoria: true,
    timeoutSessao: 0 // 0 = sem timeout (sistema local)
  },

  // Configurações de Debug
  debug: {
    habilitado: false, // Altere para true durante desenvolvimento
    nivelLog: 'info', // 'debug', 'info', 'warn', 'error'
    salvarLogs: false,
    mostrarTempoProcessamento: false
  },

  // URLs e Recursos Externos
  recursos: {
    pdfjs: {
      worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
      lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    },

    // Para futuras integrações
    apis: {
      cep: 'https://viacep.com.br/ws/',
      cnpj: null // A definir
    }
  },

  // Limites do Sistema
  limites: {
    maxEmpenhos: 10000,
    maxEntregasPorEmpenho: 100,
    maxItensPorEmpenho: 1000,
    maxNotasFiscais: 10000,
    tamanhoMaximoBD: 500 * 1024 * 1024 // 500MB
  }
};

// Função para carregar configurações personalizadas
window.carregarConfiguracoes = function () {
  return window.CONFIG;
};

// Função para salvar configurações
window.salvarConfiguracoes = function (novasConfigs) {
  const configAtual = { ...window.CONFIG, ...novasConfigs };
  window.CONFIG = configAtual;
  return true;
};

// Carrega configurações ao inicializar
document.addEventListener('DOMContentLoaded', () => {
  window.carregarConfiguracoes();

  if (window.CONFIG.debug.habilitado) {
    console.log('Configurações carregadas:', window.CONFIG);
  }
});
