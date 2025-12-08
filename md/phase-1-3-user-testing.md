# Phase 1.3: User Module Testing Guide

**RaverPay - User Management & KYC Testing**

---

## 📋 Overview

Phase 1.3 implements comprehensive user management including:

- ✅ User profile management
- ✅ Password changes
- ✅ BVN/NIN verification
- ✅ Email/phone verification
- ✅ Audit logging

---

## 🚀 Prerequisites

1. **Authentication Token**: You need a valid JWT access token
2. **Registered User**: Complete the registration from Phase 1.2
3. **API Running**: Local or production instance

---

## 🧪 Test Scenarios

### Test Flow:

```
1. Register/Login (Phase 1.2) → Get Access Token
2. Get User Profile
3. Update Profile Information
4. Change Password
5. Send Email Verification Code
6. Verify Email
7. Send Phone Verification Code
8. Verify Phone
9. Verify BVN
10. Verify NIN
```

---

## 📝 Test Cases

### Setup: Get Access Token

First, register or login to get an access token:

```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "archjo6@gmail.com",
    "phone": "08168787584",
    "password": "Test@123",
    "firstName": "Joseph",
    "lastName": "User"
  }'

# Copy the accessToken from the response
export TOKEN="YOUR_ACCESS_TOKEN_HERE"
```

---

### 1. GET User Profile ✅

**Endpoint**: `GET /api/users/profile`

**Test**:

```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):

```json
{
  "id": "uuid",
  "email": "testuser@raverpay.com",
  "phone": "08012345678",
  "firstName": "Test",
  "lastName": "User",
  "role": "USER",
  "status": "PENDING_VERIFICATION",
  "kycTier": "TIER_0",
  "avatar": null,
  "dateOfBirth": null,
  "gender": null,
  "address": null,
  "city": null,
  "state": null,
  "country": "Nigeria",
  "bvn": null,
  "bvnVerified": false,
  "nin": null,
  "ninVerified": false,
  "emailVerified": false,
  "phoneVerified": false,
  "wallet": {
    "id": "uuid",
    "balance": "0.00",
    "currency": "NGN",
    "dailySpent": "0.00",
    "monthlySpent": "0.00",
    "isLocked": false
  },
  "createdAt": "2025-11-09T...",
  "updatedAt": "2025-11-09T..."
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ User details returned
- ✅ Wallet included
- ✅ Sensitive fields excluded (password, twoFactorSecret)

---

### 2. Update User Profile ✅

**Endpoint**: `PUT /api/users/profile`

**Test**:

```bash
curl -X PUT http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name",
    "dateOfBirth": "1995-05-15",
    "gender": "MALE",
    "address": "123 Main Street",
    "city": "Lagos",
    "state": "Lagos",
    "avatar": "https://example.com/avatar.jpg"
  }'
```

**Expected Response** (200 OK):

```json
{
  "id": "uuid",
  "email": "testuser@raverpay.com",
  "phone": "08012345678",
  "firstName": "Updated",
  "lastName": "Name",
  "dateOfBirth": "1995-05-15T00:00:00.000Z",
  "gender": "MALE",
  "address": "123 Main Street",
  "city": "Lagos",
  "state": "Lagos",
  "avatar": "https://example.com/avatar.jpg",
  ...
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ Updated fields reflected
- ✅ Validation works (try invalid data)

**Test Validation**:

```bash
# Test with invalid data (should fail)
curl -X PUT http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "A",
    "gender": "INVALID"
  }'

# Should return 400 Bad Request with validation errors
```

---

### 3. Change Password ✅

**Endpoint**: `POST /api/users/change-password`

**Test**:

```bash
curl -X POST http://localhost:3001/api/users/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Test@123",
    "newPassword": "NewTest@123"
  }'
