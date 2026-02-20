/**
 * Backup Manager - Gerenciador de Backup e Restore
 * Fornece UI e funções para exportar/importar dados do sistema
 *
 * @module backupManager
 */

import storageAdapter from './storageAdapter.js';
import { getSystemStats } from './storageAudit.js';

// ============================================================================
// BACKUP MANAGER
// ============================================================================

class BackupManager {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Inicializa o gerenciador de backup
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    this.setupEventListeners();
    this.isInitialized = true;
    console.log('[BackupManager] ✅ Inicializado');
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Botão exportar backup
    document.getElementById('btnExportarBackup')?.addEventListener('click', () => {
      this.exportarBackup();
    });

    // Botão importar backup
    document.getElementById('btnImportarBackup')?.addEventListener('click', () => {
      this.abrirModalImportar();
    });

    // Botão diagnóstico
    document.getElementById('btnDiagnostico')?.addEventListener('click', () => {
      this.mostrarDiagnostico();
    });

    // Botão limpar dados
    document.getElementById('btnLimparDados')?.addEventListener('click', () => {
      this.confirmarLimpeza();
    });
  }

  // ==========================================================================
  // EXPORTAR BACKUP
  // ==========================================================================

  /**
   * Exporta todos os dados para arquivo JSON
   */
  async exportarBackup() {
    try {
      console.log('[BackupManager] 📤 Iniciando exportação...');

      // Mostrar loading
      this._showLoading('Gerando backup...');

      // Exportar todos os dados
      const backup = await storageAdapter.exportAll();

      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `SINGEM_Backup_${timestamp}.json`;

      // Criar blob e fazer download
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this._hideLoading();
      this._showSuccess(`Backup exportado: ${filename}`);

      console.log('[BackupManager] ✅ Backup exportado:', backup.meta.stats);
    } catch (error) {
      this._hideLoading();
      this._showError('Erro ao exportar backup: ' + error.message);
      console.error('[BackupManager] ❌ Erro:', error);
    }
  }

  // ==========================================================================
  // IMPORTAR BACKUP
  // ==========================================================================

  /**
   * Abre modal para importar backup
   */
  abrirModalImportar() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalImportarBackup';
    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header">
          <h4>📥 Importar Backup</h4>
          <button type="button" class="btn-fechar" id="fecharModalImportar">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="arquivoBackup">Selecione o arquivo de backup (.json)</label>
            <input type="file" id="arquivoBackup" accept=".json" class="form-control" />
          </div>

          <div id="previewBackup" style="display: none; margin-top: 15px;">
            <div class="alert alert-info">
              <strong>📋 Informações do Backup:</strong>
              <div id="infoBackup" style="margin-top: 10px;"></div>
            </div>
          </div>

          <div class="form-group" style="margin-top: 15px;">
            <label>Modo de Importação:</label>
            <div style="margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <input type="radio" name="modoImportacao" value="merge" checked />
                <span><strong>Mesclar</strong> - Adiciona/atualiza registros existentes</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="modoImportacao" value="replace" />
                <span><strong>Substituir tudo</strong> - Apaga dados atuais e restaura do backup</span>
              </label>
            </div>
          </div>

          <div id="confirmacaoReplace" style="display: none; margin-top: 15px;">
            <div class="alert alert-danger">
              <strong>⚠️ ATENÇÃO:</strong> Esta operação irá apagar TODOS os dados atuais!
              <div style="margin-top: 10px;">
                <label>Digite <strong>CONFIRMAR</strong> para continuar:</label>
                <input type="text" id="codigoConfirmacao" class="form-control" placeholder="CONFIRMAR" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelarImportar">Cancelar</button>
          <button type="button" class="btn btn-primary" id="btnConfirmarImportar" disabled>📥 Importar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    const fechar = () => overlay.remove();
    overlay.querySelector('#fecharModalImportar').addEventListener('click', fechar);
    overlay.querySelector('#btnCancelarImportar').addEventListener('click', fechar);

    // Prevenir fechamento ao clicar fora
    overlay.querySelector('.modal-card').addEventListener('click', (e) => e.stopPropagation());

    // Arquivo selecionado
    let backupData = null;
    overlay.querySelector('#arquivoBackup').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        backupData = JSON.parse(text);

        // Validar estrutura
        if (!backupData.meta) {
          throw new Error('Arquivo inválido: meta informações ausentes');
        }

        // Mostrar preview
        const infoDiv = overlay.querySelector('#infoBackup');
        infoDiv.innerHTML = `
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Versão do App:</strong> ${backupData.meta.appVersion || 'N/A'}</li>
            <li><strong>Data:</strong> ${new Date(backupData.meta.exportedAt).toLocaleString('pt-BR')}</li>
            <li><strong>Empenhos:</strong> ${backupData.meta.stats?.empenhos || 0}</li>
            <li><strong>Notas Fiscais:</strong> ${backupData.meta.stats?.notasFiscais || 0}</li>
            <li><strong>Arquivos:</strong> ${backupData.meta.stats?.arquivos || 0}</li>
          </ul>
        `;
        overlay.querySelector('#previewBackup').style.display = 'block';
        overlay.querySelector('#btnConfirmarImportar').disabled = false;
      } catch (error) {
        this._showError('Erro ao ler arquivo: ' + error.message);
        backupData = null;
        overlay.querySelector('#previewBackup').style.display = 'none';
        overlay.querySelector('#btnConfirmarImportar').disabled = true;
      }
    });

    // Modo de importação
    overlay.querySelectorAll('input[name="modoImportacao"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const confirmDiv = overlay.querySelector('#confirmacaoReplace');
        confirmDiv.style.display = e.target.value === 'replace' ? 'block' : 'none';
      });
    });

    // Confirmar importação
    overlay.querySelector('#btnConfirmarImportar').addEventListener('click', async () => {
      if (!backupData) {
        return;
      }

      const modo = overlay.querySelector('input[name="modoImportacao"]:checked').value;

      // Verificar confirmação para replace
      if (modo === 'replace') {
        const codigo = overlay.querySelector('#codigoConfirmacao').value;
        if (codigo !== 'CONFIRMAR') {
          this._showError('Digite "CONFIRMAR" para substituir todos os dados');
          return;
        }
      }

      try {
        this._showLoading('Importando dados...');
        overlay.remove();

        const result = await storageAdapter.importAll(backupData, modo);

        this._hideLoading();

        if (result.success) {
          this._showSuccess(
            `Backup importado com sucesso!\n` +
              `LocalStorage: ${result.imported.localStorage} itens\n` +
              `IndexedDB: ${JSON.stringify(result.imported.indexedDB)}`
          );

          // Recarregar página para aplicar mudanças
          setTimeout(() => {
            if (confirm('Deseja recarregar a página para aplicar as mudanças?')) {
              location.reload();
            }
          }, 1000);
        } else {
          this._showError('Erros durante importação:\n' + result.errors.join('\n'));
        }
      } catch (error) {
        this._hideLoading();
        this._showError('Erro ao importar: ' + error.message);
      }
    });
  }

  // ==========================================================================
  // DIAGNÓSTICO
  // ==========================================================================

  /**
   * Mostra modal de diagnóstico do sistema
   */
  async mostrarDiagnostico() {
    try {
      this._showLoading('Gerando diagnóstico...');

      // Obter estatísticas
      const stats = await getSystemStats();

      // Detectar armazenamento
      const storageInfo = {
        localStorage: {
          usado: localStorage.length > 0,
          chaves: localStorage.length
        },
        indexedDB: {
          usado: !!window.dbManager?.db,
          banco: window.dbManager?.db?.name || 'N/A',
          versao: window.dbManager?.db?.version || 'N/A',
          stores: Array.from(window.dbManager?.db?.objectStoreNames || [])
        }
      };

      this._hideLoading();

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-card" style="max-width: 600px;">
          <div class="modal-header">
            <h4>🔍 Diagnóstico do Sistema</h4>
            <button type="button" class="btn-fechar" id="fecharDiagnostico">✕</button>
          </div>
          <div class="modal-body">
            <h5>📊 Estatísticas dos Dados</h5>
            <table class="table" style="width: 100%; margin-bottom: 20px;">
              <tr><td>Empenhos</td><td><strong>${stats.empenhos}</strong></td></tr>
              <tr><td>Itens de Empenhos</td><td><strong>${stats.itensEmpenhos}</strong></td></tr>
              <tr><td>Notas Fiscais</td><td><strong>${stats.notasFiscais}</strong></td></tr>
              <tr><td>Itens de NFs</td><td><strong>${stats.itensNFs}</strong></td></tr>
              <tr><td>Usuários</td><td><strong>${stats.usuarios}</strong></td></tr>
              <tr><td>Unidades</td><td><strong>${stats.unidades}</strong></td></tr>
              <tr><td>Arquivos</td><td><strong>${stats.arquivos}</strong></td></tr>
              <tr><td>Logs de Auditoria</td><td><strong>${stats.auditLogs}</strong></td></tr>
            </table>

            <h5>💾 Armazenamento</h5>
            <table class="table" style="width: 100%; margin-bottom: 20px;">
              <tr>
                <td>LocalStorage</td>
                <td>${storageInfo.localStorage.usado ? '✅ Em uso' : '❌ Não usado'}</td>
                <td>${storageInfo.localStorage.chaves} chaves</td>
              </tr>
              <tr>
                <td>IndexedDB</td>
                <td>${storageInfo.indexedDB.usado ? '✅ Em uso' : '❌ Não usado'}</td>
                <td>${storageInfo.indexedDB.banco} v${storageInfo.indexedDB.versao}</td>
              </tr>
            </table>

            <h5>🗃️ Stores do IndexedDB</h5>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
              ${storageInfo.indexedDB.stores.join(', ') || 'Nenhuma store encontrada'}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btnConsoleReport">📋 Relatório no Console</button>
            <button type="button" class="btn btn-primary" id="btnFecharDiagnostico">Fechar</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Event listeners
      const fechar = () => overlay.remove();
      overlay.querySelector('#fecharDiagnostico').addEventListener('click', fechar);
      overlay.querySelector('#btnFecharDiagnostico').addEventListener('click', fechar);
      overlay.querySelector('.modal-card').addEventListener('click', (e) => e.stopPropagation());

      // Relatório no console
      overlay.querySelector('#btnConsoleReport').addEventListener('click', async () => {
        if (window.storageAudit?.printStorageReport) {
          await window.storageAudit.printStorageReport();
          this._showSuccess('Relatório gerado no console (F12)');
        }
      });
    } catch (error) {
      this._hideLoading();
      this._showError('Erro ao gerar diagnóstico: ' + error.message);
    }
  }

  // ==========================================================================
  // LIMPAR DADOS
  // ==========================================================================

  /**
   * Confirma e executa limpeza de todos os dados
   */
  async confirmarLimpeza() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 450px;">
        <div class="modal-header" style="background: #dc3545; color: white;">
          <h4>⚠️ Limpar Todos os Dados</h4>
          <button type="button" class="btn-fechar" id="fecharLimpeza" style="color: white;">✕</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger">
            <strong>ATENÇÃO!</strong> Esta ação irá:
            <ul style="margin: 10px 0 0 20px;">
              <li>Apagar TODOS os empenhos</li>
              <li>Apagar TODAS as notas fiscais</li>
              <li>Apagar TODOS os usuários</li>
              <li>Apagar TODAS as configurações</li>
            </ul>
            <p style="margin-top: 15px;"><strong>Esta ação NÃO pode ser desfeita!</strong></p>
          </div>

          <div class="form-group" style="margin-top: 15px;">
            <label>Digite <strong style="color: #dc3545;">CONFIRMAR</strong> para continuar:</label>
            <input type="text" id="codigoLimpeza" class="form-control" placeholder="CONFIRMAR" style="border-color: #dc3545;" />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelarLimpeza">Cancelar</button>
          <button type="button" class="btn btn-danger" id="btnConfirmarLimpeza">🗑️ Limpar Tudo</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.querySelector('#fecharLimpeza').addEventListener('click', fechar);
    overlay.querySelector('#btnCancelarLimpeza').addEventListener('click', fechar);
    overlay.querySelector('.modal-card').addEventListener('click', (e) => e.stopPropagation());

    overlay.querySelector('#btnConfirmarLimpeza').addEventListener('click', async () => {
      const codigo = overlay.querySelector('#codigoLimpeza').value;

      if (codigo !== 'CONFIRMAR') {
        this._showError('Digite "CONFIRMAR" para limpar os dados');
        return;
      }

      try {
        this._showLoading('Limpando dados...');
        overlay.remove();

        await storageAdapter.clearAllData('CONFIRMAR');

        this._hideLoading();
        this._showSuccess('Todos os dados foram removidos. A página será recarregada.');

        setTimeout(() => location.reload(), 2000);
      } catch (error) {
        this._hideLoading();
        this._showError('Erro ao limpar dados: ' + error.message);
      }
    });
  }

  // ==========================================================================
  // HELPERS UI
  // ==========================================================================

  _showLoading(message) {
    if (window.app?.showLoading) {
      window.app.showLoading(message);
    } else {
      console.log('[BackupManager]', message);
    }
  }

  _hideLoading() {
    if (window.app?.hideLoading) {
      window.app.hideLoading();
    }
  }

  _showSuccess(message) {
    if (window.app?.showSuccess) {
      window.app.showSuccess(message);
    } else {
      alert('✅ ' + message);
    }
  }

  _showError(message) {
    if (window.app?.showError) {
      window.app.showError(message);
    } else {
      alert('❌ ' + message);
    }
  }
}

// ============================================================================
// INSTÂNCIA SINGLETON
// ============================================================================
const backupManager = new BackupManager();

// Exportar para window
if (typeof window !== 'undefined') {
  window.backupManager = backupManager;
}

export default backupManager;
export { BackupManager };
