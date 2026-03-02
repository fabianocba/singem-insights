/**
 * Configurações → Arquivos (modo banco/API)
 * Armazenamento local por pastas removido.
 */

class SettingsArquivos {
  constructor() {
    this.init();
  }

  async ensureDBReady() {
    if (!window.dbManager) {
      throw new Error('❌ dbManager não está disponível');
    }

    if (!window.dbManager.db) {
      if (window.dbManager.initSafe) {
        await window.dbManager.initSafe();
      } else {
        await window.dbManager.init();
      }
    }
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Sem ações de diretório externo no modo banco/API
  }

  async load() {
    try {
      await this.ensureDBReady();
      this.atualizarStatus();
    } catch (error) {
      console.error('Erro ao carregar configurações de arquivos:', error);
    }
  }

  atualizarStatus() {
    const statusDiv = document.getElementById('statusConfigPastas');
    if (!statusDiv) {
      return;
    }

    statusDiv.innerHTML = `
      <div class="alert alert-info">
        ℹ️ <strong>Modo Banco/API Ativo</strong><br>
        <small>Empenhos e Notas Fiscais são armazenados no banco. Configuração de diretórios externos removida.</small>
      </div>
    `;
  }
}

window.settingsArquivos = new SettingsArquivos();
