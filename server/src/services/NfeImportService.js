/**
 * Serviço de Importação de NF-e
 * Orquestra o fluxo completo de importação de NF-e
 *
 * Fluxos suportados:
 * 1. Importação via SEFAZ (DF-e) - requer certificado A1
 * 2. Upload manual de XML
 *
 * @description Serviço principal para importação de NF-e
 */

const fs = require('fs').promises;
const path = require('path');
const DfeClient = require('../../integrations/sefaz/DfeClient');
const NfeXmlParser = require('../utils/xmlParser');
const DanfeGenerator = require('../utils/danfeGenerator');

class NfeImportService {
  constructor(config = {}) {
    this.config = {
      storagePath: config.storagePath || path.join(__dirname, '../../storage/nfe'),
      ambiente: config.ambiente || 'producao',
      certificadoPath: config.certificadoPath || null,
      certificadoSenha: config.certificadoSenha || null,
      ...config
    };

    this.dfeClient = null;
    this.xmlParser = new NfeXmlParser();
    this.danfeGenerator = new DanfeGenerator();

    // Diretórios de storage
    this.paths = {
      xml: path.join(this.config.storagePath, 'xml'),
      pdf: path.join(this.config.storagePath, 'pdf')
    };
  }

  /**
   * Inicializa o serviço
   * @returns {Promise<void>}
   */
  async inicializar() {
    // Cria diretórios se não existirem
    await this._criarDiretorios();

    // Configura cliente SEFAZ se certificado disponível
    if (this.config.certificadoPath) {
      this.dfeClient = new DfeClient({
        ambiente: this.config.ambiente
      });

      try {
        await this.dfeClient.configurarCertificado(this.config.certificadoPath, this.config.certificadoSenha);
        console.log('[NfeImportService] Cliente SEFAZ configurado com sucesso');
      } catch (error) {
        console.warn('[NfeImportService] Falha ao configurar certificado SEFAZ:', error.message);
        this.dfeClient = null;
      }
    }
  }

  /**
   * Importa NF-e por chave de acesso via SEFAZ
   * @param {string} chaveAcesso - Chave de acesso da NF-e (44 dígitos)
   * @returns {Promise<Object>} Resultado da importação
   */
  async importarPorChave(chaveAcesso) {
    // Valida chave
    if (!this._validarChaveAcesso(chaveAcesso)) {
      return {
        sucesso: false,
        erro: 'Chave de acesso inválida. Deve conter 44 dígitos numéricos.',
        codigo: 'CHAVE_INVALIDA'
      };
    }

    // Verifica se cliente SEFAZ está disponível
    if (!this.dfeClient) {
      return {
        sucesso: false,
        erro: 'Cliente SEFAZ não configurado. Certificado digital necessário.',
        codigo: 'SEFAZ_NAO_CONFIGURADO'
      };
    }

    try {
      console.log(`[NfeImportService] Consultando NF-e: ${chaveAcesso}`);

      // Consulta SEFAZ
      const resultado = await this.dfeClient.consultarPorChave(chaveAcesso);

      if (!resultado.sucesso) {
        return {
          sucesso: false,
          erro: resultado.mensagem || 'Erro ao consultar SEFAZ',
          codigo: resultado.codigo
        };
      }

      // Processa cada documento retornado
      const documentos = [];
      for (const doc of resultado.documentos) {
        if (doc.xml) {
          const processado = await this._processarXml(doc.xml, chaveAcesso);
          documentos.push(processado);
        }
      }

      return {
        sucesso: true,
        mensagem: 'NF-e importada com sucesso',
        documentos
      };
    } catch (error) {
      console.error('[NfeImportService] Erro na importação:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_IMPORTACAO'
      };
    }
  }

  /**
   * Importa NF-e a partir de XML enviado manualmente
   * @param {string} xmlContent - Conteúdo XML da NF-e
   * @returns {Promise<Object>} Resultado da importação
   */
  async importarXml(xmlContent) {
    try {
      // Valida se é um XML de NF-e válido
      if (!this.xmlParser.isValidNfe(xmlContent)) {
        return {
          sucesso: false,
          erro: 'XML inválido ou não é uma NF-e',
          codigo: 'XML_INVALIDO'
        };
      }

      // Extrai chave de acesso
      const chaveAcesso = this.xmlParser.extractChaveAcesso(xmlContent);
      if (!chaveAcesso) {
        return {
          sucesso: false,
          erro: 'Não foi possível extrair a chave de acesso do XML',
          codigo: 'CHAVE_NAO_ENCONTRADA'
        };
      }

      // Processa o XML
      const resultado = await this._processarXml(xmlContent, chaveAcesso);

      return {
        sucesso: true,
        mensagem: 'NF-e importada com sucesso via upload',
        documento: resultado
      };
    } catch (error) {
      console.error('[NfeImportService] Erro no upload de XML:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_UPLOAD'
      };
    }
  }

