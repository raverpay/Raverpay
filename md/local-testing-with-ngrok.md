# Local Testing with ngrok - Complete Guide

**Test your payment webhooks locally before deploying to production**

---

## 📋 Prerequisites

- ✅ Paystack test keys in `.env` file
- ✅ ngrok installed (`brew install ngrok` if not installed)
- ✅ Terminal open

---

## 🚀 Step 1: Start the API Server Locally

### Open Terminal 1 (API Server)

```bash
# Navigate to API directory
cd /Users/joseph/Desktop/mularpay/apps/mularpay-api

# Start development server
pnpm run start:dev
```

**Expected output:**

```
[Nest] 12345  - 11/09/2025, 4:00:00 PM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 11/09/2025, 4:00:00 PM     LOG [InstanceLoader] AppModule dependencies initialized
...
[Nest] 12345  - 11/09/2025, 4:00:01 PM     LOG [NestApplication] Nest application successfully started
[Nest] 12345  - 11/09/2025, 4:00:01 PM     LOG [Main] 🚀 Server running on http://localhost:3001
```

### Verify Server is Running

Open a new terminal and test:

```bash
curl http://localhost:3001/api
```

**Expected response:**

```
Welcome to MularPay API 🇳🇬
```

✅ If you see this, server is running correctly!

---

## 🌐 Step 2: Start ngrok

### Open Terminal 2 (ngrok)

```bash
# Expose local port 3001 to the internet
ngrok http 3001
```

**Expected output:**

```
ngrok

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123xyz.ngrok-free.app -> http://localhost:3001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### Important Information

**Copy these URLs:**

1. **ngrok Public URL:** `https://abc123xyz.ngrok-free.app`
2. **Webhook URL:** `https://abc123xyz.ngrok-free.app/api/payments/webhooks/paystack`
3. **ngrok Dashboard:** `http://127.0.0.1:4040` (Open in browser)

⚠️ **Important:** This URL changes every time you restart ngrok (free plan)

### Keep This Terminal Open

Don't close Terminal 2! ngrok needs to stay running to forward requests.

---

## 🔧 Step 3: Configure Paystack Webhook

### Add Webhook URL to Paystack Dashboard

1. **Login to Paystack:**
   - Go to: https://dashboard.paystack.com/#/settings/developer

2. **Scroll to "Webhook URL" section**

3. **Paste your webhook URL:**

   ```
   https://abc123xyz.ngrok-free.app/api/payments/webhooks/paystack
   ```

   (Replace `abc123xyz` with your actual ngrok URL)

4. **Click "Save"**

### Test Webhook Connection

After saving, Paystack should show a "Test Webhook URL" button.

1. **Click "Test Webhook URL"**

2. **Check Terminal 1 (API Server)**

**You should see:**

```
[PaymentsController] Webhook event received: charge.success
[PaymentsController] Unhandled event: charge.success (or similar)
```

3. **Check ngrok Dashboard:**
   - Open: http://127.0.0.1:4040
   - You should see the POST request to `/api/payments/webhooks/paystack`
   - Status: 200 OK ✅

✅ If you see logs, webhook is working!

---

## 👤 Step 4: Register/Login a Test User

### Open Terminal 3 (Testing)

```bash
# Register a new test user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ngrok.test@mularpay.com",
    "phone": "08011223344",
    "password": "Test@12345",
    "firstName": "Ngrok",
    "lastName": "Tester"
  }'
```

**Or login with existing user:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "ngrok.test@mularpay.com",
    "password": "Test@12345"
  }'
```

**Response:**

```json
{
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "expiresIn": 900
}
```

### Save Your Access Token

```bash
# Copy the accessToken from response and export it
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzYyNzQ1LCJleHAiOjE3NjI3NjM2NDV9.43TjL7z7Eclour3YAc7aPjKDjgTlU5PXXyiKf9OBvd4"
```

**Verify token works:**

```bash
curl -X GET http://localhost:3001/api/wallet \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**

```json
{
  "id": "...",
  "balance": "0",
  "currency": "NGN",
  ...
}
```

---

## 💳 Step 5: Test Card Payment (End-to-End)

