/**
 * Serviço Avançado de Importação de NF-e
 * Pipeline completo: parse → validação → persistência
 *
 * Retorna formato padronizado:
 * - status: 'OK' | 'OK_COM_ALERTAS' | 'ERRO'
 * - errors: [] (bloqueantes)
 * - alerts: [] (não bloqueantes)
 * - data: dados normalizados
 *
 * @module NfeImportServiceV2
 */

const path = require('path');
const NfeXmlParser = require('../../domain/nfe/NfeXmlParser');
const NfeFileStorage = require('../../domain/nfe/NfeFileStorage');
const { validarNfeCompleta, validarChaveAcesso } = require('../../domain/nfe/NfeValidators');
const { NfeConciliationService } = require('../../domain/nfe/NfeConciliationService');
const { normalizeImportData } = require('./nfeImportNormalizer');
const { shouldIncludeByFilters, mapToNfeSummary, sortByDataEmissaoDesc } = require('./nfeImportListing');

/**
 * Resultado padronizado de importação
 * @typedef {Object} ImportResult
 * @property {'OK'|'OK_COM_ALERTAS'|'ERRO'} status
 * @property {string[]} errors - Erros bloqueantes
 * @property {string[]} alerts - Alertas não bloqueantes
 * @property {Object|null} data - Dados extraídos e normalizados
 */

class NfeImportServiceV2 {
  /**
   * @param {Object} config - Configuração do serviço
   * @param {string} config.storagePath - Caminho base do storage
   */
  constructor(config = {}) {
    this.config = {
      storagePath: config.storagePath || path.join(process.cwd(), 'storage', 'nfe'),
      ...config
    };

    this.parser = new NfeXmlParser();
    this.storage = new NfeFileStorage(this.config.storagePath);
  }

  /**
   * Inicializa o serviço
   * @returns {Promise<void>}
   */
  async inicializar() {
    await this.storage.inicializar();
    console.log('[NfeImportServiceV2] Serviço inicializado');
  }

  /**
   * Importa NF-e a partir de conteúdo XML
   * @param {string} xmlContent - Conteúdo XML
   * @param {Object} opcoes - Opções de importação
   * @param {boolean} opcoes.sobrescrever - Sobrescrever se já existir (default: false)
   * @returns {Promise<ImportResult>}
   */
  async importarXml(xmlContent, opcoes = {}) {
    const errors = [];
    const alerts = [];

    // 1. Validar estrutura do XML
    const estruturaResult = this.parser.validarEstrutura(xmlContent);
    if (!estruturaResult.valido) {
      return {
        status: 'ERRO',
        errors: [`Estrutura XML inválida: ${estruturaResult.erro}`],
        alerts: [],
        data: null
      };
    }

    if (estruturaResult.aviso) {
      alerts.push(estruturaResult.aviso);
    }

    // 2. Extrair dados
    let dadosNfe;
    try {
      dadosNfe = this.parser.parseNfe(xmlContent);
    } catch (error) {
      return {
        status: 'ERRO',
        errors: [`Erro ao extrair dados: ${error.message}`],
        alerts: [],
        data: null
      };
    }

    // 3. Validar dados extraídos
    const validacaoResult = validarNfeCompleta(dadosNfe);
    errors.push(...validacaoResult.errors);
    alerts.push(...validacaoResult.alerts);

    // Se tem erros críticos, não continua
    if (validacaoResult.status === 'ERRO') {
      return {
        status: 'ERRO',
        errors,
        alerts,
        data: dadosNfe
      };
    }

    // 4. Verificar se já existe
    const chave = dadosNfe.chaveAcesso;
    const jaExiste = await this.storage.existeNfe(chave);

    if (jaExiste && !opcoes.sobrescrever) {
      alerts.push('NF-e já importada anteriormente');
      // Retorna dados mesmo assim, sem sobrescrever
      return {
        status: 'OK_COM_ALERTAS',
        errors: [],
        alerts,
        data: normalizeImportData(dadosNfe, null, false)
      };
    }

    if (jaExiste) {
      alerts.push('NF-e sobrescrita (já existia)');
    }

    // 5. Persistir XML
    const xmlResult = await this.storage.salvarXml(chave, xmlContent);
    if (!xmlResult.sucesso) {
      errors.push(`Erro ao salvar XML: ${xmlResult.erro}`);
    }

    // 6. Preparar e persistir metadados
    const dadosNormalizados = normalizeImportData(dadosNfe, xmlResult.caminho, true);
    dadosNormalizados.validacao = {
      status: alerts.length > 0 ? 'OK_COM_ALERTAS' : 'OK',
      errors,
      alerts,
      dataValidacao: new Date().toISOString()
    };

    const metaResult = await this.storage.salvarMetadados(chave, dadosNormalizados);
    if (!metaResult.sucesso) {
      alerts.push(`Erro ao salvar metadados: ${metaResult.erro}`);
    }

    dadosNormalizados.caminhos = this.storage.getCaminhos(chave);
    dadosNormalizados.caminhos.metaReal = metaResult.caminho;

    // 7. Retornar resultado
    const statusFinal = errors.length > 0 ? 'ERRO' : alerts.length > 0 ? 'OK_COM_ALERTAS' : 'OK';

    return {
      status: statusFinal,
      errors,
      alerts,
      data: dadosNormalizados
    };
  }

