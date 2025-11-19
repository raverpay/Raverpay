# MularPay Admin API - cURL Testing Guide

## Prerequisites

### SUPER_ADMIN Account Created
✅ Email: `admin@mularpay.com`
✅ Password: `SuperAdmin123!`
✅ User ID: `09cdbd1c-035b-432b-a061-ce31d8374fcf`

### Base URL
```bash
export API_URL="http://localhost:3000/api"
# or for production
# export API_URL="https://api.mularpay.com/api"
```

---

## Testing Flow

### Step 1: Register a Normal User
This user will be used to demonstrate admin actions.

```bash
curl -X POST ${API_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "phone": "+2348012345678",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "user-uuid-here",
    "email": "john.doe@example.com",
    "phone": "+2348012345678",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
    "status": "PENDING_VERIFICATION"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the user ID:**
```bash
export NORMAL_USER_ID="user-uuid-here"
```

---

### Step 2: Login as SUPER_ADMIN

```bash
curl -X POST ${API_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mularpay.com",
    "password": "SuperAdmin123!"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "09cdbd1c-035b-432b-a061-ce31d8374fcf",
    "email": "admin@mularpay.com",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "SUPER_ADMIN"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the access token:**
```bash
export SUPER_ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📊 USER MANAGEMENT ENDPOINTS

### Get All Users (Paginated)

```bash
curl -X GET "${API_URL}/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search by email, phone, name
- `role` - Filter by role (USER, SUPPORT, ADMIN, SUPER_ADMIN)
- `status` - Filter by status (ACTIVE, SUSPENDED, BANNED, etc.)
- `kycTier` - Filter by KYC tier (TIER_0, TIER_1, TIER_2, TIER_3)
- `sortBy` - Sort field (createdAt, email, etc.)
- `sortOrder` - asc or desc

**Example with Filters:**
```bash
curl -X GET "${API_URL}/admin/users?role=USER&status=ACTIVE&page=1&limit=10" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Search Users

```bash
curl -X GET "${API_URL}/admin/users?search=john" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get User Statistics

```bash
curl -X GET "${API_URL}/admin/users/stats" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "totalUsers": 2,
  "byRole": {
    "USER": 1,
    "SUPER_ADMIN": 1
  },
  "byStatus": {
    "ACTIVE": 1,
    "PENDING_VERIFICATION": 1
  },
  "byKYCTier": {
    "TIER_0": 1,
    "TIER_3": 1
  },
  "newUsers": {
    "today": 2,
    "thisWeek": 2,
    "thisMonth": 2
  }
}
```

---

### Get Single User Details

```bash
curl -X GET "${API_URL}/admin/users/${NORMAL_USER_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Update User Status (Suspend/Ban/Activate)

**Suspend User:**
```bash
curl -X PATCH "${API_URL}/admin/users/${NORMAL_USER_ID}/status" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUSPENDED",
    "reason": "Suspicious activity detected"
  }'
```

**Ban User:**
```bash
curl -X PATCH "${API_URL}/admin/users/${NORMAL_USER_ID}/status" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "BANNED",
    "reason": "Violated terms of service"
  }'
```

**Reactivate User:**
```bash
curl -X PATCH "${API_URL}/admin/users/${NORMAL_USER_ID}/status" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACTIVE",
    "reason": "Issue resolved"
  }'
```

---

### Update User KYC Tier

```bash
curl -X PATCH "${API_URL}/admin/users/${NORMAL_USER_ID}/kyc-tier" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "TIER_2",
    "notes": "Manual verification completed - BVN verified"
  }'
```

**KYC Tiers:**
- `TIER_0` - Not verified (₦50k limit)
- `TIER_1` - Email + Phone (₦300k limit)
- `TIER_2` - BVN verified (₦5M limit)
- `TIER_3` - Full KYC (Unlimited)

---

### Promote User to SUPPORT Role

```bash
curl -X PATCH "${API_URL}/admin/users/${NORMAL_USER_ID}/role" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "SUPPORT"
  }'
```

**✅ This will succeed - SUPER_ADMIN can promote to SUPPORT**

---

### Promote User to ADMIN Role

```bash
curl -X PATCH "${API_URL}/admin/users/${NORMAL_USER_ID}/role" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ADMIN"
  }'
```

**✅ This will succeed - SUPER_ADMIN can promote to ADMIN**

**Save this user as ADMIN for testing:**
```bash
export ADMIN_USER_ID="${NORMAL_USER_ID}"
```

---

### Promote User to SUPER_ADMIN Role

```bash
curl -X PATCH "${API_URL}/admin/users/${NORMAL_USER_ID}/role" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "SUPER_ADMIN"
  }'
```

**✅ This will succeed - SUPER_ADMIN can promote to SUPER_ADMIN**

---

### Get User Audit Logs

```bash
curl -X GET "${API_URL}/admin/users/${NORMAL_USER_ID}/audit-logs?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

## 🔐 Testing Role Hierarchy

### Step 3: Register Another User for Testing

```bash
curl -X POST ${API_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.smith@example.com",
    "phone": "+2348098765432",
    "password": "Password123!",
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

**Save the user ID:**
```bash
export TEST_USER_ID="jane-user-uuid-here"
```

---

### Step 4: Login as the ADMIN User

```bash
curl -X POST ${API_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "Password123!"
  }'
```

**Save the ADMIN token:**
```bash
export ADMIN_TOKEN="admin-token-here"
```

---

### Test: ADMIN Can Suspend Regular Users

```bash
curl -X PATCH "${API_URL}/admin/users/${TEST_USER_ID}/status" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUSPENDED",
    "reason": "Testing admin permissions"
  }'
```

**✅ This will succeed - ADMIN can modify USER**

---

### Test: ADMIN Cannot Promote to ADMIN Role

```bash
curl -X PATCH "${API_URL}/admin/users/${TEST_USER_ID}/role" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ADMIN"
  }'
```

**❌ This will FAIL with 403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "You cannot elevate users to ADMIN role"
}
```

---

### Test: ADMIN Cannot Modify SUPER_ADMIN