  /**
   * Processa XML da NF-e: parse, salva e gera DANFE
   * @private
   */
  async _processarXml(xmlContent, chaveAcesso) {
    // 1. Parse do XML
    const dadosNfe = this.xmlParser.parseNfe(xmlContent);

    // 2. Salva XML no storage
    const xmlPath = path.join(this.paths.xml, `${chaveAcesso}.xml`);
    await fs.writeFile(xmlPath, xmlContent, 'utf8');

    // 3. Gera DANFE em PDF
    const pdfPath = path.join(this.paths.pdf, `${chaveAcesso}.pdf`);
    await this.danfeGenerator.gerar(dadosNfe, pdfPath);

    // 4. Prepara objeto para persistência
    const registro = {
      chaveAcesso,
      numero: dadosNfe.numero,
      serie: dadosNfe.serie,
      dataEmissao: dadosNfe.dataEmissao,
      emitente: {
        cnpj: dadosNfe.emitente?.cnpj,
        razaoSocial: dadosNfe.emitente?.razaoSocial
      },
      destinatario: {
        cnpj: dadosNfe.destinatario?.cnpj,
        cpf: dadosNfe.destinatario?.cpf,
        razaoSocial: dadosNfe.destinatario?.razaoSocial
      },
      valorTotal: dadosNfe.totais?.valorNF,
      quantidadeItens: dadosNfe.itens?.length || 0,
      arquivos: {
        xml: xmlPath,
        pdf: pdfPath
      },
      dataImportacao: new Date().toISOString(),
      origem: this.dfeClient ? 'SEFAZ' : 'UPLOAD'
    };

    return registro;
  }

  /**
   * Consulta últimas NF-e disponíveis no SEFAZ
   * @param {string} cnpj - CNPJ para consulta (destinatário)
   * @returns {Promise<Object>} Lista de documentos disponíveis
   */
  async consultarUltimasNfe(cnpj) {
    if (!this.dfeClient) {
      return {
        sucesso: false,
        erro: 'Cliente SEFAZ não configurado',
        codigo: 'SEFAZ_NAO_CONFIGURADO'
      };
    }

    try {
      const resultado = await this.dfeClient.consultarUltimosDocumentos(cnpj);
      return resultado;
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_CONSULTA'
      };
    }
  }

  /**
   * Obtém DANFE em PDF
   * @param {string} chaveAcesso - Chave de acesso da NF-e
   * @returns {Promise<Object>} Caminho do PDF ou erro
   */
  async obterDanfe(chaveAcesso) {
    const pdfPath = path.join(this.paths.pdf, `${chaveAcesso}.pdf`);

    try {
      await fs.access(pdfPath);
      return {
        sucesso: true,
        caminho: pdfPath
      };
    } catch {
      // Tenta regenerar se o XML existe
      const xmlPath = path.join(this.paths.xml, `${chaveAcesso}.xml`);
      try {
        const xmlContent = await fs.readFile(xmlPath, 'utf8');
        const dadosNfe = this.xmlParser.parseNfe(xmlContent);
        await this.danfeGenerator.gerar(dadosNfe, pdfPath);

        return {
          sucesso: true,
          caminho: pdfPath,
          regenerado: true
        };
      } catch {
        return {
          sucesso: false,
          erro: 'DANFE não encontrado e não foi possível regenerar',
          codigo: 'DANFE_NAO_ENCONTRADO'
        };
      }
    }
  }

  /**
   * Obtém XML da NF-e
   * @param {string} chaveAcesso - Chave de acesso da NF-e
   * @returns {Promise<Object>} Conteúdo XML ou erro
   */
  async obterXml(chaveAcesso) {
    const xmlPath = path.join(this.paths.xml, `${chaveAcesso}.xml`);

    try {
      const xmlContent = await fs.readFile(xmlPath, 'utf8');
      return {
        sucesso: true,
        xml: xmlContent
      };
    } catch {
      return {
        sucesso: false,
        erro: 'XML não encontrado',
        codigo: 'XML_NAO_ENCONTRADO'
      };
    }
  }

  /**
   * Lista NF-e importadas
   * @returns {Promise<Array>} Lista de NF-e
   */
  async listarImportadas() {
    try {
      const arquivos = await fs.readdir(this.paths.xml);
      const nfes = [];

      for (const arquivo of arquivos) {
        if (arquivo.endsWith('.xml')) {
          const chave = arquivo.replace('.xml', '');
          const xmlPath = path.join(this.paths.xml, arquivo);
          const xmlContent = await fs.readFile(xmlPath, 'utf8');

          try {
            const dados = this.xmlParser.parseNfe(xmlContent);
            nfes.push({
              chaveAcesso: chave,
              numero: dados.numero,
              serie: dados.serie,
              dataEmissao: dados.dataEmissao,
              emitente: dados.emitente?.razaoSocial,
              valorTotal: dados.totais?.valorNF
            });
          } catch (e) {
            console.warn(`[NfeImportService] Erro ao parsear ${arquivo}:`, e.message);
          }
        }
      }

      return {
        sucesso: true,
        nfes: nfes.sort((a, b) => new Date(b.dataEmissao) - new Date(a.dataEmissao))
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_LISTAGEM'
      };
    }
  }

  // ==========================================
  // HELPERS PRIVADOS
  // ==========================================

  /**
   * Valida formato da chave de acesso
   * @private
   */
  _validarChaveAcesso(chave) {
    if (!chave) {
      return false;
    }
    const limpa = String(chave).replace(/\D/g, '');
    return limpa.length === 44;
  }

  /**
   * Cria diretórios de storage
   * @private
   */
  async _criarDiretorios() {
    for (const dir of Object.values(this.paths)) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.error(`[NfeImportService] Erro ao criar diretório ${dir}:`, error);
        }
      }
    }
  }
}

module.exports = NfeImportService;
