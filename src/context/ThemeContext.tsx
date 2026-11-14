import React, { createContext, useContext, useEffect, useEffectEvent, useState } from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'registra-theme';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setTheme: (theme: Theme) => void;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // Ignore storage access failures (private mode, blocked storage, etc.)
  }
  return null;
}

function getSystemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? getSystemTheme() : preference;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

function writeStoredTheme(theme: Theme | null) {
  try {
    if (theme === null) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage write failures
  }
}

function getInitialPreference(): ThemePreference {
  const stored = readStoredTheme();
  return stored ?? 'system';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme(getInitialPreference()));

  const syncTheme = useEffectEvent((nextPreference: ThemePreference) => {
    const nextTheme = resolveTheme(nextPreference);
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  });

  useEffect(() => {
    syncTheme(preference);
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;

    let media: MediaQueryList | null = null;
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }

    const onChange = () => syncTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setTheme = (next: Theme) => {
    writeStoredTheme(next);
    setPreferenceState(next);
  };

  const setPreference = (next: ThemePreference) => {
    if (next === 'system') {
      writeStoredTheme(null);
    } else {
      writeStoredTheme(next);
    }
    setPreferenceState(next);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