### Check Initial Balance

```bash
curl -X GET http://localhost:3001/api/wallet \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `"balance": "0"`

### Initialize Card Payment

```bash
curl -X POST http://localhost:3001/api/transactions/fund/card \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000
  }' | python3 -m json.tool
```

**Response:**

```json
{
  "reference": "TXN_DEP_1762703...",
  "authorizationUrl": "https://checkout.paystack.com/abc123xyz",
  "accessCode": "abc123xyz"
}
```

### Save the Reference

```bash
export REFERENCE="TXN_DEP_1762703..." -> TXN_DEP_17627628955732150
```

### Complete Payment on Paystack

1. **Copy the `authorizationUrl`** from the response

2. **Open URL in browser:**

   ```
   https://checkout.paystack.com/abc123xyz
   ```

3. **Enter Paystack test card:**

   ```
   Card Number: 4084 0840 8408 4081
   CVV: 408
   Expiry: 12/30
   PIN: 0000
   OTP: 123456
   ```

4. **Click "Pay ₦5,000"**

5. **Enter PIN:** `0000`

6. **Enter OTP:** `123456`

7. **Submit**

### Watch the Webhook Magic! ✨

**What happens:**

1. **Paystack processes payment** ✅

2. **Paystack sends webhook to ngrok:**

   ```
   POST https://abc123xyz.ngrok-free.app/api/payments/webhooks/paystack
   ```

3. **ngrok forwards to localhost:3001**

4. **Your API receives webhook**

5. **API processes webhook and credits wallet**

### Monitor in Real-Time

**Terminal 1 (API Server) will show:**

```
[PaymentsController] Webhook event received: charge.success
[PaystackService] Verifying payment: TXN_DEP_1762703...
[TransactionsService] Card payment successful: TXN_DEP_1762703...
[PrismaService] Transaction completed, wallet credited
```

**ngrok Dashboard (http://127.0.0.1:4040) will show:**

- POST request to `/api/payments/webhooks/paystack`
- Status: 200 OK
- Request headers (including `x-paystack-signature`)
- Request body (webhook payload)
- Response: `{"status": "success"}`

**Paystack Dashboard will show:**

- Transaction status: Success
- Webhook delivery: Delivered ✅

---

## ✅ Step 6: Verify Payment

### Check Transaction Status

```bash
curl -X GET http://localhost:3001/api/transactions/verify/$REFERENCE \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected response:**

```json
{
  "status": "success",
  "reference": "TXN_DEP_1762703...",
  "amount": "5000.00",
  "fee": "100.00",
  "netAmount": "5000.00",
  "transactionStatus": "COMPLETED",
  "gateway": "paystack",
  "paidAt": "2025-11-09T16:30:00.000Z"
}
```

### Check Updated Balance

```bash
curl -X GET http://localhost:3001/api/wallet \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:**

```json
{
  "balance": "5000",
  "ledgerBalance": "5000",
  ...
}
```

🎉 **Success! Wallet credited with ₦5,000!**

### View Transaction History

```bash
curl -X GET http://localhost:3001/api/wallet/transactions \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:**

```json
{
  "data": [
    {
      "reference": "TXN_DEP_1762703...",
      "type": "DEPOSIT",
      "status": "COMPLETED",
      "amount": "5000.00",
      "fee": "100.00",
      "description": "Card deposit of ₦5,000"
    }
  ],
  "summary": {
    "totalCredits": "5000.00",
    "totalDebits": "0",
    "netAmount": "5000.00"
  }
}
```

---

## 💸 Step 7: Test Withdrawal (Optional)

### Get Bank List

```bash
curl -X GET http://localhost:3001/api/transactions/banks \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -50
```

### Resolve Account Number

```bash
curl -X POST http://localhost:3001/api/transactions/resolve-account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountNumber": "0690000031",
    "bankCode": "058"
  }' | python3 -m json.tool
```

**Note:** This hits Paystack's real API, so use a valid account number or expect an error in test mode.

### Withdraw Funds

