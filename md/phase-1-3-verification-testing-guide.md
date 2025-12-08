# Phase 1.3: Email & SMS Verification Testing Guide

**RaverPay - Real Verification Services Testing**

---

## 📋 Prerequisites

### ✅ **Before Starting**

1. **Add environment variables** (see `md/env-variables-guide.md`):

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@expertvetteddigital.tech
RESEND_FROM_NAME=RaverPay

VTPASS_MESSAGING_PUBLIC_KEY=VT_PK_xxxxxxxxxxxxx
VTPASS_MESSAGING_SECRET_KEY=VT_SK_xxxxxxxxxxxxx
VTPASS_SMS_SENDER=RaverPay

ENABLE_EMAIL_VERIFICATION=true
ENABLE_SMS_VERIFICATION=true
VERIFICATION_CODE_EXPIRY_MINUTES=10
MAX_VERIFICATION_ATTEMPTS=5
```

2. **Start server**:

```bash
cd apps/raverpay-api
pnpm run start:dev
```

3. **Verify server is running**:

```bash
curl http://localhost:3001/api
# Should return: "Welcome to RaverPay API 🇳🇬"
```

---

## 🧪 Test 1: Register New User (Sends Email & SMS)

### **Localhost:**

```bash
curl -X POST {{URL}}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "verify.test@example.com",
    "phone": "08012345678",
    "password": "Test@12345",
    "firstName": "Verify",
    "lastName": "Tester"
  }'
```

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "verify.test@example.com",
    "phone": "08012345678",
    "password": "Test@12345",
    "firstName": "Verify",
    "lastName": "Tester"
  }'
```

### **Expected Response:**

```json
{
  "user": {
    "id": "...",
    "email": "verify.test@example.com",
    "phone": "08012345678",
    "firstName": "Verify",
    "lastName": "Tester",
    "emailVerified": false,
    "phoneVerified": false,
    "kycTier": "TIER_0",
    "status": "PENDING_VERIFICATION"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### **What Happens:**

- ✅ User account created
- ✅ Verification code email sent (check inbox!)
- ✅ Verification code SMS sent (check phone!)
- ⚠️ User status: `PENDING_VERIFICATION`
- ⚠️ KYC Tier: `TIER_0`

**📧 Check your email for verification code!**  
**📱 Check your phone for SMS verification code!**

---

## 🧪 Test 2: Login and Send Email Verification

### **Step 1: Login**

#### **Localhost:**

```bash
curl -X POST {{URL}}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "verify.test@example.com",
    "password": "Test@12345"
  }'
```

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "verify.test@example.com",
    "password": "Test@12345"
  }'
```

**Save the `accessToken` from response!**

### **Step 2: Send Email Verification Code**

#### **Localhost:**

```bash
curl -X POST {{URL}}/api/users/send-email-verification \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json"
```

```bash
curl -X POST http://localhost:3001/api/users/send-email-verification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### **Expected Response:**

```json
{
  "message": "Verification code sent to your email",
  "expiresIn": "10 minutes"
}
```

**📧 Check your email for the 6-digit code!**

---

## 🧪 Test 3: Verify Email with Code

### **Localhost:**

```bash
curl -X POST {{URL}}/api/users/verify-email \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

```bash
curl -X POST http://localhost:3001/api/users/verify-email \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

### **Expected Response:**

```json
{
  "message": "Email verified successfully",
  "emailVerified": true,
  "kycTier": "TIER_0"
}
```

### **What Happens:**

- ✅ Email marked as verified
- ✅ Welcome email sent automatically
- ⚠️ KYC Tier still `TIER_0` (need phone verification for TIER_1)

**📧 Check your email for welcome message!**

---

## 🧪 Test 4: Send Phone Verification Code

### **Localhost:**

```bash
curl -X POST {{URL}}/api/users/send-phone-verification \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json"
```

```bash
curl -X POST http://localhost:3001/api/users/send-phone-verification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### **Expected Response:**

```json
{
  "message": "Verification code sent to your phone",
  "expiresIn": "10 minutes"
}
```

**📱 Check your phone for the 6-digit SMS code!**

---

## 🧪 Test 5: Verify Phone with Code

### **Localhost:**

```bash
curl -X POST {{URL}}/api/users/verify-phone \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

```bash
curl -X POST http://localhost:3001/api/users/verify-phone \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

### **Expected Response:**

```json
{
  "message": "Phone number verified successfully",
  "phoneVerified": true,
  "kycTier": "TIER_1",
  "status": "ACTIVE"
}
```

### **What Happens:**

- ✅ Phone marked as verified
- ✅ **KYC Tier upgraded: `TIER_0` → `TIER_1`** 🎉
- ✅ **Status: `ACTIVE`** (both email & phone verified)
- ✅ User can now fully use the platform!

---

## 🧪 Test 6: Get User Profile (Verify Status)

### **Localhost:**

```bash
curl -X GET {{URL}}/api/users/profile \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### **Expected Response:**

```json
{
  "id": "...",
  "email": "verify.test@example.com",
  "phone": "08012345678",
  "firstName": "Verify",
  "lastName": "Tester",
  "emailVerified": true,
  "emailVerifiedAt": "2025-11-11T10:00:00.000Z",
  "phoneVerified": true,
  "phoneVerifiedAt": "2025-11-11T10:05:00.000Z",
  "kycTier": "TIER_1",
  "status": "ACTIVE",
  "wallet": {
    "id": "...",
    "balance": "0",
    "currency": "NGN"
  }
}
```

---

## ❌ Test 7: Error Scenarios

### **Test 7a: Invalid Verification Code**

```bash
curl -X POST http://localhost:3001/api/users/verify-email \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "000000"
  }'
