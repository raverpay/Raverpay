# RaverPay Production Testing Guide

**API URL:** https://raverpayraverpay-api-production.up.railway.app

---

## 🚀 Setup

Set your environment variables (if using Postman/Thunder Client):

```bash
URL=https://raverpayraverpay-api-production.up.railway.app
ACCESSTOKEN=<your_token_here>
```

For command line testing:

```bash
export URL="https://raverpayraverpay-api-production.up.railway.app"
export ACCESSTOKEN="<your_token_here>"
```

---

## 📝 Test Flow

```
1. Register new user → Get tokens
2. Login → Get fresh token
3. Get user profile
4. Update profile
5. Change password
6. Email verification (send + verify)
7. Phone verification (send + verify)
8. BVN verification
9. NIN verification
10. Security tests
```

---

## 1️⃣ Authentication Tests

### Register New User

```bash
curl -X POST {{URL}}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prod.test@raverpay.com",
    "phone": "08098765432",
    "password": "TestProd@123",
    "firstName": "Production",
    "lastName": "Tester"
  }'
```

**Expected Response:**

- Status: 201 Created
- Returns: user object, accessToken, refreshToken
- Save the `accessToken` for next requests

---

### Login

```bash
curl -X POST {{URL}}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "prod.test@raverpay.com",
    "password": "TestProd@123"
  }'
```

**Expected Response:**

- Status: 200 OK
- Returns: user object, accessToken, refreshToken
- Copy `accessToken` to use as {{ACCESSTOKEN}}

---

### Refresh Token

```bash
curl -X POST {{URL}}/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<paste_your_refresh_token>"
  }'
```

---

### Get Current User (Auth Check)

```bash
curl -X GET {{URL}}/api/auth/me \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

---

## 2️⃣ User Profile Tests

### Get User Profile

```bash
curl -X GET {{URL}}/api/users/profile \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response:**

- Status: 200 OK
- Returns: Full user profile with wallet

---

### Update User Profile

```bash
curl -X PUT {{URL}}/api/users/profile \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Joseph",
    "lastName": "Stacks",
    "dateOfBirth": "1995-05-15",
    "gender": "MALE",
    "address": "123 Victoria Island, Lagos",
    "city": "Lagos",
    "state": "Lagos",
    "avatar": "https://example.com/avatar.jpg"
  }'
```

**Expected Response:**

- Status: 200 OK
- Returns: Updated user profile

---

### Test Profile Validation (Should Fail)

```bash
curl -X PUT {{URL}}/api/users/profile \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "A",
    "gender": "INVALID"
  }'
```

**Expected Response:**

- Status: 400 Bad Request
- Returns: Validation errors

---

## 3️⃣ Password Management

### Change Password

```bash
curl -X POST {{URL}}/api/users/change-password \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "TestProd@123",
    "newPassword": "NewTestProd@456"
  }'
```

**Expected Response:**

- Status: 200 OK
- Message: "Password changed successfully"

---

### Test Wrong Current Password (Should Fail)

```bash
curl -X POST {{URL}}/api/users/change-password \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "WrongPassword",
    "newPassword": "NewTestProd@456"
  }'
```

**Expected Response:**

- Status: 400 Bad Request
- Message: "Current password is incorrect"

---

### Test Same Password (Should Fail)

```bash
curl -X POST {{URL}}/api/users/change-password \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "NewTestProd@456",
    "newPassword": "NewTestProd@456"
  }'
```

**Expected Response:**

- Status: 400 Bad Request
- Message: "New password must be different from current password"

---

### Verify Login Works with New Password

```bash
curl -X POST {{URL}}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "prod.test@raverpay.com",
    "password": "NewTestProd@456"
  }'
```

**Expected Response:**

- Status: 200 OK
- New tokens returned

---

## 4️⃣ Email Verification

### Send Email Verification Code

```bash
curl -X POST {{URL}}/api/users/send-email-verification \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response:**

- Status: 200 OK
- Message: "Verification code sent to your email"
- Check server logs for code (in production, check email)

---

### Verify Email with Code

```bash
curl -X POST {{URL}}/api/users/verify-email \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

**Replace `123456` with the actual code from server logs/email**

**Expected Response:**

- Status: 200 OK
- Message: "Email verified successfully"
- emailVerified: true

---

### Test Invalid Code (Should Fail)

```bash
curl -X POST {{URL}}/api/users/verify-email \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "999999"
  }'
```

**Expected Response:**

- Status: 400 Bad Request or 409 Conflict
- Message: "Invalid or expired verification code" or "Email already verified"

---

## 5️⃣ Phone Verification

### Send Phone Verification Code

