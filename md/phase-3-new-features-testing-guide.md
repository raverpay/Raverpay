# RaverPay API - Phase 3 New Features Testing Guide

**Version:** 1.0
**Date:** 2025-11-11
**Status:** Ready for Testing

This guide covers testing for the newly implemented features in Phase 3:

- Transaction PIN System
- Password Reset Flow
- Profile Picture Upload (Cloudinary)
- Notifications System

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Feature 1: Transaction PIN System](#feature-1-transaction-pin-system)
4. [Feature 2: Password Reset Flow](#feature-2-password-reset-flow)
5. [Feature 3: Profile Picture Upload](#feature-3-profile-picture-upload)
6. [Feature 4: Notifications System](#feature-4-notifications-system)
7. [Integration Testing](#integration-testing)
8. [Production Deployment Checklist](#production-deployment-checklist)

---

## Prerequisites

### Required Tools

- **cURL** or **Postman** or **HTTPie**
- **Node.js** v18+ (for local testing)
- **PostgreSQL** database access
- **Email** service (Resend API)
- **Cloudinary** account

### Required Environment Variables

Add these to your `.env` file:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Existing Variables (ensure these are set)
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
RESEND_API_KEY=your-resend-key
VTPASS_API_KEY=your-vtpass-key
PAYSTACK_SECRET_KEY=your-paystack-key
```

---

## Environment Setup

### Local Development

```bash
# 1. Navigate to API directory
cd /Users/joseph/Desktop/raverpay/apps/raverpay-api

# 2. Install dependencies (if not already done)
pnpm install

# 3. Generate Prisma client
pnpm prisma generate

# 4. Start development server
pnpm run start:dev

# API should be running at http://localhost:3001
```

### Production

```bash
# API Base URL
https://your-production-domain.com/api
```

---

## Feature 1: Transaction PIN System

### Overview

Users can set a 4-digit transaction PIN to secure withdrawals and VTU purchases.

### Test Cases

#### 1.1 Set Transaction PIN (First Time)

**Endpoint:** `POST /api/users/set-pin`
**Authentication:** Required (JWT)

**Request:**

```bash
curl -X POST http://localhost:3001/api/users/set-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "confirmPin": "1234"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "Transaction PIN set successfully",
  "pinSetAt": "2025-11-11T10:30:00.000Z"
}
```

**Error Cases to Test:**

1. **PIN Mismatch:**

```bash
curl -X POST http://localhost:3001/api/users/set-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "confirmPin": "5678"
  }'
```

Expected: `400 Bad Request` - "PIN and confirmation do not match"

2. **Weak PIN:**

```bash
curl -X POST http://localhost:3001/api/users/set-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "0000",
    "confirmPin": "0000"
  }'
```

Expected: `400 Bad Request` - "PIN is too weak"

3. **PIN Already Set:**

```bash
# Try setting PIN again after already setting it
curl -X POST http://localhost:3001/api/users/set-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "5678",
    "confirmPin": "5678"
  }'
```

Expected: `400 Bad Request` - "PIN already set. Use change-pin endpoint instead"

---

#### 1.2 Verify Transaction PIN

**Endpoint:** `POST /api/users/verify-pin`
**Authentication:** Required (JWT)

**Request:**

```bash
curl -X POST http://localhost:3001/api/users/verify-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234"
  }'
```

**Expected Response (200):**

```json
{
  "valid": true
}
```

**Error Cases:**

1. **Invalid PIN:**

```bash
curl -X POST http://localhost:3001/api/users/verify-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "9999"
  }'
```

Expected: `400 Bad Request` - "Invalid PIN. 4 attempts remaining"

2. **Too Many Failed Attempts:**

```bash
# Try invalid PIN 5 times, then:
curl -X POST http://localhost:3001/api/users/verify-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "9999"
  }'
```

Expected: `400 Bad Request` - "Too many failed attempts. Try again in 30 minutes"

---

#### 1.3 Change Transaction PIN

**Endpoint:** `POST /api/users/change-pin`
**Authentication:** Required (JWT)

**Request:**

```bash
curl -X POST http://localhost:3001/api/users/change-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPin": "1234",
    "newPin": "5678",
    "confirmNewPin": "5678"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "PIN changed successfully"
}
```

**Error Cases:**

1. **Wrong Current PIN:**

```bash
curl -X POST http://localhost:3001/api/users/change-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPin": "0000",
    "newPin": "5678",
    "confirmNewPin": "5678"
  }'
