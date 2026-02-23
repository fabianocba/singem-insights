/**
 * ============================================================================
 * SINGEM - Módulo de Backup e Restauração
 * ============================================================================
 *
 * Funcionalidades:
 * - Exportar backup completo (JSON)
 * - Importar backup (merge ou substituir)
 * - Carregar dados de teste
 * - Resetar dados (DEV only)
 *
 * @version 1.0.0
 * @author SINGEM Team
 */

// Versão dos dados para compatibilidade futura
const DATA_VERSION = '1.0.0';

/**
 * Classe gerenciadora de Backup e Restauração
 */
class BackupManager {
  constructor() {
    this.selectedFile = null;
    this.parsedBackup = null;
    this.serverMode = window.CONFIG?.storage?.mode === 'server';
    this.isDevMode = this._checkDevMode();
  }

  /**
   * Verifica se está em modo DEV
   */
  _checkDevMode() {
    // Considera DEV se: localhost, 127.0.0.1, ou flag localStorage
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const devFlag = !this.serverMode && localStorage.getItem('SINGEM_DEV_MODE') === 'true';
    return isLocal || devFlag;
  }

  /**
   * Inicializa o módulo
   */
  async init() {
    console.log('[Backup] 🚀 Inicializando módulo de backup...');

    if (this.serverMode) {
      console.warn('[Backup] Modo servidor ativo: backup local desativado');
    }

    // Aguarda DOM estar pronto - procura qualquer botão de backup
    try {
      await this._waitForAnyElement(['btnExportarBackupCompleto', 'btnExportarBackup', 'btnImportarBackup']);
    } catch (e) {
      console.warn('[Backup] Timeout aguardando elementos, continuando mesmo assim...');
    }

    this._setupEventListeners();
    this._updateDevVisibility();

    console.log('[Backup] ✅ Módulo inicializado');
  }

