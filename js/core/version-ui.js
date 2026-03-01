function formatVersionText(payload) {
  return `${payload.name} v${payload.version} • ${payload.channel} • build ${payload.build} • ${payload.buildTimestamp}`;
}

function normalizePayload(raw = {}) {
  return {
    name: String(raw.name || 'SINGEM'),
    version: String(raw.version || '0.0.0'),
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
  try {
    return await fetchVersion('/api/version');
  } catch (error) {
    const isStaticDev = window.location.port === '8000';
    if (!isStaticDev) {
      throw error;
    }

    const fallbackUrl = `${window.location.protocol}//${window.location.hostname}:3000/api/version`;
    return fetchVersion(fallbackUrl);
  }
}

export async function initVersionUI(targetId = 'app-version') {
  if (typeof document === 'undefined') {
    return null;
  }

  const target = document.getElementById(targetId);
  if (!target) {
    return null;
  }

  try {
    const payload = await loadVersionFromApi();
    window.__SINGEM_VERSION_META = payload;
    target.textContent = formatVersionText(payload);
    target.title = payload.buildTimestamp;
    return payload;
  } catch {
    target.textContent = 'Versão: indisponível';
    target.title = '';
    return null;
  }
}
