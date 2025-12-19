'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { UserRole } from '@/types';
import { useState } from 'react';
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
  Percent,
  Banknote,
  Coins,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Wallets',
    href: '/dashboard/wallets',
    icon: Wallet,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Transactions',
    href: '/dashboard/transactions',
    icon: CreditCard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'KYC Verification',
    href: '/dashboard/kyc',
    icon: CheckCircle,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'VTU Orders',
    href: '/dashboard/vtu',
    icon: Smartphone,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Gift Cards',
    href: '/dashboard/giftcards',
    icon: Gift,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Crypto Orders',
    href: '/dashboard/crypto',
    icon: Bitcoin,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Venly Wallets',
    href: '/dashboard/venly-wallets',
    icon: Coins,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Circle USDC',
    href: '/dashboard/circle-wallets',
    icon: CircleDollarSign,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Cashback',
    href: '/dashboard/cashback',
    icon: Percent,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Withdrawal Config',
    href: '/dashboard/withdrawal-config',
    icon: Banknote,
    roles: ['SUPER_ADMIN'],
  },
  {
    name: 'Virtual Accounts',
    href: '/dashboard/virtual-accounts',
    icon: Building2,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Support',
    href: '/dashboard/support',
    icon: Headphones,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Deletions',
    href: '/dashboard/deletions',
    icon: Trash2,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  },
  {
    name: 'Rate Limit',
    href: '/dashboard/rate-limits',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  { name: 'Audit Logs', href: '/dashboard/audit', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['SUPER_ADMIN'] },
  { name: 'Admins', href: '/dashboard/admins', icon: UserCog, roles: ['SUPER_ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userRole = user?.role as UserRole | undefined;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-card border-r transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo & Toggle */}
      <div className="flex h-16 items-center border-b px-4 justify-between">
        {!isCollapsed ? (
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              R
            </div>
            <span className="text-lg font-bold">RaverPay</span>
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              R
            </div>
          </Link>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'rounded-md  p-1.5 hover:bg-accent transition-colors',
            isCollapsed && 'ml-0',
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
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
                'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                isCollapsed ? 'justify-center  rounded-full' : 'rounded-md',
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Role Badge */}
      {userRole && (
        <div className="border-t p-4">
          <div className="flex items-center justify-center">
            {!isCollapsed ? (
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium',
                  userRole === 'SUPER_ADMIN' &&
                    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
                  userRole === 'ADMIN' &&
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
                  userRole === 'SUPPORT' &&
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
                )}
              >
                {userRole.replace('_', ' ')}
              </span>
            ) : (
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  userRole === 'SUPER_ADMIN' && 'bg-purple-500',
                  userRole === 'ADMIN' && 'bg-blue-500',
                  userRole === 'SUPPORT' && 'bg-green-500',
                )}
                title={userRole.replace('_', ' ')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
