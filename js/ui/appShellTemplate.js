export const APP_SHELL_TEMPLATE = `
<div id="appLayoutRoot" class="app-layout-root">
    <!-- ===================================================
         TOPBAR — sticky, glassmorphism, premium
         =================================================== -->
    <header class="header hidden" id="mainHeader">
      <div class="container">
        <div class="premium-topbar">
          <div class="premium-topbar__left">
            <button
              id="sidebarToggle"
              class="icon-btn"
              type="button"
              aria-label="Alternar navegação lateral"
              aria-expanded="true"
            >
              ☰
            </button>
            <!-- Logo: shows on mobile or when sidebar is collapsed -->
            <div class="logo">
              <div class="logo-mark" aria-hidden="true">SI</div>
              <div class="logo-content">
                <h1>SINGEM</h1>
                <p>IF Baiano</p>
              </div>
            </div>
            <!-- Breadcrumb pill: shows current module on desktop -->
            <span id="currentSectionLabel" class="section-indicator">Painel executivo</span>
          </div>

          <div class="premium-topbar__right">
            <button id="btnHome" class="nav-btn active" type="button" title="Ir para o painel principal">
              <span class="material-symbols-outlined" aria-hidden="true">dashboard</span>
              <span>Painel</span>
            </button>
            <button id="btnConfig" class="nav-btn" type="button" title="Configurações do sistema">
              <span class="material-symbols-outlined" aria-hidden="true">settings</span>
              <span>Config</span>
            </button>
            <span id="topbarVersion" class="sg-badge sg-badge--secondary" title="Versão do sistema">v...</span>
            <button id="themeToggle" type="button" aria-label="Alternar tema claro/escuro" class="sg-theme-toggle">
              <span class="sg-theme-toggle__hint">Tema</span>
            </button>
            <div id="usuarioLogadoInfo" class="usuario-info" role="status" aria-live="polite">
              <span id="usuarioAvatar" class="usuario-avatar" aria-hidden="true">SG</span>
              <div class="usuario-meta">
                <span id="usuarioLogadoNome"></span>
                <small id="usuarioLogadoPerfil">Sessão encerrada</small>
              </div>
            </div>
            <button id="btnSair" class="nav-btn btn-sair" type="button" title="Encerrar sessão">
              <span class="material-symbols-outlined" aria-hidden="true">logout</span>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- ===================================================
         SIDEBAR — dark gradient, fixed, premium navigation
         =================================================== -->
    <aside id="appSidebar" class="app-sidebar hidden" aria-label="Navegação principal do sistema">
      <!-- Brand -->
      <div class="app-sidebar__brand ops-sidebar-brand">
        <div class="logo-mark ops-sidebar-mark" aria-hidden="true">SI</div>
        <div class="app-sidebar__brand-copy">
          <strong>Operação</strong>
          <span>SINGEM</span>
        </div>
      </div>

      <!-- Navigation tree -->
      <nav class="app-sidebar__nav ops-scrollbar" aria-label="Menu principal">
        <button
          type="button"
          class="app-sidebar__link ops-side-link is-active"
          data-nav-screen="homeScreen"
          aria-current="page"
        >
          <span class="material-symbols-outlined" aria-hidden="true">dashboard</span>
          <span>Painel executivo</span>
        </button>

        <span class="app-sidebar__group-label">Núcleo administrativo</span>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="relatoriosScreen">
          <span class="material-symbols-outlined" aria-hidden="true">assessment</span>
          <span>Relatórios</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="configScreen">
          <span class="material-symbols-outlined" aria-hidden="true">settings</span>
          <span>Configurações</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="consultasScreen">
          <span class="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
          <span>Inteligência de compras</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="catalogacaoScreen">
          <span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
          <span>Catalogação</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-href="/system-status/">
          <span class="material-symbols-outlined" aria-hidden="true">analytics</span>
          <span>System Status</span>
        </button>

        <span class="app-sidebar__group-label">Módulos setoriais</span>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="empenhoScreen">
          <span class="material-symbols-outlined" aria-hidden="true">description</span>
          <span>Empenhos</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="notaFiscalScreen">
          <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>
          <span>Notas fiscais</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="almoxarifadoScreen">
          <span class="material-symbols-outlined" aria-hidden="true">warehouse</span>
          <span>Almoxarifado</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="entregaScreen">
          <span class="material-symbols-outlined" aria-hidden="true">local_shipping</span>
          <span>Entregas</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="patrimonioScreen">
          <span class="material-symbols-outlined" aria-hidden="true">account_balance</span>
          <span>Patrimônio</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="veiculosScreen">
          <span class="material-symbols-outlined" aria-hidden="true">directions_car</span>
          <span>Veículos</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="servicosInternosScreen">
          <span class="material-symbols-outlined" aria-hidden="true">build_circle</span>
          <span>Serviços</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="contratosScreen">
          <span class="material-symbols-outlined" aria-hidden="true">assignment</span>
          <span>Contratos</span>
        </button>

        <span class="app-sidebar__group-label">Solicitações gerais</span>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="solicitacaoAlmoxScreen">
          <span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span>
          <span>Solicitação de almox</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="solicitacaoVeiculosScreen">
          <span class="material-symbols-outlined" aria-hidden="true">minor_crash</span>
          <span>Solicitação de veículos</span>
        </button>
        <button type="button" class="app-sidebar__link ops-side-link" data-nav-screen="solicitacaoServicosScreen">
          <span class="material-symbols-outlined" aria-hidden="true">miscellaneous_services</span>
          <span>Solicitação de serviços</span>
        </button>
      </nav>

      <div class="app-sidebar__footer ops-sidebar-footer">
        <button type="button" class="ops-sidebar-offline-btn">
          <span class="material-symbols-outlined" aria-hidden="true">offline_pin</span>
          <span>Fluxo offline-first</span>
        </button>
        <div class="ops-sidebar-status-row">
          <span class="material-symbols-outlined" aria-hidden="true">cloud_done</span>
          <span>Status: Sincronizado</span>
        </div>
      </div>
    </aside>

    <button
      id="sidebarBackdrop"
      class="app-sidebar-backdrop hidden"
      type="button"
      aria-label="Fechar navegação lateral"
    ></button>

    <!-- Main Content -->
    <main class="main" id="appMain">
      <div class="container app-content-container">
        <div id="appContentArea" class="app-content-area">
        <!-- Tela de Login -->
        <section id="loginScreen" class="screen active login-screen">
          <!-- Fundo decorativo -->
          <div class="login-backdrop" aria-hidden="true"></div>
          <div class="login-bg-orb login-bg-orb--1" aria-hidden="true"></div>
          <div class="login-bg-orb login-bg-orb--2" aria-hidden="true"></div>

          <div class="login-container">
            <!-- Badge institucional acima do card -->
            <div class="login-institution-badge" aria-hidden="true">
              <span>🏛️</span>
              <span>Instituto Federal Baiano</span>
            </div>

            <!-- Aviso de ambiente — mostrado por JS em localhost -->
            <div id="loginEnvNotice" class="login-dev-note" style="display:none">
              Ambiente de desenvolvimento — acesso administrativo e Gov.br disponíveis.
            </div>

            <!-- Card principal -->
            <div class="login-card" id="loginCardAdmin">
              <!-- Faixa accent no topo do card -->
              <div class="login-card__accent" aria-hidden="true"></div>

              <!-- Branding: ícone + nome + subtítulo -->
              <div class="login-brand">
                <div class="login-brand__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
                  </svg>
                </div>
                <div class="login-brand__copy">
                  <h1 id="loginUnidadeNome">SINGEM</h1>
                  <p id="loginUnidadeInfo">IF Baiano</p>
                </div>
              </div>

              <div class="login-welcome">
                <h2>Acesse o SINGEM</h2>
                <p>Sistema de Controle de Material</p>
              </div>

              <!-- Formulário de credenciais -->
              <form
                id="loginForm"
                method="POST"
                action="/api/auth/login"
                autocomplete="on"
                class="login-form"
              >
                <div class="login-field">
                  <label for="loginUsuario">Usuário</label>
                  <div class="login-input-wrap">
                    <span class="login-input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21a8 8 0 0 0-16 0"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </span>
                    <input
                      type="text"
                      id="loginUsuario"
                      name="username"
                      placeholder="CPF ou E-mail"
                      autocomplete="username"
                      spellcheck="false"
                    />
                  </div>
                </div>

                <div class="login-field">
                  <div class="login-password-header">
                    <label for="loginSenha">Senha</label>
                    <button type="button" id="btnRecuperarSenha" class="login-aux__link">
                      Esqueci minha senha
                    </button>
                  </div>
                  <div class="login-input-wrap login-input-wrap--password">
                    <span class="login-input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="4" y="11" width="16" height="10" rx="2" ry="2"/>
                        <path d="M8 11V7a4 4 0 1 1 8 0v4"/>
                      </svg>
                    </span>
                    <input
                      type="password"
                      id="loginSenha"
                      name="password"
                      placeholder="••••••••"
                      autocomplete="current-password"
                    />
                    <button
                      type="button"
                      id="toggleLoginSenha"
                      class="login-password-toggle"
                      aria-label="Mostrar senha"
                      aria-pressed="false"
                    >
                      <span id="toggleLoginSenhaIcon" aria-hidden="true">👁</span>
                    </button>
                  </div>
                </div>

                <!-- Row: lembrar usuário + estado interno de compatibilidade -->
                <div class="login-meta-row">
                  <label class="login-checkbox">
                    <input type="checkbox" id="rememberUser" />
                    <span>Lembrar usuário</span>
                  </label>
                  <!-- rememberPass mantido oculto para compatibilidade com authRemember.js -->
                  <input type="checkbox" id="rememberPass" style="display:none" aria-hidden="true" />
                </div>

                <button id="btnLogin" type="submit" class="login-submit">
                  <span>Entrar</span>
                  <span class="login-submit__arrow" aria-hidden="true">→</span>
                </button>
              </form>

              <!-- Mensagem de erro de autenticação -->
              <div id="loginError" class="login-error hidden" role="alert" aria-live="assertive"></div>

              <!-- Gov.br — acesso institucional primário -->
              <div id="loginCardGovBr" class="login-govbr-section">
                <div class="login-divider">
                  <span>Outras formas de acesso</span>
                </div>
                <a id="btnGovBr" href="#" class="btn-govbr" data-prevent-default="true">
                  <img src="img/govbr-logo.svg" alt="Gov.br" class="govbr-logo-img" data-image-fallback=".govbr-logo-fallback" />
                  <span class="govbr-logo-fallback">gov.br</span>
                  <span>Entrar com Gov.br</span>
                </a>
                <div id="govbrUnavailable" class="login-alert login-alert--warn">
                  Login Gov.br indisponível no momento.
                </div>
              </div>

              <!-- SerproID — certificado digital (mostrado/ocultado por authProvidersBootstrap.js) -->
              <div id="serproidSeparator" class="login-serproid">
                <a id="btnSerproID" href="#" class="login-serproid__btn" data-prevent-default="true">
                  <img src="img/icone-serproid-1024px.png" alt="" class="serproid-icon" aria-hidden="true" />
                  <span>Certificado Digital (SerproID)</span>
                </a>
                <div id="serproidUnavailable" class="login-alert login-alert--warn">
                  Certificado digital indisponível no momento.
                </div>
              </div>

              <p class="login-support-text">
                Precisa de ajuda?
                <a href="/docs/GUIA_USO_APLICACAO.md" class="login-aux__link" target="_blank" rel="noopener noreferrer">Suporte Técnico</a>
              </p>
            </div>

            <!-- Rodapé institucional -->
            <footer class="login-footer">
              <p class="login-copyright">
                &copy; 2026 IF Baiano &mdash; Instituto Federal de Educação, Ciência e Tecnologia Baiano
              </p>
              <div class="login-footer-links">
                <a href="/system-status/" target="_blank" rel="noopener noreferrer">Versão 2.4.0</a>
                <a href="/docs/GUIA_USO_APLICACAO.md" target="_blank" rel="noopener noreferrer">Suporte Técnico</a>
                <a href="/README_DOCKER.md" target="_blank" rel="noopener noreferrer">Privacidade</a>
              </div>
            </footer>
          </div>
        </section>

        <!-- Tela Inicial - Menu Principal -->
        <section id="homeScreen" class="screen sg-screen-shell">
          <div class="dashboard-shell ops-dashboard-shell">
            <header class="ops-main-header">
              <div>
                <h2>Painel de Controle</h2>
                <p id="dashboardSubtitle">
                  Bem-vindo ao SINGEM. Gerenciamento institucional de suprimentos.
                </p>
              </div>
              <div class="ops-main-header__meta">
                <button type="button" class="ops-notification-btn" aria-label="Notificações">
                  <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
                </button>
                <div class="ops-user-chip">
                  <span class="ops-user-chip__avatar material-symbols-outlined" aria-hidden="true">person</span>
                  <span>Operador Central</span>
                </div>
              </div>
            </header>

            <section id="dashboardMetrics" class="dashboard-metrics-grid ops-kpi-grid">
              <article class="dashboard-metric-card is-loading">
                <span class="dashboard-metric-label">Empenhos</span>
                <strong class="dashboard-metric-value">--</strong>
                <p class="dashboard-metric-detail">Atualizando painel operacional...</p>
              </article>
              <article class="dashboard-metric-card is-loading">
                <span class="dashboard-metric-label">Notas fiscais</span>
                <strong class="dashboard-metric-value">--</strong>
                <p class="dashboard-metric-detail">Consolidando registros ativos...</p>
              </article>
              <article class="dashboard-metric-card is-loading">
                <span class="dashboard-metric-label">Fornecedores</span>
                <strong class="dashboard-metric-value">--</strong>
                <p class="dashboard-metric-detail">Calculando base ativa...</p>
              </article>
              <article class="dashboard-metric-card is-loading">
                <span class="dashboard-metric-label">Valor empenhado</span>
                <strong class="dashboard-metric-value">--</strong>
                <p class="dashboard-metric-detail">Lendo exposição financeira...</p>
              </article>
            </section>

            <section class="ops-middle-grid">
              <article class="ops-radar-card">
                <div class="ops-radar-card__glow" aria-hidden="true"></div>
                <div class="ops-radar-card__content">
                  <p class="ops-radar-card__title">Radar de Execução</p>
                  <h3 id="dashboardUnitHeading">Carregando base institucional...</h3>
                  <p id="dashboardOperationalPulse">
                    Consolidando empenhos, notas fiscais e inteligência de compras para a unidade ativa.
                  </p>
                  <div class="ops-radar-card__metrics">
                    <div>
                      <span>Validados</span>
                      <strong id="dashboardValidatedCount">--</strong>
                    </div>
                    <div>
                      <span>Rascunhos</span>
                      <strong id="dashboardDraftCount">--</strong>
                    </div>
                    <div>
                      <span>Base ativa</span>
                      <strong id="dashboardSupplierActiveCount">--</strong>
                    </div>
                    <div>
                      <span>Notas fiscais</span>
                      <strong id="dashboardInvoiceCount">--</strong>
                    </div>
                  </div>
                  <p class="ops-radar-card__refresh">Última leitura: <span id="dashboardLastRefresh">--:--</span></p>
                </div>
                <button type="button" class="ops-radar-btn" data-nav-screen="consultasScreen">
                  Abrir cockpit analítico
                  <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </button>
              </article>

              <article class="ops-critical-card">
                <h4>Controles Críticos do Dia</h4>
                <div class="ops-critical-grid">
                  <button type="button" class="ops-critical-item" data-nav-screen="notaFiscalScreen">
                    <span class="ops-critical-icon material-symbols-outlined" aria-hidden="true">track_changes</span>
                    <span class="ops-critical-title">Empenhos & NF</span>
                    <small>Rastreamento automatizado de obrigações fiscais pendentes.</small>
                  </button>
                  <button type="button" class="ops-critical-item" data-nav-screen="consultasScreen">
                    <span class="ops-critical-icon material-symbols-outlined" aria-hidden="true">hub</span>
                    <span class="ops-critical-title">Consulta Unificada</span>
                    <small>Integração direta com bases governamentais e compras.gov.</small>
                  </button>
                  <button type="button" class="ops-critical-item" data-nav-screen="configScreen">
                    <span class="ops-critical-icon material-symbols-outlined" aria-hidden="true">backup</span>
                    <span class="ops-critical-title">Backups & Config</span>
                    <small>Preferências do sistema e integridade de dados locais.</small>
                  </button>
                </div>
              </article>
            </section>

            <div class="welcome ops-area-title">
              <h2>Áreas Operacionais</h2>
              <p>Atalhos priorizados para cadastro, recebimento, inteligência de compras e monitoramento diário.</p>
            </div>

            <div class="menu-grid ops-area-grid">
              <div class="menu-item" data-screen="entregaScreen">
                <div class="menu-icon material-symbols-outlined" aria-hidden="true">move_to_inbox</div>
                <h3>Entrada de Entrega</h3>
                <p>Processamento de recebimento físico de materiais no almoxarifado.</p>
              </div>

              <div class="menu-item" data-screen="notaFiscalScreen">
                <div class="menu-icon material-symbols-outlined" aria-hidden="true">description</div>
                <h3>Entrada de Nota Fiscal</h3>
                <p>Lançamento e conferência de documentos fiscais eletrônicos.</p>
              </div>

              <div class="menu-item" data-screen="almoxarifadoScreen">
                <div class="menu-icon material-symbols-outlined" aria-hidden="true">warehouse</div>
                <h3>Almoxarifado</h3>
                <p>Controle de estoque, inventário e movimentação interna.</p>
              </div>

              <div class="menu-item" id="consultasMenuItem">
                <div class="menu-icon material-symbols-outlined" aria-hidden="true">language</div>
                <h3>Consulte Compras.gov</h3>
                <p>Acesso direto ao portal de compras do governo federal.</p>
              </div>

              <div class="menu-item" data-screen="catalogacaoScreen">
                <div class="menu-icon material-symbols-outlined" aria-hidden="true">fact_check</div>
                <h3>Pedidos de Catalogação</h3>
                <p>Solicitações de novos itens no catálogo institucional.</p>
              </div>

              <div class="menu-item" id="systemStatusMenuItem">
                <div class="menu-icon material-symbols-outlined" aria-hidden="true">dns</div>
                <h3>System Status</h3>
                <p>Monitoramento de servidores e serviços SINGEM ativos.</p>
              </div>
            </div>

            <div class="ops-floating-alert" role="status" aria-live="polite">
              <span class="ops-floating-alert__icon material-symbols-outlined" aria-hidden="true">check_circle</span>
              <div>
                <strong>Sistema Estável</strong>
                <p>Ambiente de produção operando normalmente.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="almoxarifadoScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>🏬 SINGEM Almoxarifado</h2>
          </div>

          <div id="almoxarifadoPageRoot" class="almoxarifado-page-root">
            <p class="sg-inline-loading">Carregando módulo de almoxarifado...</p>
          </div>
        </section>

        <!-- Tela de Pedidos de Catalogação -->
        <section id="catalogacaoScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>📋 Pedidos de Catalogação</h2>
          </div>

          <div id="catalogacaoPedidosContainer" class="catalogacao-wrapper">
            <!-- Conteúdo carregado via JS -->
            <p class="sg-inline-loading">Carregando...</p>
          </div>
        </section>

        <!-- Tela de Consulte Compras.gov -->
        <section id="consultasScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>🔍 Consulte Compras.gov</h2>
          </div>

          <div id="consultasContainer" class="consultas-wrapper">
            <!-- Menu de Consultas (Tela Inicial) -->
            <div id="menuConsultas" class="menu-consultas sg-section-shell">
              <!-- Controle de Modo API -->
              <div id="apiModeControl" class="api-mode-control">
                <label class="api-status-label">
                  <span id="apiStatusText">🌐 Modo: API Real</span>
                </label>
                <button id="btnToggleAPIMode" class="btn btn-sm btn-outline btn-toggle-api">
                  🎭 Alternar para Modo Demo
                </button>
              </div>

              <div class="welcome-consultas">
                <h3>Selecione o tipo de consulta</h3>
                <p>
                  Escolha abaixo a categoria de dados que deseja consultar nos Dados Abertos do
                  Compras.gov.br
                </p>
              </div>

              <div class="menu-grid-consultas">
                <div
                  class="menu-item-consulta"
                  data-consulta="materiais"
                  role="button"
                  tabindex="0"
                >
                  <div class="menu-icon-consulta">📦</div>
                  <h4>Catálogo de Material</h4>
                  <p>Consulte itens do CATMAT por descrição ou código CATMAT</p>
                </div>

                <div class="menu-item-consulta" data-consulta="servicos" role="button" tabindex="0">
                  <div class="menu-icon-consulta">🛠️</div>
                  <h4>Catálogo de Serviço</h4>
                  <p>Consulte serviços do CATSER por grupo e classe</p>
                </div>

                <div
                  class="menu-item-consulta"
                  data-consulta="precos-praticados"
                  role="button"
                  tabindex="0"
                >
                  <div class="menu-icon-consulta">📈</div>
                  <h4>Módulo 3 - Preços Praticados (CATMAT/CATSER)</h4>
                  <p>Pesquisa de preços praticados por código CATMAT/CATSER em compras públicas</p>
                </div>

                <div class="menu-item-consulta" data-consulta="uasg" role="button" tabindex="0">
                  <div class="menu-icon-consulta">🏛️</div>
                  <h4>Consultar UASG</h4>
                  <p>Busque unidades administrativas por código ou UF</p>
                </div>

                <div
                  class="menu-item-consulta"
                  data-consulta="fornecedor"
                  role="button"
                  tabindex="0"
                >
                  <div class="menu-icon-consulta">🏢</div>
                  <h4>Fornecedor</h4>
                  <p>Consulte fornecedores por CNPJ, CPF, natureza jurídica, porte e CNAE</p>
                </div>

                <div class="menu-item-consulta" data-consulta="arp" role="button" tabindex="0">
                  <div class="menu-icon-consulta">📋</div>
                  <h4>ARP - Atas de Preços</h4>
                  <p>Consulte itens de Atas de Registro de Preços</p>
                </div>

                <div class="menu-item-consulta" data-consulta="pncp" role="button" tabindex="0">
                  <div class="menu-icon-consulta">📑</div>
                  <h4>Contratações PNCP</h4>
                  <p>Lei 14.133/2021 - Portal Nacional de Contratações</p>
                </div>

                <div
                  class="menu-item-consulta"
                  data-consulta="legado-licitacoes"
                  role="button"
                  tabindex="0"
                >
                  <div class="menu-icon-consulta">📚</div>
                  <h4>Licitações (Legado)</h4>
                  <p>Consulte licitações do sistema antigo ComprasNet</p>
                </div>

                <div
                  class="menu-item-consulta"
                  data-consulta="legado-itens"
                  role="button"
                  tabindex="0"
                >
                  <div class="menu-icon-consulta">📄</div>
                  <h4>Itens de Licitação (Legado)</h4>
                  <p>Consulte itens de licitações do sistema legado</p>
                </div>
              </div>
            </div>

            <!-- Tela de Consulta (inicialmente oculta) -->
            <div id="telaConsulta" class="tela-consulta hidden sg-section-shell" aria-hidden="true">
              <!-- Breadcrumb / Voltar -->
              <div class="consulta-nav">
                <button id="btnVoltarMenu" class="btn btn-secondary">◀ Voltar ao Menu</button>
                <h3 id="tituloConsulta">Consulta</h3>
              </div>

              <!-- Filtros Dinâmicos -->
              <section class="filters-section">
                <h4>🎛️ Filtros de Busca</h4>
                <div id="filtersContainer">
                  <p class="text-muted">Carregando filtros...</p>
                </div>
              </section>

              <!-- Paginação Superior -->
              <section class="pagination-section">
                <div id="paginationContainer"></div>
              </section>

              <!-- Resultados -->
              <section class="results-section">
                <h4>📋 Resultados</h4>
                <div id="resultsTable">
                  <div class="empty-state">
                    <p>📋 Nenhum resultado ainda.</p>
                    <p class="text-muted">Configure os filtros e clique em "Buscar".</p>
                  </div>
                </div>
              </section>

              <!-- Paginação Inferior -->
              <section class="pagination-section">
                <div id="paginationContainer2"></div>
              </section>
            </div>
          </div>
        </section>

        <!-- Tela de Cadastro de Empenho -->
        <section id="empenhoScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>📝 Gerenciamento de Empenhos</h2>
          </div>

          <!-- Abas de navegação -->
          <div class="tabs-container sg-command-cluster">
            <button class="tab-btn active" data-tab="cadastro">📝 Novo Cadastro</button>
            <button class="tab-btn" data-tab="controle-saldos">📊 Controle de Saldos</button>
            <button class="tab-btn" data-tab="relatorio">📋 Relatório de Empenhos</button>
          </div>

          <!-- Conteúdo: Cadastro -->
          <div class="tab-content active" id="tabCadastro">
            <!-- Lista de Empenhos para Edição -->
            <div id="listaEmpenhosCadastro" class="empenhos-lista-cadastro mb-8">
              <div class="sg-toolbar">
                <h3 class="sg-toolbar__title">📋 Empenhos Cadastrados</h3>
                <div class="sg-toolbar__actions">
                  <input
                    type="text"
                    id="buscaEmpenhoCadastro"
                    placeholder="🔍 Buscar empenho..."
                    class="sg-inline-input"
                  />
                  <select
                    id="filtroAnoCadastro"
                    class="sg-inline-select"
                    aria-label="Filtrar empenhos cadastrados por ano"
                  >
                    <option value="">Todos os anos</option>
                  </select>
                  <button type="button" id="btnNovoEmpenho" class="btn btn-success">
                    ➕ Novo Empenho
                  </button>
                </div>
              </div>
              <div id="empenhosPorAnoCadastro" class="sg-scroll-panel">
                <p class="sg-inline-loading">Carregando empenhos...</p>
              </div>
            </div>

            <hr class="sg-divider" />

            <div class="form-container sg-form-shell">
              <h2 class="sg-section-title">📝 Cadastro Manual de Nota de Empenho</h2>

              <form id="formEmpenho" class="form">
                <!-- CABEÇALHO DO EMPENHO -->
                <fieldset class="sg-fieldset">
                  <legend class="sg-legend">📋 Cabeçalho do Empenho</legend>

                  <div class="form-row">
                    <div class="form-group">
                      <label for="naturezaDespesa">Natureza da Despesa *</label>
                      <select id="naturezaDespesa" required>
                        <option value="">-- Selecione --</option>
                        <option value="339030">339030 - Material de Consumo</option>
                        <option value="449052">449052 - Equipamentos e Material Permanente</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="anoEmpenho">Ano *</label>
                      <input type="number" id="anoEmpenho" required min="2000" max="2099" />
                    </div>
                    <div class="form-group">
                      <label for="numeroEmpenho">Número do Empenho *</label>
                      <input type="text" id="numeroEmpenho" required />
                    </div>
                    <div class="form-group">
                      <label for="dataEmpenho">Data de Emissão *</label>
                      <input type="date" id="dataEmpenho" required />
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group sg-inline-grow">
                      <label for="processoSuapEmpenho">Processo (SUAP)</label>
                      <div class="sg-inline-row">
                        <div class="sg-inline-grow">
                          <input
                            type="text"
                            id="processoSuapEmpenho"
                            placeholder="23000.000000/2024-00"
                          />
                          <small>Informe o processo do SUAP</small>
                        </div>
                        <button
                          type="button"
                          id="btnConsultarProcesso"
                          class="btn btn-secondary whitespace-nowrap px-3 py-2"
                          title="Consultar processo no SUAP"
                        >
                          🔍 Consultar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label for="valorTotalEmpenho">Valor Total do Empenho *</label>
                      <input type="text" id="valorTotalEmpenho" placeholder="0,00" required />
                      <small>Valor fixo do empenho (será comparado com soma dos itens)</small>
                    </div>
                  </div>
                </fieldset>

                <!-- DADOS DO FORNECEDOR -->
                <fieldset class="sg-fieldset">
                  <legend class="sg-legend">🏢 Dados do Fornecedor</legend>

                  <div class="form-row">
                    <div class="form-group">
                      <label for="fornecedorEmpenho">Razão Social *</label>
                      <input type="text" id="fornecedorEmpenho" required />
                    </div>
                    <div class="form-group">
                      <label for="cnpjFornecedor">CNPJ *</label>
                      <input
                        type="text"
                        id="cnpjFornecedor"
                        placeholder="00.000.000/0000-00"
                        required
                      />
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label for="telefoneFornecedor">Telefone</label>
                      <input type="tel" id="telefoneFornecedor" placeholder="(00) 00000-0000" />
                    </div>
                    <div class="form-group">
                      <label for="emailFornecedor">E-mail</label>
                      <input
                        type="email"
                        id="emailFornecedor"
                        placeholder="contato@empresa.com.br"
                      />
                    </div>
                  </div>
                </fieldset>

                <div class="items-section">
                  <div class="items-header items-header-flex">
                    <h3 class="items-title">Itens do Empenho</h3>
                    <span id="badgeStatusEmpenho" class="badge badge-status">RASCUNHO</span>
                  </div>

                  <div id="totaisEmpenho" class="totais-empenho">
                    <div>Valor Total dos itens: <strong id="totalItensValor">R$ 0,00</strong></div>
                    <div>Saldo do Empenho: <strong id="diferencaValor">R$ 0,00</strong></div>
                  </div>

                  <div id="itensEmpenho" class="items-list">
                    <!-- Itens serão adicionados dinamicamente -->
                  </div>

                  <div class="items-actions">
                    <button type="button" id="btnAddItem" class="btn btn-secondary">
                      + Adicionar Item
                    </button>
                    <button type="button" id="btnValidarEmpenho" class="btn btn-success" disabled>
                      ✅ Validar NE
                    </button>
                  </div>
                </div>

                <!-- Seção: Anexar PDF da NE -->
                <div class="anexo-section sg-upload-panel">
                  <div class="sg-toolbar__actions">
                    <button
                      type="button"
                      id="btnAnexarPdfNE"
                      class="btn btn-secondary inline-flex items-center gap-1.5"
                    >
                      📎 Anexar PDF da NE
                    </button>
                    <span id="statusAnexoPdfNE" class="sg-help-text">Nenhum PDF anexado.</span>
                  </div>
                </div>

                <div class="form-actions">
                  <button type="button" id="btnCancelarEmpenho" class="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" class="btn btn-primary">Salvar Empenho</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Conteúdo: Controle de Saldos -->
          <div class="tab-content" id="tabControleSaldos">
            <div id="controleSaldosContainer" class="sg-dynamic-panel-host">
              <!-- Conteúdo será carregado dinamicamente -->
            </div>
          </div>

          <!-- Conteúdo: Relatório (Somente Visualização) -->
          <div class="tab-content" id="tabRelatorio">
            <!-- Seletor de Tipo de Relatório -->
            <div class="relatorio-tipos mb-5 flex flex-wrap gap-2.5">
              <button
                class="btn-tipo-relatorio sg-report-type-button active"
                data-tipo="todos"
                title="Todos os empenhos cadastrados"
              >
                📋 Todos os Empenhos
              </button>
              <button
                class="btn-tipo-relatorio sg-report-type-button"
                data-tipo="ano"
                title="Empenhos filtrados por ano"
              >
                📅 Por Ano
              </button>
              <button
                class="btn-tipo-relatorio sg-report-type-button"
                data-tipo="com-saldo"
                title="Empenhos com saldo disponível"
              >
                💰 Com Saldo
              </button>
              <button
                class="btn-tipo-relatorio sg-report-type-button"
                data-tipo="sem-saldo"
                title="Empenhos totalmente utilizados"
              >
                🔴 Sem Saldo
              </button>
              <button
                class="btn-tipo-relatorio sg-report-type-button"
                data-tipo="rascunho"
                title="Empenhos em fase de cadastro"
              >
                📝 Em Cadastro
              </button>
              <button
                class="btn-tipo-relatorio sg-report-type-button"
                data-tipo="validado"
                title="Empenhos validados e prontos"
              >
                ✅ Validados
              </button>
            </div>

            <!-- Filtros específicos por tipo -->
            <div id="filtrosRelatorioContainer" class="relatorio-header sg-toolbar mb-5">
              <h3 id="tituloRelatorioAtual" class="sg-toolbar__title">📋 Todos os Empenhos</h3>
              <div class="sg-toolbar__actions">
                <input
                  type="text"
                  id="buscaEmpenhoRelatorio"
                  placeholder="🔍 Buscar..."
                  class="sg-inline-input min-w-45"
                />
                <select
                  id="filtroAnoRelatorio"
                  class="sg-inline-select"
                  aria-label="Filtrar relatório de empenhos por ano"
                >
                  <option value="">Todos os anos</option>
                </select>
                <select
                  id="ordenacaoRelatorio"
                  class="sg-inline-select"
                  aria-label="Ordenar relatório de empenhos"
                >
                  <option value="recente">📅 Mais recentes</option>
                  <option value="antigo">📅 Mais antigos</option>
                  <option value="numero">🔢 Por número</option>
                  <option value="valor-desc">💰 Maior valor</option>
                  <option value="valor-asc">💰 Menor valor</option>
                  <option value="saldo-desc">📊 Maior saldo</option>
                  <option value="saldo-asc">📊 Menor saldo</option>
                </select>
                <button
                  id="btnExportarRelatorio"
                  class="btn btn-secondary inline-flex items-center gap-1 px-3 py-2"
                  title="Exportar relatório"
                >
                  📥 Exportar
                </button>
              </div>
            </div>

            <!-- Resumo/Estatísticas -->
            <div id="resumoRelatorio" class="sg-summary-grid">
              <!-- Preenchido dinamicamente -->
            </div>

            <p class="sg-info-note">
              ℹ️ <strong>Modo Visualização:</strong> Para editar empenhos, utilize a aba "Novo
              Cadastro".
            </p>
            <div id="relatorioEmpenhosContainer" class="sg-dynamic-panel-host">
              <!-- Conteúdo será carregado dinamicamente -->
            </div>
          </div>
        </section>

        <!-- Tela de Entrada de Entrega -->
        <section id="entregaScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>📦 Entrada de Entrega</h2>
          </div>

          <div class="form-container sg-form-shell">
            <form id="formEntrega" class="form">
              <div class="form-row">
                <div class="form-group">
                  <label for="empenhoSelect">Selecionar Empenho *</label>
                  <select id="empenhoSelect" required>
                    <option value="">Selecione um empenho...</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="dataEntrega">Data da Entrega *</label>
                  <input type="date" id="dataEntrega" required />
                </div>
              </div>

              <div class="form-group">
                <label for="observacoesEntrega">Observações</label>
                <textarea id="observacoesEntrega" rows="3"></textarea>
              </div>

              <div class="items-section">
                <h3>Itens Recebidos</h3>
                <div id="itensEntrega" class="items-list">
                  <!-- Itens do empenho selecionado aparecerão aqui -->
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Entrega</button>
              </div>
            </form>
          </div>
        </section>

        <!-- Tela de Nota Fiscal -->
        <section id="notaFiscalScreen" class="screen nf-screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>📄 Entrada de Nota Fiscal</h2>
          </div>

          <div class="form-container sg-form-shell">
            <!-- ✅ ENTRADA MANUAL (PADRÃO) - Empenho obrigatório no topo -->
            <div class="nf-empenho-section sg-highlight-panel">
              <h3 class="sg-highlight-title">
                <span>📋</span> 1. Selecione o Empenho (Obrigatório)
              </h3>
              <div class="empenho-select-container sg-highlight-row">
                <select id="empenhoAssociado" class="sg-highlight-select" required>
                  <option value="">Selecione um empenho validado...</option>
                </select>
                <button
                  type="button"
                  id="btnCadastrarEmpenho"
                  class="btn btn-outline"
                  title="Cadastrar novo empenho"
                >
                  + Novo Empenho
                </button>
              </div>
              <div id="infoEmpenhoSelecionado" class="hidden sg-highlight-meta">
                <small class="sg-help-text"
                  >Fornecedor: <strong id="nfFornecedorInfo">-</strong> | CNPJ:
                  <strong id="nfCnpjInfo">-</strong> | Itens:
                  <strong id="nfItensInfo">0</strong></small
                >
              </div>
            </div>

            <!-- Importação Opcional (Colapsável) -->
            <details class="import-opcoes sg-details">
              <summary class="sg-details-summary">
                📥 Importar dados (opcional) - Clique para expandir
              </summary>
              <div class="sg-details-body">
                <div class="opcoes-grid sg-option-grid">
                  <div class="opcao-card sg-option-card" data-opcao="upload" id="opcaoUpload">
                    <div class="opcao-icon">📎</div>
                    <h4>Upload do PDF</h4>
                    <p>Extrair dados do PDF da NF</p>
                  </div>
                  <div class="opcao-card sg-option-card" data-opcao="chave" id="opcaoChave">
                    <div class="opcao-icon">🔑</div>
                    <h4>Chave de Acesso</h4>
                    <p>Buscar via chave de 44 dígitos</p>
                  </div>
                </div>
              </div>
            </details>

            <!-- Área de Upload de PDF -->
            <div class="entrada-content" id="contentUpload">
              <div class="upload-area">
                <div class="upload-box" id="uploadNotaFiscal">
                  <div class="upload-icon">📎</div>
                  <p>Clique ou arraste o PDF da Nota Fiscal</p>
                  <input type="file" id="fileNotaFiscal" accept=".pdf" hidden />
                </div>

                <!-- Área de Preview dos Dados Extraídos -->
                <div id="previewDadosNF" class="preview-dados hidden">
                  <h4 class="preview-title">📋 Dados Extraídos do PDF</h4>

                  <!-- Alerta de Divergência -->
                  <div id="alertaDivergencia" class="alert hidden"></div>

                  <!-- Cabeçalho da NF -->
                  <div class="dados-cabecalho">
                    <h5>📄 Dados do Cabeçalho</h5>
                    <div class="grid-dados-nf">
                      <div>
                        <strong>Número NF:</strong>
                        <span id="previewNumeroNF">-</span>
                      </div>
                      <div>
                        <strong>Data Emissão:</strong>
                        <span id="previewDataNF">-</span>
                      </div>
                      <div>
                        <strong>Nome Fornecedor:</strong>
                        <span id="previewNomeFornecedor">-</span>
                      </div>
                      <div>
                        <strong>CNPJ Emitente:</strong>
                        <span id="previewCNPJEmitente">-</span>
                      </div>
                      <div>
                        <strong>CNPJ Destinatário:</strong>
                        <span id="previewCNPJDestinatario">-</span>
                      </div>
                      <div>
                        <strong>Chave de Acesso:</strong>
                        <span id="previewChaveAcesso">-</span>
                      </div>
                      <div class="valor-total-destaque">
                        <strong>Valor Total:</strong>
                        <span id="previewValorTotal">R$ 0,00</span>
                      </div>
                    </div>
                  </div>

                  <!-- Itens Extraídos -->
                  <div class="dados-itens secao-itens">
                    <h5>📦 Itens/Produtos Extraídos</h5>
                    <div id="tabelaItensExtraidos" class="tabela-itens-container">
                      <!-- Tabela será gerada dinamicamente -->
                    </div>
                  </div>

                  <!-- Resumo da Validação -->
                  <div class="resumo-validacao">
                    <h5>📊 Resumo da Validação</h5>
                    <div class="grid-dados-nf">
                      <div>
                        <strong>Total de Itens:</strong>
                        <span id="resumoTotalItens">0</span>
                      </div>
                      <div>
                        <strong>Valor Total (Cabeçalho):</strong>
                        <span id="resumoValorCabecalho">R$ 0,00</span>
                      </div>
                      <div>
                        <strong>Soma dos Itens:</strong>
                        <span id="resumoSomaItens">R$ 0,00</span>
                      </div>
                      <div>
                        <strong>Diferença:</strong>
                        <span id="resumoDiferenca">R$ 0,00</span>
                      </div>
                    </div>
                  </div>

                  <!-- Ação de Transferir -->
                  <div class="acoes-centralizadas">
                    <button
                      type="button"
                      id="btnTransferirDados"
                      class="btn btn-primary btn-salvar-confirmacao"
                    >
                      ✅ Transferir Dados para Formulário
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Área de Entrada por Chave de Acesso -->
            <div class="entrada-content hidden" id="contentChave">
              <div class="chave-entrada">
                <div class="form-group">
                  <label for="chaveAcessoInput">Chave de Acesso da NF-e (44 dígitos) *</label>
                  <input
                    type="text"
                    id="chaveAcessoInput"
                    placeholder="Digite ou cole a chave de acesso de 44 dígitos"
                    maxlength="60"
                    inputmode="numeric"
                  />
                  <small>Exemplo: 12345678901234567890123456789012345678901234</small>
                </div>
                <div class="chave-actions">
                  <button type="button" id="btnBuscarPorChave" class="btn btn-primary">
                    🔍 Buscar Nota Fiscal
                  </button>
                  <button type="button" id="btnLimparChave" class="btn btn-outline">
                    🗑️ Limpar
                  </button>
                </div>
                <div id="chaveStatus" class="status-message hidden"></div>
              </div>
            </div>

            <form id="formNotaFiscal" class="form">
              <div class="form-row">
                <div class="form-group">
                  <label for="numeroNotaFiscal">Número da Nota Fiscal *</label>
                  <input type="text" id="numeroNotaFiscal" required />
                </div>
                <div class="form-group">
                  <label for="dataNotaFiscal">Data da Nota Fiscal *</label>
                  <input type="date" id="dataNotaFiscal" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="cnpjEmitente">CNPJ Emitente (Fornecedor) *</label>
                  <input type="text" id="cnpjEmitente" placeholder="00.000.000/0000-00" required />
                </div>
                <div class="form-group">
                  <label for="cnpjDestinatario">CNPJ Destinatário *</label>
                  <input
                    type="text"
                    id="cnpjDestinatario"
                    placeholder="00.000.000/0000-00"
                    required
                  />
                  <small>Valida se a NF foi emitida para a instituição correta</small>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="chaveAcesso">Chave de Acesso (opcional)</label>
                  <input
                    type="text"
                    id="chaveAcesso"
                    maxlength="44"
                    placeholder="44 dígitos (opcional)"
                  />
                </div>
                <div class="form-group">
                  <label for="valorTotalNF">Valor Total da NF *</label>
                  <input
                    type="text"
                    id="valorTotalNF"
                    class="input-valor-destaque"
                    placeholder="Digite o valor da NF"
                    required
                  />
                  <small>Informe o valor total conforme a nota fiscal</small>
                </div>
              </div>

              <div class="form-group">
                <label for="empenhoAssociado" class="sg-hidden-label">Empenho Associado</label>
                <!-- Select movido para o topo da tela -->
              </div>

              <div id="divergenciasContainer" class="divergencias hidden">
                <h3>⚠️ Divergências Encontradas</h3>
                <div id="listaDivergencias"></div>
              </div>

              <div class="items-section">
                <div class="nf-items-header">
                  <h3>📦 Itens da Nota Fiscal</h3>
                  <small id="nfItensHint">Selecione um empenho para sugestões de itens</small>
                </div>
                <!-- Datalist para autocompletar itens do empenho -->
                <datalist id="datalistItensEmpenho"></datalist>
                <div class="nf-items-wrap">
                  <!-- Tabela ERP de itens -->
                  <table class="nf-items" id="tabelaItensNF">
                    <thead>
                      <tr>
                        <th class="col-seq">#</th>
                        <th class="col-sub">Subelem.</th>
                        <th class="col-item">Item Cpr.</th>
                        <th class="col-desc">Descrição</th>
                        <th class="col-un">Un</th>
                        <th class="col-qtd">Qtd</th>
                        <th class="col-vlr">Vlr Unit.</th>
                        <th class="col-total">Vlr Total</th>
                        <th class="col-actions"></th>
                      </tr>
                    </thead>
                    <tbody id="itensNotaFiscal">
                      <!-- Itens serão adicionados dinamicamente como <tr> -->
                    </tbody>
                  </table>
                  <!-- Barra fixa de totais (sticky bottom) -->
                  <div class="nf-totals-bar" id="nfTotalsBar">
                    <div class="tot-card">
                      <div class="label">Soma Itens</div>
                      <div class="value" id="nfSomaItensLabel">0,00</div>
                    </div>
                    <div class="tot-card">
                      <div class="label">Total NF (manual)</div>
                      <div class="value" id="nfTotalManualLabel">0,00</div>
                    </div>
                    <div class="tot-card">
                      <div class="label">Diferença</div>
                      <div class="value" id="nfDiferencaLabel">0,00</div>
                    </div>
                    <div class="tot-status ok" id="nfConciliacaoBadge">OK</div>
                  </div>
                </div>
                <div class="sg-inline-actions">
                  <!-- REMOVIDO: Botão manual PROIBIDO - Itens só podem vir do Empenho -->
                  <button type="button" id="btnAddItemFromEmpenho" class="btn btn-primary">
                    📋 Adicionar do Empenho
                  </button>
                </div>

                <!-- Soma dos itens e Diferença -->
                <div class="form-row secao-empenho">
                  <div class="form-group">
                    <label for="somaItensNF" class="label-bold-large"> Soma Total dos Itens </label>
                    <input
                      type="text"
                      id="somaItensNF"
                      class="input-readonly-highlight input-valor-destaque"
                      placeholder="R$ 0,00"
                      readonly
                    />
                  </div>
                  <div class="form-group">
                    <label for="nfDiferenca" class="label-bold-large"
                      >Diferença (Soma - Total)</label
                    >
                    <input
                      type="text"
                      id="nfDiferenca"
                      class="input-readonly-highlight"
                      placeholder="R$ 0,00"
                      readonly
                    />
                  </div>
                  <div class="form-group">
                    <label class="label-bold-large">Status da Validação</label>
                    <div id="divergenciaValor" class="status-validacao"></div>
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary">Cancelar</button>
                <button
                  type="button"
                  id="btnValidarNF"
                  class="btn btn-warning"
                  title="Valida NF contra Empenho vinculado"
                >
                  🔍 Validar NF
                </button>
                <button type="submit" class="btn btn-primary">Salvar Nota Fiscal</button>
              </div>
            </form>

            <!-- Modal de Resultado da Validação -->
            <div id="modalValidacaoNF" class="modal hidden" aria-hidden="true">
              <div class="modal-content sg-modal-wide sg-validation-modal">
                <div class="modal-header">
                  <h3 id="modalValidacaoTitulo" class="sg-modal-heading sg-modal-heading--primary">
                    🔍 Resultado da Validação
                  </h3>
                  <button type="button" class="modal-close" id="btnFecharValidacaoNF">
                    &times;
                  </button>
                </div>
                <div class="modal-body sg-validation-modal__body" id="modalValidacaoBody">
                  <!-- Conteúdo gerado dinamicamente -->
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" id="btnFecharValidacaoNF2">
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Tela de Relatórios -->
        <section id="relatoriosScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>📊 Relatórios</h2>
          </div>

          <div class="reports-container">
            <!-- Acesso a Arquivos (modo banco/API) -->
            <div class="file-management-section">
              <h3>📊 Arquivos e Estatísticas</h3>
              <p class="nf-warning-text">O armazenamento está em modo banco/API.</p>
              <div class="file-management-actions">
                <button id="btnEstatisticasArquivos" class="btn btn-outline">
                  📊 Estatísticas
                </button>
              </div>
              <div id="fileStatsDisplay" class="file-stats hidden">
                <!-- Estatísticas serão exibidas aqui -->
              </div>
            </div>

            <div class="report-filters">
              <div class="form-row">
                <div class="form-group">
                  <label for="filtroDataInicio">Data Início</label>
                  <input type="date" id="filtroDataInicio" />
                </div>
                <div class="form-group">
                  <label for="filtroDataFim">Data Fim</label>
                  <input type="date" id="filtroDataFim" />
                </div>
                <div class="form-group">
                  <label for="filtroFornecedor">Fornecedor</label>
                  <select id="filtroFornecedor">
                    <option value="">Todos os fornecedores</option>
                  </select>
                </div>
              </div>
              <button id="btnFiltrar" class="btn btn-primary">Filtrar</button>
            </div>

            <!-- RELATÓRIOS DINÂMICOS - Nível ERP -->
            <div class="report-section-dynamic">
              <h3>📈 Relatórios Gerenciais</h3>

              <!-- Filtros Dinâmicos -->
              <div class="report-filters" id="reportDynamicFilters">
                <div class="report-filter-group">
                  <label for="filtroReportDateFrom">Data Início</label>
                  <input type="date" id="filtroReportDateFrom" />
                </div>
                <div class="report-filter-group">
                  <label for="filtroReportDateTo">Data Fim</label>
                  <input type="date" id="filtroReportDateTo" />
                </div>
                <div class="report-filter-group">
                  <label for="filtroReportAno">Ano</label>
                  <select id="filtroReportAno">
                    <option value="">Todos</option>
                  </select>
                </div>
                <div class="report-filter-group">
                  <label for="filtroReportFornecedor">Fornecedor</label>
                  <select id="filtroReportFornecedor">
                    <option value="">Todos</option>
                  </select>
                </div>
                <div class="report-filter-group">
                  <label for="filtroReportSubelemento">Subelemento</label>
                  <select id="filtroReportSubelemento">
                    <option value="">Todos</option>
                  </select>
                </div>
              </div>

              <!-- Cards de Relatórios -->
              <div class="report-cards-grid" id="reportCardsContainer">
                <!-- Preenchido via JS -->
              </div>

              <!-- Área de Resultado -->
              <div id="reportResultArea" class="hidden">
                <div id="reportResultContainer"></div>
              </div>
            </div>

            <hr class="my-8 border-slate-200" />

            <!-- Relatórios Legados -->
            <h3 class="mb-4 text-xl font-semibold tracking-tight text-(--sg-text)">
              📋 Relatórios Básicos
            </h3>
            <div class="report-types">
              <div class="report-card" data-report="conferencia">
                <h3>📋 Relatório de Conferência</h3>
                <p>Para envio ao fornecedor baseado nas entregas</p>
                <button class="btn btn-secondary">Gerar</button>
              </div>

              <div class="report-card" data-report="saldos">
                <h3>📊 Controle de Saldos de Empenhos</h3>
                <p>Acompanhamento detalhado de recebimentos por item</p>
                <button class="btn btn-primary">Visualizar</button>
              </div>

              <div class="report-card" data-report="empenhos">
                <h3>📝 Relatório de Empenhos</h3>
                <p>Lista completa de empenhos cadastrados</p>
                <button class="btn btn-secondary">Gerar</button>
              </div>

              <div class="report-card" data-report="entregas">
                <h3>📦 Relatório de Entregas</h3>
                <p>Histórico de recebimentos por período</p>
                <button class="btn btn-secondary">Gerar</button>
              </div>

              <div class="report-card" data-report="divergencias">
                <h3>⚠️ Relatório de Divergências</h3>
                <p>Diferenças entre empenhos e notas fiscais</p>
                <button class="btn btn-secondary">Gerar</button>
              </div>
            </div>

            <div id="reportContent" class="report-content hidden">
              <div class="report-header">
                <h3 id="reportTitle"></h3>
                <div class="report-actions">
                  <button id="btnExportPDF" class="btn btn-primary">📄 Exportar PDF</button>
                  <button id="btnExportCSV" class="btn btn-secondary">📊 Exportar CSV</button>
                  <button id="btnCloseReport" class="btn btn-outline">✕ Fechar</button>
                </div>
              </div>
              <div id="reportData" class="report-data">
                <!-- Dados do relatório aparecerão aqui -->
              </div>
            </div>
          </div>
        </section>

        <!-- Tela de Configurações -->
        <section id="configScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>⚙️ Configurações</h2>
          </div>
          <div class="config-iframe-container">
            <iframe
              id="configIframe"
              src="config/configuracoes.html"
              title="Configurações do Sistema"
              class="config-iframe"
            >
            </iframe>
          </div>
        </section>

        <!-- Tela de Patrimônio -->
        <section id="patrimonioScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>🏗️ Gestão de Patrimônio</h2>
          </div>
          <div class="module-placeholder">
            <div class="module-placeholder__icon">🏗️</div>
            <h3>Gestão de Patrimônio</h3>
            <p>Tombamento, transferência, baixa, localização e inventário patrimonial.</p>
            <span class="module-placeholder__badge">Em desenvolvimento</span>
          </div>
        </section>

        <!-- Tela de Veículos -->
        <section id="veiculosScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>🚗 Gestão de Veículos</h2>
          </div>
          <div class="module-placeholder">
            <div class="module-placeholder__icon">🚗</div>
            <h3>Gestão de Veículos</h3>
            <p>Frota, motoristas, reservas, abastecimentos, manutenção e relatórios.</p>
            <span class="module-placeholder__badge">Em desenvolvimento</span>
          </div>
        </section>

        <!-- Tela de Serviços Internos -->
        <section id="servicosInternosScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>🔧 Gestão de Serviços Internos</h2>
          </div>
          <div class="module-placeholder">
            <div class="module-placeholder__icon">🔧</div>
            <h3>Gestão de Serviços Internos</h3>
            <p>Ordens de serviço, equipes, acompanhamento, encerramento e relatórios.</p>
            <span class="module-placeholder__badge">Em desenvolvimento</span>
          </div>
        </section>

        <!-- Tela de Contratos -->
        <section id="contratosScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>📑 Gestão de Contratos</h2>
          </div>
          <div class="module-placeholder">
            <div class="module-placeholder__icon">📑</div>
            <h3>Gestão de Contratos</h3>
            <p>Vigência, fiscal, aditivos, documentos, alertas e relatórios contratuais.</p>
            <span class="module-placeholder__badge">Em desenvolvimento</span>
          </div>
        </section>

        <!-- Tela de Solicitação de Almoxarifado -->
        <section id="solicitacaoAlmoxScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>📋 Solicitação de Almoxarifado</h2>
          </div>
          <div class="module-placeholder">
            <div class="module-placeholder__icon">📋</div>
            <h3>Solicitação de Almoxarifado</h3>
            <p>Portal de requisição de materiais e acompanhamento de pedidos.</p>
            <span class="module-placeholder__badge">Em desenvolvimento</span>
          </div>
        </section>

        <!-- Tela de Solicitação de Veículos -->
        <section id="solicitacaoVeiculosScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>🚐 Solicitação de Veículos</h2>
          </div>
          <div class="module-placeholder">
            <div class="module-placeholder__icon">🚐</div>
            <h3>Solicitação de Veículos</h3>
            <p>Portal de reservas, deslocamentos e acompanhamento de solicitações.</p>
            <span class="module-placeholder__badge">Em desenvolvimento</span>
          </div>
        </section>

        <!-- Tela de Solicitação de Serviços Internos -->
        <section id="solicitacaoServicosScreen" class="screen sg-screen-shell">
          <div class="screen-header sg-screen-header">
            <button class="btn-back">← Voltar</button>
            <h2>📝 Solicitação de Serviços</h2>
          </div>
          <div class="module-placeholder">
            <div class="module-placeholder__icon">📝</div>
            <h3>Solicitação de Serviços Internos</h3>
            <p>Portal para ordens e demandas de serviços internos.</p>
            <span class="module-placeholder__badge">Em desenvolvimento</span>
          </div>
        </section>
        </div>
      </div>
    </main>
    </div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay hidden">
      <div class="loading-spinner"></div>
      <p>Processando...</p>
    </div>
`;

