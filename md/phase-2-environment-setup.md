# Phase 2: VTU Services - Environment Setup

**Environment variables required for VTU services integration**

---

## 🔑 VTPass API Keys

### 1. Create VTPass Account

**Sandbox (Testing):**
1. Go to: https://sandbox.vtpass.com
2. Sign up for a free account
3. Verify your email
4. Navigate to Dashboard → Settings → API Keys

**Production (Live):**
1. Go to: https://vtpass.com
2. Create an account
3. Complete KYC verification
4. Fund your wallet
5. Get API keys from Dashboard

---

## 📝 Environment Variables

Add these to your `/Users/joseph/Desktop/raverpay/apps/raverpay-api/.env` file:

```env
# ==================== VTPass Configuration ====================

# VTPass API Keys (Sandbox - for testing)
VTPASS_API_KEY=your_sandbox_api_key_here
VTPASS_SECRET_KEY=your_sandbox_secret_key_here
VTPASS_PUBLIC_KEY=your_sandbox_public_key_here
VTPASS_BASE_URL=https://sandbox.vtpass.com/api
VTPASS_WEBHOOK_SECRET=your_webhook_secret_here

# For production, use:
# VTPASS_API_KEY=your_production_api_key_here
# VTPASS_SECRET_KEY=your_production_secret_key_here
# VTPASS_PUBLIC_KEY=your_production_public_key_here
# VTPASS_BASE_URL=https://vtpass.com/api
# VTPASS_WEBHOOK_SECRET=your_production_webhook_secret_here
```

---

## 🧪 Test Credentials

**Test Phone Numbers:**
- Any valid Nigerian number: `08011111111`

**Test Smartcard Numbers:**
- DSTV: `1234567890`
- GOtv: `1234567890`
- Startimes: `1234567890`

**Test Meter Numbers:**
- Any 11-digit number: `12345678901`

**Note:** VTPass sandbox may have limited test data. Some services might return "Service temporarily unavailable" in test mode.

---

## 🔐 Getting Your API Keys

### Step 1: Sign Up

```bash
# Visit sandbox
open https://sandbox.vtpass.com
```

1. Click "Sign Up"
2. Fill in your details:
   - Business Name
   - Email
   - Phone Number
   - Password
3. Verify your email

### Step 2: Get API Keys

1. Login to your dashboard
2. Navigate to: **Settings → API Keys**
3. You'll see:
   - **API Key** - for authentication
   - **Secret Key** - for request signing
   - **Public Key** - for client-side integration
   - **Webhook Secret** - for verifying webhooks

### Step 3: Update .env File

Copy your keys and update the `.env` file:

```bash
cd /Users/joseph/Desktop/raverpay/apps/raverpay-api

# Edit .env file
nano .env
# or
code .env
```

Replace the placeholder values with your actual keys:

```env
VTPASS_API_KEY=sk_test_abc123xyz...
VTPASS_SECRET_KEY=sk_test_secret_abc123xyz...
VTPASS_PUBLIC_KEY=pk_test_abc123xyz...
VTPASS_BASE_URL=https://sandbox.vtpass.com/api
VTPASS_WEBHOOK_SECRET=whsec_abc123xyz...
```

---

## 🌐 Webhook Setup

### Local Testing (ngrok)

```bash
# Start ngrok
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)
```

**Webhook URL:**
```
https://abc123.ngrok-free.app/api/vtu/webhooks/vtpass
```

### Production (Railway)

**Webhook URL:**
```
https://raverpayraverpay-api-production.up.railway.app/api/vtu/webhooks/vtpass
```

### Configure in VTPass Dashboard

1. Login to VTPass dashboard
2. Go to: **Settings → Webhooks**
3. Add webhook URL
4. Select events:
   - ✅ `transaction.success`
   - ✅ `transaction.failed`
   - ✅ `transaction.pending`
5. Save

---

## ✅ Verify Configuration

### Test API Keys

```bash
# Start your server
cd /Users/joseph/Desktop/raverpay/apps/raverpay-api
pnpm run start:dev
```

**Check server logs:**
```
✅ Good: VTPass service initialized
❌ Bad: "VTPass API keys not configured. VTU services will not work."
```

### Test Endpoint

