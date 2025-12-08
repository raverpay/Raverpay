# MularPay Admin Endpoints Implementation Plan

## Overview
This document outlines all the admin endpoints that need to be implemented for the MularPay admin dashboard. The backend currently has role-based infrastructure (USER, ADMIN, SUPPORT) but NO admin endpoints or role guards.

## Prerequisites to Implement

### 1. Role-Based Access Control (RBAC)
- **Create RolesGuard** - Guard to check user roles
- **Create @Roles() Decorator** - Decorator to mark endpoints with required roles
- **Create AdminGuard** - Convenience guard for admin-only routes
- **Update wallet unlock endpoint** - Add admin guard (currently UNPROTECTED)

### 2. Admin Module Structure
```
src/admin/
├── admin.module.ts
├── admin.controller.ts
├── admin.service.ts
├── guards/
│   ├── roles.guard.ts
│   └── admin.guard.ts
├── decorators/
│   └── roles.decorator.ts
└── dto/
    └── (various DTOs for admin operations)
```

---

## Admin Endpoints by Category

## 1. USER MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/users`

#### User Listing & Search
- **GET** `/api/admin/users`
  - Query params: page, limit, search, role, status, kycTier, sortBy, sortOrder
  - Returns: Paginated list of users with key metrics
  - Response includes: id, email, phone, name, role, status, kycTier, walletBalance, createdAt, lastLoginAt

- **GET** `/api/admin/users/stats`
  - Returns: User statistics (total users, by role, by status, by KYC tier, new users today/week/month)

- **GET** `/api/admin/users/search`
  - Query params: query (email, phone, name, userId)
  - Returns: Search results matching the query

#### Individual User Management
- **GET** `/api/admin/users/:userId`
  - Returns: Complete user profile with related data (wallet, recent transactions, KYC status, etc.)

- **PATCH** `/api/admin/users/:userId/role`
  - Body: { role: UserRole }
  - Updates: User role (USER, ADMIN, SUPPORT)

- **PATCH** `/api/admin/users/:userId/status`
  - Body: { status: UserStatus, reason?: string }
  - Updates: User status (ACTIVE, SUSPENDED, BANNED, etc.)
  - Creates: Audit log entry

- **PATCH** `/api/admin/users/:userId/kyc-tier`
  - Body: { tier: KYCTier, reason?: string }
  - Updates: User KYC tier (manual override)
  - Creates: Audit log entry

- **POST** `/api/admin/users/:userId/reset-password`
  - Generates: Password reset link/code
  - Sends: Email to user
  - Returns: Reset token (for manual sharing if needed)

- **POST** `/api/admin/users/:userId/reset-pin`
  - Resets: User transaction PIN
  - Sends: Notification to user
  - Creates: Audit log entry

- **DELETE** `/api/admin/users/:userId`
  - Soft deletes: User account (sets status to PENDING_DELETION)
  - Queues: Actual deletion for later
  - Creates: Audit log entry

#### User Activity & Audit
- **GET** `/api/admin/users/:userId/audit-logs`
  - Query params: page, limit, action, startDate, endDate
  - Returns: User audit logs

- **GET** `/api/admin/users/:userId/login-history`
  - Query params: page, limit
  - Returns: User login history from audit logs

---

## 2. WALLET MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/wallets`

#### Wallet Listing & Monitoring
- **GET** `/api/admin/wallets`
  - Query params: page, limit, minBalance, maxBalance, isLocked, sortBy
  - Returns: Paginated list of wallets

- **GET** `/api/admin/wallets/stats`
  - Returns: Wallet statistics (total balance across platform, locked wallets count, top balances, etc.)

#### Individual Wallet Management
- **GET** `/api/admin/wallets/:userId`
  - Returns: Wallet details with transaction history

- **POST** `/api/admin/wallets/:userId/lock`
  - Body: { reason: string }
  - Locks: User wallet
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/wallets/:userId/unlock`
  - Body: { reason?: string }
  - Unlocks: User wallet
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/wallets/:userId/adjust`
  - Body: { amount: number, type: 'credit' | 'debit', reason: string }
  - Adjusts: Wallet balance (for corrections, refunds, etc.)
  - Creates: Transaction record
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/wallets/:userId/reset-limits`
  - Resets: Daily/monthly spending limits
  - Creates: Audit log entry

---

## 3. TRANSACTION MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/transactions`

#### Transaction Listing & Monitoring
- **GET** `/api/admin/transactions`
  - Query params: page, limit, type, status, userId, minAmount, maxAmount, startDate, endDate, provider
  - Returns: Paginated transaction list

