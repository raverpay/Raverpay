# RaverPay API Documentation

REST API documentation for RaverPay fintech platform.

## Base URLs

- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-production-domain.com/api`

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

### Token Management

```http
# Login
POST /api/auth/login

# Refresh Token
POST /api/auth/refresh

# Get Current User
GET /api/auth/me
```

---

## ✅ Implemented Endpoints

### Authentication (8 endpoints)

| Method | Endpoint                      | Description                        | Auth |
| ------ | ----------------------------- | ---------------------------------- | ---- |
| POST   | `/api/auth/register`          | Register new user                  | ❌   |
| POST   | `/api/auth/login`             | Login user                         | ❌   |
| POST   | `/api/auth/refresh`           | Refresh access token               | ❌   |
| GET    | `/api/auth/me`                | Get current user                   | ✅   |
| POST   | `/api/auth/logout`            | Logout user (revoke refresh token) | ✅   |
| POST   | `/api/auth/forgot-password`   | Request password reset             | ❌   |
| POST   | `/api/auth/verify-reset-code` | Verify reset code                  | ❌   |
| POST   | `/api/auth/reset-password`    | Reset password with token          | ❌   |

### Users (13 endpoints)

| Method | Endpoint                             | Description                  | Auth |
| ------ | ------------------------------------ | ---------------------------- | ---- |
| GET    | `/api/users/profile`                 | Get user profile             | ✅   |
| PUT    | `/api/users/profile`                 | Update profile               | ✅   |
| POST   | `/api/users/change-password`         | Change password              | ✅   |
| POST   | `/api/users/verify-bvn`              | Verify BVN                   | ✅   |
| POST   | `/api/users/verify-nin`              | Verify NIN                   | ✅   |
| POST   | `/api/users/send-email-verification` | Send email verification code | ✅   |
| POST   | `/api/users/verify-email`            | Verify email with code       | ✅   |
| POST   | `/api/users/send-phone-verification` | Send SMS verification code   | ✅   |
| POST   | `/api/users/verify-phone`            | Verify phone with code       | ✅   |
| POST   | `/api/users/set-pin`                 | Set transaction PIN          | ✅   |
| POST   | `/api/users/verify-pin`              | Verify transaction PIN       | ✅   |
| POST   | `/api/users/change-pin`              | Change transaction PIN       | ✅   |
| POST   | `/api/users/upload-avatar`           | Upload profile picture       | ✅   |
| DELETE | `/api/users/avatar`                  | Delete profile picture       | ✅   |

### Wallet (6 endpoints)

| Method | Endpoint                       | Description             | Auth |
| ------ | ------------------------------ | ----------------------- | ---- |
| GET    | `/api/wallet`                  | Get wallet balance      | ✅   |
| GET    | `/api/wallet/limits`           | Get KYC tier limits     | ✅   |
| POST   | `/api/wallet/lock`             | Lock wallet             | ✅   |
| POST   | `/api/wallet/unlock`           | Unlock wallet (Admin)   | ✅   |
| GET    | `/api/wallet/transactions`     | Get transaction history | ✅   |
| GET    | `/api/wallet/transactions/:id` | Get transaction details | ✅   |

### Transactions (6 endpoints)

| Method | Endpoint                              | Description                     | Auth |
| ------ | ------------------------------------- | ------------------------------- | ---- |
| POST   | `/api/transactions/fund/card`         | Fund wallet via card            | ✅   |
| GET    | `/api/transactions/verify/:reference` | Verify payment                  | ✅   |
| GET    | `/api/transactions/virtual-account`   | Get virtual account             | ✅   |
| GET    | `/api/transactions/banks`             | Get bank list                   | ✅   |
| POST   | `/api/transactions/resolve-account`   | Resolve bank account            | ✅   |
| POST   | `/api/transactions/withdraw`          | Withdraw to bank (requires PIN) | ✅   |

### VTU Services (24 endpoints)

#### Airtime & Data

| Method | Endpoint                           | Description                     | Auth |
| ------ | ---------------------------------- | ------------------------------- | ---- |
| GET    | `/api/vtu/airtime/providers`       | Get airtime providers           | ✅   |
| POST   | `/api/vtu/airtime/purchase`        | Purchase airtime (requires PIN) | ✅   |
| GET    | `/api/vtu/data/plans/:network`     | Get data plans                  | ✅   |
| GET    | `/api/vtu/data/sme-plans/:network` | Get SME data plans              | ✅   |
| POST   | `/api/vtu/data/purchase`           | Purchase data (requires PIN)    | ✅   |

#### Cable TV

| Method | Endpoint                            | Description                 | Auth |
| ------ | ----------------------------------- | --------------------------- | ---- |
| GET    | `/api/vtu/cable-tv/plans/:provider` | Get cable TV plans          | ✅   |
| POST   | `/api/vtu/cable-tv/verify`          | Verify smartcard            | ✅   |
| POST   | `/api/vtu/cable-tv/pay`             | Pay cable TV (requires PIN) | ✅   |
| POST   | `/api/vtu/showmax/pay`              | Pay Showmax (requires PIN)  | ✅   |

#### Electricity

| Method | Endpoint                         | Description                    | Auth |
| ------ | -------------------------------- | ------------------------------ | ---- |
| GET    | `/api/vtu/electricity/providers` | Get electricity providers      | ✅   |
| POST   | `/api/vtu/electricity/verify`    | Verify meter number            | ✅   |
| POST   | `/api/vtu/electricity/pay`       | Pay electricity (requires PIN) | ✅   |

#### International Airtime

| Method | Endpoint                                                       | Description                                   | Auth |
| ------ | -------------------------------------------------------------- | --------------------------------------------- | ---- |
| GET    | `/api/vtu/international/countries`                             | Get supported countries                       | ✅   |
| GET    | `/api/vtu/international/product-types/:countryCode`            | Get product types                             | ✅   |
| GET    | `/api/vtu/international/operators/:countryCode/:productTypeId` | Get operators                                 | ✅   |
| GET    | `/api/vtu/international/variations/:operatorId/:productTypeId` | Get variations                                | ✅   |
| POST   | `/api/vtu/international/purchase`                              | Purchase international airtime (requires PIN) | ✅   |

#### VTU Orders

| Method | Endpoint                               | Description            | Auth |
| ------ | -------------------------------------- | ---------------------- | ---- |
| GET    | `/api/vtu/orders`                      | Get VTU order history  | ✅   |
| GET    | `/api/vtu/orders/:orderId`             | Get order by ID        | ✅   |
| GET    | `/api/vtu/orders/reference/:reference` | Get order by reference | ✅   |
| POST   | `/api/vtu/orders/:orderId/retry`       | Retry failed order     | ✅   |

### Notifications (5 endpoints)

| Method | Endpoint                      | Description                   | Auth |
| ------ | ----------------------------- | ----------------------------- | ---- |
| GET    | `/api/notifications`          | Get notifications (paginated) | ✅   |
| PUT    | `/api/notifications/:id/read` | Mark notification as read     | ✅   |
| PUT    | `/api/notifications/read-all` | Mark all as read              | ✅   |
| DELETE | `/api/notifications/:id`      | Delete notification           | ✅   |

### Webhooks (2 endpoints)

| Method | Endpoint                          | Description              | Auth      |
| ------ | --------------------------------- | ------------------------ | --------- |
| POST   | `/api/payments/webhooks/paystack` | Paystack webhook handler | Signature |
| POST   | `/api/vtu/webhooks/vtpass`        | VTPass webhook handler   | Signature |

### Health Check (2 endpoints)

| Method | Endpoint      | Description         | Auth |
| ------ | ------------- | ------------------- | ---- |
| GET    | `/api`        | API welcome message | ❌   |
| GET    | `/api/health` | Health check        | ❌   |

---

## 🚧 TODO: Not Yet Implemented

### Gift Cards (Future Phase)

| Method | Endpoint                    | Description       | Status  |
| ------ | --------------------------- | ----------------- | ------- |
| GET    | `/api/giftcards/rates`      | Get current rates | ⏳ TODO |
| POST   | `/api/giftcards/sell`       | Sell gift card    | ⏳ TODO |
| GET    | `/api/giftcards/orders`     | Get order history | ⏳ TODO |
| GET    | `/api/giftcards/orders/:id` | Get order details | ⏳ TODO |

### Crypto Trading (Future Phase)

| Method | Endpoint                 | Description              | Status  |
| ------ | ------------------------ | ------------------------ | ------- |
| GET    | `/api/crypto/rates`      | Get current crypto rates | ⏳ TODO |
| POST   | `/api/crypto/buy`        | Buy cryptocurrency       | ⏳ TODO |
| POST   | `/api/crypto/sell`       | Sell cryptocurrency      | ⏳ TODO |
| GET    | `/api/crypto/orders`     | Get order history        | ⏳ TODO |
| GET    | `/api/crypto/orders/:id` | Get order details        | ⏳ TODO |

### Wallet-to-Wallet Transfer (Future Phase)

| Method | Endpoint               | Description              | Status  |
| ------ | ---------------------- | ------------------------ | ------- |
| POST   | `/api/wallet/transfer` | Transfer to another user | ⏳ TODO |

### Beneficiary Management (Future Phase)

| Method | Endpoint                 | Description        | Status  |
| ------ | ------------------------ | ------------------ | ------- |
| POST   | `/api/beneficiaries`     | Save beneficiary   | ⏳ TODO |
| GET    | `/api/beneficiaries`     | List beneficiaries | ⏳ TODO |
| PUT    | `/api/beneficiaries/:id` | Update beneficiary | ⏳ TODO |
| DELETE | `/api/beneficiaries/:id` | Delete beneficiary | ⏳ TODO |

### Bank Account Management (Future Phase)

| Method | Endpoint                             | Description         | Status  |
| ------ | ------------------------------------ | ------------------- | ------- |
| POST   | `/api/bank-accounts`                 | Add bank account    | ⏳ TODO |
| GET    | `/api/bank-accounts`                 | List bank accounts  | ⏳ TODO |
| PUT    | `/api/bank-accounts/:id/set-primary` | Set primary account | ⏳ TODO |
| DELETE | `/api/bank-accounts/:id`             | Delete bank account | ⏳ TODO |

### Admin Panel (Future Phase)

| Method | Endpoint                      | Description           | Status  |
| ------ | ----------------------------- | --------------------- | ------- |
| GET    | `/api/admin/users`            | List all users        | ⏳ TODO |
| GET    | `/api/admin/users/:id`        | Get user details      | ⏳ TODO |
| PUT    | `/api/admin/users/:id/status` | Update user status    | ⏳ TODO |
| GET    | `/api/admin/transactions`     | List all transactions | ⏳ TODO |
| GET    | `/api/admin/stats`            | Dashboard statistics  | ⏳ TODO |

---

## Request/Response Format

### Standard Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

### Pagination

Paginated endpoints accept query parameters:

```http
GET /api/wallet/transactions?page=1&limit=20&status=COMPLETED
```

Response includes pagination metadata:

```json
{
  "transactions": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```

---

## Example Requests

### 1. Register User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "phone": "08012345678",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Set Transaction PIN

```bash
curl -X POST http://localhost:3001/api/users/set-pin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "confirmPin": "1234"
  }'
