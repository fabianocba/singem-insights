/**
 * Sync Manager - SINGEM
 * Gerencia sincronização entre IndexedDB (offline) e API (online)
 * Implementa fila de operações pendentes e detecção de conectividade
 */

import apiClient from '../services/apiClient.js';
import { emit } from './eventBus.js';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const SYNC_CONFIG = {
  // Intervalo de verificação de conectividade (ms)
  connectivityCheckInterval: 30000,
  // Intervalo de sincronização automática (ms)
  autoSyncInterval: 60000,
  // Chave para fila de operações pendentes
  pendingQueueKey: 'singem_pending_ops',
  // Modo de operação: 'online' | 'offline' | 'hybrid'
  mode: 'hybrid'
};

// Estado atual
let isOnline = navigator.onLine;
let syncInProgress = false;
let _lastSyncTime = null;
let pendingOperationsQueue = [];

// ============================================================================
// FILA DE OPERAÇÕES PENDENTES
// ============================================================================

/**
 * Obtém operações pendentes em memória
 */
function getPendingOperations() {
  return [...pendingOperationsQueue];
}

/**
 * Salva operações pendentes em memória
 */
function savePendingOperations(ops) {
  pendingOperationsQueue = Array.isArray(ops) ? [...ops] : [];
}

/**
 * Adiciona operação à fila de pendentes
 */
function queueOperation(tipo, entidade, id, dados) {
  const ops = getPendingOperations();

  const op = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tipo, // 'criar' | 'atualizar' | 'excluir'
    entidade, // 'empenhos' | 'notas_fiscais' | etc
    entityId: id,
    dados,
    criadoEm: new Date().toISOString(),
    tentativas: 0
  };

  // Remove operações anteriores para o mesmo registro (deduplicação)
  const filtered = ops.filter((o) => !(o.entidade === entidade && o.entityId === id && o.tipo === tipo));

  filtered.push(op);
  savePendingOperations(filtered);

  console.log(`[SyncManager] 📥 Operação enfileirada: ${tipo} ${entidade} #${id}`);
  emit('sync:queued', { op });

  return op;
}

/**
 * Remove operação da fila
 */
function dequeueOperation(opId) {
  const ops = getPendingOperations();
  const filtered = ops.filter((o) => o.id !== opId);
  savePendingOperations(filtered);
}

/**
 * Limpa toda a fila
 */
function clearPendingQueue() {
  pendingOperationsQueue = [];
}

// ============================================================================
// SINCRONIZAÇÃO
// ============================================================================

/**
 * Processa fila de operações pendentes
 */
async function processPendingQueue() {
  if (syncInProgress) {
    console.log('[SyncManager] ⏳ Sincronização já em andamento');
    return { processed: 0, failed: 0 };
  }

  if (!isOnline) {
    console.log('[SyncManager] 📴 Offline - sincronização adiada');
    return { processed: 0, failed: 0, offline: true };
  }

  const ops = getPendingOperations();
  if (ops.length === 0) {
    return { processed: 0, failed: 0 };
  }

  syncInProgress = true;
  emit('sync:start', { total: ops.length });
  console.log(`[SyncManager] 🔄 Processando ${ops.length} operações pendentes...`);

  let processed = 0;
  let failed = 0;

  // Agrupa por entidade para otimizar
  const empenhoOps = ops.filter((o) => o.entidade === 'empenhos');

  if (empenhoOps.length > 0) {
    try {
      // Usa endpoint de sync em lote
      const operacoesFormatadas = empenhoOps.map((op) => ({
        tipo: op.tipo,
        id: op.entityId,
        dados: op.dados
      }));

      const resultado = await apiClient.empenhos.sincronizar(operacoesFormatadas);

      // Remove operações bem-sucedidas da fila
      for (const r of resultado.resultados) {
        if (r.resultado.status !== 'erro') {
          const opOriginal = empenhoOps.find((o) => o.entityId === r.id || o.dados?.numero === r.dados?.numero);
          if (opOriginal) {
            dequeueOperation(opOriginal.id);
            processed++;
          }
        } else {
          failed++;
        }
      }
    } catch (err) {
      console.error('[SyncManager] ❌ Erro no sync de empenhos:', err);
      failed += empenhoOps.length;
    }
  }

  // Outras entidades (futuro)
  const otherOps = ops.filter((o) => o.entidade !== 'empenhos');
  for (const op of otherOps) {
    // Por enquanto, mantém na fila
    console.log(`[SyncManager] ⏭️ Entidade ${op.entidade} ainda não suportada`);
  }

  syncInProgress = false;
  _lastSyncTime = new Date().toISOString();

  emit('sync:complete', { processed, failed, remaining: getPendingOperations().length });
  console.log(`[SyncManager] ✅ Sync completo: ${processed} ok, ${failed} falhas`);

  return { processed, failed };
}

// ============================================================================
// DETECÇÃO DE CONECTIVIDADE
// ============================================================================

async function checkConnectivity() {
  try {
    const health = await apiClient.healthCheck();
    const wasOffline = !isOnline;
    isOnline = health.online;

    if (wasOffline && isOnline) {
      console.log('[SyncManager] 🌐 Conexão restaurada');
      emit('connectivity:online');
      // Tenta sincronizar automaticamente
      processPendingQueue().catch(console.error);
    } else if (!wasOffline && !isOnline) {
      console.log('[SyncManager] 📴 Conexão perdida');
      emit('connectivity:offline');
    }

    return isOnline;
  } catch {
    isOnline = false;
    return false;
  }
}

