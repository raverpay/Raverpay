# Phase 1.4: Wallet Module Implementation

**RaverPay - Wallet Management System**

---

## 📋 Overview

Phase 1.4 implements the core wallet functionality including balance management, transaction limits, wallet locking, and transaction history.

---

## 🎯 Features to Implement

### 1. Wallet Endpoints

- ✅ **GET** `/api/wallet` - Get wallet balance and details
- ✅ **GET** `/api/wallet/limits` - Get transaction limits based on KYC tier
- ✅ **POST** `/api/wallet/lock` - Lock wallet (admin/user)
- ✅ **POST** `/api/wallet/unlock` - Unlock wallet (admin only)
- ✅ **GET** `/api/wallet/transactions` - Get transaction history (paginated)
- ✅ **GET** `/api/wallet/transactions/:id` - Get single transaction details

### 2. Wallet Features

- ✅ Balance inquiry
- ✅ KYC-based transaction limits
- ✅ Daily/monthly spending tracking
- ✅ Wallet locking/unlocking
- ✅ Transaction history with filters
- ✅ Pagination support

---

## 💰 KYC Tier Limits

| Tier   | Daily Limit | Monthly Limit | Single Transaction | Status        |
| ------ | ----------- | ------------- | ------------------ | ------------- |
| TIER_0 | ₦50,000     | ₦200,000      | ₦10,000            | Not verified  |
| TIER_1 | ₦300,000    | ₦1,000,000    | ₦100,000           | Email + Phone |
| TIER_2 | ₦5,000,000  | ₦20,000,000   | ₦1,000,000         | BVN verified  |
| TIER_3 | Unlimited   | Unlimited     | Unlimited          | Full KYC      |

---

## 🏗️ Implementation Plan

### Step 1: Create Wallet Module

- [ ] Generate wallet module, controller, service
- [ ] Add wallet DTOs
- [ ] Configure module imports

### Step 2: Wallet Balance & Details

- [ ] Get wallet endpoint
- [ ] Include balance, limits, lock status
- [ ] Calculate available balance

### Step 3: Transaction Limits

- [ ] Get limits endpoint
- [ ] Calculate remaining daily/monthly limits
- [ ] Return limit details based on KYC tier

### Step 4: Wallet Locking

- [ ] Lock wallet endpoint (with reason)
- [ ] Unlock wallet endpoint (admin only)
- [ ] Add lock validation middleware
- [ ] Update transaction checks

### Step 5: Transaction History

- [ ] Get transactions endpoint (paginated)
- [ ] Add filters (type, status, date range)
- [ ] Get single transaction details
- [ ] Calculate transaction stats

### Step 6: Testing

- [ ] Unit tests for wallet service
- [ ] Integration tests for endpoints
- [ ] Create testing documentation

---

## 📁 File Structure

```
apps/raverpay-api/src/
├── wallet/
│   ├── wallet.module.ts
│   ├── wallet.controller.ts
│   ├── wallet.service.ts
│   ├── dto/
│   │   ├── index.ts
│   │   ├── lock-wallet.dto.ts
│   │   └── get-transactions.dto.ts
│   └── wallet.types.ts
```

---

## 🔧 API Endpoints

### 1. Get Wallet Balance

```
GET /api/wallet
Authorization: Bearer {token}
```

**Response:**

```json
{
  "id": "uuid",
  "balance": "1000.00",
  "ledgerBalance": "1000.00",
  "currency": "NGN",
  "dailySpent": "0.00",
  "monthlySpent": "0.00",
  "dailyLimit": "300000.00",
  "monthlyLimit": "1000000.00",
  "dailyRemaining": "300000.00",
  "monthlyRemaining": "1000000.00",
  "isLocked": false,
  "lockedReason": null,
  "kycTier": "TIER_1",
  "lastResetAt": "2025-11-09T00:00:00.000Z"
}
```

---

### 2. Get Wallet Limits

```
GET /api/wallet/limits
Authorization: Bearer {token}
```

**Response:**

```json
{
  "kycTier": "TIER_1",
  "dailyLimit": "300000.00",
  "monthlyLimit": "1000000.00",
  "singleTransactionLimit": "100000.00",
  "dailySpent": "0.00",
  "monthlySpent": "0.00",
  "dailyRemaining": "300000.00",
  "monthlyRemaining": "1000000.00",
  "canTransact": true,
  "limitInfo": {
    "isUnlimited": false,
    "nextTier": "TIER_2",
    "nextTierDailyLimit": "5000000.00",
    "nextTierMonthlyLimit": "20000000.00"
  }
}
```

---

### 3. Lock Wallet

```
POST /api/wallet/lock
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Suspicious activity detected"
}
```

**Response:**