```bash
curl -X PATCH "${API_URL}/admin/users/09cdbd1c-035b-432b-a061-ce31d8374fcf/status" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUSPENDED",
    "reason": "Trying to suspend super admin"
  }'
```

**❌ This will FAIL with 403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "You cannot modify users with SUPER_ADMIN role"
}
```

---

### Test: ADMIN Cannot Modify Another ADMIN

Create another ADMIN first (as SUPER_ADMIN):
```bash
# Register new user
curl -X POST ${API_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob.admin@example.com",
    "phone": "+2348011112222",
    "password": "Password123!",
    "firstName": "Bob",
    "lastName": "Admin"
  }'

export BOB_USER_ID="bob-user-uuid-here"

# Promote to ADMIN (as SUPER_ADMIN)
curl -X PATCH "${API_URL}/admin/users/${BOB_USER_ID}/role" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ADMIN"
  }'
```

Now try to modify Bob as the first ADMIN:
```bash
curl -X PATCH "${API_URL}/admin/users/${BOB_USER_ID}/status" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUSPENDED",
    "reason": "Trying to suspend another admin"
  }'
```

**❌ This will FAIL with 403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "You cannot modify users with ADMIN role"
}
```

**✅ This proves ADMIN cannot demote their boss or peers!**

---

## 💳 TRANSACTION MANAGEMENT ENDPOINTS

### Get All Transactions

```bash
curl -X GET "${API_URL}/admin/transactions?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `userId` - Filter by user ID
- `type` - Transaction type (DEPOSIT, WITHDRAWAL, VTU_AIRTIME, etc.)
- `status` - Transaction status (PENDING, COMPLETED, FAILED)
- `minAmount` - Minimum amount
- `maxAmount` - Maximum amount
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `provider` - Provider (paystack, vtpass, etc.)
- `sortBy` - Sort field
- `sortOrder` - asc or desc

---

### Get Transaction Statistics

```bash
curl -X GET "${API_URL}/admin/transactions/stats" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**With Date Range:**
```bash
curl -X GET "${API_URL}/admin/transactions/stats?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "totalCount": 150,
  "totalVolume": 5000000,
  "totalFees": 25000,
  "averageAmount": 33333.33,
  "successRate": "95.50",
  "byType": [
    { "type": "DEPOSIT", "count": 50, "volume": 2000000 },
    { "type": "WITHDRAWAL", "count": 30, "volume": 1500000 },
    { "type": "VTU_AIRTIME", "count": 70, "volume": 1500000 }
  ],
  "byStatus": [
    { "status": "COMPLETED", "count": 143 },
    { "status": "FAILED", "count": 7 }
  ]
}
```

---

### Get Pending Transactions

```bash
curl -X GET "${API_URL}/admin/transactions/pending?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get Failed Transactions

```bash
curl -X GET "${API_URL}/admin/transactions/failed?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**With Date Range:**
```bash
curl -X GET "${API_URL}/admin/transactions/failed?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get Transaction by ID

```bash
export TRANSACTION_ID="transaction-uuid-here"

curl -X GET "${API_URL}/admin/transactions/${TRANSACTION_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get Transaction by Reference

```bash
export TRANSACTION_REF="TXN_1234567890"

curl -X GET "${API_URL}/admin/transactions/reference/${TRANSACTION_REF}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Reverse a Transaction

**⚠️ WARNING: This refunds money to the user's wallet!**

```bash
curl -X POST "${API_URL}/admin/transactions/${TRANSACTION_ID}/reverse" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer dispute - duplicate charge"
  }'
```

**Expected Response:**
```json
{
  "originalTransaction": {
    "id": "txn-uuid",
    "reference": "TXN_1234567890",
    "status": "REVERSED",
    ...
  },
  "reversalTransaction": {
    "id": "reversal-uuid",
    "reference": "REV_TXN_1234567890",
    "status": "COMPLETED",
    "amount": 10000,
    ...
  }
}
```

**What happens:**
1. Original transaction status → `REVERSED`
2. New transaction created with `REV_` prefix
3. User wallet credited with transaction amount
4. Audit log created
5. User notified (TODO in code)

---

## 📈 ANALYTICS ENDPOINTS

### Get Dashboard Overview

```bash
curl -X GET "${API_URL}/admin/analytics/dashboard" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "users": {
    "total": 1000,
    "active": 750
  },
  "wallets": {
    "totalBalance": 100000000
  },
  "transactions": {
    "today": 150
  },
  "revenue": {
    "today": 50000
  },
  "pending": {
    "kyc": 25,
    "failedTransactions": 5,
    "deletionRequests": 2
  }
}
```

---

### Get Revenue Analytics

```bash
curl -X GET "${API_URL}/admin/analytics/revenue" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**With Date Range and Grouping:**
```bash
curl -X GET "${API_URL}/admin/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31&groupBy=day" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "totalRevenue": 250000,
  "totalTransactions": 5000,
  "byType": [
    { "type": "DEPOSIT", "revenue": 50000, "count": 1000 },
    { "type": "WITHDRAWAL", "revenue": 100000, "count": 2000 },
    { "type": "VTU_AIRTIME", "revenue": 50000, "count": 1000 },
    { "type": "VTU_DATA", "revenue": 50000, "count": 1000 }
  ]
}
```

---

### Get User Growth Analytics

```bash
curl -X GET "${API_URL}/admin/analytics/users" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**With Date Range:**
```bash
curl -X GET "${API_URL}/admin/analytics/users?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "newUsers": 500,
  "byKYCTier": [
    { "tier": "TIER_0", "count": 100 },
    { "tier": "TIER_1", "count": 200 },
    { "tier": "TIER_2", "count": 150 },
    { "tier": "TIER_3", "count": 50 }
  ],
  "byStatus": [
    { "status": "ACTIVE", "count": 450 },
    { "status": "PENDING_VERIFICATION", "count": 40 },
    { "status": "SUSPENDED", "count": 8 },
    { "status": "BANNED", "count": 2 }
  ]
}
```

---

### Get Transaction Trends

```bash
curl -X GET "${API_URL}/admin/analytics/transactions" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Filter by Type:**
```bash
curl -X GET "${API_URL}/admin/analytics/transactions?type=WITHDRAWAL&startDate=2025-01-01" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "totalVolume": 50000000,
  "totalCount": 5000,
  "successRate": "95.50",
  "byStatus": [
    { "status": "COMPLETED", "count": 4775 },
    { "status": "FAILED", "count": 200 },
    { "status": "PENDING", "count": 25 }
  ]
}
```

