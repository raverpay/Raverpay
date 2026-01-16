'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { PasswordChangeModal } from '@/components/security/password-change-modal';
import { authApi } from '@/lib/api/auth';
import { toast } from 'sonner';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/circle-challenge', '/circle-modular'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [passwordChangeToken, setPasswordChangeToken] = useState<string | null>(null);

  useEffect(() => {
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // Redirect to login if not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
      return;
    }

    // Redirect to dashboard if authenticated and trying to access login/forgot-password
    // But allow stay on circle-challenge even if authenticated
    if (
      isAuthenticated &&
      isPublicRoute &&
      pathname !== '/circle-challenge' &&
      pathname !== '/circle-modular'
    ) {
      router.push('/dashboard');
      return;
    }

    // Check if user has admin role
    if (isAuthenticated && user) {
      const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'];
      if (!allowedRoles.includes(user.role)) {
        // User doesn't have admin access
        useAuthStore.getState().clearAuth();
        router.push('/login');
        return;
      }

      // Check if password change is required (for admin users)
      // Note: This is a fallback - password change should be handled during login
      // But if user somehow gets past login with mustChangePassword=true, block them here
      if (user.mustChangePassword && !isPublicRoute) {
        // Try to get password change token from localStorage or generate one
        // For now, redirect to login - the login flow will handle it
        toast.error('Password change required', {
          description: 'Please log in again to change your password',
        });
        useAuthStore.getState().clearAuth();
        router.push('/login');
        return;
      }
    }
  }, [isAuthenticated, pathname, router, user]);

  return (
    <>
      {children}
      {/* Password Change Modal - fallback if needed */}
      {passwordChangeRequired && passwordChangeToken && (
        <PasswordChangeModal
          open={passwordChangeRequired}
          passwordChangeToken={passwordChangeToken}
          onSuccess={() => {
            setPasswordChangeRequired(false);
            setPasswordChangeToken(null);
            router.push('/dashboard');
          }}
        />
      )}
    </>
  );
}
