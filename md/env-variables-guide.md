# Environment Variables Guide

## 📝 **Add These to Your `.env` File**

```bash
# ==============================================
# VTPASS MESSAGING (SMS) - NEW!
# ==============================================
VTPASS_MESSAGING_PUBLIC_KEY=VT_PK_xxxxxxxxxxxxx
VTPASS_MESSAGING_SECRET_KEY=VT_SK_xxxxxxxxxxxxx
VTPASS_SMS_SENDER=RaverPay
VTPASS_USE_DND_ROUTE=false

# ==============================================
# RESEND (Email) - NEW!
# ==============================================
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@expertvetteddigital.tech
RESEND_FROM_NAME=RaverPay

# ==============================================
# VERIFICATION SETTINGS - NEW!
# ==============================================
ENABLE_EMAIL_VERIFICATION=true
ENABLE_SMS_VERIFICATION=true
VERIFICATION_CODE_EXPIRY_MINUTES=10
MAX_VERIFICATION_ATTEMPTS=3

# ==============================================
# RATE LIMITING - NEW!
# ==============================================
EMAIL_VERIFICATION_RATE_LIMIT=3
SMS_VERIFICATION_RATE_LIMIT=3
```

## 🔑 **How to Get Your Keys**

### **1. VTPass Messaging (SMS)**

1. Login to https://vtpass.com
2. Go to **Messaging Dashboard**
3. Find **Keys** section
4. Click the eye icon to reveal:
   - `VTPASS_MESSAGING_PUBLIC_KEY` (starts with VT*PK*)
   - `VTPASS_MESSAGING_SECRET_KEY` (starts with VT*SK*)

### **2. Resend (Email)**

1. Go to https://resend.com
2. Add your domain: `expertvetteddigital.tech`
3. Verify DNS records
4. Go to **API Keys**
5. Create new API key
6. Copy the key (starts with re\_)

## ✅ **Quick Setup**

```bash
# 1. Copy your existing .env
cp .env .env.backup

# 2. Open .env in editor
nano .env

# 3. Add the variables above

# 4. Save and restart server
pnpm run start:dev
```

## 🧪 **Testing**

After adding keys, test with:

```bash
# Register new user (triggers email verification)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "08012345678",
    "password": "Test@12345",
    "firstName": "Test",
    "lastName": "User"
  }'

# Check your email inbox for verification code!
# Check your phone for SMS verification code!
```

## ⚠️ **Important Notes**

1. **Mock Mode**: If keys are missing, services run in MOCK mode (logs only)
2. **Sender ID**: `RaverPay` needs VTPass approval (24-48 hours)
   - Use `VTPass` as sender for immediate testing
3. **DNS**: Resend domain verification takes 5-60 minutes
4. **Cost**: Test thoroughly in sandbox before going live!