```

### 4. Fund Wallet (Card Payment)

```bash
curl -X POST http://localhost:3001/api/transactions/fund/card \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "callbackUrl": "https://yourapp.com/callback"
  }'
```

### 5. Buy Airtime (with PIN)

```bash
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 500,
    "pin": "1234"
  }'
```

### 6. Logout

```bash
# Logout from current session (revoke specific refresh token)
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'

# Logout from all sessions (revoke all refresh tokens)
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. Get Notifications

```bash
curl -X GET "http://localhost:3001/api/notifications?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Security Features

### Authentication & Sessions

- JWT access tokens (15 minutes)
- JWT refresh tokens (7 days)
- Refresh token revocation on logout
- Token blacklisting prevents reuse
- Support for single-session or all-sessions logout

### Transaction PIN

- All withdrawal and VTU purchases require 4-digit PIN
- PIN is hashed with Argon2
- Rate limiting: 5 failed attempts = 30-minute lockout

### Password Reset

- 6-digit code sent via email
- Code expires in 10 minutes
- Single-use codes (deleted after verification)
- 15-minute reset token validity

### Profile Pictures

- Cloudinary integration
- Max file size: 5MB
- Accepted formats: JPG, JPEG, PNG, WebP
- Auto-resized to 500x500 pixels

### Notifications

- Auto-triggered on wallet credit and VTU purchases
- Real-time notification system
- Pagination and filtering support

---

## Error Codes

| Code                   | HTTP Status | Description                  |
| ---------------------- | ----------- | ---------------------------- |
| `INVALID_CREDENTIALS`  | 401         | Wrong email/password         |
| `UNAUTHORIZED`         | 401         | Missing or invalid token     |
| `INSUFFICIENT_BALANCE` | 400         | Not enough wallet funds      |
| `DAILY_LIMIT_EXCEEDED` | 400         | KYC tier limit reached       |
| `INVALID_PIN`          | 400         | Wrong transaction PIN        |
| `PIN_NOT_SET`          | 400         | User hasn't set PIN yet      |
| `USER_SUSPENDED`       | 403         | Account suspended            |
| `TRANSACTION_FAILED`   | 400         | Transaction processing error |
| `VALIDATION_ERROR`     | 400         | Invalid input data           |
| `NOT_FOUND`            | 404         | Resource not found           |

---

## Rate Limits

- **Default**: 100 requests per minute
- **Auth endpoints**: 5 requests per minute
- **PIN verification**: 5 attempts per 30 minutes
- **Email/SMS verification**: 3 requests per 15 minutes

---

## Webhooks

### Paystack Webhooks

Events we handle:

- `charge.success` - Payment successful
- `transfer.success` - Withdrawal completed
- `transfer.failed` - Withdrawal failed
- `transfer.reversed` - Withdrawal reversed
- `dedicatedaccount.assign.success` - Virtual account created

### VTPass Webhooks

Events we handle:

- `transaction.success` - VTU order completed
- `transaction.failed` - VTU order failed
- `transaction.pending` - VTU order pending

### Webhook Security

All webhooks are verified using signature validation:

- **Paystack**: `x-paystack-signature` header
- **VTPass**: `x-vtpass-signature` header

---

## Testing

### Local Development

```bash
# Start API server
cd apps/raverpay-api
pnpm run start:dev

