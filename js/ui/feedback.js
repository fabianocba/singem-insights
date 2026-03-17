/**
 * UI Feedback - Feedback visual de processamento
 * Gerencia loading overlay e notificações toast
 */

import { escapeHTML as escapeHtml } from '../utils/sanitize.js';

let loadingOverlay = null;
let toastContainer = null;

function getLoadingMarkup() {
  return `
    <div class="sg-feedback-dialog" role="status" aria-live="polite">
      <div class="sg-feedback-spinner" aria-hidden="true"></div>
      <p id="loadingLabel" class="sg-feedback-label"></p>
    </div>
  `;
}

function initFeedbackElements() {
  if (!loadingOverlay) {
    loadingOverlay = document.getElementById('loadingOverlay') || document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.className = 'loading-overlay sg-feedback-overlay hidden';
    loadingOverlay.setAttribute('aria-hidden', 'true');
    loadingOverlay.innerHTML = getLoadingMarkup();

    if (!loadingOverlay.isConnected) {
      document.body.appendChild(loadingOverlay);
    }
  }

  if (!toastContainer) {
    toastContainer = document.getElementById('toastContainer') || document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'sg-toast-stack';

    if (!toastContainer.isConnected) {
      document.body.appendChild(toastContainer);
    }
  }
}

export function showLoading(label = 'Processando...') {
  initFeedbackElements();
  const labelEl = document.getElementById('loadingLabel');
  if (labelEl) {
    labelEl.textContent = String(label || 'Processando...');
  }

  loadingOverlay.classList.remove('hidden');
  loadingOverlay.setAttribute('aria-hidden', 'false');
}

export function hideLoading() {
  if (!loadingOverlay) {
    return;
  }

  loadingOverlay.classList.add('hidden');
  loadingOverlay.setAttribute('aria-hidden', 'true');
}

function showToast(message, type = 'info', duration = 5000) {
  initFeedbackElements();

  const configByType = {
    success: { icon: '✓' },
    error: { icon: '✕' },
    warning: { icon: '⚠' },
    info: { icon: 'ℹ' }
  };

  const config = configByType[type] || configByType.info;
  const toast = document.createElement('div');
  toast.className = `sg-toast is-${type}`;
  toast.innerHTML = `
    <span class="sg-toast__icon">${escapeHtml(config.icon)}</span>
    <span class="sg-toast__message">${escapeHtml(String(message || ''))}</span>
  `;

  const dispose = () => {
    toast.remove();
  };

  toast.addEventListener('click', dispose);
  toastContainer.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      if (toast.isConnected) {
        dispose();
      }
    }, duration);
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

if (typeof window !== 'undefined') {
  window.feedback = {
    showLoading,
    hideLoading,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
  };
}

console.log('[Feedback] Sistema de feedback visual inicializado');
