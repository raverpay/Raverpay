# MularPay API Documentation

**Version:** 1.0
**Base URL:** `http://localhost:3001/api` (development)
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Wallet](#wallet)
4. [Transactions](#transactions)
5. [Payments (Webhooks)](#payments-webhooks)
6. [VTU Services](#vtu-services)
7. [VTU Webhooks](#vtu-webhooks)
8. [Health Check](#health-check)
9. [Missing Endpoints](#missing-endpoints)

---

## Authentication

**Base Path:** `/api/auth`

### Register User
```http
POST /api/auth/register
```

**Authentication:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "08012345678",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation:**
- Email: Valid email format
- Phone: Nigerian phone format (080xxxxxxxx, 090xxxxxxxx, 070xxxxxxxx, 081xxxxxxxx)
- Password: Min 8 characters, must contain uppercase, lowercase, number or special character
- All fields required

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "+2348012345678",
    "firstName": "John",
    "lastName": "Doe",
    "status": "PENDING",
    "kycTier": "TIER_0"
  }
}
```

---

### Login
```http
POST /api/auth/login
```

**Authentication:** Public

**Request Body:**
```json
{
  "identifier": "user@example.com", // or phone number
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": true,
    "phoneVerified": true,
    "status": "ACTIVE",
    "kycTier": "TIER_1"
  }
}
```

**Notes:**
- Access token expires in 15 minutes
- Refresh token expires in 7 days
- Use refresh token to get new access token

---

### Refresh Token
```http
POST /api/auth/refresh
```

**Authentication:** Public

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

---

### Get Current User
```http
GET /api/auth/me
```

**Authentication:** Required (JWT)

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "phone": "+2348012345678",
  "firstName": "John",
  "lastName": "Doe",
  "emailVerified": true,
  "phoneVerified": true,
  "status": "ACTIVE",
  "kycTier": "TIER_1",
  "bvnVerified": false,
  "ninVerified": false,
  "createdAt": "2025-11-11T10:00:00Z"
}
```

---

## Users

**Base Path:** `/api/users`
**Authentication:** All endpoints require JWT

### Get Profile
```http
GET /api/users/profile
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "phone": "+2348012345678",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "MALE",
  "address": "123 Main Street",
  "city": "Lagos",
  "state": "Lagos",
  "avatar": "https://...",
  "emailVerified": true,
  "phoneVerified": true,
  "bvnVerified": false,
  "ninVerified": false,
  "status": "ACTIVE",
  "kycTier": "TIER_1"
}
```

---

### Update Profile
```http
PUT /api/users/profile
```

**Request Body:** (All fields optional)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "MALE",
  "address": "123 Main Street",
  "city": "Lagos",
  "state": "Lagos",
  "avatar": "https://..."
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

**Notes:**
- Email and phone cannot be changed (verified fields)
- Date of birth format: YYYY-MM-DD
- Gender: MALE, FEMALE, OTHER

---

### Change Password
```http
POST /api/users/change-password
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Validation:**
- Current password must be correct
- New password: Min 8 chars, uppercase, lowercase, number/special

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

---

### Send Email Verification
```http
POST /api/users/send-email-verification
```

**Response (200):**
```json
{
  "message": "Verification code sent to your email",
  "expiresIn": 600
}
```

**Notes:**
- Code expires in 10 minutes
- 6-digit numeric code
- Max 5 attempts before lockout

---

### Verify Email
```http
POST /api/users/verify-email
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully",
  "user": {
    "emailVerified": true
  }
}
```

**Errors:**
- 400: Invalid or expired code
- 429: Too many attempts (locked for 15 minutes)

---

### Send Phone Verification (SMS)
```http
POST /api/users/send-phone-verification
```

**Response (200):**
```json
{
  "message": "Verification code sent via SMS",
  "expiresIn": 600
}
```

**Notes:**
- Uses VTPass SMS service
- Same expiry and attempt rules as email

---

### Verify Phone
```http
POST /api/users/verify-phone
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response (200):**
```json
{
  "message": "Phone verified successfully",
  "user": {
    "phoneVerified": true,
    "status": "ACTIVE",
    "kycTier": "TIER_1"
  }
}
```

**Notes:**
- Automatically upgrades status to ACTIVE
- Automatically upgrades KYC to TIER_1

---

### Verify BVN
```http
POST /api/users/verify-bvn
```

**Request Body:**
```json
{
  "bvn": "12345678901",
  "dateOfBirth": "1990-01-01"
}
```

**Validation:**
- BVN: Exactly 11 digits
- Date format: YYYY-MM-DD

**Response (200):**
```json
{
  "message": "BVN verified successfully",
  "user": {
    "bvnVerified": true,
    "kycTier": "TIER_2"
  }
}
```

**Notes:**
- Automatically upgrades KYC to TIER_2
- New limits: Daily ₦5M, Monthly ₦20M, Single ₦1M

---

### Verify NIN
```http
POST /api/users/verify-nin
```

**Request Body:**
```json
{
  "nin": "12345678901",
  "dateOfBirth": "1990-01-01"
}
```

**Validation:**
- NIN: Exactly 11 digits
- Date format: YYYY-MM-DD

**Response (200):**
```json
{
  "message": "NIN verified successfully",
  "user": {
    "ninVerified": true,
    "kycTier": "TIER_3"
  }
}
```

**Notes:**
- Automatically upgrades KYC to TIER_3
- Unlimited transaction limits

---

## Wallet

**Base Path:** `/api/wallet`
**Authentication:** All endpoints require JWT

### Get Wallet Balance
```http
GET /api/wallet
```

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "balance": 125450.00,
  "ledgerBalance": 125450.00,
  "currency": "NGN",
  "isLocked": false,
  "dailySpent": 25000.00,
  "monthlySpent": 150000.00,
  "lastTransactionAt": "2025-11-11T10:00:00Z"
}
```

**Notes:**
- Balance: Available funds
- Ledger balance: Total balance including pending
- Daily/monthly spent resets automatically

---

### Get Wallet Limits
```http
GET /api/wallet/limits
```

**Response (200):**
```json
{
  "tier": "TIER_1",
  "dailyLimit": 300000.00,
  "monthlyLimit": 1000000.00,
  "singleTransactionLimit": 100000.00,
  "dailySpent": 25000.00,
  "monthlySpent": 150000.00,
  "dailyRemaining": 275000.00,
  "monthlyRemaining": 850000.00
}
```

**KYC Tier Limits:**

| Tier | Daily Limit | Monthly Limit | Single Transaction |
|------|------------|---------------|-------------------|
| TIER_0 | ₦0 | ₦0 | ₦0 |
| TIER_1 | ₦300,000 | ₦1,000,000 | ₦100,000 |
| TIER_2 | ₦5,000,000 | ₦20,000,000 | ₦1,000,000 |
| TIER_3 | Unlimited | Unlimited | Unlimited |

---

### Get Transaction History
```http
GET /api/wallet/transactions?page=1&limit=20
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `type` (optional): DEBIT or CREDIT
- `status` (optional): PENDING, COMPLETED, FAILED, REVERSED
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "reference": "TXN_DEP_1699876543210",
      "type": "CREDIT",
      "amount": 10000.00,
      "fee": 50.00,
      "status": "COMPLETED",
      "description": "Wallet funding via card",
      "balanceBefore": 115400.00,
      "balanceAfter": 125450.00,
      "metadata": {
        "paymentMethod": "CARD",
        "provider": "PAYSTACK"
      },
      "createdAt": "2025-11-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasMore": true
  }
}
```

**Transaction Types:**
- CREDIT: Deposits, refunds
- DEBIT: Withdrawals, purchases

---

### Get Single Transaction
```http
GET /api/wallet/transactions/:id
```

**Response (200):**
```json
{
  "id": "uuid",
  "reference": "TXN_DEP_1699876543210",
  "type": "CREDIT",
  "amount": 10000.00,
  "fee": 50.00,
  "status": "COMPLETED",
  "description": "Wallet funding via card",
  "balanceBefore": 115400.00,
  "balanceAfter": 125450.00,
  "metadata": { ... },
  "createdAt": "2025-11-11T10:00:00Z"
}
```

---

### Lock Wallet
```http
POST /api/wallet/lock
```

**Request Body:**
```json
{
  "reason": "Suspicious activity detected"
}
```

**Response (200):**
```json
{
  "message": "Wallet locked successfully",
  "wallet": {
    "isLocked": true,
    "lockedAt": "2025-11-11T10:00:00Z",
    "lockReason": "Suspicious activity detected"
  }
}
```

**Notes:**
- User can lock their own wallet
- Prevents all transactions until unlocked
- Admin can also lock wallets

---

### Unlock Wallet
```http
POST /api/wallet/unlock
```

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response (200):**
```json
{
  "message": "Wallet unlocked successfully"
}
```

**Notes:**
- TODO: Implement role-based access control
- Currently accessible to all authenticated users
- Should be admin-only

---

## Transactions

**Base Path:** `/api/transactions`
**Authentication:** All endpoints require JWT

### Fund Wallet (Card)
```http
POST /api/transactions/fund/card
```

**Request Body:**
```json
{
  "amount": 10000.00,
  "callbackUrl": "https://yourapp.com/payment-callback"
}
```

**Validation:**
- Minimum amount: ₦100.00
- Callback URL: Optional

**Response (200):**
```json
{
  "success": true,
  "message": "Payment initialized",
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/...",
    "reference": "TXN_DEP_1699876543210",
    "accessCode": "abc123xyz"
  }
}
```

**Flow:**
1. Call this endpoint
2. Open authorization URL in WebView
3. User completes payment on Paystack
4. Redirect back to callback URL
5. Verify payment using reference

---

### Verify Payment
```http
GET /api/transactions/verify/:reference
```

**Parameters:**
- `reference`: Transaction reference from fund/card response

**Response (200):**
```json
{
  "success": true,
  "status": "success",
  "transaction": {
    "id": "uuid",
    "reference": "TXN_DEP_1699876543210",
    "amount": 10000.00,
    "fee": 50.00,
    "status": "COMPLETED",
    "gatewayResponse": "Approved"
  }
}
```

**Possible Statuses:**
- `success`: Payment completed
- `failed`: Payment failed
- `pending`: Payment processing

**Notes:**
- Poll this endpoint after payment redirect
- Webhook also updates status asynchronously

---

### Get Virtual Account
```http
GET /api/transactions/virtual-account
```

**Response (200):**
```json
{
  "bank": "Wema Bank",
  "accountNumber": "1234567890",
  "accountName": "JOHN DOE - MULARPAY",
  "provider": "PAYSTACK"
}
```

**Notes:**
- Virtual account is created on first call
- Transfers to this account automatically credit wallet
- No fees for bank transfers
- May take up to 5 minutes to reflect

---

### Get Banks List
```http
GET /api/transactions/banks
```

**Response (200):**
```json
{
  "banks": [
    {
      "code": "058",
      "name": "GTBank"
    },
    {
      "code": "044",
      "name": "Access Bank"
    }
  ]
}
```

**Notes:**
- Returns all Nigerian banks supported by Paystack
- Use bank code for account resolution and withdrawals

---

### Resolve Account Number
```http
POST /api/transactions/resolve-account
```

**Request Body:**
```json
{
  "accountNumber": "0123456789",
  "bankCode": "058"
}
```

**Validation:**
- Account number: Exactly 10 digits
- Bank code: Valid bank code from banks list

**Response (200):**
```json
{
  "accountNumber": "0123456789",
  "accountName": "JOHN DOE",
  "bankCode": "058",
  "bankName": "GTBank"
}
```

**Use Cases:**
- Verify account before saving
- Display account name on withdrawal screen
- Prevent typos in account numbers

---

### Withdraw Funds
```http
POST /api/transactions/withdraw
```

**Request Body:**
```json
{
  "amount": 5000.00,
  "accountNumber": "0123456789",
  "accountName": "JOHN DOE",
  "bankCode": "058",
  "narration": "Withdrawal to GTBank"
}
```

**Validation:**
- Minimum amount: ₦100.00
- Account must be resolved first
- Sufficient wallet balance
- Within KYC limits

**Response (200):**
```json
{
  "success": true,
  "message": "Withdrawal initiated successfully",
  "transaction": {
    "id": "uuid",
    "reference": "TXN_WTD_1699876543210",
    "amount": 5000.00,
    "fee": 25.00,
    "status": "PENDING",
    "recipient": {
      "accountNumber": "0123456789",
      "accountName": "JOHN DOE",
      "bankName": "GTBank"
    }
  }
}
```

**Notes:**
- Fee: ₦25 per withdrawal
- Status will be updated via webhook
- Usually completes within 5 minutes
- If failed, amount is refunded automatically

---

## Payments (Webhooks)

**Base Path:** `/api/payments/webhooks`
**Authentication:** Signature verification (x-paystack-signature header)

### Paystack Webhook
```http
POST /api/payments/webhooks/paystack
```

**Headers:**
```
x-paystack-signature: signature_hash
```

**Webhook Events:**

#### 1. charge.success
Card payment or bank transfer successful
```json
{
  "event": "charge.success",
  "data": {
    "reference": "TXN_DEP_1699876543210",
    "amount": 1005000,
    "currency": "NGN",
    "status": "success",
    "customer": {
      "email": "user@example.com"
    }
  }
}
```

#### 2. transfer.success
Withdrawal completed
```json
{
  "event": "transfer.success",
  "data": {
    "reference": "TXN_WTD_1699876543210",
    "amount": 500000,
    "status": "success"
  }
}
```

#### 3. transfer.failed
Withdrawal failed
```json
{
  "event": "transfer.failed",
  "data": {
    "reference": "TXN_WTD_1699876543210",
    "status": "failed"
  }
}
```

#### 4. transfer.reversed
Withdrawal reversed (refunds user)
```json
{
  "event": "transfer.reversed",
  "data": {
    "reference": "TXN_WTD_1699876543210",
    "status": "reversed"
  }
}
```

#### 5. dedicatedaccount.assign.success
Virtual account assigned
```json
{
  "event": "dedicatedaccount.assign.success",
  "data": {
    "customer": {
      "customer_code": "CUS_xxx"
    },
    "dedicated_account": {
      "bank": {
        "name": "Wema Bank"
      },
      "account_number": "1234567890",
      "account_name": "JOHN DOE / MULARPAY"
    }
  }
}
```

**Response:**
```json
{ "status": "success" }
```

**Notes:**
- All webhooks are processed asynchronously
- Failed webhooks are retried by Paystack
- Signature verification prevents spoofing

---

## VTU Services

**Base Path:** `/api/vtu`
**Authentication:** All endpoints require JWT

### Get Airtime Providers
```http
GET /api/vtu/airtime/providers
```

**Response (200):**
```json
{
  "providers": [
    { "code": "MTN", "name": "MTN" },
    { "code": "GLO", "name": "Glo" },
    { "code": "AIRTEL", "name": "Airtel" },
    { "code": "9MOBILE", "name": "9mobile" }
  ]
}
```

---

### Purchase Airtime
```http
POST /api/vtu/airtime/purchase
```

**Request Body:**
```json
{
  "network": "MTN",
  "phone": "08012345678",
  "amount": 500
}
```

**Validation:**
- Amount: ₦50 - ₦50,000
- Phone: Valid Nigerian number
- Network: MTN, GLO, AIRTEL, 9MOBILE

**Response (200):**
```json
{
  "success": true,
  "message": "Airtime purchase successful",
  "order": {
    "id": "uuid",
    "reference": "VTU_AIR_1699876543210",
    "serviceType": "AIRTIME",
    "provider": "MTN",
    "amount": 500.00,
    "phone": "08012345678",
    "status": "COMPLETED",
    "token": null
  }
}
```

---

### Get Data Plans
```http
GET /api/vtu/data/plans/:network
```

**Parameters:**
- `network`: MTN, GLO, AIRTEL, 9MOBILE

**Response (200):**
```json
{
  "network": "MTN",
  "plans": [
    {
      "code": "mtn-1gb",
      "name": "1GB",
      "amount": 500,
      "validity": "30 days",
      "description": "MTN 1GB - 30 Days"
    }
  ]
}
```

---

### Get SME Data Plans
```http
GET /api/vtu/data/sme-plans/:network
```

**Parameters:**
- `network`: MTN, GLO, AIRTEL, 9MOBILE

**Response (200):**
```json
{
  "network": "MTN",
  "plans": [
    {
      "code": "mtn-sme-1gb",
      "name": "1GB SME",
      "amount": 300,
      "validity": "30 days",
      "description": "MTN 1GB SME - 30 Days (Cheaper)"
    }
  ]
}
```

**Notes:**
- SME plans are cheaper than regular plans
- Same validity period
- Works on all data-enabled SIM cards

---

### Purchase Data
```http
POST /api/vtu/data/purchase
```

**Request Body:**
```json
{
  "network": "MTN",
  "phone": "08012345678",
  "productCode": "mtn-1gb",
  "isSME": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data purchase successful",
  "order": {
    "id": "uuid",
    "reference": "VTU_DATA_1699876543210",
    "serviceType": "DATA",
    "provider": "MTN",
    "amount": 500.00,
    "phone": "08012345678",
    "productCode": "mtn-1gb",
    "status": "COMPLETED"
  }
}
```

---

### Get Cable TV Plans
```http
GET /api/vtu/cable-tv/plans/:provider
```

**Parameters:**
- `provider`: DSTV, GOTV, STARTIMES

**Response (200):**
```json
{
  "provider": "DSTV",
  "plans": [
    {
      "code": "dstv-compact",
      "name": "DStv Compact",
      "amount": 10500,
      "validity": "1 month",
      "description": "DStv Compact - Monthly Subscription"
    }
  ]
}
```

---

### Verify Smartcard
```http
POST /api/vtu/cable-tv/verify
```

**Request Body:**
```json
{
  "provider": "DSTV",
  "smartcardNumber": "1234567890"
}
```

**Validation:**
- Smartcard: Exactly 10 digits

**Response (200):**
```json
{
  "valid": true,
  "customerName": "JOHN DOE",
  "smartcardNumber": "1234567890",
  "currentPlan": "DStv Compact",
  "dueDate": "2025-12-01"
}
```

---

### Pay Cable TV
```http
POST /api/vtu/cable-tv/pay
```

**Request Body:**
```json
{
  "provider": "DSTV",
  "smartcardNumber": "1234567890",
  "subscriptionType": "change",
  "productCode": "dstv-compact",
  "quantity": 1,
  "phone": "08012345678"
}
```

**Subscription Types:**
- `change`: Change package
- `renew`: Renew current package (productCode optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Cable TV subscription successful",
  "order": {
    "id": "uuid",
    "reference": "VTU_CABLE_1699876543210",
    "serviceType": "CABLE_TV",
    "provider": "DSTV",
    "amount": 10500.00,
    "smartcardNumber": "1234567890",
    "status": "COMPLETED"
  }
}
```

