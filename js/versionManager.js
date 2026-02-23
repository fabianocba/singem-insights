import { APP_VERSION, APP_BUILD, VERSION_DISPLAY } from './core/version.js';

const RELOAD_KEY = 'singem:swReloadedAt';
const RELOAD_TTL = 10000;
let regOnce = null;

function canReload() {
  const now = Date.now();
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (now - last < RELOAD_TTL) {
    return false;
  }
  sessionStorage.setItem(RELOAD_KEY, String(now));
  setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), RELOAD_TTL);
  return true;
}

function postSW(worker, payload) {
  return new Promise((resolve) => {
    if (!worker) {
      return resolve({ ok: false });
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

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  if (regOnce) {
    return regOnce;
  }

  regOnce = (async () => {
    console.info('[VM]', VERSION_DISPLAY);

    const swUrl = `/sw.js?v=${encodeURIComponent(APP_VERSION)}&b=${encodeURIComponent(APP_BUILD)}`;
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
  window.addEventListener('DOMContentLoaded', () => {
    renderVersionInUI();
    registerServiceWorker().catch((error) => {
      console.warn('[VM] Falha ao registrar Service Worker:', error);
    });
  });
}
