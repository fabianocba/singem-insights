/**
 * Aplicação Principal - Sistema de Controle de Material
 * IF Baiano - Campus
 */

// ============================================================================
// IMPORTS - Nova Infraestrutura Enterprise
// ============================================================================
import repository from './core/repository.js';
import { APP_VERSION, APP_BUILD, logVersion } from './core/version.js';
import InputValidator from './core/inputValidator.js';
import './features/relatoriosEmpenhos/index.js';
import { initInfrastructureInfo } from './infrastructureInfo.js';
import './catmatIntegration.js';
import { createAlmoxarifadoFeature } from './features/almoxarifado/pages.js';
import { createEmpenhoFeature } from './features/empenho/pages.js';
import { createNotaFiscalFeature } from './features/notaFiscal/pages.js';
import { showToast as sharedShowToast } from './shared/ui/toast.js';
import { hideLoader, showLoader } from './shared/ui/loader.js';
import * as dbGateway from './core/dbGateway.js';
import { normalizeVersionMeta, resolveCanonicalVersionMeta } from './features/app/versionBranding.js';
import {
  excluirDocumento as excluirDocumentoCleanup,
  limparRegistrosDeletados as limparRegistrosDeletadosCleanup,
  limparRegistrosOrfaos as limparRegistrosOrfaosCleanup
} from './features/app/databaseCleanup.js';
import {
  sincronizarArquivos as sincronizarArquivosLegacy,
  verificarIntegridadePastas as verificarIntegridadePastasLegacy,
  repararEstrutura as repararEstruturaLegacy
} from './features/app/disabledDirectoryMaintenance.js';
import * as Relatorios from './features/app/relatorios.js';
import * as EmpenhoSupport from './features/app/empenhoSupport.js';
import * as EmpenhoValidationSupport from './features/app/empenhoValidationSupport.js';
import * as NotaFiscalSupport from './features/app/notaFiscalSupport.js';
import * as NotaFiscalFlowSupport from './features/app/notaFiscalFlowSupport.js';
import * as PdfEmpenhoSupport from './features/app/pdfEmpenhoSupport.js';
import * as AppShell from './features/app/appShell.js';
import * as TabsCadastroSupport from './features/app/tabsCadastro.js';
import * as EmpenhoListagemLegacySupport from './features/app/empenhoListagemLegacy.js';
import * as EmpenhoEdicaoSupport from './features/app/empenhoEdicao.js';
import * as ItemModalEmpenhoSupport from './features/app/itemModalEmpenho.js';
import * as ItemListaEmpenhoSupport from './features/app/itemListaEmpenho.js';
import * as ItemRowFactorySupport from './features/app/itemRowFactory.js';
import * as MoneyHelpers from './features/app/moneyHelpers.js';
import * as ErrorFeedbackSupport from './features/app/errorFeedback.js';
import * as PdfUploadSetupSupport from './features/app/pdfUploadSetup.js';
import * as AuthFeedbackSupport from './features/app/authFeedback.js';
import * as UserSessionSupport from './features/app/userSessionSupport.js';
import * as AuthSessionSupport from './features/app/authSessionSupport.js';
import * as FormSetupSupport from './features/app/formSetupSupport.js';
import * as CadastroEmpenhoNavigationSupport from './features/app/cadastroEmpenhoNavigation.js';
import * as InitialDataLoader from './features/app/initialDataLoader.js';
import * as EntregaSupport from './features/app/entregaSupport.js';
import * as ScreenNavigation from './features/app/screenNavigation.js';
import * as AppFormState from './features/app/appFormState.js';
import * as AppDisplayFormatters from './features/app/appDisplayFormatters.js';
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
    return TabsCadastroSupport.setupTabs(this);
  }

  /**
   * Alterna entre abas
   */
  switchTab(tabName) {
    return TabsCadastroSupport.switchTab(this, tabName);
  }

  /**
   * Carrega a lista de empenhos na aba "Novo Cadastro" (agrupados por ano)
   */
  async carregarEmpenhosNovoCadastro() {
    return TabsCadastroSupport.carregarEmpenhosNovoCadastro(this);
  }

  /**
   * Filtra e renderiza a lista de empenhos no Novo Cadastro
   */
  _filtrarListaCadastro(empenhos, container, termoBusca, anoFiltro) {
    return TabsCadastroSupport.filtrarListaCadastro(this, empenhos, container, termoBusca, anoFiltro);
  }

  /**
   * Renderiza a lista de empenhos agrupados por ano
   */
  _renderizarListaCadastro(empenhos, container) {
    return TabsCadastroSupport.renderizarListaCadastro(this, empenhos, container);
  }

  _bindCadastroListaDelegation(container) {
    return TabsCadastroSupport.bindCadastroListaDelegation(this, container);
  }

  /**
   * Renderiza um item de empenho na lista do Cadastro
   */
  _renderizarItemCadastro(emp) {
    return TabsCadastroSupport.renderizarItemCadastro(emp);
  }

  /**
   * Exclui um empenho
   */
  async _excluirEmpenho(id) {
    return TabsCadastroSupport.excluirEmpenho(this, id);
  }

  /**
   * Carrega o Controle de Saldos na aba
   */
  async carregarControleSaldos() {
    return Relatorios.carregarControleSaldosTab(this);
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
    return EmpenhoListagemLegacySupport.carregarRelatorioEmpenhosLegacy(this);
  }

  /**
   * Renderiza a estrutura HTML da listagem (busca, filtros, ordenação)
   */
  _renderizarEstruturaListagem(container) {
    return EmpenhoListagemLegacySupport.renderizarEstruturaListagem(this, container);
  }

  /**
   * Configura eventos da listagem (busca, filtros, ordenação)
   */
  _setupEventosListagem(container) {
    return EmpenhoListagemLegacySupport.setupEventosListagem(this, container);
  }

  /**
   * Filtra e ordena empenhos conforme estado
   */
  _filtrarEOrdenarEmpenhos() {
    return EmpenhoListagemLegacySupport.filtrarEOrdenarEmpenhos(this);
  }

  _normalizarEmpenhosListagem(empenhos) {
    return EmpenhoListagemLegacySupport.normalizarEmpenhosListagem(this, empenhos);
  }

  _buildEmpenhoSearchKey(emp) {
    return EmpenhoListagemLegacySupport.buildEmpenhoSearchKey(emp);
  }

  /**
   * Renderiza a lista de empenhos filtrada e ordenada
   */
  _renderizarListaEmpenhos() {
    return EmpenhoListagemLegacySupport.renderizarListaEmpenhos(this);
  }

  /**
   * Renderiza um card de empenho
   * @param {Object} emp - Dados do empenho
   * @param {boolean} somenteVisualizacao - Se true, renderiza sem botões de edição
   */
  _renderizarCardEmpenho(emp, somenteVisualizacao = false) {
    return EmpenhoListagemLegacySupport.renderizarCardEmpenho(this, emp, somenteVisualizacao);
  }

  /**
   * Configura eventos nos cards de empenho
   * @param {HTMLElement} container - Container dos cards
   * @param {boolean} somenteVisualizacao - Se true, não configura eventos de edição
   */
  _setupEventosCards(container) {
    return EmpenhoListagemLegacySupport.setupEventosCards(this, container);
  }

  /**
   * Mostra detalhes do empenho em um popup (público)
   * Wrapper para uso externo via window.app.mostrarDetalhesEmpenho()
   * @param {number|string} empenhoId - ID do empenho
   */
  async mostrarDetalhesEmpenho(empenhoId) {
    return EmpenhoListagemLegacySupport.mostrarDetalhesEmpenho(this, empenhoId);
  }

  /**
   * Mostra detalhes do empenho em um popup (privado)
   */
  async _mostrarDetalhesEmpenho(empenhoId) {
    return EmpenhoListagemLegacySupport.mostrarDetalhesEmpenhoPrivado(this, empenhoId);
  }

  _removerModalDetalhesEmpenho() {
    return EmpenhoListagemLegacySupport.removerModalDetalhesEmpenho();
  }

  /**
   * Abre um empenho existente para edição ou visualização
   * @param {number} empenhoId - ID do empenho
   * @param {boolean} modoVisualizacao - Se true, abre em modo somente leitura
   */
  async abrirEmpenhoParaEdicao(empenhoId, modoVisualizacao = false) {
    return EmpenhoEdicaoSupport.abrirEmpenhoParaEdicao(this, empenhoId, modoVisualizacao);
  }

  /**
   * Aplica modo de visualização (campos desabilitados) ou edição (campos habilitados)
   * @param {boolean} visualizacao - Se true, desabilita campos; se false, habilita
   */
  _aplicarModoVisualizacao(visualizacao) {
    return EmpenhoEdicaoSupport.aplicarModoVisualizacao(this, visualizacao);
  }

  /**
   * Configura uploads de arquivos PDF
   */
  setupFileUploads() {
    return PdfUploadSetupSupport.setupFileUploads(this);
  }

  /**
   * Configura upload de PDF genérico
   */
  setupPDFUpload(uploadBoxId, fileInputId, callback) {
    return PdfUploadSetupSupport.setupPDFUpload(this, uploadBoxId, fileInputId, callback);
  }

  /**
   * Realiza login do usuário
   */
  async realizarLogin(event) {
    return AuthSessionSupport.realizarLogin(this, event);
  }

  showLoginError(message) {
    return AuthFeedbackSupport.showLoginError(this, message);
  }

  formatarMensagemErroLogin(error) {
    return AuthFeedbackSupport.formatarMensagemErroLogin(error);
  }

  /**
   * Realiza logout do sistema
   */
  /**
   * Realiza logout do sistema
   */
  async realizarLogout() {
    return UserSessionSupport.realizarLogout(this);
  }

  /**
   * Atualiza informações do usuário logado no header
   */
  atualizarUsuarioHeader() {
    return UserSessionSupport.atualizarUsuarioHeader(this);
  }

  /**
   * Abre a aba de usuários na tela de configurações
   */
  abrirAbaUsuariosConfiguracao() {
    return UserSessionSupport.abrirAbaUsuariosConfiguracao(this);
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
    return FormSetupSupport.setupForms(this);
  }

  /**
   * Navega para a tela de cadastro de empenho
   * @param {string} telaOrigem - ID da tela de onde veio (para voltar depois)
   */
  navegarParaCadastroEmpenho(telaOrigem = null) {
    return CadastroEmpenhoNavigationSupport.navegarParaCadastroEmpenho(this, telaOrigem);
  }

  /**
   * Cancela o cadastro de empenho e volta para tela anterior
   */
  cancelarCadastroEmpenho() {
    return CadastroEmpenhoNavigationSupport.cancelarCadastroEmpenho(this);
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
    return InitialDataLoader.carregarDadosIniciais(this);
  }

  /**
   * Carrega empenhos nos elementos select
   */
  async carregarEmpenhosSelect() {
    return InitialDataLoader.carregarEmpenhosSelect();
  }

  /**
   * Carrega fornecedores no filtro de relatórios
   */
  async carregarFornecedoresFiltro() {
    return InitialDataLoader.carregarFornecedoresFiltro();
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
    return InputValidator.isValidDate(dateStr);
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
    return EntregaSupport.salvarEntrega(this);
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
    return ScreenNavigation.showScreen(this, screenId);
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
    return ErrorFeedbackSupport.showError(this, message, details);
  }

  /**
   * Mostra mensagem de aviso
   */
  showWarning(message) {
    return ErrorFeedbackSupport.showWarning(this, message);
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
    return ItemRowFactorySupport.criarItemRow(
      this,
      tipo,
      seq,
      descricao,
      unidade,
      quantidade,
      valorUnitario,
      subelemento,
      itemCompra,
      refEmpenho
    );
  }

  /**
   * Atualiza status visual da linha de item NF (ok/warn/bad)
   * @param {HTMLTableRowElement} tr - Linha da tabela
   */
  atualizarStatusLinhaItem(tr) {
    return ItemRowFactorySupport.atualizarStatusLinhaItem(this, tr);
  }

  /**
   * Calcula o valor total do empenho baseado nos itens
   */
  calcularValorTotalEmpenho() {
    return ItemListaEmpenhoSupport.calcularValorTotalEmpenho(this);
  }

  atualizarTotaisEmpenho() {
    return ItemListaEmpenhoSupport.atualizarTotaisEmpenho(this);
  }

  atualizarBadgeStatus() {
    return EmpenhoValidationSupport.atualizarBadgeStatus(this);
  }

  atualizarBotaoValidar() {
    return EmpenhoValidationSupport.atualizarBotaoValidar(this);
  }

  renderItensEmpenho() {
    return ItemListaEmpenhoSupport.renderItensEmpenho(this);
  }

  excluirItemEmpenho(index) {
    return ItemListaEmpenhoSupport.excluirItemEmpenho(this, index);
  }

  reindexarSequenciaEmpenho() {
    return ItemListaEmpenhoSupport.reindexarSequenciaEmpenho(this);
  }

  /**
   * ✅ Abre modal para adicionar/editar item do empenho
   * Usa o módulo NaturezaSubelementos para filtrar opções
   */
  abrirModalItemEmpenho(options = {}) {
    return ItemModalEmpenhoSupport.abrirModalItemEmpenho(this, options);
  }

  /**
   * Helpers de moeda PT-BR para NF
   */
  parseMoneyInputBR(value) {
    return MoneyHelpers.parseMoneyInputBR(value);
  }

  money2(n) {
    return MoneyHelpers.money2(n);
  }

  fmtMoneyBR(n) {
    return MoneyHelpers.fmtMoneyBR(n);
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
    return EntregaSupport.coletarItensRecebidos(containerId);
  }

  /**
   * Carrega itens de um empenho na tela de entrega
   */
  async carregarItensEmpenho(empenhoId) {
    return EntregaSupport.carregarItensEmpenho(empenhoId);
  }

  /**
   * Calcula valor total dos itens
   */
  calcularValorTotalItens(itens) {
    return EntregaSupport.calcularValorTotalItens(itens);
  }

  /**
   * Formata CNPJ durante digitação (event handler)
   */
  formatarCNPJInput(e) {
    return AppDisplayFormatters.formatarCNPJInput(e);
  }

  /**
   * Converte arquivo para Base64
   */
  fileToBase64(file) {
    return AppFormState.fileToBase64(file);
  }

  /**
   * Limpa formulário
   */
  limparFormulario(formId) {
    return AppFormState.limparFormulario(formId);
  }

  /**
   * Reseta o draft de empenho para estado inicial
   */
  _resetarDraftEmpenho() {
    return AppFormState.resetarDraftEmpenho(this);
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
    return AppDisplayFormatters.formatarNumero(valor);
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
    return excluirDocumentoCleanup(this, documentoId, tipo);
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
    return limparRegistrosDeletadosCleanup(this);
  }

  /**
   * Limpa registros órfãos (empenhos/NFs sem arquivo vinculado)
   */
  async limparRegistrosOrfaos() {
    return limparRegistrosOrfaosCleanup(this);
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
