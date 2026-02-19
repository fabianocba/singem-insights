/**
 * Async Queue - Fila de tarefas assíncronas persistente em IndexedDB
 * Processa tarefas sequencialmente e retoma após reload
 */

import { emit } from './eventBus.js';

const DB_NAME = 'IFDESK_DB';
const STORE_NAME = 'async_queue';
const DB_VERSION = 1;

let dbInstance = null;
let isProcessing = false;

/**
 * Status possíveis para uma tarefa
 */
export const TaskStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Abre conexão com IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
async function openDB() {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });

        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tipo', 'tipo', { unique: false });
      }
    };
  });
}

/**
 * Adiciona tarefa à fila
 * @param {string} tipo - Tipo da tarefa (ex: 'pdf.parse', 'relatorio.gerar')
 * @param {Object} payload - Dados da tarefa
 * @returns {Promise<number>} ID da tarefa adicionada
 */
export async function add(tipo, payload) {
  const db = await openDB();

  const task = {
    tipo,
    payload,
    status: TaskStatus.PENDING,
    timestamp: Date.now(),
    attempts: 0,
    error: null
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(task);

    request.onsuccess = () => {
      const taskId = request.result;
      console.log(`[AsyncQueue] Tarefa ${taskId} adicionada à fila (tipo: ${tipo})`);
      emit('queue.task:added', { id: taskId, tipo });
      resolve(taskId);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Busca próxima tarefa pendente
 * @returns {Promise<Object|null>}
 */
async function getNextTask() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.openCursor(IDBKeyRange.only(TaskStatus.PENDING));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        resolve(cursor.value);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Atualiza status de uma tarefa
 * @param {number} id - ID da tarefa
 * @param {string} status - Novo status
 * @param {Object} updates - Campos adicionais para atualizar
 */
async function updateTask(id, status, updates = {}) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const task = getRequest.result;
      if (!task) {
        reject(new Error(`Tarefa ${id} não encontrada`));
        return;
      }

      const updatedTask = {
        ...task,
        status,
        ...updates,
        updatedAt: Date.now()
      };

      const putRequest = store.put(updatedTask);
      putRequest.onsuccess = () => resolve(updatedTask);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Executa uma tarefa específica
 * @param {Object} task - Tarefa a executar
 */
async function executeTask(task) {
  console.log(`[AsyncQueue] Executando tarefa ${task.id} (tipo: ${task.tipo})`);

  emit('queue.task:start', {
    id: task.id,
    tipo: task.tipo
  });

  try {
    // Atualizar status para processando
    await updateTask(task.id, TaskStatus.PROCESSING, {
      attempts: task.attempts + 1
    });

    // Processar conforme tipo
    let result;

    switch (task.tipo) {
      case 'pdf.parse':
        result = await processPDFTask(task.payload);
        break;

      case 'relatorio.gerar':
        result = await processRelatorioTask(task.payload);
        break;

      default:
        throw new Error(`Tipo de tarefa desconhecido: ${task.tipo}`);
    }

    // Marcar como completa
    await updateTask(task.id, TaskStatus.COMPLETED, {
      result,
      completedAt: Date.now()
    });

    console.log(`[AsyncQueue] Tarefa ${task.id} concluída com sucesso`);

    emit('queue.task:done', {
      id: task.id,
      tipo: task.tipo,
      result
    });

    return result;
  } catch (error) {
    console.error(`[AsyncQueue] Erro ao executar tarefa ${task.id}:`, error);

    // Marcar como falha
    await updateTask(task.id, TaskStatus.FAILED, {
      error: error.message,
      failedAt: Date.now()
    });

    emit('queue.task:error', {
      id: task.id,
      tipo: task.tipo,
      error: error.message
    });

    throw error;
  }
}

/**
 * Processa tarefa de parse de PDF
 * @param {Object} payload - Dados da tarefa
 */
async function processPDFTask(payload) {
  const { pdfBuffer, filename } = payload;

  return new Promise((resolve, reject) => {
    const worker = new Worker('./js/workers/pdfWorker.js');
    const taskId = Date.now();

    worker.onmessage = (event) => {
      const { id, type, payload: result } = event.data;

      if (type === 'SUCCESS' && id === taskId) {
        worker.terminate();
        resolve(result);
      } else if (type === 'ERROR' && id === taskId) {
        worker.terminate();
        reject(new Error(result.message));
      }
      // Ignorar mensagens de progresso (já tratadas via eventBus)
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    // Enviar tarefa para worker
    worker.postMessage({
      id: taskId,
      type: 'PARSE_PDF',
      payload: { pdfBuffer, filename }
    });
  });
}

/**
 * Processa tarefa de geração de relatório
 * @param {Object} payload - Dados da tarefa
 */
async function processRelatorioTask(payload) {
  // Implementar lógica de geração de relatório
  // Por enquanto, apenas simula processamento
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { success: true, payload };
}

/**
 * Processa todas as tarefas pendentes
 */
export async function run() {
  if (isProcessing) {
    console.log('[AsyncQueue] Já existe processamento em andamento');
    return;
  }

  isProcessing = true;
  console.log('[AsyncQueue] Iniciando processamento da fila');

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const task = await getNextTask();

      if (!task) {
        console.log('[AsyncQueue] Nenhuma tarefa pendente');
        break;
      }

      await executeTask(task);
    }
  } catch (error) {
    console.error('[AsyncQueue] Erro ao processar fila:', error);
  } finally {
    isProcessing = false;
    console.log('[AsyncQueue] Processamento finalizado');
  }
}

/**
 * Lista todas as tarefas (útil para debug)
 * @param {string} status - Filtrar por status (opcional)
 * @returns {Promise<Array>}
 */
export async function list(status = null) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    let request;
    if (status) {
      const index = store.index('status');
      request = index.getAll(status);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Limpa tarefas completadas ou falhas antigas
 * @param {number} daysOld - Remover tarefas com mais de N dias
 */
export async function cleanup(daysOld = 7) {
  const db = await openDB();
  const cutoffDate = Date.now() - daysOld * 24 * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));

    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const task = cursor.value;

        if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) {
          cursor.delete();
          deletedCount++;
        }

        cursor.continue();
      } else {
        console.log(`[AsyncQueue] ${deletedCount} tarefas antigas removidas`);
        resolve(deletedCount);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

console.log('[AsyncQueue] Sistema de fila assíncrona inicializado');
