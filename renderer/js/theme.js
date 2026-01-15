(() => {
  const THEME_KEY = 'appTheme';
  const VALID_THEMES = new Set(['light', 'dark']);

  const getStoredTheme = () => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return VALID_THEMES.has(stored) ? stored : null;
    } catch (error) {
      return null;
    }
  };

  const getPreferredTheme = () => {
    const stored = getStoredTheme();
    if (stored) {
      return stored;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }

    return 'dark';
  };

  const updateToggleButtons = (theme) => {
    const buttons = document.querySelectorAll('[data-theme-toggle]');
    if (!buttons.length) return;

    const icon = theme === 'light' ? 'bi-sun-fill' : 'bi-moon-fill';
    const title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';

    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', theme === 'light');
      button.setAttribute('title', title);
      button.innerHTML = `<i class="bi ${icon}"></i>`;
    });
  };

  const applyTheme = (theme, { persist = true } = {}) => {
    const html = document.documentElement;
    const nextTheme = theme === 'light' ? 'light' : 'dark';

    html.classList.toggle('light', nextTheme === 'light');
    html.classList.toggle('dark', nextTheme === 'dark');

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, nextTheme);
      } catch (error) {
        // Ignore storage errors in restricted environments.
      }
    }

    updateToggleButtons(nextTheme);
  };

  const toggleTheme = () => {
    const isLight = document.documentElement.classList.contains('light');
    applyTheme(isLight ? 'dark' : 'light');
  };

  const initThemeToggles = () => {
    const theme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    updateToggleButtons(theme);

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', toggleTheme);
    });
  };

  applyTheme(getPreferredTheme(), { persist: false });

  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggles();
  });

  window.applyTheme = applyTheme;
  window.toggleTheme = toggleTheme;
})();