```

Expected: `400 Bad Request` - "Invalid PIN"

2. **New PIN Same as Current:**

```bash
curl -X POST http://localhost:3001/api/users/change-pin \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPin": "1234",
    "newPin": "1234",
    "confirmNewPin": "1234"
  }'
```

Expected: `400 Bad Request` - "New PIN must be different from current PIN"

---

#### 1.4 PIN Protection on Withdrawal

**Endpoint:** `POST /api/transactions/withdraw`
**Authentication:** Required (JWT)

**Request:**

```bash
curl -X POST http://localhost:3001/api/transactions/withdraw \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "accountNumber": "0123456789",
    "accountName": "JOHN DOE",
    "bankCode": "058",
    "narration": "Test withdrawal",
    "pin": "1234"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "Withdrawal initiated successfully",
  "transaction": {
    "id": "...",
    "reference": "TXN_WTD_...",
    "amount": 5000,
    "fee": 25,
    "status": "PENDING"
  }
}
```

**Test without PIN:**

```bash
curl -X POST http://localhost:3001/api/transactions/withdraw \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "accountNumber": "0123456789",
    "accountName": "JOHN DOE",
    "bankCode": "058"
  }'
```

Expected: `400 Bad Request` - Validation error about missing PIN

---

#### 1.5 PIN Protection on VTU Purchases

**Endpoint:** `POST /api/vtu/airtime/purchase`
**Authentication:** Required (JWT)

**Request:**

```bash
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 100,
    "pin": "1234"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "Airtime purchase successful",
  "order": {
    "id": "...",
    "reference": "VTU_AIR_...",
    "serviceType": "AIRTIME",
    "provider": "MTN",
    "amount": 100,
    "status": "COMPLETED"
  }
}
```

---

## Feature 2: Password Reset Flow

### Overview

Three-step password reset process: request code → verify code → reset password.

### Test Cases

#### 2.1 Request Password Reset

**Endpoint:** `POST /api/auth/forgot-password`
**Authentication:** Not required (Public)

**Request:**

```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "If an account exists with this email, a reset code has been sent"
}
```

**Check Email:**

- Subject: "Password Reset Request"
- Body contains 6-digit code
- Code expires in 10 minutes

**Test with Non-Existent Email:**

```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com"
  }'
```

Expected: Same response (security - don't reveal if email exists)

---

#### 2.2 Verify Reset Code

**Endpoint:** `POST /api/auth/verify-reset-code`
**Authentication:** Not required (Public)

**Request:**

```bash
curl -X POST http://localhost:3001/api/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the resetToken for next step!**

**Error Cases:**

1. **Invalid Code:**

```bash
curl -X POST http://localhost:3001/api/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "000000"
  }'
```

Expected: `400 Bad Request` - "Invalid reset code"

2. **Expired Code:**

```bash
# Wait 11 minutes after requesting code, then verify
curl -X POST http://localhost:3001/api/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456"
  }'
```

Expected: `400 Bad Request` - "Reset code expired"

---

#### 2.3 Reset Password

**Endpoint:** `POST /api/auth/reset-password`
**Authentication:** Not required (Public, uses resetToken)

**Request:**

```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "newPassword": "NewSecurePassword123!"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Test Login with New Password:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "password": "NewSecurePassword123!"
  }'
```

Expected: `200 OK` with access token

**Error Cases:**

1. **Weak Password:**

```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "newPassword": "weak"
  }'
```

Expected: `400 Bad Request` - Password validation error

2. **Invalid/Expired Token:**

```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "resetToken": "invalid_token",
    "newPassword": "NewSecurePassword123!"
  }'
```

Expected: `401 Unauthorized` - "Invalid or expired reset token"

---

## Feature 3: Profile Picture Upload

### Overview

Users can upload and delete profile pictures using Cloudinary.

### Test Cases

#### 3.1 Upload Avatar

**Endpoint:** `POST /api/users/upload-avatar`
**Authentication:** Required (JWT)
**Content-Type:** `multipart/form-data`

**Request (using cURL):**

```bash
curl -X POST http://localhost:3001/api/users/upload-avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/your/image.jpg"
```

**Request (using HTTPie):**

```bash
http -f POST http://localhost:3001/api/users/upload-avatar \
  Authorization:"Bearer YOUR_ACCESS_TOKEN" \
  file@/path/to/your/image.jpg
```

**Expected Response (200):**

```json
{
  "success": true,
  "avatarUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/avatars/xyz.jpg"
}
```

