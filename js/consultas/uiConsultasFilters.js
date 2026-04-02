export function sanitizeCodesInput(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[\s,;\n\r]+/);
  const uniqueCodes = [];
  const seen = new Set();

  source.forEach((entry) => {
    const normalized = String(entry || '').replace(/\D/g, '');
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    uniqueCodes.push(normalized);
  });

  return uniqueCodes.join(', ');
}

export function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function shouldAutoSearch(text) {
  return normalizeText(text).length >= 3;
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function createSearchSignature(dataset, params = {}) {
  return stableSerialize({ dataset, params });
}
