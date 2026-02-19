/**
 * Gerenciador de Lixeira
 * Funções auxiliares para soft-delete e restauração de arquivos
 */

class TrashManager {
  constructor(fsManager) {
    this.fsManager = fsManager;
  }

  /**
   * Move arquivo para lixeira (soft delete)
   */
  async moveToTrash(type, year, fileName) {
    if (!this.fsManager.mainDirectoryHandle) {
      throw new Error('Pasta raiz não selecionada');
    }

    try {
      // Obtém handle da pasta origem
      const sourceFolder = await this.fsManager.getFolderHandle(type, year);
      const fileHandle = await sourceFolder.getFileHandle(fileName);
      const file = await fileHandle.getFile();

      // Obtém handle da lixeira
      const trashFolder = await this.fsManager.getFolderHandle('Lixeira', year);

      // Nome com timestamp para evitar conflitos
      const timestamp = Date.now();
      const trashFileName = `${timestamp}_${fileName}`;

      // Copia para lixeira
      const trashFileHandle = await trashFolder.getFileHandle(trashFileName, { create: true });
      const writable = await trashFileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      // Salva metadados da lixeira
      await this.saveTrashMetadata(year, trashFileName, {
        originalName: fileName,
        originalType: type,
        deletedAt: Date.now(),
        size: file.size
      });

      // Remove arquivo original
      await sourceFolder.removeEntry(fileName);

      // Atualiza manifestos
      if (window.integrityManager) {
        await window.integrityManager.removeFileFromManifest(sourceFolder, fileName);
        await window.integrityManager.updateManifest(trashFolder, trashFileName);
      }

      console.log(`🗑️ Movido para lixeira: ${fileName} → ${trashFileName}`);

      return {
        success: true,
        trashFileName: trashFileName
      };
    } catch (error) {
      console.error('Erro ao mover para lixeira:', error);
      throw error;
    }
  }

