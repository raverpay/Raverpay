'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/circle-challenge', '/circle-modular'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // Redirect to login if not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
      return;
    }

    // Redirect to dashboard if authenticated and trying to access login/forgot-password
    // But allow stay on circle-challenge even if authenticated
    if (isAuthenticated && isPublicRoute && pathname !== '/circle-challenge' && pathname !== '/circle-modular') {
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
      }
    }
  }, [isAuthenticated, pathname, router, user]);

  return <>{children}</>;
}
