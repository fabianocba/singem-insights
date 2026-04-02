export function createBrandImage(src, alt, variant = 'login') {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.className = `sg-brand-image ${variant === 'header' ? 'sg-brand-image--header' : 'sg-brand-image--login'}`;
  img.decoding = 'async';
  return img;
}

export function replaceElementChildren(element, children = []) {
  if (!element) {
    return;
  }

  element.replaceChildren(...children.filter(Boolean));
}

export function normalizeVersionMeta(raw = {}, defaults = {}) {
  return {
    name: String(raw.name || defaults.name || 'SINGEM'),
    version: String(raw.version || defaults.version || 'unknown'),
    build: String(raw.build || defaults.build || 'local'),
    channel: String(raw.channel || defaults.channel || 'dev'),
    buildTimestamp: String(raw.buildTimestamp || defaults.buildTimestamp || new Date().toISOString())
  };
}

export async function resolveCanonicalVersionMeta({ defaultVersion, defaultBuild } = {}) {
  const defaults = {
    version: defaultVersion,
    build: defaultBuild
  };

  const fromWindow = window.__SINGEM_VERSION_META;
  if (fromWindow?.version && fromWindow?.build) {
    return normalizeVersionMeta(fromWindow, defaults);
  }

  try {
    const response = await fetch('/version.json', { cache: 'no-store' });
    if (response.ok) {
      const payload = await response.json();
      return normalizeVersionMeta(payload, defaults);
    }
  } catch {
    // Fallback para bundle caso version.json não esteja acessível.
  }

  return normalizeVersionMeta({}, defaults);
}
