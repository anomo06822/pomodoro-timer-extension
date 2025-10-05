import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'themePreference';
const getStorage = () => (typeof chrome !== 'undefined' ? chrome.storage : undefined);

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const ThemeProvider: React.FC<React.PropsWithChildren<{ initialTheme?: ThemePreference }>> = ({
  initialTheme = 'system',
  children,
}) => {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme());

  useEffect(() => {
    const storage = getStorage()?.local;
    if (!storage) {
      return;
    }

    storage.get(THEME_KEY, (result) => {
      const storedTheme = result[THEME_KEY] as ThemePreference | undefined;
      if (storedTheme) {
        setTheme(storedTheme);
      }
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const storage = getStorage()?.local;
    storage?.set({ [THEME_KEY]: theme });
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
