/**
 * Storage Audit - Auditoria completa de armazenamento
 * Detecta onde os dados estão sendo armazenados no sistema
 *
 * @module storageAudit
 */

// ============================================================================
// CONSTANTES - Chaves conhecidas do sistema
// ============================================================================
const KNOWN_KEYS = {
  localStorage: [
    'session',
    'SINGEM_app_version',
    'SINGEM_logs',
    'tempAuditLogs',
    'SINGEM_auth_flags',
    'SINGEM_auth_login',
    'SINGEM_auth_pass',
    'SINGEM_ultimo_boot'
  ],
  indexedDB: {
    databases: ['ControleMaterialDB', 'SINGEM_Backup'],
    stores: {
      ControleMaterialDB: [
        'empenhos',
        'entregas',
        'notasFiscais',
        'configuracoes',
        'config',
        'arquivos',
        'saldosEmpenhos',
        'auditLogs'
      ],
      SINGEM_Backup: ['backups', 'changelog']
    }
  }
};

// ============================================================================
// DETECÇÃO DE ARMAZENAMENTO
// ============================================================================

/**
 * Detecta todos os tipos de armazenamento utilizados pelo sistema
 * @returns {Promise<Object>} Relatório completo de armazenamento
 */
export async function detectStorageUsage() {
  const report = {
    timestamp: new Date().toISOString(),
    localStorage: await detectLocalStorage(),
    sessionStorage: detectSessionStorage(),
    indexedDB: await detectIndexedDB(),
    cacheAPI: await detectCacheAPI(),
    fileSystem: detectFileSystemAPI(),
    summary: {}
  };

  // Gerar resumo
  report.summary = {
    usesLocalStorage: report.localStorage.itemCount > 0,
    usesSessionStorage: report.sessionStorage.itemCount > 0,
    usesIndexedDB: report.indexedDB.available && report.indexedDB.databases.length > 0,
    usesCacheAPI: report.cacheAPI.available && report.cacheAPI.caches.length > 0,
    usesFileSystem: report.fileSystem.available,
    totalLocalStorageSize: report.localStorage.totalSize,
    totalIndexedDBRecords: report.indexedDB.totalRecords
  };

  return report;
}

/**
 * Detecta uso do localStorage
 */
