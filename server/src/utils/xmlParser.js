/**
 * Parser de XML de NF-e
 * Extrai dados estruturados do XML da Nota Fiscal Eletrônica
 */

const { DOMParser } = require('@xmldom/xmldom');

class XmlParser {
  /**
   * Parse XML de NF-e e extrai dados principais
   * @param {string} xmlContent - Conteúdo XML da NF-e
   * @returns {Object} Dados extraídos
   */
  static parseNfe(xmlContent) {
    if (!xmlContent || typeof xmlContent !== 'string') {
      throw new Error('XML inválido ou vazio');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // Verifica se é XML válido de NF-e
    const nfeProc = doc.getElementsByTagName('nfeProc')[0] || doc.getElementsByTagName('NFe')[0];
    if (!nfeProc) {
      throw new Error('XML não é uma NF-e válida');
    }

    // Busca elementos principais
    const infNFe = doc.getElementsByTagName('infNFe')[0];
    const ide = doc.getElementsByTagName('ide')[0];
    const emit = doc.getElementsByTagName('emit')[0];
    const dest = doc.getElementsByTagName('dest')[0];
    const total = doc.getElementsByTagName('total')[0];
    const protNFe = doc.getElementsByTagName('protNFe')[0];

    const result = {
      // Identificação
      chaveAcesso: infNFe?.getAttribute('Id')?.replace('NFe', '') || '',
      versao: infNFe?.getAttribute('versao') || '',

      // Identificação do documento
      cUF: XmlParser._getValue(ide, 'cUF'),
      cNF: XmlParser._getValue(ide, 'cNF'),
      natOp: XmlParser._getValue(ide, 'natOp'),
      modelo: XmlParser._getValue(ide, 'mod'),
      serie: XmlParser._getValue(ide, 'serie'),
      numero: XmlParser._getValue(ide, 'nNF'),
      dataEmissao: XmlParser._getValue(ide, 'dhEmi'),
      dataSaidaEntrada: XmlParser._getValue(ide, 'dhSaiEnt'),
      tipoNF: XmlParser._getValue(ide, 'tpNF'), // 0=Entrada, 1=Saída

      // Emitente
      emitente: {
        cnpj: XmlParser._getValue(emit, 'CNPJ'),
        cpf: XmlParser._getValue(emit, 'CPF'),
        razaoSocial: XmlParser._getValue(emit, 'xNome'),
        nomeFantasia: XmlParser._getValue(emit, 'xFant'),
        ie: XmlParser._getValue(emit, 'IE'),
        endereco: XmlParser._parseEndereco(emit?.getElementsByTagName('enderEmit')[0])
      },

      // Destinatário
      destinatario: {
        cnpj: XmlParser._getValue(dest, 'CNPJ'),
        cpf: XmlParser._getValue(dest, 'CPF'),
        razaoSocial: XmlParser._getValue(dest, 'xNome'),
        ie: XmlParser._getValue(dest, 'IE'),
        email: XmlParser._getValue(dest, 'email'),
        endereco: XmlParser._parseEndereco(dest?.getElementsByTagName('enderDest')[0])
      },

      // Itens
      itens: XmlParser._parseItens(doc),

      // Totais
      totais: XmlParser._parseTotais(total),

      // Transporte
      transporte: XmlParser._parseTransporte(doc),

      // Cobrança
      cobranca: XmlParser._parseCobranca(doc),

      // Informações adicionais
      infAdicionais: {
        infCpl: XmlParser._getValue(doc.getElementsByTagName('infAdic')[0], 'infCpl'),
        infAdFisco: XmlParser._getValue(doc.getElementsByTagName('infAdic')[0], 'infAdFisco')
      },

      // Protocolo de autorização
      protocolo: protNFe
        ? {
            numero: XmlParser._getValue(protNFe, 'nProt'),
            dataHora: XmlParser._getValue(protNFe, 'dhRecbto'),
            status: XmlParser._getValue(protNFe, 'cStat'),
            motivo: XmlParser._getValue(protNFe, 'xMotivo'),
            digVal: XmlParser._getValue(protNFe, 'digVal')
          }
        : null
    };

    return result;
  }

  /**
   * Parse itens da NF-e
   * @private
   */
  static _parseItens(doc) {
    const dets = doc.getElementsByTagName('det');
    const itens = [];

    for (let i = 0; i < dets.length; i++) {
      const det = dets[i];
      const prod = det.getElementsByTagName('prod')[0];
      const imposto = det.getElementsByTagName('imposto')[0];

      itens.push({
        numero: det.getAttribute('nItem'),
        codigo: XmlParser._getValue(prod, 'cProd'),
        ean: XmlParser._getValue(prod, 'cEAN'),
        descricao: XmlParser._getValue(prod, 'xProd'),
        ncm: XmlParser._getValue(prod, 'NCM'),
        cfop: XmlParser._getValue(prod, 'CFOP'),
        unidade: XmlParser._getValue(prod, 'uCom'),
        quantidade: parseFloat(XmlParser._getValue(prod, 'qCom')) || 0,
        valorUnitario: parseFloat(XmlParser._getValue(prod, 'vUnCom')) || 0,
        valorTotal: parseFloat(XmlParser._getValue(prod, 'vProd')) || 0,
        valorDesconto: parseFloat(XmlParser._getValue(prod, 'vDesc')) || 0,

        // Impostos simplificados
        impostos: {
          icms: XmlParser._parseICMS(imposto),
          ipi: XmlParser._parseIPI(imposto),
          pis: XmlParser._parsePIS(imposto),
          cofins: XmlParser._parseCOFINS(imposto)
        }
      });
    }

    return itens;
  }

  /**
   * Parse totais
   * @private
   */
  static _parseTotais(total) {
    if (!total) {
      return {};
    }

    const icmsTot = total.getElementsByTagName('ICMSTot')[0];

    return {
      baseCalculoICMS: parseFloat(XmlParser._getValue(icmsTot, 'vBC')) || 0,
      valorICMS: parseFloat(XmlParser._getValue(icmsTot, 'vICMS')) || 0,
      baseCalculoST: parseFloat(XmlParser._getValue(icmsTot, 'vBCST')) || 0,
      valorST: parseFloat(XmlParser._getValue(icmsTot, 'vST')) || 0,
      valorProdutos: parseFloat(XmlParser._getValue(icmsTot, 'vProd')) || 0,
      valorFrete: parseFloat(XmlParser._getValue(icmsTot, 'vFrete')) || 0,
      valorSeguro: parseFloat(XmlParser._getValue(icmsTot, 'vSeg')) || 0,
      valorDesconto: parseFloat(XmlParser._getValue(icmsTot, 'vDesc')) || 0,
      valorII: parseFloat(XmlParser._getValue(icmsTot, 'vII')) || 0,
      valorIPI: parseFloat(XmlParser._getValue(icmsTot, 'vIPI')) || 0,
      valorPIS: parseFloat(XmlParser._getValue(icmsTot, 'vPIS')) || 0,
      valorCOFINS: parseFloat(XmlParser._getValue(icmsTot, 'vCOFINS')) || 0,
      valorOutros: parseFloat(XmlParser._getValue(icmsTot, 'vOutro')) || 0,
      valorNF: parseFloat(XmlParser._getValue(icmsTot, 'vNF')) || 0
    };
  }

  /**
   * Parse endereço
   * @private
   */
  static _parseEndereco(ender) {
    if (!ender) {
      return null;
    }

    return {
      logradouro: XmlParser._getValue(ender, 'xLgr'),
      numero: XmlParser._getValue(ender, 'nro'),
      complemento: XmlParser._getValue(ender, 'xCpl'),
      bairro: XmlParser._getValue(ender, 'xBairro'),
      codigoMunicipio: XmlParser._getValue(ender, 'cMun'),
      municipio: XmlParser._getValue(ender, 'xMun'),
      uf: XmlParser._getValue(ender, 'UF'),
      cep: XmlParser._getValue(ender, 'CEP'),
      codigoPais: XmlParser._getValue(ender, 'cPais'),
      pais: XmlParser._getValue(ender, 'xPais'),
      telefone: XmlParser._getValue(ender, 'fone')
    };
  }

  /**
   * Parse transporte
   * @private
   */
  static _parseTransporte(doc) {
    const transp = doc.getElementsByTagName('transp')[0];
    if (!transp) {
      return null;
    }

    return {
      modalidadeFrete: XmlParser._getValue(transp, 'modFrete'),
      transportadora: {
        cnpj: XmlParser._getValue(transp.getElementsByTagName('transporta')[0], 'CNPJ'),
        razaoSocial: XmlParser._getValue(transp.getElementsByTagName('transporta')[0], 'xNome')
      }
    };
  }

  /**
   * Parse cobrança
   * @private
   */
  static _parseCobranca(doc) {
    const cobr = doc.getElementsByTagName('cobr')[0];
    if (!cobr) {
      return null;
    }

    const fat = cobr.getElementsByTagName('fat')[0];
    const dups = cobr.getElementsByTagName('dup');

    const duplicatas = [];
    for (let i = 0; i < dups.length; i++) {
      duplicatas.push({
        numero: XmlParser._getValue(dups[i], 'nDup'),
        vencimento: XmlParser._getValue(dups[i], 'dVenc'),
        valor: parseFloat(XmlParser._getValue(dups[i], 'vDup')) || 0
      });
    }

    return {
      fatura: fat
        ? {
            numero: XmlParser._getValue(fat, 'nFat'),
            valorOriginal: parseFloat(XmlParser._getValue(fat, 'vOrig')) || 0,
            valorDesconto: parseFloat(XmlParser._getValue(fat, 'vDesc')) || 0,
            valorLiquido: parseFloat(XmlParser._getValue(fat, 'vLiq')) || 0
          }
        : null,
      duplicatas
    };
  }

  /**
   * Parse ICMS
   * @private
   */
  static _parseICMS(imposto) {
    if (!imposto) {
      return null;
    }
    const icms = imposto.getElementsByTagName('ICMS')[0];
    if (!icms) {
      return null;
    }

    // Pode ter diferentes tags (ICMS00, ICMS10, etc)
    const icmsGroup = icms.firstChild;
    if (!icmsGroup) {
      return null;
    }

    return {
      cst: XmlParser._getValue(icmsGroup, 'CST') || XmlParser._getValue(icmsGroup, 'CSOSN'),
      baseCalculo: parseFloat(XmlParser._getValue(icmsGroup, 'vBC')) || 0,
      aliquota: parseFloat(XmlParser._getValue(icmsGroup, 'pICMS')) || 0,
      valor: parseFloat(XmlParser._getValue(icmsGroup, 'vICMS')) || 0
    };
  }

  /**
   * Parse IPI
   * @private
   */
  static _parseIPI(imposto) {
    if (!imposto) {
      return null;
    }
    const ipi = imposto.getElementsByTagName('IPI')[0];
    if (!ipi) {
      return null;
    }

    const ipiTrib = ipi.getElementsByTagName('IPITrib')[0];
    return {
      cst: XmlParser._getValue(ipi, 'CST'),
      baseCalculo: parseFloat(XmlParser._getValue(ipiTrib, 'vBC')) || 0,
      aliquota: parseFloat(XmlParser._getValue(ipiTrib, 'pIPI')) || 0,
      valor: parseFloat(XmlParser._getValue(ipiTrib, 'vIPI')) || 0
    };
  }

  /**
   * Parse PIS
   * @private
   */
  static _parsePIS(imposto) {
    if (!imposto) {
      return null;
    }
    const pis = imposto.getElementsByTagName('PIS')[0];
    if (!pis) {
      return null;
    }

    const pisGroup = pis.firstChild;
    return {
      cst: XmlParser._getValue(pisGroup, 'CST'),
      baseCalculo: parseFloat(XmlParser._getValue(pisGroup, 'vBC')) || 0,
      aliquota: parseFloat(XmlParser._getValue(pisGroup, 'pPIS')) || 0,
      valor: parseFloat(XmlParser._getValue(pisGroup, 'vPIS')) || 0
    };
  }

  /**
   * Parse COFINS
   * @private
   */
  static _parseCOFINS(imposto) {
    if (!imposto) {
      return null;
    }
    const cofins = imposto.getElementsByTagName('COFINS')[0];
    if (!cofins) {
      return null;
    }

    const cofinsGroup = cofins.firstChild;
    return {
      cst: XmlParser._getValue(cofinsGroup, 'CST'),
      baseCalculo: parseFloat(XmlParser._getValue(cofinsGroup, 'vBC')) || 0,
      aliquota: parseFloat(XmlParser._getValue(cofinsGroup, 'pCOFINS')) || 0,
      valor: parseFloat(XmlParser._getValue(cofinsGroup, 'vCOFINS')) || 0
    };
  }

  /**
   * Helper para extrair valor de elemento
   * @private
   */
  static _getValue(parent, tagName) {
    if (!parent) {
      return null;
    }
    const element = parent.getElementsByTagName(tagName)[0];
    return element?.textContent || null;
  }

  /**
   * Valida se XML é de NF-e
   * @param {string} xmlContent - Conteúdo XML
   * @returns {boolean}
   */
  static isValidNfe(xmlContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');

      // Verifica tags obrigatórias
      const hasNfeProc = doc.getElementsByTagName('nfeProc').length > 0;
      const hasNFe = doc.getElementsByTagName('NFe').length > 0;
      const hasInfNFe = doc.getElementsByTagName('infNFe').length > 0;

      return (hasNfeProc || hasNFe) && hasInfNFe;
    } catch {
      return false;
    }
  }

  /**
   * Extrai chave de acesso do XML
   * @param {string} xmlContent - Conteúdo XML
   * @returns {string|null}
   */
  static extractChaveAcesso(xmlContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      const infNFe = doc.getElementsByTagName('infNFe')[0];

      if (infNFe) {
        const id = infNFe.getAttribute('Id');
        return id ? id.replace('NFe', '') : null;
      }
      return null;
    } catch {
      return null;
    }
  }
}

module.exports = XmlParser;