- **GET** `/api/admin/transactions/stats`
  - Query params: startDate, endDate, groupBy (hour, day, week, month)
  - Returns: Transaction statistics (volume, count, by type, by status, success rate)

- **GET** `/api/admin/transactions/revenue`
  - Query params: startDate, endDate, groupBy
  - Returns: Revenue analytics (fees collected, by transaction type)

#### Individual Transaction Management
- **GET** `/api/admin/transactions/:transactionId`
  - Returns: Complete transaction details with related data

- **GET** `/api/admin/transactions/reference/:reference`
  - Returns: Transaction by reference number

- **POST** `/api/admin/transactions/:transactionId/reverse`
  - Body: { reason: string }
  - Reverses: Transaction (refunds to wallet)
  - Creates: Reversal transaction
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/transactions/:transactionId/retry`
  - Retries: Failed transaction
  - Returns: New transaction status

- **PATCH** `/api/admin/transactions/:transactionId/status`
  - Body: { status: TransactionStatus, notes?: string }
  - Updates: Transaction status (manual override)
  - Creates: Audit log entry

#### Pending Transactions
- **GET** `/api/admin/transactions/pending`
  - Query params: page, limit, type, olderThan (minutes)
  - Returns: Pending transactions that need review

- **GET** `/api/admin/transactions/failed`
  - Query params: page, limit, type, startDate, endDate
  - Returns: Failed transactions for investigation

---

## 4. KYC VERIFICATION ENDPOINTS

### Base Path: `/api/admin/kyc`

#### KYC Listing & Review
- **GET** `/api/admin/kyc/pending`
  - Returns: Users pending KYC verification

- **GET** `/api/admin/kyc/rejected`
  - Returns: Rejected KYC applications

- **GET** `/api/admin/kyc/stats`
  - Returns: KYC statistics (by tier, pending count, approval rate)

#### KYC Document Review
- **GET** `/api/admin/kyc/:userId`
  - Returns: User KYC documents and verification status

- **POST** `/api/admin/kyc/:userId/approve-bvn`
  - Body: { notes?: string }
  - Approves: BVN verification (manual override)
  - Updates: User KYC tier
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/kyc/:userId/reject-bvn`
  - Body: { reason: string }
  - Rejects: BVN verification
  - Sends: Notification to user with reason
  - Creates: Audit log entry

- **POST** `/api/admin/kyc/:userId/approve-nin`
  - Body: { notes?: string }
  - Approves: NIN verification
  - Updates: User KYC tier
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/kyc/:userId/reject-nin`
  - Body: { reason: string }
  - Rejects: NIN verification
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/kyc/:userId/verify-tier`
  - Body: { tier: KYCTier, notes?: string }
  - Manually sets: User KYC tier
  - Sends: Notification to user
  - Creates: Audit log entry

---

## 5. VTU ORDER MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/vtu`

#### VTU Order Monitoring
- **GET** `/api/admin/vtu/orders`
  - Query params: page, limit, serviceType, status, userId, startDate, endDate
  - Returns: Paginated VTU orders

- **GET** `/api/admin/vtu/orders/stats`
  - Query params: startDate, endDate, groupBy
  - Returns: VTU statistics (volume, count, by service type, by provider, success rate)

- **GET** `/api/admin/vtu/orders/failed`
  - Returns: Failed VTU orders needing attention

#### Individual Order Management
- **GET** `/api/admin/vtu/orders/:orderId`
  - Returns: Complete VTU order details

- **POST** `/api/admin/vtu/orders/:orderId/refund`
  - Body: { reason: string }
  - Refunds: Failed VTU order
  - Credits: User wallet
  - Updates: Order status
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/vtu/orders/:orderId/retry`
  - Retries: Failed VTU order
  - Returns: Updated order status

- **POST** `/api/admin/vtu/orders/:orderId/mark-completed`
  - Body: { notes?: string }
  - Manually marks: Order as completed
  - Creates: Audit log entry

---

## 6. GIFT CARD ORDER MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/giftcards`

#### Gift Card Order Review
- **GET** `/api/admin/giftcards/orders`
  - Query params: page, limit, type, status, userId, brand, startDate, endDate
  - Returns: Paginated gift card orders

- **GET** `/api/admin/giftcards/pending-review`
  - Returns: Gift card sell orders pending admin review

- **GET** `/api/admin/giftcards/stats`
  - Query params: startDate, endDate
  - Returns: Gift card statistics (buy/sell volume, by brand, approval rate)

#### Order Review & Approval
- **GET** `/api/admin/giftcards/:orderId`
  - Returns: Complete gift card order with uploaded images (for sell orders)

