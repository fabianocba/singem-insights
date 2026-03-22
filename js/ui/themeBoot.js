(() => {
  const STORAGE_KEY = 'singem.theme';
  const VALID_THEMES = new Set(['light', 'dark', 'system']);

  function normalizeTheme(value) {
    const theme = String(value || '')
      .trim()
      .toLowerCase();
    return VALID_THEMES.has(theme) ? theme : 'system';
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function readStoredTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[ThemeBoot] Não foi possível ler a preferência salva:', error);
      return null;
    }
  }

  const preference = normalizeTheme(readStoredTheme());
  const resolvedTheme = preference === 'system' ? getSystemTheme() : preference;
  const root = document.documentElement;

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;
})();
