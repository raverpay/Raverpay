// hooks/useSessionTimeout.ts
import { useAuthStore } from '@/src/store/auth.store';
import { useUserStore } from '@/src/store/user.store';
import { useWalletStore } from '@/src/store/wallet.store';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseSessionTimeoutOptions {
  timeoutMs?: number; // Default: 30 minutes
  enabled?: boolean;
}

export const useSessionTimeout = (options: UseSessionTimeoutOptions = {}) => {
  const { timeoutMs = 30 * 60 * 1000, enabled = true } = options; // 30 minutes default
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const { isAuthenticated, clearTokens } = useAuthStore();
  const { clearSensitiveUserData } = useUserStore();
  const { clearWallet } = useWalletStore();
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    //console.log('[SessionTimeout] Logging out due to inactivity');

    // Clear all auth data
    await clearTokens();
    // Clear sensitive user data but retain display info (name, email, avatar)
    clearSensitiveUserData();
    // Clear wallet data (sensitive financial information)
    clearWallet();
    queryClient.clear();
  }, [clearTokens, clearSensitiveUserData, clearWallet, queryClient]);

  const resetTimeout = useCallback(() => {
    if (!enabled || !isAuthenticated) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update last activity
    lastActivityRef.current = Date.now();

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      //  console.log("[SessionTimeout] Session expired due to inactivity");
      logout();
    }, timeoutMs);
  }, [enabled, isAuthenticated, timeoutMs, logout]);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      // Clear timeout if disabled or not authenticated
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Initialize timeout
    resetTimeout();

    // Listen to app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - check if session expired
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;

        if (timeSinceLastActivity >= timeoutMs) {
          // console.log(
          //   "[SessionTimeout] Session expired while app was in background"
          // );
          logout();
        } else {
          // Reset timeout for remaining time
          resetTimeout();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - record time
        lastActivityRef.current = Date.now();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.remove();
    };
  }, [enabled, isAuthenticated, timeoutMs, resetTimeout, logout]);

  return {
    resetTimeout,
    lastActivity: lastActivityRef.current,
  };
};
