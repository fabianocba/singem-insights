(function () {
  function onDomReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }

    callback();
  }

  function resolveApiBase() {
    if (window.__API_BASE_URL__) {
      return String(window.__API_BASE_URL__).replace(/\/+$/, '');
    }

    if (window.CONFIG?.api?.baseUrl) {
      return String(window.CONFIG.api.baseUrl).replace(/\/+$/, '');
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.origin;
    }

    return window.location.origin;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { method: 'GET' });
    return response.json();
  }

  function bindRedirect(button, url) {
    if (!button) {
      return;
    }

    button.onclick = function (event) {
      event.preventDefault();
      window.location.href = url;
    };
  }

  function disableProvider(button, warning) {
    if (button) {
      button.classList.add('disabled');
    }

    if (warning) {
      warning.classList.add('show');
    }
  }

  function hideProvider(button, separator) {
    if (button) {
      button.classList.add('disabled');
      button.style.display = 'none';
    }

    if (separator) {
      separator.style.display = 'none';
    }
  }

  async function bootstrapGovBr(base) {
    const button = document.getElementById('btnGovBr');
    const warning = document.getElementById('govbrUnavailable');

    if (!button) {
      return;
    }

    try {
      const data = await fetchJson(base + '/api/auth/govbr/status');

      if (data.sucesso && data.govbr && data.govbr.habilitado) {
        bindRedirect(button, base + '/api/auth/govbr/login');
        return;
      }

      disableProvider(button, warning);
    } catch {
      disableProvider(button, warning);
    }
  }

  async function bootstrapSerproID(base) {
    const button = document.getElementById('btnSerproID');
    const warning = document.getElementById('serproidUnavailable');
    const separator = document.getElementById('serproidSeparator');

    if (!button) {
      return;
    }

    try {
      const data = await fetchJson(base + '/api/auth/serproid/status');

      if (data.sucesso && data.serproid && data.serproid.habilitado && data.serproid.configurado) {
        bindRedirect(button, base + '/api/auth/serproid/login');
        return;
      }

      if (data.sucesso && data.serproid && data.serproid.habilitado && !data.serproid.configurado) {
        disableProvider(button, warning);
        return;
      }

      hideProvider(button, separator);
    } catch {
      hideProvider(button, separator);
    }
  }

  function init() {
    const base = resolveApiBase();

    void bootstrapGovBr(base);
    void bootstrapSerproID(base);
  }

  onDomReady(init);
})();
