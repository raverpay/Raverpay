# Phase 1.5 Testing Guide - Funding & Withdrawals

**Prerequisites:** https://raverpayraverpay-api-production.up.railway.app/api/payments/webhooks/paystack

- Paystack test keys configured in `.env`
- Server running on `http://localhost:3001/api`
- User registered and logged in (access token ready)

---

## Test Data

### Test Cards (Paystack)

```
Success Card: 4084084084084081
CVV: 408
Expiry: 12/30
PIN: 0000

Insufficient Funds: 5060666666666666666
CVV: 123
Expiry: 12/30
PIN: 1234
```

### Test Bank Account

```
Bank: GTBank (058)
Account: 0123456789
(Use any valid-looking 10-digit number for testing)
```

---

## 1. Get Banks List

Get the list of Nigerian banks for withdrawals.

```bash
curl -X GET {{URL}}/transactions/banks \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response:**

```json
{
  "banks": [
    {
      "code": "058",
      "name": "Guaranty Trust Bank",
      "slug": "guaranty-trust-bank",
      "active": true
    },
    ...
  ]
}
```

---

## 2. Get Virtual Account

Every user automatically gets a virtual account on registration.

```bash
curl -X GET {{URL}}/transactions/virtual-account \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response:**

```json
{
  "accountNumber": "1234567890",
  "accountName": "RaverPay/JOSEPH STACKS",
  "bankName": "Wema Bank",
  "bankCode": "035",
  "isPermanent": true,
  "provider": "paystack"
}
```

**Instructions:**

- Transfer to this account number using your bank app
- Funds will be credited automatically via webhook
- No fees for bank transfer funding

---

## 3. Initialize Card Payment

Fund wallet using a debit/credit card.

```bash
curl -X POST http://localhost:3001/api/transactions/fund/card \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDg3M2RlZi03NTA4LTQ2YjYtOGM2My0yYjE4MTI1ZDEzZmMiLCJlbWFpbCI6ImNvZGVzd2l0aGpvc2VwaEBnbWFpbC5jb20iLCJwaG9uZSI6IjA4MTY4Nzg3NTg0Iiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NjMwOTgzMjYsImV4cCI6MTc2MzA5OTIyNn0.OFq19Hk6KUx3y4CvZFfd0sk9oag1zbqBZxr6OjZbPLk" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 15000,
    "callbackUrl": "https://d6b4fcddc441.ngrok-free.app/funding/callback"
  }'
```

**Expected Response:**

```json
{
  "reference": "TXN_DEP_17627123451234",
  "authorizationUrl": "https://checkout.paystack.com/abc123xyz",
  "accessCode": "abc123xyz"
}
```

**Next Steps:**

1. Open the `authorizationUrl` in a browser
2. Enter test card details
3. Complete payment
4. You'll be redirected to `callbackUrl`
5. Verify payment using the reference

---

## 4. Verify Payment

After completing payment on Paystack, verify and credit wallet.

```bash
curl -X GET http://localhost:3001/api/transactions/verify/TXN_DEP_17630989709757841 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDg3M2RlZi03NTA4LTQ2YjYtOGM2My0yYjE4MTI1ZDEzZmMiLCJlbWFpbCI6ImNvZGVzd2l0aGpvc2VwaEBnbWFpbC5jb20iLCJwaG9uZSI6IjA4MTY4Nzg3NTg0Iiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NjMwOTgzMjYsImV4cCI6MTc2MzA5OTIyNn0.OFq19Hk6KUx3y4CvZFfd0sk9oag1zbqBZxr6OjZbPLk"
```

**Expected Response (Success):**

```json
{
  "status": "success",
  "reference": "TXN_DEP_17627123451234",
  "amount": "5000.00",
  "fee": "100.00",
  "netAmount": "5000.00",
  "transactionStatus": "COMPLETED",
  "gateway": "paystack",
  "paidAt": "2025-11-09T16:30:00.000Z"
}
```

