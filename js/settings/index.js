/**
 * Módulo de Configurações - Sistema de Controle de Material
 * Gerencia todas as configurações do sistema
 */

class SettingsManager {
  constructor() {
    this.currentSection = 'unidade';
    this.usuarioLogado = null;
    this.init();
  }

  /**
   * Inicializa o módulo de configurações
   */
  init() {
    console.log('🔧 Módulo de Configurações inicializado');
    this.setupEventListeners();
    this.verificarPermissoes();
  }

  /**
   * Verifica permissões do usuário e aplica restrições
   */
  async verificarPermissoes() {
    this.usuarioLogado = window.settingsUsuarios?.usuarioLogado;

    if (!this.usuarioLogado) {
      // Sem usuário logado - modo administrador padrão para compatibilidade
      console.log('⚠️ Nenhum usuário logado - acesso completo (modo compatibilidade)');
      return;
    }

    const isAdmin = this.usuarioLogado.perfil === 'admin';

    console.log(`👤 Usuário: ${this.usuarioLogado.nome} (${isAdmin ? 'Administrador' : 'Usuário'})`);

    if (!isAdmin) {
      this.aplicarRestricoesUsuarioComum();
    }
  }

  /**
   * Aplica restrições para usuário comum
   */
  aplicarRestricoesUsuarioComum() {
    console.log('🔒 Aplicando restrições para usuário comum...');

    // Oculta aba de Usuários
    const tabUsuarios = document.querySelector('[data-tab="usuarios"]');
    if (tabUsuarios) {
      tabUsuarios.style.display = 'none';
    }

    // Oculta aba de Rede
    const tabRede = document.querySelector('[data-tab="rede"]');
    if (tabRede) {
      tabRede.style.display = 'none';
    }

    // Desabilita edição da Unidade Orçamentária
    const formUnidade = document.getElementById('formUnidade');
    if (formUnidade) {
      const inputs = formUnidade.querySelectorAll('input, select, button[type="submit"]');
      inputs.forEach((input) => {
        input.disabled = true;
        input.style.cursor = 'not-allowed';
        input.style.opacity = '0.6';
      });

      // Adiciona mensagem informativa
      const statusUnidade = document.getElementById('statusUnidade');
      if (statusUnidade) {
        statusUnidade.innerHTML =
          '<div class="status-message warning">' +
          '<strong>🔒 Visualização apenas</strong><br>' +
          'Somente ADMINISTRADORES podem editar a Unidade Orçamentária.' +
          '</div>' +
          statusUnidade.innerHTML;
      }
    }

    // Oculta botão "Limpar Banco de Dados"
    const btnLimparBanco = document.getElementById('btnLimparBanco');
    if (btnLimparBanco) {
      btnLimparBanco.style.display = 'none';
    }

    // Oculta painel "Zona de Perigo"
    const painelPerigo = btnLimparBanco?.closest('.panel');
    if (painelPerigo) {
      painelPerigo.style.display = 'none';
    }

    // Desabilita exportar/importar configurações (pode modificar sistema)
    const _btnExportarConfig = document.getElementById('btnExportarConfig');
    const btnImportarConfig = document.getElementById('btnImportarConfig');

    if (btnImportarConfig) {
      btnImportarConfig.disabled = true;
      btnImportarConfig.style.opacity = '0.5';
      btnImportarConfig.title = 'Apenas administradores podem importar configurações';
    }

    console.log('✅ Restrições aplicadas com sucesso');
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Navegação entre seções
    document.querySelectorAll('.settings-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const section = e.currentTarget.dataset.section;
        this.showSection(section);
      });
    });

    // Botão voltar
    document.getElementById('btnVoltarSettings')?.addEventListener('click', () => {
      window.app.showScreen('homeScreen');
    });
  }

  /**
   * Mostra uma seção específica
   */
  showSection(section) {
    this.currentSection = section;

    // Atualiza tabs
    document.querySelectorAll('.settings-tab').forEach((tab) => {
      tab.classList.remove('active');
      if (tab.dataset.section === section) {
        tab.classList.add('active');
      }
    });

    // Atualiza conteúdo
    document.querySelectorAll('.settings-section').forEach((sec) => {
      sec.classList.add('hidden');
    });
    document.getElementById(`section-${section}`)?.classList.remove('hidden');

    // Carrega dados da seção
    this.loadSection(section);
  }

  /**
   * Carrega dados de uma seção
   */
  async loadSection(section) {
    switch (section) {
      case 'unidade':
        if (window.settingsUnidade) {
          await window.settingsUnidade.load();
        }
        break;
      case 'usuarios':
        if (window.settingsUsuarios) {
          await window.settingsUsuarios.load();
        }
        break;
      case 'arquivos':
        if (window.settingsArquivos) {
          await window.settingsArquivos.load();
        }
        break;
      case 'rede':
        if (window.settingsRede) {
          await window.settingsRede.load();
        }
        break;
      case 'preferencias':
        if (window.settingsPreferencias) {
          await window.settingsPreferencias.load();
        }
        break;
      case 'backup':
        if (window.backupManager) {
          await window.backupManager.load();
        }
        break;
      case 'diagnostico':
        if (window.settingsDiagnostico) {
          await window.settingsDiagnostico.load();
        }
        break;
    }
  }

  /**
   * Abre o módulo de configurações
   */
  open(section = 'unidade') {
    window.app.showScreen('settingsScreen');
    this.showSection(section);
  }
}

// Instância global
window.settingsManager = new SettingsManager();