# API runs at: http://localhost:3001
```

### Testing Guide

See comprehensive testing documentation:

- [Phase 3 Testing Guide](../md/phase-3-new-features-testing-guide.md)
- [API Endpoints Documentation](./API_ENDPOINTS.md)

### Tools

- cURL (command line)
- Postman (GUI)
- HTTPie (command line)
- Insomnia (GUI)

---

## Summary

### Total Implemented: **66 endpoints** ✅

- Authentication: 8 endpoints
- Users: 13 endpoints (includes PIN & avatar)
- Wallet: 6 endpoints
- Transactions: 6 endpoints
- VTU Services: 24 endpoints
- Notifications: 5 endpoints
- Webhooks: 2 endpoints
- Health: 2 endpoints

### TODO (Future Phases): **~25 endpoints** ⏳

- Gift Cards: 4 endpoints
- Crypto Trading: 5 endpoints
- Wallet Transfer: 1 endpoint
- Beneficiaries: 4 endpoints
- Bank Accounts: 4 endpoints
- Admin Panel: 5+ endpoints

---

## Support

For API support and documentation:

- **Email**: support@raverpay.com
- **Documentation**: [Full API Documentation](./API_ENDPOINTS.md)
- **Testing Guide**: [Phase 3 Testing Guide](../md/phase-3-new-features-testing-guide.md)
- **GitHub**: https://github.com/your-repo/raverpay

---

**Last Updated:** 2025-11-11
**API Version:** 1.0
