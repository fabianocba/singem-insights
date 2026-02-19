/**
 * Cliente para Distribuição DF-e da SEFAZ
 * WebService: NFeDistribuicaoDFe
 *
 * @description Consulta NF-e por chave de acesso usando certificado digital A1
 * @see https://www.nfe.fazenda.gov.br/portal/webServices.aspx
 */

const https = require('https');
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

// Ambientes SEFAZ
const AMBIENTES = {
  producao: {
    url: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
    tpAmb: '1'
  },
  homologacao: {
    url: 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
    tpAmb: '2'
  }
};

// Códigos de UF
const UF_CODES = {
  AC: '12',
  AL: '27',
  AP: '16',
  AM: '13',
  BA: '29',
  CE: '23',
  DF: '53',
  ES: '32',
  GO: '52',
  MA: '21',
  MT: '51',
  MS: '50',
  MG: '31',
  PA: '15',
  PB: '25',
  PR: '41',
  PE: '26',
  PI: '22',
  RJ: '33',
  RN: '24',
  RS: '43',
  RO: '11',
  RR: '14',
  SC: '42',
  SP: '35',
  SE: '28',
  TO: '17'
};

class DfeClient {
  constructor(options = {}) {
    this.ambiente = options.ambiente || 'producao';
    this.certificadoPath = options.certificadoPath || null;
    this.certificadoSenha = options.certificadoSenha || null;
    this.cnpjInteressado = options.cnpjInteressado || null;
    this.ufAutor = options.ufAutor || 'BA'; // Bahia por padrão (IF Baiano)

    this.config = AMBIENTES[this.ambiente];
    this.httpsAgent = null;
  }

  /**
   * Configura certificado digital A1 (.pfx)
   * @param {string} pfxPath - Caminho para o arquivo .pfx
   * @param {string} senha - Senha do certificado
   */
  configurarCertificado(pfxPath, senha) {
    if (!fs.existsSync(pfxPath)) {
      throw new Error(`Certificado não encontrado: ${pfxPath}`);
    }

    const pfx = fs.readFileSync(pfxPath);

    this.httpsAgent = new https.Agent({
      pfx: pfx,
      passphrase: senha,
      rejectUnauthorized: true // Em produção, manter true
    });

    this.certificadoPath = pfxPath;
    this.certificadoSenha = senha;

    console.log('✅ Certificado digital configurado');
  }

  /**
   * Consulta NF-e por chave de acesso
   * @param {string} chaveAcesso - Chave de 44 dígitos
   * @returns {Promise<Object>} Resultado da consulta
   */
  async consultarPorChave(chaveAcesso) {
    if (!this.httpsAgent) {
      throw new Error('Certificado digital não configurado. Use configurarCertificado() primeiro.');
    }

    if (!this.cnpjInteressado) {
      throw new Error('CNPJ do interessado não configurado.');
    }

    // Valida chave
    const chaveLimpa = chaveAcesso.replace(/\D/g, '');
    if (chaveLimpa.length !== 44) {
      throw new Error('Chave de acesso deve ter 44 dígitos');
    }

    // Monta envelope SOAP
    const soapEnvelope = this._montarEnvelopeConsChNFe(chaveLimpa);

    // Envia requisição
    const response = await this._enviarRequisicao(soapEnvelope);

    // Processa resposta
    return this._processarResposta(response);
  }

  /**
   * Consulta últimos documentos (NSU)
   * @param {string} ultNSU - Último NSU recebido (default '0')
   * @returns {Promise<Object>} Lista de documentos
   */
  async consultarUltimosDocumentos(ultNSU = '0') {
    if (!this.httpsAgent) {
      throw new Error('Certificado digital não configurado.');
    }

    const soapEnvelope = this._montarEnvelopeDistNSU(ultNSU);
    const response = await this._enviarRequisicao(soapEnvelope);
    return this._processarResposta(response);
  }

