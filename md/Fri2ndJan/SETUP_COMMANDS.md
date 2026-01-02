# Quick Setup Commands

## 1. Create Superadmin User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "collectionwallet@raverpay.com",
    "password": "joseph6thbornR$",
    "firstName": "superadmin",
    "lastName": "raverpay",
    "phone": "09018142408"
  }'
```

**Expected Response:**

```json
{
  "user": {
    "id": "user_xxx",
    "email": "collectionwallet@raverpay.com",
    "phone": "09018142408",
    "firstName": "superadmin",
    "lastName": "raverpay",
    "isEmailVerified": false,
    "isPhoneVerified": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the `accessToken` - you'll need it for the next step!**

---

## 2. Login (if needed later)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "collectionwallet@raverpay.com",
    "password": "joseph6thbornR$"
  }'
```

---

## 3. Create Developer Wallet for Fee Collection (Recommended)

**Replace `YOUR_ADMIN_TOKEN` with the accessToken from step 1**
**Replace `0xYourWalletAddress` with your actual EVM wallet address**

```bash
curl -X PUT http://localhost:3001/api/circle/fees/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "percentage": 0.5,
    "minFeeUsdc": 0.0625,
    "collectionWallets": {
      "BASE-SEPOLIA": "0xYourWalletAddress",
      "OP-SEPOLIA": "0xYourWalletAddress",
      "ARB-SEPOLIA": "0xYourWalletAddress",
      "MATIC-AMOY": "0xYourWalletAddress",
      "BASE-MAINNET": "0xYourWalletAddress",
      "OP-MAINNET": "0xYourWalletAddress",
      "ARB-MAINNET": "0xYourWalletAddress",
      "MATIC-POLYGON": "0xYourWalletAddress"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Fee configuration updated successfully",
  "data": {
    "enabled": true,
    "percentage": 0.5,
    "minFeeUsdc": 0.0625,
    "collectionWallets": {
      "BASE-SEPOLIA": "0xYourWalletAddress",
      "OP-SEPOLIA": "0xYourWalletAddress",
      "ARB-SEPOLIA": "0xYourWalletAddress",
      "MATIC-AMOY": "0xYourWalletAddress",
      "BASE-MAINNET": "0xYourWalletAddress",
      "OP-MAINNET": "0xYourWalletAddress",
      "ARB-MAINNET": "0xYourWalletAddress",
      "MATIC-POLYGON": "0xYourWalletAddress"
    }
  }
}
```

---

## 5. Verify Configuration

```bash
curl http://localhost:3001/api/circle/fees/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Complete Automated Workflow

```bash
#!/bin/bash

# Step 1: Create superadmin
echo "Creating superadmin account..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "collectionwallet@raverpay.com",
    "password": "joseph6thbornR$",
    "firstName": "superadmin",
    "lastName": "raverpay",
    "phone": "09018142408"
  }')

# Step 2: Extract token (requires jq - install with: brew install jq)
TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
echo "✓ Superadmin created. Token: ${TOKEN:0:20}..."

# Step 3: Create developer wallet for fee collection
echo "Creating fee collection wallet on Base Sepolia..."
WALLET_RESPONSE=$(curl -s -X POST http://localhost:3001/api/circle/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blockchain": "BASE-SEPOLIA",
    "accountType": "SCA",
    "name": "Fee Collection Wallet"
  }')

WALLET_ADDRESS=$(echo $WALLET_RESPONSE | jq -r '.data.address')
echo "✓ Wallet created: $WALLET_ADDRESS"

# Step 4: Configure all chains to use this wallet
echo "Configuring fee collection..."
curl -s -X PUT http://localhost:3001/api/circle/fees/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"enabled\": true,
    \"percentage\": 0.5,
    \"minFeeUsdc\": 0.0625,
    \"collectionWallets\": {
## Notes

- **All wallets in one call**: Yes! You can set all 8 blockchain wallets in a single PUT request
- **Same address works**: You can use the same EVM wallet address for all chains (Base, Optimism, Arbitrum, Polygon are all EVM-compatible)
- **Developer wallet recommended**: Creating a Circle developer wallet is better than using external wallet:
  - ✅ Appears in your Circle dashboard
  - ✅ Full transaction history and audit trail
  - ✅ Proper entity secret encryption
  - ✅ Can withdraw fees using Circle API
  - ✅ Better security and compliance
- **Testnet first**: For testing, configure testnet chains first (BASE-SEPOLIA, OP-SEPOLIA, ARB-SEPOLIA, MATIC-AMOY)
- **Server port**: Your API runs on `http://localhost:3001/api` (not port 4000)
- **Password**: Your password meets requirements: ✅ uppercase, ✅ lowercase, ✅ special character, ✅ min 8 chars
- **Phone**: Format is correct: `09018142408` (Nigerian format)
- **Account type**: `SCA` (Smart Contract Account) recommended for better gas management
    }
  }" | jq .

echo ""
echo "✓ Setup complete!"
echo "Token: $TOKEN"
echo "Fee Collection Wallet: $WALLET_ADDRESS"

# Step 5: Verify
echo ""
echo "Verifying configuration..."
curl -s http://localhost:3001/api/circle/fees/config \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Save as `setup-fees.sh` and run:**

```bash
chmod +x setup-fees.sh
./setup-fees.sh
```

---

## Notes

- **All wallets in one call**: Yes! You can set all 8 blockchain wallets in a single PUT request
- **Same address works**: You can use the same EVM wallet address for all chains (Base, Optimism, Arbitrum, Polygon are all EVM-compatible)
- **Testnet first**: For testing, configure testnet chains first (BASE-SEPOLIA, OP-SEPOLIA, ARB-SEPOLIA, MATIC-AMOY)
- **Server port**: Your API runs on `http://localhost:3001/api` (not port 4000)
- **Password**: Your password meets requirements: ✅ uppercase, ✅ lowercase, ✅ special character, ✅ min 8 chars
- **Phone**: Format is correct: `09018142408` (Nigerian format)

---

## Quick Test After Setup

```bash
# Calculate fee for 100 USDC
curl "http://localhost:3001/api/circle/fees/calculate?amount=100" \
  -H "Authorization: Bearer $TOKEN"

# Expected: { "amount": 100, "fee": 0.5, "total": 100.5 }
```

---

## Troubleshooting

### If user already exists:

Login instead of registering:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "collectionwallet@raverpay.com",
    "password": "joseph6thbornR$"
  }'
```

### If you need to make the user admin:

Contact your database admin or use SQL:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'collectionwallet@raverpay.com';
```

### If collection wallet address is invalid:

Make sure you use a valid Ethereum-compatible address starting with `0x` (42 characters total)
