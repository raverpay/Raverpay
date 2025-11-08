# MularPay API Documentation

REST API documentation for MularPay fintech platform.

## Base URLs

- **Development**: `http://localhost:3001/api`
- **Staging**: `https://api-staging.mularpay.com/api`
- **Production**: `https://api.mularpay.com/api`

## Interactive Documentation

Swagger documentation is available at:
- Development: http://localhost:3001/api/docs

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header.

```http
Authorization: Bearer <access_token>
```

### Obtaining Tokens

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "..." },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Refreshing Tokens

```http
POST /v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/auth/register` | Register new user | ❌ |
| POST | `/v1/auth/login` | Login user | ❌ |
| POST | `/v1/auth/logout` | Logout user | ✅ |
| POST | `/v1/auth/refresh` | Refresh access token | ❌ |
| POST | `/v1/auth/forgot-password` | Request password reset | ❌ |
| POST | `/v1/auth/reset-password` | Reset password | ❌ |
| POST | `/v1/auth/verify-email` | Verify email | ❌ |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/users/me` | Get current user | ✅ |
| PUT | `/v1/users/me` | Update profile | ✅ |
| POST | `/v1/users/me/pin` | Set transaction PIN | ✅ |
| PUT | `/v1/users/me/pin` | Change PIN | ✅ |
| POST | `/v1/users/me/avatar` | Upload avatar | ✅ |

### Wallet

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/wallet` | Get wallet balance | ✅ |
| POST | `/v1/wallet/fund` | Fund wallet | ✅ |
| POST | `/v1/wallet/withdraw` | Withdraw to bank | ✅ |
| POST | `/v1/wallet/transfer` | Transfer to another user | ✅ |
| GET | `/v1/wallet/transactions` | Get transaction history | ✅ |
| GET | `/v1/wallet/virtual-account` | Get virtual account details | ✅ |

### VTU (Virtual Top-Up)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/vtu/providers` | List providers (MTN, GLO, etc.) | ✅ |
| GET | `/v1/vtu/products` | List products (data plans) | ✅ |
| POST | `/v1/vtu/airtime` | Buy airtime | ✅ |
| POST | `/v1/vtu/data` | Buy data bundle | ✅ |
| POST | `/v1/vtu/cable` | Pay cable TV | ✅ |
| POST | `/v1/vtu/electricity` | Pay electricity bill | ✅ |
| GET | `/v1/vtu/orders` | Get VTU order history | ✅ |
| GET | `/v1/vtu/orders/:id` | Get order details | ✅ |

### Gift Cards

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/giftcards/rates` | Get current rates | ✅ |
| POST | `/v1/giftcards/sell` | Sell gift card | ✅ |
| GET | `/v1/giftcards/orders` | Get order history | ✅ |
| GET | `/v1/giftcards/orders/:id` | Get order details | ✅ |

### Crypto

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/crypto/rates` | Get current crypto rates | ✅ |
| POST | `/v1/crypto/buy` | Buy cryptocurrency | ✅ |
| POST | `/v1/crypto/sell` | Sell cryptocurrency | ✅ |
| GET | `/v1/crypto/orders` | Get order history | ✅ |
| GET | `/v1/crypto/orders/:id` | Get order details | ✅ |

### KYC

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/kyc/bvn` | Verify BVN | ✅ |
| POST | `/v1/kyc/nin` | Verify NIN | ✅ |
| POST | `/v1/kyc/documents` | Upload KYC documents | ✅ |
| GET | `/v1/kyc/status` | Get KYC status | ✅ |

### Admin (Admin Role Required)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/admin/users` | List all users | ✅ |
| GET | `/v1/admin/users/:id` | Get user details | ✅ |
| PUT | `/v1/admin/users/:id/status` | Update user status | ✅ |
| GET | `/v1/admin/transactions` | List all transactions | ✅ |
| GET | `/v1/admin/giftcards/pending` | Pending gift card orders | ✅ |
| PUT | `/v1/admin/giftcards/:id/review` | Approve/reject gift card | ✅ |
| GET | `/v1/admin/stats` | Dashboard statistics | ✅ |

## Request/Response Format

### Standard Response

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
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE",
  "statusCode": 400
}
```

### Pagination

Paginated endpoints accept:

```http
GET /v1/wallet/transactions?page=1&limit=20
```

Response includes metadata:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Example Requests

### Register User

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "08012345678"
  }'
```

### Fund Wallet (Paystack)

```bash
curl -X POST http://localhost:3001/api/v1/wallet/fund \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "method": "CARD"
  }'
```

### Buy Airtime

```bash
curl -X POST http://localhost:3001/api/v1/vtu/airtime \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "MTN",
    "amount": 500,
    "phone": "08012345678",
    "pin": "1234"
  }'
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Wrong email/password |
| `UNAUTHORIZED` | Missing or invalid token |
| `INSUFFICIENT_BALANCE` | Not enough funds |
| `DAILY_LIMIT_EXCEEDED` | KYC tier limit reached |
| `INVALID_PIN` | Wrong transaction PIN |
| `USER_SUSPENDED` | Account suspended |
| `TRANSACTION_FAILED` | Transaction processing error |
| `VALIDATION_ERROR` | Invalid input data |

## Rate Limits

- **Default**: 100 requests per minute
- **Auth endpoints**: 5 requests per minute
- **Transaction endpoints**: 10 requests per minute

Rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Webhooks

MularPay sends webhooks for important events:

### Webhook Events

- `transaction.success`
- `transaction.failed`
- `wallet.funded`
- `kyc.approved`
- `kyc.rejected`

### Webhook Payload

```json
{
  "event": "transaction.success",
  "data": {
    "id": "txn_123",
    "userId": "user_456",
    "amount": 5000,
    "type": "DEPOSIT",
    "status": "COMPLETED"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Verify Webhook Signature

```typescript
const signature = req.headers['x-mularpay-signature'];
const hash = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== hash) {
  throw new Error('Invalid signature');
}
```

## Testing

Use Swagger UI for interactive testing:
http://localhost:3001/api/docs

Or use tools like:
- Postman
- Insomnia
- cURL
- HTTPie

## Support

For API support:
- Email: api@mularpay.com
- Documentation: https://docs.mularpay.com
- GitHub Issues: https://github.com/mularpay/api/issues
