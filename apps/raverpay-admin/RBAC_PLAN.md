# Role-Based Access Control (RBAC) Plan

## Overview

This document outlines the role-based access control implementation for the RaverPay Admin Dashboard.

## User Roles

### 1. SUPER_ADMIN

**Full Access** - Can perform all operations across the platform.

- Full access to all dashboard pages
- Can manage other admins (create, edit, delete)
- Can perform destructive operations (deletions, reversals)
- Can modify platform settings
- Can view all audit logs
- Can broadcast notifications to all users

### 2. ADMIN

**Management Access** - Can perform most administrative operations except admin management.

- Full access to most dashboard pages
- Cannot manage other admin users
- Can approve/reject KYC, orders, deletions
- Can reverse transactions
- Can send notifications
- Can view audit logs
- Cannot modify critical platform settings

### 3. SUPPORT

**Read & Limited Write Access** - Primarily viewing and support operations.

- Read access to users, transactions, orders
- Can view KYC details but cannot approve/reject
- Can view orders but cannot approve/reject
- Cannot access sensitive areas (Audit Logs, Settings, Admins)
- Cannot perform financial operations (refunds, reversals)
- Cannot send broadcast notifications

## Page Access Matrix

| Page             | SUPER_ADMIN | ADMIN     | SUPPORT   |
| ---------------- | ----------- | --------- | --------- |
| Dashboard        | Full        | Full      | Full      |
| Users            | Full        | Full      | View Only |
| Wallets          | Full        | Full      | View Only |
| Transactions     | Full        | Full      | View Only |
| KYC Verification | Full        | Full      | View Only |
| VTU Orders       | Full        | Full      | View Only |
| Gift Cards       | Full        | Full      | View Only |
| Crypto Orders    | Full        | Full      | View Only |
| Virtual Accounts | Full        | Full      | View Only |
| Deletions        | Full        | Full      | No Access |
| Notifications    | Full        | Full      | View Only |
| Analytics        | Full        | Full      | View Only |
| Audit Logs       | Full        | Full      | No Access |
| Settings         | Full        | No Access | No Access |
| Admins           | Full        | No Access | No Access |

## Action Permissions

### User Management

| Action             | SUPER_ADMIN | ADMIN | SUPPORT |
| ------------------ | ----------- | ----- | ------- |
| View users         | Yes         | Yes   | Yes     |
| Update user role   | Yes         | Yes   | No      |
| Update user status | Yes         | Yes   | No      |
| Update KYC tier    | Yes         | Yes   | No      |

### Financial Operations

| Action                | SUPER_ADMIN | ADMIN | SUPPORT |
| --------------------- | ----------- | ----- | ------- |
| View transactions     | Yes         | Yes   | Yes     |
| Reverse transaction   | Yes         | Yes   | No      |
| Adjust wallet balance | Yes         | Yes   | No      |
| Process refunds       | Yes         | Yes   | No      |

### KYC Operations

| Action          | SUPER_ADMIN | ADMIN | SUPPORT |
| --------------- | ----------- | ----- | ------- |
| View KYC        | Yes         | Yes   | Yes     |
| Approve BVN/NIN | Yes         | Yes   | No      |
| Reject BVN/NIN  | Yes         | Yes   | No      |

### Order Operations (VTU, Gift Cards, Crypto)

| Action         | SUPER_ADMIN | ADMIN | SUPPORT |
| -------------- | ----------- | ----- | ------- |
| View orders    | Yes         | Yes   | Yes     |
| Approve orders | Yes         | Yes   | No      |
| Reject orders  | Yes         | Yes   | No      |
| Refund orders  | Yes         | Yes   | No      |

### Deletion Operations

| Action                 | SUPER_ADMIN | ADMIN | SUPPORT |
| ---------------------- | ----------- | ----- | ------- |
| View deletion requests | Yes         | Yes   | No      |
| Approve deletions      | Yes         | Yes   | No      |
| Reject deletions       | Yes         | Yes   | No      |

### Notification Operations

| Action               | SUPER_ADMIN | ADMIN | SUPPORT |
| -------------------- | ----------- | ----- | ------- |
| View notifications   | Yes         | Yes   | Yes     |
| Send to user         | Yes         | Yes   | No      |
| Broadcast to all     | Yes         | No    | No      |
| Delete notifications | Yes         | No    | No      |

### Admin Management

| Action       | SUPER_ADMIN | ADMIN | SUPPORT |
| ------------ | ----------- | ----- | ------- |
| View admins  | Yes         | No    | No      |
| Create admin | Yes         | No    | No      |
| Edit admin   | Yes         | No    | No      |
| Delete admin | Yes         | No    | No      |

### Settings

| Action          | SUPER_ADMIN | ADMIN | SUPPORT |
| --------------- | ----------- | ----- | ------- |
| View settings   | Yes         | No    | No      |
| Modify settings | Yes         | No    | No      |

## Implementation

### Frontend Implementation

1. **Sidebar Visibility** - Navigation items will be filtered based on user role
2. **Page Guards** - Each page will check user permissions before rendering
3. **Action Buttons** - Conditional rendering of action buttons based on permissions
4. **API Protection** - Backend validates all requests against user role

### Permission Hook (usePermissions)

```typescript
const usePermissions = () => {
  const { user } = useAuthStore();

  return {
    canManageUsers: ['SUPER_ADMIN', 'ADMIN'].includes(user?.role),
    canManageAdmins: user?.role === 'SUPER_ADMIN',
    canAccessSettings: user?.role === 'SUPER_ADMIN',
    canAccessAuditLogs: ['SUPER_ADMIN', 'ADMIN'].includes(user?.role),
    canAccessDeletions: ['SUPER_ADMIN', 'ADMIN'].includes(user?.role),
    canApproveOrders: ['SUPER_ADMIN', 'ADMIN'].includes(user?.role),
    canBroadcastNotifications: user?.role === 'SUPER_ADMIN',
    canReverseTransactions: ['SUPER_ADMIN', 'ADMIN'].includes(user?.role),
    isReadOnly: user?.role === 'SUPPORT',
  };
};
```

### Sidebar Configuration

```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  { name: 'Users', href: '/dashboard/users', roles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
  // ... other items with role restrictions
  { name: 'Settings', href: '/dashboard/settings', roles: ['SUPER_ADMIN'] },
  { name: 'Admins', href: '/dashboard/admins', roles: ['SUPER_ADMIN'] },
];
```