```

**Expected Response** (200 OK):

```json
{
  "message": "Password changed successfully",
  "timestamp": "2025-11-09T..."
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ Password changed
- ✅ Can login with new password
- ✅ Cannot login with old password
- ✅ Rejects wrong current password
- ✅ Rejects same password

**Test Wrong Current Password**:

```bash
curl -X POST http://localhost:3001/api/users/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "WrongPassword",
    "newPassword": "NewTest@123"
  }'

# Should return 400: "Current password is incorrect"
```

**Test Same Password**:

```bash
curl -X POST http://localhost:3001/api/users/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "NewTest@123",
    "newPassword": "NewTest@123"
  }'

# Should return 400: "New password must be different"
```

---

### 4. Email Verification Flow ✅

#### 4a. Send Verification Code

**Endpoint**: `POST /api/users/send-email-verification`

**Test**:

```bash
curl -X POST http://localhost:3001/api/users/send-email-verification \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):

```json
{
  "message": "Verification code sent to your email",
  "expiresIn": "10 minutes"
}
```

**Check Server Logs** for the verification code:

```
Email verification code for testuser@raverpay.com: 123456
```

#### 4b. Verify Email

**Endpoint**: `POST /api/users/verify-email`

**Test**:

```bash
curl -X POST http://localhost:3001/api/users/verify-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

**Expected Response** (200 OK):

```json
{
  "message": "Email verified successfully",
  "emailVerified": true
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ Email marked as verified
- ✅ Rejects invalid code
- ✅ Rejects already verified email

**Test Invalid Code**:

```bash
curl -X POST http://localhost:3001/api/users/verify-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "999999"
  }'

# Should return 400: "Invalid or expired verification code"
```

---

### 5. Phone Verification Flow ✅

#### 5a. Send Verification Code

**Endpoint**: `POST /api/users/send-phone-verification`

**Test**:

```bash
curl -X POST http://localhost:3001/api/users/send-phone-verification \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):

```json
{
  "message": "Verification code sent to your phone",
  "expiresIn": "10 minutes"
}
```

**Check Server Logs** for the verification code:

```
Phone verification code for 08012345678: 654321
```

#### 5b. Verify Phone

**Endpoint**: `POST /api/users/verify-phone`

**Test**:

```bash
curl -X POST http://localhost:3001/api/users/verify-phone \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "654321"
  }'
```

**Expected Response** (200 OK):

```json
{
  "message": "Phone number verified successfully",
  "phoneVerified": true
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ Phone marked as verified
- ✅ User status may update to ACTIVE
- ✅ Rejects invalid code
- ✅ Rejects already verified phone

---

### 6. BVN Verification ✅

**Endpoint**: `POST /api/users/verify-bvn`

**Test**:

```bash
curl -X POST http://localhost:3001/api/users/verify-bvn \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bvn": "12345678901",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response** (200 OK):

```json
{
  "message": "BVN verified successfully",
  "kycTier": "TIER_2",
  "status": "ACTIVE",
  "bvnVerified": true
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ BVN verified
- ✅ KYC tier upgraded to TIER_2
- ✅ Status updated to ACTIVE (if email & phone verified)
- ✅ Audit log created
- ✅ Rejects invalid BVN (not 11 digits)
- ✅ Rejects already verified BVN

**Test Invalid BVN**:

```bash
# Less than 11 digits
curl -X POST http://localhost:3001/api/users/verify-bvn \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bvn": "123",
    "dateOfBirth": "1995-05-15"
  }'

# Should return 400 with validation error

# Non-numeric BVN
curl -X POST http://localhost:3001/api/users/verify-bvn \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bvn": "1234567890A",
    "dateOfBirth": "1995-05-15"
  }'

# Should return 400 with validation error
```

---

### 7. NIN Verification ✅

**Endpoint**: `POST /api/users/verify-nin`

**Test**:

```bash
curl -X POST http://localhost:3001/api/users/verify-nin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nin": "98765432109",
    "dateOfBirth": "1995-05-15"
  }'
```

**Expected Response** (200 OK):

```json
{
  "message": "NIN verified successfully",
  "kycTier": "TIER_3",
  "status": "ACTIVE",
  "ninVerified": true
}
```

**Pass Criteria**:

- ✅ Status 200
- ✅ NIN verified
- ✅ KYC tier upgraded to TIER_3 (if BVN also verified)
- ✅ KYC tier upgraded to TIER_2 (if BVN not verified)
- ✅ Audit log created
- ✅ Rejects invalid NIN

**KYC Tier Logic**:
| Email | Phone | BVN | NIN | Final Tier |
|-------|-------|-----|-----|------------|
| ✅ | ✅ | ❌ | ❌ | TIER_1 |
| ✅ | ✅ | ✅ | ❌ | TIER_2 |
| ✅ | ✅ | ❌ | ✅ | TIER_2 |
| ✅ | ✅ | ✅ | ✅ | TIER_3 |

---

## 🔒 Security Tests

### 1. Test Without Authentication ❌

```bash
# Should all return 401 Unauthorized
curl -X GET http://localhost:3001/api/users/profile

curl -X PUT http://localhost:3001/api/users/profile \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Test"}'

curl -X POST http://localhost:3001/api/users/verify-bvn \
  -H "Content-Type: application/json" \
  -d '{"bvn": "12345678901", "dateOfBirth": "1995-05-15"}'
