/**
 * SINGEM - FileSystemManager (stub banco/API)
 * Operações de diretório externo removidas.
 */

class FileSystemManager {
  constructor() {
    this.mainDirectoryHandle = null;
    this.isSupported = false;
  }

  isFileSystemAPISupported() {
    return false;
  }

  async restoreFolderReference() {
    return false;
  }

  async saveFolderReference() {
    return false;
  }

  async clearFolderReference() {
    this.mainDirectoryHandle = null;
    return true;
  }

  async selectMainDirectory() {
    alert('Modo banco/API ativo: seleção de diretório externo foi removida.');
    return false;
  }

  async testWriteAccess() {
    throw new Error('Modo banco/API ativo: teste de escrita em diretório externo indisponível.');
  }

  async saveFileWithFallback(file, folderType, textContent, metadados = {}) {
    return {
      originalName: file?.name || 'arquivo.pdf',
      savedName: file?.name || 'arquivo.pdf',
      folderType,
      year: new Date().getFullYear(),
      size: file?.size || 0,
      timestamp: new Date().toISOString(),
      path: `db://${folderType}`,
      method: 'database',
      metadados
    };
  }

  async saveFile(file, folderType, textContent, metadados = {}) {
    return {
      originalName: file?.name || 'arquivo.pdf',
      savedName: file?.name || 'arquivo.pdf',
      folderType,
      year: new Date().getFullYear(),
      size: file?.size || 0,
      timestamp: new Date().toISOString(),
      path: `db://${folderType}`,
      metadados
    };
  }

  async openFolder() {
    alert('Modo banco/API ativo: abertura de diretório externo foi removida.');
    return false;
  }

  async configurarPastaPrincipalComHandle() {
    return { success: false, error: 'Modo banco/API ativo' };
  }

  async configurarPastaPrincipalComEstrutura() {
    return { success: false, error: 'Modo banco/API ativo' };
  }

  async ensureFullStructure() {
    return { criada: false, modo: 'database' };
  }

  async salvarMetadadosEstrutura() {
    return false;
  }

  async repararEstruturaPastas() {
    return [];
  }

  async verificarIntegridadePastas() {
    return {
      erro: null,
      pastaPrincipal: null,
      unidade: null,
      pastaUnidadeExiste: true,
      anos: {}
    };
  }

  async sincronizarArquivos() {
    return {
      empenhos: { verificados: 0, removidos: 0, arquivos: [] },
      notasFiscais: { verificados: 0, removidos: 0, arquivos: [] }
    };
  }

  async excluirDocumento() {
    return { sucesso: false, arquivoExcluido: false, caminhoArquivo: null, modo: 'database-only' };
  }

  async listTrashItems() {
    return [];
  }

  async moveToTrash() {
    throw new Error('Modo banco/API ativo: lixeira de diretórios externos indisponível.');
  }

  async hardDeleteFromTrash() {
    return false;
  }

  async restoreFromTrash() {
    return false;
  }

  async getFolderHandle() {
    return null;
  }

  async getOrCreateSubfolder() {
    return null;
  }

  async salvarArquivoNaEstrutura(file, tipo, opcoes = {}) {
    return {
      originalName: file?.name || 'arquivo.pdf',
      savedName: file?.name || 'arquivo.pdf',
      folderType: tipo === 'empenho' ? 'empenhos' : 'notasFiscais',
      year: parseInt(opcoes?.ano, 10) || new Date().getFullYear(),
      size: file?.size || 0,
      timestamp: new Date().toISOString(),
      path: `db://${tipo}`
    };
  }
}

window.fsManager = new FileSystemManager();
console.log('[FS] ℹ️ FileSystemManager em modo banco/API (stub).');
