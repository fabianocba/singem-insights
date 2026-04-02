/**
 * Aplicação Principal - Sistema de Controle de Material
 * IF Baiano - Campus
 */

// ============================================================================
// IMPORTS - Nova Infraestrutura Enterprise
// ============================================================================
import repository from './core/repository.js';
import InputValidator from './core/inputValidator.js';
import { APP_VERSION, APP_BUILD, logVersion } from './core/version.js';
import * as FormatUtils from './core/format.js';
import * as NaturezaSubelementos from './data/naturezaSubelementos.js';
import './relatoriosEmpenhos.js';
import { initInfrastructureInfo } from './infrastructureInfo.js';
import './catmatIntegration.js';
import * as CatalogacaoTela from './catalogacaoTela.js';
import { createAlmoxarifadoFeature } from './features/almoxarifado/pages.js';
import { createEmpenhoFeature } from './features/empenho/pages.js';
import { createNotaFiscalFeature } from './features/notaFiscal/pages.js';
import { showToast as sharedShowToast } from './shared/ui/toast.js';
import { hideLoader, showLoader } from './shared/ui/loader.js';
import { refreshPremiumShell } from './ui/premiumShell.js';
import { escapeHTML } from './utils/sanitize.js';
import { renderSidebar } from './core/accessScope.js';
import * as dbGateway from './core/dbGateway.js';
import {
  replaceElementChildren,
  normalizeVersionMeta,
  resolveCanonicalVersionMeta
} from './features/app/versionBranding.js';
import {
  excluirDocumento as excluirDocumentoLegacy,
  sincronizarArquivos as sincronizarArquivosLegacy,
  verificarIntegridadePastas as verificarIntegridadePastasLegacy,
  repararEstrutura as repararEstruturaLegacy,
  limparRegistrosDeletados as limparRegistrosDeletadosLegacy,
  limparRegistrosOrfaos as limparRegistrosOrfaosLegacy
} from './features/app/legacyDataMaintenance.js';
import * as Relatorios from './features/app/relatorios.js';
import * as EmpenhoSupport from './features/app/empenhoSupport.js';
import * as EmpenhoValidationSupport from './features/app/empenhoValidationSupport.js';
import * as NotaFiscalSupport from './features/app/notaFiscalSupport.js';
import * as NotaFiscalFlowSupport from './features/app/notaFiscalFlowSupport.js';
import * as PdfEmpenhoSupport from './features/app/pdfEmpenhoSupport.js';
import * as AppShell from './features/app/appShell.js';
import { createAppBootstrap } from './features/app/bootstrap.js';
import { setupInfrastructureListeners as setupInfrastructureListenersImpl } from './features/app/infrastructureListeners.js';

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

export class ControleMaterialApp {
  constructor() {
    this.currentScreen = 'loginScreen';
    this.loadingOverlay = null;
    this.currentEmpenho = null;
    this.currentNotaFiscal = null;
    this.usuarioLogado = null;
    this.authProvider = null; // 'local' | 'govbr' | 'serproid'

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
      almoxarifado: createAlmoxarifadoFeature(this),
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
    return AppShell.init(this);
  }

  setupCriticalAuthListeners() {
    return AppShell.setupCriticalAuthListeners(this);
  }

  /**
   * Verifica sessão sem auto-login
   */
  async verificarSessao() {
    return AppShell.verificarSessao();
  }

  /**
   * Trata callback OAuth (SerproID/Gov.br)
   * Captura tokens da URL e autentica o usuário
   */
  async handleOAuthCallback() {
    return AppShell.handleOAuthCallback(this);
  }

  /**
   * Verifica se há usuários cadastrados e atualiza UI
   */
  async verificarUsuariosCadastrados() {
    return AppShell.verificarUsuariosCadastrados();
  }

  /**
   * Carrega dados da unidade orçamentária
   */
  async carregarDadosUnidade() {
    return AppShell.carregarDadosUnidade();
  }

  /**
   * Configura todos os event listeners da aplicação
   */
  setupEventListeners() {
    return AppShell.setupEventListeners(this);
  }

  /**
   * Configura navegação entre telas
   */
  setupScreenNavigation() {
    return AppShell.setupScreenNavigation(this);
  }

  setupImageFallbacks() {
    return AppShell.setupImageFallbacks();
  }

  /**
   * Restaura dados lembrados (login/senha) sem auto-login
   */
  async restaurarDadosLembrados() {
    return AppShell.restaurarDadosLembrados();
  }

  /**
   * Salva ou limpa dados lembrados após login bem-sucedido
   */
  async salvarDadosLembradosPosLogin(usuario, senha) {
    return AppShell.salvarDadosLembradosPosLogin(this, usuario, senha);
  }

  /**
   * Limpa dados lembrados e desmarca checkboxes
   */
  async limparDadosLembrados() {
    return AppShell.limparDadosLembrados();
  }