  /**
   * Importa NF-e a partir de base64
   * @param {string} xmlBase64 - XML em base64
   * @param {Object} opcoes - Opções de importação
   * @returns {Promise<ImportResult>}
   */
  async importarXmlBase64(xmlBase64, opcoes = {}) {
    try {
      const xmlContent = Buffer.from(xmlBase64, 'base64').toString('utf8');
      return this.importarXml(xmlContent, opcoes);
    } catch (error) {
      return {
        status: 'ERRO',
        errors: [`Erro ao decodificar base64: ${error.message}`],
        alerts: [],
        data: null
      };
    }
  }

  /**
   * Obtém dados completos de uma NF-e importada
   * @param {string} chave - Chave de acesso (44 dígitos)
   * @returns {Promise<ImportResult>}
   */
  async obterNfe(chave) {
    // Validar chave
    const chaveResult = validarChaveAcesso(chave);
    if (!chaveResult.valido) {
      return {
        status: 'ERRO',
        errors: [chaveResult.erro],
        alerts: [],
        data: null
      };
    }

    // Ler metadados
    const metaResult = await this.storage.lerMetadados(chave);
    if (!metaResult.sucesso) {
      return {
        status: 'ERRO',
        errors: [metaResult.erro],
        alerts: [],
        data: null
      };
    }

    // Adicionar caminhos
    metaResult.dados.caminhos = this.storage.getCaminhos(chave);

    return {
      status: 'OK',
      errors: [],
      alerts: [],
      data: metaResult.dados
    };
  }

  /**
   * Obtém XML de uma NF-e importada
   * @param {string} chave - Chave de acesso
   * @returns {Promise<{sucesso: boolean, xml?: string, erro?: string}>}
   */
  async obterXml(chave) {
    const result = await this.storage.lerXml(chave);
    return {
      sucesso: result.sucesso,
      xml: result.conteudo,
      erro: result.erro
    };
  }

