import { APP_VERSION, APP_BUILD, VERSION_DISPLAY } from './core/version.js';
import { initVersionUI } from './core/version-ui.js';
import { API_BASE_URL } from './shared/lib/http.js';

const RELOAD_TTL = 10000;
let regOnce = null;
let lastReloadAt = 0;

function canReload() {
  const now = Date.now();
  if (now - lastReloadAt < RELOAD_TTL) {
    return false;
  }
  lastReloadAt = now;
  return true;
}

function postSW(worker, payload) {
  return new Promise((resolve) => {
    if (!worker) {
      resolve({ ok: false });
      return;
    }
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => resolve(event.data || { ok: true });
    worker.postMessage(payload, [channel.port2]);
    setTimeout(() => resolve({ ok: false, timeout: true }), 2000);
  });
}

function renderVersionInUI() {
  const el = document.getElementById('appVersion');
  if (el) {
    el.textContent = VERSION_DISPLAY;
  }
}

async function canRegisterServiceWorker(swUrl) {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const forceEnableInDev = window.__ENABLE_SW_DEV__ === true;

  if (isLocalhost && !forceEnableInDev) {
    console.info('[VM] SW desabilitado em localhost');
    return false;
  }

  try {
    const response = await fetch(swUrl, { method: 'HEAD', cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  if (regOnce) {
    return regOnce;
  }

  regOnce = (async () => {
    const versionMeta = window.__SINGEM_VERSION_META || {};
    const swVersion = String(versionMeta.version || APP_VERSION || '1.2.2');
    const swBuild = String(versionMeta.build || APP_BUILD || 'local');
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    console.info('[VM]', `${versionMeta.name || 'SINGEM'} v${swVersion} • build ${swBuild}`);

    if (isLocalhost) {
      // Em dev local, remove SW legado para evitar servir assets desatualizados.
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        await Promise.all(regs.map((reg) => reg.unregister()));
        console.info('[VM] Service Workers legados removidos em localhost');
      }
    }

    const swUrl = `/sw.js?v=${encodeURIComponent(swVersion)}&b=${encodeURIComponent(swBuild)}`;
    const swAvailable = await canRegisterServiceWorker(swUrl);
    if (!swAvailable) {
      console.warn('[VM] SW não disponível para registro:', swUrl);
      return null;
    }

    const registration = await navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' });

    registration.addEventListener('updatefound', () => {
      console.info('[VM] Nova versão do SW encontrada');
      const newWorker = registration.installing;
      if (!newWorker) {
        return;
      }

      newWorker.addEventListener('statechange', async () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.info('[VM] ativando...');
          await postSW(newWorker, { type: 'SKIP_WAITING' });
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.info('[VM] controlador mudou');
      if (canReload()) {
        window.location.reload();
      }
    });

    await registration.update();
    return registration;
  })();

  return regOnce;
}

window.SINGEM_CACHE = {
  async clearAll() {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => postSW(reg.active || reg.waiting || reg.installing, { type: 'CLEAR_CACHES' })));

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    return true;
  },
  async unregisterSW() {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
    return true;
  },
  async hardReload() {
    await this.clearAll();
    window.location.reload();
  }
};

if (typeof window !== 'undefined') {
  window.__API_BASE_URL__ = window.__API_BASE_URL__ || API_BASE_URL;

  window.addEventListener('DOMContentLoaded', () => {
    renderVersionInUI();
    initVersionUI()
      .catch((error) => {
        console.warn('[VM] Falha ao renderizar versão via API:', error);
      })
      .finally(() => {
        registerServiceWorker().catch((error) => {
          console.warn('[VM] Falha ao registrar Service Worker:', error);
        });
      });
  });
}