---

## 🔒 Error Responses

### 401 Unauthorized (No Token)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden (Insufficient Permissions)
```json
{
  "statusCode": 403,
  "message": "You cannot modify users with ADMIN role"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be at least 8 characters"],
  "error": "Bad Request"
}
```

---

---

## 🔬 KYC VERIFICATION ENDPOINTS

### Get Pending KYC Verifications

```bash
curl -X GET "${API_URL}/admin/kyc/pending" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "pendingBVN": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "bvn": "22222222222",
      "kycTier": "TIER_0",
      "daysPending": 3
    }
  ],
  "pendingNIN": [...]
}
```

---

### Get KYC Statistics

```bash
curl -X GET "${API_URL}/admin/kyc/stats" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get User KYC Details

```bash
curl -X GET "${API_URL}/admin/kyc/${NORMAL_USER_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Approve BVN Verification

```bash
curl -X POST "${API_URL}/admin/kyc/${NORMAL_USER_ID}/approve-bvn" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "BVN verified manually - documents checked"
  }'
```

**What happens:**
- User's `bvnVerified` set to `true`
- KYC tier upgraded to `TIER_2` (if was TIER_0)
- Audit log created
- User notified (TODO in code)

---

### Reject BVN Verification

```bash
curl -X POST "${API_URL}/admin/kyc/${NORMAL_USER_ID}/reject-bvn" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "BVN does not match provided information"
  }'
```

**What happens:**
- User's `bvn` field cleared (set to null)
- `bvnVerified` remains `false`
- Audit log created
- User notified with reason (TODO in code)

---

### Approve NIN Verification

```bash
curl -X POST "${API_URL}/admin/kyc/${NORMAL_USER_ID}/approve-nin" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "NIN verified successfully"
  }'
```

---

### Reject NIN Verification

```bash
curl -X POST "${API_URL}/admin/kyc/${NORMAL_USER_ID}/reject-nin" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "NIN number format invalid"
  }'
```

---

## 📱 VTU ORDER MANAGEMENT ENDPOINTS

### Get VTU Orders

```bash
curl -X GET "${API_URL}/admin/vtu/orders?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**With Filters:**
```bash
curl -X GET "${API_URL}/admin/vtu/orders?serviceType=AIRTIME&status=FAILED&startDate=2025-01-01" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Service Types:** `AIRTIME`, `DATA`, `CABLE_TV`, `ELECTRICITY`

---

### Get VTU Statistics

```bash
curl -X GET "${API_URL}/admin/vtu/stats" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**With Date Range:**
```bash
curl -X GET "${API_URL}/admin/vtu/stats?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get Failed VTU Orders

```bash
curl -X GET "${API_URL}/admin/vtu/failed?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get Single VTU Order

```bash
export VTU_ORDER_ID="vtu-order-uuid"

curl -X GET "${API_URL}/admin/vtu/orders/${VTU_ORDER_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Refund Failed VTU Order

**⚠️ WARNING: This credits money back to user's wallet!**

```bash
curl -X POST "${API_URL}/admin/vtu/orders/${VTU_ORDER_ID}/refund" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Service provider error - transaction failed"
  }'
```

**What happens:**
1. Validates order status is FAILED
2. Credits user wallet with order amount
3. Creates refund transaction (`REFUND_${reference}`)
4. Creates audit log
5. User notified (TODO in code)

---

### Retry Failed VTU Order

```bash
curl -X POST "${API_URL}/admin/vtu/orders/${VTU_ORDER_ID}/retry" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**What happens:**
- Order status changed to PENDING
- Audit log created
- VTU provider retry triggered (TODO in code)

---

### Mark VTU Order as Completed (Manual)

```bash
curl -X POST "${API_URL}/admin/vtu/orders/${VTU_ORDER_ID}/mark-completed" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Manually verified - provider confirmed delivery"
  }'
```

---

## 💰 WALLET MANAGEMENT ENDPOINTS

### Get All Wallets

```bash
curl -X GET "${API_URL}/admin/wallets?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**With Filters:**
```bash
curl -X GET "${API_URL}/admin/wallets?minBalance=100000&isLocked=true" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get Wallet Statistics

```bash
curl -X GET "${API_URL}/admin/wallets/stats" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "totalWallets": 1000,
  "totalBalance": "50000000.00",
  "averageBalance": "50000.00",
  "maxBalance": "5000000.00",
  "lockedWallets": 5,
  "topWallets": [...]
}
```

---

### Get Wallet by User ID

```bash
curl -X GET "${API_URL}/admin/wallets/${NORMAL_USER_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Adjust Wallet Balance

**Credit Wallet:**
```bash
curl -X POST "${API_URL}/admin/wallets/${NORMAL_USER_ID}/adjust" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "type": "credit",
    "reason": "Compensation for service downtime"
  }'
```

**Debit Wallet:**
```bash
curl -X POST "${API_URL}/admin/wallets/${NORMAL_USER_ID}/adjust" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "type": "debit",
    "reason": "Correction for duplicate credit"
  }'
```

**What happens:**
1. Validates sufficient balance for debit
2. Updates wallet balance
3. Creates transaction record with admin metadata
4. Creates audit log
5. User notified (TODO in code)

---

### Reset Wallet Spending Limits