- **POST** `/api/admin/giftcards/:orderId/approve`
  - Body: { notes?: string }
  - Approves: Gift card sell order
  - Credits: User wallet
  - Updates: Order status to COMPLETED
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/giftcards/:orderId/reject`
  - Body: { reason: string, notes?: string }
  - Rejects: Gift card sell order
  - Updates: Order status to FAILED
  - Sends: Notification to user with reason
  - Creates: Audit log entry

- **PATCH** `/api/admin/giftcards/:orderId/adjust-amount`
  - Body: { amount: number, reason: string }
  - Adjusts: Payout amount for gift card
  - Creates: Audit log entry

---

## 7. CRYPTO ORDER MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/crypto`

#### Crypto Order Monitoring
- **GET** `/api/admin/crypto/orders`
  - Query params: page, limit, type, status, asset, network, userId, startDate, endDate
  - Returns: Paginated crypto orders

- **GET** `/api/admin/crypto/pending`
  - Returns: Crypto orders pending verification

- **GET** `/api/admin/crypto/stats`
  - Query params: startDate, endDate
  - Returns: Crypto statistics (volume, by asset, by type, success rate)

#### Order Verification & Management
- **GET** `/api/admin/crypto/:orderId`
  - Returns: Complete crypto order details

- **POST** `/api/admin/crypto/:orderId/verify-transaction`
  - Body: { txHash: string, confirmed: boolean, notes?: string }
  - Verifies: Crypto transaction on blockchain
  - Updates: Order status
  - Credits/Debits: User wallet accordingly
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/crypto/:orderId/approve`
  - Body: { notes?: string }
  - Approves: Crypto order
  - Processes: Payment
  - Updates: Order status
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/crypto/:orderId/reject`
  - Body: { reason: string }
  - Rejects: Crypto order
  - Refunds: If applicable
  - Sends: Notification to user
  - Creates: Audit log entry

---

## 8. VIRTUAL ACCOUNT MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/virtual-accounts`

#### Virtual Account Monitoring
- **GET** `/api/admin/virtual-accounts`
  - Query params: page, limit, provider, isActive, userId
  - Returns: Paginated virtual accounts

- **GET** `/api/admin/virtual-accounts/stats`
  - Returns: Virtual account statistics (total, by provider, active/inactive)

- **GET** `/api/admin/virtual-accounts/unassigned-users`
  - Returns: Users without virtual accounts

#### Account Management
- **GET** `/api/admin/virtual-accounts/:userId`
  - Returns: User's virtual account details

- **POST** `/api/admin/virtual-accounts/:userId/create`
  - Body: { provider?: string }
  - Creates: Virtual account for user (manual trigger)
  - Creates: Audit log entry

- **PATCH** `/api/admin/virtual-accounts/:accountId/deactivate`
  - Body: { reason: string }
  - Deactivates: Virtual account
  - Creates: Audit log entry

- **PATCH** `/api/admin/virtual-accounts/:accountId/reactivate`
  - Reactivates: Virtual account
  - Creates: Audit log entry

---

## 9. ACCOUNT DELETION REQUEST ENDPOINTS

### Base Path: `/api/admin/account-deletions`

#### Deletion Request Management
- **GET** `/api/admin/account-deletions/pending`
  - Returns: Pending account deletion requests

- **GET** `/api/admin/account-deletions`
  - Query params: page, limit, status, startDate, endDate
  - Returns: All account deletion requests

#### Request Review
- **GET** `/api/admin/account-deletions/:requestId`
  - Returns: Deletion request details with user info

- **POST** `/api/admin/account-deletions/:requestId/approve`
  - Body: { scheduledFor?: Date, notes?: string }
  - Approves: Deletion request
  - Schedules: Account deletion
  - Sends: Notification to user
  - Creates: Audit log entry

- **POST** `/api/admin/account-deletions/:requestId/reject`
  - Body: { reason: string, notes?: string }
  - Rejects: Deletion request
  - Updates: Request status
  - Sends: Notification to user with reason
  - Creates: Audit log entry

- **POST** `/api/admin/account-deletions/:requestId/execute`
  - Executes: Scheduled account deletion
  - Deletes: User data according to policy
  - Creates: Audit log entry

---

## 10. NOTIFICATION MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/notifications`

#### Bulk Notification Sending
- **POST** `/api/admin/notifications/broadcast`
  - Body: { title, message, category, channels, userFilter?, scheduledFor? }
  - Sends: Notification to all users or filtered subset
  - Creates: Notification records
  - Creates: Audit log entry

- **POST** `/api/admin/notifications/send-to-user`
  - Body: { userId, title, message, category, channels }
  - Sends: Notification to specific user
  - Creates: Notification record

