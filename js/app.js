/**
 * Aplicação Principal - Sistema de Controle de Material
 * IF Baiano - Campus
 */

// ============================================================================
// IMPORTS - Nova Infraestrutura Enterprise
// ============================================================================
import * as eventBus from './core/eventBus.js';
import * as feedback from './ui/feedback.js';
import repository from './core/repository.js';
import * as asyncQueue from './core/asyncQueue.js';
import InputValidator from './core/inputValidator.js';
import { APP_VERSION, APP_BUILD, logVersion } from './core/version.js';
import * as authRemember from './core/authRemember.js';
import * as FormatUtils from './core/format.js';
import * as NaturezaSubelementos from './data/naturezaSubelementos.js';
import './relatoriosEmpenhos.js';
import { initInfrastructureInfo } from './infrastructureInfo.js';
import './catmatIntegration.js';
import * as CatalogacaoTela from './catalogacaoTela.js';
import { createEmpenhoFeature } from './features/empenho/pages.js';
import { createNotaFiscalFeature } from './features/notaFiscal/pages.js';
import { showToast as sharedShowToast } from './shared/ui/toast.js';
import { hideLoader, showLoader } from './shared/ui/loader.js';
import { focusField } from './shared/ui/formField.js';
import { confirmAction } from './shared/ui/modal.js';

console.log('[App] 📦 Versão:', APP_VERSION, 'Build:', APP_BUILD);
console.log('[App] 🔍 Repository importado:', typeof repository);
console.log('[App] 🔍 Repository.saveUnidade:', typeof repository?.saveUnidade);

if (!repository) {
  console.error('[App] ❌ ERRO CRÍTICO: repository não foi importado!');
  console.error('[App] Stack trace para debug:', new Error().stack);
}

if (!repository?.saveUnidade) {
  console.error('[App] ❌ saveUnidade não encontrado no repository!');
  console.error('[App] Repository keys:', Object.keys(repository || {}));
}

class ControleMaterialApp {
  constructor() {
    this.currentScreen = 'loginScreen';
    this.loadingOverlay = null;
    this.currentEmpenho = null;
    this.currentNotaFiscal = null;
    this.usuarioLogado = null;

    // Contadores para itens dinâmicos
    this.itemCounter = 0;

    // ✅ ESTADO ÚNICO - Fonte da Verdade para Empenho
    this.empenhoDraft = {
      header: {
        naturezaDespesa: null, // 339030 | 449052 (define subelementos disponíveis)
        ano: null,
        numero: null,
        dataEmissaoISO: null,
        processoSuap: '', // Processo SUAP (campo único, ex: 23327.250285.2026-98)
        valorTotalEmpenho: 0, // Valor FIXO do cabeçalho (NÃO recalcular)
        fornecedorRazao: null,
        cnpjDigits: null, // Armazena SOMENTE dígitos
        telefoneDigits: null, // Armazena SOMENTE dígitos
        emailFornecedor: null,
        statusValidacao: 'rascunho',
        validadoEm: null,
        validadoPor: null
      },
      itens: []
    };

    // ✅ ESTADO - Empenho vinculado à NF (entrada manual)
    this.empenhoVinculadoNF = null;

    // ✅ ESTADO DA LISTAGEM DE EMPENHOS
    this.listagemState = {
      empenhos: [], // Array carregado do banco (fonte)
      termoBusca: '', // Texto da busca
      filtroStatus: 'todos', // 'todos' | 'rascunho' | 'validado'
      ordenacao: 'ano-numero', // 'ano-numero' | 'data' | 'fornecedor' | 'valor'
      ultimoEditado: null, // ID do último empenho editado (para destaque)
      debounceTimer: null, // Timer para debounce da busca
      modoVisualizacao: false // true = somente visualização (aba Relatório)
    };

    this.cadastroEmpenhoState = {
      empenhos: [],
      handlersBound: false,
      listDelegationBound: false
    };

    this.notaFiscalUIState = {
      refs: null,
      chaveHandlersBound: false,
      barcodeHandlersBound: false,
      chaveStatusLast: null,
      barcodeStatusLast: null,
      opcaoCards: null,
      entradaContents: null,
      opcaoHandlersBound: false
    };

    this.features = {
      empenho: createEmpenhoFeature(this),
      notaFiscal: createNotaFiscalFeature(this)
    };

    console.log('[State] 📦 Estado único inicializado:', this.empenhoDraft);

    this.init();
  }

  /**
   * Inicializa a aplicação
   */
  async init() {
    try {
      console.log('🚀 Iniciando aplicação SINGEM...');

      // Inicializa modo servidor (PostgreSQL via API)
      const apiClient = (await import('./services/apiClient.js')).default;
      const health = await apiClient.healthCheck();
      if (!health.online) {
        throw new Error('API PostgreSQL indisponível. Inicie o server Node/VPS antes de usar o sistema.');
      }
      console.log('✅ API PostgreSQL disponível');

      // INFRAESTRUTURA ENTERPRISE - Event Listeners
      // ============================================================================
      this.setupInfrastructureListeners();
      console.log('✅ Event listeners da infraestrutura configurados');

      // Iniciar processamento da fila assíncrona
      asyncQueue.run().catch((err) => {
        console.error('❌ Erro ao processar fila:', err);
      });

      console.log('ℹ️ Restauração de diretório externo desativada (modo banco/API).');

      // Carrega dados da unidade orçamentária
      await this.carregarDadosUnidade();
      console.log('✅ Dados da unidade carregados');

      // Verifica se há usuários cadastrados
      await this.verificarUsuariosCadastrados();

      // Verifica sessão existente (NÃO autentica automaticamente)
      await this.verificarSessao();

      // Verifica tokens OAuth (SerproID/Gov.br) na URL
      await this.handleOAuthCallback();

      // Configura event listeners
      this.setupEventListeners();
      console.log('✅ Event listeners configurados');

      // Restaura dados lembrados (login/senha) sem auto-login
      await this.restaurarDadosLembrados();

      // Mostra tela de login
      this.showScreen('loginScreen');
      console.log('✅ Aplicação iniciada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao inicializar aplicação:', error);
      this.showError('Erro ao inicializar a aplicação: ' + error.message);
    }
  }

  /**
   * Verifica sessão sem auto-login
   */
  async verificarSessao() {
    console.log('ℹ️ Sessão persistente local desativada (modo PostgreSQL/VPS)');
  }

  /**
   * Trata callback OAuth (SerproID/Gov.br)
   * Captura tokens da URL e autentica o usuário
   */
  async handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');
    const error = urlParams.get('error');

    // Limpa parâmetros da URL
    if (accessToken || refreshToken || error) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Trata erro do OAuth
    if (error) {
      console.error('[OAuth] Erro no callback:', error);
      this.showError('Erro na autenticação: ' + decodeURIComponent(error));
      return;
    }