  /**
   * Aguarda qualquer um dos elementos existir no DOM
   */
  _waitForAnyElement(ids, timeout = 5000) {
    return new Promise((resolve, reject) => {
      // Verifica se algum já existe
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          console.log(`[Backup] Elemento #${id} encontrado`);
          resolve(el);
          return;
        }
      }

      const observer = new MutationObserver(() => {
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el) {
            observer.disconnect();
            console.log(`[Backup] Elemento #${id} encontrado via observer`);
            resolve(el);
            return;
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Nenhum elemento encontrado: ${ids.join(', ')}`));
      }, timeout);
    });
  }

  /**
   * Aguarda elemento existir no DOM
   */
  _waitForElement(id, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = document.getElementById(id);
      if (el) {
        resolve(el);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = document.getElementById(id);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Elemento #${id} não encontrado após ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Configura event listeners
   */
  _setupEventListeners() {
    console.log('[Backup] 🔧 Configurando event listeners...');

    // ========================================
    // EXPORTAR BACKUP (ambos botões)
    // ========================================
    // BOTÕES DE REDIRECIONAMENTO (para Preferências)
    // ========================================
    // Botão na aba Backup -> redireciona para Preferências
    const btnIrParaBackupTab = document.getElementById('btnIrParaBackupTab');
    if (btnIrParaBackupTab && !btnIrParaBackupTab.dataset.bound) {
      btnIrParaBackupTab.dataset.bound = '1';
      btnIrParaBackupTab.addEventListener('click', () => {
        console.log('[Backup] Redirecionando para Preferências...');
        const tabButton = document.querySelector('[data-tab="preferencias"]');
        if (tabButton) {
          tabButton.click();
        }
      });
    }

    // ========================================
    // DADOS DE TESTE (mantido na aba Backup)
    // ========================================
    // Carregar dados de teste
    document.getElementById('btnCarregarDadosTeste')?.addEventListener('click', () => {
      this.carregarDadosTeste();
    });

    // Confirmação de reset
    document.getElementById('confirmResetText')?.addEventListener('input', (e) => {
      this._validateResetConfirmation(e.target.value);
    });

    // Resetar dados
    document.getElementById('btnResetarTudo')?.addEventListener('click', () => {
      this.resetarTudo();
    });

    console.log('[Backup] ✅ Event listeners configurados');
  }

  /**
   * Bind para o painel "Backup Completo dos Dados"
   * (botão btnImportarBackup + input fileImportarBackup)
   */
  _bindBackupCompletoDados() {
    const btn = document.getElementById('btnImportarBackup');
    const input = document.getElementById('fileImportarBackup');

    console.log('[Backup] btnImportarBackup encontrado?', !!btn);
    console.log('[Backup] fileImportarBackup encontrado?', !!input);

    if (!btn) {
      console.warn('[Backup] ⚠️ btnImportarBackup não existe no DOM');
      return;
    }

    if (!input) {
      console.warn('[Backup] ⚠️ fileImportarBackup não existe no DOM');
      return;
    }

    // Guard: evita duplicar listener
    if (btn.dataset.bound === '1') {
      console.log('[Backup] btnImportarBackup já tem listener, pulando');
      return;
    }
    btn.dataset.bound = '1';

    // Evento de clique no botão -> abre seletor de arquivo
    btn.addEventListener('click', (e) => {
      console.log('[Backup] 🖱️ Clique no Importar detectado');
      console.log('[Backup] event.target:', e.target);
      console.log('[Backup] event.currentTarget:', e.currentTarget);

      // Limpa valor anterior (permite selecionar mesmo arquivo)
      input.value = '';

      // Abre seletor de arquivo (DEVE ser síncrono no handler de clique)
      input.click();
    });

    // Evento de seleção de arquivo
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];

      if (!file) {
        console.log('[Backup] Import cancelado pelo usuário');
        return;
      }

      console.log('[Backup] 📄 Arquivo selecionado:', file.name, file.size, 'bytes');

      // Processa o arquivo
      await this._importarBackupDireto(file);
    });

    console.log('[Backup] ✅ Listener do Importar anexado (btnImportarBackup)');
  }

  /**
   * Importa backup diretamente (sem preview, modo merge por padrão)
   */
  async _importarBackupDireto(file) {
    console.group('[BACKUP IMPORT DIRETO]');
    console.log('📂 Arquivo:', file.name);

    try {
      // Lê o arquivo
      const text = await file.text();
      console.log('[Backup] 📖 Arquivo lido, tamanho:', text.length, 'chars');

      // Parse JSON
      let backup;
      try {
        backup = JSON.parse(text);
        console.log('[Backup] ✅ JSON parseado com sucesso');
      } catch (parseError) {
        console.error('[Backup] ❌ JSON inválido:', parseError);
        alert('❌ Arquivo JSON inválido: ' + parseError.message);
        console.groupEnd();
        return;
      }

      // Normaliza o schema
      const normalizado = this._normalizeBackupSchema(backup);
      console.log('[Backup] 📦 Schema normalizado:', {
        empenhos: normalizado.empenhos?.length || 0,
        notasFiscais: normalizado.notasFiscais?.length || 0,
        entregas: normalizado.entregas?.length || 0
      });

      // Valida
      const erros = this._validateBackupData(normalizado);
      if (erros.length > 0) {
        console.error('[Backup] ❌ Validação falhou:', erros);
        alert('❌ Backup inválido:\n' + erros.join('\n'));
        console.groupEnd();
        return;
      }
      // Confirma com usuário
      const counts = {
        empenhos: normalizado.empenhos?.length || 0,
        notasFiscais: normalizado.notasFiscais?.length || 0,
        entregas: normalizado.entregas?.length || 0
      };

      const confirmar = confirm(
        `📥 Importar Backup?\n\n` +
          `📋 Empenhos: ${counts.empenhos}\n` +
          `📄 Notas Fiscais: ${counts.notasFiscais}\n` +
          `📦 Entregas: ${counts.entregas}\n\n` +
          `Modo: MESCLAR (adiciona sem duplicar)\n\n` +
          `Continuar?`
      );

      if (!confirmar) {
        console.log('[Backup] ❌ Usuário cancelou');
        console.groupEnd();
        return;
      }

      // Executa o merge
      console.log('[Backup] 🔀 Executando merge...');

      const resultado = { stores: {}, total: 0 };

      await this._importMerge(normalizado, resultado);

      console.log('[Backup] 📊 Resultado:', resultado);

      // Mostra resultado
      const s = resultado.stores;
      alert(
        `✅ Backup importado com sucesso!\n\n` +
          `📋 Empenhos: ${s.empenhos || 0} novos\n` +
          `📄 Notas Fiscais: ${s.notasFiscais || 0} novas\n` +
          `📦 Entregas: ${s.entregas || 0} novas\n` +
          `📊 Total: ${resultado.total} registros`
      );

      // Recarrega UI se possível
      this._recarregarUIAposImport();

      console.log('[Backup] ✅ Import direto concluído');
    } catch (error) {
      console.error('[Backup] ❌ Erro no import direto:', error);
      alert('❌ Erro ao importar: ' + error.message);
    }

    console.groupEnd();
  }

  /**
   * Atualiza visibilidade de elementos DEV
   */
  _updateDevVisibility() {
    const panelReset = document.getElementById('panelResetarDados');
    if (panelReset) {
      panelReset.style.display = this.isDevMode ? 'block' : 'none';
    }
  }

  // ============================================================================
  // EXPORTAR BACKUP
  // ============================================================================

  /**
   * Exporta backup completo
   */
  async exportarBackup() {
    const statusEl = document.getElementById('backupExportStatus');

    if (this.serverMode) {
      this._showStatus(
        statusEl,
        'warning',
        '⚠️ Exportação local desativada no modo PostgreSQL/VPS. Use rotina de backup do servidor.'
      );
      return;
    }

    try {
      this._showStatus(statusEl, 'info', '⏳ Coletando dados...');

      // Coleta todos os dados
      const backupData = await this._coletarDadosBackup();

      // Gera arquivo JSON
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });

      // Nome do arquivo com timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `SINGEM_backup_${timestamp}.json`;

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this._showStatus(
        statusEl,
        'success',
        `✅ Backup exportado com sucesso!<br>📁 Arquivo: <strong>${filename}</strong>`
      );

      console.log('[Backup] ✅ Backup exportado:', filename);
    } catch (error) {
      console.error('[Backup] ❌ Erro ao exportar:', error);
      this._showStatus(statusEl, 'error', `❌ Erro ao exportar: ${error.message}`);
    }
  }

  /**
   * Coleta todos os dados para backup
   */
  async _coletarDadosBackup() {
    const db = window.dbManager;

    // Metadados
    const meta = {
      exportedAt: new Date().toISOString(),
      appVersion: window.APP_VERSION || '2.0.0',
      dataVersion: DATA_VERSION,
      source: window.location.hostname
    };

    // Dados do IndexedDB
    const data = {
      // Configurações
      unidadeOrcamentaria: await db.get('config', 'unidadeOrcamentaria'),
      usuarios: await db.get('config', 'usuarios'),
      preferencias: await db.get('config', 'preferencias'),
      rede: await db.get('config', 'rede'),
      estruturaPastas: await db.get('config', 'estruturaPastas'),

      // Dados principais
      empenhos: await db.getAll('empenhos'),
      notasFiscais: await db.getAll('notasFiscais'),
      entregas: await db.getAll('entregas'),
      arquivos: await db.getAll('arquivos'),
      saldosEmpenhos: await db.getAll('saldosEmpenhos')
    };

    // Estatísticas
    const stats = {
      empenhos: data.empenhos?.length || 0,
      notasFiscais: data.notasFiscais?.length || 0,
      entregas: data.entregas?.length || 0,
      arquivos: data.arquivos?.length || 0,
      usuarios: data.usuarios?.length || 0
    };

    console.log('[Backup] 📊 Estatísticas:', stats);

    return { meta, data, stats };
  }

  // ============================================================================
  // IMPORTAR BACKUP
  // ============================================================================

  /**
   * Manipula seleção de arquivo
   */
  async _handleFileSelect(event) {
    const file = event.target.files[0];
    const previewEl = document.getElementById('backupPreview');
    const previewContentEl = document.getElementById('backupPreviewContent');
    const btnImportar = document.getElementById('btnImportarBackupCompleto');
    const statusEl = document.getElementById('backupImportStatus');

    if (!file) {
      previewEl.style.display = 'none';
      btnImportar.disabled = true;
      this.selectedFile = null;
      this.parsedBackup = null;
      return;
    }

    try {
      console.group('[BACKUP IMPORT] 📂 Processando arquivo');
      console.log('[BACKUP] Arquivo selecionado:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);

      this._showStatus(statusEl, 'info', '⏳ Lendo arquivo...');

      const content = await this._readFileAsText(file);
      console.log('[BACKUP] FileReader: arquivo lido com sucesso');

      let parsed;
      try {
        parsed = JSON.parse(content);
        console.log('[BACKUP] JSON.parse: sucesso');
      } catch (jsonError) {
        console.error('[BACKUP] JSON.parse: FALHA', jsonError);
        throw new Error(`JSON inválido: ${jsonError.message}`);
      }

      // Normalizar schema (suporte a backups antigos)
      const backup = this._normalizeBackupSchema(parsed);
      console.log('[BACKUP] Schema normalizado:', {
        hasMeta: !!backup.meta,
        hasData: !!backup.data,
        dataKeys: Object.keys(backup.data || {})
      });

      // Validar estrutura
      const validationErrors = this._validateBackupData(backup);
      if (validationErrors.length > 0) {
        console.error('[BACKUP] Validação falhou:', validationErrors);
        throw new Error(`Backup inválido: ${validationErrors.join('; ')}`);
      }
      console.log('[BACKUP] Validação: OK');

      this.selectedFile = file;
      this.parsedBackup = backup;
      console.groupEnd();

      // Mostra preview
      const stats = backup.stats || {};
      previewContentEl.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
          <div><strong>📅 Data:</strong> ${new Date(backup.meta.exportedAt).toLocaleString('pt-BR')}</div>
          <div><strong>📦 Versão:</strong> ${backup.meta.appVersion || 'N/A'}</div>
          <div><strong>🏢 Origem:</strong> ${backup.meta.source || 'N/A'}</div>
        </div>
        <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">
          <div>📋 Empenhos: <strong>${stats.empenhos || 0}</strong></div>
          <div>📄 Notas Fiscais: <strong>${stats.notasFiscais || 0}</strong></div>
          <div>👥 Usuários: <strong>${stats.usuarios || 0}</strong></div>
          <div>📦 Entregas: <strong>${stats.entregas || 0}</strong></div>
          <div>📁 Arquivos: <strong>${stats.arquivos || 0}</strong></div>
        </div>
      `;
      previewEl.style.display = 'block';

      // Atualiza estado do botão baseado no modo
      const mode = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';
      this._handleImportModeChange(mode);

      this._showStatus(statusEl, 'success', '✅ Arquivo válido! Selecione o modo e clique em Importar.');
    } catch (error) {
      console.error('[Backup] ❌ Erro ao ler arquivo:', error);
      this._showStatus(statusEl, 'error', `❌ Erro: ${error.message}`);
      previewEl.style.display = 'none';
      btnImportar.disabled = true;
      this.selectedFile = null;
      this.parsedBackup = null;
    }
  }

  /**
   * Lê arquivo como texto (Promise correta)
   */
  _readFileAsText(file) {
    return new Promise((resolve, reject) => {
      console.log('[BACKUP] FileReader: iniciando leitura...');
      const reader = new FileReader();

      reader.onload = () => {
        console.log('[BACKUP] FileReader: onload disparado');
        resolve(reader.result);
      };

      reader.onerror = () => {
        console.error('[BACKUP] FileReader: onerror disparado', reader.error);
        reject(new Error(`Erro ao ler arquivo: ${reader.error?.message || 'desconhecido'}`));
      };

      reader.onabort = () => {
        console.warn('[BACKUP] FileReader: leitura abortada');
        reject(new Error('Leitura do arquivo foi cancelada'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  // Manter compatibilidade com código legado
  _readFile(file) {
    return this._readFileAsText(file);
  }

  /**
   * Normaliza schema do backup para suportar formatos antigos
   */
  _normalizeBackupSchema(parsed) {
    // Formato novo: { meta, data, stats }
    if (parsed.meta && parsed.data) {
      return parsed;
    }

    // Formato storageAdapter: { meta, localStorage, indexedDB }
    if (parsed.meta && (parsed.localStorage || parsed.indexedDB)) {
      console.log('[BACKUP] Detectado formato storageAdapter, convertendo...');
      const data = {
        ...parsed.indexedDB,
        _localStorage: parsed.localStorage
      };
      return {
        meta: parsed.meta,
        data: data,
        stats: parsed.meta.stats || this._calcularStats(data)
      };
    }

    // Formato legado: dados diretos { unidades, usuarios, empenhos... }
    if (parsed.empenhos || parsed.usuarios || parsed.unidadeOrcamentaria) {
      console.log('[BACKUP] Detectado formato legado, encapsulando...');
      return {
        meta: {
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          appVersion: parsed.appVersion || 'legado',
          dataVersion: parsed.dataVersion || '0.0.0',
          source: 'backup-legado'
        },
        data: parsed,
        stats: this._calcularStats(parsed)
      };
    }

    // Não reconhecido - tentar usar como está
    console.warn('[BACKUP] Formato não reconhecido, tentando usar como data direto');
    return {
      meta: {
        exportedAt: new Date().toISOString(),
        appVersion: 'desconhecido',
        dataVersion: '0.0.0',
        source: 'formato-desconhecido'
      },
      data: parsed,
      stats: this._calcularStats(parsed)
    };
  }

  /**
   * Valida estrutura do backup
   */
  _validateBackupData(backup) {
    const errors = [];

    if (!backup.meta) {
      errors.push('Meta informações ausentes');
    }

    if (!backup.data) {
      errors.push('Dados ausentes');
    }

    if (backup.data && typeof backup.data !== 'object') {
      errors.push('Dados devem ser um objeto');
    }

    // Verificar se há ao menos algum dado útil
    if (backup.data) {
      const hasEmpenhos = Array.isArray(backup.data.empenhos) && backup.data.empenhos.length > 0;
      const hasNFs = Array.isArray(backup.data.notasFiscais) && backup.data.notasFiscais.length > 0;
      const hasUsuarios = Array.isArray(backup.data.usuarios) && backup.data.usuarios.length > 0;
      const hasUnidade = !!backup.data.unidadeOrcamentaria;
      const hasIndexedDB = Object.keys(backup.data).some(
        (k) => Array.isArray(backup.data[k]) && backup.data[k].length > 0
      );

      if (!hasEmpenhos && !hasNFs && !hasUsuarios && !hasUnidade && !hasIndexedDB) {
        errors.push('Backup não contém dados reconhecíveis');
      }
    }

    return errors;
  }

  /**
   * Calcula estatísticas do backup
   */
  _calcularStats(data) {
    return {
      empenhos: Array.isArray(data.empenhos) ? data.empenhos.length : 0,
      notasFiscais: Array.isArray(data.notasFiscais) ? data.notasFiscais.length : 0,
      entregas: Array.isArray(data.entregas) ? data.entregas.length : 0,
      arquivos: Array.isArray(data.arquivos) ? data.arquivos.length : 0,
      usuarios: Array.isArray(data.usuarios) ? data.usuarios.length : 0,
      saldosEmpenhos: Array.isArray(data.saldosEmpenhos) ? data.saldosEmpenhos.length : 0
    };
  }

  /**
   * Manipula mudança no modo de importação
   */
  _handleImportModeChange(mode) {
    const confirmSection = document.getElementById('confirmReplaceSection');
    const confirmInput = document.getElementById('confirmReplaceText');
    const btnImportar = document.getElementById('btnImportarBackupCompleto');

    if (mode === 'replace') {
      confirmSection.style.display = 'block';
      confirmInput.value = '';
      btnImportar.disabled = true;
    } else {
      confirmSection.style.display = 'none';
      // Habilita se tiver arquivo válido
      btnImportar.disabled = !this.parsedBackup;
    }
  }

  /**
   * Valida confirmação de substituição
   */
  _validateReplaceConfirmation(value) {
    const btnImportar = document.getElementById('btnImportarBackupCompleto');
    btnImportar.disabled = value !== 'CONFIRMAR' || !this.parsedBackup;
  }

  /**
   * Importa backup com diagnóstico completo
   */
  async importarBackup() {
    const statusEl = document.getElementById('backupImportStatus');
    const mode = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';

    if (this.serverMode) {
      this._showStatus(
        statusEl,
        'warning',
        '⚠️ Importação local desativada no modo PostgreSQL/VPS. Use rotina de restauração do servidor.'
      );
      return;
    }

    console.group('[BACKUP IMPORT] 🚀 Iniciando importação');
    console.log('[BACKUP] Modo:', mode);
    console.log('[BACKUP] Backup carregado:', !!this.parsedBackup);

    if (!this.parsedBackup) {
      console.error('[BACKUP] ❌ Nenhum backup parseado');
      console.groupEnd();
      this._showStatus(statusEl, 'error', '❌ Nenhum arquivo selecionado');
      return;
    }

    try {
      this._showStatus(statusEl, 'info', '⏳ Importando dados...');
      console.log('[BACKUP] Stats do backup:', this.parsedBackup.stats);

      const resultado = { stores: {}, total: 0 };

      if (mode === 'replace') {
        console.log('[BACKUP] Executando REPLACE (substituição total)...');
        await this._importReplace(this.parsedBackup.data, resultado);
      } else {
        console.log('[BACKUP] Executando MERGE (mesclagem)...');
        await this._importMerge(this.parsedBackup.data, resultado);
      }

      // Log do resultado
      console.log('[BACKUP] ✅ Importação concluída:', resultado);

      // Self-check: verificar se dados foram realmente salvos
      await this._selfCheckImport(resultado);

      // Montar mensagem de sucesso detalhada
      const storesSummary = Object.entries(resultado.stores)
        .filter(([, count]) => count > 0)
        .map(([store, count]) => `${store}: ${count}`)
        .join(', ');

      const mensagemSucesso =
        `✅ Backup importado!<br>` +
        `📊 Total: ${resultado.total} registros<br>` +
        `📁 ${storesSummary || 'Nenhum dado novo'}`;

      this._showStatus(statusEl, 'success', mensagemSucesso);
      console.groupEnd();

      // Notificar UI para recarregar dados (sem reload completo se possível)
      await this._recarregarUIAposImport();

      // Mostrar toast de sucesso
      if (window.app?.showSuccess) {
        window.app.showSuccess(`Importação concluída: ${resultado.total} registros`);
      }
    } catch (error) {
      console.error('[BACKUP] ❌ Erro ao importar:', error);
      console.groupEnd();
      this._showStatus(statusEl, 'error', `❌ Erro: ${error.message}`);
    }
  }

  /**
   * Self-check: verifica se os dados foram realmente persistidos
   */
  async _selfCheckImport(resultado) {
    console.log('[BACKUP] 🔍 Self-check: verificando persistência...');

    try {
      const db = window.dbManager;

      // Verificar empenhos
      if (resultado.stores.empenhos > 0) {
        const empenhos = await db.getAll('empenhos');
        console.log(
          `[BACKUP] Self-check empenhos: esperado ~${resultado.stores.empenhos}, encontrado ${empenhos?.length || 0}`
        );

        if (empenhos && empenhos.length > 0) {
          console.log('[BACKUP] ✅ Empenhos persistidos corretamente');
        } else {
          console.warn('[BACKUP] ⚠️ Empenhos não encontrados após import!');
        }
      }

      // Verificar config
      if (resultado.stores.config > 0) {
        const unidade = await db.get('config', 'unidadeOrcamentaria');
        console.log('[BACKUP] Self-check config:', unidade ? 'OK' : 'não encontrado');
      }

      console.log('[BACKUP] ✅ Self-check concluído');
    } catch (e) {
      console.warn('[BACKUP] ⚠️ Self-check falhou:', e);
    }
  }

  /**
   * Recarrega UI após importação sem reload completo
   */
  async _recarregarUIAposImport() {
    console.log('[BACKUP] 🔄 Recarregando UI...');

    try {
      // Emitir evento para que a aplicação recarregue dados
      if (window.eventBus?.emit) {
        window.eventBus.emit('backup:imported', { timestamp: Date.now() });
      }

      // Se tiver acesso ao app, recarregar listagens
      if (window.app) {
        // Recarregar lista de empenhos se a aba estiver ativa
        if (typeof window.app.carregarRelatorioEmpenhos === 'function') {
          await window.app.carregarRelatorioEmpenhos();
        }
        // Recarregar controle de saldos
        if (typeof window.app.carregarControleSaldos === 'function') {
          await window.app.carregarControleSaldos();
        }
      }

      // Dar tempo para UI atualizar, depois perguntar se quer reload
      setTimeout(() => {
        const confirmar = confirm(
          '✅ Importação concluída!\n\n' +
            'Os dados foram importados. Deseja recarregar a página para garantir que todas as telas estejam atualizadas?'
        );
        if (confirmar) {
          window.location.reload();
        }
      }, 500);
    } catch (e) {
      console.warn('[BACKUP] ⚠️ Erro ao recarregar UI:', e);
      // Fallback: reload forçado
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  /**
   * Importação modo SUBSTITUIR - apaga tudo e restaura
   */
  async _importReplace(data, resultado = { stores: {}, total: 0 }) {
    const db = window.dbManager;

    console.group('[BACKUP REPLACE] 🔄 Iniciando substituição completa...');

    try {
      // Limpa stores principais
      console.log('[BACKUP] Limpando stores...');
      await this._clearStore('empenhos');
      await this._clearStore('notasFiscais');
      await this._clearStore('entregas');
      await this._clearStore('arquivos');
      await this._clearStore('saldosEmpenhos');
      console.log('[BACKUP] ✅ Stores limpos');

      // Restaura configurações
      let configCount = 0;
      if (data.unidadeOrcamentaria) {
        await db.put('config', data.unidadeOrcamentaria, 'unidadeOrcamentaria');
        configCount++;
        console.log('[BACKUP] ✅ unidadeOrcamentaria restaurada');
      }
      if (data.usuarios) {
        await db.put('config', data.usuarios, 'usuarios');
        configCount++;
        console.log('[BACKUP] ✅ usuarios restaurados:', Array.isArray(data.usuarios) ? data.usuarios.length : 1);
      }
      if (data.preferencias) {
        await db.put('config', data.preferencias, 'preferencias');
        configCount++;
      }
      if (data.rede) {
        await db.put('config', data.rede, 'rede');
        configCount++;
      }
      resultado.stores.config = configCount;
      resultado.total += configCount;

      // Restaura dados
      resultado.stores.empenhos = await this._restoreArray('empenhos', data.empenhos);
      resultado.stores.notasFiscais = await this._restoreArray('notasFiscais', data.notasFiscais);
      resultado.stores.entregas = await this._restoreArray('entregas', data.entregas);
      resultado.stores.arquivos = await this._restoreArray('arquivos', data.arquivos);
      resultado.stores.saldosEmpenhos = await this._restoreArray('saldosEmpenhos', data.saldosEmpenhos);

      resultado.total +=
        (resultado.stores.empenhos || 0) +
        (resultado.stores.notasFiscais || 0) +
        (resultado.stores.entregas || 0) +
        (resultado.stores.arquivos || 0) +
        (resultado.stores.saldosEmpenhos || 0);

      console.log('[BACKUP] ✅ Substituição completa concluída');
      console.groupEnd();
    } catch (error) {
      console.error('[BACKUP] ❌ Erro na substituição:', error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * Importação modo MESCLAR - adiciona sem duplicar
   */
  async _importMerge(data, resultado = { stores: {}, total: 0 }) {
    const db = window.dbManager;

    console.group('[BACKUP MERGE] 🔀 Iniciando mesclagem...');

    try {
      let configCount = 0;

      // Mescla configurações (sobrescreve se não existir)
      if (data.unidadeOrcamentaria) {
        const existing = await db.get('config', 'unidadeOrcamentaria');
        if (!existing) {
          await db.put('config', data.unidadeOrcamentaria, 'unidadeOrcamentaria');
          configCount++;
          console.log('[BACKUP] ✅ unidadeOrcamentaria importada (não existia)');
        } else {
          console.log('[BACKUP] ⏭️ unidadeOrcamentaria já existe, pulando');
        }
      }

      // Mescla usuários (adiciona apenas novos por login)
      if (data.usuarios && Array.isArray(data.usuarios)) {
        const existingUsers = (await db.get('config', 'usuarios')) || [];
        const existingLogins = new Set(existingUsers.map((u) => u.login));
        const newUsers = data.usuarios.filter((u) => !existingLogins.has(u.login));
        if (newUsers.length > 0) {
          await db.put('config', [...existingUsers, ...newUsers], 'usuarios');
          configCount += newUsers.length;
          console.log(`[BACKUP] ✅ ${newUsers.length} usuários novos adicionados`);
        } else {
          console.log('[BACKUP] ⏭️ Todos usuários já existem');
        }
      }

      resultado.stores.config = configCount;
      resultado.total += configCount;

      // Mescla empenhos (por id ou slug)
      resultado.stores.empenhos = await this._mergeArray('empenhos', data.empenhos, ['id', 'slug']);

      // Mescla notas fiscais (por id ou numero)
      resultado.stores.notasFiscais = await this._mergeArray('notasFiscais', data.notasFiscais, ['id', 'numero']);

      // Mescla entregas (por id)
      resultado.stores.entregas = await this._mergeArray('entregas', data.entregas, ['id']);

      // Mescla arquivos (por id ou hash)
      resultado.stores.arquivos = await this._mergeArray('arquivos', data.arquivos, ['id', 'hash']);

      // Mescla saldos (por id)
      resultado.stores.saldosEmpenhos = await this._mergeArray('saldosEmpenhos', data.saldosEmpenhos, ['id']);

      resultado.total +=
        (resultado.stores.empenhos || 0) +
        (resultado.stores.notasFiscais || 0) +
        (resultado.stores.entregas || 0) +
        (resultado.stores.arquivos || 0) +
        (resultado.stores.saldosEmpenhos || 0);

      console.log('[BACKUP] ✅ Mesclagem concluída');
      console.groupEnd();
    } catch (error) {
      console.error('[BACKUP] ❌ Erro na mesclagem:', error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * Limpa uma store
   */
  async _clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const db = window.dbManager.db;
      if (!db.objectStoreNames.contains(storeName)) {
        console.warn(`[BACKUP] Store ${storeName} não existe, pulando clear`);
        resolve();
        return;
      }
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => {
        console.log(`[BACKUP] 🗑️ Store ${storeName} limpa`);
        resolve();
      };
      req.onerror = () => {
        console.error(`[BACKUP] ❌ Erro ao limpar ${storeName}:`, req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Restaura array de dados em uma store
   * @returns {number} Quantidade de itens restaurados
   */
  async _restoreArray(storeName, items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 0;
    }

    const db = window.dbManager;
    let restored = 0;
    let errors = 0;

    for (const item of items) {
      try {
        await db.put(storeName, item);
        restored++;
      } catch (e) {
        errors++;
        console.warn(`[BACKUP] ⚠️ Erro ao restaurar item em ${storeName}:`, e.message);
      }
    }

    console.log(`[BACKUP] 📥 ${storeName}: ${restored} restaurados` + (errors > 0 ? `, ${errors} erros` : ''));
    return restored;
  }

  /**
   * Mescla array de dados sem duplicar
   * @returns {number} Quantidade de itens adicionados
   */
  async _mergeArray(storeName, items, keyFields) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 0;
    }

    const db = window.dbManager;
    let existing = [];

    try {
      existing = await db.getAll(storeName);
    } catch (e) {
      console.warn(`[BACKUP] ⚠️ Erro ao buscar existentes de ${storeName}:`, e);
    }

    // Cria set de chaves existentes
    const existingKeys = new Set();
    for (const item of existing) {
      for (const field of keyFields) {
        if (item[field]) {
          existingKeys.add(`${field}:${item[field]}`);
        }
      }
    }

    // Adiciona apenas itens que não existem
    let added = 0;
    let skipped = 0;
    for (const item of items) {
      const isDuplicate = keyFields.some((field) => item[field] && existingKeys.has(`${field}:${item[field]}`));

      if (!isDuplicate) {
        try {
          await db.put(storeName, item);
          added++;
          // Adiciona às chaves existentes para evitar duplicatas dentro do próprio backup
          for (const field of keyFields) {
            if (item[field]) {
              existingKeys.add(`${field}:${item[field]}`);
            }
          }
        } catch (e) {
          console.warn(`[BACKUP] ⚠️ Erro ao mesclar item em ${storeName}:`, e.message);
        }
      } else {
        skipped++;
      }
    }

    console.log(`[BACKUP] 📥 ${storeName}: ${added} novos` + (skipped > 0 ? `, ${skipped} já existiam` : ''));
    return added;
  }

  // ============================================================================
  // DADOS DE TESTE
  // ============================================================================

  /**
   * Carrega dados de teste
   */
  async carregarDadosTeste() {
    const statusEl = document.getElementById('testDataStatus');
    const mode = document.querySelector('input[name="testDataMode"]:checked')?.value || 'merge';

    if (this.serverMode) {
      this._showStatus(statusEl, 'warning', '⚠️ Dados de teste locais desativados no modo PostgreSQL/VPS.');
      return;
    }

    try {
      this._showStatus(statusEl, 'info', '⏳ Gerando dados de teste...');

      const testData = this._gerarDadosTeste();

      if (mode === 'replace') {
        // Confirma antes de substituir
        if (!confirm('⚠️ Isso vai APAGAR todos os dados existentes. Continuar?')) {
          this._showStatus(statusEl, 'warning', '⚠️ Operação cancelada');
          return;
        }
        await this._importReplace(testData);
      } else {
        await this._importMerge(testData);
      }

      this._showStatus(statusEl, 'success', '✅ Dados de teste carregados! Recarregando...');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('[Backup] ❌ Erro ao carregar dados de teste:', error);
      this._showStatus(statusEl, 'error', `❌ Erro: ${error.message}`);
    }
  }

  /**
   * Gera conjunto de dados de teste
   */
  _gerarDadosTeste() {
    const now = new Date();
    const anoAtual = now.getFullYear();

    return {
      // Unidade Gestora
      unidadeOrcamentaria: {
        razaoSocial: 'Instituto Federal Baiano - Campus Teste',
        cnpj: '10.724.903/0001-79',
        ug: '158129',
        uasg: '158129',
        endereco: 'Rua do Teste, 123 - Centro',
        cidade: 'Salvador',
        uf: 'BA',
        cep: '40000-000',
        telefone: '(71) 3000-0000',
        email: 'almoxarifado@teste.edu.br'
      },

      // Usuários
      usuarios: [
        {
          nome: 'Administrador Teste',
          login: 'admin',
          senhaTemporaria: true,
          perfil: 'administrador',
          ativo: true,
          criadoEm: now.toISOString()
        },
        {
          nome: 'Almoxarife Teste',
          login: 'almoxarife',
          senhaTemporaria: true,
          perfil: 'almoxarife',
          ativo: true,
          criadoEm: now.toISOString()
        },
        {
          nome: 'Consulta Teste',
          login: 'consulta',
          senhaTemporaria: true,
          perfil: 'consulta',
          ativo: true,
          criadoEm: now.toISOString()
        }
      ],

      // Empenhos
      empenhos: [
        {
          id: 1,
          slug: `${anoAtual}-000001`,
          ano: anoAtual,
          numero: '000001',
          dataEmpenho: `${anoAtual}-01-15`,
          naturezaDespesa: '339030',
          fornecedor: 'Papelaria Brasil LTDA',
          cnpj: '12.345.678/0001-90',
          valorTotalEmpenho: 5000.0,
          processoSuap: '23327.000001.2026-01',
          statusValidacao: 'validado',
          validadoEm: now.toISOString(),
          validadoPor: 'admin',
          itens: [
            {
              seq: 1,
              descricao: 'Resma de papel A4 75g',
              unidade: 'UN',
              quantidade: 100,
              valorUnitario: 25.0,
              valorTotal: 2500.0,
              subelementoCodigo: '16',
              subelementoNome: 'Material de Expediente'
            },
            {
              seq: 2,
              descricao: 'Caneta esferográfica azul',
              unidade: 'UN',
              quantidade: 500,
              valorUnitario: 1.5,
              valorTotal: 750.0,
              subelementoCodigo: '16',
              subelementoNome: 'Material de Expediente'
            },
            {
              seq: 3,
              descricao: 'Grampeador de mesa',
              unidade: 'UN',
              quantidade: 25,
              valorUnitario: 35.0,
              valorTotal: 875.0,
              subelementoCodigo: '16',
              subelementoNome: 'Material de Expediente'
            },
            {
              seq: 4,
              descricao: 'Envelope pardo A4',
              unidade: 'UN',
              quantidade: 500,
              valorUnitario: 0.75,
              valorTotal: 375.0,
              subelementoCodigo: '16',
              subelementoNome: 'Material de Expediente'
            },
            {
              seq: 5,
              descricao: 'Pasta arquivo morto',
              unidade: 'UN',
              quantidade: 100,
              valorUnitario: 5.0,
              valorTotal: 500.0,
              subelementoCodigo: '16',
              subelementoNome: 'Material de Expediente'
            }
          ]
        },
        {
          id: 2,
          slug: `${anoAtual}-000002`,
          ano: anoAtual,
          numero: '000002',
          dataEmpenho: `${anoAtual}-02-10`,
          naturezaDespesa: '339030',
          fornecedor: 'InfoTech Equipamentos ME',
          cnpj: '98.765.432/0001-10',
          valorTotalEmpenho: 12500.0,
          processoSuap: '23327.000002.2026-02',
          statusValidacao: 'validado',
          validadoEm: now.toISOString(),
          validadoPor: 'almoxarife',
          itens: [
            {
              seq: 1,
              descricao: 'Toner HP 85A',
              unidade: 'UN',
              quantidade: 20,
              valorUnitario: 150.0,
              valorTotal: 3000.0,
              subelementoCodigo: '17',
              subelementoNome: 'Material de Processamento de Dados'
            },
            {
              seq: 2,
              descricao: 'Mouse USB óptico',
              unidade: 'UN',
              quantidade: 50,
              valorUnitario: 25.0,
              valorTotal: 1250.0,
              subelementoCodigo: '17',
              subelementoNome: 'Material de Processamento de Dados'
            },
            {
              seq: 3,
              descricao: 'Teclado USB ABNT2',
              unidade: 'UN',
              quantidade: 50,
              valorUnitario: 45.0,
              valorTotal: 2250.0,
              subelementoCodigo: '17',
              subelementoNome: 'Material de Processamento de Dados'
            },
            {
              seq: 4,
              descricao: 'Pendrive 32GB',
              unidade: 'UN',
              quantidade: 100,
              valorUnitario: 35.0,
              valorTotal: 3500.0,
              subelementoCodigo: '17',
              subelementoNome: 'Material de Processamento de Dados'
            },
            {
              seq: 5,
              descricao: 'Cabo HDMI 2m',
              unidade: 'UN',
              quantidade: 50,
              valorUnitario: 50.0,
              valorTotal: 2500.0,
              subelementoCodigo: '17',
              subelementoNome: 'Material de Processamento de Dados'
            }
          ]
        },
        {
          id: 3,
          slug: `${anoAtual}-000003`,
          ano: anoAtual,
          numero: '000003',
          dataEmpenho: `${anoAtual}-03-05`,
          naturezaDespesa: '339030',
          fornecedor: 'Limpeza Total EIRELI',
          cnpj: '11.222.333/0001-44',
          valorTotalEmpenho: 8750.0,
          processoSuap: '23327.000003.2026-03',
          statusValidacao: 'rascunho',
          itens: [
            {
              seq: 1,
              descricao: 'Detergente líquido 5L',
              unidade: 'UN',
              quantidade: 100,
              valorUnitario: 15.0,
              valorTotal: 1500.0,
              subelementoCodigo: '22',
              subelementoNome: 'Material de Limpeza e Produtos de Higienização'
            },
            {
              seq: 2,
              descricao: 'Desinfetante 5L',
              unidade: 'UN',
              quantidade: 100,
              valorUnitario: 20.0,
              valorTotal: 2000.0,
              subelementoCodigo: '22',
              subelementoNome: 'Material de Limpeza e Produtos de Higienização'
            },
            {
              seq: 3,
              descricao: 'Papel higiênico fardo',
              unidade: 'FD',
              quantidade: 50,
              valorUnitario: 65.0,
              valorTotal: 3250.0,
              subelementoCodigo: '22',
              subelementoNome: 'Material de Limpeza e Produtos de Higienização'
            },
            {
              seq: 4,
              descricao: 'Saco de lixo 100L',
              unidade: 'PCT',
              quantidade: 100,
              valorUnitario: 20.0,
              valorTotal: 2000.0,
              subelementoCodigo: '22',
              subelementoNome: 'Material de Limpeza e Produtos de Higienização'
            }
          ]
        },
        {
          id: 4,
          slug: `${anoAtual}-000004`,
          ano: anoAtual,
          numero: '000004',
          dataEmpenho: `${anoAtual}-04-20`,
          naturezaDespesa: '449052',
          fornecedor: 'Móveis Corporativos SA',
          cnpj: '55.666.777/0001-88',
          valorTotalEmpenho: 35000.0,
          processoSuap: '23327.000004.2026-04',
          statusValidacao: 'validado',
          validadoEm: now.toISOString(),
          validadoPor: 'admin',
          itens: [
            {
              seq: 1,
              descricao: 'Mesa de escritório 1.40m',
              unidade: 'UN',
              quantidade: 10,
              valorUnitario: 800.0,
              valorTotal: 8000.0,
              subelementoCodigo: '52',
              subelementoNome: 'Equipamentos e Material Permanente'
            },
            {
              seq: 2,
              descricao: 'Cadeira giratória executiva',
              unidade: 'UN',
              quantidade: 10,
              valorUnitario: 600.0,
              valorTotal: 6000.0,
              subelementoCodigo: '52',
              subelementoNome: 'Equipamentos e Material Permanente'
            },
            {
              seq: 3,
              descricao: 'Armário de aço 4 portas',
              unidade: 'UN',
              quantidade: 5,
              valorUnitario: 1200.0,
              valorTotal: 6000.0,
              subelementoCodigo: '52',
              subelementoNome: 'Equipamentos e Material Permanente'
            },
            {
              seq: 4,
              descricao: 'Estante de aço 5 prateleiras',
              unidade: 'UN',
              quantidade: 10,
              valorUnitario: 450.0,
              valorTotal: 4500.0,
              subelementoCodigo: '52',
              subelementoNome: 'Equipamentos e Material Permanente'
            },
            {
              seq: 5,
              descricao: 'Gaveteiro volante',
              unidade: 'UN',
              quantidade: 10,
              valorUnitario: 350.0,
              valorTotal: 3500.0,
              subelementoCodigo: '52',
              subelementoNome: 'Equipamentos e Material Permanente'
            },
            {
              seq: 6,
              descricao: 'Ar condicionado Split 12000 BTUs',
              unidade: 'UN',
              quantidade: 5,
              valorUnitario: 1400.0,
              valorTotal: 7000.0,
              subelementoCodigo: '52',
              subelementoNome: 'Equipamentos e Material Permanente'
            }
          ]
        },
        {
          id: 5,
          slug: `${anoAtual}-000005`,
          ano: anoAtual,
          numero: '000005',
          dataEmpenho: `${anoAtual}-05-15`,
          naturezaDespesa: '339030',
          fornecedor: 'Elétrica Geral LTDA',
          cnpj: '22.333.444/0001-55',
          valorTotalEmpenho: 4200.0,
          processoSuap: '23327.000005.2026-05',
          statusValidacao: 'rascunho',
          itens: [
            {
              seq: 1,
              descricao: 'Lâmpada LED tubular T8',
              unidade: 'UN',
              quantidade: 200,
              valorUnitario: 12.0,
              valorTotal: 2400.0,
              subelementoCodigo: '26',
              subelementoNome: 'Material Elétrico e Eletrônico'
            },
            {
              seq: 2,
              descricao: 'Tomada simples 10A',
              unidade: 'UN',
              quantidade: 100,
              valorUnitario: 8.0,
              valorTotal: 800.0,
              subelementoCodigo: '26',
              subelementoNome: 'Material Elétrico e Eletrônico'
            },
            {
              seq: 3,
              descricao: 'Interruptor simples',
              unidade: 'UN',
              quantidade: 100,
              valorUnitario: 5.0,
              valorTotal: 500.0,
              subelementoCodigo: '26',
              subelementoNome: 'Material Elétrico e Eletrônico'
            },
            {
              seq: 4,
              descricao: 'Extensão elétrica 5m',
              unidade: 'UN',
              quantidade: 25,
              valorUnitario: 20.0,
              valorTotal: 500.0,
              subelementoCodigo: '26',
              subelementoNome: 'Material Elétrico e Eletrônico'
            }
          ]
        }
      ],

      // Notas Fiscais
      notasFiscais: [
        {
          id: 1,
          numero: '001234',
          serie: '1',
          dataEmissao: `${anoAtual}-02-20`,
          empenhoId: 1,
          fornecedor: 'Papelaria Brasil LTDA',
          cnpj: '12.345.678/0001-90',
          valorTotal: 3250.0,
          status: 'conferida',
          itens: [
            { seq: 1, descricao: 'Resma de papel A4 75g', quantidade: 100, valorUnitario: 25.0, valorTotal: 2500.0 },
            { seq: 2, descricao: 'Caneta esferográfica azul', quantidade: 500, valorUnitario: 1.5, valorTotal: 750.0 }
          ]
        },
        {
          id: 2,
          numero: '005678',
          serie: '1',
          dataEmissao: `${anoAtual}-03-15`,
          empenhoId: 2,
          fornecedor: 'InfoTech Equipamentos ME',
          cnpj: '98.765.432/0001-10',
          valorTotal: 6000.0,
          status: 'conferida',
          itens: [
            { seq: 1, descricao: 'Toner HP 85A', quantidade: 20, valorUnitario: 150.0, valorTotal: 3000.0 },
            { seq: 2, descricao: 'Mouse USB óptico', quantidade: 50, valorUnitario: 25.0, valorTotal: 1250.0 },
            { seq: 3, descricao: 'Teclado USB ABNT2', quantidade: 50, valorUnitario: 45.0, valorTotal: 1750.0 }
          ]
        },
        {
          id: 3,
          numero: '009012',
          serie: '1',
          dataEmissao: `${anoAtual}-05-01`,
          empenhoId: 4,
          fornecedor: 'Móveis Corporativos SA',
          cnpj: '55.666.777/0001-88',
          valorTotal: 14000.0,
          status: 'pendente',
          itens: [
            { seq: 1, descricao: 'Mesa de escritório 1.40m', quantidade: 10, valorUnitario: 800.0, valorTotal: 8000.0 },
            {
              seq: 2,
              descricao: 'Cadeira giratória executiva',
              quantidade: 10,
              valorUnitario: 600.0,
              valorTotal: 6000.0
            }
          ]
        }
      ],

      // Entregas
      entregas: [],

      // Arquivos (metadados apenas)
      arquivos: [],

      // Saldos
      saldosEmpenhos: []
    };
  }

  // ============================================================================
  // RESETAR DADOS
  // ============================================================================

  /**
   * Valida confirmação de reset
   */
  _validateResetConfirmation(value) {
    const btnReset = document.getElementById('btnResetarTudo');
    btnReset.disabled = value !== 'RESETAR TUDO';
  }

  /**
   * Reseta todos os dados
   */
  async resetarTudo() {
    const statusEl = document.getElementById('resetStatus');

    if (this.serverMode) {
      this._showStatus(statusEl, 'warning', '⚠️ Reset local desativado no modo PostgreSQL/VPS.');
      return;
    }

    if (!this.isDevMode) {
      this._showStatus(statusEl, 'error', '❌ Função disponível apenas em modo DEV');
      return;
    }

    try {
      this._showStatus(statusEl, 'info', '⏳ Limpando todos os dados...');

      // Limpa todas as stores
      await this._clearStore('empenhos');
      await this._clearStore('notasFiscais');
      await this._clearStore('entregas');
      await this._clearStore('arquivos');
      await this._clearStore('saldosEmpenhos');

      // Limpa configurações (exceto estrutura crítica)
      const db = window.dbManager;
      await db.delete('config', 'unidadeOrcamentaria');
      await db.delete('config', 'usuarios');
      await db.delete('config', 'preferencias');
      await db.delete('config', 'rede');

      // Limpa localStorage (seletivo)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('SINGEM_') || key.startsWith('SINGEM_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      this._showStatus(statusEl, 'success', '✅ Todos os dados foram removidos! Recarregando...');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('[Backup] ❌ Erro ao resetar:', error);
      this._showStatus(statusEl, 'error', `❌ Erro: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  /**
   * Exibe status na UI
   */
  _showStatus(element, type, message) {
    if (!element) {
      return;
    }

    const colors = {
      info: { bg: '#e7f3ff', border: '#2196f3', text: '#1565c0' },
      success: { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
      error: { bg: '#ffebee', border: '#f44336', text: '#c62828' },
      warning: { bg: '#fff3e0', border: '#ff9800', text: '#e65100' }
    };

    const style = colors[type] || colors.info;

    element.innerHTML = message;
    element.style.cssText = `
      padding: 12px;
      border-radius: 8px;
      background: ${style.bg};
      border: 1px solid ${style.border};
      color: ${style.text};
    `;
  }

  /**
   * Carrega dados quando a aba é selecionada
   */
  async load() {
    console.log('[Backup] 📂 Aba de backup carregada');
    // Atualiza visibilidade DEV
    this._updateDevVisibility();

    // Re-tenta bindar botões (caso não tenham sido bindados no init)
    this._bindBackupCompletoDados();
  }
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

// Instância global
const backupManager = new BackupManager();

// Exporta para uso externo
window.backupManager = backupManager;

/**
 * Garante que o banco está pronto antes de inicializar
 */
async function initWhenReady() {
  // Aguarda banco estar pronto
  if (window.ensureDBReady) {
    try {
      await window.ensureDBReady();
    } catch (e) {
      console.warn('[Backup] ensureDBReady falhou:', e);
    }
  }

  // Inicializa módulo (tenta encontrar qualquer botão de backup)
  const btnExportar = document.getElementById('btnExportarBackupCompleto');
  const btnExportarDiag = document.getElementById('btnExportarBackup');
  const btnImportar = document.getElementById('btnImportarBackup');

  if (btnExportar || btnExportarDiag || btnImportar) {
    await backupManager.init();
  } else {
    // Se não existir ainda, aguarda DOM
    console.log('[Backup] Aguardando elementos no DOM...');
  }
}

// Tenta inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
  initWhenReady();
}

// Fallback: inicializa quando dbManager estiver pronto
if (window.dbManager?.db) {
  initWhenReady();
}

export default backupManager;
