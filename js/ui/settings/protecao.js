/**
 * UI para Proteção de Pastas
 * Configurações de senha, retenção, integridade e lixeira
 */

class ProtecaoUI {
  constructor() {
    this.container = null;
  }

  /**
   * Renderiza tela de proteção
   */
  async render(containerId) {
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error('Container não encontrado');
      return;
    }

    const hasPassword = await window.protectionManager.hasPassword();
    const config = await window.protectionManager.getConfig();

    this.container.innerHTML = `
      <div class="protecao-container">
        <h2>🔒 Proteção de Pastas</h2>

        <div class="protecao-section">
          <h3>Senha de Proteção</h3>
          ${
            hasPassword
              ? `
            <p>✅ Senha configurada</p>
            <button id="btnChangePassword" class="btn-secondary">Alterar Senha</button>
          `
              : `
            <p>⚠️ Nenhuma senha configurada</p>
            <button id="btnSetPassword" class="btn-primary">Definir Senha</button>
          `
          }
        </div>

        <div class="protecao-section">
          <h3>Políticas de Retenção</h3>
          <label>
            Dias de retenção na lixeira:
            <input type="number" id="retencaoDias" min="1" max="90"
                   value="${config?.policy?.retencaoDias || 7}" />
          </label>
          <label>
            <input type="checkbox" id="confirmarDuplo"
                   ${config?.policy?.confirmarDuplo ? 'checked' : ''} />
            Solicitar confirmação dupla para exclusão permanente
          </label>
          <label>
            <input type="checkbox" id="autoPurge"
                   ${config?.policy?.autoPurge ? 'checked' : ''} />
            Purge automático de itens antigos
          </label>
          <button id="btnSavePolicy" class="btn-primary">Salvar Políticas</button>
        </div>

        <div class="protecao-section">
          <h3>Lixeira</h3>
          <button id="btnViewTrash" class="btn-secondary">📂 Ver Itens na Lixeira</button>
          <button id="btnEmptyTrash" class="btn-danger">🗑️ Esvaziar Lixeira</button>
        </div>

        <div class="protecao-section">
          <h3>Integridade</h3>
          <button id="btnVerifyIntegrity" class="btn-secondary">🔍 Verificar Integridade</button>
          <button id="btnExportLogs" class="btn-secondary">📥 Exportar Logs</button>
        </div>

        <div id="resultadoProtecao" class="resultado hidden"></div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Anexa eventos aos botões
   */
  attachEventListeners() {
    const btnSetPassword = document.getElementById('btnSetPassword');
    const btnChangePassword = document.getElementById('btnChangePassword');
    const btnSavePolicy = document.getElementById('btnSavePolicy');
    const btnViewTrash = document.getElementById('btnViewTrash');
    const btnEmptyTrash = document.getElementById('btnEmptyTrash');
    const btnVerifyIntegrity = document.getElementById('btnVerifyIntegrity');
    const btnExportLogs = document.getElementById('btnExportLogs');

    if (btnSetPassword) {
      btnSetPassword.addEventListener('click', () => this.handleSetPassword());
    }

    if (btnChangePassword) {
      btnChangePassword.addEventListener('click', () => this.handleChangePassword());
    }

    if (btnSavePolicy) {
      btnSavePolicy.addEventListener('click', () => this.handleSavePolicy());
    }

    if (btnViewTrash) {
      btnViewTrash.addEventListener('click', () => this.handleViewTrash());
    }

    if (btnEmptyTrash) {
      btnEmptyTrash.addEventListener('click', () => this.handleEmptyTrash());
    }

    if (btnVerifyIntegrity) {
      btnVerifyIntegrity.addEventListener('click', () => this.handleVerifyIntegrity());
    }

    if (btnExportLogs) {
      btnExportLogs.addEventListener('click', () => this.handleExportLogs());
    }
  }

  /**
   * Define senha inicial
   */
  async handleSetPassword() {
    const password = prompt('Digite a nova senha de proteção (mínimo 6 caracteres):');

    if (!password) {
      return;
    }

    try {
      await window.protectionManager.setPassword(password);
      this.showMessage('✅ Senha definida com sucesso', 'success');
      await this.render(this.container.id);
    } catch (error) {
      this.showMessage(`❌ Erro: ${error.message}`, 'error');
    }
  }

  /**
   * Altera senha
   */
  async handleChangePassword() {
    const oldPassword = prompt('Digite a senha atual:');

    if (!oldPassword) {
      return;
    }

    const newPassword = prompt('Digite a nova senha (mínimo 6 caracteres):');

    if (!newPassword) {
      return;
    }

    try {
      await window.protectionManager.changePassword(oldPassword, newPassword);
      this.showMessage('✅ Senha alterada com sucesso', 'success');
    } catch (error) {
      this.showMessage(`❌ Erro: ${error.message}`, 'error');
    }
  }

  /**
   * Salva políticas de retenção
   */
  async handleSavePolicy() {
    const retencaoDias = parseInt(document.getElementById('retencaoDias').value);
    const confirmarDuplo = document.getElementById('confirmarDuplo').checked;
    const autoPurge = document.getElementById('autoPurge').checked;

    try {
      await window.protectionManager.updatePolicy({
        retencaoDias,
        confirmarDuplo,
        autoPurge
      });

      this.showMessage('✅ Políticas salvas com sucesso', 'success');
    } catch (error) {
      this.showMessage(`❌ Erro: ${error.message}`, 'error');
    }
  }

  /**
   * Visualiza lixeira
   */
  async handleViewTrash() {
    this.showMessage('ℹ️ Lixeira de diretórios externos removida. O sistema opera em modo banco/API.', 'info');
  }

  /**
   * Esvazia lixeira
   */
  async handleEmptyTrash() {
    this.showMessage('ℹ️ Esvaziamento de lixeira local removido no modo banco/API.', 'info');
  }

  /**
   * Verifica integridade
   */
  async handleVerifyIntegrity() {
    this.showMessage(
      'ℹ️ Verificação de integridade de diretórios externos removida. Operação ativa em banco/API.',
      'info'
    );
  }

  /**
   * Exporta logs
   */
  async handleExportLogs() {
    try {
      await window.protectionManager.exportLogs();
      this.showMessage('✅ Logs exportados com sucesso', 'success');
    } catch (error) {
      this.showMessage(`❌ Erro: ${error.message}`, 'error');
    }
  }

  /**
   * Restaura arquivo da lixeira
   */
  async restoreFile(year, fileName, targetType) {
    try {
      await window.protectionManager.restore(parseInt(year), fileName, targetType);
      this.showMessage('✅ Arquivo restaurado com sucesso', 'success');
      await this.handleViewTrash(); // Atualiza lista
    } catch (error) {
      this.showMessage(`❌ ${error.message}`, 'error');
    }
  }

  /**
   * Exclui permanentemente
   */
  async permanentDelete(year, fileName) {
    try {
      await window.protectionManager.hardDelete(parseInt(year), fileName);
      this.showMessage('✅ Arquivo excluído permanentemente', 'success');
      await this.handleViewTrash(); // Atualiza lista
    } catch (error) {
      this.showMessage(`❌ ${error.message}`, 'error');
    }
  }

  /**
   * Mostra mensagem
   */
  showMessage(message, type = 'info', isHTML = false) {
    const resultado = document.getElementById('resultadoProtecao');

    if (!resultado) {
      if (isHTML) {
        const div = document.createElement('div');
        div.innerHTML = message;
        document.body.appendChild(div);
      } else {
        alert(message);
      }
      return;
    }

    resultado.className = `resultado ${type}`;

    if (isHTML) {
      resultado.innerHTML = message;
    } else {
      resultado.textContent = message;
    }

    resultado.classList.remove('hidden');

    if (type !== 'info' || !isHTML) {
      setTimeout(() => {
        resultado.classList.add('hidden');
      }, 5000);
    }
  }
}

// Instância global
window.protecaoUI = new ProtecaoUI();

console.log('✅ Proteção UI carregado');
