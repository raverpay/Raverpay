# Production Crypto Flow & Complete Setup Guide

## 📋 Your Questions Answered

### 1. **In Production: How Do Users Get Tokens?**

**Users DO NOT mint tokens themselves.** Here's how it works:

#### **For USDT/USDC (Stablecoins):**

- Users **buy** tokens on exchanges (Binance, Coinbase, Kraken, etc.)
- Users **withdraw** to Polygon network
- Users **send** to their wallet address in your app
- OR users **receive** from other users/merchants

#### **For MATIC (Gas Token):**

- **Option A**: Users deposit small amount of MATIC for gas fees
- **Option B**: You (app owner) subsidize gas using admin wallet (like the guide)
- **Option C**: Use Venly's "Gas Tank" service (they pay gas, charge you)

**Production Flow:**

```
1. User creates wallet in your app ✅
2. App shows deposit address + QR code
3. User buys USDT/USDC on exchange
4. User withdraws to Polygon network
5. User sends to their wallet address
6. Tokens appear in app automatically (via webhooks/sync)
```

---

### 2. **Can You Transfer Tokens to Another Wallet?**

**YES!** You can transfer tokens using the send endpoint:

```bash
POST /api/v1/crypto/send
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "tokenSymbol": "USDT",  // or "USDC" or "MATIC"
  "toAddress": "0x...",   // Recipient wallet address
  "amount": "100",        // Amount to send
  "pin": "123456",        // Your wallet PIN
  "memo": "Optional note" // Optional
}
```

**Response:**

```json
{
  "transaction": {
    "transactionHash": "0x...",
    "status": "PENDING"
  },
  "message": "Transaction submitted to blockchain"
}
```

**To test:**

1. Get another wallet address (create a second test wallet or use a friend's)
2. Call the send endpoint with your token
3. Check transaction on Polygon Amoy Explorer

---

### 3. **Why USD Value Shows $0.00?**

The issue is that **Venly API returns `0` for USD prices on testnet tokens**. Your code should fetch prices from CoinGecko instead.

**Current Problem:**

- Venly API returns `exchange.usdPrice: 0` for testnet tokens
- Your code uses that value directly
- Should fallback to CoinGecko prices

**Fix:** The `updateUsdValues()` method exists but might not be called. Let me check if it's being invoked during sync.

---

### 4. **Fresh Sandbox Setup - Step by Step**

Here's the complete flow for a new sandbox account:

#### **Step 1: Create Venly Account**

1. Go to https://portal.venly.io
2. Sign up / Login
3. Navigate to "Wallet API" → "Sandbox"
4. You'll get test credentials automatically

#### **Step 2: Get Testnet MATIC (POL)**

1. Go to Venly Dashboard → **Faucet**
2. Select your wallet
3. Request **0.5 POL** (Polygon Amoy testnet MATIC)
4. Wait for confirmation
5. You should see ~0.5 POL in your wallet

#### **Step 3: Create Test Token Contracts**

1. Go to Venly Dashboard → **Create Token** (or "ERC20 Tokens")
2. Click **"Create and mint ERC20 tokens"**
3. Fill in:
   - **Name**: "Test USDT"
   - **Symbol**: "USDT"
   - **Chain**: MATIC (Polygon)
   - **Network**: Sandbox (Amoy)
4. Click **Create**
5. **Copy the contract address** (e.g., `0x420e9c976b04653c64d294b2a380d3e74475c559`)

#### **Step 4: Create Second Token (USDC)**

1. Repeat Step 3 with:
   - **Name**: "Test USDC"
   - **Symbol**: "USDC"
2. **Copy the second contract address**

#### **Step 5: Mint Tokens to Your Wallet**

1. In Venly Dashboard → Your Token Contract → **"Mint Token"**
2. **Destination address**: Your wallet address (get from your app/database)
3. **Amount**: Enter amount (e.g., `1000`)
4. Click **Mint**
5. Repeat for both USDT and USDC tokens

#### **Step 6: Configure Your App**

Add to `apps/mularpay-api/.env`:

```env
# Polygon Amoy Testnet Token Addresses
POLYGON_AMOY_USDT_ADDRESS=0x...your-usdt-contract-address
POLYGON_AMOY_USDC_ADDRESS=0x...your-usdc-contract-address
```

#### **Step 7: Restart & Sync**

```bash
cd apps/mularpay-api
pnpm run start:dev

# Then sync wallet
POST /api/v1/crypto/wallet/sync
```

---

## 🔧 Fixing USD Price Issue

The USD values show $0 because Venly doesn't provide prices for testnet tokens. You need to:

1. **Ensure CoinGecko price service is running**
2. **Call `updateUsdValues()` after sync**

Let me check if this is being called...

---

## 📊 Production vs Testnet Comparison

| Aspect               | Testnet (Sandbox)     | Production (Mainnet)  |
| -------------------- | --------------------- | --------------------- |
| **MATIC Source**     | Venly Faucet (free)   | Buy on exchange       |
| **USDT/USDC Source** | Mint test tokens      | Buy on exchange       |
| **Token Addresses**  | Custom test contracts | Official contracts    |
| **Gas Fees**         | Free                  | Real money (~$0.01)   |
| **USD Prices**       | Manual/CoinGecko      | CoinGecko API         |
| **User Flow**        | Mint tokens           | Deposit from exchange |

---

## 🚀 Production User Onboarding Flow

```
1. User signs up ✅
2. User creates crypto wallet ✅
3. App shows deposit screen:
   ┌─────────────────────────────┐
   │  Your Wallet Address         │
   │  0x742d35Cc6634C0532925a3b8...│
   │  [QR Code]                    │
   │                               │
   │  📋 Copy Address              │
   │                               │
   │  How to Deposit:              │
   │  1. Buy USDT/USDC on Binance  │
   │  2. Withdraw to Polygon       │
   │  3. Send to address above      │
   │  4. Minimum: $10 worth         │
   └─────────────────────────────┘

4. User deposits from exchange
5. App detects deposit (webhook/sync)
6. User can now send/convert crypto ✅
```

---

## 💡 Key Takeaways

1. **Users don't mint** - they buy and deposit
2. **You can transfer** - use `/api/v1/crypto/send` endpoint
3. **USD prices** - need CoinGecko integration (check if running)
4. **Testnet setup** - use Venly dashboard to create/mint tokens

---

## 🔍 Next Steps

1. ✅ Test token transfer to another wallet
2. ✅ Fix USD price fetching (ensure CoinGecko service runs)
3. ✅ Plan production deposit flow
4. ✅ Implement admin master wallet (from guide) for gas subsidies
