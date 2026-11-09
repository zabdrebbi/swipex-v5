import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readSavedMode,
  resolveMode,
  type ResolvedTheme,
  type ThemeMode,
} from './theme';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readSavedMode);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveMode(mode));

  useEffect(() => {
    const update = () => {
      const next = resolveMode(mode);
      setResolved(next);
      applyTheme(next);
    };
    update();
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: keep the in-memory choice */
    }
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