---

### Get Electricity Providers
```http
GET /api/vtu/electricity/providers
```

**Response (200):**
```json
{
  "providers": [
    { "code": "eko-electric", "name": "Eko Electricity" },
    { "code": "ikeja-electric", "name": "Ikeja Electric" },
    { "code": "abuja-electric", "name": "Abuja Electric" }
  ]
}
```

---

### Verify Meter Number
```http
POST /api/vtu/electricity/verify
```

**Request Body:**
```json
{
  "disco": "eko-electric",
  "meterNumber": "12345678901",
  "meterType": "prepaid"
}
```

**Validation:**
- Meter number: 10-13 digits
- Meter type: prepaid or postpaid

**Response (200):**
```json
{
  "valid": true,
  "customerName": "JOHN DOE",
  "address": "123 Main Street, Lagos",
  "meterNumber": "12345678901",
  "meterType": "PREPAID"
}
```

---

### Pay Electricity
```http
POST /api/vtu/electricity/pay
```

**Request Body:**
```json
{
  "disco": "eko-electric",
  "meterNumber": "12345678901",
  "meterType": "prepaid",
  "amount": 5000,
  "phone": "08012345678"
}
```

**Validation:**
- Minimum amount: ₦1,000

**Response (200):**
```json
{
  "success": true,
  "message": "Electricity payment successful",
  "order": {
    "id": "uuid",
    "reference": "VTU_ELEC_1699876543210",
    "serviceType": "ELECTRICITY",
    "provider": "EKO_ELECTRIC",
    "amount": 5000.00,
    "meterNumber": "12345678901",
    "status": "COMPLETED",
    "token": "1234-5678-9012-3456"
  }
}
```

