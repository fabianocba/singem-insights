/**
 * SINGEM - Self-Test Script
 * Testes automatizados no navegador para IndexedDB, Cache, Storage e Performance
 */

// Resultados globais
const TEST_RESULTS = {
  metadata: {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  },
  summary: {
    total: 0,
    success: 0,
    warning: 0,
    error: 0
  },
  tests: {
    indexeddb: { status: 'pending', data: null },
    cache: { status: 'pending', data: null },
    storage: { status: 'pending', data: null },
    performance: { status: 'pending', data: null }
  }
};

// ========================================
// Utilitários
// ========================================
function toggleTest(testName) {
  const section = document.querySelector(`[data-test="${testName}"]`);
  const body = section.querySelector('.test-body');
  body.classList.toggle('active');
}

function updateStatus(testName, status, data) {
  TEST_RESULTS.tests[testName] = { status, data };

  const section = document.querySelector(`[data-test="${testName}"]`);
  const statusEl = section.querySelector('.status');
  const resultEl = document.getElementById(`result-${testName}`);

  statusEl.className = `status ${status}`;
  statusEl.textContent = {
    success: '✅ Sucesso',
    warning: '⚠️  Aviso',
    error: '❌ Erro',
    pending: '⏳ Pendente'
  }[status];

  resultEl.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;

  // Atualiza resumo
  updateSummary();
}

function updateSummary() {
  const statuses = Object.values(TEST_RESULTS.tests).map((t) => t.status);

  TEST_RESULTS.summary.total = statuses.length;
  TEST_RESULTS.summary.success = statuses.filter((s) => s === 'success').length;
  TEST_RESULTS.summary.warning = statuses.filter((s) => s === 'warning').length;
  TEST_RESULTS.summary.error = statuses.filter((s) => s === 'error').length;

  document.getElementById('summary-total').textContent = TEST_RESULTS.summary.total;
  document.getElementById('summary-success').textContent = TEST_RESULTS.summary.success;
  document.getElementById('summary-warning').textContent = TEST_RESULTS.summary.warning;
  document.getElementById('summary-error').textContent = TEST_RESULTS.summary.error;
}

// ========================================
// Test: IndexedDB
// ========================================
async function testIndexedDB() {
  console.log('🔍 Testando IndexedDB...');

  try {
    const result = {
      supported: !!window.indexedDB,
      databases: [],
      mainDatabase: null
    };

    if (!result.supported) {
      updateStatus('indexeddb', 'error', {
        message: 'IndexedDB não suportado neste navegador'
      });
      return;
    }

    // Lista todos os bancos
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      result.databases = dbs.map((db) => ({
        name: db.name,
        version: db.version
      }));
    } else {
      result.databases = [{ name: 'ControleMaterialDB', version: 'Verificação manual necessária' }];
    }

    // Tenta abrir banco principal
    const mainDBName = 'ControleMaterialDB';
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(mainDBName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Banco bloqueado'));
      });

      result.mainDatabase = {
        name: db.name,
        version: db.version,
        stores: Array.from(db.objectStoreNames)
      };

      // Conta itens em cada store
      const storeCounts = {};
      for (const storeName of db.objectStoreNames) {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const countRequest = store.count();

          const count = await new Promise((resolve, reject) => {
            countRequest.onsuccess = () => resolve(countRequest.result);
            countRequest.onerror = () => reject(countRequest.error);
          });

          storeCounts[storeName] = count;
        } catch (err) {
          storeCounts[storeName] = `Erro: ${err.message}`;
        }
      }

      result.mainDatabase.storeCounts = storeCounts;
      db.close();

      updateStatus('indexeddb', 'success', result);
    } catch (err) {
      result.mainDatabase = {
        error: err.message,
        recommendation: 'Banco principal não pôde ser aberto. Verifique se o app foi inicializado.'
      };

      updateStatus('indexeddb', 'warning', result);
    }
  } catch (err) {
    updateStatus('indexeddb', 'error', {
      message: err.message,
      stack: err.stack
    });
  }
}

// ========================================
// Test: Service Worker & Cache
// ========================================
async function testCache() {
  console.log('🔍 Testando Service Worker & Cache...');

  try {
    const result = {
      serviceWorker: {
        supported: 'serviceWorker' in navigator,
        registered: false,
        controller: null,
        registrations: []
      },
      caches: {
        supported: 'caches' in window,
        list: [],
        totalSize: 0
      }
    };

    // Service Worker
    if (result.serviceWorker.supported) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      result.serviceWorker.registered = registrations.length > 0;
      result.serviceWorker.registrations = registrations.map((reg) => ({
        scope: reg.scope,
        active: reg.active?.state,
        waiting: reg.waiting?.state,
        installing: reg.installing?.state
      }));

      if (navigator.serviceWorker.controller) {
        result.serviceWorker.controller = {
          scriptURL: navigator.serviceWorker.controller.scriptURL,
          state: navigator.serviceWorker.controller.state
        };
      }
    }

    // Caches
    if (result.caches.supported) {
      const cacheNames = await caches.keys();
      result.caches.list = cacheNames;

      // Tenta estimar tamanho (aproximado)
      for (const cacheName of cacheNames) {
        try {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          result.caches.totalSize += keys.length * 50; // Estimativa: 50 KB por asset
        } catch (err) {
          // Ignora erros
        }
      }
    }

    // Determina status
    let status = 'success';
    if (!result.serviceWorker.registered && result.caches.list.length === 0) {
      status = 'warning';
      result.recommendation = 'Service Worker não registrado. Cache offline não disponível.';
    }

    updateStatus('cache', status, result);
  } catch (err) {
    updateStatus('cache', 'error', {
      message: err.message,
      stack: err.stack
    });
  }
}

