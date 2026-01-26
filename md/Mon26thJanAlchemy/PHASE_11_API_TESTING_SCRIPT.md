# 🧪 Alchemy Integration - API Testing Script

**Server**: https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api  
**Date**: January 25, 2026  
**Status**: Testing Phase 11

---

## 📋 **Pre-Test Checklist**

- [x] AlchemyModule registered in app.module.ts
- [ ] Server is running
- [ ] Base URL accessible
- [ ] Database is connected
- [ ] Environment variables configured

---

## 🧪 **Test Suite**

### **Test 1: Health Check**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/alchemy/webhooks/health' \
  -H 'Accept: application/json'
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Webhook endpoint is healthy",
  "timestamp": "2026-01-25T19:00:00.000Z"
}
```

---

## 👛 **WALLET TESTS**

### **Test 2: Create EOA Wallet**

```bash
curl -X POST \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "blockchain": "BASE",
    "network": "sepolia",
    "name": "Test EOA Wallet"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "id": "wallet-xxx",
    "address": "0x...",
    "blockchain": "BASE",
    "network": "sepolia",
    "accountType": "EOA",
    "name": "Test EOA Wallet",
    "isGasSponsored": false,
    "createdAt": "2026-01-25T19:00:00.000Z"
  }
}
```

**Save**: `WALLET_ID` from response

---

### **Test 3: Create Smart Account**

```bash
curl -X POST \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/smart-account' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "blockchain": "BASE",
    "network": "sepolia",
    "name": "Test Smart Account"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "id": "wallet-yyy",
    "address": "0x...",
    "blockchain": "BASE",
    "network": "sepolia",
    "accountType": "SMART_CONTRACT",
    "name": "Test Smart Account",
    "isGasSponsored": true,
    "gasPolicyId": "policy-...",
    "features": {
      "gasSponsorship": true,
      "batchTransactions": true,
      "sessionKeys": true,
      "socialRecovery": false
    }
  }
}
```

**Save**: `SMART_ACCOUNT_ID` from response

---

### **Test 4: List All Wallets**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets' \
  -H 'Accept: application/json'
```

**Expected Response**:

```json
{
  "success": true,
  "data": [
    { "id": "wallet-xxx", "accountType": "EOA", ... },
    { "id": "wallet-yyy", "accountType": "SMART_CONTRACT", ... }
  ],
  "count": 2
}
```

---

### **Test 5: Get Wallet by ID**

```bash
# Replace {WALLET_ID} with actual wallet ID from Test 2
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/{WALLET_ID}' \
  -H 'Accept: application/json'
```

---

### **Test 6: Get Wallet by Network**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/by-network/BASE/sepolia' \
  -H 'Accept: application/json'
```

---

### **Test 7: Update Wallet Name**

```bash
# Replace {WALLET_ID} with actual wallet ID
curl -X PATCH \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/{WALLET_ID}/name' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "name": "Updated Wallet Name"
  }'
```

---

### **Test 8: List Smart Accounts**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/smart-accounts' \
  -H 'Accept: application/json'
```

---

### **Test 9: Check Gas Sponsorship Status**

```bash
# Replace {SMART_ACCOUNT_ID} with actual smart account ID from Test 3
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/{SMART_ACCOUNT_ID}/gas-sponsorship' \
  -H 'Accept: application/json'
```

---

### **Test 10: Upgrade EOA to Smart Account**

```bash
# Replace {WALLET_ID} with EOA wallet ID from Test 2
curl -X POST \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/{WALLET_ID}/upgrade-to-smart-account' \
  -H 'Accept: application/json'
```

---

## 💸 **TRANSACTION TESTS**

### **Test 11: Get Token Balance**

```bash
# Replace {WALLET_ID} with actual wallet ID
curl -X POST \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/transactions/balance' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "walletId": "{WALLET_ID}",
    "tokenType": "USDC"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "walletId": "wallet-xxx",
    "address": "0x...",
    "tokenType": "USDC",
    "tokenAddress": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "balance": "0",
    "blockchain": "BASE",
    "network": "sepolia"
  }
}
```

---

### **Test 12: Send USDC (Testnet)**

⚠️ **Note**: This will FAIL without testnet USDC. Need to get testnet tokens first!

```bash
# Replace {WALLET_ID} with actual wallet ID
curl -X POST \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/transactions/send' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "walletId": "{WALLET_ID}",
    "destinationAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": "1.0",
    "tokenType": "USDC"
  }'
```

---

### **Test 13: Get Transaction History**

```bash
# Replace {WALLET_ID} with actual wallet ID
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/transactions/history/{WALLET_ID}?limit=10&offset=0' \
  -H 'Accept: application/json'
```

---

### **Test 14: Get Transaction by Reference**

```bash
# Replace {REFERENCE} with actual transaction reference (e.g., ALY-12345-abc)
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/transactions/reference/{REFERENCE}' \
  -H 'Accept: application/json'
```

---

## 🔔 **WEBHOOK TESTS**

### **Test 15: Webhook Stats**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/alchemy/webhooks/stats' \
  -H 'Accept: application/json'
