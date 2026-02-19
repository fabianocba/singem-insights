/**
 * IFDESK Service Worker
 * Estratégia: Network First (Cache como fallback)
 *
 * Garante que o usuário sempre tenha a versão mais recente,
 * mas mantém funcionalidade offline quando necessário.
 */

const CACHE_VERSION = 'ifdesk-v1.6.2-20260210';
const CACHE_NAME = `${CACHE_VERSION}-cache`;

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Instalando versão', CACHE_VERSION);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(() => {
        console.log('📦 Service Worker: Cache aberto');
        // Não force o cache inicial - deixe ser preenchido sob demanda
        return Promise.resolve();
      })
      .then(() => {
        // Força a ativação imediata
        return self.skipWaiting();
      })
  );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Ativando versão', CACHE_VERSION);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
            return undefined;
          })
        );
      })
      .then(() => {
        // Assume controle de todas as páginas imediatamente
        return self.clients.claim();
      })
  );
});

// Fetch - Estratégia Network First
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de outros domínios (CDN, APIs externas, etc)
  if (url.origin !== location.origin) {
    return;
  }

  // Ignora requisições POST, PUT, DELETE (apenas GET)
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // SEMPRE tenta da rede primeiro
    fetch(request)
      .then((response) => {
        // Se conseguiu da rede, clona e salva no cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => {
              // Atualiza o cache com a versão mais recente
              cache.put(request, responseToCache);
            })
            .catch((err) => {
              console.warn('⚠️ Erro ao salvar no cache:', err);
            });
        }

        return response;
      })
      .catch(() => {
        // Se a rede falhar, tenta buscar do cache
        console.log('🔌 Rede falhou, buscando do cache:', request.url);

        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('✅ Servindo do cache:', request.url);
            return cachedResponse;
          }

          // Se não tem no cache, retorna erro genérico
          console.error('❌ Não encontrado nem na rede nem no cache:', request.url);
          return new Response('Offline e sem cache disponível', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Service Worker: Pulando espera e ativando imediatamente');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('🗑️ Service Worker: Limpando todo o cache');
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        })
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
    );
  }
});

console.log('🚀 Service Worker carregado - versão', CACHE_VERSION);