  /**
   * Exclui permanentemente da lixeira (hard delete)
   */
  async hardDeleteFromTrash(year, trashFileName, skipLog = false) {
    if (!this.fsManager.mainDirectoryHandle) {
      throw new Error('Pasta raiz não selecionada');
    }

    try {
      const trashFolder = await this.fsManager.getFolderHandle('Lixeira', year);

      // Remove arquivo
      await trashFolder.removeEntry(trashFileName);

      // Remove metadados
      await this.removeTrashMetadata(year, trashFileName);

      // Atualiza manifesto
      if (window.integrityManager) {
        await window.integrityManager.removeFileFromManifest(trashFolder, trashFileName);
      }

      if (!skipLog) {
        console.log(`❌ Excluído permanentemente: ${trashFileName}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir permanentemente:', error);
      throw error;
    }
  }

  /**
   * Restaura arquivo da lixeira
   */
  async restoreFromTrash(year, trashFileName, targetType) {
    if (!this.fsManager.mainDirectoryHandle) {
      throw new Error('Pasta raiz não selecionada');
    }

    try {
      // Obtém arquivo da lixeira
      const trashFolder = await this.fsManager.getFolderHandle('Lixeira', year);
      const fileHandle = await trashFolder.getFileHandle(trashFileName);
      const file = await fileHandle.getFile();

      // Obtém metadados para nome original
      const metadata = await this.getTrashMetadata(year, trashFileName);
      const originalName = metadata?.originalName || trashFileName.replace(/^\d+_/, '');

      // Pasta de destino
      const targetFolder = await this.fsManager.getFolderHandle(targetType, year);

      // Verifica se arquivo já existe no destino
      let finalName = originalName;
      let counter = 1;
      let fileExists = true;

      while (fileExists) {
        try {
          await targetFolder.getFileHandle(finalName);
          // Arquivo existe, adiciona sufixo
          const ext = originalName.substring(originalName.lastIndexOf('.'));
          const base = originalName.substring(0, originalName.lastIndexOf('.'));
          finalName = `${base} (${counter})${ext}`;
          counter++;
        } catch (error) {
          if (error.name === 'NotFoundError') {
            fileExists = false; // Nome disponível
          } else {
            throw error;
          }
        }
      }

      // Restaura arquivo
      const restoredHandle = await targetFolder.getFileHandle(finalName, { create: true });
      const writable = await restoredHandle.createWritable();
      await writable.write(file);
      await writable.close();

      // Remove da lixeira
      await trashFolder.removeEntry(trashFileName);
      await this.removeTrashMetadata(year, trashFileName);

      // Atualiza manifestos
      if (window.integrityManager) {
        await window.integrityManager.updateManifest(targetFolder, finalName);
        await window.integrityManager.removeFileFromManifest(trashFolder, trashFileName);
      }

      console.log(`↩️ Restaurado: ${trashFileName} → ${targetType}/${finalName}`);

      return {
        success: true,
        restoredName: finalName
      };
    } catch (error) {
      console.error('Erro ao restaurar da lixeira:', error);
      throw error;
    }
  }

  /**
   * Lista itens da lixeira
   */
  async listTrashItems(year = null) {
    if (!this.fsManager.mainDirectoryHandle) {
      throw new Error('Pasta raiz não selecionada');
    }

    const items = [];

    try {
      const years = year ? [year] : await this.fsManager.listYears();

      for (const y of years) {
        try {
          const trashFolder = await this.fsManager.getFolderHandle('Lixeira', y);

          for await (const entry of trashFolder.values()) {
            if (entry.kind === 'file' && !entry.name.startsWith('.ir')) {
              const file = await entry.getFile();
              const metadata = await this.getTrashMetadata(y, entry.name);

              items.push({
                year: y,
                fileName: entry.name,
                originalName: metadata?.originalName || entry.name,
                originalType: metadata?.originalType || 'desconhecido',
                deletedAt: metadata?.deletedAt || file.lastModified,
                size: file.size
              });
            }
          }
        } catch (error) {
          // Lixeira do ano não existe
          continue;
        }
      }

      return items.sort((a, b) => b.deletedAt - a.deletedAt);
    } catch (error) {
      console.error('Erro ao listar lixeira:', error);
      return [];
    }
  }

  /**
   * Salva metadados da lixeira no IndexedDB
   */
  async saveTrashMetadata(year, trashFileName, metadata) {
    try {
      if (!window.dbManager?.db) {
        return;
      }

      const tx = window.dbManager.db.transaction(['config'], 'readwrite');
      const store = tx.objectStore('config');

      const result = await new Promise((resolve, reject) => {
        const req = store.get('trashMetadata');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const allMetadata = result?.data || {};
      const yearKey = `year_${year}`;

      if (!allMetadata[yearKey]) {
        allMetadata[yearKey] = {};
      }

      allMetadata[yearKey][trashFileName] = metadata;

      await new Promise((resolve, reject) => {
        const req = store.put({
          id: 'trashMetadata',
          data: allMetadata,
          updatedAt: new Date().toISOString()
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (error) {
      console.error('Erro ao salvar metadados da lixeira:', error);
    }
  }

  /**
   * Obtém metadados da lixeira
   */
  async getTrashMetadata(year, trashFileName) {
    try {
      if (!window.dbManager?.db) {
        return null;
      }

      const result = await window.dbManager.get('config', 'trashMetadata');
      const yearKey = `year_${year}`;
      return result?.data?.[yearKey]?.[trashFileName] || null;
    } catch (error) {
      console.error('Erro ao obter metadados da lixeira:', error);
      return null;
    }
  }

  /**
   * Remove metadados da lixeira
   */
  async removeTrashMetadata(year, trashFileName) {
    try {
      if (!window.dbManager?.db) {
        return;
      }

      const tx = window.dbManager.db.transaction(['config'], 'readwrite');
      const store = tx.objectStore('config');

      const result = await new Promise((resolve, reject) => {
        const req = store.get('trashMetadata');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (!result) {
        return;
      }

      const allMetadata = result.data || {};
      const yearKey = `year_${year}`;

      if (allMetadata[yearKey]) {
        delete allMetadata[yearKey][trashFileName];
      }

      await new Promise((resolve, reject) => {
        const req = store.put({
          id: 'trashMetadata',
          data: allMetadata,
          updatedAt: new Date().toISOString()
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (error) {
      console.error('Erro ao remover metadados da lixeira:', error);
    }
  }
}

// Export class
window.TrashManager = TrashManager;

console.log('✅ Trash Manager carregado');