```

---

## 🔧 **ADMIN TESTS**

### **Test 16: Platform Statistics**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/admin/stats/platform' \
  -H 'Accept: application/json'
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "wallets": {
      "total": 2,
      "active": 2,
      "eoa": 1,
      "smartAccount": 1,
      "smartAccountAdoptionRate": "50.00%"
    },
    "transactions": {
      "total": 0,
      "completed": 0,
      "failed": 0,
      "pending": 0,
      "successRate": "0%"
    },
    "users": {
      "total": 1,
      "averageWalletsPerUser": "2.00"
    }
  }
}
```

---

### **Test 17: Gas Analytics**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/admin/stats/gas?blockchain=BASE' \
  -H 'Accept: application/json'
```

---

### **Test 18: Recent Transactions (Admin)**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/admin/transactions?limit=10&offset=0' \
  -H 'Accept: application/json'
```

---

### **Test 19: Network Statistics**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/admin/stats/networks' \
  -H 'Accept: application/json'
```

---

### **Test 20: Security Alerts**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/admin/security/alerts?limit=50&daysBack=7' \
  -H 'Accept: application/json'
```

---

### **Test 21: System Health**

```bash
curl -X GET \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/admin/health' \
  -H 'Accept: application/json'
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-25T19:00:00.000Z",
    "metrics": {
      "transactionsLastHour": 0,
      "successRate": "100%",
      "pendingTransactions": 0,
      "failedLast24h": 0
    },
    "issues": []
  }
}
```

---

## 🎯 **Security Tests**

### **Test 22: Lock Wallet**

```bash
# Replace {WALLET_ID} with actual wallet ID
curl -X POST \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/{WALLET_ID}/lock' \
  -H 'Accept: application/json'
```

---

### **Test 23: Mark Wallet Compromised**

```bash
# Replace {WALLET_ID} with actual wallet ID
curl -X POST \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/{WALLET_ID}/compromised' \
  -H 'Accept: application/json'
```

---

### **Test 24: Deactivate Wallet**

```bash
# Replace {WALLET_ID} with actual wallet ID
curl -X DELETE \
  'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/wallets/{WALLET_ID}' \
  -H 'Accept: application/json'
```

---

## 📝 **Test Results Template**

| Test # | Endpoint              | Status | Response Time | Notes                |
| ------ | --------------------- | ------ | ------------- | -------------------- |
| 1      | Health Check          | ⏸️     | -             | -                    |
| 2      | Create EOA Wallet     | ⏸️     | -             | -                    |
| 3      | Create Smart Account  | ⏸️     | -             | -                    |
| 4      | List Wallets          | ⏸️     | -             | -                    |
| 5      | Get Wallet by ID      | ⏸️     | -             | -                    |
| 6      | Get by Network        | ⏸️     | -             | -                    |
| 7      | Update Name           | ⏸️     | -             | -                    |
| 8      | List Smart Accounts   | ⏸️     | -             | -                    |
| 9      | Check Gas Sponsorship | ⏸️     | -             | -                    |
| 10     | Upgrade to Smart      | ⏸️     | -             | -                    |
| 11     | Get Balance           | ⏸️     | -             | -                    |
| 12     | Send USDC             | ⏸️     | -             | Needs testnet tokens |
| 13     | Transaction History   | ⏸️     | -             | -                    |
| 14     | Get by Reference      | ⏸️     | -             | -                    |
| 15     | Webhook Stats         | ⏸️     | -             | -                    |
| 16     | Platform Stats        | ⏸️     | -             | -                    |
| 17     | Gas Analytics         | ⏸️     | -             | -                    |
| 18     | Recent Transactions   | ⏸️     | -             | -                    |
| 19     | Network Stats         | ⏸️     | -             | -                    |
| 20     | Security Alerts       | ⏸️     | -             | -                    |
| 21     | System Health         | ⏸️     | -             | -                    |
| 22     | Lock Wallet           | ⏸️     | -             | -                    |
| 23     | Mark Compromised      | ⏸️     | -             | -                    |
| 24     | Deactivate Wallet     | ⏸️     | -             | -                    |

---

## 🐛 **Common Issues & Solutions**

### **Issue**: "Cannot GET /api/alchemy/..."

**Solution**: Check if AlchemyModule is registered in app.module.ts

### **Issue**: "Internal Server Error"

**Solution**: Check server logs, verify database connection

### **Issue**: "Invalid network"

**Solution**: Use BASE/sepolia, POLYGON/amoy, or ARBITRUM/sepolia

### **Issue**: "Insufficient funds" (for transactions)

**Solution**: Get testnet USDC from faucet

---

## 📌 **Next Steps After Testing**

1. ✅ Verify all endpoints work
2. ✅ Document any errors found
3. ✅ Fix bugs
4. ⏭️ Get testnet tokens
5. ⏭️ Test real transactions
6. ⏭️ Test webhook reception
7. ⏭️ Move to Phase 12 (Mobile Integration)

---

**Ready to start testing!** 🚀
