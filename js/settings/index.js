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

  getTabButtons() {
    return Array.from(document.querySelectorAll('.settings-tab, .tab-button'));
  }

  getTabContents() {
    return Array.from(document.querySelectorAll('.settings-section, .tab-content'));
  }

  getSectionFromTab(tab) {
    return tab?.dataset.section || tab?.dataset.tab || '';
  }

  getSectionElement(section) {
    if (!section) {
      return null;
    }

    return (
      document.getElementById(`section-${section}`) ||
      document.getElementById(`tab${section.charAt(0).toUpperCase() + section.slice(1)}`)
    );
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
    this.usuarioLogado =
      window.settingsUsuarios?.usuarioLogado || window.app?.usuarioLogado || window.__SINGEM_AUTH?.user || null;

    if (!this.usuarioLogado) {
      // Sem usuário logado - modo administrador padrão para compatibilidade
        const serverMode = window.CONFIG?.storage?.mode === 'server';
        if (serverMode) {
          console.info('[Settings] Usuário ainda não autenticado no modo servidor. Recursos protegidos exigem login.');
        } else {
          console.log('⚠️ Nenhum usuário logado - acesso completo (modo compatibilidade)');
        }
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
      tabUsuarios.classList.add('hidden');
    }

    // Oculta aba de Rede
    const tabRede = document.querySelector('[data-tab="rede"]');
    if (tabRede) {
      tabRede.classList.add('hidden');
    }

    // Oculta aba de Integrações
    const tabIntegracoes = document.querySelector('[data-tab="integracoes"]');
    if (tabIntegracoes) {
      tabIntegracoes.classList.add('hidden');
    }

    // Desabilita edição da Unidade Orçamentária
    const formUnidade = document.getElementById('formUnidade');
    if (formUnidade) {
      const inputs = formUnidade.querySelectorAll('input, select, button[type="submit"]');
      inputs.forEach((input) => {
        input.disabled = true;
        input.classList.add('settings-control--disabled');
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
      btnLimparBanco.classList.add('hidden');
    }

    // Oculta painel "Zona de Perigo"
    const painelPerigo = btnLimparBanco?.closest('.panel');
    if (painelPerigo) {
      painelPerigo.classList.add('hidden');
    }

    // Desabilita exportar/importar configurações (pode modificar sistema)
    const _btnExportarConfig = document.getElementById('btnExportarConfig');
    const btnImportarConfig = document.getElementById('btnImportarConfig');

    if (btnImportarConfig) {
      btnImportarConfig.disabled = true;
      btnImportarConfig.classList.add('settings-control--disabled');
      btnImportarConfig.title = 'Apenas administradores podem importar configurações';
    }

    console.log('✅ Restrições aplicadas com sucesso');
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Navegação entre seções
    this.getTabButtons().forEach((tab) => {
      if (tab.dataset.settingsManagerBound === '1') {
        return;
      }

      tab.dataset.settingsManagerBound = '1';
      tab.addEventListener('click', (e) => {
        const section = this.getSectionFromTab(e.currentTarget);
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
    this.getTabButtons().forEach((tab) => {
      tab.classList.toggle('active', this.getSectionFromTab(tab) === section);
    });

    // Atualiza conteúdo
    this.getTabContents().forEach((sec) => {
      sec.classList.remove('active');
      sec.classList.add('hidden');
    });

    const sectionElement = this.getSectionElement(section);
    sectionElement?.classList.remove('hidden');
    sectionElement?.classList.add('active');

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
      case 'integracoes':
        if (window.settingsIntegracoes) {
          await window.settingsIntegracoes.load();
        }
        break;
      case 'ia':
        if (window.settingsIA) {
          await window.settingsIA.load();
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
