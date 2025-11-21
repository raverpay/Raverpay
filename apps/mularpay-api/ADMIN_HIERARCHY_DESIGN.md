# MularPay Admin Hierarchy & Permissions System

## Admin Roles & Hierarchy

### 1. SUPER_ADMIN (Highest Level)
- **Created**: First admin account or manually set in database
- **Capabilities**:
  - Full system access
  - Create, edit, delete other admins (ADMIN and SUPPORT)
  - Cannot be demoted by anyone except another SUPER_ADMIN
  - Modify all system settings
  - Access all endpoints
  - Delete or modify any data
  - View all audit logs including other admin actions

### 2. ADMIN (Management Level)
- **Created by**: SUPER_ADMIN only
- **Capabilities**:
  - Manage users (suspend, ban, KYC approval)
  - Manage transactions (reverse, retry)
  - Manage orders (VTU, gift cards, crypto)
  - View analytics and reports
  - Send notifications
  - Cannot create or modify other admins
  - Cannot change system settings (fees, limits, etc.)
  - Cannot delete other admins
  - View audit logs (limited to user actions, not admin actions)

### 3. SUPPORT (Support Level)
- **Created by**: SUPER_ADMIN only
- **Capabilities**:
  - View-only access to most data
  - Can approve KYC verifications
  - Can refund VTU orders
  - Can send notifications to individual users
  - Cannot suspend/ban users
  - Cannot reverse transactions
  - Cannot access system settings
  - Cannot view sensitive data (BVN, NIN, card details)
  - Limited audit log access (only their own actions)

---

## Role Enum Update

We'll update the Prisma schema to add SUPER_ADMIN:

```prisma
enum UserRole {
  USER
  SUPPORT
  ADMIN
  SUPER_ADMIN
}
```

---

## Permission System

### Hierarchical Protection Rules

1. **SUPER_ADMIN Protection**:
   - Only SUPER_ADMIN can modify another SUPER_ADMIN
   - SUPER_ADMIN cannot be demoted by ADMIN or SUPPORT
   - At least one SUPER_ADMIN must exist in the system

2. **ADMIN Protection**:
   - Only SUPER_ADMIN can modify ADMIN role
   - ADMIN cannot modify other ADMIN users
   - ADMIN cannot modify SUPER_ADMIN

3. **SUPPORT Protection**:
   - SUPER_ADMIN can modify SUPPORT
   - ADMIN cannot modify SUPPORT
   - SUPPORT cannot modify anyone

4. **USER Management**:
   - SUPER_ADMIN and ADMIN can modify USER roles
   - SUPPORT can view but not modify USER data (except KYC approval)

---

## Permission Checks

### Role Hierarchy Levels (for comparison)
```typescript
USER = 0
SUPPORT = 1
ADMIN = 2
SUPER_ADMIN = 3
```

### Key Permission Rules

1. **Cannot modify users with equal or higher role**
2. **Cannot elevate users to a role equal or higher than your own**
3. **Cannot demote yourself**
4. **SUPER_ADMIN bypass** - Can do anything except delete the last SUPER_ADMIN

---

## Endpoint Access Matrix

| Endpoint Category | SUPER_ADMIN | ADMIN | SUPPORT |
|-------------------|-------------|-------|---------|
| User Management - View | ✅ | ✅ | ✅ (Limited) |
| User Management - Suspend/Ban | ✅ | ✅ | ❌ |
| User Management - Delete | ✅ | ❌ | ❌ |
| Wallet Management - View | ✅ | ✅ | ✅ |
| Wallet Management - Adjust | ✅ | ✅ | ❌ |
| Transaction - View | ✅ | ✅ | ✅ (Limited) |
| Transaction - Reverse | ✅ | ✅ | ❌ |
| KYC - View | ✅ | ✅ | ✅ |
| KYC - Approve/Reject | ✅ | ✅ | ✅ |
| VTU - View | ✅ | ✅ | ✅ |
| VTU - Refund | ✅ | ✅ | ✅ |
| Gift Card - Approve/Reject | ✅ | ✅ | ❌ |
| Crypto - Approve/Reject | ✅ | ✅ | ❌ |
| Analytics - View | ✅ | ✅ | ❌ |
| Audit Logs - All | ✅ | ✅ (User only) | ✅ (Self only) |
| Notifications - Broadcast | ✅ | ✅ | ❌ |
| Notifications - Individual | ✅ | ✅ | ✅ |
| Settings - View | ✅ | ✅ (Read-only) | ❌ |
| Settings - Modify | ✅ | ❌ | ❌ |
| Admin Management - View | ✅ | ❌ | ❌ |
| Admin Management - Create | ✅ | ❌ | ❌ |
| Admin Management - Modify | ✅ | ❌ | ❌ |
| Admin Management - Delete | ✅ | ❌ | ❌ |

