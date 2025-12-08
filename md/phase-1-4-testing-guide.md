# Phase 1.4: Wallet Module Testing Guide

**RaverPay - Wallet Management Testing**

---

## 📋 Overview

Phase 1.4 implements wallet management including balance inquiry, transaction limits, wallet locking, and transaction history.

---

## 🚀 Prerequisites

1. **Completed Phase 1.3**: User must be registered and verified
2. **Access Token**: Valid JWT token from login
3. **Wallet Created**: Wallet automatically created during registration

---

## 🧪 Test Scenarios

### Setup: Get Access Token

```bash
# Login to get access token
curl -X POST {{URL}}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser@raverpay.com",
    "password": "Test@123"
  }'

# Save the accessToken
export ACCESSTOKEN="<your_access_token>"
export URL="http://localhost:3001"
```

---

## Test 1: Get Wallet Balance ✅

**Endpoint**: `GET /api/wallet`

```bash
curl -X GET {{URL}}/api/wallet \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response** (200 OK):

```json
{
  "id": "uuid",
  "balance": "0.00",
  "ledgerBalance": "0.00",
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

**Pass Criteria**:

- ✅ Status 200
- ✅ Balance and limits returned
- ✅ KYC tier matches user's tier
- ✅ Remaining limits calculated correctly

---

## Test 2: Get Wallet Limits ✅

**Endpoint**: `GET /api/wallet/limits`

```bash
curl -X GET {{URL}}/api/wallet/limits \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response** (200 OK):

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

**Pass Criteria**:

- ✅ Status 200
- ✅ Correct limits for KYC tier
- ✅ Next tier information shown
- ✅ `canTransact` is true (wallet not locked)

---

## Test 3: KYC Tier Limits Verification ✅

Verify limits for each tier:

| KYC Tier | Daily Limit | Monthly Limit | Single Transaction |
| -------- | ----------- | ------------- | ------------------ |
| TIER_0   | ₦50,000     | ₦200,000      | ₦10,000            |
| TIER_1   | ₦300,000    | ₦1,000,000    | ₦100,000           |
| TIER_2   | ₦5,000,000  | ₦20,000,000   | ₦1,000,000         |
| TIER_3   | Unlimited   | Unlimited     | Unlimited          |

---

## Test 4: Lock Wallet ✅

**Endpoint**: `POST /api/wallet/lock`

```bash
curl -X POST {{URL}}/api/wallet/lock \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Suspicious activity detected"
  }'
```

**Expected Response** (200 OK):

```json
{
  "message": "Wallet locked successfully",
  "isLocked": true,
  "lockedReason": "Suspicious activity detected",
  "lockedAt": "2025-11-09T14:00:00.000Z"
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ Wallet marked as locked
- ✅ Reason stored
- ✅ Audit log created

---

### Test 4a: Verify Wallet is Locked

```bash
curl -X GET {{URL}}/api/wallet \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected**:

- `isLocked`: true
- `lockedReason`: "Suspicious activity detected"

---

### Test 4b: Try to Lock Again (Should Fail)

```bash
curl -X POST {{URL}}/api/wallet/lock \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test"
  }'
```

**Expected Response** (400 Bad Request):

```json
{
  "message": "Wallet is already locked",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Test 5: Unlock Wallet ✅

**Endpoint**: `POST /api/wallet/unlock`

**Note**: In current implementation, any authenticated user can unlock. In production, this should be admin-only.

```bash
curl -X POST {{URL}}/api/wallet/unlock \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "<your_wallet_id>",
    "reason": "Verified - false alarm"
  }'
```

**Expected Response** (200 OK):

```json
{
  "message": "Wallet unlocked successfully",
  "isLocked": false,
  "unlockedAt": "2025-11-09T15:00:00.000Z"
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ Wallet unlocked
- ✅ Audit log created

---

### Test 5a: Try to Unlock Already Unlocked Wallet (Should Fail)

```bash
curl -X POST {{URL}}/api/wallet/unlock \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "<your_wallet_id>",
    "reason": "Test"
  }'