```bash
curl -X POST "${API_URL}/admin/wallets/${NORMAL_USER_ID}/reset-limits" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**What happens:**
- `dailySpent` reset to 0
- `monthlySpent` reset to 0
- `lastResetAt` updated to now
- Audit log created

---

## 🏦 VIRTUAL ACCOUNT MANAGEMENT ENDPOINTS

### Get All Virtual Accounts

```bash
curl -X GET "${API_URL}/admin/virtual-accounts?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**With Filters:**
```bash
curl -X GET "${API_URL}/admin/virtual-accounts?provider=paystack&isActive=true" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get Virtual Account Statistics

```bash
curl -X GET "${API_URL}/admin/virtual-accounts/stats" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "total": 500,
  "active": 480,
  "inactive": 20,
  "byProvider": {
    "paystack": 500
  }
}
```

---

### Get Users Without Virtual Accounts

```bash
curl -X GET "${API_URL}/admin/virtual-accounts/unassigned" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get User's Virtual Accounts

```bash
curl -X GET "${API_URL}/admin/virtual-accounts/${NORMAL_USER_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Deactivate Virtual Account

```bash
export VA_ID="virtual-account-uuid"

curl -X PATCH "${API_URL}/admin/virtual-accounts/${VA_ID}/deactivate" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Suspicious activity detected"
  }'
```

---

### Reactivate Virtual Account

```bash
curl -X PATCH "${API_URL}/admin/virtual-accounts/${VA_ID}/reactivate" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

## 🗑️ ACCOUNT DELETION REQUEST ENDPOINTS

### Get All Deletion Requests

```bash
curl -X GET "${API_URL}/admin/deletions?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**With Filters:**
```bash
curl -X GET "${API_URL}/admin/deletions?status=PENDING&startDate=2025-01-01" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Statuses:** `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED`

---

### Get Pending Deletion Requests

```bash
curl -X GET "${API_URL}/admin/deletions/pending" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Get Single Deletion Request

```bash
export DELETION_ID="deletion-request-uuid"

curl -X GET "${API_URL}/admin/deletions/${DELETION_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Response includes:**
- User details
- Wallet balance (⚠️ warning if > 0)
- Transaction count
- VTU order count
- Deletion reason

---

### Approve Deletion Request

```bash
curl -X POST "${API_URL}/admin/deletions/${DELETION_ID}/approve" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledFor": "2025-02-15T00:00:00Z",
    "notes": "Approved - wallet balance cleared"
  }'
```

**Default scheduled date:** 7 days from now if not specified

---

### Reject Deletion Request

```bash
curl -X POST "${API_URL}/admin/deletions/${DELETION_ID}/reject" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Active wallet balance - user needs to withdraw funds first",
    "notes": "Notified user to clear balance"
  }'
```

**What happens:**
- Request status → REJECTED
- User's `deletionRequested` flag cleared
- Audit log created
- User notified with reason (TODO in code)

---

## 📝 Summary of Implemented Endpoints

### Phase 1 - Core Admin (18 endpoints)

**User Management (7 endpoints)**
✅ `GET /admin/users` - List users
✅ `GET /admin/users/stats` - User statistics
✅ `GET /admin/users/:userId` - User details
✅ `PATCH /admin/users/:userId/role` - Update role
✅ `PATCH /admin/users/:userId/status` - Update status
✅ `PATCH /admin/users/:userId/kyc-tier` - Update KYC tier
✅ `GET /admin/users/:userId/audit-logs` - Audit logs

**Transaction Management (7 endpoints)**
✅ `GET /admin/transactions` - List transactions
✅ `GET /admin/transactions/stats` - Transaction statistics
✅ `GET /admin/transactions/pending` - Pending transactions
✅ `GET /admin/transactions/failed` - Failed transactions
✅ `GET /admin/transactions/:id` - Transaction details
✅ `GET /admin/transactions/reference/:ref` - Get by reference
✅ `POST /admin/transactions/:id/reverse` - Reverse transaction

**Analytics (4 endpoints)**
✅ `GET /admin/analytics/dashboard` - Dashboard overview
✅ `GET /admin/analytics/revenue` - Revenue analytics
✅ `GET /admin/analytics/users` - User growth
✅ `GET /admin/analytics/transactions` - Transaction trends

### Phase 2 - Business Operations (31 endpoints)

**KYC Verification (8 endpoints)**
✅ `GET /admin/kyc/pending` - Pending KYC
✅ `GET /admin/kyc/rejected` - Rejected KYC
✅ `GET /admin/kyc/stats` - KYC statistics
✅ `GET /admin/kyc/:userId` - User KYC details
✅ `POST /admin/kyc/:userId/approve-bvn` - Approve BVN
✅ `POST /admin/kyc/:userId/reject-bvn` - Reject BVN
✅ `POST /admin/kyc/:userId/approve-nin` - Approve NIN
✅ `POST /admin/kyc/:userId/reject-nin` - Reject NIN

**VTU Orders (7 endpoints)**
✅ `GET /admin/vtu/orders` - List VTU orders
✅ `GET /admin/vtu/stats` - VTU statistics
✅ `GET /admin/vtu/failed` - Failed orders
✅ `GET /admin/vtu/orders/:orderId` - Order details
✅ `POST /admin/vtu/orders/:orderId/refund` - Refund order
✅ `POST /admin/vtu/orders/:orderId/retry` - Retry order
✅ `POST /admin/vtu/orders/:orderId/mark-completed` - Mark completed

**Wallet Management (5 endpoints)**
✅ `GET /admin/wallets` - List wallets
✅ `GET /admin/wallets/stats` - Wallet statistics
✅ `GET /admin/wallets/:userId` - Wallet details
✅ `POST /admin/wallets/:userId/adjust` - Adjust balance
✅ `POST /admin/wallets/:userId/reset-limits` - Reset limits

**Virtual Accounts (6 endpoints)**
✅ `GET /admin/virtual-accounts` - List VAs
✅ `GET /admin/virtual-accounts/stats` - VA statistics
✅ `GET /admin/virtual-accounts/unassigned` - Unassigned users
✅ `GET /admin/virtual-accounts/:userId` - User VAs
✅ `PATCH /admin/virtual-accounts/:accountId/deactivate` - Deactivate
✅ `PATCH /admin/virtual-accounts/:accountId/reactivate` - Reactivate