// ========================================
// Test: Storage
// ========================================
async function testStorage() {
  console.log('🔍 Testando Storage...');

  try {
    const result = {
      localStorage: {
        supported: !!window.localStorage,
        size: 0,
        itemCount: 0,
        keys: []
      },
      sessionStorage: {
        supported: !!window.sessionStorage,
        size: 0,
        itemCount: 0,
        keys: []
      },
      quota: null
    };

    // localStorage
    if (result.localStorage.supported) {
      result.localStorage.itemCount = localStorage.length;
      result.localStorage.keys = Object.keys(localStorage);

      // Estima tamanho
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        result.localStorage.size += key.length + (value?.length || 0);
      }
    }

    // sessionStorage
    if (result.sessionStorage.supported) {
      result.sessionStorage.itemCount = sessionStorage.length;
      result.sessionStorage.keys = Object.keys(sessionStorage);

      // Estima tamanho
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        result.sessionStorage.size += key.length + (value?.length || 0);
      }
    }

    // Quota API (se disponível)
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      result.quota = {
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2) + '%',
        usageFormatted: formatBytes(estimate.usage),
        quotaFormatted: formatBytes(estimate.quota)
      };
    }

    updateStatus('storage', 'success', result);
  } catch (err) {
    updateStatus('storage', 'error', {
      message: err.message,
      stack: err.stack
    });
  }
}

// ========================================
// Test: Performance
// ========================================
async function testPerformance() {
  console.log('🔍 Testando Performance...');

  try {
    const result = {
      timing: null,
      navigation: null,
      memory: null,
      paint: null
    };

    // Performance Timing
    if (performance.timing) {
      const t = performance.timing;
      result.timing = {
        loadTime: t.loadEventEnd - t.navigationStart,
        domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
        domInteractive: t.domInteractive - t.navigationStart,
        dns: t.domainLookupEnd - t.domainLookupStart,
        tcp: t.connectEnd - t.connectStart,
        ttfb: t.responseStart - t.navigationStart
      };
    }

    // Navigation
    if (performance.navigation) {
      result.navigation = {
        type: performance.navigation.type,
        redirectCount: performance.navigation.redirectCount
      };
    }

    // Memory (Chrome only)
    if (performance.memory) {
      result.memory = {
        usedJSHeapSize: formatBytes(performance.memory.usedJSHeapSize),
        totalJSHeapSize: formatBytes(performance.memory.totalJSHeapSize),
        jsHeapSizeLimit: formatBytes(performance.memory.jsHeapSizeLimit)
      };
    }

    // Paint Timing
    const paintEntries = performance.getEntriesByType('paint');
    if (paintEntries.length > 0) {
      result.paint = {};
      paintEntries.forEach((entry) => {
        result.paint[entry.name] = `${entry.startTime.toFixed(2)} ms`;
      });
    }

    // Determina status
    let status = 'success';
    if (result.timing && result.timing.loadTime > 3000) {
      status = 'warning';
      result.recommendation = 'Tempo de carregamento acima de 3s. Considere otimizações.';
    }

    updateStatus('performance', status, result);
  } catch (err) {
    updateStatus('performance', 'error', {
      message: err.message,
      stack: err.stack
    });
  }
}

// ========================================
// Helpers
// ========================================
function formatBytes(bytes) {
  if (!bytes || bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ========================================
// Ações
// ========================================
async function runAllTests() {
  console.log('🚀 Executando todos os testes...');

  await testIndexedDB();
  await testCache();
  await testStorage();
  await testPerformance();

  console.log('✅ Testes concluídos!');
  alert('✅ Todos os testes foram executados! Veja os resultados acima.');
}

function exportResults() {
  const json = JSON.stringify(TEST_RESULTS, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `selftest-report-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);

  alert('✅ Relatório exportado com sucesso!');
}

// ========================================
// Auto-executar ao carregar
// ========================================
window.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 SINGEM Self-Test carregado');
  console.log('💡 Execute runAllTests() ou clique no botão para iniciar');
});

// Expõe funções globalmente para uso no HTML (onclick handlers)
window.toggleTest = toggleTest;
window.runAllTests = runAllTests;
window.exportResults = exportResults;
