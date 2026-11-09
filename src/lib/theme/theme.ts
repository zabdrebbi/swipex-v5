export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'swipex_theme';

const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#ffffff', dark: '#111827' };

export function readSavedMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

export function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved]);
}
