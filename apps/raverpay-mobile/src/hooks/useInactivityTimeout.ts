import { useAuthStore } from '@/src/store/auth.store';
import { useUserStore } from '@/src/store/user.store';
import { useWalletStore } from '@/src/store/wallet.store';
import { useQueryClient } from '@tanstack/react-query';
import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseInactivityTimeoutOptions {
  timeoutMs?: number; // Default: 3 minutes
  enabled?: boolean;
}

/**
 * Hook to handle inactivity timeout
 * Only logs out user after specified time of TRUE inactivity (no navigation, no app usage)
 * Resets on navigation changes and when app returns from background
 */
export const useInactivityTimeout = (options: UseInactivityTimeoutOptions = {}) => {
  const { timeoutMs = 10 * 60 * 1000, enabled = true } = options; // 3 minutes default
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pathname = usePathname(); // Track route changes

  const { isAuthenticated, clearTokens } = useAuthStore();
  const { clearSensitiveUserData } = useUserStore();
  const { clearWallet } = useWalletStore();
  const queryClient = useQueryClient();

  // console.log('[InactivityTimeout] Hook initialized:', {
  //   enabled,
  //   isAuthenticated,
  //   timeoutMs,
  //   pathname,
  //   timeoutMinutes: timeoutMs / 1000 / 60,
  // });

  const logout = useCallback(async () => {
    // console.log('[InactivityTimeout] 🚪 LOGGING OUT due to inactivity');
    // console.log(
    //   '[InactivityTimeout] Last activity was at:',
    //   new Date(lastActivityRef.current).toLocaleTimeString(),
    // );
    // console.log('[InactivityTimeout] Current time:', new Date().toLocaleTimeString());
    // console.log('[InactivityTimeout] Inactive for (ms):', Date.now() - lastActivityRef.current);

    // Clear all auth data
    await clearTokens();
    clearSensitiveUserData();
    clearWallet();
    queryClient.clear();

    // Navigate to welcome/login screen
    router.replace('/(auth)/login');
  }, [clearTokens, clearSensitiveUserData, clearWallet, queryClient]);

  const resetTimeout = useCallback(() => {
    if (!enabled || !isAuthenticated) {
      //console.log('[InactivityTimeout] ⏸️  Reset skipped:', { enabled, isAuthenticated });
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      //console.log('[InactivityTimeout] ⏹️  Cleared existing timeout');
    }

    // Update last activity
    const now = Date.now();
    lastActivityRef.current = now;
    // console.log('[InactivityTimeout] ⏰ Timer RESET at:', new Date(now).toLocaleTimeString());
    // console.log(
    //   '[InactivityTimeout] Will logout at:',
    //   new Date(now + timeoutMs).toLocaleTimeString(),
    // );

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      //console.log('[InactivityTimeout] ⏱️  Timeout triggered - calling logout');
      logout();
    }, timeoutMs);
  }, [enabled, isAuthenticated, timeoutMs, logout]);

  // Reset timeout whenever user navigates (this shows active usage)
  useEffect(() => {
    //console.log('[InactivityTimeout] 🧭 Pathname changed to:', pathname);
    if (enabled && isAuthenticated) {
      //console.log('[InactivityTimeout] ✅ Resetting timer due to navigation');
      resetTimeout();
    } else {
      //console.log('[InactivityTimeout] ❌ Not resetting timer:', { enabled, isAuthenticated });
    }
  }, [pathname, enabled, isAuthenticated, resetTimeout]);

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
      //console.log('[InactivityTimeout] 📱 AppState changed:', {
      //  from: appStateRef.current,
      //  to: nextAppState,
      //});

      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - check if session expired while in background
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        // console.log('[InactivityTimeout] 🔆 App returned to FOREGROUND');
        // console.log('[InactivityTimeout] Time since last activity (ms):', timeSinceLastActivity);
        // console.log('[InactivityTimeout] Timeout threshold (ms):', timeoutMs);

        if (timeSinceLastActivity >= timeoutMs) {
          // User was away for too long
          //console.log('[InactivityTimeout] ❌ Session EXPIRED - user was away too long');
          logout();
        } else {
          // Reset timeout - user is back and using the app
          //console.log('[InactivityTimeout] ✅ Session still valid - resetting timer');
          resetTimeout();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - record the time but keep timeout running
        // If they're gone too long, logout will trigger when they return
        const now = Date.now();
        lastActivityRef.current = now;
        //console.log(
        //  '[InactivityTimeout] 🌙 App went to BACKGROUND at:',
        //  new Date(now).toLocaleTimeString(),
        //);
      }

      appStateRef.current = nextAppState;
    });

    return () => {
     //  console.log('[InactivityTimeout] 🧹 Cleanup - removing listeners');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        //console.log('[InactivityTimeout] Cleared timeout on cleanup');
      }
      subscription.remove();
    };
  }, [enabled, isAuthenticated, timeoutMs, resetTimeout, logout]);

  return {
    resetTimeout,
    lastActivity: lastActivityRef.current,
  };
};
