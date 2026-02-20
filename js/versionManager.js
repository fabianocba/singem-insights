/**
 * Sistema de Versionamento e Atualização - SINGEM
 *
 * Gerencia versões, registra Service Worker e detecta atualizações.
 *
 * ⚠️ IMPORTANTE: A versão canônica está em js/config/version.js
 * Este arquivo apenas consome esses valores.
 */

class VersionManager {
  constructor() {
    // Valores serão atualizados em init() quando os módulos ES já tiverem executado
    this.currentVersion = 'v0.0.0';
    this.currentBuild = 'unknown';
    this.versionKey = 'SINGEM_version';
    this.updateCheckInterval = 5 * 60 * 1000; // 5 minutos
    this.swRegistration = null;
  }

  /**
   * Inicializa o sistema de versionamento
   */
  async init() {
    // Atualiza valores agora que os módulos ES já executaram
    this.currentVersion = window.SINGEM_VERSION || 'v0.0.0';
    this.currentBuild = window.SINGEM_BUILD || 'unknown';

    console.log(`📦 SINGEM ${this.currentVersion} (build ${this.currentBuild})`);

    // Verifica se há atualização
    this.checkForUpdates();

    // Registra Service Worker (se suportado)
    if ('serviceWorker' in navigator) {
      await this.registerServiceWorker();
    } else {
      console.warn('⚠️ Service Worker não suportado neste navegador');
    }

    // Verifica atualizações periodicamente
    setInterval(() => this.checkForUpdates(), this.updateCheckInterval);
  }

  /**
   * Registra o Service Worker
   */
  async registerServiceWorker() {
    try {
      console.log('📝 Registrando Service Worker...');

      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Importante: não usa cache para o próprio SW
      });

      console.log('✅ Service Worker registrado:', this.swRegistration.scope);

      // Escuta atualizações do Service Worker
      this.swRegistration.addEventListener('updatefound', () => {
        console.log('🔄 Nova versão do Service Worker encontrada');
        const newWorker = this.swRegistration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nova versão disponível
            this.notifyUpdate();
          }
        });
      });

      // Verifica atualizações do SW a cada 1 hora
      setInterval(
        () => {
          this.swRegistration.update();
        },
        60 * 60 * 1000
      );
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    }
  }

  /**
   * Verifica se há uma nova versão da aplicação
   */
  checkForUpdates() {
    const storedVersion = localStorage.getItem(this.versionKey);

    if (!storedVersion) {
      // Primeira execução
      console.log('🆕 Primeira execução detectada');
      localStorage.setItem(this.versionKey, this.currentVersion);
      return;
    }

    if (storedVersion !== this.currentVersion) {
      console.log(`🔄 Atualização detectada: ${storedVersion} → ${this.currentVersion}`);
      this.handleVersionUpdate(storedVersion, this.currentVersion);
      localStorage.setItem(this.versionKey, this.currentVersion);
    }
  }

  /**
   * Trata atualização de versão
   */
  handleVersionUpdate(oldVersion, newVersion) {
    console.log(`📦 Atualizando de ${oldVersion} para ${newVersion}`);

    // Limpa cache do Service Worker se disponível
    if (this.swRegistration) {
      this.clearServiceWorkerCache();
    }

    // Mostra notificação de atualização
    this.showUpdateNotification(oldVersion, newVersion);
  }

  /**
   * Limpa cache do Service Worker
   */
  async clearServiceWorkerCache() {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            console.log('✅ Cache do Service Worker limpo');
          }
        };

        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' }, [messageChannel.port2]);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  /**
   * Mostra notificação de atualização
   */
  showUpdateNotification(oldVersion, newVersion) {
    // Cria elemento de notificação
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #1e7e34, #28a745);
      color: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        #update-notification h3 { margin: 0 0 10px 0; font-size: 18px; }
        #update-notification p { margin: 0 0 15px 0; font-size: 14px; }
        #update-notification button {
          background: white;
          color: #28a745;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          margin-right: 10px;
        }
        #update-notification button:hover {
          background: #f0f0f0;
        }
        #update-notification .close-btn {
          background: transparent;
          color: white;
          border: 1px solid white;
        }
      </style>
      <h3>🎉 Nova versão disponível!</h3>
      <p>Atualizado de <strong>${oldVersion}</strong> para <strong>${newVersion}</strong></p>
      <button onclick="window.versionManager.reloadApp()">🔄 Recarregar Agora</button>
      <button class="close-btn" onclick="this.parentElement.remove()">Depois</button>
    `;

    document.body.appendChild(notification);

    // Remove automaticamente após 10 segundos se não interagir
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Notifica sobre atualização do Service Worker
   */
  notifyUpdate() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #007bff;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      z-index: 10000;
    `;

    notification.innerHTML = `
      <p style="margin: 0 0 10px 0;">Nova versão disponível!</p>
      <button onclick="window.versionManager.activateUpdate()" style="
        background: white;
        color: #007bff;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      ">Atualizar Agora</button>
    `;

    document.body.appendChild(notification);
  }

  /**
   * Ativa atualização do Service Worker
   */
  activateUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }

  /**
   * Recarrega a aplicação
   */
  reloadApp() {
    console.log('🔄 Recarregando aplicação...');
    window.location.reload(true);
  }

  /**
   * Obtém informações de versão
   */
  getVersionInfo() {
    return {
      version: this.currentVersion,
      build: this.buildTimestamp,
      userAgent: navigator.userAgent,
      serviceWorker: 'serviceWorker' in navigator,
      indexedDB: 'indexedDB' in window
    };
  }
}

// Instância global
window.versionManager = new VersionManager();

// Auto-inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.versionManager.init();
  });
} else {
  window.versionManager.init();
}

console.log('✅ VersionManager carregado');
