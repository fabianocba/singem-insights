export const LOGIN_SHELL_TEMPLATE = `
<div class="login-shell" id="loginShell">
  <section id="loginScreen" class="screen active login-screen">
    <div class="login-backdrop" aria-hidden="true"></div>
    <div class="login-bg-orb login-bg-orb--1" aria-hidden="true"></div>
    <div class="login-bg-orb login-bg-orb--2" aria-hidden="true"></div>

    <div class="login-container">
      <div class="login-institution-badge" aria-hidden="true">
        <span class="material-symbols-outlined" aria-hidden="true">account_balance</span>
        <span>Instituto Federal Baiano</span>
      </div>

      <div id="loginEnvNotice" class="login-dev-note" style="display:none">
        Ambiente de desenvolvimento — acesso administrativo e Gov.br disponíveis.
      </div>

      <div class="login-card" id="loginCardAdmin">
        <div class="login-card__accent" aria-hidden="true"></div>

        <div class="login-brand">
          <img src="img/LOGO COMPLETA.png" alt="SINGEM - Sistema Integrado de Gestão de Materiais e Logística" class="login-brand__img" />
          <div class="login-brand__unit">
            <p id="loginUnidadeNome">IF Baiano</p>
            <small id="loginUnidadeInfo">Campus Guanambi</small>
          </div>
        </div>

        <div class="login-welcome">
          <h2>Acesse o SINGEM</h2>
          <p>Sistema de Controle de Material</p>
        </div>

        <form id="loginForm" method="POST" action="/api/auth/login" autocomplete="on" class="login-form">
          <div class="login-field">
            <label for="loginUsuario">Usuário</label>
            <div class="login-input-wrap">
              <span class="login-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input type="text" id="loginUsuario" name="username" placeholder="CPF ou E-mail" autocomplete="username" spellcheck="false" />
            </div>
          </div>

          <div class="login-field">
            <div class="login-password-header">
              <label for="loginSenha">Senha</label>
              <button type="button" id="btnRecuperarSenha" class="login-aux__link">Esqueci minha senha</button>
            </div>
            <div class="login-input-wrap login-input-wrap--password">
              <span class="login-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2" ry="2"/>
                  <path d="M8 11V7a4 4 0 1 1 8 0v4"/>
                </svg>
              </span>
              <input type="password" id="loginSenha" name="password" placeholder="••••••••" autocomplete="current-password" />
              <button type="button" id="toggleLoginSenha" class="login-password-toggle" aria-label="Mostrar senha" aria-pressed="false">
                <span id="toggleLoginSenhaIcon" aria-hidden="true">👁</span>
              </button>
            </div>
          </div>

          <div class="login-meta-row">
            <label class="login-checkbox">
              <input type="checkbox" id="rememberUser" />
              <span>Lembrar usuário</span>
            </label>
            <input type="checkbox" id="rememberPass" style="display:none" aria-hidden="true" />
          </div>

          <button id="btnLogin" type="submit" class="login-submit">
            <span>Entrar</span>
            <span class="login-submit__arrow" aria-hidden="true">→</span>
          </button>
        </form>

        <div id="loginError" class="login-error hidden" role="alert" aria-live="assertive"></div>

        <div id="loginCardGovBr" class="login-govbr-section">
          <div class="login-divider">
            <span>Outras formas de acesso</span>
          </div>

          <button type="button" id="btnGovBr" class="btn-govbr-login">
            <span>Entrar com Gov.br</span>
          </button>
          <div id="govbrUnavailable" class="login-provider-unavailable">Gov.br indisponível no momento.</div>

          <div id="serproidSeparator" class="login-divider login-divider--thin">
            <span>ou</span>
          </div>

          <button type="button" id="btnSerproID" class="btn-govbr-login btn-serproid-login">
            <span>Entrar com SerproID</span>
          </button>
          <div id="serproidUnavailable" class="login-provider-unavailable">SerproID indisponível no momento.</div>
        </div>
      </div>
    </div>
  </section>
</div>
`;