**Account Deletions (5 endpoints)**
✅ `GET /admin/deletions` - List deletion requests
✅ `GET /admin/deletions/pending` - Pending deletions
✅ `GET /admin/deletions/:requestId` - Request details
✅ `POST /admin/deletions/:requestId/approve` - Approve deletion
✅ `POST /admin/deletions/:requestId/reject` - Reject deletion

**Total Phase 1 & 2: 49 Admin Endpoints**

---

## 🎁 GIFT CARD ORDER MANAGEMENT

### Get All Gift Card Orders

```bash
curl -X GET "${API_URL}/admin/giftcards/orders?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `type` - BUY or SELL
- `status` - PENDING, COMPLETED, FAILED
- `userId` - Filter by user
- `brand` - Filter by brand (e.g., "iTunes", "Amazon")
- `startDate`, `endDate` - Date range

---

### Get Pending Review Orders (SELL Orders)

```bash
curl -X GET "${API_URL}/admin/giftcards/pending-review" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- All pending SELL orders
- Days pending calculation
- Ordered by oldest first

---

### Get Gift Card Statistics

```bash
curl -X GET "${API_URL}/admin/giftcards/stats?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- Total count and volume
- Average amount and rate
- Approval rate
- Breakdown by type (BUY/SELL)
- Breakdown by brand
- Breakdown by status

---

### Get Single Gift Card Order

```bash
# Save an order ID from the list
export GIFTCARD_ORDER_ID="order-uuid-here"

curl -X GET "${API_URL}/admin/giftcards/${GIFTCARD_ORDER_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Approve Gift Card Sell Order

```bash
curl -X POST "${API_URL}/admin/giftcards/${GIFTCARD_ORDER_ID}/approve" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Card images verified manually"
  }'
```

**What happens:**
- Order status → COMPLETED
- User wallet credited with order amount
- Transaction record created
- reviewedBy and reviewedAt fields updated
- Audit log created
- User notified (TODO in code)

---

### Reject Gift Card Sell Order

```bash
curl -X POST "${API_URL}/admin/giftcards/${GIFTCARD_ORDER_ID}/reject" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Invalid card code",
    "notes": "Card already redeemed"
  }'
```

**What happens:**
- Order status → FAILED
- reviewedBy and reviewedAt fields updated
- Audit log created with rejection reason
- User notified with reason (TODO in code)

---

### Adjust Gift Card Payout Amount

```bash
curl -X PATCH "${API_URL}/admin/giftcards/${GIFTCARD_ORDER_ID}/adjust-amount" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 45000,
    "reason": "Card denomination mismatch - adjusted to $50 rate"
  }'
```

**Use case:** Adjust payout before approval (e.g., wrong denomination, rate change)

---

## ₿ CRYPTO ORDER MANAGEMENT

### Get All Crypto Orders

```bash
curl -X GET "${API_URL}/admin/crypto/orders?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `type` - BUY or SELL
- `status` - PENDING, COMPLETED, FAILED
- `userId` - Filter by user
- `asset` - BTC, ETH, USDT, etc.
- `startDate`, `endDate` - Date range

---

### Get Pending Review Orders (SELL Orders)

```bash
curl -X GET "${API_URL}/admin/crypto/pending-review" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- All pending SELL orders
- Days pending calculation
- Blockchain verification data (txHash, walletAddress)

---

### Get Crypto Statistics

```bash
curl -X GET "${API_URL}/admin/crypto/stats?startDate=2025-01-01" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- Total volume in NGN and crypto
- Average amounts and rates
- Approval rate
- Breakdown by type (BUY/SELL)
- Breakdown by asset (BTC, ETH, USDT)
- Breakdown by status

---

### Get Single Crypto Order

```bash
export CRYPTO_ORDER_ID="crypto-order-uuid"

curl -X GET "${API_URL}/admin/crypto/${CRYPTO_ORDER_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- Full order details
- Blockchain data (txHash, walletAddress, network)
- Crypto and Naira amounts
- Exchange rate

---

### Approve Crypto Sell Order

```bash
curl -X POST "${API_URL}/admin/crypto/${CRYPTO_ORDER_ID}/approve" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Blockchain transaction verified on etherscan"
  }'
```

**What happens:**
- Order status → COMPLETED
- User wallet credited with nairaAmount
- Transaction record created
- Audit log created with crypto metadata
- User notified (TODO in code)

---

### Reject Crypto Sell Order

```bash
curl -X POST "${API_URL}/admin/crypto/${CRYPTO_ORDER_ID}/reject" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Invalid transaction hash",
    "notes": "Transaction not found on blockchain"
  }'
```

---

### Adjust Crypto Payout Amount

```bash
curl -X PATCH "${API_URL}/admin/crypto/${CRYPTO_ORDER_ID}/adjust-amount" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "nairaAmount": 950000,
    "reason": "Market rate adjustment - BTC price dropped"
  }'
```

**Use case:** Adjust naira payout based on current market rates before approval

---

## 🔔 NOTIFICATION MANAGEMENT

### Get All Notifications

```bash
curl -X GET "${API_URL}/admin/notifications?page=1&limit=20&isRead=false" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `type` - Notification type
- `isRead` - true or false (boolean)
- `userId` - Filter by user
- `startDate`, `endDate` - Date range

---

### Get Notification Statistics

```bash
curl -X GET "${API_URL}/admin/notifications/stats" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- Total count
- Read/unread counts
- Read rate percentage
- Breakdown by notification type

---

### Get User Notifications

```bash
curl -X GET "${API_URL}/admin/notifications/user/${NORMAL_USER_ID}?page=1&limit=20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Use case:** View a specific user's notification history

---

### Get Single Notification

```bash
export NOTIFICATION_ID="notification-uuid"

curl -X GET "${API_URL}/admin/notifications/${NOTIFICATION_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

### Send Broadcast Notification

```bash
curl -X POST "${API_URL}/admin/notifications/broadcast" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SYSTEM",
    "title": "Scheduled Maintenance",
    "message": "The platform will undergo scheduled maintenance on Jan 20, 2025 from 2:00 AM to 4:00 AM. Services will be temporarily unavailable."
  }'
```

