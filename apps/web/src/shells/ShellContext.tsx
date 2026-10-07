import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Portal } from './navigation';

type Theme = 'dark' | 'light';

interface ShellState {
  portal: Portal;
  setPortal: (p: Portal) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const ShellContext = createContext<ShellState | null>(null);

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  const v = localStorage.getItem(key);
  return (allowed as readonly string[]).includes(v ?? '') ? (v as T) : fallback;
};

/**
 * UI-only shell state. In Phase 1 `portal` is derived from the authenticated
 * principal's role; the switcher remains only for admins (impersonation preview).
 */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [portal, setPortalState] = useState<Portal>(() => read('rd.portal', ['admin', 'reseller', 'customer'], 'admin'));
  const [theme, setTheme] = useState<Theme>(() => read('rd.theme', ['dark', 'light'], 'dark'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('rd.theme', theme);
  }, [theme]);

  const setPortal = useCallback((p: Portal) => {
    setPortalState(p);
    localStorage.setItem('rd.portal', p);
  }, []);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(() => ({ portal, setPortal, theme, toggleTheme }), [portal, setPortal, theme, toggleTheme]);
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used within ShellProvider');
  return ctx;
}
