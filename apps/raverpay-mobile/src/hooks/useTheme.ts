// src/hooks/useTheme.ts
import { ThemeContext } from '@/src/contexts/ThemeContext';
import { useContext } from 'react';

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
