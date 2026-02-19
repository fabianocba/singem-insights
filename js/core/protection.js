/**
 * Sistema de Proteção de Pastas
 * Gerencia senha, autorizações e soft-delete (lixeira)
 */

class ProtectionManager {
  constructor() {
    this.sessionToken = null;
    this.sessionExpiry = null;
    this.SESSION_DURATION = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Inicializa banco de dados para proteção
   */
  async ensureDBReady() {
    if (!window.dbManager?.db) {
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (window.dbManager?.db) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }
  }

  /**
   * Obtém configuração de proteção
   */
  async getConfig() {
    await this.ensureDBReady();

    try {
      const result = await window.dbManager.get('config', 'protecaoPastas');
      return result || null;
    } catch (error) {
      console.error('Erro ao obter config de proteção:', error);
      return null;
    }
  }

  /**
   * Verifica se há senha configurada
   */
  async hasPassword() {
    const config = await this.getConfig();
    return !!(config && config.hash);
  }

  /**
   * Define senha inicial
   */
  async setPassword(password) {
    if (!password || password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    // Verifica se já existe senha
    const hasPass = await this.hasPassword();
    if (hasPass) {
      throw new Error('Senha já configurada. Use changePassword()');
    }

    const { hash, salt, iterations } = await this.hashPassword(password);

    const config = {
      id: 'protecaoPastas',
      hash,
      salt,
      iterations,
      policy: {
        retencaoDias: 7,
        confirmarDuplo: true,
        autoPurge: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await window.dbManager.update('config', config);
    console.log('✅ Senha de proteção configurada');
  }

  /**
   * Altera senha existente
   */
  async changePassword(oldPassword, newPassword) {
    // Verifica senha antiga
    const valid = await this.verifyPassword(oldPassword);
    if (!valid) {
      throw new Error('Senha atual incorreta');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Nova senha deve ter pelo menos 6 caracteres');
    }

    const { hash, salt, iterations } = await this.hashPassword(newPassword);
    const config = await this.getConfig();

    config.hash = hash;
    config.salt = salt;
    config.iterations = iterations;
    config.updatedAt = new Date().toISOString();

    await window.dbManager.update('config', config);

    // Invalida token de sessão
    this.sessionToken = null;
    this.sessionExpiry = null;

    console.log('✅ Senha alterada com sucesso');
  }

  /**
   * Hash de senha usando PBKDF2
   */
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100000;

    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return {
      hash: this.bufferToHex(new Uint8Array(hashBuffer)),
      salt: this.bufferToHex(salt),
      iterations
    };
  }

  /**
   * Verifica senha
   */
  async verifyPassword(password) {
    const config = await this.getConfig();
    if (!config || !config.hash) {
      throw new Error('Nenhuma senha configurada');
    }

    const encoder = new TextEncoder();
    const salt = this.hexToBuffer(config.salt);

    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: config.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const computedHash = this.bufferToHex(new Uint8Array(hashBuffer));
    return computedHash === config.hash;
  }

  /**
   * Requer senha com UI modal
   */
  async requirePassword(action = 'esta ação') {
    // Verifica se tem token válido na sessão
    if (this.isSessionValid()) {
      return true;
    }

    return new Promise((resolve, reject) => {
      const modal = document.createElement('div');
      modal.className = 'protection-modal-overlay';
      modal.innerHTML = `
        <div class="protection-modal">
          <div class="protection-modal-header">
            <h3>🔒 Autorização Necessária</h3>
            <button class="protection-modal-close" id="protectionModalClose">&times;</button>
          </div>
          <div class="protection-modal-body">
            <p>Digite a senha de proteção para <strong>${action}</strong>:</p>
            <input type="password" id="protectionPasswordInput"
                   placeholder="Senha de proteção"
                   class="protection-password-input" />
            <div id="protectionError" class="protection-error hidden"></div>
          </div>
          <div class="protection-modal-footer">
            <button id="protectionCancelBtn" class="btn-secondary">Cancelar</button>
            <button id="protectionConfirmBtn" class="btn-primary">Confirmar</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const input = modal.querySelector('#protectionPasswordInput');
      const errorDiv = modal.querySelector('#protectionError');
      const confirmBtn = modal.querySelector('#protectionConfirmBtn');
      const cancelBtn = modal.querySelector('#protectionCancelBtn');
      const closeBtn = modal.querySelector('#protectionModalClose');

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      const handleConfirm = async () => {
        const password = input.value;

        if (!password) {
          errorDiv.textContent = 'Digite a senha';
          errorDiv.classList.remove('hidden');
          return;
        }

        try {
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Verificando...';

          const valid = await this.verifyPassword(password);

          if (valid) {
            // Cria token de sessão
            this.createSession();
            cleanup();
            resolve(true);
          } else {
            errorDiv.textContent = '❌ Senha incorreta';
            errorDiv.classList.remove('hidden');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar';
            input.value = '';
            input.focus();
          }
        } catch (error) {
          errorDiv.textContent = 'Erro ao verificar senha';
          errorDiv.classList.remove('hidden');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Confirmar';
        }
      };

      const handleCancel = () => {
        cleanup();
        reject(new Error('Operação cancelada pelo usuário'));
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      closeBtn.addEventListener('click', handleCancel);

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleConfirm();
        }
      });

      // Foco no input
      setTimeout(() => input.focus(), 100);
    });
  }

  /**
   * Cria token de sessão temporário
   */
  createSession() {
    this.sessionToken = this.generateToken();
    this.sessionExpiry = Date.now() + this.SESSION_DURATION;
    console.log('✅ Sessão de proteção criada (válida por 5 min)');
  }

  /**
   * Verifica se sessão está válida
   */
  isSessionValid() {
    if (!this.sessionToken || !this.sessionExpiry) {
      return false;
    }

    if (Date.now() > this.sessionExpiry) {
      this.sessionToken = null;
      this.sessionExpiry = null;
      console.log('⏱️ Sessão de proteção expirada');
      return false;
    }

    return true;
  }

  /**
   * Invalida sessão
   */
  invalidateSession() {
    this.sessionToken = null;
    this.sessionExpiry = null;
    console.log('🔒 Sessão de proteção invalidada');
  }

  /**
   * Soft delete - move para lixeira
   */
  async softDelete(type, year, fileName) {
    // Requer senha ou token válido
    await this.requirePassword(`mover "${fileName}" para lixeira`);

    // Chama fsManager para mover
    await window.fsManager.moveToTrash(type, year, fileName);

    // Registra no log de auditoria
    await this.logAction('soft_delete', { type, year, fileName });

    console.log(`🗑️ Arquivo movido para lixeira: ${fileName}`);
  }

  /**
   * Hard delete - exclusão permanente da lixeira
   */
  async hardDelete(year, fileName, confirmarDuplo = true) {
    const config = await this.getConfig();

    // Requer senha
    await this.requirePassword(`excluir permanentemente "${fileName}"`);

    // Confirmação dupla se configurado
    if (confirmarDuplo || (config && config.policy.confirmarDuplo)) {
      const confirm = window.confirm(
        `⚠️ EXCLUSÃO PERMANENTE\n\n` +
          `Arquivo: ${fileName}\n\n` +
          `Esta ação NÃO pode ser desfeita!\n\n` +
          `Deseja continuar?`
      );

      if (!confirm) {
        throw new Error('Exclusão cancelada');
      }
    }

    // Exclui permanentemente da lixeira
    await window.fsManager.hardDeleteFromTrash(year, fileName);

    // Registra no log
    await this.logAction('hard_delete', { year, fileName });

    console.log(`❌ Arquivo excluído permanentemente: ${fileName}`);
  }

  /**
   * Restaura arquivo da lixeira
   */
  async restore(year, fileName, targetType) {
    // Requer senha
    await this.requirePassword(`restaurar "${fileName}"`);

    await window.fsManager.restoreFromTrash(year, fileName, targetType);

    // Registra no log
    await this.logAction('restore', { year, fileName, targetType });

    console.log(`↩️ Arquivo restaurado: ${fileName}`);
  }

  /**
   * Auto-purge da lixeira (itens antigos)
   */
  async autoPurgeTrash() {
    const config = await this.getConfig();

    if (!config || !config.policy.autoPurge) {
      console.log('ℹ️ Auto-purge desabilitado');
      return;
    }

    const retencaoDias = config.policy.retencaoDias || 7;
    const cutoffDate = Date.now() - retencaoDias * 24 * 60 * 60 * 1000;

    // Lista itens da lixeira
    const items = await window.fsManager.listTrashItems();

    let purgedCount = 0;

    for (const item of items) {
      if (item.deletedAt < cutoffDate) {
        try {
          await window.fsManager.hardDeleteFromTrash(item.year, item.fileName, true); // skipLog
          purgedCount++;
        } catch (error) {
          console.error(`Erro ao purgar ${item.fileName}:`, error);
        }
      }
    }

    if (purgedCount > 0) {
      await this.logAction('auto_purge', { count: purgedCount, retencaoDias });
      console.log(`🗑️ Auto-purge: ${purgedCount} item(ns) removido(s)`);
    }
  }

  /**
   * Atualiza política de retenção
   */
  async updatePolicy(policy) {
    const config = await this.getConfig();

    if (!config) {
      throw new Error('Configure a senha primeiro');
    }

    config.policy = {
      ...config.policy,
      ...policy
    };
    config.updatedAt = new Date().toISOString();

    await window.dbManager.update('config', config);
    console.log('✅ Política de proteção atualizada');
  }

  /**
   * Registra ação no log de auditoria
   */
  async logAction(action, details) {
    await this.ensureDBReady();

    try {
      const log = {
        id: Date.now(),
        action,
        details,
        timestamp: new Date().toISOString(),
        user: window.app?.usuarioLogado?.login || 'system'
      };

      // Salva no IndexedDB (store: audit.fs)
      const tx = window.dbManager.db.transaction(['config'], 'readwrite');
      const store = tx.objectStore('config');

      // Busca logs existentes
      const result = await new Promise((resolve, reject) => {
        const req = store.get('fsAuditLog');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const logs = result?.logs || [];
      logs.push(log);

      // Limita a 1000 entradas mais recentes
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      await new Promise((resolve, reject) => {
        const req = store.put({
          id: 'fsAuditLog',
          logs,
          updatedAt: new Date().toISOString()
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  }

  /**
   * Obtém logs de auditoria
   */
  async getLogs(limit = 100) {
    await this.ensureDBReady();

    try {
      const result = await window.dbManager.get('config', 'fsAuditLog');
      const logs = result?.logs || [];
      return logs.slice(-limit).reverse();
    } catch (error) {
      console.error('Erro ao obter logs:', error);
      return [];
    }
  }

  /**
   * Exporta logs para CSV
   */
  async exportLogs() {
    const logs = await this.getLogs(1000);

    if (logs.length === 0) {
      alert('Nenhum log disponível');
      return;
    }

    const csv = [
      ['Data/Hora', 'Ação', 'Usuário', 'Detalhes'].join(';'),
      ...logs.map((log) => [log.timestamp, log.action, log.user, JSON.stringify(log.details)].join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('✅ Log exportado');
  }

  /**
   * Utilitários
   */
  bufferToHex(buffer) {
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  generateToken() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Instância global
window.protectionManager = new ProtectionManager();

console.log('✅ Protection Manager carregado');
