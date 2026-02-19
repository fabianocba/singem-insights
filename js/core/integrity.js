/**
 * Sistema de Integridade de Arquivos
 * Manifesto (.irmeta.json) e verificação de alterações externas
 */

class IntegrityManager {
  constructor() {
    this.APP_ID = 'ControleMaterialIFBaiano';
    this.APP_VERSION = window.APP_VERSION || '1.0.0';
  }

  /**
   * Calcula hash SHA-256 de um arquivo
   */
  async calculateFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return this.bufferToHex(new Uint8Array(hashBuffer));
  }

  /**
   * Calcula hash em chunks para arquivos grandes
   */
  async calculateFileHashChunked(fileHandle) {
    try {
      const file = await fileHandle.getFile();
      const chunkSize = 1024 * 1024; // 1MB chunks
      const chunks = Math.ceil(file.size / chunkSize);

      let offset = 0;
      const hashContext = [];

      for (let i = 0; i < chunks; i++) {
        const chunk = file.slice(offset, offset + chunkSize);
        const buffer = await chunk.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        hashContext.push(new Uint8Array(hashBuffer));
        offset += chunkSize;
      }

      // Hash final dos hashes
      const combinedBuffer = new Uint8Array(hashContext.reduce((acc, arr) => acc + arr.length, 0));
      let writeOffset = 0;
      for (const arr of hashContext) {
        combinedBuffer.set(arr, writeOffset);
        writeOffset += arr.length;
      }

      const finalHash = await crypto.subtle.digest('SHA-256', combinedBuffer);
      return this.bufferToHex(new Uint8Array(finalHash));
    } catch (error) {
      console.error('Erro ao calcular hash chunked:', error);
      throw error;
    }
  }

  /**
   * Cria ou atualiza manifesto de uma pasta
   */
  async updateManifest(folderHandle, changedFileName = null) {
    try {
      // Carrega manifesto existente
      let manifest = await this.loadManifest(folderHandle);

      if (!manifest) {
        // Cria novo manifesto
        manifest = {
          appId: this.APP_ID,
          version: this.APP_VERSION,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          files: []
        };
      }

      // Se especificou arquivo, atualiza apenas ele
      if (changedFileName) {
        await this.updateFileInManifest(manifest, folderHandle, changedFileName);
      } else {
        // Atualiza todos os arquivos
        manifest.files = [];
        for await (const entry of folderHandle.values()) {
          if (entry.kind === 'file' && !entry.name.startsWith('.ir')) {
            await this.updateFileInManifest(manifest, folderHandle, entry.name);
          }
        }
      }

      manifest.updatedAt = new Date().toISOString();

      // Salva manifesto
      await this.saveManifest(folderHandle, manifest);

      console.log(`✅ Manifesto atualizado: ${folderHandle.name}/${changedFileName || 'todos'}`);
      return manifest;
    } catch (error) {
      console.error('Erro ao atualizar manifesto:', error);
      throw error;
    }
  }

  /**
   * Atualiza entrada de arquivo no manifesto
   */
  async updateFileInManifest(manifest, folderHandle, fileName) {
    try {
      const fileHandle = await folderHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();

      const hash = await this.calculateFileHash(file);

      // Remove entrada antiga se existir
      manifest.files = manifest.files.filter((f) => f.name !== fileName);

      // Adiciona nova entrada
      manifest.files.push({
        name: fileName,
        hash: hash,
        size: file.size,
        lastModified: file.lastModified,
        lastWrite: new Date(file.lastModified).toISOString()
      });
    } catch (error) {
      // Arquivo pode ter sido deletado
      console.warn(`Arquivo não encontrado para manifesto: ${fileName}`);
      // Remove do manifesto se não existe mais
      manifest.files = manifest.files.filter((f) => f.name !== fileName);
    }
  }

  /**
   * Carrega manifesto de uma pasta
   */
  async loadManifest(folderHandle) {
    try {
      const manifestHandle = await folderHandle.getFileHandle('.irmeta.json');
      const file = await manifestHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (error) {
      // Manifesto não existe ainda
      return null;
    }
  }

  /**
   * Salva manifesto em uma pasta
   */
  async saveManifest(folderHandle, manifest) {
    try {
      const manifestHandle = await folderHandle.getFileHandle('.irmeta.json', { create: true });
      const writable = await manifestHandle.createWritable();
      await writable.write(JSON.stringify(manifest, null, 2));
      await writable.close();
    } catch (error) {
      console.error('Erro ao salvar manifesto:', error);
      throw error;
    }
  }

  /**
   * Cria arquivo .irlock.json de controle
   */
  async createLockFile(folderHandle) {
    try {
      const lock = {
        appId: this.APP_ID,
        version: this.APP_VERSION,
        createdAt: new Date().toISOString(),
        message: 'Esta pasta é gerenciada pelo IFDESK. Não altere ou remova arquivos manualmente.'
      };

      const lockHandle = await folderHandle.getFileHandle('.irlock.json', { create: true });
      const writable = await lockHandle.createWritable();
      await writable.write(JSON.stringify(lock, null, 2));
      await writable.close();

      console.log(`🔒 Lock file criado: ${folderHandle.name}`);
    } catch (error) {
      console.error('Erro ao criar lock file:', error);
    }
  }

  /**
   * Varre pasta e compara com manifesto
   */
  async scanFolder(folderHandle) {
    try {
      const manifest = await this.loadManifest(folderHandle);

      if (!manifest) {
        return {
          status: 'no_manifest',
          message: 'Manifesto não encontrado',
          folderName: folderHandle.name
        };
      }

      const currentFiles = new Map();
      const manifestFiles = new Map(manifest.files.map((f) => [f.name, f]));

      // Varre arquivos atuais
      for await (const entry of folderHandle.values()) {
        if (entry.kind === 'file' && !entry.name.startsWith('.ir')) {
          const file = await entry.getFile();
          const hash = await this.calculateFileHash(file);

          currentFiles.set(entry.name, {
            name: entry.name,
            hash: hash,
            size: file.size,
            lastModified: file.lastModified
          });
        }
      }

      // Compara
      const differences = {
        missing: [], // No manifesto mas não existe
        new: [], // Existe mas não está no manifesto
        modified: [], // Hash diferente
        intact: [] // Tudo ok
      };

      // Verifica arquivos do manifesto
      for (const [name, manifestFile] of manifestFiles) {
        const currentFile = currentFiles.get(name);

        if (!currentFile) {
          differences.missing.push(manifestFile);
        } else if (currentFile.hash !== manifestFile.hash) {
          differences.modified.push({
            name: name,
            expected: manifestFile,
            current: currentFile
          });
        } else {
          differences.intact.push(name);
        }
      }

      // Verifica arquivos novos
      for (const [name, currentFile] of currentFiles) {
        if (!manifestFiles.has(name)) {
          differences.new.push(currentFile);
        }
      }

      const hasIssues = differences.missing.length > 0 || differences.new.length > 0 || differences.modified.length > 0;

      return {
        status: hasIssues ? 'integrity_compromised' : 'ok',
        folderName: folderHandle.name,
        manifest: manifest,
        differences: differences,
        scannedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao escanear pasta:', error);
      return {
        status: 'error',
        folderName: folderHandle.name,
        error: error.message
      };
    }
  }

  /**
   * Reconciliação completa de um ano
   */
  async reconcile(year) {
    try {
      const types = ['Empenhos', 'NotasFiscais', 'Relatorios', 'Lixeira'];
      const report = {
        year: year,
        scannedAt: new Date().toISOString(),
        folders: []
      };

      for (const type of types) {
        try {
          const folderHandle = await window.fsManager.getFolderHandle(type, year);
          const scanResult = await this.scanFolder(folderHandle);
          report.folders.push(scanResult);
        } catch (error) {
          report.folders.push({
            status: 'error',
            folderName: `${type}/${year}`,
            error: error.message
          });
        }
      }

      // Resumo
      const totalIssues = report.folders.reduce((sum, f) => {
        if (f.status === 'integrity_compromised' && f.differences) {
          return sum + f.differences.missing.length + f.differences.new.length + f.differences.modified.length;
        }
        return sum;
      }, 0);

      report.summary = {
        totalFolders: report.folders.length,
        foldersOk: report.folders.filter((f) => f.status === 'ok').length,
        foldersWithIssues: report.folders.filter((f) => f.status === 'integrity_compromised').length,
        totalIssues: totalIssues
      };

      console.log(`📊 Reconciliação ${year}:`, report.summary);
      return report;
    } catch (error) {
      console.error('Erro na reconciliação:', error);
      throw error;
    }
  }

  /**
   * Reconstrói manifesto varrendo pasta
   */
  async rebuildManifest(folderHandle) {
    try {
      const manifest = {
        appId: this.APP_ID,
        version: this.APP_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        files: []
      };

      for await (const entry of folderHandle.values()) {
        if (entry.kind === 'file' && !entry.name.startsWith('.ir')) {
          const file = await entry.getFile();
          const hash = await this.calculateFileHash(file);

          manifest.files.push({
            name: entry.name,
            hash: hash,
            size: file.size,
            lastModified: file.lastModified,
            lastWrite: new Date(file.lastModified).toISOString()
          });
        }
      }

      await this.saveManifest(folderHandle, manifest);
      console.log(`✅ Manifesto reconstruído: ${folderHandle.name}`);
      return manifest;
    } catch (error) {
      console.error('Erro ao reconstruir manifesto:', error);
      throw error;
    }
  }

  /**
   * Remove arquivo do manifesto (quando movido para lixeira)
   */
  async removeFileFromManifest(folderHandle, fileName) {
    try {
      const manifest = await this.loadManifest(folderHandle);

      if (!manifest) {
        console.warn('Manifesto não existe');
        return;
      }

      manifest.files = manifest.files.filter((f) => f.name !== fileName);
      manifest.updatedAt = new Date().toISOString();

      await this.saveManifest(folderHandle, manifest);
      console.log(`✅ Arquivo removido do manifesto: ${fileName}`);
    } catch (error) {
      console.error('Erro ao remover arquivo do manifesto:', error);
    }
  }

  /**
   * Gera relatório HTML de integridade
   */
  generateHTMLReport(reconcileReport) {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Integridade - ${reconcileReport.year}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card h3 { margin: 0; font-size: 2em; }
    .summary-card p { margin: 10px 0 0 0; opacity: 0.9; }
    .folder { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db; }
    .folder.ok { border-left-color: #27ae60; }
    .folder.warn { border-left-color: #f39c12; }
    .folder.error { border-left-color: #e74c3c; }
    .issue { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
    .missing { color: #e74c3c; }
    .new { color: #f39c12; }
    .modified { color: #3498db; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;
             font-weight: bold; margin-left: 10px; }
    .badge.ok { background: #27ae60; color: white; }
    .badge.warn { background: #f39c12; color: white; }
    .badge.error { background: #e74c3c; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Relatório de Integridade - Ano ${reconcileReport.year}</h1>
    <p><strong>Escaneado em:</strong> ${new Date(reconcileReport.scannedAt).toLocaleString('pt-BR')}</p>

    <div class="summary">
      <div class="summary-card">
        <h3>${reconcileReport.summary.totalFolders}</h3>
        <p>Pastas Verificadas</p>
      </div>
      <div class="summary-card">
        <h3>${reconcileReport.summary.foldersOk}</h3>
        <p>Sem Problemas</p>
      </div>
      <div class="summary-card">
        <h3>${reconcileReport.summary.foldersWithIssues}</h3>
        <p>Com Problemas</p>
      </div>
      <div class="summary-card">
        <h3>${reconcileReport.summary.totalIssues}</h3>
        <p>Total de Inconsistências</p>
      </div>
    </div>

    ${reconcileReport.folders
      .map((folder) => {
        let statusClass = 'ok';
        let statusBadge = 'ok';
        let statusText = 'OK';

        if (folder.status === 'integrity_compromised') {
          statusClass = 'warn';
          statusBadge = 'warn';
          statusText = 'COMPROMETIDA';
        } else if (folder.status === 'error' || folder.status === 'no_manifest') {
          statusClass = 'error';
          statusBadge = 'error';
          statusText = 'ERRO';
        }

        return `
        <div class="folder ${statusClass}">
          <h2>
            ${folder.folderName}
            <span class="badge ${statusBadge}">${statusText}</span>
          </h2>

          ${
            folder.differences
              ? `
            ${
              folder.differences.missing.length > 0
                ? `
              <div class="issue missing">
                <strong>❌ Arquivos Faltantes (${folder.differences.missing.length}):</strong>
                <ul>
                  ${folder.differences.missing.map((f) => `<li>${f.name} (${(f.size / 1024).toFixed(1)} KB)</li>`).join('')}
                </ul>
              </div>
            `
                : ''
            }

            ${
              folder.differences.new.length > 0
                ? `
              <div class="issue new">
                <strong>⚠️ Arquivos Novos Não Catalogados (${folder.differences.new.length}):</strong>
                <ul>
                  ${folder.differences.new.map((f) => `<li>${f.name} (${(f.size / 1024).toFixed(1)} KB)</li>`).join('')}
                </ul>
              </div>
            `
                : ''
            }

            ${
              folder.differences.modified.length > 0
                ? `
              <div class="issue modified">
                <strong>🔄 Arquivos Modificados (${folder.differences.modified.length}):</strong>
                <ul>
                  ${folder.differences.modified
                    .map(
                      (f) => `
                    <li>
                      ${f.name}<br>
                      <small>Hash esperado: ${f.expected.hash.substr(0, 16)}...</small><br>
                      <small>Hash atual: ${f.current.hash.substr(0, 16)}...</small>
                    </li>
                  `
                    )
                    .join('')}
                </ul>
              </div>
            `
                : ''
            }

            ${
              folder.differences.intact.length > 0
                ? `
              <p>✅ <strong>${folder.differences.intact.length}</strong> arquivo(s) íntegro(s)</p>
            `
                : ''
            }
          `
              : ''
          }

          ${
            folder.error
              ? `
            <p class="error">❌ Erro: ${folder.error}</p>
          `
              : ''
          }
        </div>
      `;
      })
      .join('')}
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Exporta relatório de integridade
   */
  async exportReport(reconcileReport) {
    const html = this.generateHTMLReport(reconcileReport);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-integridade-${reconcileReport.year}-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('✅ Relatório de integridade exportado');
  }

  /**
   * Utilitários
   */
  bufferToHex(buffer) {
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// Instância global
window.integrityManager = new IntegrityManager();

console.log('✅ Integrity Manager carregado');
