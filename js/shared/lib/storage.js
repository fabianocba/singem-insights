const memoryStore = new Map();

export function getLocalJson(key, fallback = null) {
  try {
    const raw = memoryStore.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalJson(key, value) {
  try {
    memoryStore.set(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
