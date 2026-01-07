// store/theme.store.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  getCurrentTheme: () => 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'auto',

      setMode: (mode: ThemeMode) => {
        console.log('[ThemeStore] setMode called:', mode);
        set({ mode });
      },

      getCurrentTheme: () => {
        const state = get();
        // console.log("[ThemeStore] getCurrentTheme called, mode:", state.mode);
        if (state.mode === 'auto') {
          // Use Appearance.getColorScheme() instead of useColorScheme hook
          const systemTheme = Appearance.getColorScheme();
          // console.log("[ThemeStore] Auto mode - system theme:", systemTheme);
          return systemTheme || 'light';
        }
        //  console.log("[ThemeStore] Manual mode - returning:", state.mode);
        return state.mode;
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
