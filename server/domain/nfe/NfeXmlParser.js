/**
 * Parser avançado de XML de NF-e
 * Extração robusta usando DOM/XPath (sem regex para valores)
 * Suporta layouts 3.10 e 4.00
 *
 * @module NfeXmlParser
 */

const { DOMParser } = require('@xmldom/xmldom');

// Versões suportadas
const VERSOES_SUPORTADAS = ['3.10', '4.00'];

/**
 * Classe para parsing de XML de NF-e
 */
class NfeXmlParser {
  constructor() {
    this.doc = null;
    this.versao = null;
  }

  /**
   * Valida estrutura básica do XML de NF-e
   * @param {string} xmlContent - Conteúdo XML
   * @returns {{valido: boolean, erro?: string, versao?: string}}
   */
  validarEstrutura(xmlContent) {
    if (!xmlContent || typeof xmlContent !== 'string') {
      return { valido: false, erro: 'XML vazio ou inválido' };
    }

    try {
      const parser = new DOMParser({
        errorHandler: {
          warning: () => {},
          error: (msg) => {
            throw new Error(msg);
          },
          fatalError: (msg) => {
            throw new Error(msg);
          }
        }
      });

      const doc = parser.parseFromString(xmlContent, 'text/xml');

      // Verifica erros de parsing
      const parseErrors = doc.getElementsByTagName('parsererror');
      if (parseErrors.length > 0) {
        return { valido: false, erro: 'XML mal formado' };
      }

      // Verifica se é NF-e (aceita nfeProc ou NFe diretamente)
      const nfeProc = doc.getElementsByTagName('nfeProc')[0];
      const nfe = doc.getElementsByTagName('NFe')[0];

      if (!nfeProc && !nfe) {
        return { valido: false, erro: 'XML não é uma NF-e (tag nfeProc ou NFe não encontrada)' };
      }

      // Verifica infNFe
      const infNFe = doc.getElementsByTagName('infNFe')[0];
      if (!infNFe) {
        return { valido: false, erro: 'Tag infNFe não encontrada' };
      }

      // Verifica versão
      const versao = infNFe.getAttribute('versao');
      if (!versao) {
        return { valido: false, erro: 'Atributo versao não encontrado em infNFe' };
      }

      if (!VERSOES_SUPORTADAS.includes(versao)) {
        return {
          valido: true,
          versao,
          aviso: `Versão ${versao} pode não ser totalmente suportada`
        };
      }

      // Verificações estruturais mínimas
      const ide = doc.getElementsByTagName('ide')[0];
      const emit = doc.getElementsByTagName('emit')[0];
      const total = doc.getElementsByTagName('total')[0];

      if (!ide) {
        return { valido: false, erro: 'Tag ide (identificação) não encontrada' };
      }
      if (!emit) {
        return { valido: false, erro: 'Tag emit (emitente) não encontrada' };
      }
      if (!total) {
        return { valido: false, erro: 'Tag total não encontrada' };
      }

      return { valido: true, versao };
    } catch (error) {
      return { valido: false, erro: `Erro ao validar XML: ${error.message}` };
    }
  }

  /**
   * Verifica se o XML é uma NF-e válida
   * @param {string} xmlContent - Conteúdo XML
   * @returns {boolean}
   */
  isValidNfe(xmlContent) {
    const result = this.validarEstrutura(xmlContent);
    return result.valido;
  }

  /**
   * Parse completo do XML de NF-e
   * @param {string} xmlContent - Conteúdo XML
   * @returns {Object} Dados extraídos normalizados
   */
  parseNfe(xmlContent) {
    // Valida estrutura primeiro
    const validacao = this.validarEstrutura(xmlContent);
    if (!validacao.valido) {
      throw new Error(validacao.erro);
    }

    const parser = new DOMParser();
    this.doc = parser.parseFromString(xmlContent, 'text/xml');
    this.versao = validacao.versao;

    // Elementos principais
    const infNFe = this.doc.getElementsByTagName('infNFe')[0];
    const ide = this.doc.getElementsByTagName('ide')[0];
    const emit = this.doc.getElementsByTagName('emit')[0];
    const dest = this.doc.getElementsByTagName('dest')[0];
    const total = this.doc.getElementsByTagName('total')[0];
    const protNFe = this.doc.getElementsByTagName('protNFe')[0];
    const infAdic = this.doc.getElementsByTagName('infAdic')[0];

    return {
      // Metadados
      versao: this.versao,
      chaveAcesso: this._extrairChaveAcesso(infNFe, protNFe),

      // Identificação do documento
      ...this._parseIde(ide),

      // Emitente
      emitente: this._parseEmitente(emit),

      // Destinatário
      destinatario: this._parseDestinatario(dest),

      // Itens
      itens: this._parseItens(),

      // Totais
      totais: this._parseTotais(total),

      // Transporte
      transporte: this._parseTransporte(),

      // Cobrança
      cobranca: this._parseCobranca(),

      // Informações adicionais
      infAdicionais: {
        infCpl: this._getValue(infAdic, 'infCpl'),
        infAdFisco: this._getValue(infAdic, 'infAdFisco')
      },

      // Protocolo de autorização
      protocolo: this._parseProtocolo(protNFe)
    };
  }