```bash
curl -X POST {{URL}}/api/users/send-phone-verification \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Response:**

- Status: 200 OK
- Message: "Verification code sent to your phone"
- Check server logs for code (in production, check SMS)

---

### Verify Phone with Code

```bash
curl -X POST {{URL}}/api/users/verify-phone \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "654321"
  }'
```

**Replace `654321` with the actual code from server logs/SMS**

**Expected Response:**

- Status: 200 OK
- Message: "Phone number verified successfully"
- phoneVerified: true
- User status may update to ACTIVE

---

### Test Invalid Code (Should Fail)

```bash
curl -X POST {{URL}}/api/users/verify-phone \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "000000"
  }'
```

**Expected Response:**

- Status: 400 Bad Request or 409 Conflict
- Message: "Invalid or expired verification code" or "Phone already verified"

---

### Check Profile After Email + Phone Verification

```bash
curl -X GET {{URL}}/api/users/profile \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected:**

- emailVerified: true
- phoneVerified: true
- status: "ACTIVE"
- kycTier: Should be "TIER_1" (after latest fix)

---

## 6️⃣ BVN Verification

### Verify BVN

```bash
curl -X POST {{URL}}/api/users/verify-bvn \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "bvn": "12345678901",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response:**

- Status: 200 OK
- Message: "BVN verified successfully"
- kycTier: "TIER_2"
- status: "ACTIVE"
- bvnVerified: true

---

### Test Invalid BVN - Short (Should Fail)

```bash
curl -X POST {{URL}}/api/users/verify-bvn \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "bvn": "123",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response:**

- Status: 400 Bad Request
- Validation errors

---

### Test Invalid BVN - Non-numeric (Should Fail)

```bash
curl -X POST {{URL}}/api/users/verify-bvn \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "bvn": "1234567890A",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response:**

- Status: 400 Bad Request
- Validation errors

---

### Test Duplicate BVN (Should Fail)

```bash
curl -X POST {{URL}}/api/users/verify-bvn \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "bvn": "12345678901",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response:**

- Status: 409 Conflict
- Message: "BVN already verified"

---

## 7️⃣ NIN Verification

### Verify NIN

```bash
curl -X POST {{URL}}/api/users/verify-nin \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "nin": "98765432109",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response:**

- Status: 200 OK
- Message: "NIN verified successfully"
- kycTier: "TIER_3" (if BVN also verified)
- status: "ACTIVE"
- ninVerified: true

---

### Test Invalid NIN (Should Fail)

```bash
curl -X POST {{URL}}/api/users/verify-nin \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "nin": "123",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response:**

- Status: 400 Bad Request
- Validation errors

---

### Test Duplicate NIN (Should Fail)

```bash
curl -X POST {{URL}}/api/users/verify-nin \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "nin": "98765432109",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response:**

- Status: 409 Conflict
- Message: "NIN already verified"

---

## 8️⃣ Final Profile Check

### Get Complete Profile

```bash
curl -X GET {{URL}}/api/users/profile \
  -H "Authorization: Bearer {{ACCESSTOKEN}}"
```

**Expected Final State:**

```json
{
  "status": "ACTIVE",
  "kycTier": "TIER_3",
  "emailVerified": true,
  "phoneVerified": true,
  "bvnVerified": true,
  "ninVerified": true,
  "wallet": {
    "balance": "0",
    "currency": "NGN",
    "isLocked": false
  }
}
```

---

## 9️⃣ Security Tests

### Test No Authentication (Should Fail)

```bash
curl -X GET {{URL}}/api/users/profile
```

**Expected Response:**

- Status: 401 Unauthorized

---

### Test Invalid Token (Should Fail)

```bash
curl -X GET {{URL}}/api/users/profile \
  -H "Authorization: Bearer invalid_token_12345"
```

**Expected Response:**

- Status: 401 Unauthorized

---

### Test Expired Token (Should Fail)

Use a token that's older than 15 minutes:

```bash
curl -X GET {{URL}}/api/users/profile \
  -H "Authorization: Bearer <old_token>"
```

**Expected Response:**

- Status: 401 Unauthorized

---

### Test Update Without Auth (Should Fail)

```bash
curl -X PUT {{URL}}/api/users/profile \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Hacker"
  }'
```

**Expected Response:**

- Status: 401 Unauthorized

---

### Test Change Password Without Auth (Should Fail)

```bash
curl -X POST {{URL}}/api/users/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "test",
    "newPassword": "hack"
  }'
```

**Expected Response:**

- Status: 401 Unauthorized

---

### Test BVN Verification Without Auth (Should Fail)

```bash
curl -X POST {{URL}}/api/users/verify-bvn \
  -H "Content-Type: application/json" \
  -d '{
    "bvn": "12345678901",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response:**

- Status: 401 Unauthorized

---

## 🔟 Edge Cases & Error Handling

### Test SQL Injection Attempt (Should Be Safe)

