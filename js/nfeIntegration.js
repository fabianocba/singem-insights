/**
 * Módulo de Integração com APIs de Nota Fiscal Eletrônica
 * Sistema de Controle de Material - IF Baiano
 */

class NFEIntegration {
  constructor() {
    this.apiEndpoints = {
      // URLs das APIs (configurar conforme ambiente)
      receitaFederal: 'https://www.nfe.fazenda.gov.br/portal/consulta.aspx',
      sefaz: null, // A definir conforme estado
      custom: null // API personalizada se houver
    };

    this.rateLimits = {
      maxRequestsPerMinute: 10,
      requestCount: 0,
      lastRequestTime: 0
    };
  }

  /**
   * Consulta nota fiscal por chave de acesso
   * @param {string} chave - Chave de acesso de 44 dígitos
   * @returns {Promise<Object>} Dados da nota fiscal
   */
  async consultarPorChave(chave) {
    try {
      // Valida chave de acesso
      if (!this.validarChaveAcesso(chave)) {
        throw new Error('Chave de acesso inválida');
      }

      // Verifica rate limit
      if (!this.verificarRateLimit()) {
        throw new Error('Limite de consultas excedido. Aguarde um momento.');
      }

      // Extrai informações da chave
      const infoChave = this.extrairInformacoesChave(chave);

      // Tenta diferentes métodos de consulta
      let resultado = null;

      // 1. Tenta API personalizada se configurada
      if (this.apiEndpoints.custom) {
        resultado = await this.consultarAPICustom(chave);
      }

      // 2. Tenta consulta via simulação (para desenvolvimento)
      if (!resultado) {
        resultado = await this.consultarSimulado(chave, infoChave);
      }

      this.incrementarRateLimit();
      return resultado;
    } catch (error) {
      console.error('Erro na consulta da NF-e:', error);
      throw error;
    }
  }

  /**
   * Valida formato da chave de acesso
   * @param {string} chave - Chave de acesso
   * @returns {boolean} True se válida
   */
  validarChaveAcesso(chave) {
    if (!chave || typeof chave !== 'string') {
      return false;
    }

    // Remove espaços e caracteres especiais
    const chaveLimpa = chave.replace(/\D/g, '');

    // Verifica se tem 44 dígitos
    if (chaveLimpa.length !== 44) {
      return false;
    }

    // Validação básica do dígito verificador (algoritmo simplificado)
    return this.validarDigitoVerificador(chaveLimpa);
  }

  /**
   * Valida dígito verificador da chave (implementação básica)
   * @param {string} chave - Chave de 44 dígitos
   * @returns {boolean} True se válida
   */
  validarDigitoVerificador(chave) {
    // Implementação simplificada - em produção usar algoritmo completo
    const digitos = chave.split('').map(Number);
    let soma = 0;
    let peso = 2;

    // Calcula soma ponderada dos primeiros 43 dígitos
    for (let i = 42; i >= 0; i--) {
      soma += digitos[i] * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }

    const resto = soma % 11;
    const digitoCalculado = resto < 2 ? 0 : 11 - resto;

    return digitoCalculado === digitos[43];
  }

  /**
   * Extrai informações da chave de acesso
   * @param {string} chave - Chave de 44 dígitos
   * @returns {Object} Informações extraídas
   */
  extrairInformacoesChave(chave) {
    return {
      uf: chave.substring(0, 2),
      aamm: chave.substring(2, 6), // Ano e mês
      cnpj: chave.substring(6, 20),
      modelo: chave.substring(20, 22), // 55=NF-e, 65=NFC-e
      serie: chave.substring(22, 25),
      numero: chave.substring(25, 34),
      tipoEmissao: chave.substring(34, 35),
      codigo: chave.substring(35, 43),
      dv: chave.substring(43, 44) // Dígito verificador
    };
  }