---

## Implementation Strategy

### 1. Create Custom Decorators
- `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` - Require specific roles
- `@MinRole(Role.ADMIN)` - Require minimum role level
- `@SuperAdminOnly()` - SUPER_ADMIN only

### 2. Create Guards
- `RolesGuard` - Check user has required role
- `HierarchyGuard` - Check user can modify target user (hierarchy check)

### 3. Database Seeding
- Create initial SUPER_ADMIN account via seed script
- Email: admin@mularpay.com (or from env variable)
- Password: Generated and logged (must be changed on first login)

### 4. Audit Logging
- All admin actions logged with:
  - Admin user ID and role
  - Target user/resource
  - Action performed
  - Timestamp and IP address
  - Before/after values (for modifications)

---

## Security Features

1. **Cannot Delete Last SUPER_ADMIN** - System validation
2. **Cannot Demote Self** - Prevent accidental lockout
3. **Role Elevation Requires Higher Authority** - Only SUPER_ADMIN can create ADMIN/SUPER_ADMIN
4. **Sensitive Actions Require Password Confirmation** - Delete admin, change system settings
5. **Admin Session Timeout** - Shorter than regular users (30 minutes)
6. **IP Whitelisting** - Optional for SUPER_ADMIN accounts
7. **2FA Mandatory** - Required for ADMIN and SUPER_ADMIN (future enhancement)

---

## Initial Setup

### Seed Script Will Create:
1. **One SUPER_ADMIN account**
   - Email: From `SUPER_ADMIN_EMAIL` env variable
   - Password: From `SUPER_ADMIN_PASSWORD` env variable (hashed)
   - Phone: Dummy (can be updated later)
   - Status: ACTIVE
   - KYC Tier: TIER_3 (for completeness)

### Environment Variables Needed:
```env
SUPER_ADMIN_EMAIL=admin@mularpay.com
SUPER_ADMIN_PASSWORD=ChangeThisPassword123!
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin
SUPER_ADMIN_PHONE=+2348000000000
```

---

## Example Scenarios

### Scenario 1: SUPER_ADMIN Creates New ADMIN
✅ **Allowed** - SUPER_ADMIN can create any role

### Scenario 2: ADMIN Tries to Create Another ADMIN
❌ **Denied** - ADMIN cannot create equal or higher roles

### Scenario 3: ADMIN Tries to Suspend Another ADMIN
❌ **Denied** - ADMIN cannot modify equal or higher roles

### Scenario 4: ADMIN Suspends a USER
✅ **Allowed** - ADMIN can manage USER roles

### Scenario 5: SUPPORT Approves KYC
✅ **Allowed** - SUPPORT has KYC approval permission

### Scenario 6: SUPPORT Tries to Ban a USER
❌ **Denied** - SUPPORT cannot ban users

### Scenario 7: SUPER_ADMIN Demotes Self
❌ **Denied** - Cannot demote self (safety feature)

### Scenario 8: Delete Last SUPER_ADMIN
❌ **Denied** - System requires at least one SUPER_ADMIN

---

## Migration Plan

1. ✅ Update Prisma schema to add SUPER_ADMIN role
2. ✅ Create migration
3. ✅ Create seed script for initial SUPER_ADMIN
4. ✅ Implement role guards and decorators
5. ✅ Add hierarchy validation service
6. ✅ Implement admin endpoints with proper guards
7. ✅ Test all permission scenarios

---

This design ensures:
- Clear hierarchy and authority levels
- Protection against unauthorized role changes
- Separation of duties
- Audit trail for accountability
- System stability (cannot lock out all admins)