**What happens:**
- Notification sent to ALL active users
- Returns recipient count
- Audit log created
- Each user receives notification in-app

**Response:**
```json
{
  "success": true,
  "recipientCount": 1523,
  "message": "Broadcast sent to 1523 users"
}
```

---

### Send Notification to Specific User

```bash
curl -X POST "${API_URL}/admin/notifications/user/${NORMAL_USER_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SYSTEM",
    "title": "Account Review",
    "message": "Your account is under review. Please contact support for more information."
  }'
```

**Use case:** Send custom notification to a specific user

---

### Mark Notification as Read

```bash
curl -X PATCH "${API_URL}/admin/notifications/${NOTIFICATION_ID}/read" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Use case:** Troubleshooting - mark notification as read for testing

---

### Delete Notification

```bash
curl -X DELETE "${API_URL}/admin/notifications/${NOTIFICATION_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**What happens:**
- Notification deleted from database
- Audit log created

---

### Bulk Delete Notifications

```bash
# Delete all read notifications older than 30 days
curl -X POST "${API_URL}/admin/notifications/bulk-delete?isRead=true&beforeDate=2024-12-20" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Query Parameters:**
- `userId` - Delete for specific user
- `type` - Delete specific type
- `isRead` - true or false
- `beforeDate` - Delete notifications before this date

**Response:**
```json
{
  "success": true,
  "deletedCount": 453,
  "message": "Deleted 453 notifications"
}
```

---

## 📝 Summary of All Implemented Endpoints

### Phase 1 - Core Admin (18 endpoints)

**User Management (7 endpoints)**
✅ `GET /admin/users` - List users
✅ `GET /admin/users/stats` - User statistics
✅ `GET /admin/users/:userId` - User details
✅ `PATCH /admin/users/:userId/role` - Update role
✅ `PATCH /admin/users/:userId/status` - Update status
✅ `PATCH /admin/users/:userId/kyc-tier` - Update KYC tier
✅ `GET /admin/users/:userId/audit-logs` - Audit logs

**Transaction Management (7 endpoints)**
✅ `GET /admin/transactions` - List transactions
✅ `GET /admin/transactions/stats` - Transaction statistics
✅ `GET /admin/transactions/pending` - Pending transactions
✅ `GET /admin/transactions/failed` - Failed transactions
✅ `GET /admin/transactions/:id` - Transaction details
✅ `GET /admin/transactions/reference/:ref` - Get by reference
✅ `POST /admin/transactions/:id/reverse` - Reverse transaction

**Analytics (4 endpoints)**
✅ `GET /admin/analytics/dashboard` - Dashboard overview
✅ `GET /admin/analytics/revenue` - Revenue analytics
✅ `GET /admin/analytics/users` - User growth
✅ `GET /admin/analytics/transactions` - Transaction trends

### Phase 2 - Business Operations (31 endpoints)

**KYC Verification (8 endpoints)**
✅ `GET /admin/kyc/pending` - Pending KYC
✅ `GET /admin/kyc/rejected` - Rejected KYC
✅ `GET /admin/kyc/stats` - KYC statistics
✅ `GET /admin/kyc/:userId` - User KYC details
✅ `POST /admin/kyc/:userId/approve-bvn` - Approve BVN
✅ `POST /admin/kyc/:userId/reject-bvn` - Reject BVN
✅ `POST /admin/kyc/:userId/approve-nin` - Approve NIN
✅ `POST /admin/kyc/:userId/reject-nin` - Reject NIN

**VTU Orders (7 endpoints)**
✅ `GET /admin/vtu/orders` - List VTU orders
✅ `GET /admin/vtu/stats` - VTU statistics
✅ `GET /admin/vtu/failed` - Failed orders
✅ `GET /admin/vtu/orders/:orderId` - Order details
✅ `POST /admin/vtu/orders/:orderId/refund` - Refund order
✅ `POST /admin/vtu/orders/:orderId/retry` - Retry order
✅ `POST /admin/vtu/orders/:orderId/mark-completed` - Mark completed

**Wallet Management (5 endpoints)**
✅ `GET /admin/wallets` - List wallets
✅ `GET /admin/wallets/stats` - Wallet statistics
✅ `GET /admin/wallets/:userId` - Wallet details
✅ `POST /admin/wallets/:userId/adjust` - Adjust balance
✅ `POST /admin/wallets/:userId/reset-limits` - Reset limits

**Virtual Accounts (6 endpoints)**
✅ `GET /admin/virtual-accounts` - List VAs
✅ `GET /admin/virtual-accounts/stats` - VA statistics
✅ `GET /admin/virtual-accounts/unassigned` - Unassigned users
✅ `GET /admin/virtual-accounts/:userId` - User VAs
✅ `PATCH /admin/virtual-accounts/:accountId/deactivate` - Deactivate
✅ `PATCH /admin/virtual-accounts/:accountId/reactivate` - Reactivate

**Account Deletions (5 endpoints)**
✅ `GET /admin/deletions` - List deletion requests
✅ `GET /admin/deletions/pending` - Pending deletions
✅ `GET /admin/deletions/:requestId` - Request details
✅ `POST /admin/deletions/:requestId/approve` - Approve deletion
✅ `POST /admin/deletions/:requestId/reject` - Reject deletion

### Phase 3 - Order & Notification Management (21 endpoints)

**Gift Card Orders (7 endpoints)**
✅ `GET /admin/giftcards/orders` - List gift card orders
✅ `GET /admin/giftcards/pending-review` - Pending sell orders
✅ `GET /admin/giftcards/stats` - Gift card statistics
✅ `GET /admin/giftcards/:orderId` - Order details
✅ `POST /admin/giftcards/:orderId/approve` - Approve sell order
✅ `POST /admin/giftcards/:orderId/reject` - Reject sell order
✅ `PATCH /admin/giftcards/:orderId/adjust-amount` - Adjust payout

**Crypto Orders (7 endpoints)**
✅ `GET /admin/crypto/orders` - List crypto orders
✅ `GET /admin/crypto/pending-review` - Pending sell orders
✅ `GET /admin/crypto/stats` - Crypto statistics
✅ `GET /admin/crypto/:orderId` - Order details
✅ `POST /admin/crypto/:orderId/approve` - Approve sell order
✅ `POST /admin/crypto/:orderId/reject` - Reject sell order
✅ `PATCH /admin/crypto/:orderId/adjust-amount` - Adjust payout

**Notifications (7 endpoints)**
✅ `GET /admin/notifications` - List notifications
✅ `GET /admin/notifications/stats` - Notification statistics
✅ `GET /admin/notifications/user/:userId` - User notifications
✅ `GET /admin/notifications/:notificationId` - Notification details
✅ `POST /admin/notifications/broadcast` - Broadcast to all users
✅ `POST /admin/notifications/user/:userId` - Send to specific user
✅ `PATCH /admin/notifications/:notificationId/read` - Mark as read
✅ `DELETE /admin/notifications/:notificationId` - Delete notification
✅ `POST /admin/notifications/bulk-delete` - Bulk delete

**Total Phase 1-3: 70 Admin Endpoints**

---

## 📊 ADVANCED ANALYTICS

### Get Revenue Time Series

```bash
curl -X GET "${API_URL}/admin/advanced-analytics/revenue-time-series?startDate=2025-01-01&endDate=2025-01-31&interval=day" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Query Parameters:**
- `startDate` (required) - Start date (YYYY-MM-DD)
- `endDate` (required) - End date (YYYY-MM-DD)
- `interval` - day, week, or month (default: day)