**Notes:**
- Token is returned for prepaid meters
- Load token on your meter after purchase
- Postpaid payments have no token

---

### Pay Showmax
```http
POST /api/vtu/showmax/pay
```

**Request Body:**
```json
{
  "phoneNumber": "08012345678",
  "productCode": "showmax-mobile"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Showmax subscription successful",
  "order": {
    "id": "uuid",
    "reference": "VTU_SHOW_1699876543210",
    "serviceType": "SHOWMAX",
    "amount": 2900.00,
    "phone": "08012345678",
    "status": "COMPLETED"
  }
}
```

---

### Get International Countries
```http
GET /api/vtu/international/countries
```

**Response (200):**
```json
{
  "countries": [
    {
      "code": "US",
      "name": "United States",
      "flag": "🇺🇸"
    }
  ]
}
```

---

### Get International Product Types
```http
GET /api/vtu/international/product-types/:countryCode
```

**Response (200):**
```json
{
  "productTypes": [
    {
      "id": "1",
      "name": "Mobile Top Up"
    }
  ]
}
```

---

### Get International Operators
```http
GET /api/vtu/international/operators/:countryCode/:productTypeId
```

**Response (200):**
```json
{
  "operators": [
    {
      "id": "OP123",
      "name": "AT&T",
      "logo": "https://..."
    }
  ]
}
```