  /**
   * Extrai apenas a chave de acesso
   * @param {string} xmlContent - Conteúdo XML
   * @returns {string|null}
   */
  extractChaveAcesso(xmlContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');

      // Tenta primeiro do protNFe/infProt/chNFe
      const chNFe = doc.getElementsByTagName('chNFe')[0];
      if (chNFe?.textContent) {
        return chNFe.textContent.trim();
      }

      // Fallback: extrai do atributo Id
      const infNFe = doc.getElementsByTagName('infNFe')[0];
      if (infNFe) {
        const id = infNFe.getAttribute('Id');
        if (id) {
          return id.replace(/^NFe/, '');
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // MÉTODOS PRIVADOS DE PARSING
  // ==========================================

  /**
   * Extrai chave de acesso
   * @private
   */
  _extrairChaveAcesso(infNFe, protNFe) {
    // Prioridade: chNFe do protocolo
    if (protNFe) {
      const chNFe = this._getValue(protNFe, 'chNFe');
      if (chNFe) {
        return chNFe;
      }
    }

    // Fallback: atributo Id
    if (infNFe) {
      const id = infNFe.getAttribute('Id');
      if (id) {
        return id.replace(/^NFe/, '');
      }
    }

    return null;
  }

  /**
   * Parse da identificação (ide)
   * @private
   */
  _parseIde(ide) {
    if (!ide) {
      return {};
    }

    // Data de emissão: tenta dhEmi primeiro, depois dEmi (versões antigas)
    let dataEmissao = this._getValue(ide, 'dhEmi');
    if (!dataEmissao) {
      dataEmissao = this._getValue(ide, 'dEmi');
    }

    // Data saída/entrada
    let dataSaidaEntrada = this._getValue(ide, 'dhSaiEnt');
    if (!dataSaidaEntrada) {
      dataSaidaEntrada = this._getValue(ide, 'dSaiEnt');
    }

    return {
      cUF: this._getValue(ide, 'cUF'),
      cNF: this._getValue(ide, 'cNF'),
      natOp: this._getValue(ide, 'natOp'),
      modelo: this._getValue(ide, 'mod'),
      serie: this._getValue(ide, 'serie'),
      numero: this._getValue(ide, 'nNF'),
      dataEmissao: this._normalizarData(dataEmissao),
      dataEmissaoOriginal: dataEmissao,
      dataSaidaEntrada: this._normalizarData(dataSaidaEntrada),
      tipoNF: this._getValue(ide, 'tpNF'), // 0=Entrada, 1=Saída
      idDest: this._getValue(ide, 'idDest'),
      cMunFG: this._getValue(ide, 'cMunFG'),
      tpImp: this._getValue(ide, 'tpImp'),
      tpEmis: this._getValue(ide, 'tpEmis'),
      finNFe: this._getValue(ide, 'finNFe'),
      indFinal: this._getValue(ide, 'indFinal'),
      indPres: this._getValue(ide, 'indPres')
    };
  }

  /**
   * Parse do emitente
   * @private
   */
  _parseEmitente(emit) {
    if (!emit) {
      return null;
    }

    const enderEmit = emit.getElementsByTagName('enderEmit')[0];

    return {
      cnpj: this._getValue(emit, 'CNPJ'),
      cpf: this._getValue(emit, 'CPF'),
      razaoSocial: this._getValue(emit, 'xNome'),
      nomeFantasia: this._getValue(emit, 'xFant'),
      ie: this._getValue(emit, 'IE'),
      iest: this._getValue(emit, 'IEST'),
      im: this._getValue(emit, 'IM'),
      cnae: this._getValue(emit, 'CNAE'),
      crt: this._getValue(emit, 'CRT'),
      endereco: this._parseEndereco(enderEmit)
    };
  }

  /**
   * Parse do destinatário
   * @private
   */
  _parseDestinatario(dest) {
    if (!dest) {
      return null;
    }

    const enderDest = dest.getElementsByTagName('enderDest')[0];

    return {
      cnpj: this._getValue(dest, 'CNPJ'),
      cpf: this._getValue(dest, 'CPF'),
      idEstrangeiro: this._getValue(dest, 'idEstrangeiro'),
      razaoSocial: this._getValue(dest, 'xNome'),
      ie: this._getValue(dest, 'IE'),
      isuf: this._getValue(dest, 'ISUF'),
      im: this._getValue(dest, 'IM'),
      email: this._getValue(dest, 'email'),
      endereco: this._parseEndereco(enderDest)
    };
  }

  /**
   * Parse de endereço
   * @private
   */
  _parseEndereco(ender) {
    if (!ender) {
      return null;
    }

    return {
      logradouro: this._getValue(ender, 'xLgr'),
      numero: this._getValue(ender, 'nro'),
      complemento: this._getValue(ender, 'xCpl'),
      bairro: this._getValue(ender, 'xBairro'),
      codigoMunicipio: this._getValue(ender, 'cMun'),
      municipio: this._getValue(ender, 'xMun'),
      uf: this._getValue(ender, 'UF'),
      cep: this._getValue(ender, 'CEP'),
      codigoPais: this._getValue(ender, 'cPais'),
      pais: this._getValue(ender, 'xPais'),
      telefone: this._getValue(ender, 'fone')
    };
  }

  /**
   * Parse dos itens (det)
   * Preserva 4 casas decimais em quantidades e valores unitários
   * @private
   */
  _parseItens() {
    const dets = this.doc.getElementsByTagName('det');
    const itens = [];

    for (let i = 0; i < dets.length; i++) {
      const det = dets[i];
      const prod = det.getElementsByTagName('prod')[0];
      const imposto = det.getElementsByTagName('imposto')[0];

      if (!prod) {
        continue;
      }

      // Preservar valores originais como string para precisão total
      const qComRaw = this._getValue(prod, 'qCom');
      const vUnComRaw = this._getValue(prod, 'vUnCom');
      const vProdRaw = this._getValue(prod, 'vProd');
      const qTribRaw = this._getValue(prod, 'qTrib');
      const vUnTribRaw = this._getValue(prod, 'vUnTrib');

      itens.push({
        numero: det.getAttribute('nItem'),
        codigo: this._getValue(prod, 'cProd'),
        ean: this._getValue(prod, 'cEAN'),
        eanTrib: this._getValue(prod, 'cEANTrib'),
        descricao: this._getValue(prod, 'xProd'),
        ncm: this._getValue(prod, 'NCM'),
        cest: this._getValue(prod, 'CEST'),
        cfop: this._getValue(prod, 'CFOP'),
        unidade: this._getValue(prod, 'uCom'),
        // Valores numéricos com precisão de 4 casas
        quantidade: this._parseNumberPrecise(qComRaw, 4),
        valorUnitario: this._parseNumberPrecise(vUnComRaw, 4),
        valorTotal: this._parseNumberPrecise(vProdRaw, 2),
        // Valores originais (string) para auditoria
        _raw: {
          qCom: qComRaw,
          vUnCom: vUnComRaw,
          vProd: vProdRaw,
          qTrib: qTribRaw,
          vUnTrib: vUnTribRaw
        },
        unidadeTrib: this._getValue(prod, 'uTrib'),
        quantidadeTrib: this._parseNumberPrecise(qTribRaw, 4),
        valorUnitarioTrib: this._parseNumberPrecise(vUnTribRaw, 4),
        valorFrete: this._parseNumber(this._getValue(prod, 'vFrete')),
        valorSeguro: this._parseNumber(this._getValue(prod, 'vSeg')),
        valorDesconto: this._parseNumber(this._getValue(prod, 'vDesc')),
        valorOutro: this._parseNumber(this._getValue(prod, 'vOutro')),
        indTot: this._getValue(prod, 'indTot'),
        infAdProd: this._getValue(det, 'infAdProd'),

        // Impostos (parse seguro - não quebra se faltar)
        impostos: this._parseImpostosItem(imposto)
      });
    }

    return itens;
  }

  /**
   * Parse de impostos de um item
   * @private
   */
  _parseImpostosItem(imposto) {
    if (!imposto) {
      return null;
    }

    return {
      icms: this._parseICMS(imposto),
      ipi: this._parseIPI(imposto),
      pis: this._parsePIS(imposto),
      cofins: this._parseCOFINS(imposto),
      ii: this._parseII(imposto)
    };
  }

  /**
   * Parse ICMS
   * @private
   */
  _parseICMS(imposto) {
    if (!imposto) {
      return null;
    }

    const icms = imposto.getElementsByTagName('ICMS')[0];
    if (!icms) {
      return null;
    }

    // Pode ter diferentes grupos (ICMS00, ICMS10, ICMS20, etc)
    const grupos = [
      'ICMS00',
      'ICMS10',
      'ICMS20',
      'ICMS30',
      'ICMS40',
      'ICMS51',
      'ICMS60',
      'ICMS70',
      'ICMS90',
      'ICMSSN101',
      'ICMSSN102',
      'ICMSSN201',
      'ICMSSN202',
      'ICMSSN500',
      'ICMSSN900'
    ];

    let grupo = null;
    for (const g of grupos) {
      const element = icms.getElementsByTagName(g)[0];
      if (element) {
        grupo = element;
        break;
      }
    }

    if (!grupo) {
      grupo = icms.firstChild;
    }

    if (!grupo) {
      return null;
    }

    return {
      origem: this._getValue(grupo, 'orig'),
      cst: this._getValue(grupo, 'CST') || this._getValue(grupo, 'CSOSN'),
      modBC: this._getValue(grupo, 'modBC'),
      baseCalculo: this._parseNumber(this._getValue(grupo, 'vBC')),
      aliquota: this._parseNumber(this._getValue(grupo, 'pICMS')),
      valor: this._parseNumber(this._getValue(grupo, 'vICMS')),
      modBCST: this._getValue(grupo, 'modBCST'),
      baseCalculoST: this._parseNumber(this._getValue(grupo, 'vBCST')),
      aliquotaST: this._parseNumber(this._getValue(grupo, 'pICMSST')),
      valorST: this._parseNumber(this._getValue(grupo, 'vICMSST'))
    };
  }

  /**
   * Parse IPI
   * @private
   */
  _parseIPI(imposto) {
    if (!imposto) {
      return null;
    }

    const ipi = imposto.getElementsByTagName('IPI')[0];
    if (!ipi) {
      return null;
    }

    const ipiTrib = ipi.getElementsByTagName('IPITrib')[0];
    const ipiNT = ipi.getElementsByTagName('IPINT')[0];

    const grupo = ipiTrib || ipiNT;

    return {
      cEnq: this._getValue(ipi, 'cEnq'),
      cst: this._getValue(grupo, 'CST'),
      baseCalculo: this._parseNumber(this._getValue(ipiTrib, 'vBC')),
      aliquota: this._parseNumber(this._getValue(ipiTrib, 'pIPI')),
      valor: this._parseNumber(this._getValue(ipiTrib, 'vIPI'))
    };
  }

  /**
   * Parse PIS
   * @private
   */
  _parsePIS(imposto) {
    if (!imposto) {
      return null;
    }

    const pis = imposto.getElementsByTagName('PIS')[0];
    if (!pis) {
      return null;
    }

    const grupos = ['PISAliq', 'PISQtde', 'PISNT', 'PISOutr'];
    let grupo = null;

    for (const g of grupos) {
      const element = pis.getElementsByTagName(g)[0];
      if (element) {
        grupo = element;
        break;
      }
    }

    if (!grupo) {
      return null;
    }

    return {
      cst: this._getValue(grupo, 'CST'),
      baseCalculo: this._parseNumber(this._getValue(grupo, 'vBC')),
      aliquota: this._parseNumber(this._getValue(grupo, 'pPIS')),
      valor: this._parseNumber(this._getValue(grupo, 'vPIS'))
    };
  }

  /**
   * Parse COFINS
   * @private
   */
  _parseCOFINS(imposto) {
    if (!imposto) {
      return null;
    }

    const cofins = imposto.getElementsByTagName('COFINS')[0];
    if (!cofins) {
      return null;
    }

    const grupos = ['COFINSAliq', 'COFINSQtde', 'COFINSNT', 'COFINSOutr'];
    let grupo = null;

    for (const g of grupos) {
      const element = cofins.getElementsByTagName(g)[0];
      if (element) {
        grupo = element;
        break;
      }
    }

    if (!grupo) {
      return null;
    }

    return {
      cst: this._getValue(grupo, 'CST'),
      baseCalculo: this._parseNumber(this._getValue(grupo, 'vBC')),
      aliquota: this._parseNumber(this._getValue(grupo, 'pCOFINS')),
      valor: this._parseNumber(this._getValue(grupo, 'vCOFINS'))
    };
  }

  /**
   * Parse II (Imposto de Importação)
   * @private
   */
  _parseII(imposto) {
    if (!imposto) {
      return null;
    }

    const ii = imposto.getElementsByTagName('II')[0];
    if (!ii) {
      return null;
    }

    return {
      baseCalculo: this._parseNumber(this._getValue(ii, 'vBC')),
      despAduaneiras: this._parseNumber(this._getValue(ii, 'vDespAdu')),
      valor: this._parseNumber(this._getValue(ii, 'vII')),
      iof: this._parseNumber(this._getValue(ii, 'vIOF'))
    };
  }

  /**
   * Parse dos totais
   * @private
   */
  _parseTotais(total) {
    if (!total) {
      return null;
    }

    const icmsTot = total.getElementsByTagName('ICMSTot')[0];
    if (!icmsTot) {
      return null;
    }

    return {
      baseCalculoICMS: this._parseNumber(this._getValue(icmsTot, 'vBC')),
      valorICMS: this._parseNumber(this._getValue(icmsTot, 'vICMS')),
      valorICMSDeson: this._parseNumber(this._getValue(icmsTot, 'vICMSDeson')),
      valorFCPUFDest: this._parseNumber(this._getValue(icmsTot, 'vFCPUFDest')),
      valorICMSUFDest: this._parseNumber(this._getValue(icmsTot, 'vICMSUFDest')),
      valorICMSUFRemet: this._parseNumber(this._getValue(icmsTot, 'vICMSUFRemet')),
      valorFCP: this._parseNumber(this._getValue(icmsTot, 'vFCP')),
      baseCalculoST: this._parseNumber(this._getValue(icmsTot, 'vBCST')),
      valorST: this._parseNumber(this._getValue(icmsTot, 'vST')),
      valorFCPST: this._parseNumber(this._getValue(icmsTot, 'vFCPST')),
      valorFCPSTRet: this._parseNumber(this._getValue(icmsTot, 'vFCPSTRet')),
      valorProdutos: this._parseNumber(this._getValue(icmsTot, 'vProd')),
      valorFrete: this._parseNumber(this._getValue(icmsTot, 'vFrete')),
      valorSeguro: this._parseNumber(this._getValue(icmsTot, 'vSeg')),
      valorDesconto: this._parseNumber(this._getValue(icmsTot, 'vDesc')),
      valorII: this._parseNumber(this._getValue(icmsTot, 'vII')),
      valorIPI: this._parseNumber(this._getValue(icmsTot, 'vIPI')),
      valorIPIDevol: this._parseNumber(this._getValue(icmsTot, 'vIPIDevol')),
      valorPIS: this._parseNumber(this._getValue(icmsTot, 'vPIS')),
      valorCOFINS: this._parseNumber(this._getValue(icmsTot, 'vCOFINS')),
      valorOutros: this._parseNumber(this._getValue(icmsTot, 'vOutro')),
      valorNF: this._parseNumber(this._getValue(icmsTot, 'vNF'))
    };
  }

  /**
   * Parse do transporte
   * @private
   */
  _parseTransporte() {
    const transp = this.doc.getElementsByTagName('transp')[0];
    if (!transp) {
      return null;
    }

    const transporta = transp.getElementsByTagName('transporta')[0];
    const veicTransp = transp.getElementsByTagName('veicTransp')[0];
    const vol = transp.getElementsByTagName('vol')[0];

    return {
      modalidadeFrete: this._getValue(transp, 'modFrete'),
      transportadora: transporta
        ? {
            cnpj: this._getValue(transporta, 'CNPJ'),
            cpf: this._getValue(transporta, 'CPF'),
            razaoSocial: this._getValue(transporta, 'xNome'),
            ie: this._getValue(transporta, 'IE'),
            endereco: this._getValue(transporta, 'xEnder'),
            municipio: this._getValue(transporta, 'xMun'),
            uf: this._getValue(transporta, 'UF')
          }
        : null,
      veiculo: veicTransp
        ? {
            placa: this._getValue(veicTransp, 'placa'),
            uf: this._getValue(veicTransp, 'UF'),
            rntc: this._getValue(veicTransp, 'RNTC')
          }
        : null,
      volume: vol
        ? {
            quantidade: this._parseNumber(this._getValue(vol, 'qVol')),
            especie: this._getValue(vol, 'esp'),
            marca: this._getValue(vol, 'marca'),
            numeracao: this._getValue(vol, 'nVol'),
            pesoLiquido: this._parseNumber(this._getValue(vol, 'pesoL')),
            pesoBruto: this._parseNumber(this._getValue(vol, 'pesoB'))
          }
        : null
    };
  }

  /**
   * Parse da cobrança
   * @private
   */
  _parseCobranca() {
    const cobr = this.doc.getElementsByTagName('cobr')[0];
    if (!cobr) {
      return null;
    }

    const fat = cobr.getElementsByTagName('fat')[0];
    const dups = cobr.getElementsByTagName('dup');

    const duplicatas = [];
    for (let i = 0; i < dups.length; i++) {
      duplicatas.push({
        numero: this._getValue(dups[i], 'nDup'),
        vencimento: this._normalizarData(this._getValue(dups[i], 'dVenc')),
        valor: this._parseNumber(this._getValue(dups[i], 'vDup'))
      });
    }

    return {
      fatura: fat
        ? {
            numero: this._getValue(fat, 'nFat'),
            valorOriginal: this._parseNumber(this._getValue(fat, 'vOrig')),
            valorDesconto: this._parseNumber(this._getValue(fat, 'vDesc')),
            valorLiquido: this._parseNumber(this._getValue(fat, 'vLiq'))
          }
        : null,
      duplicatas
    };
  }

  /**
   * Parse do protocolo de autorização
   * @private
   */
  _parseProtocolo(protNFe) {
    if (!protNFe) {
      return null;
    }

    const infProt = protNFe.getElementsByTagName('infProt')[0];
    if (!infProt) {
      return null;
    }

    return {
      ambiente: this._getValue(infProt, 'tpAmb'),
      versaoAplicativo: this._getValue(infProt, 'verAplic'),
      chaveAcesso: this._getValue(infProt, 'chNFe'),
      dataRecebimento: this._normalizarData(this._getValue(infProt, 'dhRecbto')),
      numeroProtocolo: this._getValue(infProt, 'nProt'),
      digestValue: this._getValue(infProt, 'digVal'),
      statusCodigo: this._getValue(infProt, 'cStat'),
      statusMotivo: this._getValue(infProt, 'xMotivo')
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Obtém valor de um elemento pelo nome da tag
   * @private
   */
  _getValue(parent, tagName) {
    if (!parent) {
      return null;
    }

    const elements = parent.getElementsByTagName(tagName);
    if (elements.length === 0) {
      return null;
    }

    const element = elements[0];
    return element?.textContent?.trim() || null;
  }

  /**
   * Converte string para número de forma segura
   * @private
   */
  _parseNumber(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Remove espaços e troca vírgula por ponto (caso tenha)
    const limpo = String(value).trim().replace(',', '.');
    const num = parseFloat(limpo);

    return isNaN(num) ? null : num;
  }

  /**
   * Converte string para número preservando precisão (casas decimais)
   * @param {string} value - Valor string
   * @param {number} decimals - Número de casas decimais a preservar
   * @returns {number|null}
   * @private
   */
  _parseNumberPrecise(value, decimals = 4) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const limpo = String(value).trim().replace(',', '.');
    const num = parseFloat(limpo);

    if (isNaN(num)) {
      return null;
    }

    // Preserva precisão usando Number com toFixed
    return Number(num.toFixed(decimals));
  }

  /**
   * Normaliza data para ISO 8601
   * Aceita formatos: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS-03:00, DD/MM/YYYY
   * @private
   */
  _normalizarData(valor) {
    if (!valor) {
      return null;
    }

    const limpo = valor.trim();

    // Já está em formato ISO ou similar
    if (/^\d{4}-\d{2}-\d{2}/.test(limpo)) {
      // Se tem timezone, retorna como está
      if (limpo.includes('T')) {
        return limpo;
      }
      // Só data, adiciona T00:00:00
      return `${limpo}T00:00:00`;
    }

    // Formato DD/MM/YYYY
    const match = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}T00:00:00`;
    }

    return limpo;
  }
}

module.exports = NfeXmlParser;
