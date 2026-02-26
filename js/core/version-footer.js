function resolveApiVersionUrl() {
  const baseUrl = String(window.CONFIG?.api?.baseUrl || '')
    .trim()
    .replace(/\/$/, '');

  if (baseUrl) {
    return `${baseUrl}/api/version`;
  }

  const { protocol, hostname, port } = window.location;
  if (port === '8000') {
    return `${protocol}//${hostname}:3000/api/version`;
  }

  return '/api/version';
}

function normalizeEnv(value) {
  if (value === 'production' || value === 'development') {
    return value;
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'development';
  }

  return 'production';
}

function ensureVersionElement() {
  let container = document.getElementById('app-version-container');
  if (!container) {
    container = document.createElement('footer');
    container.id = 'app-version-container';
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.right = '0';
    container.style.bottom = '0';
    container.style.padding = '6px 10px';
    container.style.fontSize = '12px';
    container.style.textAlign = 'center';
    container.style.zIndex = '9999';
    container.style.background = 'var(--bg-secondary)';
    container.style.borderTop = '1px solid var(--border-color)';
    document.body.appendChild(container);
  }

  let el = document.getElementById('app-version');
  if (!el) {
    el = document.createElement('small');
    el.id = 'app-version';
    container.appendChild(el);
  }

  return el;
}

function formatVersionText(payload) {
  return `${payload.name} v${payload.version} • build ${payload.build} • commit ${payload.gitCommit} • env ${normalizeEnv(payload.nodeEnv)}`;
}

async function loadApiVersion() {
  const response = await fetch(resolveApiVersionUrl(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha API version: ${response.status}`);
  }

  const json = await response.json();
  return {
    name: String(json.name || 'SINGEM'),
    version: String(json.version || '0.0.0'),
    build: String(json.build || 'local'),
    buildTimestamp: String(json.buildTimestamp || ''),
    gitCommit: String(json.gitCommit || 'unknown'),
    nodeEnv: normalizeEnv(json.nodeEnv)
  };
}

async function loadFallbackVersion() {
  const response = await fetch(new URL('./version.json', import.meta.url), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha fallback version: ${response.status}`);
  }

  const json = await response.json();
  return {
    name: String(json.name || 'SINGEM'),
    version: String(json.version || '0.0.0'),
    build: String(json.build || 'local'),
    buildTimestamp: String(json.buildTimestamp || ''),
    gitCommit: 'unknown',
    nodeEnv: normalizeEnv()
  };
}

export async function initVersionFooter() {
  if (typeof document === 'undefined') {
    return;
  }

  const target = ensureVersionElement();

  try {
    const versionData = await loadApiVersion();
    target.textContent = formatVersionText(versionData);
    target.title = versionData.buildTimestamp;
    return;
  } catch {
    // fallback local
  }

  try {
    const fallbackData = await loadFallbackVersion();
    target.textContent = formatVersionText(fallbackData);
    target.title = fallbackData.buildTimestamp;
  } catch {
    target.textContent = 'SINGEM • versão indisponível';
  }
}