---

### Get International Variations
```http
GET /api/vtu/international/variations/:operatorId/:productTypeId
```

**Response (200):**
```json
{
  "variations": [
    {
      "code": "att-10usd",
      "name": "$10 Top Up",
      "amount": 10,
      "currency": "USD"
    }
  ]
}
```

---

### Purchase International Airtime
```http
POST /api/vtu/international/purchase
```

**Request Body:**
```json
{
  "billersCode": "+12345678901",
  "variationCode": "att-10usd",
  "operatorId": "OP123",
  "countryCode": "US",
  "productTypeId": "1",
  "email": "user@example.com",
  "phone": "08012345678"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "International airtime purchase successful",
  "order": {
    "id": "uuid",
    "reference": "VTU_INT_1699876543210",
    "serviceType": "INTERNATIONAL_AIRTIME",
    "amount": 7500.00,
    "recipientNumber": "+12345678901",
    "status": "COMPLETED"
  }
}
```

---

### Get VTU Orders
```http
GET /api/vtu/orders?page=1&limit=20
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `serviceType` (optional): AIRTIME, DATA, CABLE_TV, ELECTRICITY, etc.
- `status` (optional): PENDING, COMPLETED, FAILED, REVERSED
- `startDate` (optional): ISO date
- `endDate` (optional): ISO date

**Response (200):**
```json
{
  "orders": [
    {
      "id": "uuid",
      "reference": "VTU_DATA_1699876543210",
      "serviceType": "DATA",
      "provider": "MTN",
      "amount": 500.00,
      "phone": "08012345678",
      "productCode": "mtn-1gb",
      "status": "COMPLETED",
      "createdAt": "2025-11-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasMore": true
  }
}
```

---

### Get Order by ID
```http
GET /api/vtu/orders/:orderId
```

**Response (200):**
```json
{
  "id": "uuid",
  "reference": "VTU_DATA_1699876543210",
  "serviceType": "DATA",
  "provider": "MTN",
  "amount": 500.00,
  "phone": "08012345678",
  "productCode": "mtn-1gb",
  "status": "COMPLETED",
  "metadata": {
    "network": "MTN",
    "plan": "1GB - 30 Days"
  },
  "createdAt": "2025-11-11T10:00:00Z"
}
```

---

### Get Order by Reference
```http
GET /api/vtu/orders/reference/:reference
```

**Response:** Same as Get Order by ID

---

### Retry Failed Order
```http
POST /api/vtu/orders/:orderId/retry
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order retry initiated",
  "order": {
    "id": "uuid",
    "status": "PENDING"
  }
}
```

**Notes:**
- Only failed orders can be retried
- No additional charge (uses original payment)
- Funds already deducted on first attempt

---

## VTU Webhooks

**Base Path:** `/api/vtu/webhooks`
**Authentication:** Signature verification (x-vtpass-signature header)

### VTPass Webhook
```http
POST /api/vtu/webhooks/vtpass
```

**Headers:**
```
x-vtpass-signature: signature_hash
```

**Webhook Events:**

#### 1. transaction.success
```json
{
  "event": "transaction.success",
  "data": {
    "request_id": "VTU_DATA_1699876543210",
    "transaction_id": "VTPASS12345",
    "status": "delivered"
  }
}
```

#### 2. transaction.failed
```json
{
  "event": "transaction.failed",
  "data": {
    "request_id": "VTU_DATA_1699876543210",
    "status": "failed"
  }
}
```

#### 3. transaction.pending
```json
{
  "event": "transaction.pending",
  "data": {
    "request_id": "VTU_DATA_1699876543210",
    "status": "pending"
  }
}
```

**Response:**
```json
{ "status": "success" }
```

**Notes:**
- Failed transactions automatically refund user
- Webhook updates order status asynchronously

---

## Health Check

### API Welcome
```http
GET /api
```

**Authentication:** None

**Response (200):**
```json
{
  "message": "Welcome to MularPay API",
  "version": "1.0",
  "documentation": "/api/docs"
}
```

---

### Health Check
```http
GET /api/health
```

**Authentication:** None

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-11-11T10:00:00Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

---

## Transaction PIN Management

**Base Path:** `/api/users`
**Authentication:** All endpoints require JWT

### Set Transaction PIN
```http
POST /api/users/set-pin
```

**Request Body:**
```json
{
  "pin": "1234",
  "confirmPin": "1234"
}
```

**Validation:**
- 4-digit numeric PIN
- PINs must match
- Cannot be 0000, 1234, 1111, etc.

**Response (200):**
```json
{
  "success": true,
  "message": "Transaction PIN set successfully",
  "pinSetAt": "2025-11-11T10:30:00.000Z"
}
```

---

### Verify Transaction PIN
```http
POST /api/users/verify-pin
```

**Request Body:**
```json
{
  "pin": "1234"
}
```

**Response (200):**
```json
{
  "valid": true
}
```

**Error Responses:**
- `400 Bad Request` - "Invalid PIN. X attempts remaining"
- `400 Bad Request` - "Too many failed attempts. Try again in 30 minutes"
- `400 Bad Request` - "PIN not set. Please set a PIN first"

---

### Change Transaction PIN
```http
POST /api/users/change-pin
```

**Request Body:**
```json
{
  "currentPin": "1234",
  "newPin": "5678",
  "confirmNewPin": "5678"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "PIN changed successfully"
}
```

**Notes:**
- PIN must be different from current PIN
- Weak PINs (0000, 1111, 1234, etc.) are rejected
- Current PIN is verified before change

---

## Password Reset Flow

**Base Path:** `/api/auth`
**Authentication:** None (Public endpoints)

### Request Password Reset (Forgot Password)
```http
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Reset code sent to your email",
  "expiresIn": 600
}
```

---

#### Verify Reset Code
```http
POST /api/auth/verify-reset-code
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "valid": true,
  "resetToken": "temp_token_abc123"
}
```

---

#### Reset Password
```http
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "resetToken": "temp_token_abc123",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Notes:**
- Password must meet strength requirements (8+ chars, uppercase, lowercase, number/special char)
- Reset token expires in 15 minutes
- User is notified via email after successful reset

