const FALLBACK = Object.freeze({
  name: 'SINGEM',
  version: '1.2.2',
  build: '20260314-2350',
  buildTimestamp: '2026-03-14T23:50:00.000Z'
});

function loadMetaSync() {
  try {
    if (typeof window !== 'undefined' && window.__SINGEM_VERSION_META) {
      return { ...FALLBACK, ...window.__SINGEM_VERSION_META };
    }
  } catch {
    // sem impacto: segue fallback
  }
  return FALLBACK;
}

const raw = loadMetaSync();

function safeIso(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function buildFromIso(iso) {
  const dt = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}-${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}`;
}

export const APP_NAME = String(raw.name || FALLBACK.name);
export const APP_VERSION = String(raw.version || FALLBACK.version);
export const BUILD_TIMESTAMP = safeIso(raw.buildTimestamp);
export const APP_BUILD = String(raw.build || '').trim() || buildFromIso(BUILD_TIMESTAMP);
export const VERSION_DISPLAY = `${APP_NAME} ${APP_VERSION} • build ${APP_BUILD}`;
export const CACHE_BUSTER = `${APP_VERSION}-${APP_BUILD}`;

export const VERSION_INFO = Object.freeze({
  appName: APP_NAME,
  version: APP_VERSION,
  build: APP_BUILD,
  buildTimestamp: BUILD_TIMESTAMP,
  display: VERSION_DISPLAY,
  cacheBuster: CACHE_BUSTER
});

export const VERSION = Object.freeze({
  name: APP_NAME,
  version: APP_VERSION,
  build: APP_BUILD,
  buildTimestamp: BUILD_TIMESTAMP
});

export function renderVersionUI(targetId = 'appVersion') {
  if (typeof document === 'undefined') {
    return;
  }
  const el = document.getElementById(targetId);
  if (el) {
    el.textContent = VERSION_DISPLAY;
  }
}

export function logVersion(prefix = '[SINGEM] ') {
  console.info(`${prefix}${VERSION_DISPLAY}`);
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    APP_NAME,
    APP_VERSION,
    APP_BUILD,
    BUILD_TIMESTAMP,
    VERSION_DISPLAY,
    CACHE_BUSTER,
    VERSION_INFO,
    VERSION
  });
}
