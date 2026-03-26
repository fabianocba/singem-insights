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
        <section class="protecao-hero">
          <div class="protecao-hero__content">
            <span class="protecao-kicker">Governança local</span>
            <h2>🔒 Proteção de Pastas</h2>
            <p>
              Gerencie credenciais, retenção e rastreabilidade operacional com o mesmo padrão
              visual do shell principal.
            </p>
          </div>
          <div class="protecao-hero__status ${hasPassword ? 'is-secure' : 'is-alert'}">
            <span class="protecao-hero__status-label">Estado atual</span>
            <strong>${hasPassword ? 'Senha configurada' : 'Proteção pendente'}</strong>
            <small>${hasPassword ? 'Fluxo protegido para alterações sensíveis.' : 'Defina uma senha antes de operar mudanças críticas.'}</small>
          </div>
        </section>

        <div id="resultadoProtecao" class="resultado hidden"></div>

        <div class="protecao-grid">
          <section class="protecao-section protecao-section--password">
            <div class="protecao-section__header">
              <div>
                <h3>Senha de Proteção</h3>
                <p>Controle de acesso para ações sensíveis no módulo.</p>
              </div>
              <span class="protecao-status ${hasPassword ? 'protecao-status--success' : 'protecao-status--warning'}">
                ${hasPassword ? 'Ativa' : 'Necessária'}
              </span>
            </div>
            <div class="protecao-section__body">
              <p class="protecao-lead ${hasPassword ? 'is-success' : 'is-warning'}">
                ${hasPassword ? '✅ Senha de proteção configurada e pronta para uso.' : '⚠️ Nenhuma senha configurada no momento.'}
              </p>
            </div>
            <div class="protecao-section__actions">
              ${
                hasPassword
                  ? `
                <button id="btnChangePassword" class="btn-secondary">Alterar Senha</button>
              `
                  : `
                <button id="btnSetPassword" class="btn-primary">Definir Senha</button>
              `
              }
            </div>
          </section>

          <section class="protecao-section protecao-section--policy">
            <div class="protecao-section__header">
              <div>
                <h3>Políticas de Retenção</h3>
                <p>Parâmetros de descarte, confirmação e limpeza automática.</p>
              </div>
            </div>
            <div class="protecao-section__body protecao-form-grid">
              <label class="protecao-field protecao-field--number">
                <span>Dias de retenção na lixeira</span>
                <input type="number" id="retencaoDias" min="1" max="90"
                       value="${config?.policy?.retencaoDias || 7}" />
              </label>
              <div class="protecao-checkbox-list">
                <label class="protecao-toggle">
                  <input type="checkbox" id="confirmarDuplo"
                         ${config?.policy?.confirmarDuplo ? 'checked' : ''} />
                  <span>Solicitar confirmação dupla para exclusão permanente</span>
                </label>
                <label class="protecao-toggle">
                  <input type="checkbox" id="autoPurge"
                         ${config?.policy?.autoPurge ? 'checked' : ''} />
                  <span>Purge automático de itens antigos</span>
                </label>
              </div>
            </div>
            <div class="protecao-section__actions">
              <button id="btnSavePolicy" class="btn-primary">Salvar Políticas</button>
            </div>
          </section>

          <section class="protecao-section protecao-section--trash">
            <div class="protecao-section__header">
              <div>
                <h3>Lixeira</h3>
                <p>Acesso rápido ao descarte lógico e limpeza operacional.</p>
              </div>
            </div>
            <div class="protecao-section__actions protecao-section__actions--split">
              <button id="btnViewTrash" class="btn-secondary">📂 Ver Itens na Lixeira</button>
              <button id="btnEmptyTrash" class="btn-danger">🗑️ Esvaziar Lixeira</button>
            </div>
          </section>

          <section class="protecao-section protecao-section--integrity">
            <div class="protecao-section__header">
              <div>
                <h3>Integridade</h3>
                <p>Auditoria e exportação de histórico operacional.</p>
              </div>
            </div>
            <div class="protecao-section__actions protecao-section__actions--split">
              <button id="btnVerifyIntegrity" class="btn-secondary">🔍 Verificar Integridade</button>
              <button id="btnExportLogs" class="btn-secondary">📥 Exportar Logs</button>
            </div>
          </section>
        </div>
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
