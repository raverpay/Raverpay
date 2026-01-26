# 🧪 Alchemy API Testing - With Real Users

**Server**: https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api  
**Date**: January 26, 2026  
**Status**: Testing in Progress

---

## 👥 **Test Users Created**

### User 1:
- **ID**: `507ac4fe-dde6-4594-853f-f698564c6440`
- **Email**: test.user1@raverpay.com
- **Phone**: 08012345671
- **Access Token**: (see logs)

### User 2:
- **ID**: `5315871d-50af-4909-9e60-14e414838cb8`
- **Email**: test.user2@raverpay.com
- **Phone**: 08012345672

---

## 🧪 **Test Results**

### ✅ Test 1: Health Check
```bash
curl -s 'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/webhooks/health'
```
**Result**: ✅ PASS
```json
{
  "success": true,
  "message": "Webhook endpoint is healthy",
  "timestamp": "2026-01-26T17:31:43.497Z"
}
```

---

### ✅ Test 2: User Registration
```bash
# User 1
curl -s -X POST 'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test.user1@raverpay.com",
    "phone": "08012345671",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User One"
  }'
```
**Result**: ✅ PASS - User created with ID `507ac4fe-dde6-4594-853f-f698564c6440`

---

## 📝 **Remaining Tests (To Run)**

Now we need to update the controller to accept userId or use authentication headers. For now, let me create tests using the actual user IDs:

### Test 3: Create EOA Wallet (User 1)
```bash
# We need to pass userId in the request OR use authentication
# Option 1: Update controller to accept userId in body
# Option 2: Use JWT token from auth

# For now, the controller uses req.user?.userId || 'mock-user-id'
# We need to either:
# 1. Pass JWT token in Authorization header
# 2. Or temporarily modify controller to accept userId in body for testing
```

---

## 🔧 **Next Steps**

**Option A**: Use JWT Authentication
- Get access token from login
- Pass in `Authorization: Bearer <token>` header
- Controller extracts userId from JWT

**Option B**: Temporarily add userId to DTO for testing
- Add optional userId field to CreateWalletDto
- Use it if provided (testing mode)
- Remove before production

**Recommended**: Option A (proper authentication flow)

---

## 🔐 **Testing With Authentication**

### Get Access Token (User 1):
```bash
curl -s -X POST 'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "identifier": "test.user1@raverpay.com",
    "password": "TestPass123!"
  }' | jq -r '.accessToken'
```

### Then use token in requests:
```bash
TOKEN="<access-token-from-above>"

curl -s -X POST 'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "blockchain": "BASE",
    "network": "sepolia",
    "name": "Test EOA Wallet"
  }'
```

---

**Would you like me to**:
1. Test with authentication tokens? (proper way)
2. Add temporary userId field to DTOs for easier testing?
3. Something else?