```bash
# Get airtime providers (doesn't require API call to VTPass)
curl http://localhost:3001/api/vtu/airtime/providers \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response:**
```json
[
  { "code": "mtn", "name": "MTN", "logo": "🟡" },
  { "code": "glo", "name": "GLO", "logo": "🟢" },
  { "code": "airtel", "name": "AIRTEL", "logo": "🔴" },
  { "code": "9mobile", "name": "9MOBILE", "logo": "🟢" }
]
```

### Test Data Plans (requires API keys)

```bash
# Get MTN data plans
curl http://localhost:3001/api/vtu/data/plans/MTN \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response:**
```json
[
  {
    "variation_code": "mtn-10mb-100",
    "name": "10MB",
    "variation_amount": "100",
    "fixedPrice": "Yes"
  },
  {
    "variation_code": "mtn-1gb-1000",
    "name": "1GB - 30 Days",
    "variation_amount": "1000",
    "fixedPrice": "Yes"
  }
]
```

If you get this, your API keys are working! ✅

---

## 🚨 Troubleshooting

### Issue 1: "VTPass API keys not configured"

**Solution:**
1. Check `.env` file exists in `/Users/joseph/Desktop/raverpay/apps/raverpay-api/`
2. Verify keys are set correctly
3. No quotes around values
4. No spaces
5. Restart server after updating `.env`

### Issue 2: "Service provider temporarily unavailable"

**Possible causes:**
1. **Invalid API keys** - Double-check keys in VTPass dashboard
2. **Sandbox limitations** - Some services may not work in sandbox
3. **VTPass API down** - Check https://status.vtpass.com
4. **Network issues** - Check your internet connection

**Solution:**
```bash
# Test with curl directly to VTPass API
curl https://sandbox.vtpass.com/api/service-variations?serviceID=mtn-data \
  -H "api-key: your_api_key" \
  -H "secret-key: your_secret_key"
```

### Issue 3: "Invalid signature" on webhook

**Solution:**
1. Verify `VTPASS_WEBHOOK_SECRET` matches VTPass dashboard
2. Check webhook URL is correct
3. Ensure webhook secret hasn't changed

---

## 📊 Production Readiness

### Before Going Live

- [ ] Create production VTPass account
- [ ] Complete KYC verification on VTPass
- [ ] Fund VTPass wallet with test amount (₦1,000)
- [ ] Get production API keys
- [ ] Update `.env` with production keys
- [ ] Change `VTPASS_BASE_URL` to `https://vtpass.com/api`
- [ ] Update webhook URL in VTPass dashboard
- [ ] Test with small real transactions (₦100 airtime)
- [ ] Monitor for 24 hours
- [ ] Set up alerts for failed transactions

### Production vs Sandbox

| Feature | Sandbox | Production |
|---------|---------|------------|
| API Keys | Test keys | Live keys |
| Transactions | Fake/Test | Real money |
| Phone Numbers | Test numbers | Real numbers |
| Wallet Funding | Not required | Required |
| KYC | Not required | Required |
| API Limits | Limited | Full access |
| Support | Email only | Priority support |

---

## 💰 Pricing & Fees

### VTPass Charges

| Service | VTPass Fee | Your Fee | Total User Pays |
|---------|------------|----------|-----------------|
| Airtime | ~0.5-1% | 2% (max ₦100) | Amount + Your Fee |
| Data | ~0.5-1% | 2% (max ₦100) | Amount + Your Fee |
| Cable TV | ~₦20-30 | ₦50 | Amount + Your Fee |
| Electricity | ~₦20-30 | ₦50 | Amount + Your Fee |

**Example: ₦1,000 MTN Airtime**
- Amount: ₦1,000
- VTPass fee: ~₦10 (deducted from your wallet)
- Your fee: ₦20 (2% of ₦1,000)
- User pays: ₦1,020
- Your profit: ₦10

---

## 📚 Additional Resources

- **VTPass API Docs:** https://vtpass.com/documentation
- **VTPass Sandbox:** https://sandbox.vtpass.com
- **VTPass Support:** support@vtpass.com
- **VTPass Status:** https://status.vtpass.com

---

**Setup Date:** November 10, 2025  
**Status:** Ready for Configuration 🔧  
**Next Step:** Get VTPass API keys and test

---

**Questions?** Check the troubleshooting section or contact VTPass support.