---

## Profile Picture Management

**Base Path:** `/api/users`
**Authentication:** All endpoints require JWT

### Upload Avatar
```http
POST /api/users/upload-avatar
```

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: <image file>
```

**Response (200):**
```json
{
  "success": true,
  "avatarUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/avatars/xyz.jpg"
}
```

**Notes:**
- Uses Cloudinary for image storage
- Accepted formats: JPG, JPEG, PNG, WebP
- Max file size: 5MB
- Auto-resized to 500x500 pixels
- Old avatar automatically deleted when uploading new one

**Validation Errors:**
- `400 Bad Request` - "Only image files are allowed (JPEG, JPG, PNG, WebP)"
- `400 Bad Request` - "File size must not exceed 5MB"
- `400 Bad Request` - "No file uploaded"

---

### Delete Avatar
```http
DELETE /api/users/avatar
```

**Response (200):**
```json
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

**Notes:**
- Deletes avatar from Cloudinary
- Sets user.avatar to null in database
- Returns error if no avatar exists

---

## Notifications System

**Base Path:** `/api/notifications`
**Authentication:** All endpoints require JWT

### Get Notifications
```http
GET /api/notifications?page=1&limit=20&type=TRANSACTION
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `type` (optional): TRANSACTION, KYC, SECURITY, PROMOTIONAL
- `unreadOnly` (optional): true/false

**Response (200):**
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
        "amount": 10000
      },
      "read": false,
      "createdAt": "2025-11-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "unreadCount": 12
  }
}
```

