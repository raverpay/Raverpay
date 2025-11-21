'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Wallets', href: '/dashboard/wallets', icon: Wallet },
  { name: 'Transactions', href: '/dashboard/transactions', icon: CreditCard },
  { name: 'KYC Verification', href: '/dashboard/kyc', icon: CheckCircle },
  { name: 'VTU Orders', href: '/dashboard/vtu', icon: Smartphone },
  { name: 'Gift Cards', href: '/dashboard/giftcards', icon: Gift },
  { name: 'Crypto Orders', href: '/dashboard/crypto', icon: Bitcoin },
  { name: 'Virtual Accounts', href: '/dashboard/virtual-accounts', icon: Building2 },
  { name: 'Deletions', href: '/dashboard/deletions', icon: Trash2 },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Audit Logs', href: '/dashboard/audit', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Admins', href: '/dashboard/admins', icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();

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
        {navigation.map((item) => {
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
    </div>
  );
}