**Verify Upload:**

1. Visit the avatarUrl in browser - image should load
2. Check user profile - avatar field should be updated:

```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Error Cases:**

1. **File Too Large (> 5MB):**

```bash
curl -X POST http://localhost:3001/api/users/upload-avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/large-file.jpg"
```

Expected: `400 Bad Request` - "File size must not exceed 5MB"

2. **Invalid File Type:**

```bash
curl -X POST http://localhost:3001/api/users/upload-avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

Expected: `400 Bad Request` - "Only image files are allowed"

3. **No File Uploaded:**

```bash
curl -X POST http://localhost:3001/api/users/upload-avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: `400 Bad Request` - "No file uploaded"

---

#### 3.2 Replace Existing Avatar

**Test:** Upload a new avatar when one already exists

```bash
# Upload first avatar
curl -X POST http://localhost:3001/api/users/upload-avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/image1.jpg"

# Upload second avatar (should replace first)
curl -X POST http://localhost:3001/api/users/upload-avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/image2.jpg"
```

**Expected Behavior:**

- First avatar is deleted from Cloudinary
- New avatar URL is returned
- Profile is updated with new avatar URL

---

#### 3.3 Delete Avatar

**Endpoint:** `DELETE /api/users/avatar`
**Authentication:** Required (JWT)

**Request:**

```bash
curl -X DELETE http://localhost:3001/api/users/avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

**Verify Deletion:**

```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: `avatar` field should be `null`

**Error Case - No Avatar to Delete:**

```bash
# Try deleting when no avatar exists
curl -X DELETE http://localhost:3001/api/users/avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: `400 Bad Request` - "No avatar to delete"

---

## Feature 4: Notifications System

### Overview

Users can view, mark as read, and delete in-app notifications.

### Test Cases

#### 4.1 Get Notifications

**Endpoint:** `GET /api/notifications`
**Authentication:** Required (JWT)

**Request (Basic):**

```bash
curl -X GET "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**

```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "TRANSACTION",
      "title": "Wallet Credited",
      "message": "Your wallet has been credited with ₦10,000",
      "data": {
        "transactionId": "uuid",
        "amount": 10000,
        "type": "DEPOSIT"
      },
      "isRead": false,
      "createdAt": "2025-11-11T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasMore": false
  },
  "unreadCount": 3
}
```

**Request with Filters:**

```bash
# Get only unread notifications
curl -X GET "http://localhost:3001/api/notifications?unreadOnly=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get only transaction notifications
curl -X GET "http://localhost:3001/api/notifications?type=TRANSACTION" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Pagination
curl -X GET "http://localhost:3001/api/notifications?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### 4.2 Mark Notification as Read

**Endpoint:** `PUT /api/notifications/:id/read`
**Authentication:** Required (JWT)

**Request:**

```bash
curl -X PUT http://localhost:3001/api/notifications/NOTIFICATION_ID/read \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**

```json
{
  "success": true
}
```

**Verify:**

```bash
curl -X GET "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: The notification's `isRead` should be `true`

---

#### 4.3 Mark All Notifications as Read

**Endpoint:** `PUT /api/notifications/read-all`
**Authentication:** Required (JWT)

**Request:**

```bash
curl -X PUT http://localhost:3001/api/notifications/read-all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**

```json
{
  "success": true,
  "count": 5
}
```

**Verify:**

```bash
curl -X GET "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: `unreadCount` should be `0`, all notifications should have `isRead: true`

---

#### 4.4 Delete Notification

**Endpoint:** `DELETE /api/notifications/:id`
**Authentication:** Required (JWT)

**Request:**

```bash
curl -X DELETE http://localhost:3001/api/notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**

```json
{
  "success": true
}
```

**Error Case - Deleting Another User's Notification:**

```bash
# Try to delete a notification that doesn't belong to you
curl -X DELETE http://localhost:3001/api/notifications/SOMEONE_ELSES_NOTIFICATION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: `404 Not Found` - "Notification not found"

---

#### 4.5 Test Notification Triggers

**Trigger 1: Wallet Credited (Bank Transfer)**

1. Make a bank transfer to your virtual account
2. Wait for webhook to process (~2 minutes)
3. Check notifications:

```bash
curl -X GET "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: New notification with type `TRANSACTION` and title `"Wallet Credited"`

**Trigger 2: VTU Purchase Success**

1. Purchase airtime/data:

```bash
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 100,
    "pin": "1234"
  }'
