/**
 * Utilitário de armazenamento de arquivos para NF-e
 * Gerencia salvamento de XML e metadados JSON
 *
 * @module NfeFileStorage
 */

const fs = require('fs').promises;
const path = require('path');
const { storageConfig } = require('../../src/config/storage');

class NfeFileStorage {
  /**
   * @param {string} basePath - Caminho base para storage (ex: ./storage/nfe)
   */
  constructor(basePath) {
    this.basePath = basePath || storageConfig.structure.notasFiscais.base;
    this.paths = {
      xml: path.join(this.basePath, 'xml'),
      meta: path.join(this.basePath, 'meta'),
      pdf: path.join(this.basePath, 'pdf')
    };
  }

  /**
   * Inicializa diretórios de storage
   * @returns {Promise<void>}
   */
  async inicializar() {
    for (const dir of Object.values(this.paths)) {
      await this._garantirDiretorio(dir);
    }
  }

  /**
   * Salva arquivo XML da NF-e
   * @param {string} chave - Chave de acesso (44 dígitos)
   * @param {string} xmlContent - Conteúdo XML
   * @returns {Promise<{sucesso: boolean, caminho?: string, erro?: string}>}
   */
  async salvarXml(chave, xmlContent) {
    try {
      const chaveLimpa = this._limparChave(chave);
      if (!chaveLimpa) {
        return { sucesso: false, erro: 'Chave de acesso inválida' };
      }

      await this._garantirDiretorio(this.paths.xml);

      const caminho = path.join(this.paths.xml, `${chaveLimpa}.xml`);
      await fs.writeFile(caminho, xmlContent, 'utf8');

      return { sucesso: true, caminho };
    } catch (error) {
      return { sucesso: false, erro: `Erro ao salvar XML: ${error.message}` };
    }
  }

  /**
   * Salva metadados JSON da NF-e
   * @param {string} chave - Chave de acesso
   * @param {Object} metadados - Objeto com metadados
   * @returns {Promise<{sucesso: boolean, caminho?: string, erro?: string}>}
   */
  async salvarMetadados(chave, metadados) {
    try {
      const chaveLimpa = this._limparChave(chave);
      if (!chaveLimpa) {
        return { sucesso: false, erro: 'Chave de acesso inválida' };
      }

      await this._garantirDiretorio(this.paths.meta);

      const metaComTimestamp = {
        ...metadados,
        _metadata: {
          chave: chaveLimpa,
          dataGeracao: new Date().toISOString(),
          versaoSchema: '1.0.0'
        }
      };

      const caminho = path.join(this.paths.meta, `${chaveLimpa}.json`);
      await fs.writeFile(caminho, JSON.stringify(metaComTimestamp, null, 2), 'utf8');

      return { sucesso: true, caminho };
    } catch (error) {
      return { sucesso: false, erro: `Erro ao salvar metadados: ${error.message}` };
    }
  }

  /**
   * Lê arquivo XML da NF-e
   * @param {string} chave - Chave de acesso
   * @returns {Promise<{sucesso: boolean, conteudo?: string, caminho?: string, erro?: string}>}
   */
  async lerXml(chave) {
    try {
      const chaveLimpa = this._limparChave(chave);
      if (!chaveLimpa) {
        return { sucesso: false, erro: 'Chave de acesso inválida' };
      }

      const caminho = path.join(this.paths.xml, `${chaveLimpa}.xml`);
      const conteudo = await fs.readFile(caminho, 'utf8');

      return { sucesso: true, conteudo, caminho };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { sucesso: false, erro: 'XML não encontrado' };
      }
      return { sucesso: false, erro: `Erro ao ler XML: ${error.message}` };
    }
  }

  /**
   * Lê metadados JSON da NF-e
   * @param {string} chave - Chave de acesso
   * @returns {Promise<{sucesso: boolean, dados?: Object, caminho?: string, erro?: string}>}
   */
  async lerMetadados(chave) {
    try {
      const chaveLimpa = this._limparChave(chave);
      if (!chaveLimpa) {
        return { sucesso: false, erro: 'Chave de acesso inválida' };
      }

      const caminho = path.join(this.paths.meta, `${chaveLimpa}.json`);
      const conteudo = await fs.readFile(caminho, 'utf8');
      const dados = JSON.parse(conteudo);

      return { sucesso: true, dados, caminho };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { sucesso: false, erro: 'Metadados não encontrados' };
      }
      return { sucesso: false, erro: `Erro ao ler metadados: ${error.message}` };
    }
  }

  /**
   * Verifica se NF-e já foi importada
   * @param {string} chave - Chave de acesso
   * @returns {Promise<boolean>}
   */
  async existeNfe(chave) {
    try {
      const chaveLimpa = this._limparChave(chave);
      if (!chaveLimpa) {
        return false;
      }

      const caminhoXml = path.join(this.paths.xml, `${chaveLimpa}.xml`);
      await fs.access(caminhoXml);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lista todas as NF-e importadas
   * @returns {Promise<{sucesso: boolean, nfes?: string[], erro?: string}>}
   */
  async listarNfes() {
    try {
      await this._garantirDiretorio(this.paths.xml);

      const arquivos = await fs.readdir(this.paths.xml);
      const nfes = arquivos.filter((f) => f.endsWith('.xml')).map((f) => f.replace('.xml', ''));

      return { sucesso: true, nfes };
    } catch (error) {
      return { sucesso: false, erro: `Erro ao listar NF-es: ${error.message}` };
    }
  }

  /**
   * Obtém caminhos dos arquivos de uma NF-e
   * @param {string} chave - Chave de acesso
   * @returns {Object} Objeto com caminhos
   */
  getCaminhos(chave) {
    const chaveLimpa = this._limparChave(chave);
    if (!chaveLimpa) {
      return null;
    }

    return {
      xml: path.join(this.paths.xml, `${chaveLimpa}.xml`),
      meta: path.join(this.paths.meta, `${chaveLimpa}.json`),
      pdf: path.join(this.paths.pdf, `${chaveLimpa}.pdf`)
    };
  }

  /**
   * Remove arquivos de uma NF-e
   * @param {string} chave - Chave de acesso
   * @returns {Promise<{sucesso: boolean, removidos: string[], erro?: string}>}
   */
  async removerNfe(chave) {
    try {
      const chaveLimpa = this._limparChave(chave);
      if (!chaveLimpa) {
        return { sucesso: false, removidos: [], erro: 'Chave inválida' };
      }

      const caminhos = this.getCaminhos(chaveLimpa);
      const removidos = [];

      for (const [tipo, caminho] of Object.entries(caminhos)) {
        try {
          await fs.unlink(caminho);
          removidos.push(tipo);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.warn(`[NfeFileStorage] Erro ao remover ${tipo}: ${error.message}`);
          }
        }
      }

      return { sucesso: true, removidos };
    } catch (error) {
      return { sucesso: false, removidos: [], erro: error.message };
    }
  }

  // ==========================================
  // HELPERS PRIVADOS
  // ==========================================

  /**
   * Garante que o diretório existe
   * @private
   */
  async _garantirDiretorio(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Limpa e valida chave de acesso
   * @private
   */
  _limparChave(chave) {
    if (!chave || typeof chave !== 'string') {
      return null;
    }

    const limpa = chave.replace(/\D/g, '');
    return limpa.length === 44 ? limpa : null;
  }
}

module.exports = NfeFileStorage;
