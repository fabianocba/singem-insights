const { config } = require('../../config');

const store = new Map();

const stats = {
  hits: 0,
  misses: 0,
  writes: 0,
  clears: 0
};

function isEnabled() {
  return config.integracoes?.cacheEnabled !== false;
}

function buildKey(namespace, key) {
  return `${namespace}:${key}`;
}

function get(namespace, key) {
  if (!isEnabled()) {
    stats.misses += 1;
    return null;
  }

  const fullKey = buildKey(namespace, key);
  const item = store.get(fullKey);

  if (!item) {
    stats.misses += 1;
    return null;
  }

  if (item.expiresAt <= Date.now()) {
    store.delete(fullKey);
    stats.misses += 1;
    return null;
  }

  stats.hits += 1;
  return item.value;
}

function set(namespace, key, value, ttlSeconds) {
  if (!isEnabled()) {
    return;
  }

  const safeTtl = Math.max(1, Number(ttlSeconds || 1));
  const fullKey = buildKey(namespace, key);

  store.set(fullKey, {
    value,
    expiresAt: Date.now() + safeTtl * 1000
  });

  stats.writes += 1;
}

function clear(prefix = null) {
  if (!prefix) {
    const size = store.size;
    store.clear();
    stats.clears += 1;
    return { cleared: size };
  }

  let cleared = 0;
  for (const key of store.keys()) {
    if (key.startsWith(`${prefix}:`)) {
      store.delete(key);
      cleared += 1;
    }
  }

  stats.clears += 1;
  return { cleared };
}

function snapshotStats() {
  const totalRequests = stats.hits + stats.misses;
  const hitRate = totalRequests > 0 ? Number(((stats.hits / totalRequests) * 100).toFixed(2)) : 0;

  return {
    ...stats,
    entries: store.size,
    totalRequests,
    hitRate
  };
}

module.exports = {
  get,
  set,
  clear,
  snapshotStats
};
