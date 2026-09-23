export type ThemeName = 'dark' | 'light';

export const THEME_KEY = 'entrenamiento-theme';

export function readTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'dark';
}

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

export function toggleTheme(): ThemeName {
  const next = readTheme() === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}