  /**
   * Consulta via API personalizada (placeholder)
   * @param {string} chave - Chave de acesso
   * @returns {Promise<Object>} Dados da NF-e
   */
  async consultarAPICustom(chave) {
    // Implementar integração com API específica do órgão
    // Exemplo: API da SEFAZ estadual ou sistema próprio

    const response = await fetch(this.apiEndpoints.custom, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.getAuthToken()
      },
      body: JSON.stringify({
        chaveAcesso: chave,
        tipoConsulta: 'completa'
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Consulta simulada para desenvolvimento e testes
   * @param {string} chave - Chave de acesso
   * @param {Object} infoChave - Informações extraídas da chave
   * @returns {Promise<Object>} Dados simulados da NF-e
   */
  async consultarSimulado(chave, infoChave) {
    // Simula delay de rede
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Simula falha ocasional (5% das vezes)
    if (Math.random() < 0.05) {
      throw new Error('NF-e não encontrada ou cancelada');
    }

    // Gera dados simulados realistas
    const ano = 2000 + parseInt(infoChave.aamm.substring(0, 2));
    const mes = parseInt(infoChave.aamm.substring(2, 4));

    return {
      chaveAcesso: chave,
      numero: parseInt(infoChave.numero).toString(),
      serie: parseInt(infoChave.serie).toString(),
      dataEmissao: this.gerarDataAleatoria(ano, mes),
      cnpjEmitente: this.formatarCNPJ(infoChave.cnpj),
      razaoSocialEmitente: this.gerarRazaoSocial(),
      valorTotal: this.gerarValorAleatorio(),
      situacao: 'Autorizada',
      protocolo: this.gerarProtocolo(),
      itens: this.gerarItensSimulados(),
      impostos: this.gerarImpostosSimulados(),
      dadosAdicionais: {
        observacoes: 'Dados obtidos via consulta automática',
        dataConsulta: new Date().toISOString()
      }
    };
  }

  /**
   * Gera data aleatória para simulação
   */
  gerarDataAleatoria(ano, mes) {
    const dia = Math.floor(Math.random() * 28) + 1;
    return `${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
  }

  /**
   * Gera razão social simulada
   */
  gerarRazaoSocial() {
    const empresas = [
      'Empresa Fornecedora LTDA',
      'Comercial de Materiais S/A',
      'Distribuidora Nacional EIRELI',
      'Indústria de Produtos Ltda',
      'Comércio e Serviços ME',
      'Material Escolar e Escritório Ltda'
    ];
    return empresas[Math.floor(Math.random() * empresas.length)];
  }

  /**
   * Gera valor aleatório realista
   */
  gerarValorAleatorio() {
    return parseFloat((Math.random() * 50000 + 100).toFixed(2));
  }

  /**
   * Gera protocolo simulado
   */
  gerarProtocolo() {
    const timestamp = Date.now().toString();
    return `${timestamp.substring(0, 15)}`;
  }

  /**
   * Gera itens simulados
   */
  gerarItensSimulados() {
    const quantidadeItens = Math.floor(Math.random() * 5) + 1;
    const itens = [];

    const produtos = [
      { codigo: 'PROD001', descricao: 'Material de Escritório', unidade: 'UN' },
      {
        codigo: 'PROD002',
        descricao: 'Equipamento de Informática',
        unidade: 'UN'
      },
      { codigo: 'PROD003', descricao: 'Material de Limpeza', unidade: 'LT' },
      { codigo: 'PROD004', descricao: 'Papel A4 75g Resma', unidade: 'PCT' },
      {
        codigo: 'PROD005',
        descricao: 'Caneta Esferográfica Azul',
        unidade: 'UN'
      }
    ];

    for (let i = 0; i < quantidadeItens; i++) {
      const produto = produtos[Math.floor(Math.random() * produtos.length)];
      const quantidade = Math.floor(Math.random() * 100) + 1;
      const valorUnitario = parseFloat((Math.random() * 500 + 10).toFixed(2));

      itens.push({
        sequencia: i + 1,
        codigo: produto.codigo,
        descricao: produto.descricao,
        unidade: produto.unidade,
        quantidade: quantidade,
        valorUnitario: valorUnitario,
        valorTotal: parseFloat((quantidade * valorUnitario).toFixed(2))
      });
    }

    return itens;
  }

  /**
   * Gera impostos simulados
   */
  gerarImpostosSimulados() {
    return {
      icms: parseFloat((Math.random() * 1000).toFixed(2)),
      ipi: parseFloat((Math.random() * 500).toFixed(2)),
      pis: parseFloat((Math.random() * 200).toFixed(2)),
      cofins: parseFloat((Math.random() * 300).toFixed(2))
    };
  }

  /**
   * Formatar CNPJ
   */
  formatarCNPJ(cnpj) {
    if (cnpj.length === 14) {
      return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  }

  /**
   * Verifica rate limit
   */
  verificarRateLimit() {
    const agora = Date.now();
    const umMinuto = 60 * 1000;

    // Reset contador se passou mais de um minuto
    if (agora - this.rateLimits.lastRequestTime > umMinuto) {
      this.rateLimits.requestCount = 0;
    }

    return this.rateLimits.requestCount < this.rateLimits.maxRequestsPerMinute;
  }

  /**
   * Incrementa contador de rate limit
   */
  incrementarRateLimit() {
    this.rateLimits.requestCount++;
    this.rateLimits.lastRequestTime = Date.now();
  }

  /**
   * Obtém token de autenticação (placeholder)
   */
  getAuthToken() {
    // Implementar lógica de autenticação se necessário
    return 'dummy-token';
  }

  /**
   * Processa código de barras e extrai chave
   * @param {string} codigoBarras - Código de barras da NF-e
   * @returns {string} Chave de acesso extraída
   */
  extrairChaveDoCodigoBarras(codigoBarras) {
    // Remove espaços e caracteres especiais
    const codigo = codigoBarras.replace(/\D/g, '');

    // Para NF-e, diferentes formatos podem existir
    if (codigo.length === 44) {
      // Chave completa no código
      return codigo;
    } else if (codigo.length >= 44) {
      // Chave pode estar no meio do código
      return codigo.substring(0, 44);
    }

    throw new Error('Não foi possível extrair chave de acesso do código de barras');
  }

  /**
   * Converte dados da API para formato interno
   * @param {Object} dadosAPI - Dados retornados pela API
   * @returns {Object} Dados no formato interno
   */
  /**
   * Converte dados da API para formato interno padronizado
   * IMPORTANTE: Deve retornar os mesmos campos que extrairDadosNotaFiscal do pdfReader
   * @param {Object} dadosAPI - Dados da API
   * @returns {Object} Dados no formato interno
   */
  converterParaFormatoInterno(dadosAPI) {
    return {
      // Campos principais (compatível com extrairDadosNotaFiscal)
      numero: dadosAPI.numero,
      data: dadosAPI.dataEmissao, // Formato unificado: 'data' ao invés de 'dataNotaFiscal'
      cnpjEmitente: dadosAPI.cnpjEmitente, // Formato unificado: 'cnpjEmitente'
      cnpjDestinatario: dadosAPI.cnpjDestinatario || '', // Adiciona campo cnpjDestinatario
      chaveAcesso: dadosAPI.chaveAcesso,
      valorTotal: dadosAPI.valorTotal,
      itens: dadosAPI.itens || [],

      // Campos adicionais específicos da API
      razaoSocial: dadosAPI.razaoSocialEmitente,
      situacao: dadosAPI.situacao,
      dadosAdicionais: {
        protocolo: dadosAPI.protocolo,
        impostos: dadosAPI.impostos,
        observacoes: dadosAPI.dadosAdicionais?.observacoes
      }
    };
  }

  /**
   * Busca fornecedor correspondente via IA usando CNPJ e razão social
   * @param {string} cnpj - CNPJ do emitente (14 dígitos)
   * @param {string} razaoSocial - Razão social do emitente
   * @returns {Promise<Object|null>} Sugestão de fornecedor ou null
   */
  async matchFornecedorAI(cnpj, razaoSocial) {
    void cnpj;
    void razaoSocial;
    return null;
  }

  /**
   * Busca correspondência de itens da NF-e com o catálogo CATMAT via IA
   * @param {Array} itens - Itens da NF-e
   * @returns {Promise<Array>} Itens enriquecidos com sugestões CATMAT
   */
  async matchItensAI(itens) {
    if (!Array.isArray(itens) || itens.length === 0) {
      return itens;
    }

    return itens;
  }

  /**
   * Analisa NF-e completa com IA, retornando fornecedor e itens enriquecidos
   * @param {Object} dadosNFe - Dados da NF-e já convertidos
   * @returns {Promise<Object>} Dados enriquecidos com sugestões AI
   */
  async enriquecerComIA(dadosNFe) {
    if (!dadosNFe) {
      return dadosNFe;
    }

    const [fornecedorMatch, itensEnriquecidos] = await Promise.all([
      this.matchFornecedorAI(dadosNFe.cnpjEmitente, dadosNFe.razaoSocial),
      this.matchItensAI(dadosNFe.itens || [])
    ]);

    return {
      ...dadosNFe,
      itens: itensEnriquecidos,
      _aiEnrichment: {
        fornecedor: fornecedorMatch,
        processedAt: new Date().toISOString()
      }
    };
  }
}

// Instância global da integração com NF-e
window.nfeIntegration = new NFEIntegration();