    // Se recebeu tokens, autentica
    if (accessToken && refreshToken) {
      console.log('[OAuth] Tokens recebidos, autenticando...');

      try {
        if (window.__SINGEM_AUTH) {
          window.__SINGEM_AUTH.accessToken = accessToken;
          window.__SINGEM_AUTH.refreshToken = refreshToken;
        }

        // Valida token e obtém dados do usuário
        const apiClient = (await import('./services/apiClient.js')).default;
        const response = await apiClient.get('/api/auth/me');

        if (response.sucesso && response.usuario) {
          this.usuarioLogado = response.usuario;
          console.log('[OAuth] ✅ Login via SerproID:', this.usuarioLogado.nome);

          // Atualiza UI
          this.atualizarUIUsuarioLogado();
          this.showScreen('homeScreen');
          this.showSuccess(`Bem-vindo(a), ${this.usuarioLogado.nome}!`);
        } else {
          throw new Error('Falha ao obter dados do usuário');
        }
      } catch (err) {
        console.error('[OAuth] Erro ao validar token:', err);
        if (window.__SINGEM_AUTH) {
          window.__SINGEM_AUTH.accessToken = null;
          window.__SINGEM_AUTH.refreshToken = null;
        }
        this.showError('Sessão inválida. Faça login novamente.');
      }
    }
  }

  /**
   * Verifica se há usuários cadastrados e atualiza UI
   */
  async verificarUsuariosCadastrados() {
    try {
      console.log('[VERIF_USUARIOS] 🔍 Verificando usuários cadastrados...');

      // ✅ USA REPOSITORY DIRETAMENTE (não depende de settingsUsuarios)
      if (!window.repository) {
        console.warn('[VERIF_USUARIOS] ⚠️ Repository não disponível ainda');
        return;
      }

      const temUsuarios = await window.repository.hasUsuarios();
      const loginHelp = document.querySelector('.login-help');

      if (temUsuarios) {
        console.log('[VERIF_USUARIOS] ✅ Existem usuários cadastrados');

        // Esconde dica de primeiro acesso se houver usuários
        if (loginHelp) {
          loginHelp.style.display = 'none';
        }
      } else {
        console.log('[VERIF_USUARIOS] ⚠️ Nenhum usuário cadastrado - mostrando dica de acesso');

        // Mostra dica de primeiro acesso
        if (loginHelp) {
          loginHelp.style.display = 'block';
          loginHelp.open = true; // Abre automaticamente
        }
      }
    } catch (error) {
      console.warn('[VERIF_USUARIOS] ⚠️ Erro ao verificar usuários:', error);
      console.error('[VERIF_USUARIOS] Stack:', error.stack);
    }
  }

  /**
   * Carrega dados da unidade orçamentária
   */
  async carregarDadosUnidade() {
    try {
      const unidade = await window.getUnidadeOrcamentaria();
      const loginLogo = document.querySelector('.login-logo');
      const headerLogo = document.querySelector('.logo h1');

      if (unidade && unidade.razaoSocial) {
        const loginNome = document.getElementById('loginUnidadeNome');
        const loginInfo = document.getElementById('loginUnidadeInfo');

        if (loginNome) {
          loginNome.textContent = `Bem-vindo(a) ao ${unidade.razaoSocial}`;
        }

        if (loginInfo) {
          loginInfo.textContent = `CNPJ: ${unidade.cnpj || 'Não cadastrado'}`;
        }

        // Atualiza logomarca na tela de login
        // Se houver logo cadastrada, usa ela. Senão, mantém a logo padrão do IF Baiano
        if (loginLogo && unidade.logomarca) {
          // Prevenção XSS: usar createElement em vez de innerHTML
          const img = document.createElement('img');
          img.src = unidade.logomarca;
          img.alt = 'Logo da Unidade';
          img.style.cssText = 'max-width: 120px; max-height: 120px; object-fit: contain;';
          loginLogo.innerHTML = '';
          loginLogo.appendChild(img);
        } else if (loginLogo) {
          // Mantém logo padrão do IF Baiano (já está no HTML)
          const img = document.createElement('img');
          img.src = 'img/marca-if-baiano-campus-guanambi-horizontal.jpg';
          img.alt = 'IF Baiano';
          img.style.cssText = 'max-width: 180px; max-height: 120px; object-fit: contain;';
          loginLogo.innerHTML = '';
          loginLogo.appendChild(img);
        }

        // Atualiza header também
        const logoSubtitle = document.querySelector('.logo p');
        if (logoSubtitle) {
          logoSubtitle.textContent = unidade.razaoSocial || 'IF Baiano - Campus';
        }

        // Atualiza logo do header se houver logomarca cadastrada
        if (headerLogo && unidade.logomarca) {
          // Prevenção XSS: usar createElement em vez de innerHTML
          const img = document.createElement('img');
          img.src = unidade.logomarca;
          img.alt = 'Logo';
          img.style.cssText = 'height: 40px; vertical-align: middle; margin-right: 10px;';
          headerLogo.innerHTML = '';
          headerLogo.appendChild(img);
          headerLogo.appendChild(document.createTextNode(' Controle de Material'));
        } else if (headerLogo) {
          // Mantém título padrão sem logo no header
          headerLogo.textContent = '📋 Controle de Material';
        }
      } else {
        // Se não houver unidade cadastrada, mostra logo padrão do IF Baiano
        if (loginLogo) {
          loginLogo.innerHTML = `<img src="img/marca-if-baiano-campus-guanambi-horizontal.jpg" alt="IF Baiano" style="max-width: 180px; max-height: 120px; object-fit: contain;">`;
        }

        const loginNome = document.getElementById('loginUnidadeNome');
        const loginInfo = document.getElementById('loginUnidadeInfo');

        if (loginNome) {
          loginNome.textContent = 'Bem-vindo(a) ao IF Baiano';
        }

        if (loginInfo) {
          loginInfo.textContent = 'Sistema de Controle de Material';
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados da unidade:', error);
    }
  }

  /**
   * Configura todos os event listeners da aplicação
   */
  setupEventListeners() {
    // Navegação entre telas
    this.setupScreenNavigation();

    // Upload de arquivos PDF
    this.setupFileUploads();

    // Formulários
    this.setupForms();

    // Funcionalidades específicas
    this.setupItemManagement();
    this.setupReports();

    // Botões de ação
    this.setupActionButtons();
  }

  /**
   * Configura navegação entre telas
   */
  setupScreenNavigation() {
    // Menu principal
    document.querySelectorAll('.menu-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const targetScreen = e.currentTarget.dataset.screen;
        if (targetScreen) {
          this.showScreen(targetScreen);
        }
      });
    });

    // Botões de voltar
    document.querySelectorAll('.btn-back').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.showScreen('homeScreen');
      });
    });

    // Navegação do header
    document.getElementById('btnHome')?.addEventListener('click', () => {
      this.showScreen('homeScreen');
    });

    // Botão Exportar removido - funcionalidade centralizada em Configurações → Preferências

    document.getElementById('btnConfig')?.addEventListener('click', () => {
      this.showScreen('configScreen');
    });

    // Sistema de Abas (Tabs)
    this.setupTabs();

    // Botão de sair (logout)
    document.getElementById('btnSair')?.addEventListener('click', () => {
      this.realizarLogout();
    });

    // Submit do formulário de login (compatível com password managers)
    const loginForm = document.getElementById('loginForm') || document.getElementById('formLogin');
    loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.realizarLogin(e);
    });

    window.addEventListener('singem:auth:logout', (event) => {
      const motivo = event?.detail?.reason;
      if (motivo === 'token_invalid') {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
          errorDiv.textContent = '⏱️ Sessão expirada. Faça login novamente.';
          errorDiv.classList.remove('hidden');
        }
        console.warn('[AUTH] Sessão expirada detectada (token inválido/expirado).');
      }
    });

    // Menu item "Consulte Compras.gov"
    document.getElementById('consultasMenuItem')?.addEventListener('click', () => {
      console.log('🔍 Abrindo Consulte Compras.gov...');
      this.showScreen('consultasScreen');
    });

    // Botão/link de recuperar senha
    document.getElementById('btnRecuperarSenha')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.abrirModalRecuperacaoSenha();
    });

    // Botão de limpar dados lembrados
    document.getElementById('btnClearRemember')?.addEventListener('click', async () => {
      await this.limparDadosLembrados();
    });
  }

  /**
   * Restaura dados lembrados (login/senha) sem auto-login
   */
  async restaurarDadosLembrados() {
    try {
      const { rememberUser, rememberPass, login, pass } = await authRemember.loadRememberOptions();
      const chkUser = document.getElementById('rememberUser');
      const chkPass = document.getElementById('rememberPass');
      const inputUser = document.getElementById('loginUsuario');
      const inputPass = document.getElementById('loginSenha');

      if (chkUser) {
        chkUser.checked = rememberUser;
      }
      if (chkPass) {
        chkPass.checked = rememberPass;
      }
      if (inputUser && rememberUser && login) {
        inputUser.value = login;
      }
      if (inputPass && rememberPass && pass) {
        inputPass.value = pass;
      }
    } catch (error) {
      console.warn('⚠️ Falha ao restaurar dados lembrados:', error);
    }
  }

  /**
   * Salva ou limpa dados lembrados após login bem-sucedido
   */
  async salvarDadosLembradosPosLogin(usuario, senha) {
    const rememberUser = document.getElementById('rememberUser')?.checked;
    const rememberPass = document.getElementById('rememberPass')?.checked;

    if (rememberUser || rememberPass) {
      await authRemember.saveRememberOptions({ rememberUser, rememberPass, login: usuario, pass: senha });
    } else {
      await this.limparDadosLembrados();
    }
  }

  /**
   * Limpa dados lembrados e desmarca checkboxes
   */
  async limparDadosLembrados() {
    authRemember.clearRemembered();
    const chkUser = document.getElementById('rememberUser');
    const chkPass = document.getElementById('rememberPass');
    const inputUser = document.getElementById('loginUsuario');
    const inputPass = document.getElementById('loginSenha');
    if (chkUser) {
      chkUser.checked = false;
    }
    if (chkPass) {
      chkPass.checked = false;
    }
    if (inputUser) {
      inputUser.value = '';
    }
    if (inputPass) {
      inputPass.value = '';
    }
  }

  /**
   * Abre modal de recuperação de senha (PIN)
   */
  abrirModalRecuperacaoSenha() {
    const modal = document.getElementById('modalRecuperacaoSenha');
    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    } else {
      alert('Use o PIN de recuperação na tela dedicada de recuperação de acesso.');
    }
  }

  /**
   * Configura sistema de abas (tabs)
   */
  setupTabs() {
    // Selecionar todos os botões de aba
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  /**
   * Alterna entre abas
   */
  switchTab(tabName) {
    // Remover classe active de todos os botões e conteúdos
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));

    // Adicionar classe active ao botão clicado
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }

    // Mostrar conteúdo correspondente
    let contentId = '';
    switch (tabName) {
      case 'cadastro':
        contentId = 'tabCadastro';
        this.carregarEmpenhosNovoCadastro();
        break;
      case 'controle-saldos':
        contentId = 'tabControleSaldos';
        this.carregarControleSaldos();
        break;
      case 'relatorio':
        contentId = 'tabRelatorio';
        this.carregarRelatorioEmpenhos();
        break;
    }

    const activeContent = document.getElementById(contentId);
    if (activeContent) {
      activeContent.classList.add('active');
    }
  }

  /**
   * Carrega a lista de empenhos na aba "Novo Cadastro" (agrupados por ano)
   */
  async carregarEmpenhosNovoCadastro() {
    const container = document.getElementById('empenhosPorAnoCadastro');
    const filtroAno = document.getElementById('filtroAnoCadastro');
    const buscaInput = document.getElementById('buscaEmpenhoCadastro');
    const btnNovo = document.getElementById('btnNovoEmpenho');

    if (!container) {
      return;
    }

    try {
      const empenhos = await this.features.empenho.carregarListaCadastro();
      this.cadastroEmpenhoState.empenhos = empenhos;

      // Popular filtro de anos
      this.features.empenho.preencherFiltroAnos(filtroAno, empenhos);

      // Renderizar lista
      this.features.empenho.renderLista(container, empenhos);
      this._bindCadastroListaDelegation(container);

      // Setup eventos (bind único para evitar listeners duplicados)
      if (!this.cadastroEmpenhoState.handlersBound) {
        if (buscaInput) {
          buscaInput.addEventListener('input', () => {
            this._filtrarListaCadastro(
              this.cadastroEmpenhoState.empenhos,
              container,
              buscaInput.value,
              filtroAno?.value
            );
          });
        }

        if (filtroAno) {
          filtroAno.addEventListener('change', () => {
            this._filtrarListaCadastro(
              this.cadastroEmpenhoState.empenhos,
              container,
              buscaInput?.value || '',
              filtroAno.value
            );
          });
        }

        if (btnNovo) {
          btnNovo.addEventListener('click', () => {
            this.limparFormulario('formEmpenho');
            this._resetarDraftEmpenho();
            window.scrollTo({ top: document.querySelector('.form-container')?.offsetTop || 0, behavior: 'smooth' });
          });
        }

        this.cadastroEmpenhoState.handlersBound = true;
      }
    } catch (error) {
      console.error('[APP] Erro ao carregar lista cadastro:', error);
      container.innerHTML = `<p style="padding: 20px; color: #c00;">Erro ao carregar: ${error.message}</p>`;
    }
  }

  /**
   * Filtra e renderiza a lista de empenhos no Novo Cadastro
   */
  _filtrarListaCadastro(empenhos, container, termoBusca, anoFiltro) {
    const filtrados = this.features.empenho.filtrarLista(empenhos, termoBusca, anoFiltro);
    this._renderizarListaCadastro(filtrados, container);
  }

  /**
   * Renderiza a lista de empenhos agrupados por ano
   */
  _renderizarListaCadastro(empenhos, container) {
    this.features.empenho.renderLista(container, empenhos);
  }

  _bindCadastroListaDelegation(container) {
    if (!container || this.cadastroEmpenhoState.listDelegationBound) {
      return;
    }

    container.addEventListener('click', async (event) => {
      const header = event.target.closest('.empenho-ano-header');
      if (header && container.contains(header)) {
        const ano = header.dataset.ano;
        const lista = document.getElementById(`listaAno${ano}`);
        if (lista) {
          lista.classList.toggle('collapsed');
          header.classList.toggle('collapsed');
        }
        return;
      }

      const btnVisualizar = event.target.closest('.btn-acao.visualizar');
      if (btnVisualizar && container.contains(btnVisualizar)) {
        event.stopPropagation();
        const id = Number.parseInt(btnVisualizar.dataset.id, 10);
        if (Number.isFinite(id)) {
          this.abrirEmpenhoParaEdicao(id, true);
        }
        return;
      }

      const btnExcluir = event.target.closest('.btn-acao.excluir');
      if (btnExcluir && container.contains(btnExcluir)) {
        event.stopPropagation();
        const id = Number.parseInt(btnExcluir.dataset.id, 10);
        if (Number.isFinite(id) && confirm('Tem certeza que deseja excluir este empenho?')) {
          await this._excluirEmpenho(id);
          await this.carregarEmpenhosNovoCadastro();
        }
      }
    });

    this.cadastroEmpenhoState.listDelegationBound = true;
  }

  /**
   * Renderiza um item de empenho na lista do Cadastro
   */
  _renderizarItemCadastro(emp) {
    const status = emp.statusValidacao || 'rascunho';
    const badgeClass = status === 'validado' ? 'ativo' : status === 'concluido' ? 'concluido' : 'rascunho';
    const badgeText = status === 'validado' ? '✅ Ativo' : status === 'concluido' ? '🏁 Concluído' : '📝 Rascunho';
    const fornecedor = emp.fornecedor || 'Fornecedor não informado';
    const qtdItens = emp.itens?.length || 0;

    return `
      <div class="empenho-item">
        <div class="empenho-item-info">
          <span class="empenho-item-titulo">${emp.ano} NE ${emp.numero}</span>
          <div class="empenho-item-meta">
            <span>${fornecedor}</span>
            <span>• ${qtdItens} item(ns)</span>
            <span class="badge-status ${badgeClass}">${badgeText}</span>
          </div>
        </div>
        <div class="empenho-item-acoes">
          <button class="btn-acao visualizar" data-id="${emp.id}" title="Visualizar empenho">🔍 Visualizar</button>
          <button class="btn-acao excluir" data-id="${emp.id}" title="Excluir empenho">🗑️</button>
        </div>
      </div>
    `;
  }

  /**
   * Exclui um empenho
   */
  async _excluirEmpenho(id) {
    try {
      await this.features.empenho.excluir(id);
    } catch (error) {
      console.error('[APP] Erro ao excluir empenho:', error);
      this.showError('Erro ao excluir empenho: ' + error.message);
    }
  }

  /**
   * Carrega o Controle de Saldos na aba
   */
  async carregarControleSaldos() {
    const container = document.getElementById('controleSaldosContainer');
    if (!container) {
      return;
    }

    try {
      // ✅ BUSCAR TODOS OS EMPENHOS (incluindo sem arquivo)
      const empenhosCompletos = await window.dbManager.buscarEmpenhos(true);
      const empenhosComArquivo = await window.dbManager.buscarEmpenhos();

      console.log(
        '[APP] 📊 Controle Saldos - Total:',
        empenhosCompletos.length,
        'Com arquivo:',
        empenhosComArquivo.length
      );

      if (!empenhosCompletos || empenhosCompletos.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <p style="font-size: 18px; color: #666;">📭 Nenhum empenho cadastrado.</p>
            <p>Cadastre empenhos para visualizar o controle de saldos.</p>
          </div>
        `;
        return;
      }

      // Criar seletor e conteúdo (usar TODOS os empenhos)
      const html = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 300px;">
              <label style="font-weight: bold; margin-right: 10px; display: block; margin-bottom: 5px;">Selecione o Empenho:</label>
              <select id="saldoEmpenhoSelectTab" style="width: 100%; padding: 8px; font-size: 14px; border-radius: 4px; border: 1px solid #ccc;">
                <option value="">-- Selecione um empenho --</option>
                ${empenhosCompletos
                  .map(
                    (emp) => `
                  <option value="${emp.id}">
                    NE ${emp.numero} - ${emp.fornecedor} - ${FormatUtils.formatCurrencyBR(emp.valorTotalEmpenho ?? emp.valorTotal ?? 0)}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>
            <button
              onclick="window.app.carregarControleSaldos()"
              style="padding: 10px 20px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; white-space: nowrap;"
              title="Recarregar lista de empenhos">
              🔄 Atualizar Lista
            </button>
          </div>
          <p style="margin-top: 10px; font-size: 12px; color: #666;">
            💡 Total: ${empenhosCompletos.length} empenho(s) | ${empenhosComArquivo.length} com arquivo PDF vinculado
          </p>
        </div>
        <div id="saldoDetalhesTab" style="margin-top: 20px;"></div>
      `;

      container.innerHTML = html;

      // Adicionar evento ao select
      document.getElementById('saldoEmpenhoSelectTab').addEventListener('change', async (e) => {
        const empenhoId = parseInt(e.target.value);
        if (empenhoId) {
          await this.carregarSaldoEmpenhoTab(empenhoId);
        } else {
          document.getElementById('saldoDetalhesTab').innerHTML = '';
        }
      });
    } catch (error) {
      console.error('Erro ao carregar controle de saldos:', error);
      container.innerHTML = `<div class="alert alert-danger">Erro ao carregar: ${error.message}</div>`;
    }
  }

  /**
   * Carrega detalhes do saldo de um empenho na aba
   */
  async carregarSaldoEmpenhoTab(empenhoId) {
    const container = document.getElementById('saldoDetalhesTab');
    if (!container) {
      return;
    }

    // Usar a mesma lógica do carregarSaldoEmpenho original
    await this.carregarSaldoEmpenho(empenhoId, container);
  }

  /**
   * Carrega o Relatório de Empenhos na aba (com busca, filtros e ordenação)
   * Delega para o módulo RelatoriosEmpenhos
   */
  async carregarRelatorioEmpenhos() {
    // Inicializar módulo de relatórios se ainda não foi inicializado
    if (window.RelatoriosEmpenhos && !this._relatoriosInicializado) {
      window.RelatoriosEmpenhos.inicializar();
      this._relatoriosInicializado = true;
    }

    // Delegar para o novo módulo de relatórios
    if (window.RelatoriosEmpenhos?.carregar) {
      await window.RelatoriosEmpenhos.carregar();
      return;
    }

    // Fallback para o método antigo (compatibilidade)
    await this._carregarRelatorioEmpenhosLegacy();
  }

  /**
   * Método legado para carregar relatório (fallback)
   * @deprecated Use RelatoriosEmpenhos.carregar()
   */
  async _carregarRelatorioEmpenhosLegacy() {
    const container = document.getElementById('relatorioEmpenhosContainer');
    if (!container) {
      return;
    }

    try {
      // Mostrar loading
      container.innerHTML = `
        <div class="empenhos-loading">
          <span>⏳ Carregando empenhos...</span>
        </div>
      `;

      // Definir modo visualização (somente leitura - sem edição)
      this.listagemState.modoVisualizacao = true;

      // ✅ BUSCAR TODOS OS EMPENHOS (uma única vez)
      const dados = await window.dbManager.buscarEmpenhos(true);
      this.listagemState.empenhos = this._normalizarEmpenhosListagem(dados || []);

      console.log('[APP] 📊 Empenhos carregados:', this.listagemState.empenhos.length);

      // Renderizar estrutura completa
      this._renderizarEstruturaListagem(container);

      // Configurar eventos
      this._setupEventosListagem(container);

      // Renderizar lista filtrada
      this._renderizarListaEmpenhos();
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger';
      errorDiv.textContent = `Erro ao carregar: ${error.message || 'Erro desconhecido'}`;
      container.innerHTML = '';
      container.appendChild(errorDiv);
    }
  }

  /**
   * Renderiza a estrutura HTML da listagem (busca, filtros, ordenação)
   */
  _renderizarEstruturaListagem(container) {
    const total = this.listagemState.empenhos.length;

    container.innerHTML = `
      <div class="listagem-empenhos">
        <!-- Header -->
        <div class="listagem-header">
          <h3>📋 Notas de Empenho</h3>
          <span class="listagem-contador" id="contadorEmpenhos">
            ${total} empenho(s) cadastrado(s)
          </span>
        </div>

        <!-- Barra de busca -->
        <div class="listagem-busca">
          <input
            type="text"
            id="buscaEmpenho"
            class="busca-input"
            placeholder="🔍 Buscar empenho (ano, número, fornecedor, processo...)"
            value="${this.listagemState.termoBusca}"
          />
        </div>

        <!-- Filtros e Ordenação -->
        <div class="listagem-controles">
          <div class="filtros-chips">
            <button class="chip ${this.listagemState.filtroStatus === 'todos' ? 'chip-ativo' : ''}" data-filtro="todos">
              Todos
            </button>
            <button class="chip ${this.listagemState.filtroStatus === 'rascunho' ? 'chip-ativo' : ''}" data-filtro="rascunho">
              🟡 Rascunhos
            </button>
            <button class="chip ${this.listagemState.filtroStatus === 'validado' ? 'chip-ativo' : ''}" data-filtro="validado">
              🟢 Validados
            </button>
          </div>
          <div class="ordenacao-container">
            <label for="ordenacaoEmpenho">Ordenar por:</label>
            <select id="ordenacaoEmpenho" class="ordenacao-select">
              <option value="ano-numero" ${this.listagemState.ordenacao === 'ano-numero' ? 'selected' : ''}>Ano/Número</option>
              <option value="data" ${this.listagemState.ordenacao === 'data' ? 'selected' : ''}>Data de Emissão</option>
              <option value="fornecedor" ${this.listagemState.ordenacao === 'fornecedor' ? 'selected' : ''}>Fornecedor</option>
              <option value="valor" ${this.listagemState.ordenacao === 'valor' ? 'selected' : ''}>Valor Total</option>
            </select>
          </div>
        </div>

        <!-- Lista de empenhos -->
        <div class="empenhos-lista" id="listaEmpenhosContainer">
          <!-- Renderizado dinamicamente -->
        </div>

        <!-- Rodapé com contador -->
        <div class="listagem-footer" id="footerListagem">
          <span id="totalExibido">📊 Total exibido: ${total}</span>
        </div>
      </div>

      <style>
        .listagem-empenhos { padding: 0; }
        .listagem-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
        .listagem-header h3 { margin: 0; }
        .listagem-contador { color: #666; font-size: 14px; }
        .listagem-busca { margin-bottom: 16px; }
        .busca-input { width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; transition: border-color 0.2s; }
        .busca-input:focus { outline: none; border-color: #007bff; }
        .listagem-controles { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .filtros-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .chip { padding: 8px 16px; border: 1px solid #ddd; border-radius: 20px; background: #fff; cursor: pointer; font-size: 13px; transition: all 0.2s; }
        .chip:hover { border-color: #007bff; background: #f0f7ff; }
        .chip-ativo { background: #007bff; color: #fff; border-color: #007bff; }
        .ordenacao-container { display: flex; align-items: center; gap: 8px; }
        .ordenacao-container label { font-size: 13px; color: #666; white-space: nowrap; }
        .ordenacao-select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; cursor: pointer; }
        .empenhos-lista { display: flex; flex-direction: column; gap: 12px; min-height: 100px; }
        .empenhos-loading { text-align: center; padding: 40px; color: #666; }
        .empenhos-vazio { text-align: center; padding: 40px; color: #666; }
        .empenho-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; transition: all 0.2s; cursor: pointer; }
        .empenho-card:hover { border-color: #007bff; box-shadow: 0 4px 12px rgba(0,123,255,0.15); transform: translateY(-1px); }
        .empenho-card.card-destaque { border-color: #28a745; background: #f8fff8; animation: destaque-fade 3s ease-out; }
        @keyframes destaque-fade { 0% { background: #d4edda; } 100% { background: #f8fff8; } }
        .empenho-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .empenho-card__titulo { font-weight: bold; font-size: 17px; color: #333; }
        .empenho-card__titulo:hover { color: #007bff; }
        .empenho-card__body { display: flex; flex-direction: column; gap: 8px; }
        .empenho-card__descricao { color: #007bff; font-size: 14px; cursor: pointer; }
        .empenho-card__descricao:hover { text-decoration: underline; }
        .empenho-card__meta { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .empenho-card__info { font-size: 13px; color: #666; }
        .empenho-card__acoes { display: flex; gap: 8px; }
        .btn-acao { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; background: #fff; cursor: pointer; font-size: 12px; transition: all 0.2s; }
        .btn-acao:hover { background: #f0f7ff; border-color: #007bff; }
        .btn-acao[title]:hover::after { content: attr(title); }
        .badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .listagem-footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee; font-size: 13px; color: #666; }
        @media (max-width: 768px) {
          .listagem-controles { flex-direction: column; align-items: stretch; }
          .ordenacao-container { justify-content: flex-end; }
          .empenho-card__meta { flex-direction: column; align-items: flex-start; }
        }
      </style>
    `;
  }

  /**
   * Configura eventos da listagem (busca, filtros, ordenação)
   */
  _setupEventosListagem(container) {
    // Busca com debounce
    const inputBusca = container.querySelector('#buscaEmpenho');
    if (inputBusca) {
      inputBusca.addEventListener('input', (e) => {
        clearTimeout(this.listagemState.debounceTimer);
        this.listagemState.debounceTimer = setTimeout(() => {
          this.listagemState.termoBusca = e.target.value;
          this._renderizarListaEmpenhos();
        }, 300);
      });
    }

    // Filtros por status (chips)
    container.querySelectorAll('.chip[data-filtro]').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        this.listagemState.filtroStatus = e.target.dataset.filtro;
        // Atualizar visual dos chips
        container.querySelectorAll('.chip[data-filtro]').forEach((c) => c.classList.remove('chip-ativo'));
        e.target.classList.add('chip-ativo');
        this._renderizarListaEmpenhos();
      });
    });

    // Ordenação
    const selectOrdenacao = container.querySelector('#ordenacaoEmpenho');
    if (selectOrdenacao) {
      selectOrdenacao.addEventListener('change', (e) => {
        this.listagemState.ordenacao = e.target.value;
        this._renderizarListaEmpenhos();
      });
    }
  }

  /**
   * Filtra e ordena empenhos conforme estado
   */
  _filtrarEOrdenarEmpenhos() {
    let resultado = [...this.listagemState.empenhos];

    // Filtrar por status
    if (this.listagemState.filtroStatus !== 'todos') {
      resultado = resultado.filter((emp) => {
        const status = emp.statusValidacao || 'rascunho';
        return status === this.listagemState.filtroStatus;
      });
    }

    // Filtrar por termo de busca
    const termo = this.listagemState.termoBusca.toLowerCase().trim();
    if (termo) {
      resultado = resultado.filter((emp) => {
        const searchKey = emp.searchKey || this._buildEmpenhoSearchKey(emp);
        return searchKey.includes(termo);
      });
    }

    // Ordenar
    resultado.sort((a, b) => {
      switch (this.listagemState.ordenacao) {
        case 'data':
          return new Date(b.dataEmpenho || b.dataCriacao || 0) - new Date(a.dataEmpenho || a.dataCriacao || 0);
        case 'fornecedor':
          return (a.fornecedor || '').localeCompare(b.fornecedor || '');
        case 'valor':
          // Compatibilidade: usar novo nome ou antigo
          return (b.valorTotalEmpenho ?? b.valorTotal ?? 0) - (a.valorTotalEmpenho ?? a.valorTotal ?? 0);
        case 'ano-numero':
        default: {
          const anoA = parseInt(a.ano) || 0;
          const anoB = parseInt(b.ano) || 0;
          if (anoB !== anoA) {
            return anoB - anoA;
          }
          return (parseInt(b.numero) || 0) - (parseInt(a.numero) || 0);
        }
      }
    });

    return resultado;
  }

  _normalizarEmpenhosListagem(empenhos) {
    return empenhos.map((emp) => {
      if (emp.searchKey) {
        return emp;
      }

      return {
        ...emp,
        searchKey: this._buildEmpenhoSearchKey(emp)
      };
    });
  }

  _buildEmpenhoSearchKey(emp) {
    const processo = emp.processoSuap || emp.codigoReferencia || emp.processoNumero || emp.processo || '';
    const cnpj = emp.cnpjDigits || emp.cnpjFornecedor || '';

    return [
      String(emp.ano || ''),
      String(emp.numero || ''),
      String(emp.fornecedor || ''),
      String(processo),
      String(emp.statusValidacao || 'rascunho'),
      String(cnpj)
    ]
      .join(' ')
      .toLowerCase();
  }

  /**
   * Renderiza a lista de empenhos filtrada e ordenada
   */
  _renderizarListaEmpenhos() {
    const listaContainer = document.getElementById('listaEmpenhosContainer');
    const totalExibido = document.getElementById('totalExibido');
    const contador = document.getElementById('contadorEmpenhos');

    if (!listaContainer) {
      return;
    }

    const empenhosFiltrados = this._filtrarEOrdenarEmpenhos();

    // Atualizar contadores
    if (totalExibido) {
      const textoTotalExibido = `📊 Total exibido: ${empenhosFiltrados.length}`;
      if (totalExibido.textContent !== textoTotalExibido) {
        totalExibido.textContent = textoTotalExibido;
      }
    }
    if (contador) {
      const textoContador = `${empenhosFiltrados.length} de ${this.listagemState.empenhos.length} empenho(s)`;
      if (contador.textContent !== textoContador) {
        contador.textContent = textoContador;
      }
    }

    // Renderizar lista vazia
    if (empenhosFiltrados.length === 0) {
      listaContainer.innerHTML = `
        <div class="empenhos-vazio">
          <p>📭 Nenhum empenho encontrado.</p>
          ${this.listagemState.termoBusca ? '<p><small>Tente ajustar os termos da busca.</small></p>' : ''}
        </div>
      `;
      return;
    }

    // Renderizar cards (modo visualização = apenas Detalhes)
    const modoVis = this.listagemState.modoVisualizacao === true;
    listaContainer.innerHTML = empenhosFiltrados.map((emp) => this._renderizarCardEmpenho(emp, modoVis)).join('');

    // Adicionar eventos nos cards
    this._setupEventosCards(listaContainer, modoVis);
  }

  /**
   * Renderiza um card de empenho
   * @param {Object} emp - Dados do empenho
   * @param {boolean} somenteVisualizacao - Se true, renderiza sem botões de edição
   */
  _renderizarCardEmpenho(emp, somenteVisualizacao = false) {
    const ano = emp.ano || new Date(emp.dataEmpenho || emp.dataCriacao).getFullYear();
    const numero = emp.numero || '000000';
    const titulo = `${ano} NE ${numero}`;
    const status = emp.statusValidacao || 'rascunho';
    const badgeClass = status === 'validado' ? 'badge-success' : 'badge-warning';
    const badgeText = status === 'validado' ? '🟢 VALIDADO' : '🟡 RASCUNHO';
    const qtdItens = emp.itens?.length || 0;
    const fornecedor = emp.fornecedor || 'Fornecedor não informado';

    // Processo: usar processoSuap ou fallback para campos antigos
    const processoSuap = emp.processoSuap || emp.codigoReferencia || emp.processoNumero || emp.processo || '';
    const processoExibicao = processoSuap ? `Proc: ${processoSuap.substring(0, 20)}...` : '';

    // Valor: usar novo nome ou antigo (compatibilidade)
    const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
    const valor = FormatUtils.formatCurrencyBR(valorEmpenho);

    const isDestaque = this.listagemState.ultimoEditado === emp.id;

    // Botões de ação - diferentes para modo visualização e edição
    let botoesAcoes = '';
    if (somenteVisualizacao) {
      botoesAcoes = `
        <button class="btn-acao" data-action="ver-detalhes" data-id="${emp.id}" title="Ver detalhes">🔍 Detalhes</button>
      `;
    } else {
      botoesAcoes = `
        <button class="btn-acao" data-action="editar" data-id="${emp.id}" title="Editar empenho">✏️ Editar</button>
        <button class="btn-acao" data-action="adicionar-item" data-id="${emp.id}" title="Adicionar item">➕ Item</button>
        <button class="btn-acao" data-action="ver-detalhes" data-id="${emp.id}" title="Ver detalhes">🔍 Detalhes</button>
      `;
    }

    return `
      <div class="empenho-card ${isDestaque ? 'card-destaque' : ''}" data-id="${emp.id}" data-slug="${emp.slug || ''}">
        <div class="empenho-card__header">
          <span class="empenho-card__titulo">${titulo}</span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="empenho-card__body">
          <span class="empenho-card__descricao">
            ${fornecedor} ${processoExibicao ? `— ${processoExibicao}` : ''} — Total: ${valor}
          </span>
          <div class="empenho-card__meta">
            <span class="empenho-card__info">
              ${qtdItens} item(ns)
            </span>
            <div class="empenho-card__acoes">
              ${botoesAcoes}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Configura eventos nos cards de empenho
   * @param {HTMLElement} container - Container dos cards
   * @param {boolean} somenteVisualizacao - Se true, não configura eventos de edição
   */
  _setupEventosCards(container) {
    if (!container || container.dataset.cardsDelegacaoBound === '1') {
      return;
    }

    container.dataset.cardsDelegacaoBound = '1';

    container.addEventListener('click', async (event) => {
      const actionEl = event.target.closest('[data-action]');
      if (!actionEl || !container.contains(actionEl)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const action = actionEl.dataset.action;
      const card = actionEl.closest('.empenho-card');
      const rawId = actionEl.dataset.id || card?.dataset.id || '';
      const empenhoId = Number.parseInt(rawId, 10);

      if (!Number.isFinite(empenhoId)) {
        return;
      }

      if (action === 'ver-detalhes') {
        this._mostrarDetalhesEmpenho(empenhoId);
        return;
      }

      if (this.listagemState.modoVisualizacao === true) {
        return;
      }

      if (action === 'editar') {
        this.abrirEmpenhoParaEdicao(empenhoId);
        return;
      }

      if (action === 'adicionar-item') {
        await this.abrirEmpenhoParaEdicao(empenhoId);
        setTimeout(() => this.abrirModalItemEmpenho(), 300);
      }
    });

    container.addEventListener('dblclick', (event) => {
      if (this.listagemState.modoVisualizacao === true) {
        return;
      }

      const card = event.target.closest('.empenho-card');
      if (!card || !container.contains(card)) {
        return;
      }

      const empenhoId = Number.parseInt(card.dataset.id || '', 10);
      if (Number.isFinite(empenhoId)) {
        this.abrirEmpenhoParaEdicao(empenhoId);
      }
    });
  }

  /**
   * Mostra detalhes do empenho em um popup (público)
   * Wrapper para uso externo via window.app.mostrarDetalhesEmpenho()
   * @param {number|string} empenhoId - ID do empenho
   */
  async mostrarDetalhesEmpenho(empenhoId) {
    const id = typeof empenhoId === 'string' ? parseInt(empenhoId, 10) : empenhoId;
    return this._mostrarDetalhesEmpenho(id);
  }

  /**
   * Mostra detalhes do empenho em um popup (privado)
   */
  async _mostrarDetalhesEmpenho(empenhoId) {
    // Buscar empenho - primeiro tenta do cache, depois do banco
    let emp = this.listagemState.empenhos?.find((e) => e.id === empenhoId);
    if (!emp) {
      // Buscar do banco de dados
      emp = await window.dbManager.buscarEmpenhoPorId(empenhoId);
    }
    if (!emp) {
      this.showError('Empenho não encontrado');
      return;
    }

    const ano = emp.ano || '';
    const numero = emp.numero || '';
    const fornecedor = emp.fornecedor || 'Não informado';

    // ✅ Natureza da Despesa
    const naturezaCodigo = emp.naturezaDespesa || '';
    const naturezaNome = naturezaCodigo ? NaturezaSubelementos.getNaturezaNome(naturezaCodigo) : '';
    const naturezaExibicao = naturezaCodigo ? `${naturezaCodigo} - ${naturezaNome}` : 'Não informada';

    // CNPJ: migrar campo antigo se necessário, formatar para exibição
    const cnpjDigits = emp.cnpjDigits || FormatUtils.onlyDigits(emp.cnpjFornecedor || '');
    const cnpjFormatado = cnpjDigits ? FormatUtils.formatCNPJ(cnpjDigits) : 'Não informado';

    // Telefone: migrar campo antigo se necessário, formatar para exibição
    const telefoneDigits = emp.telefoneDigits || FormatUtils.onlyDigits(emp.telefoneFornecedor || '');
    const telefoneFormatado = telefoneDigits ? FormatUtils.formatPhone(telefoneDigits) : 'Não informado';

    const email = emp.emailFornecedor || 'Não informado';

    // Processo: migrar para processoSuap (campo único)
    const processoExibicao =
      emp.processoSuap || emp.codigoReferencia || emp.processoNumero || emp.processo || 'Não informado';

    // Valor: usar novo nome ou antigo
    const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
    const valorFormatado = FormatUtils.formatCurrencyBR(valorEmpenho);

    const status = emp.statusValidacao || 'rascunho';
    const qtdItens = emp.itens?.length || 0;
    const dataEmpenho = emp.dataEmpenho ? new Date(emp.dataEmpenho).toLocaleDateString('pt-BR') : 'Não informada';

    this._removerModalDetalhesEmpenho();

    const overlay = document.createElement('div');
    overlay.id = 'modalDetalhesEmpenhoOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card modal-detalhes">
        <div class="modal-header">
          <h4>📋 ${ano} NE ${numero}</h4>
          <button type="button" class="btn-fechar" id="btnFecharDetalhesX" title="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div class="detalhes-grid">
            <div class="detalhe-item"><strong>Natureza:</strong> ${naturezaExibicao}</div>
            <div class="detalhe-item"><strong>Fornecedor:</strong> ${fornecedor}</div>
            <div class="detalhe-item"><strong>CNPJ:</strong> ${cnpjFormatado}</div>
            <div class="detalhe-item"><strong>Telefone:</strong> ${telefoneFormatado}</div>
            <div class="detalhe-item"><strong>E-mail:</strong> ${email}</div>
            <div class="detalhe-item"><strong>Processo (SUAP):</strong> ${processoExibicao}</div>
            <div class="detalhe-item"><strong>Data:</strong> ${dataEmpenho}</div>
            <div class="detalhe-item"><strong>Valor Total:</strong> ${valorFormatado}</div>
            <div class="detalhe-item"><strong>Itens:</strong> ${qtdItens}</div>
            <div class="detalhe-item"><strong>Status:</strong> ${status.toUpperCase()}</div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="btnFecharDetalhes">Fechar</button>
          <button class="btn btn-primary" id="btnEditarDetalhes" data-id="${empenhoId}">✏️ Editar</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      const btnFechar = e.target.closest('#btnFecharDetalhes, #btnFecharDetalhesX');
      if (btnFechar) {
        this._removerModalDetalhesEmpenho();
        return;
      }

      const btnEditar = e.target.closest('#btnEditarDetalhes');
      if (btnEditar) {
        this._removerModalDetalhesEmpenho();
        this.abrirEmpenhoParaEdicao(empenhoId);
        return;
      }

      if (e.target === overlay) {
        this._removerModalDetalhesEmpenho();
      }
    });

    document.body.appendChild(overlay);
  }

  _removerModalDetalhesEmpenho() {
    const overlayAtual = document.getElementById('modalDetalhesEmpenhoOverlay');
    if (overlayAtual) {
      overlayAtual.remove();
    }
  }

  /**
   * Abre um empenho existente para edição ou visualização
   * @param {number} empenhoId - ID do empenho
   * @param {boolean} modoVisualizacao - Se true, abre em modo somente leitura
   */
  async abrirEmpenhoParaEdicao(empenhoId, modoVisualizacao = false) {
    try {
      this.showLoading(modoVisualizacao ? 'Carregando empenho...' : 'Carregando empenho para edição...');

      const empenho = await window.dbManager.buscarEmpenhoPorId(empenhoId);
      if (!empenho) {
        this.showError('Empenho não encontrado');
        return;
      }

      // ✅ DEBUG: Log dos dados carregados
      console.log('[EDIT] empenho carregado:', empenho);
      console.log('[EDIT] valorTotalEmpenho:', empenho?.valorTotalEmpenho ?? empenho?.valorTotal);
      console.log('[EDIT] telefone:', empenho?.telefoneDigits ?? empenho?.telefoneFornecedor);
      console.log('[EDIT] email:', empenho?.emailFornecedor);

      // Marcar como último editado (para destaque)
      this.listagemState.ultimoEditado = empenhoId;

      // ========== MIGRAÇÃO DE DADOS ANTIGOS ==========
      // CNPJ: migrar de cnpjFornecedor (formatado) para cnpjDigits (só dígitos)
      let cnpjDigits = empenho.cnpjDigits || '';
      if (!cnpjDigits && empenho.cnpjFornecedor) {
        cnpjDigits = FormatUtils.onlyDigits(empenho.cnpjFornecedor);
      }

      // Telefone: migrar de telefoneFornecedor (formatado) para telefoneDigits (só dígitos)
      let telefoneDigits = empenho.telefoneDigits || '';
      if (!telefoneDigits && empenho.telefoneFornecedor) {
        telefoneDigits = FormatUtils.onlyDigits(empenho.telefoneFornecedor);
      }

      // Valor: migrar de valorTotal para valorTotalEmpenho
      let valorTotalEmpenho = empenho.valorTotalEmpenho;
      if (valorTotalEmpenho === undefined || valorTotalEmpenho === null) {
        valorTotalEmpenho = empenho.valorTotal || 0;
      }

      // ✅ Processo SUAP: migrar de campos antigos (prioridade: processoSuap > codigoReferencia > processoNumero > processo)
      const processoSuap = FormatUtils.migrarParaProcessoSuap(empenho);

      console.log('[EDIT] Migração:', {
        cnpjDigits,
        telefoneDigits,
        valorTotalEmpenho,
        processoSuap
      });

      // Preencher o draft com os dados do empenho
      this.empenhoDraft = {
        header: {
          id: empenho.id,
          naturezaDespesa: empenho.naturezaDespesa || '', // ✅ Natureza da Despesa (339030 | 449052)
          ano: empenho.ano,
          numero: empenho.numero,
          dataEmissaoISO: empenho.dataEmpenho,
          processoSuap: processoSuap,
          valorTotalEmpenho: valorTotalEmpenho,
          fornecedorRazao: empenho.fornecedor || '',
          cnpjDigits: cnpjDigits,
          telefoneDigits: telefoneDigits,
          emailFornecedor: empenho.emailFornecedor || '',
          statusValidacao: empenho.statusValidacao || 'rascunho',
          validadoEm: empenho.validadoEm || null,
          validadoPor: empenho.validadoPor || null
        },
        itens: (empenho.itens || []).map((item, idx) => ({
          seq: item.seq || idx + 1,
          descricao: item.descricao || '',
          unidade: item.unidade || 'UN',
          quantidade: item.quantidade || 0,
          valorUnitario: item.valorUnitario || 0,
          valorTotal: item.valorTotal || 0,
          subelementoCodigo: item.subelementoCodigo || item.subelemento || '', // ✅ Migração
          subelementoNome: item.subelementoNome || '',
          itemCompra: item.itemCompra || '',
          catmatCodigo: item.catmatCodigo || '',
          catmatDescricao: item.catmatDescricao || '',
          catmatFonte: item.catmatFonte || '',
          observacao: item.observacao || ''
        }))
      };

      // Preencher formulário
      await this.syncFromDraftToForm();

      // Renderizar itens
      this.renderItensEmpenho();

      // ✅ Atualizar status do PDF anexado
      if (window.AnexarPdfNE?.atualizarStatusAnexoUI) {
        window.AnexarPdfNE.atualizarStatusAnexoUI(empenho);
      }

      // Aplicar modo (visualização ou edição)
      if (modoVisualizacao) {
        this._aplicarModoVisualizacao(true);
        this.showInfo(`Visualizando: ${empenho.ano} NE ${empenho.numero}`);
      } else {
        this._aplicarModoVisualizacao(false);
        this.showInfo(`Editando: ${empenho.ano} NE ${empenho.numero}`);
      }

      // Mostrar tela de empenho
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
      document.getElementById('empenhoScreen')?.classList.add('active');
    } catch (error) {
      console.error('[APP] Erro ao abrir empenho:', error);
      this.showError('Erro ao abrir empenho: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Aplica modo de visualização (campos desabilitados) ou edição (campos habilitados)
   * @param {boolean} visualizacao - Se true, desabilita campos; se false, habilita
   */
  _aplicarModoVisualizacao(visualizacao) {
    const form = document.getElementById('formEmpenho');
    if (!form) {
      return;
    }

    // Seletores dos campos do formulário
    const campos = form.querySelectorAll('input, select, textarea');
    const botoesAcao = form.querySelectorAll(
      '.btn-acao, .btn-secondary:not(#btnCancelarEmpenho):not(#btnHabilitarEdicao), #btnAddItem, #btnValidarEmpenho'
    );
    const btnSalvar = form.querySelector('button[type="submit"]');
    const btnAnexarPdf = document.getElementById('btnAnexarPdfNE');
    const formActions = form.querySelector('.form-actions');

    // Botões de excluir itens
    const botoesExcluirItem = form.querySelectorAll('[data-action="delete"]');

    // Botão de editar (criado dinamicamente)
    let btnEditarEmpenho = document.getElementById('btnHabilitarEdicao');

    if (visualizacao) {
      // === MODO VISUALIZAÇÃO ===
      campos.forEach((campo) => {
        campo.disabled = true;
        campo.classList.add('campo-visualizacao');
      });

      botoesAcao.forEach((btn) => {
        btn.style.display = 'none';
      });

      // Esconder botões de excluir item
      botoesExcluirItem.forEach((btn) => {
        btn.style.display = 'none';
      });

      if (btnSalvar) {
        btnSalvar.style.display = 'none';
      }

      if (btnAnexarPdf) {
        btnAnexarPdf.style.display = 'none';
      }

      // Adicionar botão "Editar" na área de ações (junto com Cancelar)
      if (!btnEditarEmpenho && formActions) {
        btnEditarEmpenho = document.createElement('button');
        btnEditarEmpenho.type = 'button';
        btnEditarEmpenho.id = 'btnHabilitarEdicao';
        btnEditarEmpenho.className = 'btn btn-primary';
        btnEditarEmpenho.innerHTML = '✏️ Editar Empenho';
        btnEditarEmpenho.style.cssText = 'display: flex; align-items: center; gap: 6px;';

        // Inserir após o botão Cancelar
        const btnCancelar = formActions.querySelector('#btnCancelarEmpenho');
        if (btnCancelar) {
          btnCancelar.after(btnEditarEmpenho);
        } else {
          formActions.appendChild(btnEditarEmpenho);
        }

        // Evento do botão editar
        btnEditarEmpenho.addEventListener('click', () => {
          this._aplicarModoVisualizacao(false);
          this.showInfo('Modo edição ativado');
        });
      } else if (btnEditarEmpenho) {
        btnEditarEmpenho.style.display = 'flex';
      }

      console.log('[APP] 👁️ Modo visualização ativado');
    } else {
      // === MODO EDIÇÃO ===
      campos.forEach((campo) => {
        campo.disabled = false;
        campo.classList.remove('campo-visualizacao');
      });

      botoesAcao.forEach((btn) => {
        btn.style.display = '';
      });

      // Mostrar botões de excluir item
      botoesExcluirItem.forEach((btn) => {
        btn.style.display = '';
      });

      if (btnSalvar) {
        btnSalvar.style.display = '';
      }

      if (btnAnexarPdf) {
        btnAnexarPdf.style.display = '';
      }

      // Esconder botão de editar
      if (btnEditarEmpenho) {
        btnEditarEmpenho.style.display = 'none';
      }

      console.log('[APP] ✏️ Modo edição ativado');
    }
  }

  /**
   * Configura uploads de arquivos PDF
   */
  setupFileUploads() {
    // Upload de Nota de Empenho
    this.setupPDFUpload('uploadEmpenho', 'fileEmpenho', (file, textContent, extractedData) => {
      this.processarEmpenhoUpload(file, textContent, extractedData);
    });

    // Upload de Nota Fiscal
    this.setupPDFUpload('uploadNotaFiscal', 'fileNotaFiscal', (file, textContent, extractedData) => {
      this.processarNotaFiscalUpload(file, textContent, extractedData);
    });

    // Configura opções de entrada de Nota Fiscal
    this.setupNotaFiscalOptions();
  }

  /**
   * Configura upload de PDF genérico
   */
  setupPDFUpload(uploadBoxId, fileInputId, callback) {
    const uploadBox = document.getElementById(uploadBoxId);
    const fileInput = document.getElementById(fileInputId);

    if (!uploadBox || !fileInput) {
      return;
    }

    // Click no box abre seletor de arquivo
    uploadBox.addEventListener('click', () => {
      fileInput.click();
    });

    // Drag and drop
    uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', () => {
      uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadBox.classList.remove('dragover');

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type === 'application/pdf') {
        this.processarPDF(files[0], callback);
      } else {
        this.showError('Por favor, selecione um arquivo PDF válido');
      }
    });

    // Seleção de arquivo
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type === 'application/pdf') {
        this.processarPDF(file, callback);
      } else {
        this.showError('Por favor, selecione um arquivo PDF válido');
      }
    });
  }

  /**
   * Realiza login do usuário
   */
  async realizarLogin(event) {
    const form =
      event?.currentTarget instanceof HTMLFormElement
        ? event.currentTarget
        : document.getElementById('loginForm') || document.getElementById('formLogin');
    const usuario = form?.elements?.username?.value?.trim() || document.getElementById('loginUsuario')?.value.trim();
    const senha = form?.elements?.password?.value || document.getElementById('loginSenha')?.value;
    const errorDiv = document.getElementById('loginError');
    const btnLogin = document.getElementById('btnLogin');

    // Limpa erro anterior
    if (errorDiv) {
      errorDiv.classList.add('hidden');
      errorDiv.textContent = '';
    }

    // Validação de credenciais com InputValidator
    const validation = InputValidator.validateCredentials(usuario, senha);
    if (!validation.valid) {
      if (errorDiv) {
        errorDiv.textContent = validation.errors.join(', ');
        errorDiv.classList.remove('hidden');
      }
      return;
    }

    // Desabilita botão e mostra loading
    if (btnLogin) {
      console.log('[REALIZAR_LOGIN] 🔒 Desabilitando botão...');
      btnLogin.disabled = true;
      btnLogin.textContent = '🔄 Autenticando...';
    }

    try {
      console.log('🔐 Tentando fazer login via API:', usuario);
      const apiClient = (await import('./services/apiClient.js')).default;
      const resultadoAPI = await apiClient.login(usuario, senha);

      const usuarioApi = resultadoAPI?.usuario || resultadoAPI?.dados?.usuario || apiClient.getUser?.();
      if (!usuarioApi) {
        throw new Error('Resposta de autenticação inválida.');
      }

      this.usuarioLogado = {
        id: usuarioApi.id,
        nome: usuarioApi.nome,
        perfil: usuarioApi.perfil,
        login: usuarioApi.login || usuario
      };

      await this.salvarDadosLembradosPosLogin(usuario, '');

      if (form?.elements?.username) {
        form.elements.username.value = '';
      } else if (document.getElementById('loginUsuario')) {
        document.getElementById('loginUsuario').value = '';
      }

      if (form?.elements?.password) {
        form.elements.password.value = '';
      } else if (document.getElementById('loginSenha')) {
        document.getElementById('loginSenha').value = '';
      }

      await this.carregarDadosIniciais();
      this.atualizarUsuarioHeader();
      this.showScreen('homeScreen');

      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = '🔐 Entrar';
      }
      return;
    } catch (error) {
      console.error('❌ Erro no login:', error);
      const mensagemErroLogin = this.formatarMensagemErroLogin(error);
      console.warn('[AUTH][LOGIN] Falha de autenticação:', mensagemErroLogin);

      if (errorDiv) {
        errorDiv.textContent = mensagemErroLogin;
        errorDiv.classList.remove('hidden');
      }

      // Reseta botão
      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = '🔐 Entrar';
      }
    }
  }

  formatarMensagemErroLogin(error) {
    const mensagemOriginal = String(error?.message || '').toLowerCase();

    if (error?.status === 401) {
      if (mensagemOriginal.includes('sessão expirada') || mensagemOriginal.includes('sessao expirada')) {
        return '⏱️ Sessão expirada. Faça login novamente.';
      }

      return '❌ Usuário ou senha inválidos. Verifique e tente novamente.';
    }

    if (mensagemOriginal.includes('failed to fetch') || mensagemOriginal.includes('timeout')) {
      return '🌐 Não foi possível conectar ao servidor. Verifique se o backend está ativo.';
    }

    return error?.message || 'Erro ao realizar login. Tente novamente.';
  }

  /**
   * Realiza logout do sistema
   */
  /**
   * Realiza logout do sistema
   */
  async realizarLogout() {
    try {
      const apiClient = (await import('./services/apiClient.js')).default;
      await apiClient.logout();
    } catch (error) {
      console.warn('⚠️ Falha ao encerrar sessão na API:', error?.message || error);
    }

    // Limpa usuário logado
    this.usuarioLogado = null;

    // Limpa campos de login
    const loginForm = document.getElementById('loginForm') || document.getElementById('formLogin');
    const usuarioInput = loginForm?.elements?.username || document.getElementById('loginUsuario');
    const senhaInput = loginForm?.elements?.password || document.getElementById('loginSenha');
    const errorDiv = document.getElementById('loginError');

    if (usuarioInput) {
      usuarioInput.value = '';
    }
    if (senhaInput) {
      senhaInput.value = '';
    }
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }

    // Limpa nome do usuário no header
    const usuarioNome = document.getElementById('usuarioLogadoNome');
    if (usuarioNome) {
      usuarioNome.textContent = '';
    }

    // Volta para tela de login
    this.showScreen('loginScreen');
  }

  /**
   * Atualiza informações do usuário logado no header
   */
  atualizarUsuarioHeader() {
    const usuarioNome = document.getElementById('usuarioLogadoNome');

    if (usuarioNome && this.usuarioLogado) {
      const perfil = this.usuarioLogado.perfil === 'admin' ? '👑' : '👤';
      // Prevenção XSS: usar textContent para dados de usuário
      const nomeExibicao = this.usuarioLogado.nome || this.usuarioLogado.login;
      usuarioNome.textContent = `${perfil} ${nomeExibicao}`;
      console.log('✅ Header atualizado com usuário:', this.usuarioLogado.nome);
    }
  }

  /**
   * Abre a aba de usuários na tela de configurações
   */
  abrirAbaUsuariosConfiguracao() {
    try {
      // Tenta acessar o iframe de configurações
      const configIframe = document.getElementById('configIframe');

      if (configIframe && configIframe.contentWindow) {
        // Aguarda o iframe carregar completamente
        const tentarAbrirAba = () => {
          try {
            const iframeDoc = configIframe.contentWindow.document;
            const usuariosTab = iframeDoc.querySelector('[data-tab="usuarios"]');

            if (usuariosTab) {
              usuariosTab.click();
              console.log('✅ Aba de usuários aberta automaticamente');

              // Scroll suave até o formulário de novo usuário
              setTimeout(() => {
                const formNovoUsuario = iframeDoc.getElementById('formNovoUsuario');
                if (formNovoUsuario) {
                  formNovoUsuario.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });
                }
              }, 300);
            } else {
              console.warn('⚠️ Aba de usuários não encontrada no iframe');
            }
          } catch (error) {
            console.error('Erro ao acessar iframe:', error);
          }
        };

        // Se o iframe já está carregado, tenta imediatamente
        if (configIframe.contentWindow.document.readyState === 'complete') {
          tentarAbrirAba();
        } else {
          // Caso contrário, aguarda o carregamento
          configIframe.addEventListener('load', tentarAbrirAba, { once: true });
        }
      }
    } catch (error) {
      console.error('Erro ao abrir aba de usuários:', error);
    }
  }

  /**
   * Configura as opções de entrada de Nota Fiscal
   */
  setupNotaFiscalOptions() {
    this._refreshNotaFiscalOptionRefs();

    // Alternância entre opções de entrada
    if (!this.notaFiscalUIState.opcaoHandlersBound) {
      (this.notaFiscalUIState.opcaoCards || []).forEach((card) => {
        card.addEventListener('click', (e) => {
          const opcao = e.currentTarget.dataset.opcao;
          this.selecionarOpcaoEntrada(opcao);
        });
      });
      this.notaFiscalUIState.opcaoHandlersBound = true;
    }

    // Funcionalidades de chave de acesso
    this.setupChaveAcesso();

    // Funcionalidades de código de barras - DESATIVADO
    // this.setupCodigoBarras();
  }

  _getNotaFiscalRefs() {
    const current = this.notaFiscalUIState.refs;
    if (current && current.chaveInput && document.contains(current.chaveInput)) {
      return current;
    }

    this.notaFiscalUIState.refs = {
      chaveInput: document.getElementById('chaveAcessoInput'),
      btnBuscarPorChave: document.getElementById('btnBuscarPorChave'),
      btnLimparChave: document.getElementById('btnLimparChave'),
      chaveStatus: document.getElementById('chaveStatus'),
      barcodeVideo: document.getElementById('barcodeVideo'),
      btnStartCamera: document.getElementById('btnStartCamera'),
      btnStopCamera: document.getElementById('btnStopCamera'),
      btnSwitchCamera: document.getElementById('btnSwitchCamera'),
      btnUsarCodigoBarras: document.getElementById('btnUsarCodigoBarras'),
      barcodeData: document.getElementById('barcodeData'),
      barcodeResult: document.getElementById('barcodeResult'),
      barcodeStatus: document.getElementById('barcodeStatus')
    };

    return this.notaFiscalUIState.refs;
  }

  _refreshNotaFiscalOptionRefs() {
    const opcaoCards = Array.from(document.querySelectorAll('.opcao-card'));
    const entradaContents = Array.from(document.querySelectorAll('.entrada-content'));

    this.notaFiscalUIState.opcaoCards = opcaoCards;
    this.notaFiscalUIState.entradaContents = entradaContents;
  }

  /**
   * Seleciona opção de entrada de NF
   */
  selecionarOpcaoEntrada(opcao) {
    const precisaRefresh =
      !Array.isArray(this.notaFiscalUIState.opcaoCards) || !Array.isArray(this.notaFiscalUIState.entradaContents);
    if (precisaRefresh) {
      this._refreshNotaFiscalOptionRefs();
    }

    const opcaoCards = this.notaFiscalUIState.opcaoCards || [];
    const entradaContents = this.notaFiscalUIState.entradaContents || [];

    // Remove seleção anterior
    opcaoCards.forEach((card) => {
      card.classList.remove('active');
    });

    // Oculta todos os conteúdos
    entradaContents.forEach((content) => {
      content.classList.add('hidden');
    });

    // Ativa opção selecionada
    document.querySelector(`[data-opcao="${opcao}"]`).classList.add('active');
    document.getElementById(`content${opcao.charAt(0).toUpperCase() + opcao.slice(1)}`).classList.remove('hidden');

    // Para câmera, reset quando trocar de opção - DESATIVADO
    // if (opcao !== "barcode") {
    //   this.pararCamera();
    // }
  }

  /**
   * Configura funcionalidades de chave de acesso
   */
  setupChaveAcesso() {
    const { chaveInput, btnBuscarPorChave: btnBuscar, btnLimparChave: btnLimpar } = this._getNotaFiscalRefs();

    if (!chaveInput || !btnBuscar || !btnLimpar) {
      return;
    }

    if (this.notaFiscalUIState.chaveHandlersBound) {
      return;
    }

    // Formatação da chave durante digitação
    chaveInput.addEventListener('input', (e) => {
      // Remove tudo que não é número
      let value = e.target.value.replace(/\D/g, '');
      // Limita a 44 dígitos
      value = value.substring(0, 44);
      e.target.value = value;

      // Valida comprimento
      if (value.length === 44) {
        btnBuscar.disabled = false;
        this.showChaveStatus('Chave válida! Clique em "Buscar" para consultar.', 'success');
      } else {
        btnBuscar.disabled = true;
        if (value.length > 0) {
          this.showChaveStatus(`Digite ${44 - value.length} dígitos restantes`, 'info');
        } else {
          this.hideChaveStatus();
        }
      }
    });

    // Buscar por chave
    btnBuscar.addEventListener('click', async () => {
      const chave = chaveInput.value.trim();
      if (chave.length === 44) {
        await this.buscarNotaFiscalPorChave(chave);
      }
    });

    // Limpar chave
    btnLimpar.addEventListener('click', () => {
      chaveInput.value = '';
      btnBuscar.disabled = true;
      this.hideChaveStatus();
    });

    this.notaFiscalUIState.chaveHandlersBound = true;
  }

  /**
   * Configura funcionalidades de código de barras
   */
  setupCodigoBarras() {
    const {
      barcodeVideo: video,
      btnStartCamera: btnStart,
      btnStopCamera: btnStop,
      btnSwitchCamera: btnSwitch,
      btnUsarCodigoBarras: btnUsar,
      barcodeData
    } = this._getNotaFiscalRefs();

    if (!video || !btnStart || !btnStop) {
      return;
    }

    if (this.notaFiscalUIState.barcodeHandlersBound) {
      return;
    }

    this.stream = null;
    this.cameras = [];
    this.currentCameraIndex = 0;
    this.barcodeDetected = false;

    // Iniciar câmera
    btnStart.addEventListener('click', async () => {
      await this.iniciarCamera();
    });

    // Parar câmera
    btnStop.addEventListener('click', () => {
      this.pararCamera();
    });

    // Trocar câmera
    btnSwitch?.addEventListener('click', async () => {
      await this.trocarCamera();
    });

    // Usar código detectado
    btnUsar?.addEventListener('click', () => {
      this.usarCodigoBarras(barcodeData?.textContent || '');
    });

    this.notaFiscalUIState.barcodeHandlersBound = true;
  }

  /**
   * Busca nota fiscal por chave de acesso
   */
  async buscarNotaFiscalPorChave(chave) {
    try {
      this.showLoading('Consultando nota fiscal...');
      this.showChaveStatus('Consultando base de dados...', 'info');

      // Simula consulta à API da Receita Federal ou sistema integrado
      // Em produção, aqui seria feita uma requisição real
      const dadosNF = await this.consultarChaveAcesso(chave);

      if (dadosNF) {
        this.preencherDadosNF(dadosNF);
        this.showChaveStatus('Nota fiscal encontrada e dados preenchidos!', 'success');
        this.showSuccess('Dados da nota fiscal carregados com sucesso!');
      } else {
        this.showChaveStatus('Nota fiscal não encontrada ou chave inválida', 'error');
        this.showError('Não foi possível encontrar a nota fiscal com esta chave');
      }
    } catch (error) {
      console.error('Erro ao buscar por chave:', error);
      this.showChaveStatus('Erro na consulta: ' + error.message, 'error');
      this.showError('Erro ao consultar nota fiscal: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Consulta chave de acesso usando módulo de integração
   */
  async consultarChaveAcesso(chave) {
    try {
      // Usa o módulo de integração com NF-e
      const dadosAPI = await window.nfeIntegration.consultarPorChave(chave);

      if (dadosAPI) {
        // Converte dados da API para formato interno
        return window.nfeIntegration.converterParaFormatoInterno(dadosAPI);
      }

      return null;
    } catch (error) {
      console.error('Erro na consulta via integração:', error);
      throw error;
    }
  }

  /**
   * Inicia câmera para leitura de código de barras
   */
  async iniciarCamera() {
    try {
      this.showBarcodeStatus('Inicializando câmera...', 'info');

      // Lista câmeras disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devices.filter((device) => device.kind === 'videoinput');

      if (this.cameras.length === 0) {
        throw new Error('Nenhuma câmera encontrada');
      }

      // Configura constraints da câmera
      const constraints = {
        video: {
          deviceId: this.cameras[this.currentCameraIndex].deviceId,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: this.cameras.length > 1 ? 'environment' : 'user'
        }
      };

      // Solicita acesso à câmera
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      const { barcodeVideo: video, btnStartCamera, btnStopCamera, btnSwitchCamera } = this._getNotaFiscalRefs();
      if (!video) {
        throw new Error('Elemento de vídeo não encontrado');
      }
      video.srcObject = this.stream;

      // Atualiza interface
      btnStartCamera?.classList.add('hidden');
      btnStopCamera?.classList.remove('hidden');

      if (this.cameras.length > 1) {
        btnSwitchCamera?.classList.remove('hidden');
      }

      this.showBarcodeStatus('Câmera ativa. Aponte para o código de barras da NF-e', 'success');

      // Inicia detecção de código de barras
      this.iniciarDeteccaoBarcode();
    } catch (error) {
      console.error('Erro ao iniciar câmera:', error);
      this.showBarcodeStatus('Erro ao acessar câmera: ' + error.message, 'error');
      this.showError('Não foi possível acessar a câmera: ' + error.message);
    }
  }

  /**
   * Para a câmera
   */
  pararCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // Para o leitor ZXing se estiver ativo
    if (this.codeReader) {
      this.codeReader.reset();
      this.codeReader = null;
    }

    const {
      barcodeVideo: video,
      btnStartCamera,
      btnStopCamera,
      btnSwitchCamera,
      barcodeResult
    } = this._getNotaFiscalRefs();
    if (video) {
      video.srcObject = null;
    }

    // Atualiza interface
    btnStartCamera?.classList.remove('hidden');
    btnStopCamera?.classList.add('hidden');
    btnSwitchCamera?.classList.add('hidden');
    barcodeResult?.classList.add('hidden');

    this.hideBarcodeStatus();
    this.barcodeDetected = false;
  }

  /**
   * Troca câmera (frente/traseira)
   */
  async trocarCamera() {
    if (this.cameras.length <= 1) {
      return;
    }

    this.pararCamera();
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
    await this.iniciarCamera();
  }

  /**
   * Inicia detecção de código de barras usando ZXing
   */
  iniciarDeteccaoBarcode() {
    try {
      // Inicializa o leitor ZXing se disponível
      if (typeof ZXing !== 'undefined') {
        this.codeReader = new ZXing.BrowserMultiFormatReader();

        this.codeReader.decodeFromVideoDevice(
          this.cameras[this.currentCameraIndex].deviceId,
          'barcodeVideo',
          (result, err) => {
            if (result) {
              this.codigoDetectado(result.text);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
              console.error('Erro na detecção:', err);
            }
          }
        );
      } else {
        // Fallback para detecção simulada
        this.iniciarDeteccaoSimulada();
      }
    } catch (error) {
      console.error('Erro ao inicializar ZXing:', error);
      this.iniciarDeteccaoSimulada();
    }
  }

  /**
   * Detecção simulada como fallback
   */
  iniciarDeteccaoSimulada() {
    const { barcodeVideo: video } = this._getNotaFiscalRefs();
    if (!video) {
      return;
    }
    let tentativas = 0;

    const detectar = () => {
      if (!this.stream || this.barcodeDetected) {
        return;
      }

      tentativas++;

      // Simula detecção após algumas tentativas (para demonstração)
      if (tentativas > 100 && Math.random() > 0.95) {
        const codigoSimulado = this.gerarCodigoBarrasSimulado();
        this.codigoDetectado(codigoSimulado);
        return;
      }

      requestAnimationFrame(detectar);
    };

    video.addEventListener('loadedmetadata', () => {
      this.showBarcodeStatus(
        'Modo demonstração ativo. Em 5-10 segundos será simulada a detecção de um código.',
        'warning'
      );
      detectar();
    });
  }

  /**
   * Gera código de barras simulado para testes
   */
  gerarCodigoBarrasSimulado() {
    // Simula um código de barras de NF-e (128 caracteres)
    const ano = '25';
    const mes = '10';
    const cnpj = '12345678000190';
    const modelo = '55'; // NF-e
    const serie = '001';
    const numero = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(9, '0');
    const resto = '0'.repeat(44 - 6 - 14 - 2 - 3 - 9); // Completa até 44

    return ano + mes + cnpj + modelo + serie + numero + resto;
  }

  /**
   * Processa código de barras detectado
   */
  codigoDetectado(codigo) {
    this.barcodeDetected = true;

    const { barcodeData, barcodeResult } = this._getNotaFiscalRefs();
    if (barcodeData) {
      barcodeData.textContent = codigo;
    }
    barcodeResult?.classList.remove('hidden');

    this.showBarcodeStatus('Código detectado! Verifique os dados e clique em "Usar"', 'success');
  }

  /**
   * Usa código de barras detectado
   */
  async usarCodigoBarras(codigo) {
    try {
      // Extrai chave de acesso do código de barras
      const chave = this.extrairChaveDoCodigoBarras(codigo);

      if (chave) {
        this.pararCamera();
        // Busca dados usando a chave extraída
        await this.buscarNotaFiscalPorChave(chave);
      } else {
        this.showError('Não foi possível extrair chave de acesso do código');
      }
    } catch (error) {
      console.error('Erro ao processar código de barras:', error);
      this.showError('Erro ao processar código: ' + error.message);
    }
  }

  /**
   * Extrai chave de acesso do código de barras
   */
  extrairChaveDoCodigoBarras(codigo) {
    try {
      return window.nfeIntegration.extrairChaveDoCodigoBarras(codigo);
    } catch (error) {
      console.error('Erro ao extrair chave:', error);
      throw error;
    }
  }

  /**
   * Preenche formulário com dados da NF
   */
  /**
   * Preenche formulário com dados da nota fiscal
   * IMPORTANTE: Usa formato unificado compatível com upload PDF e consulta por chave
   * @param {Object} dados - Dados extraídos (mesmo formato de extrairDadosNotaFiscal)
   */
  preencherDadosNF(dados) {
    // Número da NF
    if (dados.numero) {
      document.getElementById('numeroNotaFiscal').value = dados.numero;
    }

    // Data (formato unificado)
    if (dados.data) {
      document.getElementById('dataNotaFiscal').value = dados.data;
    }

    // CNPJ Emitente (formato unificado)
    if (dados.cnpjEmitente) {
      document.getElementById('cnpjEmitente').value = dados.cnpjEmitente;
    }

    // CNPJ Destinatário
    if (dados.cnpjDestinatario) {
      document.getElementById('cnpjDestinatario').value = dados.cnpjDestinatario;
    }

    // Chave de Acesso
    if (dados.chaveAcesso) {
      document.getElementById('chaveAcesso').value = dados.chaveAcesso;
    }

    // Valor Total
    if (dados.valorTotal) {
      document.getElementById('valorTotalNF').value = this.formatarMoeda(dados.valorTotal);
    }

    // Adiciona itens se houver
    if (dados.itens && dados.itens.length > 0) {
      this.adicionarItensExtraidos('itensNotaFiscal', dados.itens);

      // Calcula soma dos itens
      this.calcularSomaItensNF();
    }

    // Busca empenho correspondente pelo CNPJ Emitente
    if (dados.cnpjEmitente) {
      this.buscarEmpenhoCorrespondente(dados.cnpjEmitente);
    }

    // Salva dados para uso posterior
    this.currentNotaFiscal = {
      extractedData: dados,
      source: 'api' // Indica que veio de consulta
    };
  }

  /**
   * Mostra status da chave
   */
  showChaveStatus(message, type = 'info') {
    const { chaveStatus: statusDiv } = this._getNotaFiscalRefs();
    this._updateStatusMessage(statusDiv, 'chaveStatusLast', message, type);
  }

  /**
   * Oculta status da chave
   */
  hideChaveStatus() {
    const { chaveStatus: statusDiv } = this._getNotaFiscalRefs();
    this._hideStatusMessage(statusDiv, 'chaveStatusLast');
  }

  /**
   * Mostra status do código de barras
   */
  showBarcodeStatus(message, type = 'info') {
    const { barcodeStatus: statusDiv } = this._getNotaFiscalRefs();
    this._updateStatusMessage(statusDiv, 'barcodeStatusLast', message, type);
  }

  /**
   * Oculta status do código de barras
   */
  hideBarcodeStatus() {
    const { barcodeStatus: statusDiv } = this._getNotaFiscalRefs();
    this._hideStatusMessage(statusDiv, 'barcodeStatusLast');
  }

  _updateStatusMessage(statusDiv, stateKey, message, type) {
    if (!statusDiv) {
      return;
    }

    const normalizedMessage = String(message || '');
    const nextStatus = { message: normalizedMessage, type, hidden: false };
    const prevStatus = this.notaFiscalUIState[stateKey];

    if (
      prevStatus &&
      prevStatus.hidden === false &&
      prevStatus.message === nextStatus.message &&
      prevStatus.type === nextStatus.type
    ) {
      return;
    }

    if (statusDiv.textContent !== normalizedMessage) {
      statusDiv.textContent = normalizedMessage;
    }

    const className = `status-message ${type}`;
    if (statusDiv.className !== className) {
      statusDiv.className = className;
    }

    if (statusDiv.classList.contains('hidden')) {
      statusDiv.classList.remove('hidden');
    }

    this.notaFiscalUIState[stateKey] = nextStatus;
  }

  _hideStatusMessage(statusDiv, stateKey) {
    if (!statusDiv) {
      return;
    }

    const prevStatus = this.notaFiscalUIState[stateKey];
    if (prevStatus?.hidden === true && statusDiv.classList.contains('hidden')) {
      return;
    }

    statusDiv.classList.add('hidden');

    this.notaFiscalUIState[stateKey] = {
      message: prevStatus?.message || '',
      type: prevStatus?.type || 'info',
      hidden: true
    };
  }

  /**
   * Formata CNPJ
   */
  formatarCNPJ(cnpj) {
    if (typeof cnpj !== 'string') {
      return cnpj;
    }
    const numerosCNPJ = cnpj.replace(/\D/g, '');
    if (numerosCNPJ.length === 14) {
      return numerosCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  }

  /**
   * Processa um arquivo PDF
   */
  async processarPDF(file, callback) {
    try {
      this.showLoading('Processando PDF...');

      // Lê o conteúdo do PDF usando método básico primeiro
      const textContent = await window.pdfReader.lerPDF(file);

      // Determina o tipo de documento
      let extractedData = {};
      let usedNeParser = false;

      if (window.pdfReader.validarNotaEmpenho(textContent)) {
        // Aguarda o módulo neParser estar pronto
        if (window.neParserReady) {
          try {
            await window.neParserReady;
          } catch (e) {
            console.warn('Módulo neParser não carregou corretamente, usando parser genérico');
          }
        }

        // Tenta usar o parser especializado de NE primeiro
        if (window.neParser && typeof window.neParser.parseEmpenhoPdf === 'function') {
          try {
            console.log('🎯 Tentando parser especializado de Nota de Empenho...');
            const neData = await window.neParser.parseEmpenhoPdf(file);

            if (neData && neData.cabecalho && neData.cabecalho.numero) {
              // Converte formato do neParser para formato esperado pelo callback
              extractedData = {
                ano: neData.cabecalho.ano,
                numero: neData.cabecalho.numero,
                data: neData.cabecalho.dataEmissao || (neData.cabecalho.ano ? `${neData.cabecalho.ano}-01-01` : ''),
                naturezaDespesa: neData.cabecalho.naturezaDespesa || '',
                processo: neData.cabecalho.processo || '',
                fornecedor: neData.cabecalho.fornecedor,
                cnpj: neData.cabecalho.cnpj,
                valorTotal: neData.cabecalho.valorTotal,
                itens: neData.itens.map((item) => ({
                  seq: item.seq,
                  codigo: item.seq,
                  descricao: item.descricao,
                  unidade: item.unidade,
                  quantidade: item.quantidade,
                  valorUnitario: item.valorUnitario,
                  valorTotal: item.valorTotal,
                  subElemento: item.subElemento
                })),
                // Dados extras do NE Parser
                _neData: neData // Mantém dados originais completos
              };

              usedNeParser = true;
            } else {
              throw new Error('Parser NE não retornou dados válidos');
            }
          } catch (neError) {
            extractedData = window.pdfReader.extrairDadosEmpenho(textContent);
          }
        } else {
          extractedData = window.pdfReader.extrairDadosEmpenho(textContent);
        }
      } else if (window.pdfReader.validarNotaFiscal(textContent)) {
        extractedData = window.pdfReader.extrairDadosNotaFiscal(textContent);
      }

      // Marca se foi usado o parser especializado
      extractedData._usedNeParser = usedNeParser;

      // Chama callback com os dados processados
      callback(file, textContent, extractedData);
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      this.showError('Erro ao processar PDF: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Processa upload de Nota de Empenho
   */
  /**
   * Preenche formulário de empenho com dados extraídos
   * @private
   */
  _preencherFormularioEmpenho(extractedData) {
    if (extractedData.numero) {
      document.getElementById('numeroEmpenho').value = extractedData.numero;
    }
    if (extractedData.data) {
      document.getElementById('dataEmpenho').value = extractedData.data;
    }
    // Processo: migrar para processoSuap (campo único)
    if (extractedData.processo) {
      const migrado = FormatUtils.migrarProcesso(extractedData.processo);
      const inputProcesso = document.getElementById('processoSuapEmpenho');
      if (inputProcesso) {
        inputProcesso.value = migrado.processoSuap || '';
      }
    }
    if (extractedData.fornecedor) {
      document.getElementById('fornecedorEmpenho').value = extractedData.fornecedor;
    }
    if (extractedData.cnpj) {
      // CNPJ: formatar para exibição
      const cnpjDigits = FormatUtils.onlyDigits(extractedData.cnpj);
      document.getElementById('cnpjFornecedor').value = FormatUtils.formatCNPJ(cnpjDigits);
    }
    if (extractedData.valorTotal) {
      // ✅ FORMATAÇÃO BRASILEIRA: R$ 1.234,56
      document.getElementById('valorTotalEmpenho').value = FormatUtils.formatMoneyBR(extractedData.valorTotal);
    }
    this.adicionarItensExtraidos('itensEmpenho', extractedData.itens);
  }

  /**
   * Registra metadados de arquivo de empenho para persistência em banco
   * @private
   */
  async _salvarArquivoEmpenho(file, textContent, extractedData) {
    console.log('[APP] 💾 Registrando arquivo de empenho para persistência em banco...');

    try {
      // Preparar metadados para nome do arquivo
      const metadados = {
        numero: extractedData.numero,
        fornecedor: extractedData.fornecedor,
        data: extractedData.data
      };

      console.log('[APP] 📋 Metadados:', metadados);

      const ano = extractedData?.ano || new Date().getFullYear();
      const numero = String(extractedData?.numero || 'SEM_NUMERO').replace(/\D/g, '') || 'SEM_NUMERO';

      const result = {
        originalName: file?.name || `NE_${ano}_${numero}.pdf`,
        savedName: file?.name || `NE_${ano}_${numero}.pdf`,
        folderType: 'empenhos',
        year: parseInt(ano, 10) || new Date().getFullYear(),
        size: file?.size || 0,
        timestamp: new Date().toISOString(),
        path: `db://empenhos/${ano}/${numero}`,
        method: 'database'
      };

      console.log('[APP] ✅ Registro preparado para banco:', result.method);
      return result;
    } catch (error) {
      console.error('[APP] ❌ Erro ao salvar arquivo:', error);

      // ✅ MOSTRA ERRO DETALHADO COM MODAL SELECIONÁVEL
      this.showError(
        'Não foi possível salvar o arquivo de empenho.\n\n' +
          'Por favor, copie esta mensagem e os detalhes técnicos abaixo.',
        error
      );

      return null;
    }
  }

  /**
   * Gera mensagem de resumo do processamento
   * @private
   */
  _gerarMensagemResumoEmpenho(extractedData, arquivoInfo) {
    let mensagem = 'PDF processado com sucesso!\n\n';

    if (extractedData._usedNeParser) {
      mensagem += '🎯 Parser Especializado de NE utilizado!\n\n';

      if (extractedData._neData) {
        const neData = extractedData._neData;
        mensagem += 'Dados do Cabeçalho:\n';
        mensagem += neData.cabecalho.ano ? `✓ Ano: ${neData.cabecalho.ano}\n` : '';
        mensagem += neData.cabecalho.numero ? `✓ NE Nº: ${neData.cabecalho.numero}\n` : '';
        mensagem += neData.cabecalho.processo ? `✓ Processo: ${neData.cabecalho.processo}\n` : '';
        mensagem += neData.cabecalho.naturezaDespesa ? `✓ Natureza: ${neData.cabecalho.naturezaDespesa}\n` : '';
        mensagem += neData.cabecalho.fornecedor ? `✓ Fornecedor: ${neData.cabecalho.fornecedor}\n` : '';
        mensagem += neData.cabecalho.cnpj ? `✓ CNPJ: ${neData.cabecalho.cnpj}\n` : '';
        mensagem += neData.cabecalho.valorTotal ? `✓ Valor Total: R$ ${neData.cabecalho.valorTotal.toFixed(2)}\n` : '';
        mensagem += `\n✓ ${neData.itens.length} itens extraídos\n`;

        if (neData.itens.length > 0) {
          mensagem += '\nPrimeiros itens:\n';
          neData.itens.slice(0, 3).forEach((item) => {
            mensagem += `  • ${item.seq} - ${item.descricao_resumida}\n`;
          });
          if (neData.itens.length > 3) {
            mensagem += `  ... e mais ${neData.itens.length - 3} itens\n`;
          }
        }
      }
    } else {
      mensagem += 'Dados extraídos:\n';
      mensagem += extractedData.numero ? `✓ Número: ${extractedData.numero}\n` : '✗ Número não encontrado\n';
      mensagem += extractedData.data ? `✓ Data: ${extractedData.data}\n` : '✗ Data não encontrada\n';
      mensagem += extractedData.fornecedor
        ? `✓ Fornecedor: ${extractedData.fornecedor}\n`
        : '✗ Fornecedor não encontrado\n';
      mensagem += extractedData.cnpj ? `✓ CNPJ: ${extractedData.cnpj}\n` : '✗ CNPJ não encontrado\n';
      mensagem +=
        extractedData.itens && extractedData.itens.length > 0
          ? `✓ ${extractedData.itens.length} itens encontrados\n`
          : '✗ Nenhum item encontrado\n';
      mensagem += extractedData.valorTotal ? `✓ Valor Total: R$ ${extractedData.valorTotal.toFixed(2)}\n` : '';
    }

    if (arquivoInfo) {
      mensagem += `\nArquivo salvo em: ${arquivoInfo.path}`;
    }

    mensagem += '\n\nVerifique os dados e corrija se necessário.';
    return mensagem;
  }

  /**
   * Processa upload de Empenho (método principal simplificado)
   */
  async processarEmpenhoUpload(file, textContent, extractedData) {
    try {
      console.log('[APP] 📥 Processando upload de empenho...');
      console.log('[APP] 📄 ExtractedData recebido:', extractedData);

      // Validação do arquivo
      const fileValidation = InputValidator.validatePDFFile(file);
      if (!fileValidation.valid) {
        alert(`❌ Arquivo inválido: ${fileValidation.error}`);
        return;
      }

      // ✅ ATUALIZAR DRAFT A PARTIR DO PARSER
      this._atualizarDraftFromParser(extractedData);

      // ✅ NORMALIZAR DRAFT ANTES DE PREENCHER FORM
      this.normalizeEmpenhoDraft();

      // ✅ SINCRONIZAR DRAFT → FORMULÁRIO
      await this.syncFromDraftToForm();

      // Salva arquivo no sistema de arquivos
      const arquivoInfo = await this._salvarArquivoEmpenho(file, textContent, extractedData);

      // Salva dados do PDF para uso posterior
      this.currentEmpenho = {
        file: file,
        textContent: textContent,
        extractedData: extractedData,
        arquivoInfo: arquivoInfo
      };

      // Exibe mensagem de sucesso
      const mensagem = this._gerarMensagemResumoEmpenho(extractedData, arquivoInfo);
      this.showSuccess(mensagem);

      console.log('[APP] ✅ Upload de empenho processado com sucesso');
      console.log('[APP] 📊 Draft final:', this.empenhoDraft);
    } catch (error) {
      console.error('[APP] ❌ Erro ao processar upload de empenho:', error);
      this.showError('Erro ao processar PDF: ' + error.message, error);
    }
  }

  /**
   * ✅ ATUALIZA DRAFT A PARTIR DOS DADOS DO PARSER
   * @private
   */
  _atualizarDraftFromParser(extractedData) {
    console.log('[State] 📝 Atualizando draft from parser...');

    // ✅ Processo SUAP: usar o valor que vier do parser diretamente
    const processoSuap = extractedData.processo || '';

    // Resetar draft com novos nomes de campos
    this.empenhoDraft = {
      header: {
        ano: null,
        numero: null,
        dataEmissaoISO: null,
        naturezaDespesa: null,
        processoSuap: '',
        valorTotalEmpenho: 0,
        fornecedorRazao: null,
        cnpjDigits: '',
        telefoneDigits: '',
        emailFornecedor: ''
      },
      itens: []
    };

    // Preencher header
    this.empenhoDraft.header.ano = extractedData.ano || new Date().getFullYear().toString();
    this.empenhoDraft.header.numero = extractedData.numero || '';

    // Data: converter dd/mm/aaaa para ISO se necessário
    if (extractedData.data) {
      if (extractedData.data.includes('/')) {
        this.empenhoDraft.header.dataEmissaoISO = this.dataBRtoISO(extractedData.data);
      } else {
        this.empenhoDraft.header.dataEmissaoISO = extractedData.data;
      }
    }

    this.empenhoDraft.header.naturezaDespesa = extractedData.naturezaDespesa || '';

    // ✅ Processo SUAP (campo único)
    this.empenhoDraft.header.processoSuap = processoSuap;

    // Valor total (fixo, da NE)
    this.empenhoDraft.header.valorTotalEmpenho = extractedData.valorTotal || 0;
    this.empenhoDraft.header.fornecedorRazao = extractedData.fornecedor || '';

    // CNPJ: armazenar apenas dígitos
    this.empenhoDraft.header.cnpjDigits = FormatUtils.onlyDigits(extractedData.cnpj || '');

    // Preencher itens (remover duplicados)
    if (extractedData.itens && Array.isArray(extractedData.itens)) {
      const itensUnicos = [];
      const seqVistas = new Set();

      extractedData.itens.forEach((item) => {
        const seq = item.seq || item.item || itensUnicos.length + 1;

        // Evitar duplicados por seq
        if (seqVistas.has(seq)) {
          console.warn(`[State] ⚠️ Item duplicado seq=${seq} ignorado`);
          return;
        }

        seqVistas.add(seq);

        itensUnicos.push({
          seq: seq,
          descricao: item.descricao || item.material || '',
          unidade: item.unidade || 'UN',
          quantidade: this.parseNumero(item.quantidade || 0),
          valorUnitario: this.parseNumero(item.valorUnitario || item.valorUnit || 0),
          valorTotal: this.parseNumero(item.valorTotal || 0),
          subElemento: item.subElemento || null
        });
      });

      this.empenhoDraft.itens = itensUnicos;
      console.log(`[State] ✅ ${itensUnicos.length} itens únicos adicionados ao draft`);
    }

    console.log('[State] ✅ Draft atualizado from parser');
    console.log('[State] 📊 Header:', this.empenhoDraft.header);
    console.log('[State] 📦 Itens:', this.empenhoDraft.itens.length);
  }

  /**
   * Processa upload de Nota Fiscal
   */
  async processarNotaFiscalUpload(file, textContent, extractedData) {
    try {
      // Salva dados do PDF
      this.currentNotaFiscal = {
        file: file,
        textContent: textContent,
        extractedData: extractedData
      };

      // Exibe preview dos dados extraídos
      this.exibirPreviewNotaFiscal(extractedData);

      this.showSuccess('✅ PDF processado com sucesso! Revise os dados extraídos abaixo.');
    } catch (error) {
      console.error('Erro ao processar upload de nota fiscal:', error);
      this.showError('❌ Erro ao processar PDF: ' + error.message);
    }
  }

  /**
   * Calcula soma dos itens da NF e atualiza campos
   * @deprecated Use calcularValorTotalNotaFiscal() - mantido para compatibilidade
   */
  calcularSomaItensNF() {
    // Delega para a função principal que agora cuida de soma + diferença
    this.calcularValorTotalNotaFiscal();
  }

  /**
   * Converte string monetária para número
   */
  converterMoedaParaNumero(valor) {
    if (typeof valor === 'number') {
      return valor;
    }

    return (
      parseFloat(
        valor
          .toString()
          .replace(/[R$\s]/g, '')
          .replace(/\./g, '')
          .replace(',', '.')
      ) || 0
    );
  }

  /**
   * Formata número para moeda brasileira
   */
  formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  /**
   * Busca empenho correspondente para a nota fiscal
   */
  async buscarEmpenhoCorrespondente(cnpj) {
    try {
      // buscarEmpenhosPorCNPJ() agora já retorna apenas empenhos ativos
      const empenhos = await window.dbManager.buscarEmpenhosPorCNPJ(cnpj);

      const empenhoSelect = document.getElementById('empenhoAssociado');

      if (empenhos.length > 0) {
        // Limpa opções existentes
        empenhoSelect.innerHTML = '<option value="">Selecione um empenho...</option>';

        // Adiciona empenhos encontrados
        empenhos.forEach((empenho) => {
          const option = document.createElement('option');
          option.value = empenho.id;
          option.textContent = `${empenho.numero} - ${empenho.fornecedor}`;
          empenhoSelect.appendChild(option);
        });

        // Se há apenas um empenho, seleciona automaticamente
        if (empenhos.length === 1) {
          empenhoSelect.value = empenhos[0].id;
          await this.verificarDivergencias(empenhos[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar empenho correspondente:', error);
    }
  }

  /**
   * Verifica divergências entre nota fiscal e empenho
   */
  async verificarDivergencias(empenhoId) {
    try {
      if (!this.currentNotaFiscal) {
        return;
      }

      const divergencias = await window.dbManager.compararNotaFiscalComEmpenho(
        this.currentNotaFiscal.extractedData,
        parseInt(empenhoId)
      );

      const container = document.getElementById('divergenciasContainer');
      const lista = document.getElementById('listaDivergencias');

      if (divergencias.length > 0) {
        // Mostra divergências
        container.classList.remove('hidden');
        lista.innerHTML = '';

        divergencias.forEach((div) => {
          const divItem = document.createElement('div');
          divItem.className = 'divergencia-item';
          divItem.innerHTML = `
                        <strong>${div.tipo.replace('_', ' ').toUpperCase()}:</strong>
                        <p>${div.mensagem}</p>
                        ${div.valorNF ? `<small>NF: ${div.valorNF} | Empenho: ${div.valorEmpenho}</small>` : ''}
                    `;
          lista.appendChild(divItem);
        });

        this.showWarning(`${divergencias.length} divergência(s) encontrada(s)`);
      } else {
        container.classList.add('hidden');
        this.showSuccess('Nenhuma divergência encontrada!');
      }
    } catch (error) {
      console.error('Erro ao verificar divergências:', error);
    }
  }

  /**
   * Executa validação completa da NF usando NFValidator
   * Exibe resultado em modal
   */
  async executarValidacaoNF() {
    const DEBUG_NF = false;

    if (DEBUG_NF) {
      console.log('[NF] executarValidacaoNF iniciado');
    }

    try {
      // Verificar se NFValidator está disponível
      if (!window.NFValidator) {
        this.showError('❌ Módulo NFValidator não carregado. Recarregue a página.');
        return;
      }

      // Coletar dados do formulário
      const formData = new FormData(document.getElementById('formNotaFiscal'));
      const itens = this.coletarItens('itensNotaFiscal');
      const empenhoId = formData.get('empenhoAssociado');

      if (DEBUG_NF) {
        console.log('[NF] Dados coletados:', { empenhoId, itensCount: itens.length });
      }

      // Montar objeto NF
      const nf = {
        numero: formData.get('numeroNotaFiscal'),
        dataNotaFiscal: formData.get('dataNotaFiscal'),
        cnpjEmitente: formData.get('cnpjEmitente'),
        cnpjDestinatario: formData.get('cnpjDestinatario'),
        chaveAcesso: formData.get('chaveAcesso'),
        valorTotal: this.calcularValorTotalItens(itens),
        itens: itens
      };

      // Buscar empenho vinculado
      let empenho = null;
      if (empenhoId) {
        empenho = await window.dbManager.buscarEmpenhoPorId(parseInt(empenhoId));
        if (DEBUG_NF) {
          console.log('[NF] Empenho carregado:', empenho?.numero);
        }
      }

      // Executar validação
      const resultado = window.NFValidator.validateNF(nf, empenho);

      // Log no console
      window.NFValidator.logValidationResult(resultado);

      // Gerar HTML do relatório
      const htmlRelatorio = window.NFValidator.generateValidationReport(resultado);

      // Atualizar título do modal
      const tituloModal = document.getElementById('modalValidacaoTitulo');
      if (tituloModal) {
        tituloModal.innerHTML = resultado.ok ? '✅ Validação OK' : '❌ Divergências Encontradas';
        tituloModal.style.color = resultado.ok ? '#28a745' : '#dc3545';
      }

      // Exibir no modal
      const modalBody = document.getElementById('modalValidacaoBody');
      if (modalBody) {
        modalBody.innerHTML = htmlRelatorio;
      }

      // Mostrar modal
      document.getElementById('modalValidacaoNF')?.classList.remove('hidden');

      // Feedback visual
      if (resultado.ok) {
        this.showSuccess('✅ Validação OK! NF pode ser salva.');
      } else {
        this.showWarning(`⚠️ ${resultado.errors.length} erro(s) encontrado(s)`);
      }
    } catch (error) {
      console.error('[NF] Erro na validação:', error);
      this.showError('❌ Erro ao validar NF: ' + error.message);
    }
  }

  /**
   * Configura formulários
   */
  setupForms() {
    // Formulário de Empenho
    document.getElementById('formEmpenho')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.salvarEmpenho();
    });

    // Formulário de Entrega
    document.getElementById('formEntrega')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.salvarEntrega();
    });

    // Formulário de Nota Fiscal
    document.getElementById('formNotaFiscal')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.salvarNotaFiscal();
    });

    // ========== VALOR TOTAL NF MANUAL ==========
    // Campo valorTotalNF: manual e obrigatório
    const valorTotalNFInput = document.getElementById('valorTotalNF');
    if (valorTotalNFInput) {
      // Ao sair do campo, formatar valor
      valorTotalNFInput.addEventListener('blur', () => {
        const v = this.money2(this.parseMoneyInputBR(valorTotalNFInput.value));
        if (v > 0) {
          valorTotalNFInput.value = window.formatarNumero(v);
        }
        this.calcularValorTotalNotaFiscal();
      });

      // Ao digitar, recalcular diferença em tempo real
      valorTotalNFInput.addEventListener('input', () => {
        this.calcularValorTotalNotaFiscal();
      });
    }

    // Seleção de empenho na tela de entrega atualiza itens
    document.getElementById('empenhoSelect')?.addEventListener('change', (e) => {
      if (e.target.value) {
        this.carregarItensEmpenho(parseInt(e.target.value));
      }
    });

    // Seleção de empenho na nota fiscal - ENTRADA MANUAL MELHORADA
    document.getElementById('empenhoAssociado')?.addEventListener('change', async (e) => {
      if (e.target.value) {
        await this.onEmpenhoSelecionado(parseInt(e.target.value));
      } else {
        this.limparInfoEmpenhoNF();
      }
    });

    // Botão para adicionar item do empenho
    document.getElementById('btnAddItemFromEmpenho')?.addEventListener('click', () => {
      this.mostrarSeletorItensEmpenho();
    });

    // Formatação automática de CNPJ
    document.getElementById('cnpjFornecedor')?.addEventListener('input', this.formatarCNPJInput.bind(this));
    document.getElementById('cnpjEmitente')?.addEventListener('input', this.formatarCNPJInput.bind(this));

    document.getElementById('cnpjDestinatario')?.addEventListener('input', this.formatarCNPJInput.bind(this));

    // Botão para cadastrar novo empenho (da tela de NF)
    document.getElementById('btnCadastrarEmpenho')?.addEventListener('click', () => {
      this.navegarParaCadastroEmpenho('notaFiscalScreen');
    });

    // Botão cancelar empenho
    document.getElementById('btnCancelarEmpenho')?.addEventListener('click', () => {
      this.cancelarCadastroEmpenho();
    });

    // ========== BOTÃO VALIDAR NF (NFValidator) ==========
    document.getElementById('btnValidarNF')?.addEventListener('click', () => {
      this.executarValidacaoNF();
    });

    // Fechar modal de validação
    document.getElementById('btnFecharValidacaoNF')?.addEventListener('click', () => {
      document.getElementById('modalValidacaoNF')?.classList.add('hidden');
    });
    document.getElementById('btnFecharValidacaoNF2')?.addEventListener('click', () => {
      document.getElementById('modalValidacaoNF')?.classList.add('hidden');
    });
  }

  /**
   * Navega para a tela de cadastro de empenho
   * @param {string} telaOrigem - ID da tela de onde veio (para voltar depois)
   */
  navegarParaCadastroEmpenho(telaOrigem = null) {
    // Salvar tela de origem para voltar depois
    this.telaAntesCadastroEmpenho = telaOrigem;

    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.remove('active');
    });

    // Mostra tela de cadastro de empenho
    document.getElementById('empenhoScreen').classList.add('active');

    // Limpa formulário de empenho
    const formEmpenho = document.getElementById('formEmpenho');
    if (formEmpenho) {
      formEmpenho.reset();
    }

    if (telaOrigem === 'notaFiscalScreen') {
      this.showInfo('Cadastre o empenho e depois retorne para associá-lo à nota fiscal');
    }
  }

  /**
   * Cancela o cadastro de empenho e volta para tela anterior
   */
  cancelarCadastroEmpenho() {
    // Limpa formulário
    const formEmpenho = document.getElementById('formEmpenho');
    if (formEmpenho) {
      formEmpenho.reset();
    }

    // Volta para tela anterior ou início
    const telaDestino = this.telaAntesCadastroEmpenho || 'inicioScreen';

    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.remove('active');
    });

    // Mostra tela de destino
    document.getElementById(telaDestino).classList.add('active');

    // Se voltou para NF, recarrega lista de empenhos
    if (telaDestino === 'notaFiscalScreen') {
      this.carregarEmpenhosSelect();
    }

    // Limpa referência
    this.telaAntesCadastroEmpenho = null;
  }

  /**
   * ============================================================================
   * VALIDAÇÃO COMPLETA DO EMPENHO
   * ============================================================================
   * Verifica:
   * - Empenho tem pelo menos 1 item
   * - valorTotalEmpenho > 0
   * - Soma dos itens do empenho == valorTotalEmpenho (tolerância 0.01)
   * - Para cada item: qtdTotalNF(item) <= qtdEmpenho(item)
   * - Para cada item: valorUnitNF == valorUnitEmpenho (tolerância 0.0001)
   * - Empenho só vira LANÇADO quando qtdTotalNF(item) == qtdEmpenho(item) para TODOS os itens
   */
  /**
   * ✅ VALIDAR CADASTRO DO EMPENHO
   * Valida apenas dados de cadastro (header + itens + consistência).
   * NÃO verifica NF, saldo, fechamento.
   * Depende de: UG cadastrada + usuário logado.
   */
  async validarEmpenho() {
    try {
      this.showLoading('Validando cadastro do empenho...');

      // ═══════════════════════════════════════════════════════════════
      // DEPENDÊNCIAS: Verificar UG e Usuário ANTES de validar
      // ═══════════════════════════════════════════════════════════════
      const unidadeGestora = await this._getUnidadeGestora();
      if (!unidadeGestora || !unidadeGestora.cnpj || !unidadeGestora.razaoSocial) {
        this._mostrarModalValidacao({
          sucesso: false,
          titulo: 'Configuração Incompleta',
          erros: ['Para validar, configure a Unidade Gestora (CNPJ e Razão Social) nas configurações.']
        });
        return;
      }

      // ✅ Verificar usuário logado (aceita login OU nome como identificador)
      const usuarioId = this.usuarioLogado?.login || this.usuarioLogado?.nome;
      console.log('[VALIDAR] Verificando usuário logado:', {
        usuarioLogado: this.usuarioLogado,
        usuarioId
      });

      if (!this.usuarioLogado || !usuarioId) {
        this._mostrarModalValidacao({
          sucesso: false,
          titulo: 'Usuário Não Logado',
          erros: ['Para validar, faça login no sistema.']
        });
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // SINCRONIZAR E NORMALIZAR
      // ═══════════════════════════════════════════════════════════════
      this.syncFromFormToDraft();
      this.normalizeEmpenhoDraft();

      console.log('[VALIDAR] Draft após sync:', {
        itens: this.empenhoDraft.itens?.length,
        primeiroItem: this.empenhoDraft.itens?.[0]
      });

      // ═══════════════════════════════════════════════════════════════
      // VERIFICAR SE EMPENHO FOI SALVO
      // ═══════════════════════════════════════════════════════════════
      const empenhoId = this.empenhoDraft.header.id;
      if (!empenhoId) {
        this.showError('Salve o empenho antes de validar.');
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // ⚠️ SE O DRAFT ESTÁ VAZIO APÓS SYNC, RECARREGAR DO BANCO
      // Isso acontece quando o formulário foi limpo após salvar
      // ═══════════════════════════════════════════════════════════════
      if (!this.empenhoDraft.header.ano || !this.empenhoDraft.header.numero) {
        console.log('[VALIDAR] ⚠️ Draft incompleto, recarregando do banco...');
        const empenhoDb = await window.dbManager.get('empenhos', empenhoId);
        if (empenhoDb) {
          // Recarregar dados do banco para o draft
          this.empenhoDraft.header.ano = empenhoDb.ano;
          this.empenhoDraft.header.numero = empenhoDb.numero;
          this.empenhoDraft.header.valorTotalEmpenho = empenhoDb.valorTotalEmpenho || empenhoDb.valorTotal || 0;
          this.empenhoDraft.header.naturezaDespesa = empenhoDb.naturezaDespesa;
          this.empenhoDraft.header.fornecedorRazao = empenhoDb.fornecedor;
          this.empenhoDraft.header.cnpjDigits = empenhoDb.cnpjDigits || FormatUtils.onlyDigits(empenhoDb.cnpj || '');
          this.empenhoDraft.header.processoSuap = empenhoDb.processoSuap || empenhoDb.processo || '';
          this.empenhoDraft.header.statusValidacao = empenhoDb.statusValidacao || 'rascunho';
          this.empenhoDraft.itens = empenhoDb.itens || [];
          console.log('[VALIDAR] ✅ Dados recarregados do banco:', this.empenhoDraft.header);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // VALIDAR CADASTRO
      // ═══════════════════════════════════════════════════════════════
      const errosCadastro = this._validarCadastroEmpenho();

      if (errosCadastro.length > 0) {
        this._mostrarModalValidacao({
          sucesso: false,
          titulo: 'Validação de Cadastro Falhou',
          erros: errosCadastro
        });
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // SUCESSO: Atualizar status para "validado"
      // ═══════════════════════════════════════════════════════════════
      const agora = new Date().toISOString();
      const validadoPor = this.usuarioLogado.login || this.usuarioLogado.nome || 'sistema';

      this.empenhoDraft.header.statusValidacao = 'validado';
      this.empenhoDraft.header.validadoEm = agora;
      this.empenhoDraft.header.validadoPor = validadoPor;

      // Salvar empenho com status atualizado
      await this.salvarEmpenho();

      // Atualizar UI
      this.atualizarBadgeStatus();
      this.atualizarBotaoValidar();

      // ═══════════════════════════════════════════════════════════════
      // ⚠️ OBTER DADOS REAIS PARA O POPUP - usa draft normalizado
      // ═══════════════════════════════════════════════════════════════
      const draftHeader = this.empenhoDraft.header || {};
      const draftItens = this.empenhoDraft.itens || [];

      // Fallbacks seguros para campos que podem ter nomes diferentes
      const valorTotal = draftHeader.valorTotalEmpenho ?? draftHeader.valorTotal ?? 0;
      const anoDisplay = draftHeader.ano ?? '????';
      const neDisplay = draftHeader.numero ?? draftHeader.neNumero ?? '???';
      const itensCount = draftItens.length;

      console.log('[VALIDACAO] empenho usado no resumo:', {
        ano: anoDisplay,
        numero: neDisplay,
        valorTotalEmpenho: valorTotal,
        itensLength: itensCount,
        validadoPor: validadoPor
      });
      console.log('[VALIDACAO] itens length:', itensCount);
      console.log('[VALIDACAO] valorTotalEmpenho:', valorTotal);

      this._mostrarModalValidacao({
        sucesso: true,
        titulo: '✅ Cadastro Validado!',
        mensagem: `O empenho ${anoDisplay} NE ${neDisplay} foi validado com sucesso.`,
        resumo: {
          valorEmpenho: valorTotal,
          qtdItens: itensCount,
          validadoPor: validadoPor
        }
      });
    } catch (error) {
      console.error('[VALIDAR] Erro:', error);
      this.showError('Erro ao validar empenho: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * ✅ VALIDAR CADASTRO DO EMPENHO (lógica de negócio)
   * Retorna array de erros. Vazio = válido.
   * NÃO verifica NF nem saldo.
   */
  _validarCadastroEmpenho() {
    const erros = [];
    const { header, itens } = this.empenhoDraft;

    // ═══════════════════════════════════════════════════════════════
    // A) CABEÇALHO OBRIGATÓRIO
    // ═══════════════════════════════════════════════════════════════

    // A1: Natureza da Despesa
    if (!header.naturezaDespesa) {
      erros.push('Natureza da Despesa é obrigatória.');
    } else if (!['339030', '449052'].includes(header.naturezaDespesa)) {
      erros.push('Natureza da Despesa deve ser 339030 ou 449052.');
    }

    // A2: Ano
    if (!header.ano || !/^\d{4}$/.test(String(header.ano))) {
      erros.push('Ano do empenho é obrigatório (4 dígitos).');
    }

    // A3: Número
    if (!header.numero || header.numero.length === 0) {
      erros.push('Número da NE é obrigatório.');
    } else if (!/^\d+$/.test(header.numero)) {
      erros.push('Número da NE deve conter apenas dígitos.');
    }

    // A4: Data de Emissão
    if (!header.dataEmissaoISO || !this.isValidDate(header.dataEmissaoISO)) {
      erros.push('Data de emissão é obrigatória e deve ser válida.');
    }

    // A5: Processo SUAP
    if (!header.processoSuap || header.processoSuap.trim().length === 0) {
      erros.push('Processo SUAP é obrigatório.');
    }

    // A6: Fornecedor
    if (!header.fornecedorRazao || header.fornecedorRazao.length < 3) {
      erros.push('Nome do fornecedor deve ter pelo menos 3 caracteres.');
    }

    // A7: CNPJ
    if (!header.cnpjDigits || header.cnpjDigits.length !== 14) {
      erros.push('CNPJ do fornecedor deve ter 14 dígitos.');
    } else if (!this.validarCNPJ(header.cnpjDigits)) {
      erros.push('CNPJ do fornecedor inválido (dígito verificador incorreto).');
    }

    // A8: Valor total do empenho
    const valorTotalEmpenho = header.valorTotalEmpenho || 0;
    if (valorTotalEmpenho <= 0) {
      erros.push('Valor total do empenho deve ser maior que zero.');
    }

    // ═══════════════════════════════════════════════════════════════
    // B) ITENS
    // ═══════════════════════════════════════════════════════════════

    // B1: Existe ao menos 1 item
    if (!itens || itens.length === 0) {
      erros.push('O empenho deve ter pelo menos 1 item.');
      return erros; // Não continuar validação de itens
    }

    // B2: Validar cada item
    itens.forEach((item, idx) => {
      const seq = item.seq || idx + 1;

      if (!item.descricao || item.descricao.trim().length === 0) {
        erros.push(`Item ${seq}: descrição é obrigatória.`);
      }

      if (!item.quantidade || item.quantidade <= 0) {
        erros.push(`Item ${seq}: quantidade deve ser maior que zero.`);
      }

      if (item.valorUnitario === undefined || item.valorUnitario < 0) {
        erros.push(`Item ${seq}: valor unitário não pode ser negativo.`);
      }

      if (!item.valorTotal || item.valorTotal <= 0) {
        erros.push(`Item ${seq}: valor total deve ser maior que zero.`);
      }

      // B3: Subelemento obrigatório
      if (!item.subelementoCodigo) {
        erros.push(`Item ${seq}: subelemento é obrigatório.`);
      }
      if (!item.subelementoNome) {
        erros.push(`Item ${seq}: nome do subelemento é obrigatório.`);
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // C) CONSISTÊNCIA DE VALORES
    // ═══════════════════════════════════════════════════════════════

    // C1: Soma dos itens == valorTotalEmpenho (tolerância 0.01)
    if (itens.length > 0 && valorTotalEmpenho > 0) {
      const somaItens = itens.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
      const diferenca = Math.abs(somaItens - valorTotalEmpenho);

      if (diferenca > 0.01) {
        erros.push(
          `Soma dos itens (${FormatUtils.formatCurrencyBR(somaItens)}) difere do valor do empenho (${FormatUtils.formatCurrencyBR(valorTotalEmpenho)}). Diferença: ${FormatUtils.formatCurrencyBR(diferenca)}`
        );
      }
    }

    return erros;
  }

  /**
   * Obtém a Unidade Gestora configurada
   */
  async _getUnidadeGestora() {
    try {
      // Tentar do window primeiro
      if (window.getUnidadeOrcamentaria) {
        return await window.getUnidadeOrcamentaria();
      }
      // Tentar do dbManager
      if (window.dbManager && window.dbManager.getUnidadeOrcamentaria) {
        return await window.dbManager.getUnidadeOrcamentaria();
      }
      return null;
    } catch (e) {
      console.warn('[VALIDAR] Erro ao buscar UG:', e);
      return null;
    }
  }

  /**
   * ✅ EXIBE MODAL COM RESULTADO DA VALIDAÇÃO DE CADASTRO
   * Não menciona NF nem saldo pendente.
   */
  _mostrarModalValidacao(resultado) {
    const { sucesso, titulo, mensagem, erros = [], resumo } = resultado;

    let html = `
      <div class="modal-card modal-validacao" style="max-width: 600px;">
        <div class="modal-header" style="background: ${sucesso ? '#d4edda' : '#f8d7da'};">
          <h4 style="color: ${sucesso ? '#155724' : '#721c24'};">${titulo}</h4>
          <button type="button" class="btn-fechar" id="fecharValidacao">✕</button>
        </div>
        <div class="modal-body">
    `;

    if (mensagem) {
      html += `<p style="margin-bottom: 16px;">${mensagem}</p>`;
    }

    // Resumo do cadastro validado (sem NF)
    if (resumo) {
      html += `
        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <strong>Resumo do Cadastro:</strong>
          <ul style="margin: 8px 0 0 20px;">
            <li>Valor do Empenho: ${FormatUtils.formatCurrencyBR(resumo.valorEmpenho)}</li>
            <li>Itens cadastrados: ${resumo.qtdItens}</li>
            ${resumo.validadoPor ? `<li>Validado por: ${resumo.validadoPor}</li>` : ''}
          </ul>
        </div>
      `;
    }

    // Lista de erros de cadastro
    if (erros.length > 0) {
      html += `
        <div style="background: #f8d7da; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <strong style="color: #721c24;">❌ Erros de Cadastro:</strong>
          <ul style="margin: 8px 0 0 20px; color: #721c24;">
            ${erros.map((e) => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    html += `
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="btnOkValidacao">OK</button>
        </div>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = html;

    overlay.querySelector('#fecharValidacao').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#btnOkValidacao').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
  }

  /**
   * Configura gerenciamento de itens
   */
  setupItemManagement() {
    // Adicionar item ao empenho
    document.getElementById('btnAddItem')?.addEventListener('click', () => {
      this.abrirModalItemEmpenho();
    });

    // Validar NE
    document.getElementById('btnValidarEmpenho')?.addEventListener('click', async () => {
      await this.validarEmpenho();
    });

    // Adicionar item à nota fiscal - REMOVIDO: Item manual PROIBIDO
    // Itens da NF só podem ser criados via "Adicionar do Empenho"
    const btnManual = document.getElementById('btnAddItemNF');
    if (btnManual) {
      btnManual.style.display = 'none';
      btnManual.disabled = true;
      btnManual.onclick = null;
    }
  }

  /**
   * Configura relatórios
   */
  setupReports() {
    // Botão filtrar relatórios
    document.getElementById('btnFiltrar')?.addEventListener('click', () => {
      this.aplicarFiltrosRelatorio();
    });

    // Cards de relatórios
    document.querySelectorAll('.report-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const reportType = e.currentTarget.dataset.report;
        this.gerarRelatorio(reportType);
      });
    });

    // Ações do relatório
    document.getElementById('btnExportPDF')?.addEventListener('click', () => {
      this.exportarRelatorioPDF();
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', () => {
      this.exportarRelatorioCSV();
    });

    document.getElementById('btnCloseReport')?.addEventListener('click', () => {
      document.getElementById('reportContent').classList.add('hidden');
    });
  }

  /**
   * Configura botões de ação diversos
   */
  setupActionButtons() {
    // Botões de cancelar formulários
    document.querySelectorAll('.btn-secondary').forEach((btn) => {
      if (btn.textContent.includes('Cancelar')) {
        btn.addEventListener('click', () => {
          this.showScreen('homeScreen');
        });
      }
    });

    // Botões de gerenciamento de arquivos
    this.setupFileManagementButtons();
  }

  /**
   * Configura botões de gerenciamento de arquivos
   */
  setupFileManagementButtons() {
    // Mostrar estatísticas de arquivos
    document.getElementById('btnEstatisticasArquivos')?.addEventListener('click', async () => {
      await this.mostrarEstatisticasArquivos();
    });
  }

  /**
   * Carrega dados iniciais da aplicação
   */
  async carregarDadosIniciais() {
    try {
      // Carrega empenhos para os selects
      await this.carregarEmpenhosSelect();

      // Carrega fornecedores para filtros
      await this.carregarFornecedoresFiltro();

      console.log('[APP] ℹ️ Sincronização de diretórios externos desativada (modo banco/API).');
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  }

  /**
   * Carrega empenhos nos elementos select
   */
  async carregarEmpenhosSelect() {
    const DEBUG_NF_EMPENHO = true; // Flag para diagnóstico

    try {
      // Usa true para incluir TODOS os empenhos (mesmo sem arquivo PDF vinculado)
      const empenhos = await window.dbManager.buscarEmpenhos(true);

      if (DEBUG_NF_EMPENHO) {
        console.log('[DEBUG_NF_EMPENHO] carregarEmpenhosSelect() chamado');
        console.log('[DEBUG_NF_EMPENHO] dbManager pronto:', !!window.dbManager);
        console.log('[DEBUG_NF_EMPENHO] Empenhos retornados:', empenhos?.length || 0);
        if (empenhos?.length > 0) {
          console.log('[DEBUG_NF_EMPENHO] Primeiro empenho:', empenhos[0]);
        }
      }

      console.log('[carregarEmpenhosSelect] Empenhos encontrados:', empenhos?.length || 0);

      // Select de entregas
      const empenhoSelect = document.getElementById('empenhoSelect');
      if (empenhoSelect) {
        empenhoSelect.innerHTML = '<option value="">Selecione um empenho...</option>';
        empenhos.forEach((empenho) => {
          const option = document.createElement('option');
          option.value = empenho.id;
          option.textContent = `${empenho.numero} - ${empenho.fornecedor}`;
          empenhoSelect.appendChild(option);
        });
      }

      // Select de notas fiscais (empenho associado)
      const empenhoAssociadoSelect = document.getElementById('empenhoAssociado');
      if (DEBUG_NF_EMPENHO) {
        console.log('[DEBUG_NF_EMPENHO] Select #empenhoAssociado encontrado:', !!empenhoAssociadoSelect);
      }

      if (empenhoAssociadoSelect) {
        empenhoAssociadoSelect.innerHTML = '<option value="">Selecione um empenho...</option>';

        if (empenhos.length === 0) {
          if (DEBUG_NF_EMPENHO) {
            console.log('[DEBUG_NF_EMPENHO] Nenhum empenho - mostrando aviso');
          }
          const optionVazio = document.createElement('option');
          optionVazio.value = '';
          optionVazio.textContent = '⚠️ Nenhum empenho cadastrado';
          optionVazio.disabled = true;
          empenhoAssociadoSelect.appendChild(optionVazio);
        } else {
          // Ordena por ano/número decrescente (mais recentes primeiro)
          const empenhosOrdenados = [...empenhos].sort((a, b) => {
            const anoA = parseInt(a.ano) || 0;
            const anoB = parseInt(b.ano) || 0;
            if (anoB !== anoA) {
              return anoB - anoA;
            }
            const numA = parseInt(a.numero) || 0;
            const numB = parseInt(b.numero) || 0;
            return numB - numA;
          });

          empenhosOrdenados.forEach((empenho) => {
            const option = document.createElement('option');
            option.value = empenho.id;
            // Formato: "2025 NE 000123 — FORNECEDOR LTDA — R$ 1.234,56"
            const valorFormatado =
              typeof empenho.valorTotal === 'number'
                ? empenho.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : 'R$ 0,00';
            const fornecedorResumo = (empenho.fornecedor || 'N/D').toUpperCase().substring(0, 30);
            option.textContent = `${empenho.ano || ''} NE ${empenho.numero || ''} — ${fornecedorResumo} — ${valorFormatado}`;
            empenhoAssociadoSelect.appendChild(option);
          });
        }
        console.log('[carregarEmpenhosSelect] Select empenhoAssociado populado:', empenhos.length, 'opções');
      }
    } catch (error) {
      console.error('[carregarEmpenhosSelect] Erro ao carregar empenhos:', error);
    }
  }

  /**
   * Carrega fornecedores no filtro de relatórios
   */
  async carregarFornecedoresFiltro() {
    try {
      const fornecedores = await window.dbManager.buscarFornecedores();
      const filtroSelect = document.getElementById('filtroFornecedor');

      if (filtroSelect && fornecedores.length > 0) {
        filtroSelect.innerHTML = '<option value="">Todos os fornecedores</option>';
        fornecedores.forEach((fornecedor) => {
          const option = document.createElement('option');
          option.value = fornecedor.cnpj;
          option.textContent = fornecedor.nome;
          filtroSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  }

  /**
   * Valida CNPJ do fornecedor contra unidade orçamentária
   * @private
   * @returns {boolean} true se pode continuar, false se deve cancelar
   */
  async _validarCNPJFornecedorContraUnidade(cnpjFornecedor) {
    if (typeof window.getUnidadeOrcamentaria !== 'function') {
      return true;
    }

    const unidade = await window.getUnidadeOrcamentaria();

    if (unidade && unidade.cnpjNumeros && cnpjFornecedor) {
      const cnpjFornecedorLimpo = cnpjFornecedor.replace(/\D/g, '');

      // Se o CNPJ do fornecedor for igual ao da unidade, alerta
      if (cnpjFornecedorLimpo === unidade.cnpjNumeros) {
        return confirm(
          '⚠️ ATENÇÃO!\n\n' +
            'O CNPJ do Fornecedor é igual ao CNPJ da Unidade Orçamentária cadastrada:\n\n' +
            `CNPJ: ${unidade.cnpj}\n` +
            `Unidade: ${unidade.razaoSocial}\n\n` +
            'Isso pode indicar um erro. Deseja continuar mesmo assim?'
        );
      }
    } else if (!unidade || !unidade.cnpjNumeros) {
      // Alerta se não há unidade configurada
      return confirm(
        '⚠️ UNIDADE ORÇAMENTÁRIA NÃO CONFIGURADA\n\n' +
          'Não foi possível validar o CNPJ pois nenhuma Unidade Orçamentária ' +
          'está cadastrada no sistema.\n\n' +
          'Recomenda-se cadastrar a Unidade em: Configurações → Unidade Orçamentária\n\n' +
          'Deseja continuar mesmo assim?'
      );
    }

    return true;
  }

  /**
   * ✅ SALVAR EMPENHO NO BANCO DE DADOS
   * Sempre salva como rascunho (exceto se já validado).
   * NÃO bloqueia por inconsistências de valores ou falta de NF.
   * Exige apenas: natureza + ano + numero + fornecedor + CNPJ.
   */
  async salvarEmpenho() {
    try {
      console.log('[APP] 💾 Salvando empenho...');
      this.showLoading('Salvando empenho...');

      // ✅ VERIFICAR SE DB ESTÁ PRONTO
      if (!window.dbManager) {
        throw new Error('Banco de dados não está pronto');
      }

      // ✅ SINCRONIZAR FORMULÁRIO → DRAFT (caso usuário tenha editado)
      this.syncFromFormToDraft();

      // ✅ NORMALIZAR DRAFT
      this.normalizeEmpenhoDraft();

      // ✅ DEBUG: Mostrar draft antes da validação
      console.log('[APP] 📊 Draft antes da validação:');
      console.table([this.empenhoDraft.header]);
      console.table(
        this.empenhoDraft.itens.map((i) => ({
          seq: i.seq,
          desc: i.descricao?.substring(0, 30),
          qtd: i.quantidade,
          vu: i.valorUnitario,
          vtot: i.valorTotal
        }))
      );

      // ✅ VALIDAR MÍNIMO OBRIGATÓRIO (não bloqueia por itens/saldo/NF)
      const erros = this.validateEmpenhoDraft();
      if (erros.length > 0) {
        this.hideLoading();
        const mensagemErros = '❌ Dados mínimos obrigatórios:\n\n' + erros.join('\n');
        console.error('[APP] ❌ Validação mínima falhou:', erros);
        alert(mensagemErros);
        return;
      }

      console.log('[APP] ✅ Validação mínima passou!');

      // Validação de CNPJ contra unidade orçamentária
      const cnpjValido = await this._validarCNPJFornecedorContraUnidade(this.empenhoDraft.header.cnpjDigits);
      if (!cnpjValido) {
        this.hideLoading();
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // DETECTAR PENDÊNCIAS (avisos, não bloqueantes)
      // ═══════════════════════════════════════════════════════════════
      const pendencias = this._detectarPendencias();

      // ═══════════════════════════════════════════════════════════════
      // DETERMINAR STATUS
      // Se já estava validado, mantém. Senão, é rascunho.
      // ═══════════════════════════════════════════════════════════════
      let statusValidacao = this.empenhoDraft.header.statusValidacao || 'rascunho';
      if (statusValidacao !== 'validado') {
        statusValidacao = 'rascunho';
      }

      // ✅ MONTAR OBJETO PARA SALVAR A PARTIR DO DRAFT
      const empenho = {
        // ✅ Natureza da Despesa (339030 | 449052)
        naturezaDespesa: this.empenhoDraft.header.naturezaDespesa || null,
        ano: this.empenhoDraft.header.ano,
        numero: this.empenhoDraft.header.numero,
        dataEmpenho: this.empenhoDraft.header.dataEmissaoISO,
        // ✅ Campo único para processo SUAP
        processoSuap: this.empenhoDraft.header.processoSuap || '',
        // Fornecedor
        fornecedor: this.empenhoDraft.header.fornecedorRazao,
        cnpjDigits: this.empenhoDraft.header.cnpjDigits,
        telefoneDigits: this.empenhoDraft.header.telefoneDigits || '',
        emailFornecedor: this.empenhoDraft.header.emailFornecedor || '',
        // Valor do empenho (fixo, não recalculado)
        valorTotalEmpenho: this.empenhoDraft.header.valorTotalEmpenho || 0,
        // Status
        statusValidacao: statusValidacao,
        validadoEm: this.empenhoDraft.header.validadoEm || null,
        validadoPor: this.empenhoDraft.header.validadoPor || null,
        // Pendências (opcional, informativo)
        pendencias: pendencias.length > 0 ? pendencias : null,
        itens: this.empenhoDraft.itens.map((item) => ({
          seq: item.seq,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
          subelementoCodigo: item.subelementoCodigo || '',
          subelementoNome: item.subelementoNome || '',
          itemCompra: item.itemCompra || ''
        })),
        pdfData: this.currentEmpenho ? await this.fileToBase64(this.currentEmpenho.file) : null
      };

      // ✅ Incluir dados do PDF anexado (se houver pendente ou já existir no draft)
      if (this._anexoPdfNEPendente) {
        empenho.pdfFileName = this._anexoPdfNEPendente.savedName;
        empenho.pdfAttachedAt = Date.now();
        empenho.pdfPath = this._anexoPdfNEPendente.path;
        empenho.pdfData = this._anexoPdfNEPendente.pdfData || null;
        empenho.pdfMimeType = this._anexoPdfNEPendente.mimeType || 'application/pdf';
        empenho.pdfOriginalName = this._anexoPdfNEPendente.originalName || this._anexoPdfNEPendente.savedName;
        empenho.pdfSize = this._anexoPdfNEPendente.size || 0;
        console.log('[APP] 📎 PDF anexado incluído:', empenho.pdfFileName);
      } else if (this.empenhoDraft.header.id) {
        // Manter dados do PDF se empenho já existia
        const empenhoExistente = await window.dbManager.buscarEmpenhoPorId(this.empenhoDraft.header.id);
        if (empenhoExistente?.pdfFileName) {
          empenho.pdfFileName = empenhoExistente.pdfFileName;
          empenho.pdfAttachedAt = empenhoExistente.pdfAttachedAt;
          empenho.pdfPath = empenhoExistente.pdfPath;
          empenho.pdfData = empenhoExistente.pdfData;
          empenho.pdfMimeType = empenhoExistente.pdfMimeType;
          empenho.pdfOriginalName = empenhoExistente.pdfOriginalName;
          empenho.pdfSize = empenhoExistente.pdfSize;
          console.log('[APP] 📎 PDF existente mantido:', empenho.pdfFileName);
        }
      }

      console.log('[APP] 💾 Salvando no banco:', empenho);

      const id = await window.dbManager.salvarEmpenho(empenho);
      console.log('[APP] ✅ Empenho salvo com ID:', id);

      // Criar registros de saldo para controle de recebimento (não bloqueia)
      try {
        await window.dbManager.criarSaldosEmpenho(id, empenho);
        console.log('[APP] ✅ Saldos de empenho criados com sucesso');
      } catch (saldoError) {
        console.warn('[APP] ⚠️ Erro ao criar saldos (empenho foi salvo):', saldoError);
      }

      // Salva informações do arquivo se foi salvo no sistema de arquivos
      if (this.currentEmpenho && this.currentEmpenho.arquivoInfo) {
        try {
          const arquivoInfo = this.currentEmpenho.arquivoInfo;
          arquivoInfo.documentoId = id;

          const arquivoId = await window.dbManager.salvarArquivo(arquivoInfo);
          console.log('[APP] ✅ Informações do arquivo salvas:', arquivoId);
        } catch (error) {
          console.warn('[APP] ⚠️ Erro ao salvar informações do arquivo:', error);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // MENSAGEM DE SUCESSO
      // ═══════════════════════════════════════════════════════════════
      if (pendencias.length > 0) {
        this.showInfo(`Empenho salvo como rascunho. Pendências: ${pendencias.length}`);
      } else {
        this.showSuccess('Empenho salvo com sucesso!');
      }

      this.limparFormulario('formEmpenho');
      this.currentEmpenho = null;

      // ✅ Limpar PDF pendente após salvar
      this._anexoPdfNEPendente = null;

      // Resetar draft
      this.empenhoDraft = {
        header: {
          ano: null,
          numero: null,
          dataEmissaoISO: null,
          naturezaDespesa: null,
          processoSuap: '',
          valorTotalEmpenho: 0,
          fornecedorRazao: null,
          cnpjDigits: '',
          telefoneDigits: '',
          emailFornecedor: '',
          statusValidacao: 'rascunho',
          validadoEm: null,
          validadoPor: null
        },
        itens: []
      };

      // Atualiza selects
      await this.carregarEmpenhosSelect();

      // ✅ ATUALIZAR LISTAS DE EMPENHOS (novo empenho aparece no topo)
      // Atualiza lista na aba "Novo Cadastro"
      await this.carregarEmpenhosNovoCadastro();
      // Atualiza lista do Relatório se estiver visível
      if (window.RelatoriosEmpenhos?.carregar) {
        window.RelatoriosEmpenhos.carregar();
      }

      // Se veio da tela de NF, volta para ela
      if (this.telaAntesCadastroEmpenho === 'notaFiscalScreen') {
        setTimeout(() => {
          document.querySelectorAll('.screen').forEach((screen) => {
            screen.classList.remove('active');
          });
          document.getElementById('notaFiscalScreen').classList.add('active');
          this.telaAntesCadastroEmpenho = null;
          this.showInfo('Empenho salvo! Agora você pode associá-lo à nota fiscal.');
        }, 1500);
      }
    } catch (error) {
      console.error('[APP] ❌ Erro ao salvar empenho:', error);
      this.showError('Erro ao salvar empenho: ' + error.message, error);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * ✅ DETECTA PENDÊNCIAS NO EMPENHO (não bloqueantes)
   * Retorna array de strings descrevendo pendências.
   * Usado para informar o usuário, mas NÃO bloqueia salvamento.
   */
  _detectarPendencias() {
    const pendencias = [];
    const { header, itens } = this.empenhoDraft;

    // 1) Sem data de emissão
    if (!header.dataEmissaoISO) {
      pendencias.push('Data de emissão não informada');
    }

    // 2) Sem processo SUAP
    if (!header.processoSuap || header.processoSuap.trim().length === 0) {
      pendencias.push('Processo SUAP não informado');
    }

    // 3) Sem valor total
    if (!header.valorTotalEmpenho || header.valorTotalEmpenho <= 0) {
      pendencias.push('Valor total do empenho não informado');
    }

    // 4) Sem itens
    if (!itens || itens.length === 0) {
      pendencias.push('Nenhum item cadastrado');
    } else {
      // 5) Itens sem subelemento
      const itensSemSub = itens.filter((i) => !i.subelementoCodigo);
      if (itensSemSub.length > 0) {
        pendencias.push(`${itensSemSub.length} item(ns) sem subelemento`);
      }

      // 6) Inconsistência de valores
      if (header.valorTotalEmpenho > 0) {
        const somaItens = itens.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
        const diferenca = Math.abs(somaItens - header.valorTotalEmpenho);
        if (diferenca > 0.01) {
          pendencias.push(`Soma dos itens difere do valor total (diferença: R$ ${diferenca.toFixed(2)})`);
        }
      }
    }

    return pendencias;
  }

  /**
   * ✅ VALIDA O DRAFT DE EMPENHO (MÍNIMO PARA SALVAR)
   * Retorna array de erros (vazio se válido)
   * @returns {string[]} Array de mensagens de erro
   */
  /* eslint-disable complexity */
  validateEmpenhoDraft() {
    console.log('[Validation] 🔍 Validando empenhoDraft (para salvar)...');
    const erros = [];
    const { header } = this.empenhoDraft;

    // ═══════════════════════════════════════════════════════════════
    // MÍNIMO OBRIGATÓRIO PARA SALVAR COMO RASCUNHO
    // Apenas identificação + natureza + fornecedor
    // ═══════════════════════════════════════════════════════════════

    // 1) Natureza da Despesa (OBRIGATÓRIA)
    if (!header.naturezaDespesa) {
      erros.push('• Natureza da Despesa é obrigatória');
    } else if (!['339030', '449052'].includes(header.naturezaDespesa)) {
      erros.push('• Natureza da Despesa deve ser 339030 ou 449052');
    }

    // 2) Ano (OBRIGATÓRIO)
    if (!header.ano || !/^\d{4}$/.test(String(header.ano))) {
      erros.push('• Ano do empenho é obrigatório (4 dígitos)');
    }

    // 3) Número da NE (OBRIGATÓRIO)
    if (!header.numero || header.numero.length === 0) {
      erros.push('• Número da NE é obrigatório');
    } else if (!/^\d+$/.test(header.numero)) {
      erros.push('• Número da NE deve conter apenas dígitos');
    }

    // 4) Fornecedor (OBRIGATÓRIO)
    if (!header.fornecedorRazao || header.fornecedorRazao.length < 3) {
      erros.push('• Nome do fornecedor deve ter pelo menos 3 caracteres');
    }

    // 5) CNPJ (OBRIGATÓRIO)
    if (!header.cnpjDigits || header.cnpjDigits.length !== 14) {
      erros.push('• CNPJ do fornecedor deve ter 14 dígitos');
    } else if (!this.validarCNPJ(header.cnpjDigits)) {
      erros.push('• CNPJ do fornecedor inválido (DV incorreto)');
    }

    // ═══════════════════════════════════════════════════════════════
    // NÃO bloqueia salvamento por:
    // - Falta de itens
    // - Falta de subelemento
    // - Inconsistência de valores
    // - Falta de NF
    // ═══════════════════════════════════════════════════════════════

    console.log('[Validation]', erros.length === 0 ? '✅ Válido para salvar' : `❌ ${erros.length} erros`);
    return erros;
  }
  /* eslint-enable complexity */

  /**
   * Valida se é uma data válida (formato ISO ou dd/mm/aaaa)
   */
  isValidDate(dateStr) {
    if (!dateStr) {
      return false;
    }

    // Tentar parse ISO (aaaa-mm-dd)
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      return true;
    }

    // Tentar parse brasileiro (dd/mm/aaaa)
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, dia, mes, ano] = match;
      const date = new Date(ano, mes - 1, dia);
      return !isNaN(date.getTime());
    }

    return false;
  }

  /**
   * Valida CNPJ (algoritmo oficial)
   */
  validarCNPJ(cnpj) {
    if (!cnpj || cnpj.length !== 14) {
      return false;
    }

    // Eliminar CNPJs inválidos conhecidos
    if (/^(\d)\1+$/.test(cnpj)) {
      return false;
    }

    // Validar primeiro dígito verificador
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) {
      return false;
    }

    // Validar segundo dígito verificador
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado === parseInt(digitos.charAt(1));
  }

  /**
   * Salva entrega no banco de dados
   */
  async salvarEntrega() {
    try {
      this.showLoading('Salvando entrega...');

      const formData = new FormData(document.getElementById('formEntrega'));
      const itensRecebidos = this.coletarItensRecebidos('itensEntrega');

      const entrega = {
        empenhoId: formData.get('empenhoSelect'),
        dataEntrega: formData.get('dataEntrega'),
        observacoes: formData.get('observacoesEntrega'),
        itensRecebidos: itensRecebidos
      };

      await window.dbManager.salvarEntrega(entrega);

      this.showSuccess('Entrega registrada com sucesso!');
      this.limparFormulario('formEntrega');
    } catch (error) {
      console.error('Erro ao salvar entrega:', error);
      this.showError('Erro ao salvar entrega: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Salva nota fiscal no banco de dados
   */
  /**
   * Valida CNPJ do destinatário contra unidade orçamentária (NF deve ser da mesma unidade)
   * @private
   * @returns {boolean} true se válido, false se inválido
   */
  async _validarCNPJDestinatarioContraUnidade(cnpjDestinatario) {
    if (typeof window.getUnidadeOrcamentaria !== 'function') {
      return true;
    }

    const unidade = await window.getUnidadeOrcamentaria();

    if (unidade && unidade.cnpjNumeros && cnpjDestinatario) {
      const cnpjDestinatarioLimpo = cnpjDestinatario.replace(/\D/g, '');

      // Se o CNPJ do destinatário for DIFERENTE da unidade, BLOQUEIA
      if (cnpjDestinatarioLimpo !== unidade.cnpjNumeros) {
        alert(
          '❌ CNPJ DO DESTINATÁRIO INVÁLIDO!\n\n' +
            'O CNPJ do Destinatário/Beneficiário da Nota Fiscal é diferente ' +
            'do CNPJ da Unidade Orçamentária vinculada ao seu usuário.\n\n' +
            `CNPJ da Unidade: ${unidade.cnpj}\n` +
            `Unidade: ${unidade.razaoSocial}\n\n` +
            `CNPJ Destinatário NF: ${cnpjDestinatario}\n\n` +
            '⚠️ Notas Fiscais com CNPJ de destinatário diferente da unidade ' +
            'logada NÃO podem ser cadastradas.\n\n' +
            'Verifique:\n' +
            '1. Se a NF é realmente para esta unidade\n' +
            '2. Se há outra unidade cadastrada com este CNPJ\n' +
            '3. Se você precisa vincular outra unidade ao seu usuário'
        );
        return false;
      }
    } else if (!unidade || !unidade.cnpjNumeros) {
      // Bloqueia se não há unidade configurada
      alert(
        '❌ UNIDADE ORÇAMENTÁRIA NÃO CONFIGURADA\n\n' +
          'Não é possível cadastrar Notas Fiscais sem uma Unidade Orçamentária ' +
          'vinculada ao seu usuário.\n\n' +
          'Por favor:\n' +
          '1. Acesse: Configurações → Unidade Orçamentária\n' +
          '2. Cadastre a unidade (se não existir)\n' +
          "3. Clique em 'Vincular ao Usuário' na unidade desejada\n" +
          '4. Tente novamente cadastrar a Nota Fiscal'
      );
      return false;
    }

    return true;
  }

  /**
   * Registra metadados de arquivo de nota fiscal para persistência em banco
   * @private
   */
  async _salvarArquivoNotaFiscal(id, notaFiscal) {
    if (!this.currentNotaFiscal || !this.currentNotaFiscal.file) {
      return;
    }

    try {
      const fornecedor =
        this.currentNotaFiscal.extractedData?.fornecedor ||
        this.currentNotaFiscal.extractedData?.emitente ||
        'FORNECEDOR';

      const metadados = {
        numero: notaFiscal.numero,
        fornecedor: fornecedor,
        data: notaFiscal.dataNotaFiscal
      };

      const anoNota = String(notaFiscal.dataNotaFiscal || '').slice(0, 4) || new Date().getFullYear();
      const numeroNota = String(notaFiscal.numero || 'SEM_NUMERO').replace(/\D/g, '') || 'SEM_NUMERO';
      const arquivoInfo = {
        originalName: this.currentNotaFiscal.file.name,
        savedName: this.currentNotaFiscal.file.name,
        folderType: 'notasFiscais',
        year: parseInt(anoNota, 10) || new Date().getFullYear(),
        size: this.currentNotaFiscal.file.size || 0,
        timestamp: new Date().toISOString(),
        path: `db://notasFiscais/${anoNota}/${numeroNota}`,
        metadados
      };

      arquivoInfo.documentoId = id;
      await window.dbManager.salvarArquivo(arquivoInfo);
      console.log('✅ Arquivo de Nota Fiscal registrado no banco:', arquivoInfo);
    } catch (fileError) {
      console.warn('⚠️ Erro ao registrar metadados do arquivo de NF no banco:', fileError);
    }
  }

  /**
   * Atualiza saldos do empenho com a nota fiscal
   * @private
   */
  async _atualizarSaldosEmpenhoComNF(notaFiscal, itens) {
    if (!notaFiscal.empenhoId) {
      return;
    }

    try {
      const resultados = await window.dbManager.atualizarSaldosComNotaFiscal(
        parseInt(notaFiscal.empenhoId),
        notaFiscal.numero,
        itens,
        notaFiscal.dataNotaFiscal
      );

      if (resultados) {
        let mensagem = `✅ Nota Fiscal ${notaFiscal.numero} salva com sucesso!\n\n`;

        if (resultados.encontrados.length > 0) {
          mensagem += `📋 Itens correspondidos (${resultados.encontrados.length}):\n`;
          resultados.encontrados.forEach((item) => {
            mensagem += `  • ${item.itemNF}\n    ↔ ${item.itemEmpenho} (${item.score}% match)\n\n`;
          });
        }

        if (resultados.naoEncontrados.length > 0) {
          mensagem += `⚠️ Itens NÃO correspondidos (${resultados.naoEncontrados.length}):\n`;
          resultados.naoEncontrados.forEach((item) => {
            mensagem += `  • ${item.codigo} - ${item.descricao}\n`;
          });
          mensagem += `\n💡 Estes itens não atualizaram o saldo do empenho.`;
        }

        alert(mensagem);
      }

      console.log('✅ Saldos do empenho atualizados com a NF', notaFiscal.numero);
    } catch (saldoError) {
      console.warn('⚠️ Erro ao atualizar saldos (NF foi salva):', saldoError);
    }
  }

  /**
   * Salva nota fiscal no banco de dados
   * Inclui validação obrigatória contra empenho
   */
  async salvarNotaFiscal() {
    try {
      this.showLoading('Validando nota fiscal...');

      const formData = new FormData(document.getElementById('formNotaFiscal'));
      const itens = this.coletarItens('itensNotaFiscal');
      const cnpjDestinatario = formData.get('cnpjDestinatario');
      const empenhoId = document.getElementById('empenhoAssociado')?.value;

      // ========== VALIDAÇÃO 1: Campos básicos ==========
      const valorTotalNFInput = document.getElementById('valorTotalNF');
      const validacaoEntrada = this.features.notaFiscal.validarEntrada({
        empenhoId,
        valorTotalNFInput: valorTotalNFInput?.value,
        formData,
        itens
      });
      if (!validacaoEntrada.valid) {
        this.hideLoading();
        alert('❌ Dados inválidos:\n\n' + validacaoEntrada.errors.join('\n'));
        if (!empenhoId) {
          focusField('empenhoAssociado');
        } else {
          focusField('valorTotalNF');
        }
        return;
      }

      const totalNFManual = this.money2(this.parseMoneyInputBR(valorTotalNFInput?.value));

      // ========== VALIDAÇÃO 3: Divergência Total × Soma Itens ==========
      const somaItens = this.calcularValorTotalItens(itens);
      const diferencaTotalItens = this.money2(somaItens - totalNFManual);
      const TOLERANCIA_TOTAL = 0.05; // R$ 0,05 de tolerância

      if (Math.abs(diferencaTotalItens) > TOLERANCIA_TOTAL) {
        this.hideLoading();
        const confirmar = confirmAction(
          `⚠️ DIVERGÊNCIA ENTRE TOTAL E SOMA DOS ITENS:\n\n` +
            `• Valor Total da NF: R$ ${this.fmtMoneyBR(totalNFManual)}\n` +
            `• Soma dos Itens: R$ ${this.fmtMoneyBR(somaItens)}\n` +
            `• Diferença: R$ ${this.fmtMoneyBR(diferencaTotalItens)}\n\n` +
            `Deseja salvar mesmo assim?\n\n` +
            `[OK] = Salvar com divergência\n[Cancelar] = Corrigir antes de salvar`
        );
        if (!confirmar) {
          return;
        }
      }

      // Validação de CNPJ do destinatário contra unidade
      const cnpjValido = await this._validarCNPJDestinatarioContraUnidade(cnpjDestinatario);
      if (!cnpjValido) {
        this.hideLoading();
        return;
      }

      const validacaoEmpenho = await this.features.notaFiscal.validarContraEmpenhoComNFValidator({
        empenhoId,
        formData,
        itens
      });
      if (!validacaoEmpenho.ok) {
        this.hideLoading();
        return;
      }

      this.showLoading('Salvando nota fiscal...');

      const notaFiscal = await this.features.notaFiscal.montarNotaFiscal({
        formData,
        itens,
        cnpjDestinatario,
        empenhoId,
        currentNotaFiscal: this.currentNotaFiscal
      });

      const id = await this.features.notaFiscal.salvarNotaFiscalCompleta(notaFiscal);

      // Salva arquivo físico e atualiza saldos
      await this._salvarArquivoNotaFiscal(id, notaFiscal);
      await this._atualizarSaldosEmpenhoComNF(notaFiscal, itens);

      this.showSuccess('Nota fiscal salva com sucesso!');
      this.limparFormulario('formNotaFiscal');
      this.currentNotaFiscal = null;
    } catch (error) {
      console.error('Erro ao salvar nota fiscal:', error);
      this.showError('Erro ao salvar nota fiscal: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  // ========== Gestão de Estado e Normalização ==========

  /**
   * ✅ Remove tudo que não é dígito de uma string
   * @param {string} str - String para limpar
   * @returns {string} Apenas dígitos
   */
  onlyDigits(str) {
    if (!str) {
      return '';
    }
    return String(str).replace(/\D/g, '');
  }

  /**
   * ✅ Converte data brasileira (dd/mm/aaaa) para ISO (aaaa-mm-dd)
   * @param {string} dataBR - Data no formato dd/mm/aaaa
   * @returns {string} Data no formato ISO ou null se inválida
   */
  dataBRtoISO(dataBR) {
    if (!dataBR) {
      return null;
    }
    const match = String(dataBR).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) {
      return null;
    }
    const [, dia, mes, ano] = match;
    return `${ano}-${mes}-${dia}`;
  }

  /**
   * ✅ Converte string monetária brasileira para número
   * Aceita: "1.234,56" ou "1234.56" ou "1234,56"
   * @param {string|number} valor - Valor a converter
   * @returns {number} Número ou 0 se inválido
   */
  parseNumero(valor) {
    if (typeof valor === 'number') {
      return valor;
    }
    if (!valor) {
      return 0;
    }

    const str = String(valor).trim();

    // Se tem vírgula, é formato brasileiro (1.234,56)
    if (str.includes(',')) {
      const semPontos = str.replace(/\./g, ''); // Remove pontos de milhar
      const comPonto = semPontos.replace(',', '.'); // Vírgula vira ponto decimal
      return parseFloat(comPonto) || 0;
    }

    // Se só tem ponto, é formato americano (1234.56)
    return parseFloat(str) || 0;
  }

  /**
   * ✅ NORMALIZA O DRAFT DE EMPENHO
   * Prepara os dados para validação e salvamento
   * - Remove caracteres não-numéricos de número e CNPJ
   * - Converte datas para ISO
   * - Converte valores monetários para números
   * - Garante subelementoCodigo e subelementoNome em cada item
   * - NÃO recalcula valorTotalEmpenho (deve permanecer o valor da NE)
   */
  normalizeEmpenhoDraft() {
    console.log('[State] 🔧 Normalizando empenhoDraft...');

    const { header, itens } = this.empenhoDraft;

    // Normalizar header
    if (header.numero) {
      header.numero = this.onlyDigits(header.numero);
      console.log('[State] 📝 Número NE normalizado:', header.numero);
    }

    // CNPJ: usar novo nome cnpjDigits
    if (header.cnpjDigits) {
      header.cnpjDigits = FormatUtils.onlyDigits(header.cnpjDigits);
      console.log('[State] 📝 CNPJ normalizado:', header.cnpjDigits);
    }

    // Telefone: garantir apenas dígitos
    if (header.telefoneDigits) {
      header.telefoneDigits = FormatUtils.onlyDigits(header.telefoneDigits);
      console.log('[State] 📝 Telefone normalizado:', header.telefoneDigits);
    }

    // Normalizar data (se vier dd/mm/aaaa, converter para ISO)
    if (header.dataEmissaoISO && header.dataEmissaoISO.includes('/')) {
      header.dataEmissaoISO = this.dataBRtoISO(header.dataEmissaoISO);
      console.log('[State] 📅 Data convertida para ISO:', header.dataEmissaoISO);
    }

    // Normalizar itens
    itens.forEach((item, idx) => {
      // Garantir que seq é número
      item.seq = parseInt(item.seq) || idx + 1;

      // Converter valores para números
      item.quantidade = this.parseNumero(item.quantidade);
      item.valorUnitario = this.parseNumero(item.valorUnitario);
      item.valorTotal = this.parseNumero(item.valorTotal);

      // Se valorTotal não está correto, recalcular
      const valorCalculado = item.quantidade * item.valorUnitario;
      if (Math.abs(item.valorTotal - valorCalculado) > 0.01) {
        console.warn(`[State] ⚠️ Item ${item.seq}: valorTotal inconsistente. Recalculando...`);
        item.valorTotal = valorCalculado;
      }

      // ✅ GARANTIR campos de subelemento (schema padrão)
      item.subelementoCodigo = item.subelementoCodigo || '';
      item.subelementoNome = item.subelementoNome || '';

      // ✅ Copiar naturezaDespesa do header para o item (para rastreabilidade)
      if (header.naturezaDespesa && !item.naturezaDespesa) {
        item.naturezaDespesa = header.naturezaDespesa;
      }

      console.log(`[State] ✅ Item ${item.seq} normalizado:`, {
        qtd: item.quantidade,
        vu: item.valorUnitario,
        vtot: item.valorTotal,
        subCod: item.subelementoCodigo,
        subNome: item.subelementoNome?.substring(0, 20)
      });
    });

    // NÃO recalcular valorTotalEmpenho - ele deve permanecer o valor da NE
    // A validação irá comparar a soma dos itens com o valorTotalEmpenho
    const somaItens = itens.reduce((acc, item) => acc + item.valorTotal, 0);
    console.log('[State] 📊 Soma dos itens:', somaItens.toFixed(2));
    console.log('[State] 📊 Valor do empenho (fixo):', (header.valorTotalEmpenho || 0).toFixed(2));

    console.log('[State] ✅ Normalização concluída');
  }

  /**
   * ✅ SINCRONIZA FORMULÁRIO → DRAFT
   * Lê valores dos inputs e atualiza this.empenhoDraft
   * Usar apenas quando usuário edita manualmente
   */
  syncFromFormToDraft() {
    console.log('[State] 🔄 Sincronizando formulário → draft...');

    // ✅ Debug: Verificar se os elementos existem
    console.log('[State] 🔍 Debug elementos:', {
      anoEmpenho: document.getElementById('anoEmpenho'),
      numeroEmpenho: document.getElementById('numeroEmpenho'),
      valorTotalEmpenho: document.getElementById('valorTotalEmpenho'),
      itensEmpenho: document.getElementById('itensEmpenho')
    });

    // ✅ Natureza da Despesa (339030 | 449052)
    this.empenhoDraft.header.naturezaDespesa = document.getElementById('naturezaDespesa')?.value || null;

    // Ler header do formulário (usando IDs corretos)
    // ⚠️ Preservar valores existentes se campos não encontrados ou vazios
    const anoValor = document.getElementById('anoEmpenho')?.value;
    if (anoValor && anoValor.trim() !== '') {
      this.empenhoDraft.header.ano = parseInt(anoValor);
    }
    // Se anoValor vazio, mantém o valor anterior no draft

    const numeroValor = document.getElementById('numeroEmpenho')?.value;
    if (numeroValor && numeroValor.trim() !== '') {
      this.empenhoDraft.header.numero = numeroValor.trim();
    }
    // Se numeroValor vazio, mantém o valor anterior no draft

    this.empenhoDraft.header.dataEmissaoISO =
      document.getElementById('dataEmpenho')?.value || this.empenhoDraft.header.dataEmissaoISO;

    // ✅ CAMPO ÚNICO: Processo SUAP
    const processoSuapValor = document.getElementById('processoSuapEmpenho')?.value?.trim();
    if (processoSuapValor !== undefined) {
      this.empenhoDraft.header.processoSuap = processoSuapValor || '';
    }

    // Fornecedor - preservar se vazio
    const fornecedorValor = document.getElementById('fornecedorEmpenho')?.value;
    if (fornecedorValor && fornecedorValor.trim() !== '') {
      this.empenhoDraft.header.fornecedorRazao = fornecedorValor.trim();
    }

    // ✅ CNPJ e Telefone: salvar SOMENTE dígitos
    const cnpjInput = document.getElementById('cnpjFornecedor')?.value || '';
    if (cnpjInput) {
      this.empenhoDraft.header.cnpjDigits = FormatUtils.onlyDigits(cnpjInput);
    }

    const telefoneInput = document.getElementById('telefoneFornecedor')?.value || '';
    if (telefoneInput) {
      this.empenhoDraft.header.telefoneDigits = FormatUtils.onlyDigits(telefoneInput);
    }

    const emailValor = document.getElementById('emailFornecedor')?.value;
    if (emailValor && emailValor.trim() !== '') {
      this.empenhoDraft.header.emailFornecedor = emailValor.trim();
    }
    this.empenhoDraft.header.statusValidacao = this.empenhoDraft.header.statusValidacao || 'rascunho';

    // ✅ Valor total do empenho: converter pt-BR para Number (FIXO, não recalcular)
    // ⚠️ Preservar valor existente se campo não encontrado ou vazio
    const valorTotalStr = document.getElementById('valorTotalEmpenho')?.value;
    if (valorTotalStr && valorTotalStr.trim() !== '' && valorTotalStr.trim() !== '0,00') {
      this.empenhoDraft.header.valorTotalEmpenho = FormatUtils.parseMoneyBR(valorTotalStr);
    }
    // Se valor vazio, mantém o valor anterior no draft

    console.log('[State] 🔍 Debug valores lidos:', {
      ano: this.empenhoDraft.header.ano,
      numero: this.empenhoDraft.header.numero,
      valorTotal: this.empenhoDraft.header.valorTotalEmpenho
    });

    // Ler itens do formulário (inputs hidden dentro de .item-row)
    // ⚠️ NÃO recria itens do zero - faz MERGE para preservar campos
    const container = document.getElementById('itensEmpenho');
    const linhas = container?.querySelectorAll('.item-row') || [];
    const itensAtualizados = [];

    linhas.forEach((linha, idx) => {
      const seq = parseInt(linha.querySelector('[data-field="seq"]')?.value) || idx + 1;

      // Buscar item existente no draft pelo seq (para preservar campos)
      const itemExistente = this.empenhoDraft.itens?.find((i) => i.seq === seq) || {};

      // Ler valores do DOM (inputs hidden)
      const item = {
        ...itemExistente, // Preserva campos existentes (subelementoCodigo, subelementoNome, etc)
        seq,
        descricao: linha.querySelector('[data-field="descricao"]')?.value || itemExistente.descricao || '',
        unidade: linha.querySelector('[data-field="unidade"]')?.value || itemExistente.unidade || 'UN',
        quantidade: this.parseNumero(linha.querySelector('[data-field="quantidade"]')?.value || '0'),
        valorUnitario: this.parseNumero(linha.querySelector('[data-field="valorUnitario"]')?.value || '0'),
        catmatCodigo: linha.querySelector('[data-field="catmatCodigo"]')?.value || itemExistente.catmatCodigo || '',
        catmatDescricao:
          linha.querySelector('[data-field="catmatDescricao"]')?.value || itemExistente.catmatDescricao || '',
        catmatFonte: linha.querySelector('[data-field="catmatFonte"]')?.value || itemExistente.catmatFonte || '',
        observacao: linha.querySelector('[data-field="observacao"]')?.value || itemExistente.observacao || '',
        itemCompra: linha.querySelector('[data-field="itemCompra"]')?.value || itemExistente.itemCompra || '',
        // ✅ Ler subelementoCodigo e subelementoNome dos inputs hidden
        subelementoCodigo:
          linha.querySelector('[data-field="subelementoCodigo"]')?.value || itemExistente.subelementoCodigo || '',
        subelementoNome:
          linha.querySelector('[data-field="subelementoNome"]')?.value || itemExistente.subelementoNome || ''
      };

      // Calcular valor total
      item.valorTotal = item.quantidade * item.valorUnitario;

      itensAtualizados.push(item);
    });

    this.empenhoDraft.itens = itensAtualizados;

    console.log('[State] ✅ Sincronização concluída');
    console.log('[State] 📊 Draft atualizado:', this.empenhoDraft.itens.length, 'itens');
    // Debug: verificar se subelemento está presente
    if (this.empenhoDraft.itens.length > 0) {
      console.log(
        '[State] 🔍 Primeiro item subelemento:',
        this.empenhoDraft.itens[0].subelementoCodigo,
        this.empenhoDraft.itens[0].subelementoNome
      );
    }
  }

  /**
   * ✅ SINCRONIZA DRAFT → FORMULÁRIO
   * Atualiza os inputs com valores do this.empenhoDraft
   * Usar após parse ou ao carregar empenho existente
   */
  /* eslint-disable complexity */
  async syncFromDraftToForm() {
    console.log('[State] 🔄 Sincronizando draft → formulário...');

    const { header, itens } = this.empenhoDraft;

    // Log para debug
    console.log('[State] 📊 Header a sincronizar:', header);
    console.log('[State] 📦 Itens a sincronizar:', itens.length);

    // ✅ Natureza da Despesa (339030 | 449052)
    if (document.getElementById('naturezaDespesa')) {
      document.getElementById('naturezaDespesa').value = header.naturezaDespesa || '';
      console.log('[State] ✅ naturezaDespesa:', header.naturezaDespesa);
    }

    // Atualizar campos do header (usando IDs corretos do HTML)
    if (document.getElementById('numeroEmpenho')) {
      document.getElementById('numeroEmpenho').value = header.numero || '';
      console.log('[State] ✅ numeroEmpenho:', header.numero);
    }
    if (document.getElementById('dataEmpenho')) {
      document.getElementById('dataEmpenho').value = header.dataEmissaoISO || '';
      console.log('[State] ✅ dataEmpenho:', header.dataEmissaoISO);
    }

    // ✅ CAMPO ÚNICO: Processo SUAP
    if (document.getElementById('processoSuapEmpenho')) {
      document.getElementById('processoSuapEmpenho').value = header.processoSuap || '';
      console.log('[State] ✅ processoSuapEmpenho:', header.processoSuap);
    }

    // Fornecedor
    if (document.getElementById('fornecedorEmpenho')) {
      document.getElementById('fornecedorEmpenho').value = header.fornecedorRazao || '';
      console.log('[State] ✅ fornecedorEmpenho:', header.fornecedorRazao);
    }

    // ✅ CNPJ: exibir FORMATADO
    if (document.getElementById('cnpjFornecedor')) {
      const cnpjFormatado = FormatUtils.formatCNPJ(header.cnpjDigits || '');
      document.getElementById('cnpjFornecedor').value = cnpjFormatado;
      console.log('[State] ✅ cnpjFornecedor:', header.cnpjDigits, '→', cnpjFormatado);
    }

    // ✅ TELEFONE: exibir FORMATADO
    if (document.getElementById('telefoneFornecedor')) {
      const telefoneFormatado = FormatUtils.formatPhone(header.telefoneDigits || '');
      document.getElementById('telefoneFornecedor').value = telefoneFormatado;
      console.log('[State] ✅ telefoneFornecedor:', header.telefoneDigits, '→', telefoneFormatado);
    }

    if (document.getElementById('emailFornecedor')) {
      document.getElementById('emailFornecedor').value = header.emailFornecedor || '';
      console.log('[State] ✅ emailFornecedor:', header.emailFornecedor);
    }

    // ✅ VALOR TOTAL: exibir FORMATADO pt-BR (campo FIXO, não recalcular)
    if (document.getElementById('valorTotalEmpenho')) {
      const valorFormatado = FormatUtils.formatMoneyBR(header.valorTotalEmpenho || 0);
      document.getElementById('valorTotalEmpenho').value = valorFormatado;
      console.log('[State] ✅ valorTotalEmpenho:', header.valorTotalEmpenho, '→', valorFormatado);
    }

    if (document.getElementById('anoEmpenho')) {
      document.getElementById('anoEmpenho').value = header.ano || '';
    }
    if (document.getElementById('statusEmpenho')) {
      document.getElementById('statusEmpenho').value = header.statusValidacao || 'rascunho';
    }

    // Atualizar itens
    this.renderItensEmpenho();

    // ✅ Atualizar exibição de totais (soma dos itens vs valor do empenho)
    await this._atualizarExibicaoTotais();

    console.log('[State] ✅ Formulário atualizado com', itens.length, 'itens');
  }
  /* eslint-enable complexity */

  /**
   * ✅ Atualiza a exibição de totais (soma itens vs valor empenho vs saldo)
   * Saldo = Valor Total do Empenho - Valor já entregue (notas fiscais)
   * Por enquanto, como não há módulo de entregas, saldo = valor total do empenho
   */
  async _atualizarExibicaoTotais() {
    const somaItens = this.empenhoDraft.itens.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
    const valorEmpenho = this.empenhoDraft.header.valorTotalEmpenho || 0;

    // Buscar valor já entregue (notas fiscais vinculadas ao empenho)
    let valorEntregue = 0;
    const empenhoId = this.empenhoDraft.header.id;
    if (empenhoId && window.dbManager?.buscarNotasFiscaisPorEmpenho) {
      try {
        const notasFiscais = await window.dbManager.buscarNotasFiscaisPorEmpenho(empenhoId);
        valorEntregue = (notasFiscais || []).reduce((acc, nf) => acc + (nf.valorTotal || 0), 0);
      } catch (e) {
        console.warn('[State] Não foi possível buscar NFs:', e.message);
      }
    }

    // Saldo = Valor do Empenho - Valor já Entregue
    const saldoEmpenho = valorEmpenho - valorEntregue;

    // Atualizar exibição
    const totalItensEl = document.getElementById('totalItensValor');
    const saldoEl = document.getElementById('diferencaValor');

    if (totalItensEl) {
      totalItensEl.textContent = FormatUtils.formatCurrencyBR(somaItens);
    }

    if (saldoEl) {
      saldoEl.textContent = FormatUtils.formatCurrencyBR(saldoEmpenho);
      // Destacar conforme saldo
      if (saldoEmpenho > 0) {
        saldoEl.style.color = '#28a745'; // Verde - ainda há saldo
        saldoEl.title = `Saldo disponível: ${FormatUtils.formatCurrencyBR(saldoEmpenho)}`;
      } else if (saldoEmpenho === 0) {
        saldoEl.style.color = '#6c757d'; // Cinza - saldo zerado
        saldoEl.title = 'Empenho totalmente utilizado';
      } else {
        saldoEl.style.color = '#dc3545'; // Vermelho - saldo negativo (erro)
        saldoEl.title = 'Atenção: Valor entregue excede o empenho!';
      }
    }

    console.log(
      '[State] 📊 Totais - Empenho:',
      valorEmpenho,
      'Itens:',
      somaItens,
      'Entregue:',
      valorEntregue,
      'Saldo:',
      saldoEmpenho
    );
  }

  // ========== Métodos auxiliares ==========

  /**
   * Navega para uma tela específica
   */
  showScreen(screenId) {
    // Verifica autenticação (exceto para tela de login)
    if (screenId !== 'loginScreen' && !this.usuarioLogado) {
      screenId = 'loginScreen';
    }

    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.remove('active');
    });

    // Mostra a tela solicitada
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add('active');
      this.currentScreen = screenId;

      // Inicializa módulo de consultas quando a tela for aberta
      if (screenId === 'consultasScreen' && typeof window.initConsultas === 'function') {
        window.initConsultas();
      }

      // Inicializa tela de pedidos de catalogação CATMAT
      if (screenId === 'catalogacaoScreen') {
        CatalogacaoTela.initTelaCatalogacao('catalogacaoPedidosContainer');
      }

      // Carrega empenhos no select quando entra na tela de Nota Fiscal
      if (screenId === 'notaFiscalScreen') {
        this.carregarEmpenhosSelect().catch((err) =>
          console.error('[showScreen] Erro ao carregar empenhos para NF:', err)
        );
      }
    }

    // Controla visibilidade do header
    const header = document.getElementById('mainHeader');
    if (header) {
      if (screenId === 'loginScreen') {
        header.classList.add('hidden');
      } else {
        header.classList.remove('hidden');
      }
    }

    // Atualiza navegação
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.remove('active');
    });

    if (screenId === 'homeScreen') {
      document.getElementById('btnHome')?.classList.add('active');
    }
  }

  /**
   * Mostra overlay de loading
   */
  showLoading(message = 'Carregando...') {
    showLoader(message);
  }

  /**
   * Esconde overlay de loading
   */
  hideLoading() {
    hideLoader();
  }

  /**
   * Mostra mensagem de sucesso
   */
  showSuccess(message) {
    this.showToast('✅ ' + message, 'success');
  }

  /**
   * Mostra mensagem informativa
   */
  showInfo(message) {
    this.showToast('ℹ️ ' + message, 'info');
  }

  showToast(message, type = 'info') {
    sharedShowToast(message, type);
  }

  /**
   * Mostra mensagem de erro com modal customizado (permite seleção de texto)
   */
  showError(message, details = null) {
    console.error('[APP] ❌ ERRO:', message);
    if (details) {
      console.error('[APP] 📋 Detalhes:', details);
      if (details instanceof Error) {
        console.error('[APP] 📚 Stack:', details.stack);
      }
    }

    // Remove modal anterior se existir
    const oldModal = document.getElementById('error-modal-custom');
    if (oldModal) {
      oldModal.remove();
    }

    // Cria modal customizado
    const modal = document.createElement('div');
    modal.id = 'error-modal-custom';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      animation: fadeIn 0.2s;
    `;

    // Detalhes técnicos completos
    let detailsHtml = '';
    if (details) {
      if (details instanceof Error) {
        detailsHtml = `
          <div style="margin-top: 15px; padding: 15px; background: #2a2a2a; border-radius: 5px; border-left: 3px solid #dc3545;">
            <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">📋 Detalhes Técnicos (selecione para copiar):</div>
            <div style="
              font-family: 'Courier New', monospace;
              font-size: 12px;
              white-space: pre-wrap;
              word-break: break-all;
              max-height: 200px;
              overflow-y: auto;
              user-select: text;
              -webkit-user-select: text;
              -moz-user-select: text;
              -ms-user-select: text;
              color: #ff6b6b;
              line-height: 1.6;
              padding: 10px;
              background: #1a1a1a;
              border-radius: 3px;
            ">${details.message}

Stack Trace:
${details.stack || 'Não disponível'}</div>
          </div>
        `;
      } else if (typeof details === 'object') {
        detailsHtml = `
          <div style="margin-top: 15px; padding: 15px; background: #2a2a2a; border-radius: 5px; border-left: 3px solid #dc3545;">
            <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">📋 Detalhes (selecione para copiar):</div>
            <div style="
              font-family: 'Courier New', monospace;
              font-size: 12px;
              white-space: pre-wrap;
              max-height: 200px;
              overflow-y: auto;
              user-select: text;
              -webkit-user-select: text;
              color: #ff6b6b;
              padding: 10px;
              background: #1a1a1a;
              border-radius: 3px;
            ">${JSON.stringify(details, null, 2)}</div>
          </div>
        `;
      } else {
        detailsHtml = `
          <div style="margin-top: 15px; padding: 15px; background: #2a2a2a; border-radius: 5px; border-left: 3px solid #dc3545;">
            <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">📋 Detalhes (selecione para copiar):</div>
            <div style="
              font-family: 'Courier New', monospace;
              font-size: 12px;
              white-space: pre-wrap;
              user-select: text;
              -webkit-user-select: text;
              color: #ff6b6b;
              padding: 10px;
              background: #1a1a1a;
              border-radius: 3px;
            ">${String(details)}</div>
          </div>
        `;
      }
    }

    modal.innerHTML = `
      <div style="
        background: #1e1e1e;
        color: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 700px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
        animation: slideDown 0.3s;
      ">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
          <div style="font-size: 48px;">❌</div>
          <div>
            <h2 style="margin: 0; color: #dc3545; font-size: 24px;">Erro ao Salvar</h2>
            <p style="margin: 5px 0 0 0; color: #ccc; font-size: 14px;">Ocorreu um problema durante o salvamento</p>
          </div>
        </div>

        <div style="
          background: #2a2a2a;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #dc3545;
        ">
          <div style="font-weight: bold; color: #fff; margin-bottom: 10px;">📝 Mensagem:</div>
          <div style="
            color: #ff6b6b;
            line-height: 1.6;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
          ">${message}</div>
        </div>

        ${detailsHtml}

        <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 5px; border-left: 3px solid #ffc107;">
          <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">💡 Como Reportar:</div>
          <ol style="margin: 10px 0; padding-left: 20px; color: #ccc; line-height: 1.8;">
            <li>Selecione e copie (Ctrl+C) a mensagem de erro acima</li>
            <li>Abra o Console (pressione F12)</li>
            <li>Tire um screenshot do console</li>
            <li>Envie ambos (mensagem + screenshot) para o suporte</li>
          </ol>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: flex-end;">
          <button onclick="console.log('=== DETALHES DO ERRO ==='); console.error('${message.replace(/'/g, "\\'")}'); ${details ? `console.error(${JSON.stringify(details)});` : ''} alert('✅ Erro logado no console! Pressione F12 para ver.')"
            style="
              background: #6c757d;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              font-weight: 600;
              font-size: 14px;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#5a6268'"
            onmouseout="this.style.background='#6c757d'"
          >
            📋 Logar no Console
          </button>
          <button onclick="document.getElementById('error-modal-custom').remove()"
            style="
              background: #dc3545;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              font-weight: 600;
              font-size: 14px;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#c82333'"
            onmouseout="this.style.background='#dc3545'"
          >
            ✓ Fechar
          </button>
        </div>
      </div>
    `;

    // Adiciona estilos de animação
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideDown {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(modal);

    // Fecha ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Fecha com ESC
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  /**
   * Mostra mensagem de aviso
   */
  showWarning(message) {
    alert('⚠️ ' + message);
  }

  /**
   * Adiciona um item ao formulário de empenho
   * @param {string} seq - Sequência do item (opcional)
   * @param {string} descricao - Descrição do item (opcional)
   * @param {string} unidade - Unidade de medida (opcional)
   * @param {number} quantidade - Quantidade (opcional)
   * @param {number} valorUnitario - Valor unitário (opcional)
   */
  adicionarItemEmpenho(seq = null, descricao = '', unidade = 'UN', quantidade = null, valorUnitario = null) {
    // Mantém compatibilidade: converte chamada antiga em abertura do modal pré-preenchido
    this.abrirModalItemEmpenho({
      seq,
      descricao,
      unidade,
      quantidade,
      valorUnitario
    });
  }

  /**
   * Adiciona um item ao formulário de nota fiscal
   */
  adicionarItemNotaFiscal() {
    const container = document.getElementById('itensNotaFiscal');
    const itemRow = this.criarItemRow('notaFiscal');
    container.appendChild(itemRow);
  }

  // ========================================
  // ENTRADA MANUAL NF - FUNÇÕES AUXILIARES
  // ========================================

  /**
   * Empenho selecionado: preenche dados do fornecedor e prepara autocomplete
   * @param {number} empenhoId - ID do empenho selecionado
   */
  async onEmpenhoSelecionado(empenhoId) {
    try {
      const empenho = await window.dbManager.buscarEmpenhoPorId(empenhoId);
      if (!empenho) {
        this.limparInfoEmpenhoNF();
        return;
      }

      // Armazena empenho para uso posterior
      this.empenhoVinculadoNF = empenho;

      // Preenche informações do fornecedor
      const cnpjEmitente = document.getElementById('cnpjEmitente');
      const infoEmpenho = document.getElementById('infoEmpenhoSelecionado');
      const fornecedorInfo = document.getElementById('nfFornecedorInfo');
      const cnpjInfo = document.getElementById('nfCnpjInfo');
      const itensInfo = document.getElementById('nfItensInfo');
      const itensHint = document.getElementById('nfItensHint');
      const btnAddFromEmpenho = document.getElementById('btnAddItemFromEmpenho');

      // CNPJ do fornecedor no campo emitente
      if (cnpjEmitente && empenho.cnpjFornecedor) {
        const cnpjFormatado = this.formatarCNPJ(empenho.cnpjFornecedor);
        cnpjEmitente.value = cnpjFormatado;
      }

      // Exibe informações do empenho selecionado
      if (infoEmpenho) {
        infoEmpenho.style.display = 'block';
        if (fornecedorInfo) {
          fornecedorInfo.textContent = empenho.fornecedor || '-';
        }
        if (cnpjInfo) {
          cnpjInfo.textContent = this.formatarCNPJ(empenho.cnpjFornecedor) || '-';
        }
        if (itensInfo) {
          itensInfo.textContent = empenho.itens?.length || 0;
        }
      }

      // Atualiza hint de itens
      if (itensHint) {
        itensHint.textContent = `💡 ${empenho.itens?.length || 0} itens disponíveis no empenho`;
        itensHint.style.color = '#28a745';
      }

      // Mostra botão de adicionar do empenho
      if (btnAddFromEmpenho && empenho.itens?.length > 0) {
        btnAddFromEmpenho.style.display = 'inline-flex';
      }

      // Cria datalist com itens do empenho para autocomplete
      this.criarDatalistItensEmpenho(empenho.itens);

      // Verifica divergências existentes
      this.verificarDivergencias(empenhoId);

      console.log(`[NF] Empenho ${empenho.numero} selecionado, ${empenho.itens?.length} itens disponíveis`);
    } catch (error) {
      console.error('[NF] Erro ao carregar empenho:', error);
      this.limparInfoEmpenhoNF();
    }
  }

  /**
   * Limpa informações do empenho na tela de NF
   */
  limparInfoEmpenhoNF() {
    this.empenhoVinculadoNF = null;

    const infoEmpenho = document.getElementById('infoEmpenhoSelecionado');
    const itensHint = document.getElementById('nfItensHint');
    const btnAddFromEmpenho = document.getElementById('btnAddItemFromEmpenho');
    const datalist = document.getElementById('datalistItensEmpenho');

    if (infoEmpenho) {
      infoEmpenho.style.display = 'none';
    }
    if (itensHint) {
      itensHint.textContent = 'Selecione um empenho para sugestões de itens';
      itensHint.style.color = '#1976d2';
    }
    if (btnAddFromEmpenho) {
      btnAddFromEmpenho.style.display = 'none';
    }
    if (datalist) {
      datalist.innerHTML = '';
    }
  }

  /**
   * Cria datalist com itens do empenho para autocomplete nos campos de descrição
   * @param {Array} itens - Itens do empenho
   */
  criarDatalistItensEmpenho(itens) {
    const datalist = document.getElementById('datalistItensEmpenho');
    if (!datalist || !itens) {
      return;
    }

    datalist.innerHTML = '';

    itens.forEach((item, idx) => {
      const option = document.createElement('option');
      // Formato: "DESCRIÇÃO | UN | R$ 10,00 | Item 001"
      const descricao = (item.descricao || item.material || '').toUpperCase();
      const unidade = item.unidade || 'UN';
      const vlrUnit = item.valorUnitario ? this.formatarMoeda(item.valorUnitario) : 'R$ 0,00';
      const itemCompra = item.itemCompra || item.codigo || String(idx + 1).padStart(3, '0');

      option.value = descricao;
      option.dataset.unidade = unidade;
      option.dataset.valorUnitario = item.valorUnitario || 0;
      option.dataset.itemCompra = itemCompra;
      option.textContent = `${descricao} | ${unidade} | ${vlrUnit}`;

      datalist.appendChild(option);
    });

    console.log(`[NF] Datalist criado com ${itens.length} itens`);
  }

  /**
   * Mostra modal/seletor para escolher itens do empenho vinculado
   * IMPLEMENTAÇÃO: Checklist desmarcado por padrão + Marcar/Desmarcar todos + CSS moderno
   */
  mostrarSeletorItensEmpenho() {
    if (!this.empenhoVinculadoNF?.itens?.length) {
      this.showWarning('Selecione um empenho com itens antes de adicionar');
      return;
    }

    const itens = this.empenhoVinculadoNF.itens;
    const itensNaLista = new Set();

    // Coleta itens já adicionados à NF (por descrição ou itemCompra)
    document.querySelectorAll('#itensNotaFiscal .item-row').forEach((row) => {
      const descricao = row.querySelector('[data-field="descricao"]')?.value?.toUpperCase().trim();
      const itemCompra = row.querySelector('[data-field="itemCompra"]')?.value?.trim();
      if (itemCompra) {
        itensNaLista.add(`IC:${itemCompra}`);
      }
      if (descricao) {
        itensNaLista.add(`D:${descricao}`);
      }
    });

    // Marca itens já adicionados
    const itensComStatus = itens.map((item, idx) => {
      const desc = (item.descricao || item.material || '').toUpperCase().trim();
      const ic = String(item.itemCompra || item.codigo || '').trim();
      const jaAdicionado = (ic && itensNaLista.has(`IC:${ic}`)) || itensNaLista.has(`D:${desc}`);
      return { ...item, idx, jaAdicionado };
    });

    const disponiveis = itensComStatus.filter((i) => !i.jaAdicionado);
    const jaAdicionados = itensComStatus.filter((i) => i.jaAdicionado);

    if (disponiveis.length === 0 && jaAdicionados.length > 0) {
      this.showInfo('✅ Todos os itens do empenho já foram adicionados à NF');
      return;
    }

    const self = this;

    // Remove modal anterior se existir
    const existente = document.getElementById('modalSeletorItensNF');
    if (existente) {
      existente.remove();
    }

    // Cria modal com estrutura moderna
    const modal = document.createElement('div');
    modal.id = 'modalSeletorItensNF';
    modal.className = 'modal-itens-empenho';

    modal.innerHTML = `
      <div class="overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">📋 Adicionar Itens do Empenho</h3>
          <button type="button" class="modal-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-controls">
          <button type="button" class="btn btn-sm btn-outline" id="btnMarcarTodosItensEmpenho">
            ☑️ Marcar todos
          </button>
          <button type="button" class="btn btn-sm btn-outline" id="btnDesmarcarTodosItensEmpenho">
            ☐ Desmarcar todos
          </button>
          <span class="contador-itens">
            ${disponiveis.length} disponíveis${jaAdicionados.length ? `, ${jaAdicionados.length} já adicionados` : ''}
          </span>
        </div>
        <div class="modal-body" id="modalSeletorItensBody">
          <div class="itens-checklist">
            ${disponiveis
              .map(
                (item) => `
              <label class="it-check-row" data-idx="${item.idx}">
                <input type="checkbox" class="chkItemEmpenho" value="${item.idx}">
                <span class="item-badge">${item.itemCompra || item.codigo || item.idx + 1}</span>
                <div class="item-info">
                  <span class="item-desc">${(item.descricao || item.material || 'Sem descrição').toUpperCase()}</span>
                  <span class="item-meta">${item.unidade || 'UN'} • ${self.formatarMoeda(item.valorUnitario || 0)}</span>
                </div>
              </label>
            `
              )
              .join('')}
            ${jaAdicionados
              .map(
                (item) => `
              <label class="it-check-row ja-adicionado" data-idx="${item.idx}" title="Item já adicionado à NF">
                <input type="checkbox" class="chkItemEmpenho" value="${item.idx}" disabled>
                <span class="item-badge item-badge-ok">✓</span>
                <div class="item-info">
                  <span class="item-desc">${(item.descricao || item.material || 'Sem descrição').toUpperCase()}</span>
                  <span class="item-meta">${item.unidade || 'UN'} • ${self.formatarMoeda(item.valorUnitario || 0)} • <em>Já adicionado</em></span>
                </div>
              </label>
            `
              )
              .join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelarItensEmpenho">Cancelar</button>
          <button type="button" class="btn btn-primary" id="btnConfirmarItensEmpenho">✅ Adicionar Selecionados</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Funções auxiliares
    const fecharModal = () => modal.remove();

    const setAllChecks = (checked) => {
      modal.querySelectorAll('.chkItemEmpenho:not(:disabled)').forEach((chk) => {
        chk.checked = checked;
      });
    };

    // Bind eventos
    modal.querySelector('.overlay').addEventListener('click', fecharModal);
    modal.querySelector('.modal-close').addEventListener('click', fecharModal);
    modal.querySelector('#btnCancelarItensEmpenho').addEventListener('click', fecharModal);
    modal.querySelector('#btnMarcarTodosItensEmpenho').addEventListener('click', () => setAllChecks(true));
    modal.querySelector('#btnDesmarcarTodosItensEmpenho').addEventListener('click', () => setAllChecks(false));

    modal.querySelector('#btnConfirmarItensEmpenho').addEventListener('click', () => {
      const checkboxes = modal.querySelectorAll('.chkItemEmpenho:checked');
      if (checkboxes.length === 0) {
        self.showWarning('Nenhum item selecionado');
        return;
      }

      checkboxes.forEach((cb) => {
        const item = itens[parseInt(cb.value)];
        if (item) {
          self.adicionarItemNFPreenchido(item);
        }
      });

      fecharModal();
      self.calcularValorTotalNotaFiscal();
      self.showSuccess(`✅ ${checkboxes.length} item(ns) adicionado(s)`);
    });

    // Força todos desmarcados por padrão
    setAllChecks(false);

    // Abre o modal
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  /**
   * Adiciona item à NF já preenchido com dados do empenho
   * @param {Object} item - Item do empenho
   */
  adicionarItemNFPreenchido(item) {
    const container = document.getElementById('itensNotaFiscal');
    const seq = (container?.querySelectorAll('tr.nf-row').length || 0) + 1;

    // Dados de referência do empenho para validação de divergência
    const refEmpenho = {
      quantidade: item.quantidade || item.qtd || 0,
      valorUnitario: item.valorUnitario || 0
    };

    const itemRow = this.criarItemRow(
      'notaFiscal',
      seq,
      (item.descricao || item.material || '').toUpperCase(),
      item.unidade || 'UN',
      null, // quantidade será preenchida pelo usuário
      item.valorUnitario || 0,
      item.subelemento || '',
      item.itemCompra || item.codigo || '',
      refEmpenho
    );

    // Marca origem como EMPENHO (para validação posterior)
    itemRow.dataset.origem = 'EMPENHO';

    container.appendChild(itemRow);
  }

  /**
   * Cria uma linha de item
   * @param {string} tipo - Tipo do item ('empenho' ou 'notaFiscal')
   * @param {string} seq - Sequência do item (opcional)
   * @param {string} descricao - Descrição do item (opcional)
   * @param {string} unidade - Unidade de medida (opcional)
   * @param {number} quantidade - Quantidade (opcional)
   * @param {number} valorUnitario - Valor unitário (opcional)
   * @param {string} subelemento - Subelemento de despesa (opcional)
   * @param {string} itemCompra - Número do item de compra (opcional)
   * @param {Object} refEmpenho - Referências do empenho para validação (opcional)
   */
  criarItemRow(
    tipo = 'empenho',
    seq = null,
    descricao = '',
    unidade = 'UN',
    quantidade = null,
    valorUnitario = null,
    subelemento = '',
    itemCompra = '',
    refEmpenho = null
  ) {
    // Define o próximo número de sequência se não fornecido
    if (seq === null) {
      const container =
        tipo === 'empenho' ? document.getElementById('itensEmpenho') : document.getElementById('itensNotaFiscal');
      const selector = tipo === 'notaFiscal' ? 'tr.nf-row' : '.item-row';
      seq = (container?.querySelectorAll(selector).length || 0) + 1;
    }

    // Calcula valor total se quantidade e valorUnitario forem fornecidos
    const valorTotal = quantidade !== null && valorUnitario !== null ? quantidade * valorUnitario : 0;

    // ========== NOTA FISCAL: Gera TR para tabela ERP ==========
    if (tipo === 'notaFiscal') {
      const tr = document.createElement('tr');
      const itemKey = `nf-item-${Date.now()}-${seq}`;

      // Dados de referência do empenho para validação
      const refQtdMax = refEmpenho?.quantidade || refEmpenho?.qtd || 0;
      const refVlrUnit = refEmpenho?.valorUnitario || 0;

      tr.className = 'nf-row nf-row-ok';
      tr.dataset.itemkey = itemKey;
      tr.dataset.refqtdmax = refQtdMax;
      tr.dataset.refvlrunit = refVlrUnit;

      tr.innerHTML = `
        <td class="col-seq"><span class="seq-badge">${seq}</span></td>
        <td class="col-sub"><input type="text" class="nf-subelemento" data-field="subelemento" value="${subelemento}" placeholder="Subelem." title="Subelemento de despesa"></td>
        <td class="col-item"><input type="text" class="nf-itemcompra" data-field="itemCompra" value="${itemCompra}" placeholder="Item"></td>
        <td class="col-desc"><input type="text" class="nf-descricao" data-field="descricao" value="${descricao}" placeholder="Descrição do item"></td>
        <td class="col-un"><input type="text" class="nf-unidade" data-field="unidade" value="${unidade}" placeholder="UN"></td>
        <td class="col-qtd"><input type="text" class="nf-qtd input-num" data-field="quantidade" value="${quantidade !== null ? window.formatarNumero(quantidade) : ''}" placeholder="0"></td>
        <td class="col-vlr"><input type="text" class="nf-vunit input-num" data-field="valorUnitario" value="${valorUnitario !== null ? window.formatarNumero(valorUnitario) : ''}" placeholder="0,00"></td>
        <td class="col-total"><input type="text" class="nf-vtotal input-num" data-field="valorTotal" value="${valorTotal > 0 ? window.formatarNumero(valorTotal) : ''}" placeholder="0,00" readonly></td>
        <td class="col-actions"><button type="button" class="btn-remove" title="Remover item">×</button></td>
      `;

      // Eventos
      const qtdInput = tr.querySelector('.nf-qtd');
      const vlrUnitInput = tr.querySelector('.nf-vunit');
      const vlrTotalInput = tr.querySelector('.nf-vtotal');
      const btnRemove = tr.querySelector('.btn-remove');

      const self = this;

      const calcularTotalEAtualizar = () => {
        const qtd = window.converterMoedaParaNumero(qtdInput.value) || 0;
        const vlrUnit = window.converterMoedaParaNumero(vlrUnitInput.value) || 0;
        const total = this.money2(qtd * vlrUnit);
        vlrTotalInput.value = window.formatarNumero(total);

        // Atualiza status da linha (divergência)
        this.atualizarStatusLinhaItem(tr);

        // Recalcula totais gerais
        this.calcularValorTotalNotaFiscal();
      };

      const formatarCampo = (input) => {
        input.addEventListener('blur', () => {
          if (input.value) {
            const valor = window.converterMoedaParaNumero(input.value);
            input.value = window.formatarNumero(valor);
          }
        });
      };

      const flashInput = (el) => {
        el.classList.remove('changed');
        void el.offsetWidth;
        el.classList.add('changed');
        setTimeout(() => el.classList.remove('changed'), 700);
      };

      formatarCampo(qtdInput);
      formatarCampo(vlrUnitInput);

      qtdInput.addEventListener('input', () => {
        flashInput(qtdInput);
        calcularTotalEAtualizar();
      });
      qtdInput.addEventListener('blur', calcularTotalEAtualizar);

      vlrUnitInput.addEventListener('input', () => {
        flashInput(vlrUnitInput);
        calcularTotalEAtualizar();
      });
      vlrUnitInput.addEventListener('blur', calcularTotalEAtualizar);

      btnRemove.addEventListener('click', () => {
        tr.remove();
        self.calcularValorTotalNotaFiscal();
      });

      return tr;
    }

    // ========== EMPENHO: Gera DIV (comportamento original) ==========
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';

    itemRow.innerHTML = `
            <span class="item-seq">${seq}</span>
            <input type="text" class="item-subelemento" placeholder="Subelem." data-field="subelemento" value="${subelemento}" title="Subelemento de despesa">
            <input type="text" class="item-compra" placeholder="Item Cpr." data-field="itemCompra" value="${itemCompra}" title="Item de compra">
            <input type="text" class="item-descricao" placeholder="Descrição" data-field="descricao" value="${descricao}">
            <input type="text" class="item-unidade" placeholder="UN" data-field="unidade" value="${unidade}">
            <input type="text" class="item-quantidade" placeholder="Qtd" data-field="quantidade" value="${quantidade !== null ? window.formatarNumero(quantidade) : ''}">
            <input type="text" class="item-valor" placeholder="Vlr Unit." data-field="valorUnitario" value="${valorUnitario !== null ? window.formatarNumero(valorUnitario) : ''}">
            <input type="text" class="item-valor-total" placeholder="Vlr Total" data-field="valorTotal" value="${valorTotal > 0 ? window.formatarNumero(valorTotal) : ''}" readonly>
            <button type="button" class="btn-remove" onclick="this.parentElement.remove(); window.app.calcularValorTotalEmpenho(); window.app.calcularValorTotalNotaFiscal();">×</button>
        `;

    // Adiciona eventos para calcular valor total automaticamente
    const qtdInput = itemRow.querySelector('[data-field="quantidade"]');
    const vlrUnitInput = itemRow.querySelector('[data-field="valorUnitario"]');
    const vlrTotalInput = itemRow.querySelector('[data-field="valorTotal"]');

    const calcularTotal = () => {
      // Converte valores brasileiros para número
      const qtd = window.converterMoedaParaNumero(qtdInput.value) || 0;
      const vlrUnit = window.converterMoedaParaNumero(vlrUnitInput.value) || 0;
      const total = qtd * vlrUnit;

      // ✅ FORMATAÇÃO BRASILEIRA: 1.234,56
      vlrTotalInput.value = window.formatarNumero(total);

      // Chama o método apropriado dependendo do tipo
      if (tipo === 'empenho') {
        this.calcularValorTotalEmpenho();
      } else if (tipo === 'notaFiscal') {
        this.calcularValorTotalNotaFiscal();
      }
    };

    // Formata campos monetários ao digitar
    const formatarCampo = (input) => {
      input.addEventListener('blur', () => {
        if (input.value) {
          const valor = window.converterMoedaParaNumero(input.value);
          input.value = window.formatarNumero(valor);
        }
      });
    };

    formatarCampo(qtdInput);
    formatarCampo(vlrUnitInput);

    qtdInput.addEventListener('input', calcularTotal);
    qtdInput.addEventListener('blur', calcularTotal);
    vlrUnitInput.addEventListener('input', calcularTotal);
    vlrUnitInput.addEventListener('blur', calcularTotal);

    return itemRow;
  }

  /**
   * Atualiza status visual da linha de item NF (ok/warn/bad)
   * @param {HTMLTableRowElement} tr - Linha da tabela
   */
  atualizarStatusLinhaItem(tr) {
    if (!tr) {
      return;
    }

    const qtd = window.converterMoedaParaNumero(tr.querySelector('.nf-qtd')?.value) || 0;
    const vlrUnit = window.converterMoedaParaNumero(tr.querySelector('.nf-vunit')?.value) || 0;
    const refQtdMax = parseFloat(tr.dataset.refqtdmax) || 0;
    const refVlrUnit = parseFloat(tr.dataset.refvlrunit) || 0;

    const tolAbs = 0.01;
    const tolPct = 0.01; // 1%

    let status = 'ok';

    // Verifica quantidade acima do permitido
    if (refQtdMax > 0 && qtd > refQtdMax) {
      status = 'bad';
    }
    // Verifica divergência de valor unitário
    else if (refVlrUnit > 0) {
      const diffAbs = Math.abs(vlrUnit - refVlrUnit);
      const diffPct = diffAbs / refVlrUnit;
      if (diffAbs > tolAbs && diffPct > tolPct) {
        status = 'warn';
      }
    }

    tr.classList.remove('nf-row-ok', 'nf-row-warn', 'nf-row-bad');
    tr.classList.add(`nf-row-${status}`);
  }

  /**
   * Calcula o valor total do empenho baseado nos itens
   */
  calcularValorTotalEmpenho() {
    const container = document.getElementById('itensEmpenho');
    if (!container) {
      return;
    }

    let total = 0;
    container.querySelectorAll('.item-row').forEach((row) => {
      const valorTotalStr = row.querySelector('[data-field="valorTotal"]')?.value || '0';
      // ✅ Converte formato brasileiro para número
      const valorTotal = window.converterMoedaParaNumero(valorTotalStr);
      total += valorTotal;
    });

    const valorTotalInput = document.getElementById('valorTotalEmpenho');
    if (valorTotalInput) {
      // ✅ FORMATAÇÃO BRASILEIRA: 1.234,56
      valorTotalInput.value = window.formatarNumero(total);
    }

    this.atualizarTotaisEmpenho();
  }

  atualizarTotaisEmpenho() {
    const totalItens = (this.empenhoDraft.itens || []).reduce((acc, item) => acc + (Number(item.valorTotal) || 0), 0);
    const campoValorTotal = document.getElementById('valorTotalEmpenho');
    const valorInformado = campoValorTotal ? this.parseNumero(campoValorTotal.value) : 0;

    const diffEl = document.getElementById('diferencaValor');
    const totalEl = document.getElementById('totalItensValor');

    if (totalEl) {
      totalEl.textContent = window.formatarNumero(totalItens);
    }

    if (diffEl) {
      const diff = valorInformado - totalItens;
      diffEl.textContent = window.formatarNumero(diff);
      diffEl.classList.toggle('text-danger', Math.abs(diff) > 0.01);
    }
  }

  atualizarBadgeStatus() {
    const badge = document.getElementById('badgeStatusEmpenho');
    if (!badge) {
      return;
    }

    const status = this.empenhoDraft.header?.statusValidacao || 'rascunho';
    badge.textContent = status === 'validado' ? 'VALIDADO' : 'RASCUNHO';
    badge.className = `badge-status badge-${status === 'validado' ? 'success' : 'warning'}`;
  }

  atualizarBotaoValidar() {
    const btn = document.getElementById('btnValidarEmpenho');
    if (!btn) {
      return;
    }
    const status = this.empenhoDraft.header?.statusValidacao || 'rascunho';
    const temItens = (this.empenhoDraft.itens || []).length > 0;
    btn.disabled = status === 'validado' || !temItens;
  }

  /* eslint-disable complexity */
  renderItensEmpenho() {
    const container = document.getElementById('itensEmpenho');
    if (!container) {
      return;
    }
    container.innerHTML = '';

    (this.empenhoDraft.itens || []).forEach((item, index) => {
      // ✅ Formatar exibição do subelemento
      const subelementoDisplay = item.subelementoCodigo
        ? `${item.subelementoCodigo} - ${item.subelementoNome || 'N/A'}`
        : '-';

      const row = document.createElement('div');
      row.classList.add('item-row');
      row.innerHTML = `
        <div class="item-row__content">
          <div class="item-row__info">
            <strong>${item.seq || index + 1}.</strong> ${item.descricao || ''}<br>
            <small>${item.unidade || 'UN'} | Qtd: ${window.formatarNumero(item.quantidade || 0)} | Vlr Un.: ${window.formatarNumero(item.valorUnitario || 0)} | Total: ${window.formatarNumero(item.valorTotal || 0)}</small><br>
            <small>Subelemento: ${subelementoDisplay} | Item Compra: ${item.itemCompra || '-'} | CATMAT: ${item.catmatCodigo || '-'} ${item.catmatDescricao ? ' - ' + item.catmatDescricao : ''}</small>
            ${item.observacao ? `<br><small>Obs: ${item.observacao}</small>` : ''}
          </div>
          <div class="item-row__actions">
            <button type="button" class="btn btn-sm btn-secondary" data-action="edit">Editar</button>
            <button type="button" class="btn btn-sm btn-danger" data-action="delete">Excluir</button>
          </div>
        </div>
  <input type="hidden" data-field="seq" value="${item.seq || index + 1}">
  <input type="hidden" data-field="codigo" value="${item.subelementoCodigo || ''}">
  <input type="hidden" data-field="descricao" value="${item.descricao || ''}">
        <input type="hidden" data-field="unidade" value="${item.unidade || 'UN'}">
        <input type="hidden" data-field="quantidade" value="${window.formatarNumero(item.quantidade || 0)}">
        <input type="hidden" data-field="valorUnitario" value="${window.formatarNumero(item.valorUnitario || 0)}">
        <input type="hidden" data-field="valorTotal" value="${window.formatarNumero(item.valorTotal || 0)}">
        <input type="hidden" data-field="itemCompra" value="${item.itemCompra || ''}">
        <input type="hidden" data-field="subelementoCodigo" value="${item.subelementoCodigo || ''}">
        <input type="hidden" data-field="subelementoNome" value="${item.subelementoNome || ''}">
        <input type="hidden" data-field="observacao" value="${item.observacao || ''}">
        <input type="hidden" data-field="catmatCodigo" value="${item.catmatCodigo || ''}">
        <input type="hidden" data-field="catmatDescricao" value="${item.catmatDescricao || ''}">
        <input type="hidden" data-field="catmatFonte" value="${item.catmatFonte || ''}">
      `;

      row.querySelector('[data-action="edit"]').addEventListener('click', () => this.abrirModalItemEmpenho({ index }));
      row.querySelector('[data-action="delete"]').addEventListener('click', () => this.excluirItemEmpenho(index));

      container.appendChild(row);
    });

    this.atualizarTotaisEmpenho();
    this.atualizarBadgeStatus();
    this.atualizarBotaoValidar();
  }

  excluirItemEmpenho(index) {
    if ((this.empenhoDraft.header?.statusValidacao || 'rascunho') === 'validado') {
      this.showToast('Empenho já validado. Não é possível excluir itens.', 'warning');
      return;
    }
    this.empenhoDraft.itens.splice(index, 1);
    this.reindexarSequenciaEmpenho();
    this.renderItensEmpenho();
  }

  reindexarSequenciaEmpenho() {
    this.empenhoDraft.itens = (this.empenhoDraft.itens || []).map((item, idx) => ({ ...item, seq: idx + 1 }));
  }

  /**
   * ✅ Abre modal para adicionar/editar item do empenho
   * Usa o módulo NaturezaSubelementos para filtrar opções
   */
  abrirModalItemEmpenho(options = {}) {
    const {
      index = null,
      seq = null,
      descricao = '',
      unidade = 'UN',
      quantidade = null,
      valorUnitario = null
    } = options;

    // ✅ Verificar se natureza da despesa está definida
    const naturezaDespesa = this.empenhoDraft.header.naturezaDespesa;
    if (!naturezaDespesa) {
      this.showToast('⚠️ Selecione a Natureza da Despesa no cabeçalho antes de adicionar itens.', 'warning');
      return;
    }

    const existente = index !== null ? this.empenhoDraft.itens[index] : null;
    const dados = existente || {
      seq: seq || this.empenhoDraft.itens.length + 1,
      descricao,
      unidade,
      quantidade,
      valorUnitario,
      valorTotal: quantidade && valorUnitario ? quantidade * valorUnitario : null,
      subelementoCodigo: '',
      subelementoNome: '',
      itemCompra: '',
      catmatCodigo: '',
      catmatDescricao: '',
      catmatFonte: '',
      observacao: ''
    };

    // ✅ Gerar opções de subelemento filtradas pela natureza da despesa (usando módulo)
    const opcoesSubelemento = NaturezaSubelementos.gerarOpcoesSubelemento(naturezaDespesa, dados.subelementoCodigo);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card modal-item-empenho">
        <div class="modal-header">
          <h4>${index !== null ? '✏️ Editar Item' : '➕ Adicionar Item'}</h4>
          <button type="button" class="btn-fechar" id="modalFechar" title="Fechar">✕</button>
        </div>

        <div class="modal-body">
          <!-- Seção: Identificação -->
          <fieldset class="modal-section">
            <legend>📋 Identificação</legend>
            <div class="modal-grid modal-grid-3">
              <div class="form-group">
                <label for="modalSeq">Seq</label>
                <input type="number" id="modalSeq" value="${dados.seq || ''}" class="input-sm" />
              </div>
              <div class="form-group">
                <label for="modalSubelemento">Subelemento *</label>
                <select id="modalSubelemento">${opcoesSubelemento}</select>
              </div>
              <div class="form-group">
                <label for="modalItemCompra">Item Compra</label>
                <input type="text" id="modalItemCompra" value="${dados.itemCompra || ''}" placeholder="Nº do item" />
              </div>
            </div>
          </fieldset>

          <!-- Seção: CATMAT com Autocomplete -->
          <fieldset class="modal-section">
            <legend>🏷️ CATMAT</legend>
            <div class="form-group" style="position: relative;">
              <label for="modalCatmatBusca">Buscar Material CATMAT</label>
              <input type="text" id="modalCatmatBusca"
                placeholder="Digite pelo menos 3 caracteres para buscar..."
                autocomplete="off"
                style="width: 100%;" />
              <small style="color: #666; font-size: 12px;">
                Digite para buscar no catálogo. Se não encontrar, clique em "Criar Pedido de Catalogação".
              </small>
            </div>
            <div class="modal-grid modal-grid-3" style="margin-top: 10px;">
              <div class="form-group">
                <label for="modalCatmatCodigo">Código CATMAT</label>
                <input type="text" id="modalCatmatCodigo" value="${dados.catmatCodigo || ''}" placeholder="Preenchido automaticamente" readonly style="background: #f9f9f9;" />
              </div>
              <div class="form-group form-group-span-2">
                <label for="modalCatmatDescricao">Descrição CATMAT</label>
                <input type="text" id="modalCatmatDescricao" value="${dados.catmatDescricao || ''}" placeholder="Preenchido ao selecionar" readonly style="background: #f9f9f9;" />
              </div>
            </div>
            <div class="form-group">
              <label for="modalCatmatFonte">Fonte/Unidade</label>
              <input type="text" id="modalCatmatFonte" value="${dados.catmatFonte || ''}" placeholder="Preenchido automaticamente" readonly style="background: #f9f9f9;" />
            </div>
            <div style="margin-top: 8px;">
              <button type="button" id="btnLimparCatmat" class="btn btn-secondary btn-sm" style="font-size: 12px; padding: 4px 8px;">
                🗑️ Limpar CATMAT
              </button>
            </div>
          </fieldset>

          <!-- Seção: Descrição do Item -->
          <fieldset class="modal-section">
            <legend>📝 Descrição do Item</legend>
            <div class="form-group">
              <label for="modalDescricao">Descrição *</label>
              <textarea id="modalDescricao" rows="2" placeholder="Descrição completa do item">${dados.descricao || ''}</textarea>
            </div>
          </fieldset>

          <!-- Seção: Valores -->
          <fieldset class="modal-section">
            <legend>💰 Quantidades e Valores</legend>
            <div class="modal-grid modal-grid-4">
              <div class="form-group">
                <label for="modalUnidade">Unidade</label>
                <input type="text" id="modalUnidade" value="${dados.unidade || 'UN'}" placeholder="UN" class="input-sm" />
              </div>
              <div class="form-group">
                <label for="modalQuantidade">Quantidade</label>
                <input type="text" id="modalQuantidade" value="${dados.quantidade ?? ''}" placeholder="0" class="input-numero" />
              </div>
              <div class="form-group">
                <label for="modalValorUnitario">Vlr. Unitário</label>
                <input type="text" id="modalValorUnitario" value="${dados.valorUnitario ?? ''}" placeholder="0,00" class="input-numero" />
              </div>
              <div class="form-group">
                <label for="modalValorTotal">Vlr. Total</label>
                <input type="text" id="modalValorTotal" value="${dados.valorTotal ?? ''}" disabled class="input-total" />
              </div>
            </div>
          </fieldset>

          <!-- Seção: Observação -->
          <fieldset class="modal-section">
            <legend>📎 Observação</legend>
            <div class="form-group">
              <textarea id="modalObservacao" rows="2" placeholder="Observações adicionais (opcional)">${dados.observacao || ''}</textarea>
            </div>
          </fieldset>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modalCancelar">Cancelar</button>
          <button type="button" class="btn btn-primary" id="modalSalvar">💾 Salvar Item</button>
        </div>
      </div>
    `;

    const atualizarTotal = () => {
      const qtd = this.parseNumero(document.getElementById('modalQuantidade').value);
      const vlr = this.parseNumero(document.getElementById('modalValorUnitario').value);
      document.getElementById('modalValorTotal').value = window.formatarNumero(qtd * vlr);
    };

    overlay.querySelector('#modalQuantidade').addEventListener('input', atualizarTotal);
    overlay.querySelector('#modalValorUnitario').addEventListener('input', atualizarTotal);

    // ═══════════════════════════════════════════════════════════════
    // INICIALIZAR UX HELPERS (autocomplete, formatação, etc.)
    // ═══════════════════════════════════════════════════════════════
    if (window.UXHelpers) {
      window.UXHelpers.initModalItemUX();
    }

    // ═══════════════════════════════════════════════════════════════
    // INICIALIZAR AUTOCOMPLETE CATMAT
    // ═══════════════════════════════════════════════════════════════
    const catmatBusca = overlay.querySelector('#modalCatmatBusca');
    if (catmatBusca && window.CatmatIntegration) {
      window.CatmatIntegration.initCatmatAutocomplete(catmatBusca, (material) => {
        // Preenche campos com dados do material selecionado
        document.getElementById('modalCatmatCodigo').value = material.catmat_id || material.codigo || '';
        document.getElementById('modalCatmatDescricao').value = material.catmat_padrao_desc || material.descricao || '';
        document.getElementById('modalCatmatFonte').value = material.unidade || 'UN';

        // Se descrição do item estiver vazia, sugere a do CATMAT
        const descricaoItem = document.getElementById('modalDescricao');
        if (!descricaoItem.value.trim()) {
          descricaoItem.value = material.descricao || '';
        }

        // Se unidade estiver como padrão, usa do CATMAT
        const unidadeItem = document.getElementById('modalUnidade');
        if (unidadeItem && unidadeItem.value === 'UN' && material.unidade) {
          unidadeItem.value = material.unidade;
        }

        catmatBusca.value = ''; // Limpa campo de busca
      });
    }

    // Botão Limpar CATMAT
    overlay.querySelector('#btnLimparCatmat')?.addEventListener('click', () => {
      document.getElementById('modalCatmatCodigo').value = '';
      document.getElementById('modalCatmatDescricao').value = '';
      document.getElementById('modalCatmatFonte').value = '';
    });

    // ═══════════════════════════════════════════════════════════════
    // CONTROLE DE "DIRTY" - detectar se formulário foi modificado
    // ═══════════════════════════════════════════════════════════════
    let itemModalDirty = false;

    // Marcar como dirty quando qualquer input mudar
    const marcarDirty = () => {
      itemModalDirty = true;
    };
    overlay.querySelectorAll('input, select, textarea').forEach((el) => {
      el.addEventListener('input', marcarDirty);
      el.addEventListener('change', marcarDirty);
    });

    // ═══════════════════════════════════════════════════════════════
    // FECHAR MODAL - com confirmação se dirty
    // ═══════════════════════════════════════════════════════════════
    const fecharModal = (forceClose = false) => {
      if (!forceClose && itemModalDirty) {
        const confirmar = confirm('⚠️ Você tem alterações não salvas.\n\nDeseja descartar as alterações?');
        if (!confirmar) {
          return; // Não fecha se o usuário cancelar
        }
      }
      document.removeEventListener('keydown', handleEsc);
      overlay.remove();
    };

    // Botões Cancelar e Fechar (X) - pedem confirmação se dirty
    overlay.querySelector('#modalCancelar').addEventListener('click', () => fecharModal(false));
    overlay.querySelector('#modalFechar').addEventListener('click', () => fecharModal(false));

    // ✅ CLIQUE FORA - NÃO fecha o modal (comportamento solicitado)
    // Impedir propagação do clique dentro do modal-card
    overlay.querySelector('.modal-card').addEventListener('click', (e) => {
      e.stopPropagation();
    });
    // Clique no overlay (fora do modal) - não faz nada
    // overlay.addEventListener('click', ...) REMOVIDO

    // Fechar com ESC - pede confirmação se dirty
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        fecharModal(false);
      }
    };
    document.addEventListener('keydown', handleEsc);

    // Foco inicial no primeiro campo
    setTimeout(() => {
      overlay.querySelector('#modalSeq')?.focus();
    }, 100);

    overlay.querySelector('#modalSalvar').addEventListener('click', async () => {
      // ✅ Obter código e nome do subelemento selecionado
      const subelementoSelect = document.getElementById('modalSubelemento');
      const subelementoCodigo = subelementoSelect.value.trim();
      const subelementoNome = subelementoCodigo
        ? NaturezaSubelementos.getSubelementoNome(this.empenhoDraft.header.naturezaDespesa, subelementoCodigo)
        : '';

      // Obter valores dos campos
      let descricao = document.getElementById('modalDescricao').value.trim();
      let unidade = document.getElementById('modalUnidade').value.trim() || 'UN';
      let itemCompra = document.getElementById('modalItemCompra').value.trim();

      // ✅ APLICAR UX HELPERS: normalização e validação
      if (window.UXHelpers) {
        // Normalizar descrição para MAIÚSCULA
        descricao = window.UXHelpers.normUpper(descricao);

        // Validar unidade (não pode ser apenas numérica)
        const validacaoUnidade = window.UXHelpers.validarUnidade(unidade);
        if (!validacaoUnidade.ok) {
          this.showToast('⚠️ ' + validacaoUnidade.msg, 'warning');
          return;
        }
        unidade = validacaoUnidade.val;

        // Formatar itemCompra com 3 dígitos fixos (000-999)
        itemCompra = window.UXHelpers.formatItemCompra3Digitos(itemCompra);
      }

      const novo = {
        seq: Number(document.getElementById('modalSeq').value) || this.empenhoDraft.itens.length + 1,
        subelementoCodigo,
        subelementoNome,
        itemCompra,
        descricao,
        unidade,
        quantidade: this.parseNumero(document.getElementById('modalQuantidade').value),
        valorUnitario: this.parseNumero(document.getElementById('modalValorUnitario').value),
        valorTotal: this.parseNumero(document.getElementById('modalValorTotal').value),
        observacao: document.getElementById('modalObservacao').value.trim(),
        catmatCodigo: document.getElementById('modalCatmatCodigo').value.trim(),
        catmatDescricao: document.getElementById('modalCatmatDescricao').value.trim(),
        catmatFonte: document.getElementById('modalCatmatFonte').value.trim()
      };

      // ✅ Validação: Subelemento é obrigatório
      if (!novo.subelementoCodigo) {
        this.showToast('⚠️ Subelemento é obrigatório', 'warning');
        return;
      }

      if (!novo.descricao) {
        this.showToast('⚠️ Descrição é obrigatória', 'warning');
        return;
      }

      if (index !== null) {
        this.empenhoDraft.itens[index] = novo;
      } else {
        this.empenhoDraft.itens.push(novo);
      }

      // ✅ SALVAR SUGESTÕES (descrição e unidade) para autocomplete futuro
      if (window.UXHelpers) {
        window.UXHelpers.salvarSugestoesAposSalvarItem(novo);
      }

      this.reindexarSequenciaEmpenho();
      this.renderItensEmpenho();
      overlay.remove();
    });

    document.body.appendChild(overlay);

    // Focar no campo descrição
    setTimeout(() => {
      document.getElementById('modalDescricao')?.focus();
    }, 100);
  }
  /* eslint-enable complexity */

  /**
   * Helpers de moeda PT-BR para NF
   */
  parseMoneyInputBR(value) {
    let s = String(value ?? '').trim();
    if (!s) {
      return 0;
    }

    // Remove espaços e "R$"
    s = s.replace(/\s+/g, '').replace(/^R\$/i, '');

    // Se tiver vírgula, assumir vírgula como decimal e remover separador de milhar
    // Ex: "28.167,50" -> "28167.50"
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  money2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  fmtMoneyBR(n) {
    return this.money2(n).toFixed(2).replace('.', ',');
  }

  /**
   * Calcula a soma dos itens da NF e atualiza campos relacionados
   * - somaItensNF: soma automática dos itens (readonly)
   * - valorTotalNF: valor manual digitado pelo usuário (editável)
   * - nfDiferenca: (soma - total) para validação
   * - Barra sticky de totais (nfTotalsBar)
   */
  calcularValorTotalNotaFiscal() {
    const container = document.getElementById('itensNotaFiscal');
    if (!container) {
      return;
    }

    // 1) Calcula soma dos itens (suporta tanto TR quanto DIV)
    let somaItens = 0;
    // Primeiro tenta TR (tabela ERP), depois DIV (legado)
    let rows = container.querySelectorAll('tr.nf-row');
    if (rows.length === 0) {
      rows = container.querySelectorAll('.item-row');
    }
    rows.forEach((row) => {
      const valorTotalStr = row.querySelector('[data-field="valorTotal"]')?.value || '0';
      const valorTotal = window.converterMoedaParaNumero(valorTotalStr);
      somaItens += valorTotal;
    });
    somaItens = this.money2(somaItens);

    // 2) Atualiza campo de soma (readonly) - campo antigo
    const somaInput = document.getElementById('somaItensNF');
    if (somaInput) {
      somaInput.value = window.formatarNumero(somaItens);
    }

    // 3) Lê valor total manual
    const valorTotalInput = document.getElementById('valorTotalNF');
    const totalNFManual = this.money2(this.parseMoneyInputBR(valorTotalInput?.value));

    // 4) Calcula diferença (soma - total)
    const diferenca = this.money2(somaItens - totalNFManual);

    // 5) Atualiza campo de diferença - campo antigo
    const difInput = document.getElementById('nfDiferenca');
    if (difInput) {
      difInput.value = window.formatarNumero(diferenca);
      // Estilo visual: vermelho se divergente
      if (Math.abs(diferenca) > 0.05) {
        difInput.style.color = '#dc3545';
        difInput.style.fontWeight = 'bold';
      } else {
        difInput.style.color = '#28a745';
        difInput.style.fontWeight = 'bold';
      }
    }

    // 6) Atualiza barra sticky de totais (nova UI ERP)
    const nfSomaLabel = document.getElementById('nfSomaItensLabel');
    const nfTotalManualLabel = document.getElementById('nfTotalManualLabel');
    const nfDiferencaLabel = document.getElementById('nfDiferencaLabel');
    const nfBadge = document.getElementById('nfConciliacaoBadge');

    if (nfSomaLabel) {
      nfSomaLabel.textContent = window.formatarNumero(somaItens);
    }
    if (nfTotalManualLabel) {
      nfTotalManualLabel.textContent = window.formatarNumero(totalNFManual);
    }
    if (nfDiferencaLabel) {
      nfDiferencaLabel.textContent = window.formatarNumero(diferenca);
    }

    if (nfBadge) {
      const diffAbs = Math.abs(diferenca);
      nfBadge.classList.remove('ok', 'warn', 'bad');
      if (diffAbs <= 0.05) {
        nfBadge.textContent = 'OK';
        nfBadge.classList.add('ok');
      } else if (diffAbs <= 1.0) {
        nfBadge.textContent = 'ATENÇÃO';
        nfBadge.classList.add('warn');
      } else {
        nfBadge.textContent = 'DIVERGENTE';
        nfBadge.classList.add('bad');
      }
    }

    // 7) Atualiza status de validação (campo antigo)
    const divergenciaElement = document.getElementById('divergenciaValor');
    if (divergenciaElement) {
      if (totalNFManual > 0 && somaItens > 0) {
        if (Math.abs(diferenca) <= 0.05) {
          divergenciaElement.textContent = '✅ Valores conferem!';
          divergenciaElement.style.color = '#28a745';
        } else {
          const percentual = totalNFManual > 0 ? Math.abs((diferenca / totalNFManual) * 100) : 0;
          divergenciaElement.textContent = `⚠️ Divergência: ${window.formatarNumero(Math.abs(diferenca))} (${percentual.toFixed(2)}%)`;
          divergenciaElement.style.color = '#dc3545';
        }
        divergenciaElement.style.display = 'block';
      } else if (totalNFManual <= 0 && somaItens > 0) {
        divergenciaElement.textContent = '⚠️ Informe o Valor Total da NF';
        divergenciaElement.style.color = '#ffc107';
        divergenciaElement.style.display = 'block';
      } else {
        divergenciaElement.style.display = 'none';
      }
    }
  }

  /**
   * Adiciona itens extraídos do PDF
   */
  adicionarItensExtraidos(containerId, itens) {
    if (!itens || itens.length === 0) {
      console.log('Nenhum item para adicionar');
      return;
    }

    // Helper para setar valor de forma segura (evita erro se elemento não existir)
    const setValueSafe = (el, value, label = '') => {
      if (!el) {
        console.warn('[XML Import] Campo não encontrado:', label);
        return false;
      }
      el.value = value ?? '';
      return true;
    };

    if (containerId === 'itensNotaFiscal') {
      // Mantém fluxo original para NF
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('[XML Import] Container itensNotaFiscal não encontrado');
        return;
      }
      container.innerHTML = '';
      itens.forEach((item, index) => {
        console.log(`Adicionando item NF ${index + 1}:`, item);
        const itemRow = this.criarItemRow('notaFiscal');

        // Preenche campos de forma segura (codigo não existe no template atual, então ignora)
        // setValueSafe(itemRow.querySelector('[data-field="codigo"]'), item.codigo || '', 'codigo');
        setValueSafe(
          itemRow.querySelector('[data-field="descricao"]'),
          item.descricao || item.descricao_resumida || '',
          'descricao'
        );
        setValueSafe(itemRow.querySelector('[data-field="unidade"]'), item.unidade || 'UN', 'unidade');
        setValueSafe(
          itemRow.querySelector('[data-field="quantidade"]'),
          window.formatarNumero(item.quantidade || 0),
          'quantidade'
        );
        setValueSafe(
          itemRow.querySelector('[data-field="valorUnitario"]'),
          window.formatarNumero(item.valorUnitario || 0),
          'valorUnitario'
        );
        const valorTotal = item.valorTotal || item.quantidade * item.valorUnitario;
        setValueSafe(
          itemRow.querySelector('[data-field="valorTotal"]'),
          window.formatarNumero(valorTotal || 0),
          'valorTotal'
        );

        container.appendChild(itemRow);
      });
      this.calcularSomaItensNF();
      return;
    }

    // Para empenho, joga para o draft e re-renderiza
    itens.forEach((item) => {
      this.empenhoDraft.itens.push({
        seq: this.empenhoDraft.itens.length + 1,
        descricao: item.descricao || item.descricao_resumida || '',
        unidade: item.unidade || 'UN',
        quantidade: item.quantidade || 0,
        valorUnitario: item.valorUnitario || 0,
        valorTotal: item.valorTotal || item.quantidade * item.valorUnitario || 0,
        subelemento: item.subelemento || '',
        itemCompra: item.itemCompra || '',
        catmatCodigo: item.catmatCodigo || '',
        catmatDescricao: item.catmatDescricao || '',
        catmatFonte: item.catmatFonte || null,
        observacao: item.observacao || ''
      });
    });

    this.renderItensEmpenho();
    console.log(`${itens.length} itens adicionados com sucesso`);
  }

  /**
   * Coleta dados dos itens de um container
   */
  coletarItens(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[coletarItens] Container não encontrado:', containerId);
      return [];
    }
    const itens = [];

    // Suporta tanto TR (tabela NF) quanto DIV (empenho legado)
    let rows = container.querySelectorAll('tr.nf-row');
    if (rows.length === 0) {
      rows = container.querySelectorAll('.item-row');
    }

    rows.forEach((row) => {
      const item = {
        codigo: row.querySelector('[data-field="codigo"]')?.value || '',
        descricao: row.querySelector('[data-field="descricao"]')?.value || '',
        unidade: row.querySelector('[data-field="unidade"]')?.value || 'UN',
        quantidade: window.converterMoedaParaNumero(row.querySelector('[data-field="quantidade"]')?.value) || 0,
        valorUnitario: window.converterMoedaParaNumero(row.querySelector('[data-field="valorUnitario"]')?.value) || 0,
        subelemento: row.querySelector('[data-field="subelemento"]')?.value || '',
        itemCompra: row.querySelector('[data-field="itemCompra"]')?.value || ''
      };
      item.valorTotal = this.money2(item.quantidade * item.valorUnitario);

      // Aceita item se tiver descrição (codigo pode não existir no template)
      if (item.descricao) {
        itens.push(item);
      }
    });

    return itens;
  }

  /**
   * Coleta dados dos itens recebidos na entrega
   */
  coletarItensRecebidos(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[coletarItensRecebidos] Container não encontrado:', containerId);
      return [];
    }
    const itens = [];

    container.querySelectorAll('.item-row').forEach((row) => {
      const quantidadeRecebida = parseFloat(row.querySelector('[data-field="quantidadeRecebida"]')?.value) || 0;

      if (quantidadeRecebida > 0) {
        const item = {
          codigo: row.querySelector('[data-field="codigo"]')?.textContent || '',
          descricao: row.querySelector('[data-field="descricao"]')?.textContent || '',
          unidade: row.querySelector('[data-field="unidade"]')?.textContent || 'UN',
          valorUnitario: parseFloat(row.querySelector('[data-field="valorUnitario"]')?.textContent) || 0,
          quantidade: quantidadeRecebida
        };
        itens.push(item);
      }
    });

    return itens;
  }

  /**
   * Carrega itens de um empenho na tela de entrega
   */
  async carregarItensEmpenho(empenhoId) {
    try {
      const empenho = await window.dbManager.buscarEmpenhoPorId(empenhoId);
      if (!empenho) {
        return;
      }

      const container = document.getElementById('itensEntrega');
      container.innerHTML = '';

      empenho.itens.forEach((item) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.innerHTML = `
                    <div data-field="codigo">${item.codigo}</div>
                    <div data-field="descricao">${item.descricao}</div>
                    <div data-field="unidade">${item.unidade}</div>
                    <div data-field="valorUnitario">${item.valorUnitario}</div>
                    <input type="number" placeholder="Qtd. Recebida" data-field="quantidadeRecebida" step="0.01" max="${item.quantidade}">
                `;
        container.appendChild(itemRow);
      });
    } catch (error) {
      console.error('Erro ao carregar itens do empenho:', error);
    }
  }

  /**
   * Calcula valor total dos itens
   */
  calcularValorTotalItens(itens) {
    return itens.reduce((total, item) => {
      return total + item.quantidade * item.valorUnitario;
    }, 0);
  }

  /**
   * Formata CNPJ durante digitação (event handler)
   */
  formatarCNPJInput(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    e.target.value = value;
  }

  /**
   * Converte arquivo para Base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Limpa formulário
   */
  limparFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();

      // Limpa containers de itens
      const containers = form.querySelectorAll('.items-list');
      containers.forEach((container) => {
        container.innerHTML = '';
      });

      // Remove botão de editar (modo visualização)
      const btnEditarEmpenho = document.getElementById('btnHabilitarEdicao');
      if (btnEditarEmpenho) {
        btnEditarEmpenho.remove();
      }

      // Habilita todos os campos (caso estivesse em modo visualização)
      const campos = form.querySelectorAll('input, select, textarea');
      campos.forEach((campo) => {
        campo.disabled = false;
        campo.classList.remove('campo-visualizacao');
      });

      // Mostra botões ocultos
      const botoesOcultos = form.querySelectorAll('.btn-acao, #btnAddItem, #btnValidarEmpenho, button[type="submit"]');
      botoesOcultos.forEach((btn) => {
        btn.style.display = '';
      });

      const btnAnexarPdf = document.getElementById('btnAnexarPdfNE');
      if (btnAnexarPdf) {
        btnAnexarPdf.style.display = '';
      }
    }

    // Resetar status do PDF anexado
    if (window.AnexarPdfNE?.resetarStatusAnexoUI) {
      window.AnexarPdfNE.resetarStatusAnexoUI();
    }
  }

  /**
   * Reseta o draft de empenho para estado inicial
   */
  _resetarDraftEmpenho() {
    this.empenhoDraft = {
      header: {
        id: null,
        ano: null,
        numero: null,
        dataEmissaoISO: null,
        naturezaDespesa: null,
        processoSuap: '',
        valorTotalEmpenho: 0,
        fornecedorRazao: null,
        cnpjDigits: '',
        telefoneDigits: '',
        emailFornecedor: '',
        statusValidacao: 'rascunho',
        validadoEm: null,
        validadoPor: null
      },
      itens: []
    };
    this.itemCounter = 0;
    console.log('[APP] 🧹 Draft de empenho resetado');
  }

  /**
   * Gerar relatório
   */
  async gerarRelatorio(tipo) {
    try {
      this.showLoading('Gerando relatório...');

      let dados = null;
      let titulo = '';

      switch (tipo) {
        case 'conferencia':
          titulo = 'Relatório de Conferência';
          // TODO: Implementar lógica específica
          break;

        case 'saldos':
          titulo = 'Controle de Saldos de Empenhos';
          await this.exibirControleSaldos();
          return; // Usa visualização customizada

        case 'empenhos':
          titulo = 'Relatório de Empenhos';
          // buscarEmpenhos() agora já retorna apenas empenhos ativos
          dados = await window.dbManager.buscarEmpenhos();
          break;

        case 'entregas':
          titulo = 'Relatório de Entregas';
          dados = await window.dbManager.buscarEntregas();
          break;

        case 'divergencias':
          titulo = 'Relatório de Divergências';
          // TODO: Implementar lógica específica
          break;
      }

      this.exibirRelatorio(titulo, dados);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      this.showError('Erro ao gerar relatório: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Exibe o controle de saldos de empenhos (formato planilha)
   */
  async exibirControleSaldos() {
    try {
      const reportContent = document.getElementById('reportContent');
      const reportTitle = document.getElementById('reportTitle');
      const reportData = document.getElementById('reportData');

      reportTitle.textContent = '📊 Controle de Saldos de Empenhos';
      reportContent.classList.remove('hidden');

      // Buscar empenhos COM arquivo válido
      const empenhos = await window.dbManager.buscarEmpenhos();

      // Buscar TODOS (incluindo sem arquivo) para estatística
      const empenhosCompletos = await window.dbManager.buscarEmpenhos(true);

      console.log(
        `📊 Controle de Saldos: ${empenhosCompletos.length} empenhos no total, ${empenhos.length} com arquivo válido`
      );

      if (empenhosCompletos.length > empenhos.length) {
        console.warn(`⚠️ ${empenhosCompletos.length - empenhos.length} empenho(s) sem arquivo ou deletado(s)`);
      }

      if (!empenhos || empenhos.length === 0) {
        reportData.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <p style="font-size: 18px; color: #666;">📭 Nenhum empenho com arquivo válido.</p>
            <p>Cadastre empenhos e salve os arquivos PDF para visualizar o controle de saldos.</p>
            ${
              empenhosCompletos.length > 0
                ? `
              <p style="margin-top: 20px; color: #999; font-size: 14px;">
                <em>Existem ${empenhosCompletos.length} empenho(s) no banco sem arquivo vinculado ou com arquivo deletado.<br>
                Execute a sincronização ou limpe registros órfãos em Configurações.</em>
              </p>
            `
                : ''
            }
          </div>
        `;
        return;
      }

      // Criar seletor de empenhos
      const html = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 300px;">
              <label style="font-weight: bold; margin-right: 10px; display: block; margin-bottom: 5px;">Selecione o Empenho:</label>
              <select id="saldoEmpenhoSelect" style="width: 100%; padding: 8px; font-size: 14px; border-radius: 4px; border: 1px solid #ccc;">
                <option value="">-- Selecione um empenho --</option>
                ${empenhos
                  .map(
                    (emp) => `
                  <option value="${emp.id}">
                    NE ${emp.numero} - ${emp.fornecedor} - ${FormatUtils.formatCurrencyBR(emp.valorTotalEmpenho ?? emp.valorTotal ?? 0)}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>
            <button
              onclick="window.app.exibirControleSaldos()"
              style="padding: 10px 20px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; white-space: nowrap;"
              title="Recarregar lista de empenhos">
              🔄 Atualizar Lista
            </button>
          </div>
          <p style="margin-top: 10px; font-size: 12px; color: #666;">
            💡 Se algum empenho ainda aparece após deletar o arquivo, clique em "Atualizar Lista" ou execute a sincronização em Configurações.
          </p>
        </div>
        <div id="saldoDetalhes" style="margin-top: 20px;"></div>
      `;

      reportData.innerHTML = html;

      // Adicionar evento ao select
      document.getElementById('saldoEmpenhoSelect').addEventListener('change', async (e) => {
        const empenhoId = parseInt(e.target.value);
        if (empenhoId) {
          await this.carregarSaldoEmpenho(empenhoId);
        } else {
          document.getElementById('saldoDetalhes').innerHTML = '';
        }
      });
    } catch (error) {
      console.error('Erro ao exibir controle de saldos:', error);
      this.showError('Erro ao carregar controle de saldos: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Carrega e exibe o saldo detalhado de um empenho específico
   */
  async carregarSaldoEmpenho(empenhoId, container = null) {
    try {
      // Usar container fornecido ou o padrão
      const saldoDetalhes =
        container || document.getElementById('saldoDetalhes') || document.getElementById('saldoDetalhesTab');
      if (!saldoDetalhes) {
        return;
      }

      saldoDetalhes.innerHTML = '<p style="text-align: center;">⏳ Carregando saldo...</p>';

      // Primeiro, verificar se o empenho existe e não foi deletado
      const empenho = await window.dbManager.buscarEmpenhoPorId(empenhoId);

      if (!empenho) {
        saldoDetalhes.innerHTML = `
          <div style="text-align: center; padding: 20px; background: #fed7d7; border-radius: 8px;">
            <p style="color: #742a2a;">❌ Empenho não encontrado no banco de dados.</p>
          </div>
        `;
        return;
      }

      // Verificar se o arquivo foi deletado
      if (empenho.arquivoDeletado) {
        saldoDetalhes.innerHTML = `
          <div style="text-align: center; padding: 20px; background: #fff5e6; border: 2px solid #ff9800; border-radius: 8px;">
            <h3 style="color: #e65100; margin-top: 0;">⚠️ Arquivo Deletado Externamente</h3>
            <p style="color: #666;">
              O arquivo PDF deste empenho foi deletado em:<br>
              <strong>${new Date(empenho.arquivoDeletadoEm).toLocaleString('pt-BR')}</strong>
            </p>
            <p style="color: #666;">
              O registro ainda existe no banco de dados, mas o arquivo físico não está mais disponível.
            </p>
            <div style="margin-top: 20px;">
              <button
                class="btn btn-danger"
                onclick="if(confirm('Deseja excluir permanentemente este registro do banco de dados?')) { window.app.excluirDocumento(${empenhoId}, 'empenho').then(() => window.app.gerarRelatorio('saldos')); }"
                style="margin-right: 10px;"
              >
                🗑️ Excluir Registro
              </button>
              <button
                class="btn btn-secondary"
                onclick="document.getElementById('saldoDetalhes').innerHTML = '';"
              >
                ← Voltar
              </button>
            </div>
          </div>
        `;
        return;
      }

      let saldo = await window.dbManager.buscarSaldoEmpenho(empenhoId);

      // Se não existe controle de saldo, criar automaticamente
      if (!saldo) {
        console.log('⚠️ Saldo não encontrado. Criando controle automaticamente...');

        // Criar saldos para este empenho
        try {
          await window.dbManager.criarSaldosEmpenho(empenhoId, empenho);
          console.log('✅ Controle de saldo criado com sucesso!');

          // Buscar novamente após criar
          saldo = await window.dbManager.buscarSaldoEmpenho(empenhoId);
        } catch (error) {
          console.error('Erro ao criar saldos:', error);
          saldoDetalhes.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #fed7d7; border-radius: 8px;">
              <p style="color: #742a2a;">❌ Erro ao criar controle de saldo: ${error.message}</p>
            </div>
          `;
          return;
        }
      }

      // Cabeçalho com informações do empenho
      let html = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">📋 Empenho Nº ${saldo.numeroEmpenho}</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 14px;">
            <div>
              <strong>Fornecedor:</strong><br>${saldo.fornecedor}
            </div>
            <div>
              <strong>Data:</strong><br>${new Date(saldo.dataEmpenho).toLocaleDateString('pt-BR')}
            </div>
            <div>
              <strong>Status:</strong><br>
              <span style="background: ${this.getStatusColor(saldo.statusGeral)}; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
                ${this.getStatusLabel(saldo.statusGeral)}
              </span>
            </div>
          </div>
        </div>
      `;

      // Coletar todas as NFs únicas com suas datas
      const nfsMap = new Map();
      saldo.itens.forEach((item) => {
        item.entradas.forEach((entrada) => {
          if (!nfsMap.has(entrada.notaFiscal)) {
            nfsMap.set(entrada.notaFiscal, entrada.data);
          }
        });
      });

      // Converter para array e ordenar
      const nfsOrdenadas = Array.from(nfsMap.keys()).sort();

      // Se não há entradas ainda, criar pelo menos 2 colunas vazias
      const numColunasEntrada = Math.max(nfsOrdenadas.length, 2);
      const colunasVazias = numColunasEntrada - nfsOrdenadas.length;

      // Tabela estilo planilha
      html += `
        <div style="overflow-x: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <table style="width: 100%; border-collapse: collapse; background: white; font-size: 13px;">
            <thead>
              <tr style="background: linear-gradient(to bottom, #4a5568 0%, #2d3748 100%); color: white;">
                <th style="padding: 12px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">Seq</th>
                <th style="padding: 12px 8px; text-align: left; border-right: 1px solid rgba(255,255,255,0.1); min-width: 250px;">Produto</th>
                <th style="padding: 12px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">UN</th>
                <th style="padding: 12px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.1);">Qtd Emp.</th>
                <th style="padding: 12px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.1);">Vlr. Unit.</th>
                <th style="padding: 12px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.1);">Vlr. Total</th>
      `;

      // Cabeçalhos dinâmicos para cada NF
      nfsOrdenadas.forEach((nf) => {
        const dataNF = new Date(nfsMap.get(nf)).toLocaleDateString('pt-BR');
        html += `
                <th style="padding: 12px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1); min-width: 130px; background: rgba(56, 178, 172, 0.2);">
                  <div style="font-size: 11px; opacity: 0.8;">Entrada</div>
                  <div style="font-weight: bold;">NF ${nf}</div>
                  <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">${dataNF}</div>
                </th>
        `;
      });

      // Colunas vazias para futuras entradas
      for (let i = 0; i < colunasVazias; i++) {
        html += `
                <th style="padding: 12px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1); min-width: 120px; background: rgba(160, 174, 192, 0.1);">
                  <div style="font-size: 11px; opacity: 0.6;">Entrada</div>
                  <div style="font-weight: bold; opacity: 0.5;">--</div>
                </th>
        `;
      }

      html += `
                <th style="padding: 12px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.1);">Saldo Qtd</th>
                <th style="padding: 12px 8px; text-align: right;">Saldo Valor</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Linhas de itens
      saldo.itens.forEach((item, index) => {
        // Calcular percentual de saldo restante
        const percentualSaldo = (item.saldoQuantidade / item.quantidadeEmpenhada) * 100;

        // Definir cor da linha baseado no saldo
        let corLinha = '';
        let corTexto = '#2d3748';

        if (percentualSaldo === 0) {
          // Saldo zerado = verde
          corLinha = 'background: linear-gradient(to right, rgba(72, 187, 120, 0.15), rgba(72, 187, 120, 0.05));';
          corTexto = '#2d5016';
        } else if (percentualSaldo < 20) {
          // Saldo crítico (< 20%) = amarelo
          corLinha = 'background: linear-gradient(to right, rgba(237, 137, 54, 0.2), rgba(237, 137, 54, 0.08));';
          corTexto = '#744210';
        } else {
          // Saldo normal = vermelho claro
          corLinha = 'background: linear-gradient(to right, rgba(229, 62, 62, 0.12), rgba(229, 62, 62, 0.04));';
          corTexto = '#742a2a';
        }

        // Se for linha par, aplicar fundo zebrado leve
        if (index % 2 === 0) {
          corLinha = corLinha.replace('0.15', '0.18').replace('0.2', '0.23').replace('0.12', '0.15');
        }

        html += `
          <tr style="${corLinha}">
            <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${corTexto};">${item.itemSequencia}</td>
            <td style="padding: 10px 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">
              <div style="font-weight: 500; color: ${corTexto};">${item.descricaoItem}</div>
              ${item.codigoItem ? `<div style="font-size: 11px; color: #718096;">Cód: ${item.codigoItem}</div>` : ''}
            </td>
            <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: ${corTexto};">${item.unidade}</td>
            <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: ${corTexto};">${item.quantidadeEmpenhada.toFixed(2)}</td>
            <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; color: ${corTexto};">R$ ${item.valorUnitario.toFixed(2)}</td>
            <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${corTexto};">R$ ${item.valorTotalItem.toFixed(2)}</td>
        `;

        // Células de entrada para cada NF
        nfsOrdenadas.forEach((nf) => {
          const entrada = item.entradas.find((e) => e.notaFiscal === nf);
          if (entrada) {
            html += `
            <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; background: rgba(56, 178, 172, 0.08);">
              <div style="font-weight: bold; color: #2c7a7b; font-size: 15px;">${entrada.quantidade.toFixed(2)}</div>
            </td>
            `;
          } else {
            html += `
            <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #cbd5e0; font-size: 18px;">-</span>
            </td>
            `;
          }
        });

        // Células vazias para futuras entradas
        for (let i = 0; i < colunasVazias; i++) {
          html += `
            <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; background: rgba(247, 250, 252, 0.5);">
              <span style="color: #e2e8f0; font-size: 18px;">-</span>
            </td>
          `;
        }

        html += `
            <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 14px; color: ${percentualSaldo === 0 ? '#38a169' : percentualSaldo < 20 ? '#d69e2e' : '#e53e3e'};">
              ${item.saldoQuantidade.toFixed(2)}
            </td>
            <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 14px; color: ${percentualSaldo === 0 ? '#38a169' : percentualSaldo < 20 ? '#d69e2e' : '#e53e3e'};">
              R$ ${item.saldoValor.toFixed(2)}
            </td>
          </tr>
        `;
      });

      html += `
            </tbody>
            <tfoot>
              <tr style="background: linear-gradient(to bottom, #2d3748 0%, #1a202c 100%); color: white; font-weight: bold;">
                <td colspan="5" style="padding: 15px 8px; text-align: right; font-size: 14px;">
                  TOTAIS:
                </td>
                <td style="padding: 15px 8px; text-align: right; font-size: 14px;">
                  R$ ${saldo.resumo.valorTotalEmpenhado.toFixed(2)}
                </td>
                <td colspan="${numColunasEntrada}" style="padding: 15px 8px; text-align: center; font-size: 12px; color: #a0aec0;">
                  Recebido: R$ ${saldo.resumo.valorRecebido.toFixed(2)}
                </td>
                <td colspan="2" style="padding: 15px 8px; text-align: right; font-size: 16px; color: ${saldo.resumo.saldoValorTotal > 0 ? '#fc8181' : '#68d391'};">
                  R$ ${saldo.resumo.saldoValorTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;

      // Resumo visual
      const percentualRecebido = ((saldo.resumo.valorRecebido / saldo.resumo.valorTotalEmpenhado) * 100).toFixed(1);
      html += `
        <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h4 style="margin: 0 0 15px 0; color: #2d3748;">📈 Resumo do Recebimento</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div style="padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; opacity: 0.9;">Valor Empenhado</div>
              <div style="font-size: 24px; font-weight: bold; margin-top: 5px;">R$ ${saldo.resumo.valorTotalEmpenhado.toFixed(2)}</div>
            </div>
            <div style="padding: 15px; background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; opacity: 0.9;">Valor Recebido</div>
              <div style="font-size: 24px; font-weight: bold; margin-top: 5px;">R$ ${saldo.resumo.valorRecebido.toFixed(2)}</div>
              <div style="font-size: 11px; margin-top: 5px; opacity: 0.9;">(${percentualRecebido}%)</div>
            </div>
            <div style="padding: 15px; background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%); color: white; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; opacity: 0.9;">Saldo a Receber</div>
              <div style="font-size: 24px; font-weight: bold; margin-top: 5px;">R$ ${saldo.resumo.saldoValorTotal.toFixed(2)}</div>
            </div>
          </div>

          <!-- Barra de progresso -->
          <div style="margin-top: 15px;">
            <div style="background: #e2e8f0; height: 30px; border-radius: 15px; overflow: hidden; position: relative;">
              <div style="background: linear-gradient(90deg, #48bb78 0%, #38a169 100%); height: 100%; width: ${percentualRecebido}%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                ${percentualRecebido > 15 ? percentualRecebido + '%' : ''}
              </div>
              ${percentualRecebido <= 15 ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; color: #4a5568;">${percentualRecebido}%</div>` : ''}
            </div>
          </div>
        </div>
      `;

      saldoDetalhes.innerHTML = html;
    } catch (error) {
      console.error('Erro ao carregar saldo do empenho:', error);
      document.getElementById('saldoDetalhes').innerHTML = `
        <div style="padding: 20px; background: #fed7d7; border-radius: 8px; color: #742a2a;">
          <strong>❌ Erro ao carregar saldo:</strong> ${error.message}
        </div>
      `;
    }
  }

  /**
   * Retorna cor do status
   */
  getStatusColor(status) {
    const cores = {
      pendente: 'rgba(237, 137, 54, 0.9)',
      parcial: 'rgba(66, 153, 225, 0.9)',
      completo: 'rgba(72, 187, 120, 0.9)'
    };
    return cores[status] || 'rgba(160, 174, 192, 0.9)';
  }

  /**
   * Retorna label traduzida do status
   */
  getStatusLabel(status) {
    const labels = {
      pendente: '⏳ Pendente',
      parcial: '🔄 Parcial',
      completo: '✅ Completo'
    };
    return labels[status] || status;
  }

  /**
   * Retorna cor do status do saldo do item
   */
  getSaldoStatusColor(status) {
    const cores = {
      pendente: '#ed8936',
      parcial: '#4299e1',
      completo: '#48bb78'
    };
    return cores[status] || '#a0aec0';
  }

  /**
   * Exibe relatório na tela
   */
  exibirRelatorio(titulo, dados) {
    const reportContent = document.getElementById('reportContent');
    const reportTitle = document.getElementById('reportTitle');
    const reportData = document.getElementById('reportData');

    reportTitle.textContent = titulo;
    reportContent.classList.remove('hidden');

    // Gera conteúdo do relatório (implementação básica)
    if (dados && Array.isArray(dados)) {
      let html = `<p>Total de registros: ${dados.length}</p>`;
      html += '<table class="table"><thead><tr>';

      if (dados.length > 0) {
        Object.keys(dados[0]).forEach((key) => {
          if (!key.includes('pdf') && !key.includes('Data')) {
            html += `<th>${key}</th>`;
          }
        });
      }

      html += '</tr></thead><tbody>';

      dados.forEach((item) => {
        html += '<tr>';
        Object.entries(item).forEach(([key, value]) => {
          if (!key.includes('pdf') && !key.includes('Data')) {
            html += `<td>${value}</td>`;
          }
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
      reportData.innerHTML = html;
    } else {
      reportData.innerHTML = '<p>Nenhum dado encontrado.</p>';
    }
  }

  /**
   * Exportar relatório em PDF
   */
  exportarRelatorioPDF() {
    // TODO: Implementar exportação em PDF
    this.showWarning('Funcionalidade de exportação em PDF será implementada em breve');
  }

  /**
   * Exportar relatório em CSV
   */
  exportarRelatorioCSV() {
    // TODO: Implementar exportação em CSV
    this.showWarning('Funcionalidade de exportação em CSV será implementada em breve');
  }

  /**
   * Aplicar filtros no relatório
   */
  aplicarFiltrosRelatorio() {
    // TODO: Implementar filtros de relatório
    console.log('Aplicando filtros de relatório...');
  }

  /**
   * Mostra estatísticas de arquivos
   */
  async mostrarEstatisticasArquivos() {
    try {
      this.showLoading('Coletando estatísticas...');

      const statsDisplay = document.getElementById('fileStatsDisplay');

      // Remover verificação de pastas - será tratado em outro local
      statsDisplay.innerHTML = `
        <div class="file-stats">
          <h4>📊 Estatísticas de Arquivos</h4>
          <p>Esta funcionalidade será implementada em breve.</p>
          <p class="text-muted">As estatísticas de uso de arquivos estarão disponíveis em uma próxima versão.</p>
        </div>
      `;
      statsDisplay.classList.remove('hidden');
    } catch (error) {
      console.error('Erro ao mostrar estatísticas:', error);
      this.showError('Erro ao mostrar estatísticas: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Atualiza estatísticas de arquivos se estiver visível
   */
  async atualizarEstatisticasArquivos() {
    const statsDisplay = document.getElementById('fileStatsDisplay');
    if (statsDisplay && !statsDisplay.classList.contains('hidden')) {
      await this.mostrarEstatisticasArquivos();
    }
  }

  /**
   * Exibe preview dos dados extraídos da NF antes de transferir para formulário
   */
  exibirPreviewNotaFiscal(extractedData) {
    const previewContainer = document.getElementById('previewDadosNF');
    const alerta = document.getElementById('alertaDivergencia');

    if (!previewContainer) {
      return;
    }

    // Carrega empenhos no select para associação
    this.carregarEmpenhosSelect().catch((err) =>
      console.error('[exibirPreviewNotaFiscal] Erro ao carregar empenhos:', err)
    );

    // Calcula soma dos itens (usando valorTotal de cada item)
    const somaItens = (extractedData.itens || []).reduce((sum, item) => {
      const valor = parseFloat(item.valorTotal) || 0;
      return sum + valor;
    }, 0);

    // Arredonda para 2 casas decimais
    const somaItensArredondado = Math.round(somaItens * 100) / 100;
    const valorTotal = parseFloat(extractedData.valorTotal) || 0;
    const valorTotalArredondado = Math.round(valorTotal * 100) / 100;
    const diferenca = Math.abs(valorTotalArredondado - somaItensArredondado);
    const percentualDif = valorTotalArredondado > 0 ? (diferenca / valorTotalArredondado) * 100 : 0;

    // Exibe alerta se houver divergência (tolerância de R$ 0,05 ou 0.5%)
    if (diferenca > 0.05 && percentualDif > 0.5) {
      alerta.className = 'alert alert-warning';
      alerta.innerHTML = `
        ⚠️ <strong>Divergência de Valores</strong><br>
        Valor total NF: <strong>${this.formatarMoeda(valorTotalArredondado)}</strong><br>
        Soma dos itens: <strong>${this.formatarMoeda(somaItensArredondado)}</strong><br>
        Diferença: <strong>${this.formatarMoeda(diferenca)}</strong> (${percentualDif.toFixed(2)}%)
      `;
      alerta.classList.remove('hidden');
    } else {
      alerta.className = 'alert alert-success';
      alerta.innerHTML = '✅ <strong>Valores conferem!</strong> Valor total está correto.';
      alerta.classList.remove('hidden');
    }

    // Preenche dados do cabeçalho
    document.getElementById('previewNumeroNF').textContent = extractedData.numero || '-';
    document.getElementById('previewDataNF').textContent = extractedData.data || '-';
    document.getElementById('previewNomeFornecedor').textContent = extractedData.nomeFornecedor || '-';
    document.getElementById('previewCNPJEmitente').textContent = extractedData.cnpjEmitente || '-';
    document.getElementById('previewCNPJDestinatario').textContent = extractedData.cnpjDestinatario || '-';
    document.getElementById('previewChaveAcesso').textContent = extractedData.chaveAcesso
      ? extractedData.chaveAcesso.substring(0, 20) + '...'
      : '-';
    document.getElementById('previewValorTotal').textContent = this.formatarMoeda(valorTotal);

    // Gera tabela de itens
    this.gerarTabelaItensExtraidos(extractedData.itens || []);

    // Preenche resumo
    document.getElementById('resumoTotalItens').textContent = (extractedData.itens || []).length;
    document.getElementById('resumoValorCabecalho').textContent = this.formatarMoeda(valorTotal);
    document.getElementById('resumoSomaItens').textContent = this.formatarMoeda(somaItens);
    document.getElementById('resumoDiferenca').textContent = this.formatarMoeda(diferenca);

    // Exibe o preview
    previewContainer.classList.remove('hidden');

    // Configura botão de transferir dados
    const btnTransferir = document.getElementById('btnTransferirDados');
    if (btnTransferir) {
      btnTransferir.onclick = () => {
        this.transferirDadosParaFormulario(extractedData);
      };
    }
  }

  /**
   * Gera tabela HTML com itens extraídos (versão melhorada)
   */
  gerarTabelaItensExtraidos(itens) {
    const container = document.getElementById('tabelaItensExtraidos');
    if (!container) {
      return;
    }

    if (!itens || itens.length === 0) {
      container.innerHTML = "<p style='color: #666; text-align: center; padding: 20px;'>Nenhum item extraído</p>";
      return;
    }

    // Helpers de formatação
    const fmtMoney = (n) => {
      const valor = parseFloat(n) || 0;
      return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    const fmtQty = (n) => {
      const valor = parseFloat(n) || 0;
      // Remove zeros finais desnecessários
      return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
    };
    const truncate = (str, max = 50) => {
      if (!str) {
        return '-';
      }
      return str.length > max ? str.substring(0, max) + '...' : str;
    };

    // Calcula soma dos itens
    const somaItens = itens.reduce((sum, item) => sum + (parseFloat(item.valorTotal) || 0), 0);

    let html = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="width: 40px; text-align: center; padding: 8px; border: 1px solid #dee2e6;">#</th>
              <th style="width: 80px; text-align: left; padding: 8px; border: 1px solid #dee2e6;">Código</th>
              <th style="min-width: 180px; text-align: left; padding: 8px; border: 1px solid #dee2e6;">Descrição</th>
              <th style="width: 50px; text-align: center; padding: 8px; border: 1px solid #dee2e6;">Un</th>
              <th style="width: 70px; text-align: right; padding: 8px; border: 1px solid #dee2e6;">Qtd</th>
              <th style="width: 90px; text-align: right; padding: 8px; border: 1px solid #dee2e6;">Vl.Unit</th>
              <th style="width: 100px; text-align: right; padding: 8px; border: 1px solid #dee2e6;">Vl.Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    itens.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? '#fff' : '#f8f9fa';
      const descricaoFull = item.descricao || '-';
      const descricaoTruncada = truncate(descricaoFull, 45);

      html += `
        <tr style="background: ${bgColor};">
          <td style="text-align: center; padding: 6px 4px; border: 1px solid #e9ecef; font-weight: 600; color: #666;">${index + 1}</td>
          <td style="text-align: left; padding: 6px 4px; border: 1px solid #e9ecef; font-family: monospace; font-size: 0.85em;">${item.codigo || '-'}</td>
          <td style="text-align: left; padding: 6px 4px; border: 1px solid #e9ecef;" title="${descricaoFull}">${descricaoTruncada}</td>
          <td style="text-align: center; padding: 6px 4px; border: 1px solid #e9ecef; text-transform: uppercase;">${item.unidade || 'UN'}</td>
          <td style="text-align: right; padding: 6px 4px; border: 1px solid #e9ecef; font-family: monospace;">${fmtQty(item.quantidade)}</td>
          <td style="text-align: right; padding: 6px 4px; border: 1px solid #e9ecef; font-family: monospace;">${fmtMoney(item.valorUnitario)}</td>
          <td style="text-align: right; padding: 6px 4px; border: 1px solid #e9ecef; font-weight: 600; font-family: monospace;">${fmtMoney(item.valorTotal)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
          <tfoot>
            <tr style="background: #e7f1ff; font-weight: bold;">
              <td colspan="6" style="text-align: right; padding: 8px; border: 1px solid #dee2e6;">SOMA DOS ITENS:</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #dee2e6; font-family: monospace;">${fmtMoney(somaItens)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Transfere dados do preview para o formulário principal
   */
  async transferirDadosParaFormulario(extractedData) {
    try {
      // Preenche campos do cabeçalho
      if (extractedData.numero) {
        document.getElementById('numeroNotaFiscal').value = extractedData.numero;
      }
      if (extractedData.data) {
        document.getElementById('dataNotaFiscal').value = extractedData.data;
      }
      if (extractedData.cnpjEmitente) {
        document.getElementById('cnpjEmitente').value = extractedData.cnpjEmitente;
      }
      if (extractedData.cnpjDestinatario) {
        document.getElementById('cnpjDestinatario').value = extractedData.cnpjDestinatario;
      }
      if (extractedData.chaveAcesso) {
        document.getElementById('chaveAcesso').value = extractedData.chaveAcesso;
      }
      if (extractedData.valorTotal) {
        document.getElementById('valorTotalNF').value = this.formatarMoeda(extractedData.valorTotal);
      }

      // Adiciona itens ao formulário
      this.adicionarItensExtraidos('itensNotaFiscal', extractedData.itens);

      // Calcula soma dos itens
      this.calcularSomaItensNF();

      // Busca empenho correspondente
      if (extractedData.cnpjEmitente) {
        await this.buscarEmpenhoCorrespondente(extractedData.cnpjEmitente);
      }

      // Oculta preview
      document.getElementById('previewDadosNF').classList.add('hidden');

      // Scroll para o formulário
      document.getElementById('formNotaFiscal').scrollIntoView({ behavior: 'smooth' });

      this.showSuccess('✅ Dados transferidos com sucesso! Revise e salve a Nota Fiscal.');
    } catch (error) {
      console.error('Erro ao transferir dados:', error);
      this.showError('Erro ao transferir dados: ' + error.message);
    }
  }

  /**
   * Formata número para exibição
   */
  formatarNumero(valor) {
    if (valor === null || valor === undefined || valor === '') {
      return '-';
    }
    const num = parseFloat(valor);
    if (isNaN(num)) {
      return '-';
    }

    // Se for inteiro, não mostra decimais
    if (Number.isInteger(num)) {
      return num.toLocaleString('pt-BR');
    }

    // Se tiver decimais, mostra até 4 casas
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  }

  // Função mostrarMenuExportacao removida - exportação agora em Configurações → Preferências

  // ==========================================
  // MÉTODOS DE GERENCIAMENTO DE ARQUIVOS E PROTEÇÃO
  // ==========================================

  /**
   * Exclui um documento (empenho ou NF) do sistema de forma segura
   * Remove registros do banco de dados
   * @param {number} documentoId - ID do documento
   * @param {string} tipo - Tipo ('empenho' ou 'notaFiscal')
   */
  async excluirDocumento(documentoId, tipo) {
    const tipoNome = tipo === 'empenho' ? 'Empenho' : 'Nota Fiscal';

    const confirmacao = confirm(
      `⚠️ ATENÇÃO!\n\n` +
        `Deseja realmente excluir este ${tipoNome}?\n\n` +
        `Esta ação irá:\n` +
        `• Remover o registro do banco de dados\n` +
        `${tipo === 'empenho' ? '• Remover os saldos relacionados\n' : ''}` +
        `\n⚠️ Esta operação NÃO pode ser desfeita!`
    );

    if (!confirmacao) {
      return;
    }

    try {
      this.showLoading('Excluindo documento...');

      if (tipo === 'empenho') {
        await window.dbManager.delete('empenhos', documentoId);
        const saldos = await window.dbManager.getByIndex('saldosEmpenhos', 'empenhoId', documentoId);
        for (const saldo of saldos) {
          await window.dbManager.delete('saldosEmpenhos', saldo.id);
        }
      } else {
        await window.dbManager.delete('notasFiscais', documentoId);
      }

      const arquivos = await window.dbManager.getByIndex('arquivos', 'documentoId', documentoId);
      for (const arquivo of arquivos || []) {
        await window.dbManager.delete('arquivos', arquivo.id);
      }

      this.showSuccess(`${tipoNome} excluído com sucesso do banco de dados.`);
      await this.carregarEmpenhosSelect();
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      this.showError(`Erro ao excluir ${tipoNome}: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Sincroniza arquivos do sistema com banco de dados
   * (Desativado no modo banco/API)
   */
  async sincronizarArquivos() {
    alert('ℹ️ Sincronização de diretórios externos desativada. O sistema opera com persistência em banco/API.');
  }

  /**
   * Verifica integridade das pastas configuradas
   * (Desativado no modo banco/API)
   */
  async verificarIntegridadePastas() {
    alert(
      'ℹ️ Verificação de integridade de diretórios externos desativada. O sistema opera com persistência em banco/API.'
    );
  }

  /**
   * Repara estrutura de pastas deletadas
   * (Desativado no modo banco/API)
   */
  async repararEstrutura() {
    alert('ℹ️ Reparo de estrutura de diretórios externos desativado. O sistema opera com persistência em banco/API.');
  }

  /**
   * Limpa registros de documentos com arquivos deletados do banco de dados
   */
  async limparRegistrosDeletados() {
    try {
      this.showLoading('Limpando registros deletados...');

      let totalExcluidos = 0;

      // Buscar TODOS os empenhos (incluindo deletados)
      const todosEmpenhos = await window.dbManager.buscarEmpenhos(true);
      const empenhosDeletados = todosEmpenhos.filter((emp) => emp.arquivoDeletado);

      for (const empenho of empenhosDeletados) {
        // Excluir saldos relacionados
        const saldos = await window.dbManager.getByIndex('saldosEmpenhos', 'empenhoId', empenho.id);
        for (const saldo of saldos) {
          await window.dbManager.delete('saldosEmpenhos', saldo.id);
        }

        // Excluir empenho
        await window.dbManager.delete('empenhos', empenho.id);
        totalExcluidos++;
        console.log(`🗑️ Empenho ${empenho.numero} excluído do banco`);
      }

      // Buscar notas fiscais deletadas
      const notasFiscais = await window.dbManager.getAll('notasFiscais');
      const nfsDeletadas = notasFiscais.filter((nf) => nf.arquivoDeletado);

      for (const nf of nfsDeletadas) {
        await window.dbManager.delete('notasFiscais', nf.id);
        totalExcluidos++;
        console.log(`🗑️ NF ${nf.numero} excluída do banco`);
      }

      // Recarregar listas
      await this.carregarEmpenhosSelect();

      alert(`✅ Limpeza concluída!\n\n${totalExcluidos} registro(s) deletado(s) permanentemente do banco de dados.`);
      this.hideLoading();
    } catch (error) {
      console.error('Erro ao limpar registros:', error);
      this.showError(`Erro na limpeza: ${error.message}`);
      this.hideLoading();
    }
  }

  /**
   * Limpa registros órfãos (empenhos/NFs sem arquivo vinculado)
   */
  async limparRegistrosOrfaos() {
    try {
      this.showLoading('Buscando registros órfãos...');

      // Buscar todos os empenhos e arquivos
      const todosEmpenhos = await window.dbManager.buscarEmpenhos(true);
      const todosArquivos = await window.dbManager.getAll('arquivos');

      // Criar mapa de documentoId -> arquivo
      const mapaArquivos = new Map();
      todosArquivos.forEach((arquivo) => {
        if (arquivo.tipoDocumento === 'empenho') {
          mapaArquivos.set(arquivo.documentoId, arquivo);
        }
      });

      // Encontrar empenhos órfãos (sem arquivo vinculado)
      const empenhosOrfaos = todosEmpenhos.filter((emp) => !mapaArquivos.has(emp.id));

      if (empenhosOrfaos.length === 0) {
        this.hideLoading();
        alert('✅ Nenhum registro órfão encontrado!');
        return;
      }

      // Confirmar exclusão
      const mensagem =
        `🗑️ LIMPAR REGISTROS ÓRFÃOS\n\n` +
        `Encontrados ${empenhosOrfaos.length} empenho(s) sem arquivo PDF vinculado:\n\n` +
        empenhosOrfaos
          .map((e) => `• NE ${e.numero} - ${e.fornecedor}`)
          .join('\n')
          .substring(0, 500) +
        (empenhosOrfaos.length > 10 ? '\n...' : '') +
        `\n\n⚠️ Deseja excluir permanentemente esses registros?\nEsta ação NÃO pode ser desfeita!`;

      const confirmar = confirm(mensagem);

      if (!confirmar) {
        this.hideLoading();
        return;
      }

      let totalExcluidos = 0;

      // Excluir cada empenho órfão
      for (const empenho of empenhosOrfaos) {
        // Excluir saldos relacionados
        const saldos = await window.dbManager.getByIndex('saldosEmpenhos', 'empenhoId', empenho.id);
        for (const saldo of saldos) {
          await window.dbManager.delete('saldosEmpenhos', saldo.id);
        }

        // Excluir empenho
        await window.dbManager.delete('empenhos', empenho.id);
        totalExcluidos++;
        console.log(`🗑️ Empenho órfão ${empenho.numero} excluído do banco`);
      }

      // Recarregar listas
      await this.carregarEmpenhosSelect();

      alert(`✅ Limpeza de órfãos concluída!\n\n${totalExcluidos} empenho(s) sem arquivo foram excluídos do banco.`);
      this.hideLoading();
    } catch (error) {
      console.error('Erro ao limpar registros órfãos:', error);
      this.showError(`Erro na limpeza: ${error.message}`);
      this.hideLoading();
    }
  }

  /**
   * ============================================================================
   * INFRAESTRUTURA ENTERPRISE - Event Listeners Setup
   * ============================================================================
   * Conecta eventos da nova arquitetura com a UI e fluxo existente
   */
  setupInfrastructureListeners() {
    console.log('[App] Configurando event listeners da nova infraestrutura...');

    // ========================================================================
    // EVENTOS DE PDF PARSING
    // ========================================================================
    eventBus.on('pdf.parse:start', (event) => {
      console.log('[App] Parse de PDF iniciado:', event.detail);
      feedback.showLoading('📄 Processando PDF...');
    });

    eventBus.on('pdf.parse:done', (event) => {
      console.log('[App] Parse de PDF concluído:', event.detail);
      feedback.hideLoading();
      feedback.notifySuccess('✅ PDF processado com sucesso!');

      // Atualizar listas se necessário
      if (event.detail.tipoDocumento === 'empenho') {
        this.carregarEmpenhosSelect().catch((err) => console.error('Erro ao recarregar empenhos:', err));
      }
    });

    eventBus.on('pdf.parse:error', (event) => {
      console.error('[App] Erro ao processar PDF:', event.detail);
      feedback.hideLoading();
      feedback.notifyError(`❌ Erro ao processar PDF: ${event.detail.message || 'Erro desconhecido'}`);
    });

    // ========================================================================
    // EVENTOS DE SALVAMENTO
    // ========================================================================
    eventBus.on('ne.salva', (event) => {
      console.log('[App] Empenho salvo:', event.detail);
      feedback.notifySuccess(`✅ Empenho ${event.detail.numero} salvo com sucesso!`);

      // Atualizar dropdowns
      this.carregarEmpenhosSelect().catch((err) => console.error('Erro ao recarregar empenhos:', err));
    });

    eventBus.on('nf.salva', (event) => {
      console.log('[App] Nota fiscal salva:', event.detail);
      feedback.notifySuccess(`✅ Nota Fiscal ${event.detail.numero} salva com sucesso!`);

      // Atualizar listas se estiver na tela de comparação
      if (this.currentScreen === 'comparacaoScreen') {
        this.carregarNotasFiscaisComparacao().catch((err) => console.error('Erro ao recarregar notas fiscais:', err));
      }
    });

    // ========================================================================
    // EVENTOS DE FILA ASSÍNCRONA
    // ========================================================================
    eventBus.on('queue.task:start', (event) => {
      console.log('[App] Tarefa iniciada na fila:', event.detail);
      feedback.notifyInfo(`⚙️ Processando tarefa ${event.detail.tipo}...`);
    });

    eventBus.on('queue.task:done', (event) => {
      console.log('[App] Tarefa concluída:', event.detail);
      feedback.notifySuccess(`✅ Tarefa ${event.detail.tipo} concluída!`);
    });

    eventBus.on('queue.task:error', (event) => {
      console.error('[App] Erro em tarefa da fila:', event.detail);
      feedback.notifyError(`❌ Erro na tarefa ${event.detail.tipo}: ${event.detail.error}`);
    });

    // ========================================================================
    // EVENTOS DE RELATÓRIOS
    // ========================================================================
    eventBus.on('relatorio.gerar:start', (event) => {
      console.log('[App] Geração de relatório iniciada:', event.detail);
      feedback.showLoading('📊 Gerando relatório...');
    });

    eventBus.on('relatorio.gerar:done', (event) => {
      console.log('[App] Relatório gerado:', event.detail);
      feedback.hideLoading();
      feedback.notifySuccess('✅ Relatório gerado com sucesso!');
    });

    eventBus.on('relatorio.gerar:error', (event) => {
      console.error('[App] Erro ao gerar relatório:', event.detail);
      feedback.hideLoading();
      feedback.notifyError(`❌ Erro ao gerar relatório: ${event.detail.message}`);
    });

    // ========================================================================
    // EVENTOS DE SALDO
    // ========================================================================
    eventBus.on('saldo.atualizado', (event) => {
      console.log('[App] Saldo atualizado:', event.detail);
      feedback.notifySuccess('✅ Saldo atualizado!');

      // Recarregar controle de saldos se estiver naquela aba
      const tabControleSaldos = document.getElementById('tabControleSaldos');
      if (tabControleSaldos && tabControleSaldos.classList.contains('active')) {
        this.carregarControleSaldos().catch((err) => console.error('Erro ao recarregar controle de saldos:', err));
      }
    });

    console.log('[App] ✅ Event listeners configurados com sucesso');
  }
}

// ============================================================================
// BOOTSTRAP DA APLICAÇÃO - Inicialização Robusta
// ============================================================================

/**
 * Aguarda o repository estar pronto para uso
 * Implementa retry com backoff para maior resiliência
 */
async function waitForRepository(maxRetries = 3, baseDelay = 300) {
  console.log('[Bootstrap] � Aguardando repository...');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Verifica se repository existe e tem métodos essenciais
      if (!repository) {
        throw new Error('repository não foi importado');
      }

      if (typeof repository.saveUnidade !== 'function') {
        throw new Error('saveUnidade não encontrado no repository');
      }

      // Verifica se dbManager está disponível
      if (!window.dbManager) {
        console.warn(`[Bootstrap] Tentativa ${attempt}/${maxRetries}: dbManager ainda não disponível`);

        if (attempt < maxRetries) {
          const delay = baseDelay * attempt; // Backoff exponencial
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error('dbManager não inicializado após múltiplas tentativas');
        }
      }

      // Tudo OK!
      console.log('[Bootstrap] ✅ Repository pronto para uso');
      return true;
    } catch (error) {
      console.error(`[Bootstrap] Tentativa ${attempt}/${maxRetries} falhou:`, error);

      if (attempt >= maxRetries) {
        throw new Error(`Repository não inicializou após ${maxRetries} tentativas: ${error.message}`);
      }

      // Aguarda antes de tentar novamente
      const delay = baseDelay * attempt;
      console.log(`[Bootstrap] ⏳ Aguardando ${delay}ms antes de retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Fallback: nunca deve chegar aqui, mas garante retorno
  return false;
}

/**
 * Gera relatório de inicialização para debug
 */
function logBootstrapReport() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   📊 RELATÓRIO DE INICIALIZAÇÃO       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('📦 Versão:', APP_VERSION);
  console.log('🏗️  Build:', APP_BUILD);
  console.log('🗄️  DB:', window.dbManager?.db?.name || 'N/A');
  console.log('📊 DB Versão:', window.dbManager?.db?.version || 'N/A');
  console.log('✅ Repository:', typeof repository);
  console.log('✅ Repository.saveUnidade:', typeof repository?.saveUnidade);
  console.log('✅ Repository.saveUsuario:', typeof repository?.saveUsuario);
  console.log('✅ Repository.saveEmpenho:', typeof repository?.saveEmpenho);
  console.log('✅ window.repository:', typeof window.repository);
  console.log('✅ window.dbManager:', typeof window.dbManager);
  console.log('✅ window.app:', typeof window.app);
  console.log('════════════════════════════════════════\n');
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('[Bootstrap] 🚀 Iniciando aplicação SINGEM...');

    // Aguarda repository estar pronto (com retry)
    await waitForRepository();

    console.log('[Bootstrap] ℹ️ Fluxo de diretório externo removido (modo banco/API).');

    // Expor globalmente APÓS validação
    console.log('[Bootstrap] 🔧 Expondo módulos globalmente...');
    window.repository = repository;

    // Inicializa aplicação
    window.app = new ControleMaterialApp();

    // Gera relatório de inicialização
    logBootstrapReport();

    // =========================================================================
    // BOOTSTRAP COMPLETO - Sinaliza para outros módulos
    // =========================================================================
    window.__SINGEM_BOOTSTRAP_DONE__ = true;
    window.dispatchEvent(
      new CustomEvent('SINGEM:bootstrap:done', {
        detail: { ts: Date.now(), version: APP_VERSION, build: APP_BUILD }
      })
    );

    // Exibe versão formatada no console
    logVersion();

    // Exibe info da infraestrutura (controlado, apenas em debug/localhost)
    initInfrastructureInfo();

    console.log('[Bootstrap] ✅ Aplicação inicializada com sucesso!');
  } catch (error) {
    console.error('[Bootstrap] ❌ ERRO FATAL na inicialização:', error);
    console.error('[Bootstrap] Stack:', error.stack);

    // Mostra erro amigável ao usuário
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #dc3545;
      color: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 600px;
      z-index: 99999;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    errorDiv.innerHTML = `
      <h2 style="margin-top: 0;">❌ Erro ao Inicializar</h2>
      <p><strong>Não foi possível inicializar o sistema.</strong></p>
      <p style="font-size: 14px; opacity: 0.9;">${error.message}</p>
      <hr style="border: 1px solid rgba(255,255,255,0.3); margin: 20px 0;">
      <p style="font-size: 13px;">
        <strong>Soluções:</strong><br>
        1. Pressione Ctrl+Shift+R para recarregar<br>
        2. Limpe o cache do navegador<br>
        3. Verifique o console (F12) para mais detalhes
      </p>
      <button onclick="location.reload(true)" style="
        background: white;
        color: #dc3545;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        margin-top: 10px;
      ">🔄 Recarregar Página</button>
    `;
    document.body.appendChild(errorDiv);
  }
});
