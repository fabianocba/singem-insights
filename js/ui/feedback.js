/**
 * UI Feedback - Feedback visual de processamento
 * Gerencia loading overlay e notificações toast
 */

let loadingOverlay = null;
let toastContainer = null;

/**
 * Inicializa elementos de feedback no DOM
 */
function initFeedbackElements() {
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      z-index: 10000;
      align-items: center;
      justify-content: center;
    `;

    loadingOverlay.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #2e7d32; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
        <p id="loadingLabel" style="margin: 0; font-size: 16px; color: #333; font-weight: 500;"></p>
      </div>
    `;

    document.body.appendChild(loadingOverlay);

    // Adicionar animação
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10001;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(toastContainer);
  }
}

/**
 * Exibe overlay de loading
 * @param {string} label - Texto a exibir
 */
export function showLoading(label = 'Processando...') {
  initFeedbackElements();
  const labelEl = document.getElementById('loadingLabel');
  if (labelEl) {
    labelEl.textContent = label;
  }
  loadingOverlay.style.display = 'flex';
}

/**
 * Oculta overlay de loading
 */
export function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
}

/**
 * Exibe notificação toast
 * @param {string} message - Mensagem
 * @param {string} type - Tipo: 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - Duração em ms (0 = manual)
 */
function showToast(message, type = 'info', duration = 5000) {
  initFeedbackElements();

  const colors = {
    success: { bg: '#4caf50', icon: '✓' },
    error: { bg: '#f44336', icon: '✕' },
    warning: { bg: '#ff9800', icon: '⚠' },
    info: { bg: '#2196f3', icon: 'ℹ' }
  };

  const config = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${config.bg};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    min-width: 250px;
    max-width: 400px;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideIn 0.3s ease-out;
    cursor: pointer;
  `;

  toast.innerHTML = `
    <span style="font-size: 20px; font-weight: bold;">${config.icon}</span>
    <span style="flex: 1;">${message}</span>
  `;

  // Fechar ao clicar
  toast.addEventListener('click', () => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  });

  toastContainer.appendChild(toast);

  // Auto-remover
  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  // Adicionar animações
  if (!document.getElementById('toastAnimations')) {
    const style = document.createElement('style');
    style.id = 'toastAnimations';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Notificação de sucesso
 * @param {string} message - Mensagem
 */
export function notifySuccess(message) {
  showToast(message, 'success', 4000);
}

/**
 * Notificação de erro
 * @param {string} message - Mensagem
 */
export function notifyError(message) {
  showToast(message, 'error', 6000);
}

/**
 * Notificação de aviso
 * @param {string} message - Mensagem
 */
export function notifyWarning(message) {
  showToast(message, 'warning', 5000);
}

/**
 * Notificação informativa
 * @param {string} message - Mensagem
 */
export function notifyInfo(message) {
  showToast(message, 'info', 4000);
}

console.log('[Feedback] Sistema de feedback visual inicializado');
