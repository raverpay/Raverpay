# Rate Limit Locked Accounts Management

## Overview

This document describes the locked accounts management interface that allows admins to view and unlock user accounts that have been automatically locked due to rate limit violations.

## Features Implemented

### 1. Locked Accounts Management Page

**Location:** `apps/raverpay-admin/app/dashboard/rate-limits/locked-accounts/page.tsx`

#### Key Features:

- **Dashboard Integration:** Accessible from the rate limits dashboard via a yellow alert card that displays the count of locked accounts
- **Real-time Data:** Fetches up to 100 locked accounts from the backend
- **Lock Type Classification:** Distinguishes between permanent and temporary locks
- **Comprehensive Account Information:**
  - User name and email
  - Lock duration (permanent or time remaining)
  - Lock count (how many times the user has been locked)
  - Lock reason
  - Lock timestamp
  - Expiration timestamp (for temporary locks)

#### User Interface Components:

1. **Stats Cards**
   - Total Locked Accounts
   - Permanent Locks Count
   - Temporary Locks Count

2. **Account List**
   - Displays detailed information for each locked account
   - Color-coded badges for lock status
   - Individual unlock buttons for each account

3. **Unlock Dialog**
   - Account summary
   - Required reason field for audit trail
   - Confirmation buttons
   - Error messaging

### 2. Backend API Endpoint

**Location:** `apps/raverpay-api/src/admin/users/admin-users.controller.ts`

#### Endpoint Details:

```
PATCH /api/admin/users/:userId/unlock
```

**Features:**

- Requires authentication (JWT)
- Requires admin role (ADMIN or SUPER_ADMIN)
- Validates admin hierarchy (admins can't modify higher-level admins)
- Requires unlock reason for audit trail

**Request Body:**

```json
{
  "reason": "User verified identity through support ticket #12345"
}
```

**Response:**

```json
{
  "message": "Account unlocked successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "lockedUntil": null,
    "rateLimitLockCount": 2
    // ... other user fields
  }
}
```

### 3. Service Layer Integration

**Location:** `apps/raverpay-api/src/admin/users/admin-users.service.ts`

#### New Method: `unlockRateLimitAccount`

This method:

1. Validates admin hierarchy permissions
2. Calls `AccountLockingService.unlockAccount()` to perform the unlock
3. Creates an audit log entry with action type `RATE_LIMIT_ACCOUNT_UNLOCKED`
4. Sends notifications to the user (email, push, in-app)
5. Returns the updated user data

**Audit Log Metadata Includes:**

- Unlock reason
- Current rate limit lock count
- Previous locked until timestamp

## User Flow

### From Dashboard to Unlock:

1. Admin views rate limits dashboard
2. Yellow alert card shows "X Accounts Locked" if any accounts are locked
3. Admin clicks "View and manage locked accounts →" link
4. Management page loads with list of locked accounts
5. Admin reviews account details and click "Unlock" button
6. Dialog opens with account summary
7. Admin enters unlock reason (required)
8. Admin clicks "Unlock Account"
9. Backend processes unlock:
   - Clears `lockedUntil` timestamp
   - Clears `rateLimitLockReason`
   - Sends notification to user
   - Creates audit log
10. Page refreshes to show updated list
11. User receives notification that account is unlocked

## Lock Duration Display Logic

The interface intelligently displays lock status:

- **Permanent Locks:** Shows "Permanent" badge in red
- **Time-based Locks:** Shows countdown in human-readable format
  - "> 24 hours" → Shows days remaining
  - "< 24 hours" → Shows hours and minutes
- **Expired Locks:** Shows "Expired (auto-unlocking soon)"
  - System will automatically clear these on next user attempt

## Security Features

### Authorization:

- Only admins with proper hierarchy permissions can unlock accounts
- JWT authentication required
- Role-based access control (ADMIN, SUPER_ADMIN)

### Audit Trail:

- Every unlock action is logged with:
  - Admin user ID
  - Target user ID
  - Unlock reason
  - Timestamp
  - Previous lock state

### Notifications:

- Users receive notifications when their account is unlocked
- Multiple channels: Email, Push, In-App
- Includes security warning to contact support if unexpected

## Integration with Rate Limiting System

This feature integrates with:

1. **AccountLockingService** - Core locking/unlocking logic
2. **RateLimitLoggerInterceptor** - Automatic locking on violations
3. **Rate Limits Dashboard** - Visibility and navigation
4. **Audit Logs** - Complete activity history
5. **Notification System** - User alerts

## API Endpoints Used

### Frontend Calls:

```
GET /api/admin/rate-limits/locked-accounts?limit=100
PATCH /api/admin/users/:userId/unlock
```

### Backend Dependencies:

- `PrismaService` - Database operations
- `HierarchyService` - Permission validation
- `AccountLockingService` - Core unlock logic
- `NotificationDispatcherService` - User notifications

## Next Steps (Future Enhancements)

1. **Bulk Unlock:** Allow admins to unlock multiple accounts at once
2. **Advanced Filters:** Filter by lock type, date range, lock count
3. **Export:** CSV export of locked accounts for reporting
4. **Unlock History:** View past unlock actions for an account
5. **Auto-unlock Preview:** Show which accounts will auto-unlock soon
6. **Lock Extension:** Allow admins to extend lock duration
7. **Whitelist:** Add accounts to whitelist to prevent future auto-locks

## Testing Checklist

- [ ] Load locked accounts page successfully
- [ ] Verify stats cards display correct counts
- [ ] Test unlock dialog opens with correct account info
- [ ] Verify unlock requires reason (validation)
- [ ] Test successful unlock flow
- [ ] Confirm user receives notification
- [ ] Verify audit log is created
- [ ] Test error handling (network failures)
- [ ] Verify admin hierarchy enforcement
- [ ] Test with permanent vs temporary locks
- [ ] Confirm page refreshes after unlock
- [ ] Test alert card on main dashboard

## Files Modified/Created

### Created:

1. `apps/raverpay-admin/app/dashboard/rate-limits/locked-accounts/page.tsx` - Management UI

### Modified:

1. `apps/raverpay-api/src/admin/users/admin-users.controller.ts` - Added unlock endpoint
2. `apps/raverpay-api/src/admin/users/admin-users.service.ts` - Added unlock service method and AccountLockingService injection
3. `apps/raverpay-admin/app/dashboard/rate-limits/page.tsx` - Added locked accounts alert card

## Dependencies

### Frontend:

- `@/components/ui/card`
- `@/components/ui/button`
- `@/components/ui/badge`
- `@/components/ui/dialog`
- `@/components/ui/textarea`
- `lucide-react` icons

### Backend:

- `@nestjs/common`
- `@prisma/client`
- Existing services (Prisma, Hierarchy, AccountLocking, Notifications)

---

**Status:** ✅ Fully Implemented and Ready for Testing
**Created:** 2024
**Last Updated:** Current Session