```

**Expected:** `400 Bad Request`

```json
{
  "message": "Invalid verification code. 4 attempts remaining.",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### **Test 7b: Expired Verification Code**

**Wait 10 minutes after requesting code, then:**

```bash
curl -X POST http://localhost:3001/api/users/verify-email \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

**Expected:** `400 Bad Request`

```json
{
  "message": "Verification code has expired. Please request a new one.",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### **Test 7c: Too Many Failed Attempts**

**Try wrong code 5 times, then:**

```bash
curl -X POST http://localhost:3001/api/users/verify-email \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

**Expected:** `400 Bad Request`

```json
{
  "message": "Too many failed attempts. Please request a new code.",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### **Test 7d: Already Verified Email**

**Try verifying again after successful verification:**

```bash
curl -X POST http://localhost:3001/api/users/send-email-verification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Expected:** `409 Conflict`

```json
{
  "message": "Email already verified",
  "error": "Conflict",
  "statusCode": 409
}
```

---

## 🎯 Test 8: Complete Verification Flow (Fresh User)

### **Step-by-Step:**

```bash
# 1. Register
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "phone": "08099887766",
    "password": "Test@12345",
    "firstName": "New",
    "lastName": "User"
  }' | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

echo "Access Token: $TOKEN"

# 2. Check email and phone for codes (they're sent on registration!)

# 3. Verify email
curl -X POST http://localhost:3001/api/users/verify-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "EMAIL_CODE_HERE"
  }'

# 4. Verify phone
curl -X POST http://localhost:3001/api/users/verify-phone \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PHONE_CODE_HERE"
  }'

# 5. Check profile (should be TIER_1 and ACTIVE)
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Expected Results Summary

| Test   | Action            | Expected Result                    |
| ------ | ----------------- | ---------------------------------- |
| **1**  | Register          | Email & SMS sent, user pending     |
| **2**  | Send email code   | Code sent, expires in 10 mins      |
| **3**  | Verify email      | Email verified, welcome email sent |
| **4**  | Send phone code   | SMS sent, expires in 10 mins       |
| **5**  | Verify phone      | Phone verified, TIER_1, ACTIVE     |
| **6**  | Get profile       | Shows verified status              |
| **7a** | Wrong code        | Error with attempts remaining      |
| **7b** | Expired code      | Expiration error                   |
| **7c** | Too many attempts | Locked out error                   |
| **7d** | Already verified  | Conflict error                     |
| **8**  | Complete flow     | User fully verified                |

---

## 🔍 What to Check

### **1. Email Inbox:**

- ✅ Verification code email (beautiful template!)
- ✅ Welcome email (after email verification)

### **2. Phone (SMS):**

- ✅ Verification code SMS (short message)

### **3. Server Logs:**

```bash
# Watch logs in real-time
cd apps/raverpay-api
pnpm run start:dev

# Look for:
✅ Resend email service initialized
✅ VTPass SMS service initialized
✅ Verification email sent to...
✅ Verification SMS sent to...
✅ Welcome email sent to...
```

### **4. Database:**

- ✅ User `emailVerified` = true
- ✅ User `phoneVerified` = true
- ✅ User `kycTier` = TIER_1
- ✅ User `status` = ACTIVE

---

## 🐛 Troubleshooting

### **Email not received?**

1. Check spam folder
2. Verify `RESEND_API_KEY` is set
3. Verify domain is verified on Resend
4. Check server logs for errors

### **SMS not received?**

1. Verify `VTPASS_MESSAGING` keys are set
2. Check VTPass SMS balance (run balance check)
3. Verify sender ID is approved
4. Check if phone is in DND (may need DND route)

### **"MOCK mode" in logs?**

- Missing API keys
- Services will log codes but won't actually send
- Add keys to `.env` file

### **Check SMS Balance:**

```bash
# Add this endpoint to test
curl -X GET http://localhost:3001/api/vtu/sms-balance \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Success Criteria

**Before mobile app development, verify:**

- ✅ Users can register
- ✅ Email verification code received
- ✅ SMS verification code received
- ✅ Both codes can be verified
- ✅ KYC tier upgrades to TIER_1
- ✅ User status becomes ACTIVE
- ✅ Welcome email sent
- ✅ Verification expires after 10 minutes
- ✅ Failed attempts are tracked
- ✅ Error messages are clear

---

## 📝 Notes

1. **Mock Mode:** If API keys are missing, services run in mock mode (logs only)
2. **Code Expiry:** 10 minutes (configurable via env var)
3. **Max Attempts:** 5 (configurable via env var)
4. **VTPass Sender:** Use `VTPass` for testing, `RaverPay` after approval
5. **Email Templates:** Fully styled HTML emails
6. **SMS Templates:** Short messages (< 160 chars)

---

## 🚀 Next Steps

After successful testing:

1. ✅ Deploy to Railway (production)
2. ✅ Update Paystack webhook URL on Railway
3. ✅ Start building mobile app
4. ✅ Test complete user journey

---

**Testing Date:** November 11, 2025  
**Phase:** 1.3 Verification Implementation  
**Status:** ✅ Ready for Testing