```bash
curl -X POST {{URL}}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@test.com'\'' OR 1=1--",
    "password": "anything"
  }'
```

**Expected Response:**

- Status: 401 Unauthorized
- No SQL error, handled safely by Prisma

---

### Test XSS in Profile Update (Should Be Sanitized)

```bash
curl -X PUT {{URL}}/api/users/profile \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "<script>alert(\"XSS\")</script>",
    "lastName": "Test"
  }'
```

**Expected:**

- Should either reject or sanitize the input

---

### Test Missing Required Fields

```bash
curl -X POST {{URL}}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "missing@fields.com"
  }'
```

**Expected Response:**

- Status: 400 Bad Request
- Validation errors for missing fields

---

### Test Duplicate Email Registration

```bash
curl -X POST {{URL}}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prod.test@raverpay.com",
    "phone": "08012345678",
    "password": "Test@123",
    "firstName": "Duplicate",
    "lastName": "User"
  }'
```

**Expected Response:**

- Status: 409 Conflict
- Message: "Email already registered"

---

### Test Duplicate Phone Registration

```bash
curl -X POST {{URL}}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "phone": "08098765432",
    "password": "Test@123",
    "firstName": "Duplicate",
    "lastName": "Phone"
  }'
```

**Expected Response:**

- Status: 409 Conflict
- Message: "Phone number already registered"

---

## 📊 Test Summary Checklist

### Authentication ✅

- [ ] Register new user
- [ ] Login with email
- [ ] Login with phone
- [ ] Refresh token
- [ ] Get current user

### Profile Management ✅

- [ ] Get user profile
- [ ] Update profile fields
- [ ] Profile validation works
- [ ] Sensitive fields excluded

### Password Management ✅

- [ ] Change password successfully
- [ ] Reject wrong current password
- [ ] Reject same new password
- [ ] Login with new password works
- [ ] Old password rejected

### Email Verification ✅

- [ ] Send verification code
- [ ] Verify with correct code
- [ ] Reject invalid code
- [ ] Reject already verified email
- [ ] Email marked as verified

### Phone Verification ✅

- [ ] Send verification code
- [ ] Verify with correct code
- [ ] Reject invalid code
- [ ] Reject already verified phone
- [ ] Status updates to ACTIVE

### BVN Verification ✅

- [ ] Verify valid BVN
- [ ] KYC tier upgrades to TIER_2
- [ ] Reject invalid BVN format
- [ ] Reject already verified BVN
- [ ] Validation works

### NIN Verification ✅

- [ ] Verify valid NIN
- [ ] KYC tier upgrades correctly
- [ ] Reject invalid NIN format
- [ ] Reject already verified NIN
- [ ] Validation works

### Security ✅

- [ ] All endpoints require auth
- [ ] Invalid tokens rejected
- [ ] Expired tokens rejected
- [ ] Missing auth rejected
- [ ] SQL injection safe
- [ ] XSS handled

### Error Handling ✅

- [ ] Missing fields handled
- [ ] Duplicate email handled
- [ ] Duplicate phone handled
- [ ] Invalid data validated
- [ ] Error messages clear

---

## 🚨 Known Issues (Mock Data)

**Current State:**

- ✅ Email codes: Console logged (no actual email sent)
- ✅ SMS codes: Console logged (no actual SMS sent)
- ✅ BVN verification: Mock simulation (always valid)
- ✅ NIN verification: Mock simulation (always valid)

**Before Production:**

- Integrate Termii for SMS
- Integrate Resend for Email
- Integrate Mono for BVN
- Integrate Dojah/Mono for NIN

See `md/phase-1-3-production-todo.md` for details.

---

## 💡 Tips for Production Testing

1. **Check Railway Logs:**

   ```
   Go to Railway Dashboard → raverpay-api → Deployments → View Logs
   ```

   Look for verification codes in logs

2. **Monitor Database:**
   - Use Prisma Studio or connect to production DB
   - Verify data is being saved correctly

3. **Test from Multiple Devices:**
   - Desktop browser
   - Mobile browser
   - Postman/Thunder Client
   - Mobile app (when ready)

4. **Performance Testing:**
   - Use tools like Apache Bench or k6
   - Test concurrent requests
   - Monitor response times

5. **Error Tracking:**
   - Set up Sentry or similar
   - Track errors in production
   - Monitor success rates

---

**Testing Date:** November 9, 2025  
**API Version:** 1.3  
**Status:** Ready for Production Testing ✅

---

## 🎯 Success Criteria

All tests pass with:

- ✅ Correct HTTP status codes
- ✅ Expected response formats
- ✅ Data persisted in database
- ✅ Security validations working
- ✅ Error handling graceful
- ✅ Performance acceptable (< 500ms per request)