  /**
   * Monta envelope SOAP para consulta por chave
   * @private
   */
  _montarEnvelopeConsChNFe(chaveAcesso) {
    const cUFAutor = UF_CODES[this.ufAutor] || '29'; // BA = 29
    const versao = '1.01';

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="${versao}">
          <tpAmb>${this.config.tpAmb}</tpAmb>
          <cUFAutor>${cUFAutor}</cUFAutor>
          <CNPJ>${this.cnpjInteressado}</CNPJ>
          <consChNFe>
            <chNFe>${chaveAcesso}</chNFe>
          </consChNFe>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Monta envelope SOAP para consulta por NSU
   * @private
   */
  _montarEnvelopeDistNSU(ultNSU) {
    const cUFAutor = UF_CODES[this.ufAutor] || '29';
    const versao = '1.01';

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="${versao}">
          <tpAmb>${this.config.tpAmb}</tpAmb>
          <cUFAutor>${cUFAutor}</cUFAutor>
          <CNPJ>${this.cnpjInteressado}</CNPJ>
          <distNSU>
            <ultNSU>${ultNSU.padStart(15, '0')}</ultNSU>
          </distNSU>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Envia requisição SOAP
   * @private
   */
  async _enviarRequisicao(soapEnvelope) {
    const url = new URL(this.config.url);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      agent: this.httpsAgent,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(soapEnvelope)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(soapEnvelope);
      req.end();
    });
  }

  /**
   * Processa resposta XML da SEFAZ
   * @private
   */
  _processarResposta(xmlResponse) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlResponse, 'text/xml');

    // Busca retorno dentro do envelope SOAP
    const retDistDFeInt = doc.getElementsByTagName('retDistDFeInt')[0];

    if (!retDistDFeInt) {
      throw new Error('Resposta inválida da SEFAZ');
    }

    const tpAmb = this._getElementValue(retDistDFeInt, 'tpAmb');
    const verAplic = this._getElementValue(retDistDFeInt, 'verAplic');
    const cStat = this._getElementValue(retDistDFeInt, 'cStat');
    const xMotivo = this._getElementValue(retDistDFeInt, 'xMotivo');
    const dhResp = this._getElementValue(retDistDFeInt, 'dhResp');
    const ultNSU = this._getElementValue(retDistDFeInt, 'ultNSU');
    const maxNSU = this._getElementValue(retDistDFeInt, 'maxNSU');

    const resultado = {
      sucesso: cStat === '138', // 138 = Documento localizado
      codigo: cStat,
      mensagem: xMotivo,
      ambiente: tpAmb === '1' ? 'producao' : 'homologacao',
      versaoAplicacao: verAplic,
      dataHoraResposta: dhResp,
      ultNSU,
      maxNSU,
      documentos: []
    };

    // Processa documentos retornados (loteDistDFeInt > docZip)
    const lote = retDistDFeInt.getElementsByTagName('loteDistDFeInt')[0];
    if (lote) {
      const docsZip = lote.getElementsByTagName('docZip');

      for (let i = 0; i < docsZip.length; i++) {
        const docZip = docsZip[i];
        const nsu = docZip.getAttribute('NSU');
        const schema = docZip.getAttribute('schema');
        const conteudoBase64 = docZip.textContent;

        // Decodifica e descompacta o documento
        const xmlDocumento = this._descompactarDocumento(conteudoBase64);

        resultado.documentos.push({
          nsu,
          schema,
          xml: xmlDocumento,
          tipo: this._identificarTipoDocumento(schema)
        });
      }
    }

    return resultado;
  }

  /**
   * Descompacta documento (Base64 + GZIP)
   * @private
   */
  _descompactarDocumento(base64Content) {
    const zlib = require('zlib');

    try {
      const buffer = Buffer.from(base64Content, 'base64');
      const decompressed = zlib.gunzipSync(buffer);
      return decompressed.toString('utf-8');
    } catch (error) {
      // Se não estiver compactado, retorna decodificado direto
      return Buffer.from(base64Content, 'base64').toString('utf-8');
    }
  }

  /**
   * Identifica tipo do documento pelo schema
   * @private
   */
  _identificarTipoDocumento(schema) {
    if (!schema) {
      return 'desconhecido';
    }

    if (schema.includes('procNFe')) {
      return 'nfe_completa';
    }
    if (schema.includes('resNFe')) {
      return 'resumo_nfe';
    }
    if (schema.includes('resEvento')) {
      return 'resumo_evento';
    }
    if (schema.includes('procEventoNFe')) {
      return 'evento_completo';
    }

    return 'outro';
  }

  /**
   * Helper para extrair valor de elemento XML
   * @private
   */
  _getElementValue(parent, tagName) {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent : null;
  }

  /**
   * Retorna códigos de status conhecidos
   */
  static getCodigosStatus() {
    return {
      137: 'Nenhum documento localizado',
      138: 'Documento localizado',
      139: 'Pedido de download processado',
      140: 'Download disponibilizado',
      656: 'Consumo indevido',
      593: 'CNPJ do interessado não autorizado',
      594: 'CPF do interessado não autorizado'
    };
  }
}

module.exports = DfeClient;