#### Notification Analytics
- **GET** `/api/admin/notifications/stats`
  - Query params: startDate, endDate
  - Returns: Notification statistics (sent, delivered, opened, clicked, by channel)

- **GET** `/api/admin/notifications/failed`
  - Query params: page, limit, channel, startDate, endDate
  - Returns: Failed notifications

#### Notification Queue Management
- **GET** `/api/admin/notifications/queue`
  - Query params: status, channel
  - Returns: Current notification queue

- **POST** `/api/admin/notifications/queue/:queueId/retry`
  - Retries: Failed notification

- **DELETE** `/api/admin/notifications/queue/:queueId`
  - Cancels: Queued notification

---

## 11. SYSTEM ANALYTICS & REPORTS ENDPOINTS

### Base Path: `/api/admin/analytics`

#### Dashboard Analytics
- **GET** `/api/admin/analytics/dashboard`
  - Query params: startDate, endDate
  - Returns: Key metrics for admin dashboard (users, transactions, revenue, active users, etc.)

#### Revenue Analytics
- **GET** `/api/admin/analytics/revenue`
  - Query params: startDate, endDate, groupBy
  - Returns: Revenue breakdown (by service type, total fees, trends)

- **GET** `/api/admin/analytics/revenue/export`
  - Query params: startDate, endDate, format (csv, excel)
  - Returns: Downloadable revenue report

#### User Analytics
- **GET** `/api/admin/analytics/users`
  - Query params: startDate, endDate, groupBy
  - Returns: User analytics (new users, active users, retention, by KYC tier)

- **GET** `/api/admin/analytics/user-growth`
  - Query params: startDate, endDate, groupBy
  - Returns: User growth trends

#### Transaction Analytics
- **GET** `/api/admin/analytics/transactions`
  - Query params: startDate, endDate, groupBy, type
  - Returns: Transaction analytics (volume, count, success rate, avg transaction value)

- **GET** `/api/admin/analytics/transaction-trends`
  - Query params: startDate, endDate, type
  - Returns: Transaction trends over time

#### Service-Specific Analytics
- **GET** `/api/admin/analytics/vtu`
  - Query params: startDate, endDate
  - Returns: VTU service analytics

- **GET** `/api/admin/analytics/giftcards`
  - Query params: startDate, endDate
  - Returns: Gift card analytics

- **GET** `/api/admin/analytics/crypto`
  - Query params: startDate, endDate
  - Returns: Crypto trading analytics

---

## 12. AUDIT LOG ENDPOINTS

### Base Path: `/api/admin/audit`

#### Audit Log Viewing
- **GET** `/api/admin/audit/logs`
  - Query params: page, limit, userId, action, resource, startDate, endDate
  - Returns: Paginated audit logs

- **GET** `/api/admin/audit/logs/:logId`
  - Returns: Detailed audit log entry

#### Admin Activity
- **GET** `/api/admin/audit/admin-actions`
  - Query params: page, limit, adminId, startDate, endDate
  - Returns: Admin user actions for accountability

- **GET** `/api/admin/audit/export`
  - Query params: startDate, endDate, format (csv, excel)
  - Returns: Downloadable audit log export

---

## 13. SYSTEM CONFIGURATION ENDPOINTS

### Base Path: `/api/admin/settings`

#### System Settings
- **GET** `/api/admin/settings`
  - Returns: All system configuration settings

- **GET** `/api/admin/settings/:key`
  - Returns: Specific setting by key

- **PUT** `/api/admin/settings/:key`
  - Body: { value: any, reason?: string }
  - Updates: System configuration
  - Creates: Audit log entry

#### Platform Settings
- **GET** `/api/admin/settings/platform`
  - Returns: Platform-wide settings (maintenance mode, feature flags, limits, etc.)

- **PATCH** `/api/admin/settings/maintenance-mode`
  - Body: { enabled: boolean, message?: string }
  - Toggles: Maintenance mode
  - Creates: Audit log entry

#### Fee Configuration
- **GET** `/api/admin/settings/fees`
  - Returns: Current fee structure (transaction fees, withdrawal fees, VTU margins)

- **PUT** `/api/admin/settings/fees/:feeType`
  - Body: { amount: number, reason: string }
  - Updates: Fee configuration
  - Creates: Audit log entry

#### KYC Limits Configuration
- **GET** `/api/admin/settings/kyc-limits`
  - Returns: Current KYC tier limits

- **PUT** `/api/admin/settings/kyc-limits/:tier`
  - Body: { dailyLimit: number, monthlyLimit: number, reason: string }
  - Updates: KYC tier limits
  - Creates: Audit log entry

---

