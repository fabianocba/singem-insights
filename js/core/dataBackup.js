/**
 * @fileoverview Sistema de Backup e Restauração de Dados
 * Mantém histórico de alterações e permite recuperação
 */

class DataBackupManager {
  constructor() {
    this.DB_NAME = 'IFDeskDB';
    this.BACKUP_STORE = 'backups';
    this.CHANGELOG_STORE = 'changelog';
    this.VERSION = 3; // Incrementar quando houver mudanças estruturais
  }

  /**
   * Inicializa o sistema de backup
   */
  async init() {
    console.log('[BACKUP] 🔄 Inicializando sistema de backup...');

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onerror = () => {
        console.error('[BACKUP] ❌ Erro ao abrir banco:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('[BACKUP] ✅ Sistema de backup inicializado');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Cria store de backups se não existir
        if (!db.objectStoreNames.contains(this.BACKUP_STORE)) {
          const backupStore = db.createObjectStore(this.BACKUP_STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
          backupStore.createIndex('timestamp', 'timestamp', { unique: false });
          backupStore.createIndex('type', 'type', { unique: false });
          console.log('[BACKUP] ✅ Store de backups criado');
        }

        // Cria store de changelog se não existir
        if (!db.objectStoreNames.contains(this.CHANGELOG_STORE)) {
          const changelogStore = db.createObjectStore(this.CHANGELOG_STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
          changelogStore.createIndex('timestamp', 'timestamp', { unique: false });
          changelogStore.createIndex('action', 'action', { unique: false });
          console.log('[BACKUP] ✅ Store de changelog criado');
        }
      };
    });
  }

  /**
   * Cria backup automático dos dados críticos
   */
  async createAutoBackup(reason = 'auto') {
    try {
      console.log('[BACKUP] 💾 Criando backup automático...');

      const db = await this.init();

      // Lê dados atuais
      const usuarios = await this._getData(db, 'config', 'usuarios');
      const unidades = await this._getData(db, 'config', 'todasUnidades');
      const unidadeOrca = await this._getData(db, 'config', 'unidadeOrcamentaria');

      // Cria backup
      const backup = {
        timestamp: new Date().toISOString(),
        type: reason,
        version: this.VERSION,
        data: {
          usuarios: usuarios,
          unidades: unidades,
          unidadeOrcamentaria: unidadeOrca
        },
        userAgent: navigator.userAgent,
        appVersion: window.APP_VERSION || 'unknown'
      };

      // Salva backup
      await this._saveBackup(db, backup);

      console.log('[BACKUP] ✅ Backup criado com sucesso:', backup.timestamp);

      // Mantém apenas últimos 10 backups
      await this._cleanOldBackups(db, 10);

      return backup;
    } catch (error) {
      console.error('[BACKUP] ❌ Erro ao criar backup:', error);
      throw error;
    }
  }

  /**
   * Registra mudança no changelog
   */
  async logChange(action, details) {
    try {
      const db = await this.init();

      const change = {
        timestamp: new Date().toISOString(),
        action: action,
        details: details,
        userAgent: navigator.userAgent
      };

      const tx = db.transaction([this.CHANGELOG_STORE], 'readwrite');
      const store = tx.objectStore(this.CHANGELOG_STORE);

      await new Promise((resolve, reject) => {
        const request = store.add(change);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      console.log('[BACKUP] 📝 Mudança registrada:', action);
    } catch (error) {
      console.error('[BACKUP] ❌ Erro ao registrar mudança:', error);
    }
  }

  /**
   * Lista backups disponíveis
   */
  async listBackups() {
    try {
      const db = await this.init();
      const tx = db.transaction([this.BACKUP_STORE], 'readonly');
      const store = tx.objectStore(this.BACKUP_STORE);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const backups = request.result.map((b) => ({
            id: b.id,
            timestamp: b.timestamp,
            type: b.type,
            version: b.version,
            size: JSON.stringify(b.data).length,
            usuarios: b.data.usuarios?.usuarios?.length || 0,
            unidades: b.data.unidades?.unidades?.length || 0
          }));
          resolve(backups);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[BACKUP] ❌ Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Restaura backup específico
   */
  async restoreBackup(backupId) {
    try {
      console.log('[BACKUP] 🔄 Restaurando backup ID:', backupId);

      const db = await this.init();

      // Busca backup
      const backup = await this._getBackup(db, backupId);

      if (!backup) {
        throw new Error('Backup não encontrado');
      }

      // Cria backup de segurança antes de restaurar
      await this.createAutoBackup('pre-restore');

      // Restaura dados
      if (backup.data.usuarios) {
        await this._restoreData(db, 'config', 'usuarios', backup.data.usuarios);
      }

      if (backup.data.unidades) {
        await this._restoreData(db, 'config', 'todasUnidades', backup.data.unidades);
      }

      if (backup.data.unidadeOrcamentaria) {
        await this._restoreData(db, 'config', 'unidadeOrcamentaria', backup.data.unidadeOrcamentaria);
      }

      await this.logChange('restore', {
        backupId: backupId,
        timestamp: backup.timestamp
      });

      console.log('[BACKUP] ✅ Backup restaurado com sucesso');

      return true;
    } catch (error) {
      console.error('[BACKUP] ❌ Erro ao restaurar backup:', error);
      throw error;
    }
  }

  /**
   * Exporta backup para arquivo JSON
   */
  async exportBackup(backupId) {
    try {
      const db = await this.init();
      const backup = await this._getBackup(db, backupId);

      if (!backup) {
        throw new Error('Backup não encontrado');
      }

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `ifdesk-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);

      console.log('[BACKUP] ✅ Backup exportado');
    } catch (error) {
      console.error('[BACKUP] ❌ Erro ao exportar backup:', error);
      throw error;
    }
  }

  /**
   * Importa backup de arquivo JSON
   */
  async importBackup(file) {
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      // Valida estrutura
      if (!backup.data || !backup.timestamp) {
        throw new Error('Formato de backup inválido');
      }

      const db = await this.init();

      // Salva como novo backup
      await this._saveBackup(db, {
        ...backup,
        type: 'imported',
        timestamp: new Date().toISOString()
      });

      console.log('[BACKUP] ✅ Backup importado');

      return true;
    } catch (error) {
      console.error('[BACKUP] ❌ Erro ao importar backup:', error);
      throw error;
    }
  }

  /**
   * Obtém changelog completo
   */
  async getChangelog(limit = 50) {
    try {
      const db = await this.init();
      const tx = db.transaction([this.CHANGELOG_STORE], 'readonly');
      const store = tx.objectStore(this.CHANGELOG_STORE);
      const index = store.index('timestamp');

      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev');
        const changes = [];

        request.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor && changes.length < limit) {
            changes.push(cursor.value);
            cursor.continue();
          } else {
            resolve(changes);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[BACKUP] ❌ Erro ao obter changelog:', error);
      return [];
    }
  }

  // ========================================
  // MÉTODOS PRIVADOS
  // ========================================

  async _getData(db, storeName, key) {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _saveBackup(db, backup) {
    const tx = db.transaction([this.BACKUP_STORE], 'readwrite');
    const store = tx.objectStore(this.BACKUP_STORE);

    return new Promise((resolve, reject) => {
      const request = store.add(backup);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _getBackup(db, id) {
    const tx = db.transaction([this.BACKUP_STORE], 'readonly');
    const store = tx.objectStore(this.BACKUP_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _restoreData(db, storeName, key, data) {
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _cleanOldBackups(db, keep = 10) {
    try {
      const tx = db.transaction([this.BACKUP_STORE], 'readwrite');
      const store = tx.objectStore(this.BACKUP_STORE);
      const index = store.index('timestamp');

      const allBackups = await new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Ordena por timestamp decrescente
      allBackups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Remove backups antigos
      const toDelete = allBackups.slice(keep);

      for (const backup of toDelete) {
        await new Promise((resolve, reject) => {
          const request = store.delete(backup.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      if (toDelete.length > 0) {
        console.log(`[BACKUP] 🗑️ ${toDelete.length} backup(s) antigo(s) removido(s)`);
      }
    } catch (error) {
      console.error('[BACKUP] ❌ Erro ao limpar backups antigos:', error);
    }
  }
}

// Instância global
window.dataBackupManager = new DataBackupManager();

// Auto-backup a cada mudança crítica
window.addEventListener('load', async () => {
  try {
    await window.dataBackupManager.init();

    // Cria backup inicial
    await window.dataBackupManager.createAutoBackup('app-load');

    console.log('[BACKUP] ✅ Sistema de backup ativo');
  } catch (error) {
    console.error('[BACKUP] ❌ Erro ao inicializar backup:', error);
  }
});
