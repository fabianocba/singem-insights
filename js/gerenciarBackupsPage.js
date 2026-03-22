function onWindowLoad(callback) {
  if (document.readyState === 'complete') {
    callback();
    return;
  }

  window.addEventListener('load', callback, { once: true });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAction(action) {
  const actions = {
    save_usuario: '💾 Usuário Salvo',
    delete_usuario: '🗑️ Usuário Excluído',
    save_unidade: '🏢 Unidade Salva',
    restore: '↩️ Backup Restaurado',
    import: '📥 Backup Importado'
  };

  return actions[action] || action;
}

function formatDetails(details) {
  if (!details) {
    return '';
  }

  const parts = [];
  if (details.login) {
    parts.push(`Login: ${details.login}`);
  }
  if (details.nome) {
    parts.push(`Nome: ${details.nome}`);
  }
  if (details.backupId) {
    parts.push(`Backup ID: ${details.backupId}`);
  }

  return escapeHtml(parts.join(' • '));
}

let backupManager = null;

async function carregarBackups() {
  const list = document.getElementById('backupList');
  if (!list) {
    return;
  }

  if (backupManager?.disabled) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">ℹ️</div>
        <p>Backups locais estão desativados no modo servidor.</p>
      </div>
    `;
    return;
  }

  try {
    const backups = await backupManager.listBackups();

    if (backups.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <p>Nenhum backup encontrado</p>
          <button class="btn btn-primary" onclick="criarBackupManual(this)">
            Criar Primeiro Backup
          </button>
        </div>
      `;
      return;
    }

    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    list.innerHTML = backups
      .map(
        (backup) => `
          <div class="backup-item">
            <div class="backup-info">
              <div>
                <strong>Backup #${backup.id}</strong>
                <span class="status-badge status-${escapeHtml(backup.type)}">
                  ${
                    backup.type === 'auto'
                      ? '🤖 Automático'
                      : backup.type === 'manual'
                        ? '👤 Manual'
                        : backup.type === 'imported'
                          ? '📥 Importado'
                          : '🔄 Restauração'
                  }
                </span>
              </div>
              <div class="backup-meta">
                <span>📅 ${new Date(backup.timestamp).toLocaleString('pt-BR')}</span>
                <span>👥 ${backup.usuarios} usuário(s)</span>
                <span>🏢 ${backup.unidades} unidade(s)</span>
                <span>💾 ${formatBytes(backup.size)}</span>
              </div>
            </div>
            <div class="backup-buttons">
              <button class="btn btn-primary" onclick="restaurarBackup(${backup.id})">
                ↩️ Restaurar
              </button>
              <button class="btn btn-secondary" onclick="exportarBackup(${backup.id})">
                📤 Exportar
              </button>
            </div>
          </div>
        `
      )
      .join('');
  } catch (error) {
    console.error('[BACKUPS] ❌ Erro ao carregar:', error);
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>Erro ao carregar backups: ${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

async function carregarChangelog() {
  const list = document.getElementById('changelogList');
  if (!list) {
    return;
  }

  if (backupManager?.disabled) {
    list.innerHTML = '<p class="sg-empty-copy">Histórico local indisponível no modo servidor.</p>';
    return;
  }

  try {
    const changes = await backupManager.getChangelog(20);

    if (changes.length === 0) {
      list.innerHTML = '<p class="sg-empty-copy">Nenhuma alteração registrada</p>';
      return;
    }

    list.innerHTML = changes
      .map(
        (change) => `
          <div class="changelog-item">
            <div class="changelog-time">
              ${new Date(change.timestamp).toLocaleString('pt-BR')}
            </div>
            <div class="changelog-action">${formatAction(change.action)}</div>
            <div>${formatDetails(change.details)}</div>
          </div>
        `
      )
      .join('');
  } catch (error) {
    console.error('[BACKUPS] ❌ Erro ao carregar changelog:', error);
  }
}

async function criarBackupManual(sourceButton) {
  const btn = sourceButton || (window.event?.target instanceof HTMLButtonElement ? window.event.target : null);
  const originalText = btn?.textContent || '💾 Criar Backup Agora';

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Criando...';
    }

    await backupManager.createAutoBackup('manual');
    await carregarBackups();

    alert('✅ Backup criado com sucesso!');
  } catch (error) {
    console.error('[BACKUPS] ❌ Erro ao criar backup:', error);
    alert('❌ Erro ao criar backup: ' + error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

async function restaurarBackup(id) {
  if (
    !confirm(
      '⚠️ ATENÇÃO: Esta ação irá substituir TODOS os dados atuais pelos dados do backup.\n\nUm backup de segurança será criado antes da restauração.\n\nDeseja continuar?'
    )
  ) {
    return;
  }

  try {
    await backupManager.restoreBackup(id);
    await carregarBackups();
    await carregarChangelog();

    alert('✅ Backup restaurado com sucesso!\n\nRecarregue a página para ver as alterações.');
    window.location.reload();
  } catch (error) {
    console.error('[BACKUPS] ❌ Erro ao restaurar:', error);
    alert('❌ Erro ao restaurar backup: ' + error.message);
  }
}

async function exportarBackup(id) {
  try {
    await backupManager.exportBackup(id);
    alert('✅ Backup exportado com sucesso!');
  } catch (error) {
    console.error('[BACKUPS] ❌ Erro ao exportar:', error);
    alert('❌ Erro ao exportar backup: ' + error.message);
  }
}

async function importarBackup(event) {
  const file = event?.target?.files?.[0];
  if (!file) {
    return;
  }

  try {
    await backupManager.importBackup(file);
    await carregarBackups();
    await carregarChangelog();

    alert('✅ Backup importado com sucesso!');
  } catch (error) {
    console.error('[BACKUPS] ❌ Erro ao importar:', error);
    alert('❌ Erro ao importar backup: ' + error.message);
  } finally {
    if (event?.target) {
      event.target.value = '';
    }
  }
}

async function init() {
  try {
    backupManager = window.dataBackupManager;

    if (!backupManager) {
      throw new Error('window.dataBackupManager não está disponível');
    }

    await backupManager.init();
    await carregarBackups();
    await carregarChangelog();

    console.log('[BACKUPS] ✅ Interface inicializada');
  } catch (error) {
    console.error('[BACKUPS] ❌ Erro ao inicializar:', error);
    alert('Erro ao carregar backups: ' + error.message);
  }
}

window.carregarBackups = carregarBackups;
window.carregarChangelog = carregarChangelog;
window.criarBackupManual = criarBackupManual;
window.restaurarBackup = restaurarBackup;
window.exportarBackup = exportarBackup;
window.importarBackup = importarBackup;

onWindowLoad(() => {
  void init();
});