  /**
   * Abre modal de recuperação de senha (PIN)
   */
  abrirModalRecuperacaoSenha() {
    return AppShell.abrirModalRecuperacaoSenha();
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
    const badgeText = status === 'validado' ? 'Ativo' : status === 'concluido' ? 'Concluido' : 'Rascunho';
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
          <button class="btn-acao visualizar" data-id="${emp.id}" title="Visualizar empenho">Visualizar</button>
          <button class="btn-acao excluir" data-id="${emp.id}" title="Excluir empenho">Excluir</button>
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
      const empenhosCompletos = await dbGateway.buscarEmpenhos(true);
      const empenhosComArquivo = await dbGateway.buscarEmpenhos();

      console.log(
        '[APP] 📊 Controle Saldos - Total:',
        empenhosCompletos.length,
        'Com arquivo:',
        empenhosComArquivo.length
      );

      if (!empenhosCompletos || empenhosCompletos.length === 0) {
        container.innerHTML = `
          <div class="sg-empty-state">
            <p class="sg-empty-state__title">Nenhum empenho cadastrado.</p>
            <p class="sg-empty-state__text">Cadastre empenhos para visualizar o controle de saldos.</p>
          </div>
        `;
        return;
      }

      const optionsHtml = empenhosCompletos
        .map((emp) => {
          const numero = escapeHTML(String(emp.numero || 'Sem número'));
          const fornecedor = escapeHTML(String(emp.fornecedor || 'Fornecedor não informado'));
          const valorFormatado = escapeHTML(FormatUtils.formatCurrencyBR(emp.valorTotalEmpenho ?? emp.valorTotal ?? 0));

          return `
            <option value="${emp.id}">
              NE ${numero} - ${fornecedor} - ${valorFormatado}
            </option>
          `;
        })
        .join('');

      // Criar seletor e conteúdo (usar TODOS os empenhos)
      container.innerHTML = `
        <section class="sg-section-shell sg-saldo-panel">
          <div class="sg-toolbar sg-saldo-toolbar">
            <div class="sg-saldo-toolbar__field">
              <label for="saldoEmpenhoSelectTab" class="sg-saldo-toolbar__label">Selecione o Empenho:</label>
              <select id="saldoEmpenhoSelectTab" class="sg-inline-select">
                <option value="">-- Selecione um empenho --</option>
                ${optionsHtml}
              </select>
            </div>
            <button
              type="button"
              id="btnAtualizarControleSaldos"
              class="btn btn-secondary inline-flex items-center gap-1 px-4 py-2 whitespace-nowrap"
              title="Recarregar lista de empenhos">
              Atualizar lista
            </button>
          </div>
          <p class="sg-info-note sg-saldo-toolbar__meta">
            Total: ${empenhosCompletos.length} empenho(s) | ${empenhosComArquivo.length} com arquivo PDF vinculado
          </p>
          <div id="saldoDetalhesTab" class="sg-saldo-details" aria-live="polite"></div>
        </section>
      `;

      document.getElementById('btnAtualizarControleSaldos')?.addEventListener('click', () => {
        this.carregarControleSaldos();
      });

      // Adicionar evento ao select
      document.getElementById('saldoEmpenhoSelectTab').addEventListener('change', async (e) => {
        const empenhoId = parseInt(e.target.value);
        if (empenhoId) {
          await this.carregarSaldoEmpenhoTab(empenhoId);
        } else {
          replaceElementChildren(document.getElementById('saldoDetalhesTab'));
        }
      });
    } catch (error) {
      console.error('Erro ao carregar controle de saldos:', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger';
      errorDiv.textContent = `Erro ao carregar: ${error.message || 'Erro desconhecido'}`;
      replaceElementChildren(container, [errorDiv]);
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
          <span>Carregando empenhos...</span>
        </div>
      `;

      // Definir modo visualização (somente leitura - sem edição)
      this.listagemState.modoVisualizacao = true;

      // ✅ BUSCAR TODOS OS EMPENHOS (uma única vez)
      const dados = await dbGateway.buscarEmpenhos(true);
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
    const termoBusca = escapeHTML(String(this.listagemState.termoBusca || ''));

    container.innerHTML = `
      <div class="listagem-empenhos">
        <!-- Header -->
        <div class="listagem-header">
          <h3>Notas de empenho</h3>
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
            placeholder="Buscar empenho (ano, numero, fornecedor, processo...)"
            value="${termoBusca}"
          />
        </div>

        <!-- Filtros e Ordenação -->
        <div class="listagem-controles">
          <div class="filtros-chips">
            <button class="chip ${this.listagemState.filtroStatus === 'todos' ? 'chip-ativo' : ''}" data-filtro="todos">
              Todos
            </button>
            <button class="chip ${this.listagemState.filtroStatus === 'rascunho' ? 'chip-ativo' : ''}" data-filtro="rascunho">
              Rascunhos
            </button>
            <button class="chip ${this.listagemState.filtroStatus === 'validado' ? 'chip-ativo' : ''}" data-filtro="validado">
              Validados
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
          <span id="totalExibido">Total exibido: ${total}</span>
        </div>
      </div>
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
      const textoTotalExibido = `Total exibido: ${empenhosFiltrados.length}`;
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
          <p>Nenhum empenho encontrado.</p>
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
    const titulo = escapeHTML(`${ano} NE ${numero}`);
    const status = emp.statusValidacao || 'rascunho';
    const badgeClass = status === 'validado' ? 'badge-success' : 'badge-warning';
    const badgeText = status === 'validado' ? 'VALIDADO' : 'RASCUNHO';
    const qtdItens = emp.itens?.length || 0;
    const fornecedor = escapeHTML(String(emp.fornecedor || 'Fornecedor não informado'));

    // Processo: usar processoSuap ou fallback para campos antigos
    const processoSuap = emp.processoSuap || emp.codigoReferencia || emp.processoNumero || emp.processo || '';
    const processoExibicao = processoSuap ? `Proc: ${escapeHTML(String(processoSuap).substring(0, 20))}...` : '';

    // Valor: usar novo nome ou antigo (compatibilidade)
    const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
    const valor = escapeHTML(FormatUtils.formatCurrencyBR(valorEmpenho));
    const slug = escapeHTML(String(emp.slug || ''));

    const isDestaque = this.listagemState.ultimoEditado === emp.id;

    // Botões de ação - diferentes para modo visualização e edição
    let botoesAcoes = '';
    if (somenteVisualizacao) {
      botoesAcoes = `
        <button class="btn-acao" data-action="ver-detalhes" data-id="${emp.id}" title="Ver detalhes">Detalhes</button>
      `;
    } else {
      botoesAcoes = `
        <button class="btn-acao" data-action="editar" data-id="${emp.id}" title="Editar empenho">Editar</button>
        <button class="btn-acao" data-action="adicionar-item" data-id="${emp.id}" title="Adicionar item">Adicionar item</button>
        <button class="btn-acao" data-action="ver-detalhes" data-id="${emp.id}" title="Ver detalhes">Detalhes</button>
      `;
    }

    return `
      <div class="empenho-card ${isDestaque ? 'card-destaque' : ''}" data-id="${emp.id}" data-slug="${slug}">
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
      emp = await dbGateway.buscarEmpenhoPorId(empenhoId);
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
          <h4>${ano} NE ${numero}</h4>
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
          <button class="btn btn-primary" id="btnEditarDetalhes" data-id="${empenhoId}">Editar</button>
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

      const empenho = await dbGateway.buscarEmpenhoPorId(empenhoId);
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

    const setElementHidden = (element, isHidden) => {
      if (element) {
        element.hidden = isHidden;
      }
    };

    const setCollectionHidden = (elements, isHidden) => {
      Array.from(elements || []).forEach((element) => {
        setElementHidden(element, isHidden);
      });
    };

    if (visualizacao) {
      // === MODO VISUALIZAÇÃO ===
      campos.forEach((campo) => {
        campo.disabled = true;
        campo.classList.add('campo-visualizacao');
      });

      setCollectionHidden(botoesAcao, true);

      // Esconder botões de excluir item
      setCollectionHidden(botoesExcluirItem, true);

      setElementHidden(btnSalvar, true);

      setElementHidden(btnAnexarPdf, true);

      // Adicionar botão "Editar" na área de ações (junto com Cancelar)
      if (!btnEditarEmpenho && formActions) {
        btnEditarEmpenho = document.createElement('button');
        btnEditarEmpenho.type = 'button';
        btnEditarEmpenho.id = 'btnHabilitarEdicao';
        btnEditarEmpenho.className = 'btn btn-primary inline-flex items-center gap-1.5';
        btnEditarEmpenho.textContent = 'Editar empenho';

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
        setElementHidden(btnEditarEmpenho, false);
      }

      console.log('[APP] 👁️ Modo visualização ativado');
    } else {
      // === MODO EDIÇÃO ===
      campos.forEach((campo) => {
        campo.disabled = false;
        campo.classList.remove('campo-visualizacao');
      });

      setCollectionHidden(botoesAcao, false);

      // Mostrar botões de excluir item
      setCollectionHidden(botoesExcluirItem, false);

      setElementHidden(btnSalvar, false);

      setElementHidden(btnAnexarPdf, false);

      // Esconder botão de editar
      if (btnEditarEmpenho) {
        setElementHidden(btnEditarEmpenho, true);
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
    console.log('[AUTH] Tentando login...');
    const form =
      event?.currentTarget instanceof HTMLFormElement
        ? event.currentTarget
        : document.getElementById('loginForm') || document.getElementById('formLogin');
    const usuario = form?.elements?.username?.value?.trim() || document.getElementById('loginUsuario')?.value.trim();
    const senha = form?.elements?.password?.value || document.getElementById('loginSenha')?.value;
    const errorDiv = document.getElementById('loginError');
    const btnLogin = document.getElementById('btnLogin');

    console.log('[AUTH] Usuário:', usuario ? '✓ preenchido' : '❌ vazio');
    console.log('[AUTH] Senha:', senha ? '✓ preenchida' : '❌ vazia');

    // Limpa erro anterior
    if (errorDiv) {
      errorDiv.classList.add('hidden');
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      errorDiv.setAttribute('aria-hidden', 'true');
    }

    // Validação de credenciais com InputValidator
    const validation = InputValidator.validateCredentials(usuario, senha);
    if (!validation.valid) {
      this.showLoginError(validation.errors.join(', '));
      return;
    }

    // Desabilita botão e mostra loading
    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = 'Autenticando...';
    }

    try {
      const apiClient = (await import('./services/apiClient.js')).default;
      const resultadoAPI = await apiClient.login(usuario, senha);

      const usuarioApi = resultadoAPI?.usuario || resultadoAPI?.dados?.usuario || apiClient.getUser?.();
      if (!usuarioApi) {
        throw new Error('Resposta de autenticação inválida.');
      }

      // Preserva contexto completo (accessContext, menusVisiveis, escopoDados, etc.)
      this.usuarioLogado = {
        ...usuarioApi,
        login: usuarioApi.login || usuario
      };
      this.authProvider = usuarioApi.authProvider || 'local';

      // Compatibilidade: alguns módulos de configurações ainda leem o usuário daqui.
      if (window.settingsUsuarios) {
        window.settingsUsuarios.usuarioLogado = { ...this.usuarioLogado };
      }

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
      renderSidebar(this.usuarioLogado);
      this.atualizarUsuarioHeader();
      this.showScreen('homeScreen');

      // Fallback de robustez: se alguma rotina externa reverter para login,
      // força a navegação para home ao final do tick de render.
      window.setTimeout(() => {
        if (this.usuarioLogado && this.currentScreen === 'loginScreen') {
          this.showScreen('homeScreen');
        }
      }, 0);

      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
      }
      return;
    } catch (error) {
      console.error('❌ Erro no login:', {
        message: error?.message,
        status: error?.status,
        endpoint: error?.endpoint,
        requestUrl: error?.requestUrl,
        data: error?.data
      });
      const mensagemErroLogin = this.formatarMensagemErroLogin(error);
      console.warn('[AUTH][LOGIN] Falha de autenticação:', mensagemErroLogin);

      this.showLoginError(mensagemErroLogin);

      // Reseta botão
      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
      }
    }
  }

  showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    const mensagem = String(message || 'Falha ao autenticar. Tente novamente.');

    if (errorDiv) {
      errorDiv.textContent = mensagem;
      errorDiv.classList.remove('hidden');
      errorDiv.style.display = 'block';
      errorDiv.setAttribute('role', 'alert');
      errorDiv.setAttribute('aria-live', 'assertive');
      errorDiv.setAttribute('aria-hidden', 'false');
      errorDiv.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }

    this.showToast(mensagem, 'error');
  }

  formatarMensagemErroLogin(error) {
    const mensagemOriginal = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || 0);

    if (status === 401) {
      if (mensagemOriginal.includes('sessão expirada') || mensagemOriginal.includes('sessao expirada')) {
        return 'Sessao expirada. Faca login novamente.';
      }

      return 'Usuario ou senha invalidos. Verifique e tente novamente.';
    }

    if (status === 405) {
      return 'Metodo nao permitido no endpoint de login. Atualize o deploy e valide o proxy /api/auth/login.';
    }

    if (status >= 500) {
      return 'Erro interno no servidor ao autenticar. Verifique logs do backend/proxy.';
    }

    if (mensagemOriginal.includes('failed to fetch') || mensagemOriginal.includes('timeout')) {
      return 'Nao foi possivel conectar ao servidor. Verifique se o backend esta ativo.';
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
    const wasGovBr = this.authProvider === 'govbr';

    try {
      const apiClient = (await import('./services/apiClient.js')).default;
      await apiClient.logout();
    } catch (error) {
      console.warn('⚠️ Falha ao encerrar sessão na API:', error?.message || error);
    }

    // Limpa usuário logado
    this.usuarioLogado = null;
    this.authProvider = null;

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
    const usuarioAvatar = document.getElementById('usuarioAvatar');
    const usuarioPerfil = document.getElementById('usuarioLogadoPerfil');
    if (usuarioNome) {
      usuarioNome.textContent = '';
    }
    if (usuarioAvatar) {
      usuarioAvatar.textContent = 'SG';
    }
    if (usuarioPerfil) {
      usuarioPerfil.textContent = 'Sessão encerrada';
    }

    // Volta para tela de login
    this.showScreen('loginScreen');

    // Logout SSO gov.br (obrigatório conforme roteiro de integração)
    if (wasGovBr) {
      const base =
        window.__API_BASE_URL__ ||
        (window.CONFIG && window.CONFIG.api && window.CONFIG.api.baseUrl) ||
        window.location.origin;
      const normalizedBase = String(base).replace(/\/+$/, '');
      window.location.href =
        normalizedBase + '/api/auth/govbr/logout?redirect=' + encodeURIComponent(window.location.origin);
    }
  }

  /**
   * Atualiza informações do usuário logado no header
   */
  atualizarUsuarioHeader() {
    const usuarioNome = document.getElementById('usuarioLogadoNome');
    const usuarioAvatar = document.getElementById('usuarioAvatar');
    const usuarioPerfil = document.getElementById('usuarioLogadoPerfil');

    if (usuarioNome && this.usuarioLogado) {
      const perfil = this.usuarioLogado.perfil === 'admin' ? 'Administrador' : 'Usuario';
      // Prevenção XSS: usar textContent para dados de usuário
      const nomeExibicao = this.usuarioLogado.nome || this.usuarioLogado.login;
      usuarioNome.textContent = `${perfil} ${nomeExibicao}`;

      if (usuarioAvatar) {
        const avatarBase = String(nomeExibicao || 'SG')
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((parte) => parte.charAt(0).toUpperCase())
          .join('');
        usuarioAvatar.textContent = avatarBase || 'SG';
      }

      if (usuarioPerfil) {
        usuarioPerfil.textContent =
          this.authProvider === 'govbr'
            ? 'Autenticação Gov.br'
            : this.usuarioLogado.perfil === 'admin'
              ? 'Acesso administrativo'
              : 'Sessão institucional';
      }

      console.log('✅ Header atualizado com usuário:', this.usuarioLogado.nome);
    }

    refreshPremiumShell(this);
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
    return NotaFiscalFlowSupport.setupNotaFiscalOptions(this);
  }

  _getNotaFiscalRefs() {
    return NotaFiscalFlowSupport.getNotaFiscalRefs(this);
  }

  _refreshNotaFiscalOptionRefs() {
    return NotaFiscalFlowSupport.refreshNotaFiscalOptionRefs(this);
  }

  /**
   * Seleciona opção de entrada de NF
   */
  selecionarOpcaoEntrada(opcao) {
    return NotaFiscalFlowSupport.selecionarOpcaoEntrada(this, opcao);
  }

  /**
   * Configura funcionalidades de chave de acesso
   */
  setupChaveAcesso() {
    return NotaFiscalFlowSupport.setupChaveAcesso(this);
  }

  /**
   * Configura funcionalidades de código de barras
   */
  setupCodigoBarras() {
    return NotaFiscalFlowSupport.setupCodigoBarras(this);
  }

  /**
   * Busca nota fiscal por chave de acesso
   */
  async buscarNotaFiscalPorChave(chave) {
    return NotaFiscalFlowSupport.buscarNotaFiscalPorChave(this, chave);
  }

  /**
   * Consulta chave de acesso usando módulo de integração
   */
  async consultarChaveAcesso(chave) {
    return NotaFiscalFlowSupport.consultarChaveAcesso(chave);
  }

  /**
   * Inicia câmera para leitura de código de barras
   */
  async iniciarCamera() {
    return NotaFiscalFlowSupport.iniciarCamera(this);
  }

  /**
   * Para a câmera
   */
  pararCamera() {
    return NotaFiscalFlowSupport.pararCamera(this);
  }

  /**
   * Troca câmera (frente/traseira)
   */
  async trocarCamera() {
    return NotaFiscalFlowSupport.trocarCamera(this);
  }

  /**
   * Inicia detecção de código de barras usando ZXing
   */
  iniciarDeteccaoBarcode() {
    return NotaFiscalFlowSupport.iniciarDeteccaoBarcode(this);
  }

  /**
   * Detecção simulada como fallback
   */
  iniciarDeteccaoSimulada() {
    return NotaFiscalFlowSupport.iniciarDeteccaoSimulada(this);
  }

  /**
   * Gera código de barras simulado para testes
   */
  gerarCodigoBarrasSimulado() {
    return NotaFiscalFlowSupport.gerarCodigoBarrasSimulado();
  }

  /**
   * Processa código de barras detectado
   */
  codigoDetectado(codigo) {
    return NotaFiscalFlowSupport.codigoDetectado(this, codigo);
  }

  /**
   * Usa código de barras detectado
   */
  async usarCodigoBarras(codigo) {
    return NotaFiscalFlowSupport.usarCodigoBarras(this, codigo);
  }

  /**
   * Extrai chave de acesso do código de barras
   */
  extrairChaveDoCodigoBarras(codigo) {
    return NotaFiscalFlowSupport.extrairChaveDoCodigoBarras(codigo);
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
    return NotaFiscalFlowSupport.preencherDadosNF(this, dados);
  }

  /**
   * Mostra status da chave
   */
  showChaveStatus(message, type = 'info') {
    return NotaFiscalFlowSupport.showChaveStatus(this, message, type);
  }

  /**
   * Oculta status da chave
   */
  hideChaveStatus() {
    return NotaFiscalFlowSupport.hideChaveStatus(this);
  }

  /**
   * Mostra status do código de barras
   */
  showBarcodeStatus(message, type = 'info') {
    return NotaFiscalFlowSupport.showBarcodeStatus(this, message, type);
  }

  /**
   * Oculta status do código de barras
   */
  hideBarcodeStatus() {
    return NotaFiscalFlowSupport.hideBarcodeStatus(this);
  }

  _updateStatusMessage(statusDiv, stateKey, message, type) {
    return NotaFiscalFlowSupport.updateStatusMessage(this, statusDiv, stateKey, message, type);
  }

  _hideStatusMessage(statusDiv, stateKey) {
    return NotaFiscalFlowSupport.hideStatusMessage(this, statusDiv, stateKey);
  }

  /**
   * Formata CNPJ
   */
  formatarCNPJ(cnpj) {
    return NotaFiscalFlowSupport.formatarCNPJ(cnpj);
  }

  /**
   * Processa um arquivo PDF
   */
  async processarPDF(file, callback) {
    return PdfEmpenhoSupport.processarPDF(this, file, callback);
  }

  /**
   * Processa upload de Nota de Empenho
   */
  /**
   * Preenche formulário de empenho com dados extraídos
   * @private
   */
  _preencherFormularioEmpenho(extractedData) {
    return PdfEmpenhoSupport.preencherFormularioEmpenho(this, extractedData);
  }

  /**
   * Registra metadados de arquivo de empenho para persistência em banco
   * @private
   */
  async _salvarArquivoEmpenho(file, textContent, extractedData) {
    return PdfEmpenhoSupport.salvarArquivoEmpenho(this, file, textContent, extractedData);
  }

  /**
   * Gera mensagem de resumo do processamento
   * @private
   */
  _gerarMensagemResumoEmpenho(extractedData, arquivoInfo) {
    return PdfEmpenhoSupport.gerarMensagemResumoEmpenho(extractedData, arquivoInfo);
  }

  /**
   * Processa upload de Empenho (método principal simplificado)
   */
  async processarEmpenhoUpload(file, textContent, extractedData) {
    return PdfEmpenhoSupport.processarEmpenhoUpload(this, file, textContent, extractedData);
  }

  /**
   * ✅ ATUALIZA DRAFT A PARTIR DOS DADOS DO PARSER
   * @private
   */
  _atualizarDraftFromParser(extractedData) {
    return PdfEmpenhoSupport.atualizarDraftFromParser(this, extractedData);
  }

  /**
   * Processa upload de Nota Fiscal
   */
  async processarNotaFiscalUpload(file, textContent, extractedData) {
    return NotaFiscalFlowSupport.processarNotaFiscalUpload(this, file, textContent, extractedData);
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
    return NotaFiscalFlowSupport.converterMoedaParaNumero(valor);
  }

  /**
   * Formata número para moeda brasileira
   */
  formatarMoeda(valor) {
    return NotaFiscalFlowSupport.formatarMoeda(valor);
  }

  /**
   * Busca empenho correspondente para a nota fiscal
   */
  async buscarEmpenhoCorrespondente(cnpj) {
    return NotaFiscalSupport.buscarEmpenhoCorrespondente(this, cnpj);
  }

  /**
   * Verifica divergências entre nota fiscal e empenho
   */
  async verificarDivergencias(empenhoId) {
    return NotaFiscalSupport.verificarDivergencias(this, empenhoId);
  }

  /**
   * Executa validação completa da NF usando NFValidator
   * Exibe resultado em modal
   */
  async executarValidacaoNF() {
    return NotaFiscalSupport.executarValidacaoNF(this);
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
      document.getElementById('modalValidacaoNF')?.setAttribute('aria-hidden', 'true');
    });
    document.getElementById('btnFecharValidacaoNF2')?.addEventListener('click', () => {
      document.getElementById('modalValidacaoNF')?.classList.add('hidden');
      document.getElementById('modalValidacaoNF')?.setAttribute('aria-hidden', 'true');
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
    return EmpenhoValidationSupport.validarEmpenho(this);
  }

  /**
   * ✅ VALIDAR CADASTRO DO EMPENHO (lógica de negócio)
   * Retorna array de erros. Vazio = válido.
   * NÃO verifica NF nem saldo.
   */
  _validarCadastroEmpenho() {
    return EmpenhoValidationSupport.validarCadastroEmpenho(this);
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
      if (dbGateway.hasMethod('getUnidadeOrcamentaria')) {
        return await dbGateway.getUnidadeOrcamentaria();
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
    return EmpenhoValidationSupport.mostrarModalValidacao(resultado);
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
    const DEBUG_NF_EMPENHO = false; // Habilitar apenas em diagnóstico local

    try {
      // Usa true para incluir TODOS os empenhos (mesmo sem arquivo PDF vinculado)
      const empenhos = await dbGateway.buscarEmpenhos(true);

      if (DEBUG_NF_EMPENHO) {
        console.log('[DEBUG_NF_EMPENHO] carregarEmpenhosSelect() chamado');
        console.log('[DEBUG_NF_EMPENHO] dbManager pronto:', dbGateway.hasDbManager());
        console.log('[DEBUG_NF_EMPENHO] Empenhos retornados:', empenhos?.length || 0);
        if (empenhos?.length > 0) {
          console.log('[DEBUG_NF_EMPENHO] Primeiro empenho:', empenhos[0]);
        }
      }

      if (DEBUG_NF_EMPENHO) {
        console.log('[carregarEmpenhosSelect] Empenhos encontrados:', empenhos?.length || 0);
      }

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
          optionVazio.textContent = 'Nenhum empenho cadastrado';
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
        if (DEBUG_NF_EMPENHO) {
          console.log('[carregarEmpenhosSelect] Select empenhoAssociado populado:', empenhos.length, 'opções');
        }
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
      const fornecedores = await dbGateway.buscarFornecedores();
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
    return EmpenhoSupport.validarCNPJFornecedorContraUnidade(this, cnpjFornecedor);
  }

  /**
   * ✅ SALVAR EMPENHO NO BANCO DE DADOS
   * Sempre salva como rascunho (exceto se já validado).
   * NÃO bloqueia por inconsistências de valores ou falta de NF.
   * Exige apenas: natureza + ano + numero + fornecedor + CNPJ.
   */
  async salvarEmpenho() {
    return EmpenhoSupport.salvarEmpenho(this);
  }

  /**
   * ✅ DETECTA PENDÊNCIAS NO EMPENHO (não bloqueantes)
   * Retorna array de strings descrevendo pendências.
   * Usado para informar o usuário, mas NÃO bloqueia salvamento.
   */
  _detectarPendencias() {
    return EmpenhoSupport.detectarPendencias(this);
  }

  /**
   * ✅ VALIDA O DRAFT DE EMPENHO (MÍNIMO PARA SALVAR)
   * Retorna array de erros (vazio se válido)
   * @returns {string[]} Array de mensagens de erro
   */
  /* eslint-disable complexity */
  validateEmpenhoDraft() {
    return EmpenhoSupport.validateEmpenhoDraft(this);
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
    return EmpenhoSupport.validarCNPJ(cnpj);
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

      await dbGateway.salvarEntrega(entrega);

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
    return NotaFiscalSupport.validarCNPJDestinatarioContraUnidade(this, cnpjDestinatario);
  }

  /**
   * Registra metadados de arquivo de nota fiscal para persistência em banco
   * @private
   */
  async _salvarArquivoNotaFiscal(id, notaFiscal) {
    return NotaFiscalSupport.salvarArquivoNotaFiscal(this, id, notaFiscal);
  }

  /**
   * Atualiza saldos do empenho com a nota fiscal
   * @private
   */
  async _atualizarSaldosEmpenhoComNF(notaFiscal, itens) {
    return NotaFiscalSupport.atualizarSaldosEmpenhoComNF(this, notaFiscal, itens);
  }

  /**
   * Salva nota fiscal no banco de dados
   * Inclui validação obrigatória contra empenho
   */
  async salvarNotaFiscal() {
    return NotaFiscalSupport.salvarNotaFiscal(this);
  }

  // ========== Gestão de Estado e Normalização ==========

  /**
   * ✅ Remove tudo que não é dígito de uma string
   * @param {string} str - String para limpar
   * @returns {string} Apenas dígitos
   */
  onlyDigits(str) {
    return EmpenhoSupport.onlyDigits(str);
  }

  /**
   * ✅ Converte data brasileira (dd/mm/aaaa) para ISO (aaaa-mm-dd)
   * @param {string} dataBR - Data no formato dd/mm/aaaa
   * @returns {string} Data no formato ISO ou null se inválida
   */
  dataBRtoISO(dataBR) {
    return EmpenhoSupport.dataBRtoISO(dataBR);
  }

  /**
   * ✅ Converte string monetária brasileira para número
   * Aceita: "1.234,56" ou "1234.56" ou "1234,56"
   * @param {string|number} valor - Valor a converter
   * @returns {number} Número ou 0 se inválido
   */
  parseNumero(valor) {
    return EmpenhoSupport.parseNumero(valor);
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
    return EmpenhoSupport.normalizeEmpenhoDraft(this);
  }

  /**
   * ✅ SINCRONIZA FORMULÁRIO → DRAFT
   * Lê valores dos inputs e atualiza this.empenhoDraft
   * Usar apenas quando usuário edita manualmente
   */
  syncFromFormToDraft() {
    return EmpenhoSupport.syncFromFormToDraft(this);
  }

  /**
   * ✅ SINCRONIZA DRAFT → FORMULÁRIO
   * Atualiza os inputs com valores do this.empenhoDraft
   * Usar após parse ou ao carregar empenho existente
   */
  /* eslint-disable complexity */
  async syncFromDraftToForm() {
    return EmpenhoSupport.syncFromDraftToForm(this);
  }
  /* eslint-enable complexity */

  /**
   * ✅ Atualiza a exibição de totais (soma itens vs valor empenho vs saldo)
   * Saldo = Valor Total do Empenho - Valor já entregue (notas fiscais)
   * Por enquanto, como não há módulo de entregas, saldo = valor total do empenho
   */
  async _atualizarExibicaoTotais() {
    return EmpenhoSupport.atualizarExibicaoTotais(this);
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

    // Esconde todas as telas via classes utilitárias (evita conflito de inline style)
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.remove('active');
      screen.classList.add('hidden');
      screen.setAttribute('aria-hidden', 'true');
    });

    // Mostra a tela solicitada
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.remove('hidden');
      targetScreen.classList.add('active');
      targetScreen.setAttribute('aria-hidden', 'false');
      this.currentScreen = screenId;

      // Inicializa módulo de consultas quando a tela for aberta
      if (screenId === 'consultasScreen' && typeof window.initConsultas === 'function') {
        window.initConsultas();
      }

      // Inicializa tela de pedidos de catalogação CATMAT
      if (screenId === 'catalogacaoScreen') {
        CatalogacaoTela.initTelaCatalogacao('catalogacaoPedidosContainer');
      }

      if (screenId === 'almoxarifadoScreen') {
        this.features.almoxarifado?.activate().catch((error) => {
          console.error('[showScreen] Erro ao abrir almoxarifado:', error);
          this.showError('Erro ao abrir o módulo de almoxarifado: ' + error.message, error);
        });
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
    } else if (screenId === 'configScreen') {
      document.getElementById('btnConfig')?.classList.add('active');
    }

    document.body.dataset.currentScreen = screenId;
    refreshPremiumShell(this);
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
    this.showToast(message, 'success');
  }

  /**
   * Mostra mensagem informativa
   */
  showInfo(message) {
    this.showToast(message, 'info');
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
            <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">Detalhes tecnicos (selecione para copiar):</div>
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
            <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">Detalhes (selecione para copiar):</div>
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
            <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">Detalhes (selecione para copiar):</div>
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
          <div style="font-size: 48px;">Erro</div>
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
          <div style="font-weight: bold; color: #fff; margin-bottom: 10px;">Mensagem:</div>
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
          <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">Como reportar:</div>
          <ol style="margin: 10px 0; padding-left: 20px; color: #ccc; line-height: 1.8;">
            <li>Selecione e copie (Ctrl+C) a mensagem de erro acima</li>
            <li>Abra o Console (pressione F12)</li>
            <li>Tire um screenshot do console</li>
            <li>Envie ambos (mensagem + screenshot) para o suporte</li>
          </ol>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: flex-end;">
          <button onclick="console.log('=== DETALHES DO ERRO ==='); console.error('${message.replace(/'/g, "\\'")}'); ${details ? `console.error(${JSON.stringify(details)});` : ''} alert('Erro registrado no console. Pressione F12 para ver.')"
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
            Registrar no Console
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
    alert(message);
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
    return NotaFiscalSupport.onEmpenhoSelecionado(this, empenhoId);
  }

  /**
   * Limpa informações do empenho na tela de NF
   */
  limparInfoEmpenhoNF() {
    return NotaFiscalFlowSupport.limparInfoEmpenhoNF(this);
  }

  /**
   * Cria datalist com itens do empenho para autocomplete nos campos de descrição
   * @param {Array} itens - Itens do empenho
   */
  criarDatalistItensEmpenho(itens) {
    return NotaFiscalFlowSupport.criarDatalistItensEmpenho(this, itens);
  }

  /**
   * Mostra modal/seletor para escolher itens do empenho vinculado
   * IMPLEMENTAÇÃO: Checklist desmarcado por padrão + Marcar/Desmarcar todos + CSS moderno
   */
  mostrarSeletorItensEmpenho() {
    return NotaFiscalFlowSupport.mostrarSeletorItensEmpenho(this);
  }

  /**
   * Adiciona item à NF já preenchido com dados do empenho
   * @param {Object} item - Item do empenho
   */
  adicionarItemNFPreenchido(item) {
    return NotaFiscalFlowSupport.adicionarItemNFPreenchido(this, item);
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
    return EmpenhoValidationSupport.atualizarBadgeStatus(this);
  }

  atualizarBotaoValidar() {
    return EmpenhoValidationSupport.atualizarBotaoValidar(this);
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
    return NotaFiscalFlowSupport.calcularValorTotalNotaFiscal(this);
  }

  /**
   * Adiciona itens extraídos do PDF
   */
  adicionarItensExtraidos(containerId, itens) {
    return NotaFiscalFlowSupport.adicionarItensExtraidos(this, containerId, itens);
  }

  /**
   * Coleta dados dos itens de um container
   */
  coletarItens(containerId) {
    return NotaFiscalFlowSupport.coletarItens(this, containerId);
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
      const empenho = await dbGateway.buscarEmpenhoPorId(empenhoId);
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

  async gerarRelatorio(tipo) {
    return Relatorios.gerarRelatorio(this, tipo);
  }

  async exibirControleSaldos() {
    return Relatorios.exibirControleSaldos(this);
  }

  /**
   * Carrega e exibe o saldo detalhado de um empenho espec\u00edfico
   */
  async carregarSaldoEmpenho(empenhoId, container = null) {
    return Relatorios.carregarSaldoEmpenho(this, empenhoId, container);
  }

  getStatusColor(status) {
    return Relatorios.getStatusColor(status);
  }

  getStatusLabel(status) {
    return Relatorios.getStatusLabel(status);
  }

  getSaldoStatusColor(status) {
    return Relatorios.getSaldoStatusColor(status);
  }

  exibirRelatorio(titulo, dados) {
    return Relatorios.exibirRelatorio(titulo, dados);
  }

  exportarRelatorioPDF() {
    return Relatorios.exportarRelatorioPDF(this);
  }

  exportarRelatorioCSV() {
    return Relatorios.exportarRelatorioCSV(this);
  }

  aplicarFiltrosRelatorio() {
    return Relatorios.aplicarFiltrosRelatorio();
  }

  async mostrarEstatisticasArquivos() {
    return Relatorios.mostrarEstatisticasArquivos(this);
  }

  async atualizarEstatisticasArquivos() {
    return Relatorios.atualizarEstatisticasArquivos(this);
  }

  /**
   * Exibe preview dos dados extraídos da NF antes de transferir para formulário
   */
  exibirPreviewNotaFiscal(extractedData) {
    return NotaFiscalFlowSupport.exibirPreviewNotaFiscal(this, extractedData);
  }

  /**
   * Gera tabela HTML com itens extraídos (versão melhorada)
   */
  gerarTabelaItensExtraidos(itens) {
    return NotaFiscalFlowSupport.gerarTabelaItensExtraidos(itens);
  }

  /**
   * Transfere dados do preview para o formulário principal
   */
  async transferirDadosParaFormulario(extractedData) {
    return NotaFiscalFlowSupport.transferirDadosParaFormulario(this, extractedData);
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
    return excluirDocumentoLegacy(this, documentoId, tipo);
  }

  /**
   * Sincroniza arquivos do sistema com banco de dados
   * (Desativado no modo banco/API)
   */
  async sincronizarArquivos() {
    return sincronizarArquivosLegacy();
  }

  /**
   * Verifica integridade das pastas configuradas
   * (Desativado no modo banco/API)
   */
  async verificarIntegridadePastas() {
    return verificarIntegridadePastasLegacy();
  }

  /**
   * Repara estrutura de pastas deletadas
   * (Desativado no modo banco/API)
   */
  async repararEstrutura() {
    return repararEstruturaLegacy();
  }

  /**
   * Limpa registros de documentos com arquivos deletados do banco de dados
   */
  async limparRegistrosDeletados() {
    return limparRegistrosDeletadosLegacy(this);
  }

  /**
   * Limpa registros órfãos (empenhos/NFs sem arquivo vinculado)
   */
  async limparRegistrosOrfaos() {
    return limparRegistrosOrfaosLegacy(this);
  }

  /**
   * ============================================================================
   * INFRAESTRUTURA ENTERPRISE - Event Listeners Setup
   * ============================================================================
   * Conecta eventos da nova arquitetura com a UI e fluxo existente
   */
  setupInfrastructureListeners() {
    return setupInfrastructureListenersImpl(this);
  }

}

// ============================================================================
// BOOTSTRAP DA APLICAÇÃO - Inicialização Robusta
// ============================================================================

const bootstrapApi = createAppBootstrap({
  APP_VERSION,
  APP_BUILD,
  ControleMaterialApp,
  dbGateway,
  initInfrastructureInfo,
  logVersion,
  normalizeVersionMeta,
  repository,
  resolveCanonicalVersionMeta
});

export const waitForRepository = bootstrapApi.waitForRepository;
export const logBootstrapReport = bootstrapApi.logBootstrapReport;
export const bootstrapApp = bootstrapApi.bootstrapApp;

export default ControleMaterialApp;