```

**Expected**: All return 401 Unauthorized

---

### 2. Test With Invalid Token ❌

```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer invalid_token"
```

**Expected**: 401 Unauthorized

---

### 3. Test With Expired Token ❌

```bash
# Use a token from 16+ minutes ago
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer $EXPIRED_TOKEN"
```

**Expected**: 401 Unauthorized

---

## 🎯 Production Testing (Railway)

Replace `http://localhost:3001` with your Railway URL:

```bash
export API_URL="https://raverpayraverpay-api-production.up.railway.app"

# Test Get Profile
curl -X GET $API_URL/api/users/profile \
  -H "Authorization: Bearer $TOKEN"

# Test Update Profile
curl -X PUT $API_URL/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Production",
    "lastName": "Test",
    "city": "Lagos"
  }'
```

---

## 📊 Complete Test Checklist

### User Profile

- [ ] ✅ Get user profile with wallet data
- [ ] ✅ Update profile (all fields)
- [ ] ✅ Validation works (rejects invalid data)
- [ ] ✅ Sensitive fields excluded from response

### Password Management

- [ ] ✅ Change password with correct current password
- [ ] ✅ Reject wrong current password
- [ ] ✅ Reject same new password
- [ ] ✅ Password validation works
- [ ] ✅ Can login with new password

### Email Verification

- [ ] ✅ Send verification code
- [ ] ✅ Code appears in server logs
- [ ] ✅ Verify with correct code
- [ ] ✅ Reject invalid code
- [ ] ✅ Reject already verified email
- [ ] ✅ Email marked as verified in database

### Phone Verification

- [ ] ✅ Send verification code
- [ ] ✅ Code appears in server logs
- [ ] ✅ Verify with correct code
- [ ] ✅ Reject invalid code
- [ ] ✅ Reject already verified phone
- [ ] ✅ Phone marked as verified in database

### BVN Verification

- [ ] ✅ Verify valid BVN (11 digits)
- [ ] ✅ KYC tier upgraded to TIER_2
- [ ] ✅ Audit log created
- [ ] ✅ Reject invalid BVN format
- [ ] ✅ Reject already verified BVN
- [ ] ✅ Status updated when email+phone verified

### NIN Verification

- [ ] ✅ Verify valid NIN (11 digits)
- [ ] ✅ KYC tier logic correct (TIER_2 or TIER_3)
- [ ] ✅ Audit log created
- [ ] ✅ Reject invalid NIN format
- [ ] ✅ Reject already verified NIN

### Security

- [ ] ✅ All endpoints require authentication
- [ ] ✅ Invalid tokens rejected (401)
- [ ] ✅ Expired tokens rejected (401)
- [ ] ✅ Users can only access their own data
- [ ] ✅ Validation prevents SQL injection
- [ ] ✅ Passwords properly hashed

---

## 🐛 Common Issues & Solutions

### Issue 1: "User not found"

**Solution**: Token might be for a different user or user deleted. Re-register.

### Issue 2: "Invalid or expired verification code"

**Solution**:

- Check server logs for the actual code
- Code expires after 10 minutes
- Request a new code

### Issue 3: "BVN already verified"

**Solution**: User already verified BVN. Check profile to confirm.

### Issue 4: 401 Unauthorized

**Solution**:

- Check token is valid and not expired
- Ensure `Authorization: Bearer TOKEN` header is set
- Token expires after 15 minutes - get a new one

### Issue 5: Validation errors

**Solution**: Check request body matches DTO requirements:

- BVN/NIN: Exactly 11 digits
- Date format: YYYY-MM-DD
- Password: 8+ chars, uppercase, lowercase, number/special
- Names: 2-50 characters

---

## 📈 Expected Outcomes

### After Complete Flow:

```json
{
  "emailVerified": true,
  "phoneVerified": true,
  "bvnVerified": true,
  "ninVerified": true,
  "kycTier": "TIER_3",
  "status": "ACTIVE"
}
```

### Audit Logs Created:

- BVN_VERIFIED
- NIN_VERIFIED
- EMAIL_VERIFIED
- PHONE_VERIFIED

---

## 🚀 Next Steps

Once Phase 1.3 testing is complete:

**Phase 1.4**: Wallet Module

- Get wallet balance
- Wallet limits based on KYC tier
- Lock/unlock wallet
- Transaction history

---

**Testing Date**: November 9, 2025  
**Phase**: 1.3 - User Module  
**Status**: Ready for Testing ✅
