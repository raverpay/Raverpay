import { useAuthStore } from './auth-store';
import { UserRole } from '@/types';

export interface Permissions {
  // Page access
  canAccessDashboard: boolean;
  canAccessUsers: boolean;
  canAccessWallets: boolean;
  canAccessTransactions: boolean;
  canAccessKYC: boolean;
  canAccessVTU: boolean;
  canAccessGiftCards: boolean;
  canAccessCrypto: boolean;
  canAccessVirtualAccounts: boolean;
  canAccessDeletions: boolean;
  canAccessNotifications: boolean;
  canAccessAnalytics: boolean;
  canAccessAuditLogs: boolean;
  canAccessSettings: boolean;
  canAccessAdmins: boolean;
  canAccessSupport: boolean;

  // Action permissions
  canManageUsers: boolean;
  canManageAdmins: boolean;
  canApproveKYC: boolean;
  canApproveOrders: boolean;
  canApproveDeletions: boolean;
  canReverseTransactions: boolean;
  canAdjustWallets: boolean;
  canSendNotifications: boolean;
  canBroadcastNotifications: boolean;
  canDeleteNotifications: boolean;
  canModifySettings: boolean;
  canManageHelpCenter: boolean;
  canManageCannedResponses: boolean;

  // General
  isReadOnly: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isSupport: boolean;
}

export const usePermissions = (): Permissions => {
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN';
  const isSupport = role === 'SUPPORT';
  const isAdminOrAbove = isSuperAdmin || isAdmin;

  return {
    // Page access - All admin roles can access most pages
    canAccessDashboard: true,
    canAccessUsers: true,
    canAccessWallets: true,
    canAccessTransactions: true,
    canAccessKYC: true,
    canAccessVTU: true,
    canAccessGiftCards: true,
    canAccessCrypto: true,
    canAccessVirtualAccounts: true,
    canAccessDeletions: isAdminOrAbove,
    canAccessNotifications: true,
    canAccessAnalytics: true,
    canAccessAuditLogs: isAdminOrAbove,
    canAccessSettings: isSuperAdmin,
    canAccessAdmins: isSuperAdmin,
    canAccessSupport: true, // All roles can access support

    // Action permissions
    canManageUsers: isAdminOrAbove,
    canManageAdmins: isSuperAdmin,
    canApproveKYC: isAdminOrAbove,
    canApproveOrders: isAdminOrAbove,
    canApproveDeletions: isAdminOrAbove,
    canReverseTransactions: isAdminOrAbove,
    canAdjustWallets: isAdminOrAbove,
    canSendNotifications: isAdminOrAbove,
    canBroadcastNotifications: isSuperAdmin,
    canDeleteNotifications: isSuperAdmin,
    canModifySettings: isSuperAdmin,
    canManageHelpCenter: isAdminOrAbove, // Admin and Super Admin can manage help center
    canManageCannedResponses: true, // All support roles can manage canned responses

    // General
    isReadOnly: isSupport,
    isSuperAdmin,
    isAdmin,
    isSupport,
  };
};

// Navigation items with role restrictions
export interface NavItem {
  name: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export const getNavigationForRole = (role: UserRole | undefined): NavItem[] => {
  const allNavigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: 'LayoutDashboard',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Users',
      href: '/dashboard/users',
      icon: 'Users',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Wallets',
      href: '/dashboard/wallets',
      icon: 'Wallet',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Transactions',
      href: '/dashboard/transactions',
      icon: 'CreditCard',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'KYC Verification',
      href: '/dashboard/kyc',
      icon: 'CheckCircle',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'VTU Orders',
      href: '/dashboard/vtu',
      icon: 'Smartphone',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Gift Cards',
      href: '/dashboard/giftcards',
      icon: 'Gift',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Crypto Orders',
      href: '/dashboard/crypto',
      icon: 'Bitcoin',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Virtual Accounts',
      href: '/dashboard/virtual-accounts',
      icon: 'Building2',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Support',
      href: '/dashboard/support',
      icon: 'Headphones',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Deletions',
      href: '/dashboard/deletions',
      icon: 'Trash2',
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: 'Bell',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: 'BarChart3',
      roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
    },
    {
      name: 'Audit Logs',
      href: '/dashboard/audit',
      icon: 'FileText',
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    { name: 'Settings', href: '/dashboard/settings', icon: 'Settings', roles: ['SUPER_ADMIN'] },
    { name: 'Admins', href: '/dashboard/admins', icon: 'UserCog', roles: ['SUPER_ADMIN'] },
  ];

  if (!role) return [];

  return allNavigation.filter((item) => item.roles.includes(role));
};
