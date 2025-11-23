'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { UserRole } from '@/types';
import {
  LayoutDashboard,
  Users,
  Wallet,
  CreditCard,
  CheckCircle,
  Smartphone,
  Gift,
  Bitcoin,
  Building2,
  Trash2,
  Bell,
  BarChart3,
  FileText,
  Settings,
  UserCog,
  Headphones,
  LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Wallets', href: '/dashboard/wallets', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Transactions', href: '/dashboard/transactions', icon: CreditCard, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'KYC Verification', href: '/dashboard/kyc', icon: CheckCircle, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'VTU Orders', href: '/dashboard/vtu', icon: Smartphone, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Gift Cards', href: '/dashboard/giftcards', icon: Gift, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Crypto Orders', href: '/dashboard/crypto', icon: Bitcoin, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Virtual Accounts', href: '/dashboard/virtual-accounts', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Support', href: '/dashboard/support', icon: Headphones, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Deletions', href: '/dashboard/deletions', icon: Trash2, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Audit Logs', href: '/dashboard/audit', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['SUPER_ADMIN'] },
  { name: 'Admins', href: '/dashboard/admins', icon: UserCog, roles: ['SUPER_ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userRole = user?.role as UserRole | undefined;

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            R
          </div>
          <span className="text-lg font-bold">RaverPay Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Role Badge */}
      {userRole && (
        <div className="border-t p-4">
          <div className="flex items-center justify-center">
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-medium',
              userRole === 'SUPER_ADMIN' && 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
              userRole === 'ADMIN' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
              userRole === 'SUPPORT' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
            )}>
              {userRole.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