  /**
   * Lista todas as NF-e importadas com resumo
   * @param {Object} filtros - Filtros opcionais
   * @param {string} filtros.cnpjEmitente - Filtrar por CNPJ do emitente
   * @param {string} filtros.cnpjDestinatario - Filtrar por CNPJ do destinatário
   * @param {string} filtros.dataInicio - Data início (ISO)
   * @param {string} filtros.dataFim - Data fim (ISO)
   * @returns {Promise<{sucesso: boolean, nfes?: Object[], total?: number, erro?: string}>}
   */
  async listarNfes(filtros = {}) {
    try {
      const listResult = await this.storage.listarNfes();
      if (!listResult.sucesso) {
        return { sucesso: false, erro: listResult.erro };
      }

      const nfes = [];
      for (const chave of listResult.nfes) {
        const metaResult = await this.storage.lerMetadados(chave);
        if (metaResult.sucesso) {
          const dados = metaResult.dados;

          if (!shouldIncludeByFilters(dados, filtros)) {
            continue;
          }

          nfes.push(mapToNfeSummary(dados));
        }
      }

      // Ordenar por data de emissão (mais recente primeiro)
      sortByDataEmissaoDesc(nfes);

      return { sucesso: true, nfes, total: nfes.length };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  /**
   * Verifica se NF-e já foi importada
   * @param {string} chave - Chave de acesso
   * @returns {Promise<boolean>}
   */
  async existeNfe(chave) {
    return this.storage.existeNfe(chave);
  }

  /**
   * Remove uma NF-e importada
   * @param {string} chave - Chave de acesso
   * @returns {Promise<{sucesso: boolean, erro?: string}>}
   */
  async removerNfe(chave) {
    const result = await this.storage.removerNfe(chave);
    return {
      sucesso: result.sucesso,
      erro: result.erro
    };
  }

  /**
   * Valida um XML sem importar
   * @param {string} xmlContent - Conteúdo XML
   * @returns {Promise<ImportResult>}
   */
  async validarXml(xmlContent) {
    const errors = [];
    const alerts = [];

    // 1. Validar estrutura
    const estruturaResult = this.parser.validarEstrutura(xmlContent);
    if (!estruturaResult.valido) {
      return {
        status: 'ERRO',
        errors: [`Estrutura XML inválida: ${estruturaResult.erro}`],
        alerts: [],
        data: null
      };
    }

    if (estruturaResult.aviso) {
      alerts.push(estruturaResult.aviso);
    }

    // 2. Extrair dados
    let dadosNfe;
    try {
      dadosNfe = this.parser.parseNfe(xmlContent);
    } catch (error) {
      return {
        status: 'ERRO',
        errors: [`Erro ao extrair dados: ${error.message}`],
        alerts: [],
        data: null
      };
    }

    // 3. Validar dados
    const validacaoResult = validarNfeCompleta(dadosNfe);
    errors.push(...validacaoResult.errors);
    alerts.push(...validacaoResult.alerts);

    // 4. Verificar se já existe
    if (dadosNfe.chaveAcesso) {
      const existe = await this.storage.existeNfe(dadosNfe.chaveAcesso);
      if (existe) {
        alerts.push('NF-e já foi importada anteriormente');
      }
    }

    const statusFinal = errors.length > 0 ? 'ERRO' : alerts.length > 0 ? 'OK_COM_ALERTAS' : 'OK';

    return {
      status: statusFinal,
      errors,
      alerts,
      data: normalizeImportData(dadosNfe, null, false)
    };
  }

  /**
   * Concilia NF-e com Empenho vinculado
   * @param {string} chaveOuXml - Chave de acesso (44 dígitos) ou conteúdo XML
   * @param {Object} empenho - Dados do empenho para conciliação
   * @returns {Promise<Object>} Resultado da conciliação
   */
  async conciliarComEmpenho(chaveOuXml, empenho) {
    let dadosNfe;

    // Determinar se é chave ou XML
    const isChave = /^\d{44}$/.test(String(chaveOuXml).replace(/\D/g, ''));

    if (isChave) {
      // Buscar NF-e já importada
      const chave = String(chaveOuXml).replace(/\D/g, '');
      const nfeResult = await this.obterNfe(chave);

      if (nfeResult.status === 'ERRO') {
        return {
          status: 'ERRO',
          errors: [`NF-e não encontrada: ${nfeResult.errors.join(', ')}`],
          alerts: [],
          conciliacao: null
        };
      }
      dadosNfe = nfeResult.data;
    } else {
      // Parsear XML
      try {
        dadosNfe = this.parser.parseNfe(chaveOuXml);
      } catch (error) {
        return {
          status: 'ERRO',
          errors: [`Erro ao parsear XML: ${error.message}`],
          alerts: [],
          conciliacao: null
        };
      }
    }

    // Executar conciliação
    const conciliator = new NfeConciliationService();
    const resultado = conciliator.conciliar(dadosNfe, empenho);

    // Salvar resultado da conciliação nos metadados (se já importada)
    if (isChave && dadosNfe.chaveAcesso) {
      try {
        const metaResult = await this.storage.lerMetadados(dadosNfe.chaveAcesso);
        if (metaResult.sucesso) {
          const dadosAtualizados = {
            ...metaResult.dados,
            conciliacao: {
              empenhoId: empenho.id,
              empenhoNumero: empenho.numero,
              resultado: resultado.status,
              summary: resultado.summary,
              dataUltimaConciliacao: new Date().toISOString()
            }
          };
          await this.storage.salvarMetadados(dadosNfe.chaveAcesso, dadosAtualizados);
        }
      } catch (e) {
        console.warn('[NfeImportServiceV2] Erro ao salvar resultado da conciliação:', e.message);
      }
    }

    return {
      status: resultado.status,
      errors: resultado.errors,
      alerts: resultado.alerts,
      conciliacao: resultado,
      nfe: {
        chaveAcesso: dadosNfe.chaveAcesso,
        numero: dadosNfe.numero,
        emitente: dadosNfe.emitente?.razaoSocial,
        totalNF: dadosNfe.totais?.valorNF
      },
      empenho: {
        id: empenho.id,
        numero: empenho.numero,
        fornecedor: empenho.fornecedor
      }
    };
  }

  /**
   * Importa NF-e já validando conciliação com empenho
   * @param {string} xmlContent - Conteúdo XML
   * @param {Object} empenho - Empenho para conciliar (opcional)
   * @param {Object} opcoes - Opções de importação
   * @returns {Promise<Object>} Resultado com importação e conciliação
   */
  async importarComConciliacao(xmlContent, empenho = null, opcoes = {}) {
    // 1. Importar normalmente
    const importResult = await this.importarXml(xmlContent, opcoes);

    if (importResult.status === 'ERRO') {
      return importResult;
    }

    // 2. Se tem empenho, conciliar
    if (empenho) {
      const concResult = await this.conciliarComEmpenho(importResult.data.chaveAcesso, empenho);

      // Atualizar resultado com status da conciliação
      return {
        ...importResult,
        conciliacao: concResult.conciliacao,
        statusFinal: concResult.status,
        // Se conciliação tem erro, impacta status final
        status: concResult.status === 'PENDENTE_CONFERENCIA' ? 'PENDENTE_CONFERENCIA' : importResult.status
      };
    }

    return importResult;
  }
}

module.exports = NfeImportServiceV2;