async function detectLocalStorage() {
  const result = {
    available: false,
    itemCount: 0,
    keys: [],
    knownKeys: [],
    unknownKeys: [],
    totalSize: 0,
    items: {}
  };

  try {
    // Testar disponibilidade
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    result.available = true;

    result.itemCount = localStorage.length;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = key.length + (value?.length || 0);

      result.keys.push(key);
      result.totalSize += size;

      // Classificar como conhecido ou desconhecido
      if (KNOWN_KEYS.localStorage.includes(key) || key.startsWith('SINGEM_')) {
        result.knownKeys.push(key);
      } else {
        result.unknownKeys.push(key);
      }

      // Armazenar metadados (não valor completo para segurança)
      result.items[key] = {
        size,
        type: detectValueType(value),
        preview: value?.substring(0, 50) + (value?.length > 50 ? '...' : '')
      };
    }
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

/**
 * Detecta uso do sessionStorage
 */
function detectSessionStorage() {
  const result = {
    available: false,
    itemCount: 0,
    keys: [],
    totalSize: 0
  };

  try {
    sessionStorage.setItem('__test__', '1');
    sessionStorage.removeItem('__test__');
    result.available = true;

    result.itemCount = sessionStorage.length;

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      result.keys.push(key);
      result.totalSize += key.length + (value?.length || 0);
    }
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

/**
 * Detecta uso do IndexedDB
 */
async function detectIndexedDB() {
  const result = {
    available: false,
    databases: [],
    stores: {},
    totalRecords: 0,
    details: {}
  };

  try {
    if (!window.indexedDB) {
      result.error = 'IndexedDB não suportado';
      return result;
    }

    result.available = true;

    // Verificar banco principal (ControleMaterialDB)
    if (window.dbManager?.db) {
      const db = window.dbManager.db;
      const dbName = db.name;
      const storeNames = Array.from(db.objectStoreNames);

      result.databases.push(dbName);
      result.stores[dbName] = storeNames;
      result.details[dbName] = {
        version: db.version,
        stores: {}
      };

      // Contar registros em cada store
      for (const storeName of storeNames) {
        try {
          const count = await countRecordsInStore(db, storeName);
          result.details[dbName].stores[storeName] = { count };
          result.totalRecords += count;
        } catch (e) {
          result.details[dbName].stores[storeName] = { error: e.message };
        }
      }
    }

    // Verificar banco de backup (SINGEM_Backup)
    try {
      const backupDB = await openDatabase('SINGEM_Backup', 1);
      if (backupDB) {
        const storeNames = Array.from(backupDB.objectStoreNames);
        result.databases.push('SINGEM_Backup');
        result.stores['SINGEM_Backup'] = storeNames;
        result.details['SINGEM_Backup'] = {
          version: backupDB.version,
          stores: {}
        };

        for (const storeName of storeNames) {
          try {
            const count = await countRecordsInStore(backupDB, storeName);
            result.details['SINGEM_Backup'].stores[storeName] = { count };
          } catch (e) {
            result.details['SINGEM_Backup'].stores[storeName] = { error: e.message };
          }
        }
        backupDB.close();
      }
    } catch (e) {
      // Banco de backup pode não existir ainda
    }
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

/**
 * Detecta uso da Cache API (Service Worker)
 */
async function detectCacheAPI() {
  const result = {
    available: false,
    caches: [],
    totalSize: 0
  };

  try {
    if ('caches' in window) {
      result.available = true;
      const cacheNames = await caches.keys();
      result.caches = cacheNames;

      for (const cacheName of cacheNames) {
        try {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          result[cacheName] = { entries: keys.length };
        } catch (e) {
          result[cacheName] = { error: e.message };
        }
      }
    }
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

/**
 * Detecta uso do File System Access API
 */
function detectFileSystemAPI() {
  return {
    available: 'showDirectoryPicker' in window,
    note: 'Requer interação do usuário para acesso'
  };
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Abre um banco IndexedDB
 */
function openDatabase(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      // Não criar nada, só verificar existência
    };
  });
}

/**
 * Conta registros em uma store
 */
function countRecordsInStore(db, storeName) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Detecta o tipo de valor armazenado
 */
function detectValueType(value) {
  if (!value) {
    return 'empty';
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return 'array';
    }
    if (typeof parsed === 'object') {
      return 'object';
    }
    return typeof parsed;
  } catch {
    return 'string';
  }
}

// ============================================================================
// RELATÓRIO NO CONSOLE
// ============================================================================

/**
 * Imprime relatório completo de armazenamento no console
 */
export async function printStorageReport() {
  console.group('🗄️ SINGEM - Relatório de Armazenamento');
  console.log('═'.repeat(60));

  try {
    const report = await detectStorageUsage();

    // Resumo
    console.group('📊 RESUMO');
    console.table({
      LocalStorage: {
        Usado: report.summary.usesLocalStorage ? '✅ Sim' : '❌ Não',
        Chaves: report.localStorage.itemCount,
        Tamanho: formatBytes(report.localStorage.totalSize)
      },
      SessionStorage: {
        Usado: report.summary.usesSessionStorage ? '✅ Sim' : '❌ Não',
        Chaves: report.sessionStorage.itemCount,
        Tamanho: formatBytes(report.sessionStorage.totalSize)
      },
      IndexedDB: {
        Usado: report.summary.usesIndexedDB ? '✅ Sim' : '❌ Não',
        Bancos: report.indexedDB.databases.length,
        Registros: report.indexedDB.totalRecords
      },
      'Cache API': {
        Usado: report.summary.usesCacheAPI ? '✅ Sim' : '❌ Não',
        Caches: report.cacheAPI.caches?.length || 0
      },
      'File System': {
        Disponível: report.summary.usesFileSystem ? '✅ Sim' : '❌ Não'
      }
    });
    console.groupEnd();

    // localStorage detalhado
    if (report.localStorage.itemCount > 0) {
      console.group('💾 LocalStorage');
      console.log('Chaves conhecidas:', report.localStorage.knownKeys);
      console.log('Chaves desconhecidas:', report.localStorage.unknownKeys);
      console.table(report.localStorage.items);
      console.groupEnd();
    }

    // IndexedDB detalhado
    if (report.indexedDB.databases.length > 0) {
      console.group('🗃️ IndexedDB');
      for (const dbName of report.indexedDB.databases) {
        console.group(`📁 ${dbName}`);
        const details = report.indexedDB.details[dbName];
        console.log(`Versão: ${details?.version}`);
        if (details?.stores) {
          console.table(details.stores);
        }
        console.groupEnd();
      }
      console.groupEnd();
    }

    // Cache API
    if (report.cacheAPI.caches?.length > 0) {
      console.group('📦 Cache API');
      console.log('Caches:', report.cacheAPI.caches);
      console.groupEnd();
    }

    console.log('═'.repeat(60));
    console.log('⏰ Relatório gerado em:', report.timestamp);

    return report;
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
}

/**
 * Formata bytes para exibição legível
 */
function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// ESTATÍSTICAS DO SISTEMA
// ============================================================================

/**
 * Obtém estatísticas dos dados do sistema
 * @returns {Promise<Object>}
 */
export async function getSystemStats() {
  const stats = {
    empenhos: 0,
    itensEmpenhos: 0,
    notasFiscais: 0,
    itensNFs: 0,
    usuarios: 0,
    unidades: 0,
    arquivos: 0,
    auditLogs: 0
  };

  try {
    if (!window.dbManager?.db) {
      return { error: 'Banco de dados não inicializado', ...stats };
    }

    const db = window.dbManager.db;

    // Empenhos
    const empenhos = await getAllRecords(db, 'empenhos');
    stats.empenhos = empenhos.length;
    stats.itensEmpenhos = empenhos.reduce((acc, e) => acc + (e.itens?.length || 0), 0);

    // Notas Fiscais
    const nfs = await getAllRecords(db, 'notasFiscais');
    stats.notasFiscais = nfs.length;
    stats.itensNFs = nfs.reduce((acc, nf) => acc + (nf.itens?.length || 0), 0);

    // Arquivos
    const arquivos = await getAllRecords(db, 'arquivos');
    stats.arquivos = arquivos.length;

    // Audit Logs
    try {
      const logs = await getAllRecords(db, 'auditLogs');
      stats.auditLogs = logs.length;
    } catch {
      // Store pode não existir
    }

    // Config (usuários e unidades)
    try {
      const config = await getConfigRecord(db, 'usuarios');
      stats.usuarios = config?.usuarios?.length || 0;
    } catch {
      // Config pode não existir
    }

    try {
      const unidades = await getConfigRecord(db, 'todasUnidades');
      stats.unidades = unidades?.unidades?.length || 0;
    } catch {
      // Config pode não existir
    }
  } catch (error) {
    stats.error = error.message;
  }

  return stats;
}

/**
 * Obtém todos os registros de uma store
 */
function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Obtém um registro da store config
 */
function getConfigRecord(db, key) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['config'], 'readonly');
      const store = tx.objectStore('config');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      resolve(null);
    }
  });
}

// ============================================================================
// EXPORTAR PARA WINDOW (para debug no console)
// ============================================================================
if (typeof window !== 'undefined') {
  window.storageAudit = {
    detectStorageUsage,
    printStorageReport,
    getSystemStats
  };
}

export default {
  detectStorageUsage,
  printStorageReport,
  getSystemStats
};
