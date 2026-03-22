import { resolveApiUrl } from '../shared/lib/http.js';
import { VERSION } from './version.js';

function formatVersionText(payload) {
  return `${payload.name} v${payload.version} • ${payload.channel} • build ${payload.build} • ${payload.buildTimestamp}`;
}

function normalizePayload(raw = {}) {
  return {
    name: String(raw.name || 'SINGEM'),
    version: String(raw.version || '1.2.2'),
    channel: String(raw.channel || 'dev'),
    build: String(raw.build || 'local'),
    buildTimestamp: String(raw.buildTimestamp || 'local')
  };
}

async function fetchVersion(url) {
  const response = await fetch(url, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar versão: ${response.status}`);
  }

  const json = await response.json();
  return normalizePayload(json);
}

async function loadVersionFromApi() {
  return fetchVersion(resolveApiUrl('/api/version'));
}

async function loadVersionFromLocal() {
  return fetchVersion('/version.json');
}

function loadVersionFromBundle() {
  return normalizePayload({
    name: VERSION.name,
    version: VERSION.version,
    channel: 'local',
    build: VERSION.build,
    buildTimestamp: VERSION.buildTimestamp
  });
}

export async function initVersionUI(targetId = 'app-version') {
  if (typeof document === 'undefined') {
    return null;
  }

  const target = document.getElementById(targetId);
  if (!target) {
    return null;
  }

  let payload = null;

  try {
    payload = await loadVersionFromApi();
  } catch {
    try {
      payload = await loadVersionFromLocal();
    } catch {
      payload = loadVersionFromBundle();
    }
  }

  window.__SINGEM_VERSION_META = payload;
  target.textContent = formatVersionText(payload);
  target.title = payload.buildTimestamp;
  return payload;
}
