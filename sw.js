const u = new URL(self.location.href);
const APP_VERSION = u.searchParams.get('v') || '0.0.2';
const APP_BUILD = u.searchParams.get('b') || 'local';

const APP_CACHE_PREFIX = 'singem-cache';
const CACHE_NAME = `${APP_CACHE_PREFIX}-${APP_VERSION}-${APP_BUILD}`;
const IMAGE_LIMIT = 80;

const APP_SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/versionManager.js',
  '/js/core/version.js',
  '/js/core/version.json'
];

const isApiReq = (url) => url.port === '3000' || url.pathname.startsWith('/api/');

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const asset of APP_SHELL) {
        try {
          await cache.add(asset);
        } catch {
          // segue precache mesmo com falhas pontuais
        }
      }
      await self.skipWaiting();
      console.info('[SW] instalado', CACHE_NAME);
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key !== CACHE_NAME) {
          await caches.delete(key);
          console.info('[SW] removendo cache antigo', key);
        }
      }
      await self.clients.claim();
      console.info('[SW] ativado', CACHE_NAME);
    })()
  );
});

self.addEventListener('message', (event) => {
  const msg = event.data || {};

  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (msg.type === 'CLEAR_CACHES') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        event.ports?.[0]?.postMessage({ ok: true, deleted: keys });
      })()
    );
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match('/index.html')) || Response.error();
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(networkPromise);
    return cached;
  }

  return (await networkPromise) || Response.error();
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    if (keys.length > IMAGE_LIMIT) {
      await cache.delete(keys[0]);
    }
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiReq(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  const isJsCss =
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css');

  if (isJsCss) {
    event.respondWith(staleWhileRevalidate(request, event));
    return;
  }

  const isAsset = request.destination === 'image' || request.destination === 'font';
  if (isAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, event));
});