// ============================================================================
// STORAGE HÍBRIDO (ONLINE + OFFLINE)
// ============================================================================

const syncStorage = {
  empenhos: {
    /**
     * Lista empenhos - tenta API, fallback para IndexedDB
     */
    async listar(filtros = {}) {
      if (isOnline && SYNC_CONFIG.mode !== 'offline') {
        try {
          const result = await apiClient.empenhos.listar(filtros);
          // Atualiza cache local
          await this._updateLocalCache(result.dados);
          return { dados: result.dados, fonte: 'api' };
        } catch (err) {
          console.warn('[SyncStorage] API falhou, usando cache:', err.message);
        }
      }

      // Fallback para IndexedDB
      if (window.dbManager?.db) {
        const dados = await window.dbManager.buscarEmpenhos(true);
        return { dados, fonte: 'cache' };
      }

      return { dados: [], fonte: 'vazio' };
    },

    /**
     * Busca empenho por ID
     */
    async buscar(id) {
      if (isOnline && SYNC_CONFIG.mode !== 'offline') {
        try {
          const result = await apiClient.empenhos.buscar(id);
          return { dados: result.dados, fonte: 'api' };
        } catch {
          // Fallback
        }
      }

      if (window.dbManager?.db) {
        const dados = await window.dbManager.buscarEmpenhoPorId(id);
        return { dados, fonte: 'cache' };
      }

      return { dados: null, fonte: 'vazio' };
    },

    /**
     * Salva empenho - API + cache local
     */
    async salvar(dados) {
      // Sempre salva localmente primeiro (offline-first)
      let localId;
      if (window.dbManager?.db) {
        localId = await window.dbManager.salvarEmpenho(dados);
      }

      if (isOnline && SYNC_CONFIG.mode !== 'offline') {
        try {
          if (dados.id) {
            const result = await apiClient.empenhos.atualizar(dados.id, dados);
            return { dados: result.dados, fonte: 'api', localId };
          } else {
            const result = await apiClient.empenhos.criar(dados);
            // Atualiza ID local com ID do servidor
            if (window.dbManager?.db && localId) {
              await window.dbManager.atualizarEmpenho({ ...dados, id: localId, serverId: result.dados.id });
            }
            return { dados: result.dados, fonte: 'api', localId };
          }
        } catch (err) {
          console.warn('[SyncStorage] API falhou, enfileirando:', err.message);
          queueOperation(dados.id ? 'atualizar' : 'criar', 'empenhos', localId, dados);
          return { dados: { ...dados, id: localId }, fonte: 'cache', pendente: true };
        }
      } else {
        // Offline - enfileira para sync posterior
        queueOperation(dados.id ? 'atualizar' : 'criar', 'empenhos', localId, dados);
        return { dados: { ...dados, id: localId }, fonte: 'cache', pendente: true };
      }
    },

    /**
     * Exclui empenho
     */
    async excluir(id) {
      if (isOnline && SYNC_CONFIG.mode !== 'offline') {
        try {
          await apiClient.empenhos.excluir(id);
        } catch (err) {
          console.warn('[SyncStorage] API falhou ao excluir:', err.message);
          queueOperation('excluir', 'empenhos', id, null);
        }
      } else {
        queueOperation('excluir', 'empenhos', id, null);
      }

      // Sempre remove localmente
      if (window.dbManager?.db) {
        await window.dbManager.deletarEmpenho(id);
      }

      return { sucesso: true };
    },

    /**
     * Atualiza cache local com dados da API
     */
    async _updateLocalCache(empenhos) {
      if (!window.dbManager?.db || !Array.isArray(empenhos)) {
        return;
      }

      for (const emp of empenhos) {
        try {
          // Converte formato API para formato local
          const local = {
            ...emp,
            dataEmpenho: emp.data_empenho,
            cnpjFornecedor: emp.cnpj_fornecedor,
            valorTotal: emp.valor_total,
            naturezaDespesa: emp.natureza_despesa,
            processoSuap: emp.processo_suap,
            statusValidacao: emp.status_validacao,
            serverId: emp.id // Guarda ID do servidor
          };
          await window.dbManager.salvarEmpenho(local);
        } catch (err) {
          console.warn('[SyncStorage] Erro ao atualizar cache:', err.message);
        }
      }
    }
  }
};

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

let connectivityInterval = null;
let autoSyncInterval = null;

function startSyncManager() {
  console.log('[SyncManager] 🚀 Iniciando...');

  // Detecta mudanças de conectividade via browser
  window.addEventListener('online', () => {
    isOnline = true;
    emit('connectivity:online');
    processPendingQueue().catch(console.error);
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    emit('connectivity:offline');
  });

  // Verifica conectividade periodicamente
  connectivityInterval = setInterval(checkConnectivity, SYNC_CONFIG.connectivityCheckInterval);

  // Sync automático
  autoSyncInterval = setInterval(() => {
    if (isOnline && getPendingOperations().length > 0) {
      processPendingQueue().catch(console.error);
    }
  }, SYNC_CONFIG.autoSyncInterval);

  // Verifica conectividade inicial
  checkConnectivity().then((online) => {
    console.log(`[SyncManager] Status inicial: ${online ? '🌐 Online' : '📴 Offline'}`);
  });
}

function stopSyncManager() {
  if (connectivityInterval) {
    clearInterval(connectivityInterval);
  }
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default syncStorage;

export {
  syncStorage,
  startSyncManager,
  stopSyncManager,
  processPendingQueue,
  getPendingOperations,
  clearPendingQueue,
  checkConnectivity,
  queueOperation,
  SYNC_CONFIG
};