**Expected Response (Failed):**

```json
{
  "status": "failed",
  "reference": "TXN_DEP_17627123451234",
  "amount": "5000.00",
  "fee": "100.00",
  "netAmount": "5000.00",
  "transactionStatus": "FAILED"
}
```

---

## 5. Check Wallet Balance

Verify funds were credited.

```bash
curl -X GET http://localhost:3001/api/wallet \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDg3M2RlZi03NTA4LTQ2YjYtOGM2My0yYjE4MTI1ZDEzZmMiLCJlbWFpbCI6ImNvZGVzd2l0aGpvc2VwaEBnbWFpbC5jb20iLCJwaG9uZSI6IjA4MTY4Nzg3NTg0Iiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NjMwOTgzMjYsImV4cCI6MTc2MzA5OTIyNn0.OFq19Hk6KUx3y4CvZFfd0sk9oag1zbqBZxr6OjZbPLk"
```

**Expected Response:**

```json
{
  "id": "wallet-id",
  "balance": "5000",
  "ledgerBalance": "5000",
  "currency": "NGN",
  ...
}
```

---

## 6. Resolve Account Number

Before withdrawing, resolve the account to verify details.

```bash
curl -X POST {{URL}}/transactions/resolve-account \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "accountNumber": "0123456789",
    "bankCode": "058"
  }'
```

**Expected Response:**

```json
{
  "accountNumber": "0123456789",
  "accountName": "JOHN DOE",
  "bankCode": "058"
}
```

**Note:** This hits Paystack's API to verify the account exists.

---

## 7. Withdraw Funds

Withdraw money from wallet to a bank account.

```bash
curl -X POST {{URL}}/transactions/withdraw \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "accountNumber": "0123456789",
    "accountName": "JOHN DOE",
    "bankCode": "058",
    "narration": "Test withdrawal"
  }'
```

**Expected Response:**

```json
{
  "reference": "TXN_WD_17627124561234",
  "amount": "2000.00",
  "fee": "25.00",
  "totalDebit": "2025.00",
  "status": "PROCESSING",
  "estimatedTime": "Few minutes to 24 hours"
}
```

**Fee Breakdown:**

- Amount < ₦5,000: ₦10 fee
- ₦5,000 - ₦50,000: ₦25 fee
- Amount > ₦50,000: ₦50 fee

---

## 8. Check Transaction Status

Check withdrawal status (webhooks update this automatically).

```bash
curl -X GET {{URL}}/wallet/transactions/TXN_WD_17627124561234 \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response:**

```json
{
  "id": "transaction-id",
  "reference": "TXN_WD_17627124561234",
  "type": "WITHDRAWAL",
  "status": "COMPLETED",
  "amount": "2000.00",
  "fee": "25.00",
  "description": "Test withdrawal",
  "completedAt": "2025-11-09T16:45:00.000Z",
  ...
}
```

**Possible Statuses:**

- `PENDING`: Just created
- `PROCESSING`: Sent to Paystack
- `COMPLETED`: Money sent successfully
- `FAILED`: Failed (amount refunded automatically)

---

## 9. Get Transaction History

View all funding and withdrawal transactions.

```bash
curl -X GET {{URL}}/wallet/transactions \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**With Filters:**

```bash
curl -X GET "{{URL}}/wallet/transactions?type=DEPOSIT&status=COMPLETED&page=1&limit=10" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response:**

```json
{
  "data": [
    {
      "id": "tx-1",
      "reference": "TXN_DEP_xxx",
      "type": "DEPOSIT",
      "status": "COMPLETED",
      "amount": "5000.00",
      "fee": "100.00",
      "description": "Card deposit...",
      "createdAt": "2025-11-09T16:30:00.000Z"
    },
    {
      "id": "tx-2",
      "reference": "TXN_WD_xxx",
      "type": "WITHDRAWAL",
      "status": "COMPLETED",
      "amount": "2000.00",
      "fee": "25.00",
      "description": "Test withdrawal",
      "createdAt": "2025-11-09T16:45:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "summary": {
    "totalDebits": "2025.00",
    "totalCredits": "5000.00",
    "netAmount": "2975.00",
    "transactionCount": 2
  }
}
```

---

## 10. Test KYC Limits

Test that transaction limits are enforced based on KYC tier.

### TIER_0 User (Default)

**Maximum Deposit: ₦10,000**

```bash
curl -X POST {{URL}}/transactions/fund/card \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 15000
  }'