---

#### Mark Notification as Read
```http
PUT /api/notifications/:id/read
```

**Response (200):**
```json
{
  "message": "Notification marked as read"
}
```

---

#### Mark All as Read
```http
PUT /api/notifications/read-all
```

**Response (200):**
```json
{
  "message": "All notifications marked as read",
  "count": 12
}
```

---

#### Delete Notification
```http
DELETE /api/notifications/:id
```

**Response (200):**
```json
{
  "message": "Notification deleted"
}
```

---

## Error Responses

All endpoints follow a consistent error format:

**4xx Client Errors:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

**5xx Server Errors:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Error details (only in development)"
}
```

**Common Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate resource)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error

---

## Rate Limiting

**Default Limits:**
- Authentication endpoints: 5 requests per minute
- OTP endpoints: 3 requests per 15 minutes
- General endpoints: 100 requests per minute

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699876543
```

---

## Summary

### Total Endpoints: ✅

**Total: 65 endpoints** (52 existing + 13 new)

- Authentication: 4 endpoints
- Users: 8 endpoints
- Wallet: 6 endpoints
- Transactions: 6 endpoints
- Payments Webhooks: 1 endpoint
- VTU Services: 24 endpoints
- VTU Webhooks: 1 endpoint
- Health: 2 endpoints

