const STORAGE_KEY = 'singem.theme';
const VALID_THEMES = new Set(['light', 'dark', 'system']);
const subscribers = new Set();
let mediaQuery = null;
let systemListenerBound = false;

function normalizeTheme(value) {
  const theme = String(value || '').trim().toLowerCase();
  return VALID_THEMES.has(theme) ? theme : 'system';
}

function getSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getRoot() {
  return document.documentElement;
}

function syncLegacyThemeClasses(resolvedTheme) {
  if (!document.body) {
    return;
  }

  document.body.classList.toggle('tema-escuro', resolvedTheme === 'dark');
  document.body.classList.toggle('tema-claro', resolvedTheme !== 'dark');
}

function notifySubscribers(preference, resolvedTheme) {
  subscribers.forEach((callback) => {
    try {
      callback({ preference, resolvedTheme });
    } catch (error) {
      console.warn('[ThemeManager] Falha ao notificar subscriber:', error);
    }
  });
}

export function getThemePreference() {
  try {
    return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.warn('[ThemeManager] Não foi possível ler a preferência salva:', error);
    return 'system';
  }
}

export function resolveTheme(preference = getThemePreference()) {
  const normalizedPreference = normalizeTheme(preference);
  return normalizedPreference === 'system' ? getSystemTheme() : normalizedPreference;
}

export function applyThemePreference(preference, options = {}) {
  const { persist = true, notify = true } = options;
  const normalizedPreference = normalizeTheme(preference);
  const resolvedTheme = resolveTheme(normalizedPreference);
  const root = getRoot();

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = normalizedPreference;
  root.style.colorScheme = resolvedTheme;

  syncLegacyThemeClasses(resolvedTheme);

  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, normalizedPreference);
    } catch (error) {
      console.warn('[ThemeManager] Não foi possível persistir a preferência:', error);
    }
  }

  if (notify) {
    notifySubscribers(normalizedPreference, resolvedTheme);
  }

  return { preference: normalizedPreference, resolvedTheme };
}

function handleSystemThemeChange() {
  if (getThemePreference() === 'system') {
    applyThemePreference('system', { persist: false });
  }
}

export function initTheme() {
  if (!mediaQuery && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }

  if (mediaQuery && !systemListenerBound) {
    const listener = () => handleSystemThemeChange();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(listener);
    }
    systemListenerBound = true;
  }

  return applyThemePreference(getThemePreference(), { persist: false });
}

export function toggleTheme() {
  const currentPreference = getThemePreference();
  const currentTheme = resolveTheme(currentPreference);
  const nextPreference = currentTheme === 'dark' ? 'light' : 'dark';
  return applyThemePreference(nextPreference);
}

export function subscribeToTheme(callback) {
  if (typeof callback !== 'function') {
    return () => {};
  }

  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function getThemeButtonMarkup(preference, resolvedTheme, showLabel) {
  const icon = resolvedTheme === 'dark' ? '☀️' : '🌙';
  const label = showLabel
    ? resolvedTheme === 'dark'
      ? 'Modo escuro'
      : 'Modo claro'
    : '';
  const hint = preference === 'system' ? 'Seguindo sistema' : 'Preferência salva';

  return `
    <span class="sg-theme-toggle__icon" aria-hidden="true">${icon}</span>
    ${showLabel ? `<span class="sg-theme-toggle__label">${label}</span>` : ''}
    <span class="sr-only">Alternar tema</span>
    <span class="sg-theme-toggle__hint">${hint}</span>
  `;
}

export function updateThemeToggle(button, options = {}) {
  if (!button) {
    return;
  }

  const showLabel = options.showLabel === true;
  const preference = getThemePreference();
  const resolvedTheme = resolveTheme(preference);

  button.innerHTML = getThemeButtonMarkup(preference, resolvedTheme, showLabel);
  button.setAttribute('aria-pressed', resolvedTheme === 'dark' ? 'true' : 'false');
  button.dataset.theme = resolvedTheme;
  button.dataset.themePreference = preference;
}

export function mountThemeToggle(button, options = {}) {
  if (!button || button.dataset.themeBound === '1') {
    if (button) {
      updateThemeToggle(button, options);
    }
    return button;
  }

  initTheme();
  button.dataset.themeBound = '1';
  button.classList.add('sg-theme-toggle');
  updateThemeToggle(button, options);

  button.addEventListener('click', () => {
    toggleTheme();
    updateThemeToggle(button, options);
  });

  subscribeToTheme(() => updateThemeToggle(button, options));
  return button;
}

export function createThemeToggleButton(options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options.className || 'sg-theme-toggle';
  button.setAttribute('aria-label', 'Alternar tema');
  mountThemeToggle(button, options);
  return button;
}

export function ensureFloatingThemeToggle() {
  let button = document.querySelector('[data-theme-fab="true"]');
  if (button) {
    mountThemeToggle(button, { showLabel: false });
    return button;
  }

  button = createThemeToggleButton({ showLabel: false, className: 'sg-theme-toggle sg-theme-fab' });
  button.dataset.themeFab = 'true';
  document.body.appendChild(button);
  return button;
}