**Returns:**
- Revenue and volume by time period
- Transaction counts per period
- Summary statistics

---

### Get Transaction Trends

```bash
curl -X GET "${API_URL}/admin/advanced-analytics/transaction-trends?startDate=2025-01-01&endDate=2025-01-31&interval=week" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- Total, completed, failed, pending by period
- Success rates over time
- Volume trends

---

### Get User Growth

```bash
curl -X GET "${API_URL}/admin/advanced-analytics/user-growth?startDate=2025-01-01&endDate=2025-01-31&interval=month" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- New users by period
- Growth rate calculation
- Users before period for context

---

### Get Cohort Analysis

```bash
curl -X GET "${API_URL}/admin/advanced-analytics/cohort-analysis?months=6" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Query Parameters:**
- `months` - Number of months to analyze (default: 6)

**Returns:**
- Users grouped by registration month
- Retention rates per cohort
- Revenue per cohort
- Active users per cohort

---

### Get Provider Performance

```bash
curl -X GET "${API_URL}/admin/advanced-analytics/provider-performance?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- VTU provider success rates
- Total orders and volume per provider
- Failed vs completed breakdown
- Overall platform success rate

---

### Get Platform Overview

```bash
curl -X GET "${API_URL}/admin/advanced-analytics/platform-overview" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- Total and active users
- Total transactions and volume
- Total revenue (fees)
- Total wallet balance
- Key platform KPIs

---

## 📋 AUDIT LOGS

### Get All Audit Logs

```bash
curl -X GET "${API_URL}/admin/audit-logs?page=1&limit=50" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `action` - Filter by action (e.g., "APPROVE_BVN")
- `resource` - Filter by resource (e.g., "User", "Transaction")
- `userId` - Filter by admin user ID
- `resourceId` - Filter by specific resource ID
- `startDate`, `endDate` - Date range

---

### Get Audit Log Statistics

```bash
curl -X GET "${API_URL}/admin/audit-logs/stats?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Returns:**
- Total audit log count
- Top 10 actions
- Top 10 resources
- Top 10 most active admins

---

### Get User Activity Logs

```bash
# Get activity logs for a specific admin user
curl -X GET "${API_URL}/admin/audit-logs/user/${SUPER_ADMIN_USER_ID}?page=1&limit=50" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Use case:** View all actions performed by a specific admin

---

### Get Resource Audit Trail

```bash
# Get complete audit trail for a specific resource
curl -X GET "${API_URL}/admin/audit-logs/resource/User/${NORMAL_USER_ID}?page=1&limit=50" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

**Parameters:**
- `resource` - Resource type (User, Transaction, GiftCardOrder, etc.)
- `resourceId` - Specific resource ID

**Returns:** Chronological audit trail (oldest first) for the resource

---

### Get Single Audit Log

```bash
export AUDIT_LOG_ID="audit-log-uuid"