## 14. ADMIN USER MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/admins`

#### Admin User Management
- **GET** `/api/admin/admins`
  - Returns: List of admin and support users

- **POST** `/api/admin/admins/create`
  - Body: { email, firstName, lastName, role, permissions? }
  - Creates: New admin/support user
  - Sends: Invitation email
  - Creates: Audit log entry

- **PATCH** `/api/admin/admins/:userId/permissions`
  - Body: { permissions: string[] }
  - Updates: Admin permissions
  - Creates: Audit log entry

- **DELETE** `/api/admin/admins/:userId`
  - Revokes: Admin access (demotes to USER role)
  - Creates: Audit log entry

---

## 15. BANK & PROVIDER MANAGEMENT ENDPOINTS

### Base Path: `/api/admin/providers`

#### Bank Management
- **GET** `/api/admin/providers/banks`
  - Returns: List of supported banks

- **PATCH** `/api/admin/providers/banks/:bankCode/toggle`
  - Body: { enabled: boolean }
  - Enables/disables: Bank for withdrawals
  - Creates: Audit log entry

#### VTU Provider Management
- **GET** `/api/admin/providers/vtu`
  - Returns: VTU provider configurations

- **PATCH** `/api/admin/providers/vtu/:provider/toggle`
  - Body: { enabled: boolean }
  - Enables/disables: VTU provider
  - Creates: Audit log entry

#### Payment Gateway Management
- **GET** `/api/admin/providers/payment-gateways`
  - Returns: Payment gateway configurations (Paystack, etc.)

- **PATCH** `/api/admin/providers/payment-gateways/:provider/config`
  - Body: { config: object }
  - Updates: Provider configuration
  - Creates: Audit log entry

---

## Authentication & Authorization

### Required for All Admin Endpoints
- **Authentication**: JWT token (same as user endpoints)
- **Authorization**: User must have role `ADMIN` or `SUPPORT`
- **Guard**: `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN', 'SUPPORT')`
- **Some endpoints**: May require `ADMIN` only (not SUPPORT)

### Audit Logging
All admin actions must create an audit log entry including:
- Admin user ID
- Action performed
- Resource affected
- Timestamp
- IP address
- Additional metadata

---

## Error Handling

All admin endpoints should return consistent error responses:
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (no token or invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **500** - Internal Server Error

---

## Security Considerations

1. **Rate Limiting** - Implement stricter rate limits for sensitive admin operations
2. **IP Whitelisting** - Consider IP restrictions for admin access
3. **2FA Requirement** - Require 2FA for admin users
4. **Session Management** - Shorter session timeouts for admin users
5. **Activity Monitoring** - Real-time alerts for suspicious admin activity
6. **Sensitive Data** - Mask sensitive user data (passwords, PINs, BVN, etc.)

---

## Implementation Priority

### Phase 1 (Critical)
1. Role Guards & Decorators
2. User Management endpoints
3. Wallet Management (especially unlock wallet fix)
4. Transaction Management
5. Basic Analytics Dashboard

### Phase 2 (Important)
1. KYC Verification endpoints
2. VTU Order Management
3. Audit Logs viewing
4. Account Deletion Review
5. Virtual Account Management

### Phase 3 (Enhancement)
1. Gift Card Order Review
2. Crypto Order Management
3. Notification Management
4. Advanced Analytics & Reports
5. System Configuration

### Phase 4 (Advanced)
1. Admin User Management
2. Provider Management
3. Fee Configuration
4. Export Features
5. Real-time Dashboards

---

## Total Endpoint Count

**Estimated Total: 150+ Admin Endpoints**

**Breakdown by Category:**
- User Management: ~15 endpoints
- Wallet Management: ~8 endpoints
- Transaction Management: ~12 endpoints
- KYC Verification: ~8 endpoints
- VTU Orders: ~8 endpoints
- Gift Cards: ~7 endpoints
- Crypto Orders: ~7 endpoints
- Virtual Accounts: ~8 endpoints
- Account Deletions: ~5 endpoints
- Notifications: ~8 endpoints
- Analytics: ~12 endpoints
- Audit Logs: ~5 endpoints
- System Settings: ~12 endpoints
- Admin Management: ~5 endpoints
- Provider Management: ~8 endpoints

---

## Notes

- All endpoints require proper validation using DTOs
- All endpoints should have comprehensive error handling
- All mutations should create audit log entries
- All user-affecting actions should trigger notifications
- Consider implementing soft deletes for most resources
- Implement proper pagination for list endpoints (default: 20 items per page)
- Use query builders for complex filtering and sorting
- Consider caching for frequently accessed, rarely changing data (settings, bank lists)