```

**Expected Response** (400 Bad Request):

```json
{
  "message": "Wallet is not locked",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Test 6: Get Transaction History ✅

**Endpoint**: `GET /api/wallet/transactions`

### Test 6a: Get All Transactions (Default Pagination)

```bash
curl -X GET {{URL}}/api/wallet/transactions \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response** (200 OK):

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrevious": false
  },
  "summary": {
    "totalDebits": "0.00",
    "totalCredits": "0.00",
    "netAmount": "0.00",
    "transactionCount": 0
  }
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ Empty data array (no transactions yet)
- ✅ Pagination info correct
- ✅ Summary shows zeros

---

### Test 6b: Get Transactions with Pagination

```bash
curl -X GET "{{URL}}/api/wallet/transactions?page=1&limit=10" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

---

### Test 6c: Filter by Transaction Type

```bash
# Get only DEBIT transactions
curl -X GET "{{URL}}/api/wallet/transactions?type=DEBIT" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"

# Get only CREDIT transactions
curl -X GET "{{URL}}/api/wallet/transactions?type=CREDIT" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

---

### Test 6d: Filter by Status

```bash
# Get only COMPLETED transactions
curl -X GET "{{URL}}/api/wallet/transactions?status=COMPLETED" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"

# Get only PENDING transactions
curl -X GET "{{URL}}/api/wallet/transactions?status=PENDING" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

---

### Test 6e: Filter by Date Range

```bash
curl -X GET "{{URL}}/api/wallet/transactions?startDate=2025-11-01&endDate=2025-11-09" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

---

### Test 6f: Combined Filters

```bash
curl -X GET "{{URL}}/api/wallet/transactions?type=DEBIT&status=COMPLETED&page=1&limit=5" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

---

## Test 7: Get Single Transaction ✅

**Endpoint**: `GET /api/wallet/transactions/:id`

```bash
curl -X GET {{URL}}/api/wallet/transactions/<transaction_id> \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response** (200 OK):

```json
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

### Test 7a: Get Non-existent Transaction (Should Fail)

```bash
curl -X GET {{URL}}/api/wallet/transactions/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response** (404 Not Found):

```json
{
  "message": "Transaction not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Test 8: Security Tests ✅

### Test 8a: Access Without Authentication

```bash
curl -X GET {{URL}}/api/wallet
```

**Expected**: 401 Unauthorized

---

### Test 8b: Access With Invalid Token

```bash
curl -X GET {{URL}}/api/wallet \
  -H "Authorization: Bearer invalid_token_12345"
```

**Expected**: 401 Unauthorized

---

### Test 8c: Lock Wallet Without Authentication

```bash
curl -X POST {{URL}}/api/wallet/lock \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test"
  }'
```

**Expected**: 401 Unauthorized

---

## Test 9: Validation Tests ✅

### Test 9a: Lock Wallet with Short Reason

```bash
curl -X POST {{URL}}/api/wallet/lock \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test"
  }'
```

**Expected**: 400 Bad Request (reason must be at least 5 characters)

---

### Test 9b: Invalid Pagination Parameters

```bash
# Negative page number
curl -X GET "{{URL}}/api/wallet/transactions?page=-1" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"

# Limit exceeds maximum (100)
curl -X GET "{{URL}}/api/wallet/transactions?limit=200" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected**: 400 Bad Request with validation errors

---

### Test 9c: Invalid Transaction Type

```bash
curl -X GET "{{URL}}/api/wallet/transactions?type=INVALID" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected**: 400 Bad Request

---

## 📊 Complete Test Checklist

### Wallet Balance

- [ ] Get wallet balance with correct limits
- [ ] Limits match KYC tier
- [ ] Remaining limits calculated correctly
- [ ] Unauthorized access rejected

### Wallet Limits

- [ ] Correct limits for TIER_0
- [ ] Correct limits for TIER_1
- [ ] Correct limits for TIER_2
- [ ] Correct limits for TIER_3 (unlimited)
- [ ] Next tier information shown
- [ ] canTransact reflects lock status

### Wallet Locking

- [ ] User can lock own wallet
- [ ] Cannot lock already locked wallet
- [ ] Reason stored correctly
- [ ] Audit log created
- [ ] Wallet status reflected in balance endpoint

### Wallet Unlocking

- [ ] Wallet can be unlocked
- [ ] Cannot unlock already unlocked wallet
- [ ] Audit log created
- [ ] TODO: Add admin-only restriction

### Transaction History

- [ ] Get all transactions (empty initially)
- [ ] Pagination works correctly
- [ ] Filter by type (DEBIT/CREDIT)
- [ ] Filter by status (PENDING/COMPLETED/FAILED/REVERSED)
- [ ] Filter by date range
- [ ] Combined filters work
- [ ] Transaction summary calculated correctly
- [ ] Sorting by date (newest first)

### Single Transaction

- [ ] Get transaction by ID
- [ ] Non-existent transaction returns 404
- [ ] User can only see own transactions

### Security

- [ ] All endpoints require authentication
- [ ] Invalid tokens rejected
- [ ] Expired tokens rejected
- [ ] Users can only access own wallet

### Validation

- [ ] Lock reason must be 5-500 characters
- [ ] Pagination limits enforced
- [ ] Invalid enum values rejected
- [ ] Invalid date formats rejected

---

## 🚀 Production Testing

Replace `http://localhost:3001` with your Railway URL:

```bash
export URL="https://raverpayraverpay-api-production.up.railway.app"
export ACCESSTOKEN="<your_production_token>"

# Test wallet balance
curl -X GET {{URL}}/api/wallet \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

---

## 📈 Expected Outcomes

### After Complete Flow:

1. ✅ Can view wallet balance and limits
2. ✅ Limits match KYC tier
3. ✅ Can lock/unlock wallet
4. ✅ Can view transaction history (empty initially)
5. ✅ All security validations working
6. ✅ Audit logs created for lock/unlock actions

---

## 🐛 Common Issues & Solutions

### Issue 1: "Wallet not found"

**Solution**: Wallet should be automatically created during registration. If not, there's an issue with the registration flow.

### Issue 2: Wrong limits showing

**Solution**: Check user's KYC tier. Limits are:

- TIER_0: ₦50k daily
- TIER_1: ₦300k daily
- TIER_2: ₦5M daily
- TIER_3: Unlimited

### Issue 3: Cannot unlock wallet

**Solution**:

- Make sure you're using the correct `walletId`
- Wallet must be locked first
- In production, this will be admin-only

### Issue 4: 401 Unauthorized

**Solution**:

- Token expired (15 minutes) - get new token
- Invalid token format
- Missing Authorization header

---

## 🎯 Next Steps: Phase 1.5

Once Phase 1.4 is complete, proceed to:

**Phase 1.5**: Funding & Withdrawals

- Fund wallet via bank transfer
- Fund wallet via card
- Withdraw to bank account
- Virtual account number generation
- Payment gateway integration (Flutterwave/Paystack)

---

**Testing Date**: November 9, 2025  
**Phase**: 1.4 - Wallet Module  
**Status**: Ready for Testing ✅