curl -X GET "${API_URL}/admin/audit-logs/${AUDIT_LOG_ID}" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"
```

---

## 📝 Summary of All Implemented Endpoints

### Phase 1 - Core Admin (18 endpoints)

**User Management (7 endpoints)**
✅ `GET /admin/users` - List users
✅ `GET /admin/users/stats` - User statistics
✅ `GET /admin/users/:userId` - User details
✅ `PATCH /admin/users/:userId/role` - Update role
✅ `PATCH /admin/users/:userId/status` - Update status
✅ `PATCH /admin/users/:userId/kyc-tier` - Update KYC tier
✅ `GET /admin/users/:userId/audit-logs` - Audit logs

**Transaction Management (7 endpoints)**
✅ `GET /admin/transactions` - List transactions
✅ `GET /admin/transactions/stats` - Transaction statistics
✅ `GET /admin/transactions/pending` - Pending transactions
✅ `GET /admin/transactions/failed` - Failed transactions
✅ `GET /admin/transactions/:id` - Transaction details
✅ `GET /admin/transactions/reference/:ref` - Get by reference
✅ `POST /admin/transactions/:id/reverse` - Reverse transaction

**Analytics (4 endpoints)**
✅ `GET /admin/analytics/dashboard` - Dashboard overview
✅ `GET /admin/analytics/revenue` - Revenue analytics
✅ `GET /admin/analytics/users` - User growth
✅ `GET /admin/analytics/transactions` - Transaction trends

### Phase 2 - Business Operations (31 endpoints)

**KYC Verification (8 endpoints)**
✅ `GET /admin/kyc/pending` - Pending KYC
✅ `GET /admin/kyc/rejected` - Rejected KYC
✅ `GET /admin/kyc/stats` - KYC statistics
✅ `GET /admin/kyc/:userId` - User KYC details
✅ `POST /admin/kyc/:userId/approve-bvn` - Approve BVN
✅ `POST /admin/kyc/:userId/reject-bvn` - Reject BVN
✅ `POST /admin/kyc/:userId/approve-nin` - Approve NIN
✅ `POST /admin/kyc/:userId/reject-nin` - Reject NIN

**VTU Orders (7 endpoints)**
✅ `GET /admin/vtu/orders` - List VTU orders
✅ `GET /admin/vtu/stats` - VTU statistics
✅ `GET /admin/vtu/failed` - Failed orders
✅ `GET /admin/vtu/orders/:orderId` - Order details
✅ `POST /admin/vtu/orders/:orderId/refund` - Refund order
✅ `POST /admin/vtu/orders/:orderId/retry` - Retry order
✅ `POST /admin/vtu/orders/:orderId/mark-completed` - Mark completed

**Wallet Management (5 endpoints)**
✅ `GET /admin/wallets` - List wallets
✅ `GET /admin/wallets/stats` - Wallet statistics
✅ `GET /admin/wallets/:userId` - Wallet details
✅ `POST /admin/wallets/:userId/adjust` - Adjust balance
✅ `POST /admin/wallets/:userId/reset-limits` - Reset limits

**Virtual Accounts (6 endpoints)**
✅ `GET /admin/virtual-accounts` - List VAs
✅ `GET /admin/virtual-accounts/stats` - VA statistics
✅ `GET /admin/virtual-accounts/unassigned` - Unassigned users
✅ `GET /admin/virtual-accounts/:userId` - User VAs
✅ `PATCH /admin/virtual-accounts/:accountId/deactivate` - Deactivate
✅ `PATCH /admin/virtual-accounts/:accountId/reactivate` - Reactivate

**Account Deletions (5 endpoints)**
✅ `GET /admin/deletions` - List deletion requests
✅ `GET /admin/deletions/pending` - Pending deletions
✅ `GET /admin/deletions/:requestId` - Request details
✅ `POST /admin/deletions/:requestId/approve` - Approve deletion
✅ `POST /admin/deletions/:requestId/reject` - Reject deletion

### Phase 3 - Order & Notification Management (21 endpoints)

**Gift Card Orders (7 endpoints)**
✅ `GET /admin/giftcards/orders` - List gift card orders
✅ `GET /admin/giftcards/pending-review` - Pending sell orders
✅ `GET /admin/giftcards/stats` - Gift card statistics
✅ `GET /admin/giftcards/:orderId` - Order details
✅ `POST /admin/giftcards/:orderId/approve` - Approve sell order
✅ `POST /admin/giftcards/:orderId/reject` - Reject sell order
✅ `PATCH /admin/giftcards/:orderId/adjust-amount` - Adjust payout

**Crypto Orders (7 endpoints)**
✅ `GET /admin/crypto/orders` - List crypto orders
✅ `GET /admin/crypto/pending-review` - Pending sell orders
✅ `GET /admin/crypto/stats` - Crypto statistics
✅ `GET /admin/crypto/:orderId` - Order details
✅ `POST /admin/crypto/:orderId/approve` - Approve sell order
✅ `POST /admin/crypto/:orderId/reject` - Reject sell order
✅ `PATCH /admin/crypto/:orderId/adjust-amount` - Adjust payout

**Notifications (7 endpoints)**
✅ `GET /admin/notifications` - List notifications
✅ `GET /admin/notifications/stats` - Notification statistics
✅ `GET /admin/notifications/user/:userId` - User notifications
✅ `GET /admin/notifications/:notificationId` - Notification details
✅ `POST /admin/notifications/broadcast` - Broadcast to all users
✅ `POST /admin/notifications/user/:userId` - Send to specific user
✅ `PATCH /admin/notifications/:notificationId/read` - Mark as read
✅ `DELETE /admin/notifications/:notificationId` - Delete notification
✅ `POST /admin/notifications/bulk-delete` - Bulk delete

### Phase 4 - Advanced Analytics & Audit (11 endpoints)

**Advanced Analytics (6 endpoints)**
✅ `GET /admin/advanced-analytics/revenue-time-series` - Revenue over time
✅ `GET /admin/advanced-analytics/transaction-trends` - Transaction trends
✅ `GET /admin/advanced-analytics/user-growth` - User growth metrics
✅ `GET /admin/advanced-analytics/cohort-analysis` - Cohort retention
✅ `GET /admin/advanced-analytics/provider-performance` - Provider metrics
✅ `GET /admin/advanced-analytics/platform-overview` - Platform KPIs

**Audit Logs (5 endpoints)**
✅ `GET /admin/audit-logs` - List audit logs
✅ `GET /admin/audit-logs/stats` - Audit statistics
✅ `GET /admin/audit-logs/user/:userId` - User activity
✅ `GET /admin/audit-logs/resource/:resource/:resourceId` - Resource trail
✅ `GET /admin/audit-logs/:logId` - Audit log details

**Total: 81 Admin Endpoints Implemented** ✅

---

## 🚀 Still To Be Implemented

Based on the original plan, there are ~55+ more endpoints that could be implemented:

### System Configuration
- Platform settings management
- Feature flags
- Rate configuration (gift cards, crypto, VTU)
- Commission/fee management
- Maintenance mode

### Provider Management
- VTU provider configuration
- Payment gateway settings
- Virtual account provider settings
- Provider health monitoring
- API key management

### Admin User Management
- Create/manage admin accounts
- Role assignment
- Permission management
- Session management

### Advanced Features
- Bulk operations (user updates, notifications)
- Export features (CSV, Excel)
- Scheduled tasks
- Webhook management
- System health monitoring

---

## 💡 Next Steps

1. **Test all 81 endpoints** to verify they work correctly
2. **Fix any bugs** found during testing
3. **Build Next.js admin dashboard** to consume these APIs
4. **Add notification triggers** for admin actions (TODOs in code)
5. **Implement remaining features** as needed (configuration, exports, etc.)

---

Generated with [Claude Code](https://claude.com/claude-code)