```

2. Wait for VTPass webhook (~1 minute)
3. Check notifications - should see "Purchase Successful"

---

## Integration Testing

### End-to-End User Flow

**Scenario:** New user signs up, verifies account, sets PIN, uploads avatar, funds wallet, makes purchases.

```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "phone": "08098765432",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Doe"
  }'

# 2. Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "newuser@example.com",
    "password": "SecurePass123!"
  }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

# 3. Set Transaction PIN
curl -X POST http://localhost:3001/api/users/set-pin \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "5678",
    "confirmPin": "5678"
  }'

# 4. Upload Avatar
curl -X POST http://localhost:3001/api/users/upload-avatar \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@/path/to/photo.jpg"

# 5. Get Virtual Account
curl -X GET http://localhost:3001/api/transactions/virtual-account \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 6. (Make bank transfer to virtual account, wait for credit)

# 7. Check Notifications (should see wallet credited)
curl -X GET "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 8. Purchase Airtime
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08098765432",
    "amount": 200,
    "pin": "5678"
  }'

# 9. Check Notifications Again (should see purchase confirmation)
curl -X GET "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in production
- [ ] Cloudinary account configured and tested
- [ ] Email service (Resend) configured and tested
- [ ] Database migrations applied
- [ ] API builds successfully (`pnpm run build`)
- [ ] All tests pass

### Configuration Checks

```bash
# Verify environment variables are set
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY
echo $CLOUDINARY_API_SECRET
echo $RESEND_API_KEY
echo $DATABASE_URL
echo $JWT_SECRET
```

### Post-Deployment Testing

1. **Health Check:**

```bash
curl https://your-api.com/api/health
```

2. **Test Each Feature:**
   - [ ] Transaction PIN (set, verify, change)
   - [ ] Password Reset (full flow)
   - [ ] Avatar Upload/Delete
   - [ ] Notifications (list, mark read, delete)

3. **Test PIN Protection:**
   - [ ] Withdrawal requires PIN
   - [ ] VTU purchases require PIN

4. **Test Notifications:**
   - [ ] Wallet funding triggers notification
   - [ ] VTU purchase triggers notification

### Monitoring

Monitor these in production:

1. **Cloudinary Usage:**
   - Check dashboard for upload/storage metrics
   - Verify old images are being deleted

2. **Email Delivery:**
   - Check Resend dashboard for delivery rates
   - Monitor bounce/complaint rates

3. **API Logs:**

```bash
# Check for errors related to new features
grep "Transaction PIN" /var/log/your-api.log
grep "Cloudinary" /var/log/your-api.log
grep "Notification" /var/log/your-api.log
```

4. **Database:**

```sql
-- Check PIN adoption rate
SELECT COUNT(*) as users_with_pin
FROM users
WHERE pin IS NOT NULL;

-- Check notification counts
SELECT COUNT(*) as total_notifications
FROM notifications;

-- Check avatar uploads
SELECT COUNT(*) as users_with_avatar
FROM users
WHERE avatar IS NOT NULL;
```

---

## Common Issues & Solutions

### Issue 1: "PIN already set" Error

**Solution:** Use `/api/users/change-pin` instead of `/api/users/set-pin`

### Issue 2: Cloudinary Upload Fails

**Causes:**

- Invalid API credentials
- File size exceeds 5MB
- Invalid file format

**Debug:**

```bash
# Check Cloudinary config
curl https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/resources/image \
  -u YOUR_API_KEY:YOUR_API_SECRET
```

### Issue 3: Password Reset Code Not Received

**Causes:**

- Email in spam folder
- Resend API key invalid
- Code expired (10 min limit)

**Debug:**

- Check Resend dashboard for delivery status
- Verify `RESEND_API_KEY` is set correctly

### Issue 4: Notifications Not Appearing

**Causes:**

- Webhook not received from Paystack/VTPass
- Notification service not triggered

**Debug:**

```sql
-- Check if webhooks are being received
SELECT * FROM transactions
WHERE status = 'COMPLETED'
ORDER BY created_at DESC
LIMIT 10;

-- Check notifications table
SELECT * FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

---

## Support & Contact

For issues or questions:

- **Documentation:** `/docs/API_ENDPOINTS.md`
- **GitHub Issues:** https://github.com/your-repo/issues
- **Email:** support@raverpay.com

---

**Last Updated:** 2025-11-11
**Version:** 1.0
**Author:** RaverPay Development Team
