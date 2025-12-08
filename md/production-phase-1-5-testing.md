# Phase 1.5 Production Testing Guide

**Production URL:** `https://raverpayraverpay-api-production.up.railway.app/api`

---

## 🔧 Step 1: Configure Paystack Webhook

1. **Login to Paystack:**
   - https://dashboard.paystack.com/#/settings/developer

2. **Add Webhook URL:**
   ```
   https://raverpayraverpay-api-production.up.railway.app/api/payments/webhooks/paystack
   ```

3. **Select Events:**
   - ✅ `charge.success`
   - ✅ `transfer.success`
   - ✅ `transfer.failed`
   - ✅ `transfer.reversed`
   - ✅ `dedicatedaccount.assign.success`

4. **Save** → Paystack will send a test event

5. **Check Railway logs** to confirm webhook received

---

## 🧪 Step 2: Test Card Payment

### Register/Login User

```bash
# Register new user
curl -X POST {{URL}}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "production.test@example.com",
    "phone": "08099887766",
    "password": "Test@12345",
    "firstName": "Production",
    "lastName": "Tester"
  }'

# Or login existing user
curl -X POST {{URL}}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "production.test@example.com",
    "password": "Test@12345"
  }'

# Save the accessToken from response
```

### Get Banks List

```bash
curl -X GET {{URL}}/transactions/banks \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

### Check Initial Balance

```bash
curl -X GET {{URL}}/wallet \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected:** Balance: ₦0

---

## 💳 Step 3: Fund via Card Payment

### Initialize Payment

```bash
curl -X POST {{URL}}/transactions/fund/card \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000
  }'
```

**Response:**
```json
{
  "reference": "TXN_DEP_17627030577598388",
  "authorizationUrl": "https://checkout.paystack.com/z3xniqpbsld2wfv",
  "accessCode": "z3xniqpbsld2wfv"
}
```

### Complete Payment

1. **Copy the `authorizationUrl`** from response
2. **Open in browser**
3. **Enter test card details:**
   ```
   Card Number: 4084 0840 8408 4081
   CVV: 408
   Expiry: 12/30
   PIN: 0000
   OTP: 123456
   ```
4. **Submit payment**

### What Happens Next

```
1. User completes payment on Paystack checkout
2. Paystack processes payment
3. Paystack sends webhook to: 
   https://raverpayraverpay-api-production.up.railway.app/api/payments/webhooks/paystack
4. Your API receives webhook
5. API verifies signature
6. API credits wallet
7. Transaction status → COMPLETED
```

### Verify Payment (Manual)

```bash
curl -X GET {{URL}}/transactions/verify/TXN_DEP_17627030577598388 \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response:**
```json
{
  "status": "success",
  "reference": "TXN_DEP_17627030577598388",
  "amount": "5000.00",
  "fee": "100.00",
  "netAmount": "5000.00",
  "transactionStatus": "COMPLETED",
  "gateway": "paystack"
}
```

### Check Updated Balance

```bash
curl -X GET {{URL}}/wallet \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected:** Balance: ₦5,000 ✅

---

## 💸 Step 4: Test Withdrawal

### Resolve Account Number

```bash
curl -X POST {{URL}}/transactions/resolve-account \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "accountNumber": "0690000031",
    "bankCode": "058"
  }'
```

**Expected Response:**
```json
{
  "accountNumber": "0690000031",
  "accountName": "JOHN DOE",
  "bankCode": "058"
}
```

### Withdraw Funds

```bash
curl -X POST {{URL}}/transactions/withdraw \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "accountNumber": "0690000031",
    "accountName": "JOHN DOE",
    "bankCode": "058",
    "narration": "Test withdrawal from production"
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

**Note:** In test mode, withdrawal might fail if Paystack test account has insufficient balance. The amount will be refunded automatically to wallet.

### Check Updated Balance

```bash
curl -X GET {{URL}}/wallet \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected:** Balance: ₦2,975 (₦5,000 - ₦2,000 - ₦25 fee)

---

## 📊 Step 5: View Transaction History

```bash
curl -X GET {{URL}}/wallet/transactions \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response:**
```json
{
  "data": [
    {
      "reference": "TXN_DEP_xxx",
      "type": "DEPOSIT",
      "status": "COMPLETED",
      "amount": "5000.00",
      "fee": "100.00",
      "description": "Card deposit..."
    },
    {
      "reference": "TXN_WD_xxx",
      "type": "WITHDRAWAL",
      "status": "COMPLETED",
      "amount": "2000.00",
      "fee": "25.00",
      "description": "Test withdrawal..."
    }
  ],
  "summary": {
    "totalCredits": "5000.00",
    "totalDebits": "2025.00",
    "netAmount": "2975.00"
  }
}
```

---

## 🔍 Step 6: Monitor Webhooks

### Check Railway Logs

1. Go to: https://railway.app/dashboard
2. Select your project: `raverpay-api-production`
3. Click "Logs" tab
4. Look for webhook events:
   ```
   [PaymentsController] Webhook event received: charge.success
   [TransactionsService] Virtual account credited: TXN_DEP_xxx
   ```

### Check Paystack Dashboard

1. Go to: https://dashboard.paystack.com/#/transactions
2. Find your test transaction
3. Click on it → View webhook logs
4. Confirm webhook was delivered successfully

---

## ✅ Success Criteria

- [x] Webhook configured in Paystack
- [x] Card payment initialized
- [x] Payment completed on Paystack
- [x] Webhook received by Railway
- [x] Wallet auto-credited
- [x] Balance updated correctly
- [x] Account resolution works
- [x] Withdrawal processed
- [x] Transaction history accurate
- [x] Fees calculated correctly

---

## 🐛 Troubleshooting

### "Virtual account not found"
- Expected in test mode
- Will work in production after DVA approval
- Skip this test for now

### "Failed to resolve account number"
- Test account numbers might not exist
- Try a different account number
- Or use your own real account number

### "Withdrawal failed. Amount refunded to wallet."
- Expected in test mode
- Paystack test account has limited balance
- Will work in production with funded account

### Webhook not received
- Check Railway logs for errors
- Verify webhook URL in Paystack
- Ensure Railway app is running
- Check Paystack webhook logs for delivery status

### Payment successful but wallet not credited
- Check if webhook was received (Railway logs)
- Manually verify: `GET /transactions/verify/:reference`
- Check transaction status in database

---

## 📝 Variables for Testing

Replace these placeholders in commands:

```bash
{{URL}} = https://raverpayraverpay-api-production.up.railway.app/api
{{ACCESSTOKEN}} = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (from login/register)
```

**Tip:** Save these in Postman environment variables or a bash script.

---

## 🎯 Next Steps After Testing

1. ✅ **All tests pass** → Ready for production!
2. 🔑 **Switch to live keys**:
   - Update Railway env: `PAYSTACK_SECRET_KEY=sk_live_xxx`
   - Restart Railway app
3. 💰 **Fund Paystack account** for withdrawals
4. 📧 **Request DVA access** for virtual accounts
5. 🚀 **Start Phase 2** (VTU Services)

---

**Testing Date:** November 9, 2025  
**Environment:** Production (Railway)  
**Status:** Ready to Test ✅