```

**Expected:** Error (amount exceeds limit)

**Maximum Withdrawal: ₦5,000**

```bash
curl -X POST {{URL}}/transactions/withdraw \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 6000,
    "accountNumber": "0123456789",
    "accountName": "JOHN DOE",
    "bankCode": "058"
  }'
```

**Expected:** Error (amount exceeds limit)

---

## 11. Test Wallet Lock

Locked wallets cannot fund or withdraw.

**Lock Wallet:**

```bash
curl -X POST {{URL}}/wallet/lock \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Testing lock functionality"
  }'
```

**Try to Fund:**

```bash
curl -X POST {{URL}}/transactions/fund/card \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000
  }'
```

**Expected:** Error (wallet is locked)

**Unlock:**

```bash
curl -X POST {{URL}}/wallet/unlock \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "your-wallet-id",
    "reason": "Test complete"
  }'
```

---

## 12. Test Insufficient Balance

Try to withdraw more than wallet balance.

```bash
# Assuming balance is ₦2,975

curl -X POST {{URL}}/transactions/withdraw \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "accountNumber": "0123456789",
    "accountName": "JOHN DOE",
    "bankCode": "058"
  }'
```

**Expected:** Error (insufficient balance)

---

## Webhook Testing (Advanced)

### Setup ngrok

```bash
# Terminal 1: Start server
cd apps/raverpay-api
pnpm run start:dev

# Terminal 2: Start ngrok
ngrok http 3001
```

### Configure Paystack

1. Copy ngrok URL (e.g., `https://abc123.ngrok.io`)
2. Go to Paystack Dashboard → Settings → Webhooks
3. Add webhook: `https://abc123.ngrok.io/api/payments/webhooks/paystack`

### Test Webhook

1. Make a test payment
2. Watch server logs for webhook events
3. Verify wallet is credited automatically

---

## Troubleshooting

### "PAYSTACK_SECRET_KEY not configured"

- Add to `.env`: `PAYSTACK_SECRET_KEY="sk_test_xxx"`
- Restart server

### "Virtual account not found"

- Check user just registered
- Virtual account creation is async
- Check server logs for errors
- May take a few seconds

### "Failed to initialize payment"

- Check Paystack test keys
- Verify API key is active
- Check Paystack dashboard

### "Withdrawal failed. Amount refunded to wallet"

- Insufficient Paystack balance (test mode)
- Invalid account details
- Check Paystack transfer logs

### "Invalid signature" (webhooks)

- Webhook URL mismatch
- Incorrect secret key
- Check Paystack webhook logs

---

## Success Criteria

- [x] ✅ Get banks list
- [x] ✅ Get virtual account
- [x] ✅ Initialize card payment
- [x] ✅ Verify payment (success)
- [x] ✅ Verify payment (failure)
- [x] ✅ Wallet balance updated
- [x] ✅ Resolve account number
- [x] ✅ Withdraw funds
- [x] ✅ Check withdrawal status
- [x] ✅ Transaction history
- [x] ✅ KYC limits enforced
- [x] ✅ Locked wallet rejected
- [x] ✅ Insufficient balance rejected
- [x] ✅ Webhooks received

---

**Testing Date:** November 9, 2025  
**Status:** Ready for Testing ✅  
**Next:** Add Paystack keys and test!