```json
{
  "message": "Wallet locked successfully",
  "isLocked": true,
  "lockedReason": "Suspicious activity detected",
  "lockedAt": "2025-11-09T14:00:00.000Z"
}
```

---

### 4. Unlock Wallet

```
POST /api/wallet/unlock
Authorization: Bearer {token}
Content-Type: application/json

{
  "walletId": "uuid",
  "reason": "Verified - false alarm"
}
```

**Response:**

```json
{
  "message": "Wallet unlocked successfully",
  "isLocked": false,
  "unlockedAt": "2025-11-09T15:00:00.000Z"
}
```

---

### 5. Get Transaction History

```
GET /api/wallet/transactions?page=1&limit=20&type=DEBIT&status=COMPLETED
Authorization: Bearer {token}
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `type` - DEBIT | CREDIT
- `status` - PENDING | COMPLETED | FAILED | REVERSED
- `startDate` - ISO date string
- `endDate` - ISO date string

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "reference": "TRX-123456789",
      "type": "DEBIT",
      "amount": "1000.00",
      "currency": "NGN",
      "balanceBefore": "5000.00",
      "balanceAfter": "4000.00",
      "status": "COMPLETED",
      "description": "Airtime purchase",
      "metadata": {},
      "createdAt": "2025-11-09T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  },
  "summary": {
    "totalDebits": "10000.00",
    "totalCredits": "15000.00",
    "netAmount": "5000.00",
    "transactionCount": 100
  }
}
```

---

### 6. Get Single Transaction

```
GET /api/wallet/transactions/:id
Authorization: Bearer {token}
```

**Response:**

```json
{
  "id": "uuid",
  "reference": "TRX-123456789",
  "type": "DEBIT",
  "amount": "1000.00",
  "fee": "50.00",
  "totalAmount": "1050.00",
  "currency": "NGN",
  "balanceBefore": "5000.00",
  "balanceAfter": "3950.00",
  "status": "COMPLETED",
  "description": "Airtime purchase",
  "category": "VTU",
  "metadata": {
    "provider": "MTN",
    "phoneNumber": "08012345678"
  },
  "createdAt": "2025-11-09T14:00:00.000Z",
  "completedAt": "2025-11-09T14:00:05.000Z"
}
```

---

## 🔐 Security & Validation

### Wallet Locking Rules

1. **User can lock their own wallet** anytime
2. **Admin can lock/unlock any wallet**
3. **Automatic locks** for:
   - Suspicious activity detected
   - Multiple failed transactions
   - KYC verification pending (optional)
   - Compliance issues

### Transaction Validations

1. ✅ Check if wallet is locked
2. ✅ Check daily limit not exceeded
3. ✅ Check monthly limit not exceeded
4. ✅ Check single transaction limit
5. ✅ Check sufficient balance
6. ✅ Validate transaction type

---

## 🧪 Testing Scenarios

### Wallet Balance

- [x] Get wallet for authenticated user
- [ ] Returns correct balance and limits
- [ ] Unauthorized access rejected
- [ ] Non-existent wallet handled

### Transaction Limits

- [ ] Correct limits returned for each KYC tier
- [ ] Daily/monthly spent calculated correctly
- [ ] Remaining limits accurate
- [ ] Unlimited for TIER_3

### Wallet Locking

- [ ] User can lock own wallet
- [ ] User cannot unlock own wallet
- [ ] Admin can unlock any wallet
- [ ] Locked wallet blocks transactions
- [ ] Lock reason stored and returned

### Transaction History

- [ ] Returns paginated results
- [ ] Filters work correctly
- [ ] Date range filtering works
- [ ] Sorting by date (newest first)
- [ ] Single transaction details returned

---

## 📊 Database Queries

All implemented in Prisma:

```typescript
// Get wallet with user KYC info
await prisma.wallet.findUnique({
  where: { userId },
  include: {
    user: {
      select: { kycTier: true },
    },
  },
});

// Get transactions with pagination
await prisma.transaction.findMany({
  where: {
    userId,
    type: { in: ['DEBIT', 'CREDIT'] },
    status: 'COMPLETED',
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});

// Lock wallet
await prisma.wallet.update({
  where: { id: walletId },
  data: {
    isLocked: true,
    lockedReason: reason,
  },
});
```

---

## 🚀 Next Steps After Phase 1.4

**Phase 1.5**: Funding & Withdrawals

- Add money to wallet (bank transfer, card)
- Withdraw money to bank account
- Virtual account generation
- Payment gateway integration

**Phase 2**: Core Services

- VTU (Airtime, Data, Cable TV)
- Bill Payments (Electricity, etc.)
- Gift Cards
- Crypto Trading

---

**Implementation Date:** November 9, 2025  
**Status:** Planning Complete ✅  
**Ready to Implement:** Yes 🚀
