# Alchemy Backend API Test Guide

## Prerequisites

1. **Start the API server:**

   ```bash
   cd apps/raverpay-api
   pnpm dev
   ```

2. **Get JWT Token:**

   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your@email.com",
       "password": "yourpassword"
     }'
   ```

   Copy the `accessToken` from the response.

## Quick Test Script

Run all tests at once:

```bash
cd apps/raverpay-api
./test-alchemy-endpoints.sh <YOUR_JWT_TOKEN>
```

## Manual Test Commands

### 1. Create EOA Wallet

```bash
curl -X POST http://localhost:3001/api/alchemy/wallets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blockchain": "BASE",
    "network": "sepolia",
    "name": "My Test Wallet"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "address": "0x...",
    "blockchain": "BASE",
    "network": "sepolia",
    "accountType": "EOA",
    "name": "My Test Wallet",
    "isGasSponsored": false,
    "hasSeedPhrase": true,
    "createdAt": "2026-01-27T..."
  }
}
```

### 2. Get Native Token Balance

```bash
curl -X GET http://localhost:3001/api/alchemy/transactions/balance/native/WALLET_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "walletId": "wallet-uuid",
    "address": "0x...",
    "tokenType": "ETH",
    "tokenAddress": null,
    "balance": "0.0",
    "balanceRaw": "0",
    "blockchain": "BASE",
    "network": "sepolia"
  }
}
```

### 3. Get Gas Price

```bash
curl -X GET http://localhost:3001/api/alchemy/transactions/gas-price/BASE/sepolia \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "blockchain": "BASE",
    "network": "sepolia",
    "gasPrice": "0.000000001",
    "maxFeePerGas": "0.000000002",
    "maxPriorityFeePerGas": "0.000000001",
    "nativeToken": "ETH"
  }
}
```

### 4. Export Seed Phrase

```bash
curl -X POST http://localhost:3001/api/alchemy/wallets/WALLET_ID/export-seed \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "mnemonic": "word1 word2 word3 ... word12",
    "warning": "Never share your seed phrase. Anyone with these words can access your wallet."
  }
}
```

**Note:** Requires valid PIN. Will return 403 if PIN is incorrect.

### 5. Import Wallet (Seed Phrase)

```bash
curl -X POST http://localhost:3001/api/alchemy/wallets/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "SEED_PHRASE",
    "seedPhrase": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    "blockchain": "POLYGON",
    "network": "amoy",
    "name": "Imported Wallet"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "address": "0x...",
    "blockchain": "POLYGON",
    "network": "amoy",
    "accountType": "EOA",
    "name": "Imported Wallet",
    "isGasSponsored": false,
    "hasSeedPhrase": true,
    "createdAt": "2026-01-27T..."
  },
  "message": "Wallet imported successfully"
}
```

### 6. Import Wallet (Private Key)

```bash
curl -X POST http://localhost:3001/api/alchemy/wallets/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "PRIVATE_KEY",
    "privateKey": "0x0000000000000000000000000000000000000000000000000000000000000001",
    "blockchain": "ARBITRUM",
    "network": "sepolia",
    "name": "Imported Private Key Wallet"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "address": "0x...",
    "blockchain": "ARBITRUM",
    "network": "sepolia",
    "accountType": "EOA",
    "name": "Imported Private Key Wallet",
    "isGasSponsored": false,
    "hasSeedPhrase": false,
    "createdAt": "2026-01-27T..."
  },
  "message": "Wallet imported successfully"
}
```

### 7. Send Native Token

```bash
curl -X POST http://localhost:3001/api/alchemy/transactions/send-native \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "WALLET_ID",
    "destinationAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": "0.001"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": "tx-uuid",
    "reference": "ALY-NATIVE-1234567890-abc",
    "transactionHash": "0x...",
    "state": "COMPLETED",
    "amount": "0.001 ETH",
    "destinationAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "blockNumber": "12345",
    "completedAt": "2026-01-27T..."
  },
  "message": "Native token transaction submitted successfully"
}
```

**Note:** Will fail if wallet has insufficient balance.

### 8. Get Wallet Details (verify hasSeedPhrase)

```bash
curl -X GET http://localhost:3001/api/alchemy/wallets/WALLET_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "address": "0x...",
    "blockchain": "BASE",
    "network": "sepolia",
    "accountType": "EOA",
    "state": "ACTIVE",
    "name": "My Test Wallet",
    "isGasSponsored": false,
    "hasSeedPhrase": true,
    "createdAt": "2026-01-27T...",
    "updatedAt": "2026-01-27T..."
  }
}
```

## Error Responses

### Invalid PIN (403)

```json
{
  "statusCode": 403,
  "message": "Invalid PIN",
  "error": "Forbidden"
}
```

### Wallet Not Found (404)

```json
{
  "statusCode": 404,
  "message": "Wallet not found",
  "error": "Not Found"
}
```

### Invalid Seed Phrase (400)

```json
{
  "statusCode": 400,
  "message": "Invalid seed phrase (checksum failed)",
  "error": "Bad Request"
}
```

### Insufficient Balance (400)

```json
{
  "statusCode": 400,
  "message": "Transaction failed: insufficient funds",
  "error": "Bad Request"
}
```

## Testing Checklist

- [x] Database migration applied successfully
- [x] Prisma client regenerated
- [x] Lint passed (no errors)
- [ ] Create wallet endpoint tested
- [ ] Get native balance endpoint tested
- [ ] Get gas price endpoint tested
- [ ] Export seed phrase endpoint tested (with valid PIN)
- [ ] Import wallet (seed phrase) endpoint tested
- [ ] Import wallet (private key) endpoint tested
- [ ] Send native token endpoint tested
- [ ] Wallet details includes hasSeedPhrase flag
