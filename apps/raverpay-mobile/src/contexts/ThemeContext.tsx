// src/contexts/ThemeContext.tsx
import { useThemeStore } from '@/src/store/theme.store';
import { colorScheme } from 'nativewind';
import React, { createContext, ReactNode, useEffect } from 'react';
import { Appearance } from 'react-native';

interface ThemeContextType {
  theme: 'light' | 'dark';
  mode: 'light' | 'dark' | 'auto';
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { mode, setMode, getCurrentTheme } = useThemeStore();
  const [theme, setTheme] = React.useState<'light' | 'dark'>(getCurrentTheme());

  const isDark = theme === 'dark';

  // Update theme whenever mode changes
  useEffect(() => {
    const newTheme = getCurrentTheme();
    setTheme(newTheme);
  }, [mode, getCurrentTheme]);

  useEffect(() => {
    // Apply the theme using NativeWind's colorScheme.set()
    // This is the documented API for manual theme toggling
    colorScheme.set(theme);
  }, [theme]);

  useEffect(() => {
    // Listen to system theme changes when in auto mode
    if (mode === 'auto') {
      const subscription = Appearance.addChangeListener(({ colorScheme: systemColorScheme }) => {
        const newTheme = systemColorScheme || 'light';
        colorScheme.set(newTheme);
        setTheme(newTheme);
      });

      return () => {
        subscription.remove();
      };
    }
  }, [mode]);

  const setThemeMode = (newMode: 'light' | 'dark' | 'auto') => {
    setMode(newMode);

    // If not auto, apply theme immediately
    if (newMode !== 'auto') {
      colorScheme.set(newMode);
      setTheme(newMode);
    } else {
      // If auto, get system theme
      const systemTheme = Appearance.getColorScheme() || 'light';
      colorScheme.set(systemTheme);
      setTheme(systemTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