```bash
curl -X POST http://localhost:3001/api/transactions/withdraw \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "accountNumber": "0690000031",
    "accountName": "JOHN DOE",
    "bankCode": "058",
    "narration": "Test withdrawal via ngrok"
  }' | python3 -m json.tool
```

**Expected response:**

```json
{
  "reference": "TXN_WD_1762703...",
  "amount": "2000.00",
  "fee": "25.00",
  "totalDebit": "2025.00",
  "status": "PROCESSING",
  "estimatedTime": "Few minutes to 24 hours"
}
```

**Note:** In test mode, withdrawal may fail if Paystack test account has insufficient balance. The amount will be automatically refunded to your wallet.

### Watch Withdrawal Webhook

If withdrawal succeeds, Paystack will send `transfer.success` webhook.

**Terminal 1 will show:**

```
[PaymentsController] Webhook event received: transfer.success
[PaymentsController] Transfer completed: TXN_WD_1762703...
```

---

## 🔍 Step 8: Debugging & Monitoring

### ngrok Dashboard (Best Tool!)

**Open:** http://127.0.0.1:4040

**Features:**

- 📊 See all HTTP requests in real-time
- 🔍 Inspect request/response headers
- 📝 View full request/response bodies
- 🔄 Replay requests for debugging
- ⏱️ See request timing

**Click on any request to see:**

- HTTP method, path, status code
- Request headers (including `x-paystack-signature`)
- Request body (webhook payload)
- Response body
- Timing information

### Server Logs (Terminal 1)

Watch for:

```
✅ Good signs:
[PaymentsController] Webhook event received: charge.success
[TransactionsService] Card payment successful
[PrismaService] Wallet updated

❌ Error signs:
[PaymentsController] Invalid webhook signature
[TransactionsService] Transaction not found
[PaymentsController] Webhook processing failed
```

### Paystack Dashboard

**Check webhook delivery:**

1. Go to: https://dashboard.paystack.com/#/transactions
2. Click on your transaction
3. Scroll to "Webhooks" section
4. See delivery status and response

**Webhook logs show:**

- Delivery attempt time
- HTTP status code
- Response body
- Retry count (if failed)

---

## 🐛 Troubleshooting

### Issue 1: "Webhook not received"

**Symptoms:**

- Payment successful on Paystack
- No logs in Terminal 1
- No request in ngrok dashboard

**Solutions:**

1. **Check ngrok is running:**

   ```bash
   curl http://localhost:4040/api/tunnels
   ```

2. **Check webhook URL in Paystack matches ngrok URL**

3. **Restart ngrok and update Paystack webhook URL**

4. **Check if ngrok URL changed** (free plan changes on restart)

### Issue 2: "Invalid signature" error

**Symptoms:**

```
[PaymentsController] Invalid webhook signature
```

**Solutions:**

1. **Check `PAYSTACK_SECRET_KEY` in `.env`:**

   ```bash
   cd /Users/joseph/Desktop/mularpay/apps/mularpay-api
   grep PAYSTACK_SECRET_KEY .env
   ```

2. **Ensure you're using test keys for test payments**

3. **Restart server after changing `.env`:**
   ```bash
   # In Terminal 1, press Ctrl+C, then:
   pnpm run start:dev
   ```

### Issue 3: "Wallet not credited"

**Symptoms:**

- Webhook received
- No errors in logs
- Balance still ₦0

**Solutions:**

