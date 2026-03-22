/**
 * Configurações → Preferências
 * Gerencia preferências gerais do sistema
 */

import { applyThemePreference, initTheme, resolveTheme } from '../ui/themeManager.js';
import {
  feedbackMarkup,
  renderInto,
  reportMarkup,
  reportTableMarkup,
  setFeedback,
  tableCellMarkup,
  tableRowMarkup
} from './renderUtils.js';

// Import backupManagerCore removido - agora usamos dbManager.exportBackup/importBackup diretamente

class SettingsPreferencias {
  constructor() {
    this.preferencias = null;
    this.serverMode = window.CONFIG?.storage?.mode === 'server';
    this.init();
  }

  init() {
    initTheme();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Salvar preferências
    document.getElementById('formPreferencias')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.salvar();
    });

    // Aplicar tema
    document.getElementById('tema')?.addEventListener('change', (e) => {
      this.aplicarTema(e.target.value);
    });

    // ========================================
    // BACKUP E RESTAURAÇÃO (ÚNICO LOCAL)
    // ========================================
    this._setupBackupListeners();

    // ========================================
    // EXPORTAR CSV (movido do header Exportar)
    // ========================================
    this._setupExportCSVListeners();

    // Limpar banco de dados
    document.getElementById('btnLimparBanco')?.addEventListener('click', async () => {
      await this.limparBancoDados();
    });
  }

  /**
   * Configura listeners de exportação CSV (movido do botão Exportar do header)
   */
  _setupExportCSVListeners() {
    // Exportar Notas Fiscais CSV
    const btnExportarNF = document.getElementById('btnExportarNFcsv');
    if (btnExportarNF && !btnExportarNF.dataset.bound) {
      btnExportarNF.dataset.bound = '1';
      btnExportarNF.addEventListener('click', async () => {
        console.log('[Preferencias] 🖱️ Exportar NFs CSV');
        await this._handleExportarCSV('nf');
      });
    }

    // Exportar Empenhos CSV
    const btnExportarEmpenhos = document.getElementById('btnExportarEmpenhosCSV');
    if (btnExportarEmpenhos && !btnExportarEmpenhos.dataset.bound) {
      btnExportarEmpenhos.dataset.bound = '1';
      btnExportarEmpenhos.addEventListener('click', async () => {
        console.log('[Preferencias] 🖱️ Exportar Empenhos CSV');
        await this._handleExportarCSV('empenhos');
      });
    }
  }

  /**
   * Handler para exportar dados em CSV
   * @param {string} tipo - 'nf' ou 'empenhos'
   */
  async _handleExportarCSV(tipo) {
    try {
      const statusEl = document.getElementById('backupStatusPref');

      if (tipo === 'nf') {
        const nfs = this.serverMode
          ? await window.dbManager.buscarNotasFiscais()
          : await window.dbManager.getAll('notasFiscais');
        if (!nfs || nfs.length === 0) {
          if (statusEl) {
            this._showStatus(statusEl, 'warning', '⚠️ Nenhuma Nota Fiscal encontrada para exportar.');
          }
          return;
        }
        if (window.CSVExporter) {
          await window.CSVExporter.exportarNotasFiscais(nfs);
          if (statusEl) {
            this._showStatus(statusEl, 'success', `✅ ${nfs.length} Nota(s) Fiscal(is) exportada(s) com sucesso!`);
          }
        } else {
          throw new Error('Módulo CSVExporter não disponível');
        }
      } else if (tipo === 'empenhos') {
        const empenhos = this.serverMode
          ? await window.dbManager.buscarEmpenhos(true)
          : await window.dbManager.getAll('empenhos');
        if (!empenhos || empenhos.length === 0) {
          if (statusEl) {
            this._showStatus(statusEl, 'warning', '⚠️ Nenhum Empenho encontrado para exportar.');
          }
          return;
        }
        if (window.CSVExporter) {
          await window.CSVExporter.exportarEmpenhos(empenhos);
          if (statusEl) {
            this._showStatus(statusEl, 'success', `✅ ${empenhos.length} Empenho(s) exportado(s) com sucesso!`);
          }
        } else {
          throw new Error('Módulo CSVExporter não disponível');
        }
      }
    } catch (error) {
      console.error('[Preferencias] Erro ao exportar CSV:', error);
      const statusEl = document.getElementById('backupStatusPref');
      if (statusEl) {
        this._showStatus(statusEl, 'error', `❌ Erro ao exportar: ${error.message}`);
      }
    }
  }

  /**
   * Configura listeners de backup (único local no sistema)
   */
  _setupBackupListeners() {
    // Exportar backup
    const btnExportar = document.getElementById('btnExportarBackupPref');
    if (btnExportar && !btnExportar.dataset.bound) {
      btnExportar.dataset.bound = '1';
      btnExportar.addEventListener('click', async () => {
        console.log('[Preferencias] 🖱️ Clique em Exportar Backup');
        await this._handleExportarBackup();
      });
      console.log('[Preferencias] ✅ Listener exportar backup anexado');
    }

    // Importar backup
    const btnImportar = document.getElementById('btnImportarBackupPref');
    if (btnImportar && !btnImportar.dataset.bound) {
      btnImportar.dataset.bound = '1';
      btnImportar.addEventListener('click', async () => {
        console.log('[Preferencias] 🖱️ Clique em Importar Backup');
        await this._handleImportarBackup();
      });
      console.log('[Preferencias] ✅ Listener importar backup anexado');
    }

    // Verificar dados no banco
    const btnVerificar = document.getElementById('btnVerificarDadosPref');
    if (btnVerificar && !btnVerificar.dataset.bound) {
      btnVerificar.dataset.bound = '1';
      btnVerificar.addEventListener('click', async () => {
        console.log('[Preferencias] 🖱️ Clique em Verificar Dados');
        await this._handleVerificarDados();
      });
      console.log('[Preferencias] ✅ Listener verificar dados anexado');
    }
  }

  /**
   * Handler para verificar dados no banco
   */
  async _handleVerificarDados() {
    const resultEl = document.getElementById('dadosBancoResult');
    if (!resultEl) {
      return;
    }

    renderInto(
      resultEl,
      feedbackMarkup(
        'info',
        this.serverMode ? '⏳ Verificando dados na API PostgreSQL...' : '⏳ Verificando dados na base local legada...'
      ),
      { reveal: true }
    );

    try {
      if (!window.dbManager?.db) {
        throw new Error('Banco de dados não inicializado');
      }

      console.log('[Preferencias] 🔍 Verificando dados no banco...');

      const empenhos = this.serverMode
        ? await window.dbManager.buscarEmpenhos(true)
        : await window.dbManager.getAll('empenhos');
      const notasFiscais = this.serverMode
        ? await window.dbManager.buscarNotasFiscais()
        : await window.dbManager.getAll('notasFiscais');
      const arquivos = this.serverMode ? [] : await window.dbManager.getAll('arquivos');
      const entregas = this.serverMode ? [] : await window.dbManager.getAll('entregas');
      const saldos = this.serverMode ? [] : await window.dbManager.getAll('saldosEmpenhos');

      // Log detalhado no console
      console.log(
        this.serverMode
          ? '[Preferencias] 📊 Dados encontrados na API PostgreSQL:'
          : '[Preferencias] 📊 Dados encontrados na base local legada:'
      );
      console.log('  - Empenhos:', empenhos.length);
      console.log('  - Notas Fiscais:', notasFiscais.length);
      console.log('  - Arquivos:', arquivos.length);
      console.log('  - Entregas:', entregas.length);
      console.log('  - Saldos:', saldos.length);

      if (empenhos.length > 0) {
        console.log('[Preferencias] 📋 Primeiro empenho:', empenhos[0]);
      }

      // Contar arquivos por tipo
      const arquivosEmpenho = arquivos.filter((a) => a.tipoDocumento === 'empenho').length;
      const arquivosNF = arquivos.filter((a) => a.tipoDocumento === 'notaFiscal').length;

      // Contar empenhos com/sem arquivo
      const empenhosComArquivo = empenhos.filter((e) => {
        return arquivos.some((a) => a.tipoDocumento === 'empenho' && a.documentoId === e.id);
      }).length;

      // Buscar unidades e usuários da config
      const configRecords = await window.dbManager.getAll('config');
      const unidadesConfig = configRecords.find((c) => c.id === 'todasUnidades');
      const usuariosConfig = configRecords.find((c) => c.id === 'usuarios');
      const numUnidades = unidadesConfig?.unidades?.length || 0;
      const numUsuarios = usuariosConfig?.usuarios?.length || 0;

      const empenhosSemArquivo = empenhos.length - empenhosComArquivo;

      // Storage no modo banco/API
      const storageStatus = '✅ Banco/API ativo (sem diretório externo)';
      const rows = [
        tableRowMarkup([
          tableCellMarkup({ html: '📋 Empenhos' }),
          tableCellMarkup({
            html: empenhos.length,
            className: `settings-report__count settings-report__count--${empenhos.length > 0 ? 'success' : 'error'}`
          })
        ]),
        tableRowMarkup([
          tableCellMarkup({ html: '↳ Com arquivo vinculado', className: 'settings-report__label--indent' }),
          tableCellMarkup({
            html: empenhosComArquivo,
            className: `settings-report__count settings-report__count--${empenhosComArquivo > 0 ? 'success' : 'error'}`
          })
        ]),
        tableRowMarkup([
          tableCellMarkup({ html: '↳ Sem arquivo vinculado', className: 'settings-report__label--indent' }),
          tableCellMarkup({
            html: empenhosSemArquivo,
            className: `settings-report__count settings-report__count--${empenhosSemArquivo > 0 ? 'warning' : 'success'}`
          })
        ]),
        tableRowMarkup([
          tableCellMarkup({ html: '📄 Notas Fiscais' }),
          tableCellMarkup({ html: notasFiscais.length, className: 'settings-report__count' })
        ]),
        tableRowMarkup([
          tableCellMarkup({ html: '📎 Arquivos (PDFs)' }),
          tableCellMarkup({ html: arquivos.length, className: 'settings-report__count' })
        ]),
        tableRowMarkup([
          tableCellMarkup({ html: '↳ Empenhos', className: 'settings-report__label--indent' }),
          tableCellMarkup({ html: arquivosEmpenho, className: 'settings-report__count' })
        ]),
        tableRowMarkup([
          tableCellMarkup({ html: '↳ Notas Fiscais', className: 'settings-report__label--indent' }),
          tableCellMarkup({ html: arquivosNF, className: 'settings-report__count' })
        ]),
        tableRowMarkup([
          tableCellMarkup({ html: '🚚 Entregas' }),
          tableCellMarkup({ html: entregas.length, className: 'settings-report__count' })
        ]),
        tableRowMarkup([
          tableCellMarkup({ html: '💰 Saldos' }),
          tableCellMarkup({ html: saldos.length, className: 'settings-report__count' })
        ]),
        tableRowMarkup(
          [
            tableCellMarkup({ html: '🏢 Unidades' }),
            tableCellMarkup({ html: numUnidades, className: 'settings-report__count' })
          ],
          { rowClass: 'settings-report__row--muted' }
        ),
        tableRowMarkup(
          [
            tableCellMarkup({ html: '👤 Usuários' }),
            tableCellMarkup({ html: numUsuarios, className: 'settings-report__count' })
          ],
          { rowClass: 'settings-report__row--muted' }
        )
      ];

      renderInto(
        resultEl,
        reportMarkup({
          title: `📊 Dados em ${this.serverMode ? 'API PostgreSQL (VPS)' : 'Base local legada (ControleMaterialDB)'}`,
          content: `
            ${reportTableMarkup({
              headers: ['Store', { label: 'Registros', className: 'is-center' }],
              rows
            })}

            <h4 class="settings-report__title">📁 Configuração de Storage</h4>
            ${feedbackMarkup('success', storageStatus)}

            ${
              !this.serverMode && empenhos.length > 0 && empenhosComArquivo === 0
                ? feedbackMarkup(
                    'warning',
                    `<strong>⚠️ Atenção:</strong> Você tem ${empenhos.length} empenho(s) no banco, mas nenhum tem arquivo PDF vinculado.<br>Os empenhos só aparecem na página principal quando têm um PDF de Nota de Empenho vinculado.<br><br><strong>Solução:</strong> Vá para a página principal e faça upload dos PDFs das Notas de Empenho.`
                  )
                : ''
            }

            ${
              empenhos.length === 0
                ? feedbackMarkup(
                    'error',
                    '<strong>❌ Nenhum empenho encontrado no banco.</strong><br>Se você acabou de importar um backup, o import pode ter falhado.<br>Verifique o console (F12) para mais detalhes.'
                  )
                : ''
            }
          `
        }),
        { reveal: true }
      );
    } catch (error) {
      console.error('[Preferencias] Erro ao verificar dados:', error);
      renderInto(resultEl, feedbackMarkup('error', `❌ Erro: ${error.message}`), {
        reveal: true
      });
    }
  }

  /**
   * Handler para exportar backup - VERSÃO COMPLETA
   * Salva automaticamente na pasta SINGEM/04_BACKUPS/manual/ se configurada
   */
  async _handleExportarBackup() {
    const statusEl = document.getElementById('backupStatusPref');
    const btn = document.getElementById('btnExportarBackupPref');
    const originalText = btn?.innerHTML;

    try {
      if (this.serverMode) {
        this._showStatus(
          statusEl,
          'warning',
          '⚠️ Backup local desativado no modo PostgreSQL/VPS. Use rotina de backup do servidor.'
        );
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Exportando...';
      }
      this._showStatus(statusEl, 'info', '⏳ Gerando backup completo...');

      // Gerar backup usando dbManager.exportBackup()
      const backup = await window.dbManager.exportBackup();
      const filename = window.dbManager.generateBackupFilename();
      const jsonContent = JSON.stringify(backup, null, 2);

      console.log('[Preferencias] 📦 Backup gerado:', filename);
      console.log('[Preferencias] 📊 Stats:', backup.meta.stats);

      console.log('[Preferencias] 📥 Gerando download de backup...');
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const message = `✅ Backup baixado: ${filename}`;

      this._showStatus(statusEl, 'success', message);

      if (btn) {
        btn.innerHTML = '✅ Exportado!';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 3000);
      }
    } catch (error) {
      console.error('[Preferencias] Erro ao exportar:', error);
      this._showStatus(statusEl, 'error', '❌ Erro: ' + error.message);

      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  }

  /**
   * Handler para importar backup
   */
  async _handleImportarBackup() {
    const statusEl = document.getElementById('backupStatusPref');

    if (this.serverMode) {
      this._showStatus(
        statusEl,
        'warning',
        '⚠️ Importação local desativada no modo PostgreSQL/VPS. Use rotina de restauração do servidor.'
      );
      return;
    }

    console.log('[Preferencias] 📥 Abrindo seletor de arquivo DIRETO...');

    // Usa sempre o método direto (mais confiável)
    this._abrirSeletorArquivoBackup(statusEl);
  }

  /**
   * Fallback: Abre seletor de arquivo diretamente
   */
  _abrirSeletorArquivoBackup(statusEl) {
    console.log('[Preferencias] 🔧 Criando input file...');

    // Cria input file temporário
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.className = 'sg-hidden-file-input';
    input.id = 'backupFileInput_' + Date.now();
    input.title = 'Selecionar arquivo de backup';

    console.log('[Preferencias] 📎 Input criado:', input.id);

    input.addEventListener('change', async (e) => {
      console.log('[Preferencias] 📂 Evento change disparado');
      const file = e.target.files?.[0];
      if (!file) {
        console.log('[Preferencias] Import cancelado pelo usuário');
        input.remove();
        return;
      }

      console.log('[Preferencias] 📄 Arquivo selecionado:', file.name, file.size, 'bytes');
      this._showStatus(statusEl, 'info', '⏳ Processando backup...');
      await this._processarImportacaoBackup(statusEl, input, file);
    });

    // Adiciona ao body
    document.body.appendChild(input);
    console.log('[Preferencias] ✅ Input adicionado ao DOM');

    // Dispara o clique
    console.log('[Preferencias] 🖱️ Disparando click no input...');
    input.click();
    console.log('[Preferencias] ✅ Click disparado');
  }

  async _processarImportacaoBackup(statusEl, input, file) {
    try {
      if (this.serverMode) {
        this._showStatus(
          statusEl,
          'warning',
          '⚠️ Importação local desativada no modo PostgreSQL/VPS. Use rotina de restauração do servidor.'
        );
        return;
      }

      const text = await file.text();
      const backup = JSON.parse(text);

      console.log('[Preferencias] 📦 Backup carregado, chaves:', Object.keys(backup));

      const resumo = this._resumirConteudoBackup(backup);

      console.log('[Preferencias] 📊 Backup contém:', resumo);

      if (resumo.totalDados === 0 && !resumo.hasStorage) {
        this._showStatus(statusEl, 'error', '⚠️ Backup vazio ou formato não reconhecido');
        return;
      }

      const confirmMsg = this._montarConfirmacaoImportacao(backup, resumo);
      const confirmar = confirm(confirmMsg);

      if (!confirmar) {
        this._showStatus(statusEl, 'info', '❌ Import cancelado');
        return;
      }

      if (!window.dbManager || !window.dbManager.db) {
        throw new Error('Banco de dados não está pronto. Aguarde e tente novamente.');
      }

      console.log('[Preferencias] 🚀 Chamando dbManager.importBackup()...');
      const result = await window.dbManager.importBackup(backup, 'merge');

      console.log('[Preferencias] ✅ Resultado da importação:', result);

      if (result.success) {
        this._finalizarImportacaoComSucesso(statusEl, result);
      } else {
        this._showStatus(statusEl, 'error', `❌ Erros: ${result.errors.join(', ')}`);
      }

      if (result.total > 0 || result.imported.unidades || result.imported.usuarios) {
        setTimeout(
          () => {
            if (confirm('✅ Importação concluída!\n\nDeseja recarregar para garantir que tudo está atualizado?')) {
              window.location.reload();
            }
          },
          result.storage ? 2500 : 500
        );
      }
    } catch (error) {
      console.error('[Preferencias] ❌ Erro ao importar:', error);
      this._showStatus(statusEl, 'error', '❌ Erro: ' + error.message);
    } finally {
      input.remove();
    }
  }

  _resumirConteudoBackup(backup) {
    const numEmpenhos =
      backup.data?.empenhos?.length ||
      backup.indexedDB?.empenhos?.length ||
      backup.stores?.empenhos?.length ||
      backup.empenhos?.length ||
      0;
    const numNFs =
      backup.data?.notasFiscais?.length ||
      backup.indexedDB?.notasFiscais?.length ||
      backup.stores?.notasFiscais?.length ||
      backup.notasFiscais?.length ||
      0;
    const numUnidades =
      backup.data?.unidades?.length ||
      backup.indexedDB?.config?.find((c) => c.id === 'todasUnidades')?.unidades?.length ||
      0;
    const numUsuarios =
      backup.data?.usuarios?.length ||
      backup.indexedDB?.config?.find((c) => c.id === 'usuarios')?.usuarios?.length ||
      backup.indexedDB?.config?.find((c) => c.id === 'usuarios')?.usuarios?.length ||
      0;
    const hasStorage = !!backup.storage;
    const storageInfo = backup.storage?.unidade || 'Não configurado';

    return {
      empenhos: numEmpenhos,
      notasFiscais: numNFs,
      unidades: numUnidades,
      usuarios: numUsuarios,
      hasStorage,
      storageInfo,
      totalDados: numEmpenhos + numNFs + numUnidades + numUsuarios
    };
  }

  _montarConfirmacaoImportacao(backup, resumo) {
    let confirmMsg = `📥 Importar Backup?\n\n`;
    confirmMsg += `📋 Empenhos: ${resumo.empenhos}\n`;
    confirmMsg += `📄 Notas Fiscais: ${resumo.notasFiscais}\n`;
    if (resumo.unidades > 0) {
      confirmMsg += `🏢 Unidades: ${resumo.unidades}\n`;
    }
    if (resumo.usuarios > 0) {
      confirmMsg += `👤 Usuários: ${resumo.usuarios}\n`;
    }
    if (resumo.hasStorage) {
      confirmMsg += `\n📁 Config Storage: ${resumo.storageInfo}\n`;
    }
    if (backup.meta?.exportedAt) {
      const dataBackup = new Date(backup.meta.exportedAt).toLocaleString('pt-BR');
      confirmMsg += `\n📅 Data do backup: ${dataBackup}`;
    }
    confirmMsg += `\n\nModo: MESCLAR (adiciona sem duplicar)\n\nContinuar?`;
    return confirmMsg;
  }

  _finalizarImportacaoComSucesso(statusEl, result) {
    console.log('[Preferencias] 📡 Disparando evento dataImported...');
    window.dispatchEvent(new CustomEvent('dataImported', { detail: result }));

    let successMsg = `✅ Backup importado! ${result.total} registros`;
    if (result.imported.empenhos) {
      successMsg += `, ${result.imported.empenhos} empenhos`;
    }
    if (result.imported.notasFiscais) {
      successMsg += `, ${result.imported.notasFiscais} NFs`;
    }
    if (result.imported.unidades) {
      successMsg += `, ${result.imported.unidades} unidades`;
    }
    if (result.imported.usuarios) {
      successMsg += `, ${result.imported.usuarios} usuários`;
    }

    this._showStatus(statusEl, 'success', successMsg);

    if (result.storage) {
      console.log('[Preferencias] ℹ️ Metadados de storage detectados no backup:', result.storage);
      setTimeout(() => {
        alert(
          'ℹ️ Metadados de armazenamento detectados no backup.\n\n' +
            'O sistema está em modo banco/API e ignora configuração de diretório externo.'
        );
      }, 100);
    }

    if ((result.imported.empenhos || 0) > 0 && (result.imported.arquivos || 0) === 0) {
      console.warn('[Preferencias] ⚠️ Empenhos importados mas sem arquivos vinculados!');
      setTimeout(
        () => {
          alert(
            '⚠️ Atenção!\n\n' +
              'Os empenhos foram importados, mas sem arquivos PDF vinculados.\n\n' +
              'Na página principal, os empenhos só aparecem quando têm um PDF de Nota de Empenho.\n\n' +
              'Use o botão "Verificar Dados" para confirmar que os dados estão no banco.'
          );
        },
        result.storage ? 2000 : 100
      );
    }
  }

  /**
   * Mostra status de backup
   */
  _showStatus(el, type, message) {
    setFeedback(el, type, message, { autoHideMs: type !== 'info' ? 5000 : 0 });
  }

  /**
   * Carrega preferências
   */
  async load() {
    try {
      // Garante que listeners de backup estão configurados
      this._setupBackupListeners();

      this.preferencias = await this.getPreferencias();

      if (this.preferencias) {
        document.getElementById('tema').value = this.preferencias.tema || 'system';
        document.getElementById('idioma').value = this.preferencias.idioma || 'pt-BR';
        document.getElementById('toleranciaValor').value = this.preferencias.toleranciaValor || '0.01';
        document.getElementById('toleranciaQuantidade').value = this.preferencias.toleranciaQuantidade || '0';
        document.getElementById('exibirNotificacoes').checked = this.preferencias.notificacoes || true;
        document.getElementById('autoSalvar').checked = this.preferencias.autoSalvar || true;
        document.getElementById('validacaoRigida').checked = this.preferencias.validacaoRigida || false;

        this.aplicarTema(this.preferencias.tema || 'system');
      } else {
        // Preferências padrão
        this.aplicarTema('system');
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    }
  }

  /**
   * Salva preferências
   */
  async salvar() {
    try {
      const preferencias = {
        tema: document.getElementById('tema').value,
        idioma: document.getElementById('idioma').value,
        toleranciaValor: parseFloat(document.getElementById('toleranciaValor').value),
        toleranciaQuantidade: parseFloat(document.getElementById('toleranciaQuantidade').value),
        notificacoes: document.getElementById('exibirNotificacoes').checked,
        autoSalvar: document.getElementById('autoSalvar').checked,
        validacaoRigida: document.getElementById('validacaoRigida').checked,
        dataAtualizacao: new Date().toISOString()
      };

      // Salva na base de configuração
      await this.savePreferencias(preferencias);

      this.preferencias = preferencias;
      this.aplicarTema(preferencias.tema);

      alert('✅ Preferências salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      alert('❌ Erro ao salvar: ' + error.message);
    }
  }

  /**
   * Aplica tema
   */
  aplicarTema(tema) {
    const root = document.documentElement;
    const preferencia = ['light', 'dark', 'system'].includes(tema) ? tema : 'system';
    const resolvedTheme = resolveTheme(preferencia);

    applyThemePreference(preferencia);

    if (resolvedTheme === 'dark') {
      root.style.setProperty('--cor-fundo', '#1a1a1a');
      root.style.setProperty('--cor-texto', '#f0f0f0');
      root.style.setProperty('--cor-card', '#2d2d2d');
      root.style.setProperty('--cor-borda', '#404040');
      document.body.classList.add('tema-escuro');
      document.body.classList.remove('tema-claro');
    } else {
      root.style.setProperty('--cor-fundo', '#f5f5f5');
      root.style.setProperty('--cor-texto', '#333');
      root.style.setProperty('--cor-card', '#fff');
      root.style.setProperty('--cor-borda', '#ddd');
      document.body.classList.add('tema-claro');
      document.body.classList.remove('tema-escuro');
    }
  }

  /**
   * Exporta todas as configurações
   */
  async exportarConfiguracoes() {
    try {
      // Coleta todas as configurações
      const unidade = await window.dbManager.get('config', 'unidadeOrcamentaria');
      const usuarios = await window.dbManager.get('config', 'usuarios');
      const rede = await window.dbManager.get('config', 'rede');
      const preferencias = await this.getPreferencias();

      const exportData = {
        versao: '1.0',
        dataExportacao: new Date().toISOString(),
        sistema: 'SINGEM',
        configuracoes: {
          unidadeOrcamentaria: unidade,
          usuarios: usuarios,
          rede: rede,
          preferencias: preferencias
        }
      };

      // Gera arquivo JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `SINGEM-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);

      alert('✅ Configurações exportadas com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar configurações:', error);
      alert('❌ Erro ao exportar: ' + error.message);
    }
  }

  /**
   * Importa configurações
   */
  /**
   * Importa configurações (APENAS ADMINISTRADOR)
   */
  async importarConfiguracoes(file) {
    if (!file) {
      return;
    }

    // Verifica se usuário é administrador
    const usuarioLogado = window.settingsUsuarios?.usuarioLogado;

    if (usuarioLogado && usuarioLogado.perfil !== 'admin') {
      alert(
        '❌ ACESSO NEGADO!\n\n' +
          'Apenas ADMINISTRADORES podem importar configurações.\n\n' +
          'Importar configurações pode modificar o sistema completamente.\n\n' +
          'Seu perfil: ' +
          (usuarioLogado.perfil === 'usuario' ? 'Usuário' : usuarioLogado.perfil)
      );
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validações
      if (!data.sistema || data.sistema !== 'SINGEM') {
        alert('❌ Arquivo inválido! Este não é um arquivo de configuração do SINGEM.');
        return;
      }

      if (!confirm('⚠️ ATENÇÃO!\n\nEsta ação irá SOBRESCREVER todas as configurações atuais.\n\nDeseja continuar?')) {
        return;
      }

      // Importa cada configuração
      if (data.configuracoes.unidadeOrcamentaria) {
        await window.dbManager.update('config', {
          id: 'unidadeOrcamentaria',
          ...data.configuracoes.unidadeOrcamentaria
        });
      }

      if (data.configuracoes.usuarios) {
        await window.dbManager.update('config', data.configuracoes.usuarios);
      }

      if (data.configuracoes.rede) {
        await window.dbManager.update('config', {
          id: 'rede',
          ...data.configuracoes.rede
        });
      }

      if (data.configuracoes.preferencias) {
        await this.savePreferencias(data.configuracoes.preferencias);
      }

      alert('✅ Configurações importadas com sucesso!\n\nA página será recarregada.');

      // Recarrega página para aplicar configurações
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      alert('❌ Erro ao importar: ' + error.message);
    }
  }

  /**
   * Limpa banco de dados
   */
  /**
   * Limpa banco de dados (APENAS ADMINISTRADOR)
   */
  async limparBancoDados() {
    if (this.serverMode) {
      alert('⚠️ Limpeza local desativada no modo PostgreSQL/VPS. Use procedimentos administrativos no servidor.');
      return;
    }

    // Verifica se usuário é administrador
    const usuarioLogado = window.settingsUsuarios?.usuarioLogado;

    if (!usuarioLogado) {
      alert('❌ ACESSO NEGADO!\n\nVocê precisa estar autenticado para limpar o banco de dados.');
      return;
    }

    if (usuarioLogado.perfil !== 'admin') {
      alert(
        '❌ ACESSO NEGADO!\n\nApenas ADMINISTRADORES podem limpar o banco de dados.\n\nSeu perfil: ' +
          (usuarioLogado.perfil === 'usuario' ? 'Usuário' : usuarioLogado.perfil)
      );
      return;
    }

    const confirmacao1 = confirm(
      '⚠️ ATENÇÃO - OPERAÇÃO DESTRUTIVA!\n\nEsta ação irá EXCLUIR PERMANENTEMENTE:\n• Todas as Notas de Empenho\n• Todas as Notas Fiscais\n• Todos os registros de Entrega\n\nAs CONFIGURAÇÕES serão mantidas.\n\nDeseja continuar?'
    );

    if (!confirmacao1) {
      return;
    }

    const confirmacao2 = confirm('⚠️ CONFIRMAÇÃO FINAL\n\nTem CERTEZA ABSOLUTA?\n\nEsta ação NÃO PODE SER DESFEITA!');

    if (!confirmacao2) {
      return;
    }

    try {
      // Limpa stores de dados (mantém config)
      await window.dbManager.clear('empenhos');
      await window.dbManager.clear('notasFiscais');
      await window.dbManager.clear('entregas');
      await window.dbManager.clear('arquivos');

      alert(
        '✅ Banco de dados limpo com sucesso!\n\nTodos os registros foram excluídos.\n\nAs configurações foram mantidas.'
      );

      // Recarrega página
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erro ao limpar banco:', error);
      alert('❌ Erro ao limpar banco de dados: ' + error.message);
    }
  }

  /**
   * Obtém preferências da base de configuração
   */
  async getPreferencias() {
    try {
      const result = await window.dbManager.get('config', 'preferencias');
      return result || null;
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
      return null;
    }
  }

  /**
   * Salva preferências na base de configuração
   */
  async savePreferencias(preferencias) {
    try {
      const data = {
        id: 'preferencias',
        ...preferencias
      };
      await window.dbManager.update('config', data);
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      throw error;
    }
  }
}

// Função global para obter tolerâncias
window.getToleranciaValor = async function () {
  try {
    const result = await window.dbManager.get('config', 'preferencias');
    return result?.toleranciaValor || 0.01;
  } catch (error) {
    return 0.01;
  }
};

window.getToleranciaQuantidade = async function () {
  try {
    const result = await window.dbManager.get('config', 'preferencias');
    return result?.toleranciaQuantidade || 0;
  } catch (error) {
    return 0;
  }
};

// Instância global
window.settingsPreferencias = new SettingsPreferencias();