### Missing Endpoints: ❌

**Total: 13 endpoints (MUST be implemented)**

1. Transaction PIN: 3 endpoints (set, verify, change)
2. Password Reset: 3 endpoints (forgot, verify, reset)
3. Profile Picture: 2 endpoints (upload, delete)
4. Notifications: 5 endpoints (list, mark read, mark all read, delete, get unread count)

1. ✅ **Transaction PIN System** - 3 endpoints (set, verify, change)
2. ✅ **Password Reset Flow** - 3 endpoints (forgot, verify-code, reset)
3. ✅ **Profile Picture Upload** - 2 endpoints (upload, delete) with Cloudinary
4. ✅ **Notifications System** - 5 endpoints (list, mark read, mark all read, delete, triggers)

### Additional Security Features

All withdrawal and VTU purchase endpoints now require PIN verification:
- `POST /api/transactions/withdraw` - Requires `pin` field
- `POST /api/vtu/airtime/purchase` - Requires `pin` field
- `POST /api/vtu/data/purchase` - Requires `pin` field
- `POST /api/vtu/cable-tv/pay` - Requires `pin` field
- `POST /api/vtu/electricity/pay` - Requires `pin` field
- `POST /api/vtu/showmax/pay` - Requires `pin` field
- `POST /api/vtu/international/purchase` - Requires `pin` field

---

## Notes

- All JWT-protected endpoints require `Authorization: Bearer <token>` header
- All amounts are in Kobo (multiply by 100 before sending to API)
- All dates are in ISO 8601 format
- WebSockets not implemented yet (use polling for real-time updates)
- Admin endpoints (unlock wallet) need RBAC implementation

---

**Last Updated:** 2025-11-11
**API Version:** 1.0
**Contact:** support@mularpay.com
