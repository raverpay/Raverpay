// app/index.tsx
import { toast } from '@/src/lib/utils/toast';
import { useAuthStore } from '@/src/store/auth.store';
import { useUserStore } from '@/src/store/user.store';
import { useWalletStore } from '@/src/store/wallet.store';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const { isAuthenticated, clearTokens } = useAuthStore();
  const { user, clearUser } = useUserStore();
  const { clearWallet } = useWalletStore();

  // console.log('[app/index] Rendering - isAuthenticated:', isAuthenticated, 'user:', user?.email);

  // Check for suspended or inactive accounts
  useEffect(() => {
    if (user && isAuthenticated) {
      if (user.status === 'SUSPENDED') {
        toast.auth.accountSuspended();
        // Auto-logout suspended users
        setTimeout(async () => {
          await clearTokens();
          clearUser();
          clearWallet();
        }, 2000);
      } else if (user.status === 'INACTIVE') {
        toast.auth.accountInactive();
        // Auto-logout inactive users
        setTimeout(async () => {
          await clearTokens();
          clearUser();
          clearWallet();
        }, 2000);
      }
    }
  }, [user, isAuthenticated, clearTokens, clearUser, clearWallet]);

  console.log('[app/index] isAuthenticated:', isAuthenticated, 'user status:', user?.status);

  // If not authenticated, redirect to welcome screen
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // If authenticated, check user status first
  if (user) {
    // Block suspended or inactive users
    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      return <Redirect href="/(auth)/welcome" />;
    }

    // Check email verification status
    if (!user.emailVerified) {
      return <Redirect href="/(auth)/verify-email" />;
    }

    // Check phone verification status
    // if (!user.phoneVerified) {
    //   return <Redirect href="/(auth)/verify-phone" />;
    // }
  }

  // Both email and phone verified - redirect to main app
  return <Redirect href="/(tabs)" />;
}
