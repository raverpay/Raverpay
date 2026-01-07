// store/auth.store.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SECURE_KEYS, secureStorage } from '../lib/storage/secure-store';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setTokens: (access: string, refresh: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setTokens: async (access: string, refresh: string) => {
        try {
          // console.log('[AuthStore] setTokens called');
          // Store in secure storage
          await secureStorage.setItem(SECURE_KEYS.ACCESS_TOKEN, access);
          await secureStorage.setItem(SECURE_KEYS.REFRESH_TOKEN, refresh);

          set({
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
          });
          // console.log('[AuthStore] Tokens set successfully, isAuthenticated set to true');
        } catch (error) {
          console.error('[AuthStore] Error setting tokens:', error);
          throw error;
        }
      },

      clearTokens: async () => {
        try {
          // console.log('[AuthStore] clearTokens called');
          await secureStorage.removeItem(SECURE_KEYS.ACCESS_TOKEN);
          await secureStorage.removeItem(SECURE_KEYS.REFRESH_TOKEN);

          set({
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          // console.log('[AuthStore] Tokens cleared successfully, isAuthenticated set to false');
        } catch (error) {
          console.error('[AuthStore] Error clearing tokens:', error);
          throw error;
        }
      },

      logout: async () => {
        try {
          await get().clearTokens();
          // Clear other stores if needed
        } catch (error) {
          console.error('Error during logout:', error);
          throw error;
        }
      },

      initialize: async () => {
        try {
          const accessToken = await secureStorage.getItem(SECURE_KEYS.ACCESS_TOKEN);
          const refreshToken = await secureStorage.getItem(SECURE_KEYS.REFRESH_TOKEN);

          set({
            accessToken,
            refreshToken,
            isAuthenticated: !!(accessToken && refreshToken),
            isLoading: false,
          });
        } catch (error) {
          console.error('Error initializing auth:', error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist tokens in AsyncStorage (use SecureStore instead)
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
