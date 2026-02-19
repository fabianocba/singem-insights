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
    try {
      const items = await window.fsManager.listTrashItems();

      if (items.length === 0) {
        this.showMessage('ℹ️ Lixeira vazia', 'info');
        return;
      }

      const html = `
        <div class="trash-modal">
          <h3>🗑️ Lixeira (${items.length} item(ns))</h3>
          <table>
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Tipo</th>
                <th>Ano</th>
                <th>Excluído em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr>
                  <td>${item.originalName}</td>
                  <td>${item.originalType}</td>
                  <td>${item.year}</td>
                  <td>${new Date(item.deletedAt).toLocaleString('pt-BR')}</td>
                  <td>
                    <button onclick="protecaoUI.restoreFile('${item.year}', '${item.fileName}', '${item.originalType}')">
                      Restaurar
                    </button>
                    <button onclick="protecaoUI.permanentDelete('${item.year}', '${item.fileName}')">
                      Excluir Definitivo
                    </button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;

      this.showMessage(html, 'info', true);
    } catch (error) {
      this.showMessage(`❌ Erro: ${error.message}`, 'error');
    }
  }

  /**
   * Esvazia lixeira
   */
  async handleEmptyTrash() {
    try {
      await window.protectionManager.requirePassword('esvaziar a lixeira');

      const items = await window.fsManager.listTrashItems();

      if (items.length === 0) {
        this.showMessage('ℹ️ Lixeira já está vazia', 'info');
        return;
      }

      const confirm = window.confirm(
        `⚠️ ATENÇÃO\n\n` +
          `Esta ação irá excluir permanentemente ${items.length} arquivo(s).\n` +
          `Esta operação NÃO pode ser desfeita!\n\n` +
          `Deseja continuar?`
      );

      if (!confirm) {
        return;
      }

      let deletedCount = 0;

      for (const item of items) {
        try {
          await window.protectionManager.hardDelete(item.year, item.fileName, false);
          deletedCount++;
        } catch (error) {
          console.error(`Erro ao excluir ${item.fileName}:`, error);
        }
      }

      this.showMessage(`✅ ${deletedCount} arquivo(s) excluído(s) permanentemente`, 'success');
    } catch (error) {
      this.showMessage(`❌ ${error.message}`, 'error');
    }
  }

  /**
   * Verifica integridade
   */
  async handleVerifyIntegrity() {
    try {
      this.showMessage('🔍 Verificando integridade...', 'info');

      const year = new Date().getFullYear();
      const report = await window.integrityManager.reconcile(year);

      // Exporta relatório HTML
      await window.integrityManager.exportReport(report);

      const summary = report.summary;
      this.showMessage(
        `✅ Verificação concluída!\n\n` +
          `Pastas verificadas: ${summary.totalFolders}\n` +
          `Sem problemas: ${summary.foldersOk}\n` +
          `Com problemas: ${summary.foldersWithIssues}\n` +
          `Total de inconsistências: ${summary.totalIssues}\n\n` +
          `Relatório HTML exportado.`,
        'success'
      );
    } catch (error) {
      this.showMessage(`❌ Erro: ${error.message}`, 'error');
    }
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