1. **Check transaction status:**

   ```bash
   curl -X GET http://localhost:3001/api/transactions/verify/$REFERENCE \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Check database directly** (use Prisma Studio):

   ```bash
   cd /Users/joseph/Desktop/mularpay/apps/mularpay-api
   pnpm prisma studio
   ```

   - Open: http://localhost:5555
   - Check `transactions` table
   - Check `wallets` table

3. **Check server logs for errors**

### Issue 4: "Payment successful but webhook failed"

**Symptoms:**

- Payment completed on Paystack
- Paystack dashboard shows "Webhook failed"
- Error 500 or timeout

**Solutions:**

1. **Check server is running** (Terminal 1)

2. **Check if code has syntax errors:**

   ```bash
   cd /Users/joseph/Desktop/mularpay/apps/mularpay-api
   pnpm run build
   ```

3. **Check ngrok dashboard** for error details

4. **Manually verify payment:**
   ```bash
   curl -X GET http://localhost:3001/api/transactions/verify/$REFERENCE \
     -H "Authorization: Bearer $TOKEN"
   ```

### Issue 5: ngrok URL keeps changing

**Problem:** Free ngrok URLs change on restart

**Solutions:**

1. **Sign up for ngrok account** (free):
   - Go to: https://ngrok.com/signup
   - Get auth token
   - Run: `ngrok authtoken YOUR_TOKEN`
   - Get a permanent subdomain (free plan)

2. **Or use Railway for testing** (permanent URL):
   ```
   https://mularpaymularpay-api-production.up.railway.app/api/payments/webhooks/paystack
   ```

---

## 📊 Testing Checklist

Use this checklist for each test session:

### Setup

- [ ] Terminal 1: API server running (`pnpm run start:dev`)
- [ ] Terminal 2: ngrok running (`ngrok http 3001`)
- [ ] Terminal 3: Ready for curl commands
- [ ] ngrok URL copied
- [ ] Paystack webhook URL updated
- [ ] Test webhook button clicked (success)

### Payment Flow

- [ ] User registered/logged in
- [ ] Access token exported (`export TOKEN="..."`)
- [ ] Initial balance checked (₦0)
- [ ] Payment initialized
- [ ] Authorization URL opened in browser
- [ ] Test card entered
- [ ] Payment completed
- [ ] Webhook received (check logs)
- [ ] Webhook processed (check ngrok dashboard)
- [ ] Balance updated (₦5,000)
- [ ] Transaction status: COMPLETED

### Monitoring

- [ ] Server logs show webhook received
- [ ] ngrok dashboard shows 200 OK
- [ ] Paystack dashboard shows webhook delivered
- [ ] No errors in any logs

---

## 🎯 Quick Reference

### Terminal Commands Quick Copy

```bash
# Terminal 1: Start server
cd /Users/joseph/Desktop/mularpay/apps/mularpay-api && pnpm run start:dev

# Terminal 2: Start ngrok
ngrok http 3001

# Terminal 3: Get ngrok URL
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])"

# Register/Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "your@email.com", "password": "yourpass"}'

# Export token
export TOKEN="your-access-token"

# Initialize payment
curl -X POST http://localhost:3001/api/transactions/fund/card \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'

# Check balance
curl -X GET http://localhost:3001/api/wallet \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Verify payment
curl -X GET http://localhost:3001/api/transactions/verify/TXN_DEP_xxx \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### URLs to Bookmark

```
Local API: http://localhost:3001/api
ngrok Dashboard: http://localhost:4040
Paystack Dashboard: https://dashboard.paystack.com
Paystack Settings: https://dashboard.paystack.com/#/settings/developer
```

### Test Card

```
Card Number: 4084 0840 8408 4081
CVV: 408
Expiry: 12/30
PIN: 0000
OTP: 123456
```

---

## 🚀 Next Steps

After successful local testing:

1. **Deploy to Production:**
   - Push code to GitHub
   - Deploy to Railway
   - Update Paystack webhook to Railway URL

2. **Switch to Live Keys:**
   - Get live keys from Paystack
   - Update `.env` in production
   - Test with small real transaction (₦100)

3. **Request DVA Access:**
   - Email Paystack support for virtual accounts
   - Wait for approval
   - Test virtual account creation

4. **Move to Phase 2:**
   - VTU Services (Airtime, Data)
   - Bill Payments
   - Gift Cards

---

## 📝 Notes

- **ngrok free plan** URL changes on restart
- **Keep both terminals open** while testing
- **Test webhook button** is helpful for debugging
- **ngrok dashboard** is your best friend for debugging webhooks
- **Paystack test mode** has limited features (no real money)
- **Virtual accounts** don't work in test mode

---

**Testing Date:** November 9, 2025  
**Environment:** Local (ngrok)  
**Status:** Ready to Test ✅

---

**Happy Testing! 🎉**

If you encounter issues, check the troubleshooting section or review the ngrok dashboard for request details.
