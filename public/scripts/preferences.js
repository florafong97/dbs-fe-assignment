// Runs before styles and app startup to prevent a flash on reload.
// Keep storage keys in sync with src/hooks/usePreferences.ts.
(() => {
  let theme;
  let segment;
  try {
    theme = localStorage.getItem('meridian.theme.v1');
    segment = localStorage.getItem('meridian.segment.v1');
  } catch {
    // Fall back to system theme and the default segment.
  }
  document.documentElement.dataset.theme = theme === 'light' || theme === 'dark'
    ? theme
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.segment = segment === 'premium' ? 'premium' : 'retail';
})();
