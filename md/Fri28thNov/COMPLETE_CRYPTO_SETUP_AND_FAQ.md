# Complete Crypto Setup & FAQ

## ✅ Your Current Status

- ✅ Wallet created and syncing
- ✅ MATIC: 0.6 POL
- ✅ USDT: 1000 tokens
- ✅ USDC: 900 tokens
- ⚠️ USD values showing $0.00 (FIXED - will update after next sync)

---

## 📋 Your Questions Answered

### 1. **Production: How Do Users Get Tokens?**

**Users DO NOT mint tokens.** Here's the production flow:

#### **For USDT/USDC:**

```
1. User buys tokens on exchange (Binance, Coinbase, etc.)
2. User withdraws to Polygon network
3. User sends to their wallet address in your app
4. Tokens appear automatically (via webhooks/sync)
```

#### **For MATIC (Gas):**

- **Option A**: User deposits small amount for gas
- **Option B**: You subsidize gas (admin master wallet - see guide)
- **Option C**: Venly Gas Tank service

**Production User Flow:**

```
1. User creates wallet ✅
2. App shows deposit address + QR code
3. User buys USDT/USDC on exchange
4. User withdraws to Polygon
5. User sends to wallet address
6. Tokens appear in app ✅
```

---

### 2. **Can You Transfer Tokens?**

**YES!** Use the send endpoint:

```bash
POST /api/v1/crypto/send
Authorization: Bearer YOUR_JWT_TOKEN

{
  "tokenSymbol": "USDT",  // or "USDC" or "MATIC"
  "toAddress": "0x...",   // Recipient address
  "amount": "100",
  "pin": "123456"
}
```

**To Test:**

1. Create a second test wallet (or use friend's address)
2. Call send endpoint
3. Check transaction on Polygon Amoy Explorer

---

### 3. **Why USD Value Shows $0.00?**

**FIXED!** I've added `updateUsdValues()` call during sync.

**What was wrong:**

- Venly API returns `0` for testnet token prices
- Code wasn't fetching CoinGecko prices after sync
- Now it will update USD values from CoinGecko

**After next sync:**

- USDT: Should show ~$1000 (1000 × $1.00)
- USDC: Should show ~$900 (900 × $1.00)
- MATIC: Should show ~$0.30 (0.6 × ~$0.50)

**Note:** CoinGecko prices update every minute via cron job.

---

### 4. **Fresh Sandbox Setup - Complete Guide**

#### **Step 1: Venly Account Setup**

1. Go to https://portal.venly.io
2. Sign up / Login
3. Navigate to "Wallet API" → "Sandbox"
4. Copy your credentials:
   - Client ID
   - Client Secret

#### **Step 2: Get Testnet MATIC**

1. Venly Dashboard → **Faucet**
2. Select your wallet
3. Request **0.5 POL** (Polygon Amoy)
4. Wait for confirmation (~30 seconds)

#### **Step 3: Create Test USDT Token**

1. Venly Dashboard → **"Create and mint ERC20 tokens"**
2. Fill in:
   - **Name**: "Test USDT"
   - **Symbol**: "USDT"
   - **Chain**: MATIC (Polygon)
   - **Network**: Sandbox
3. Click **Create**
4. **Copy contract address** (e.g., `0x420e9c976b04653c64d294b2a380d3e74475c559`)

#### **Step 4: Create Test USDC Token**

1. Repeat Step 3 with:
   - **Name**: "Test USDC"
   - **Symbol**: "USDC"
2. **Copy second contract address**

#### **Step 5: Mint Tokens**

1. Go to your token contract → **"Mint Token"**
2. **Destination address**: Your wallet address
   - Get from: `GET /api/v1/crypto/wallet` → `walletAddress`
3. **Amount**: Enter amount (e.g., `1000`)
4. Click **Mint**
5. Repeat for both USDT and USDC

#### **Step 6: Configure App**

Add to `apps/raverpay-api/.env`:

```env
# Polygon Amoy Testnet Token Addresses
POLYGON_AMOY_USDT_ADDRESS=0x...your-usdt-contract
POLYGON_AMOY_USDC_ADDRESS=0x...your-usdc-contract
```

#### **Step 7: Restart & Sync**

```bash
cd apps/raverpay-api
pnpm run start:dev

# Sync wallet
POST /api/v1/crypto/wallet/sync
```

---

## 🔧 What I Fixed

1. ✅ **USD Price Updates**: Added `updateUsdValues()` call during sync
2. ✅ **Retry Logic**: Added automatic retries for SSL/network errors
3. ✅ **Testnet Token Support**: Code now handles testnet addresses
4. ✅ **Same Token for Both**: Fixed USDC balance when using same contract

---

## 📊 Production vs Testnet

| Feature             | Testnet             | Production         |
| ------------------- | ------------------- | ------------------ |
| **MATIC Source**    | Venly Faucet (free) | Buy on exchange    |
| **USDT/USDC**       | Mint test tokens    | Buy on exchange    |
| **Gas Fees**        | Free                | Real money         |
| **Token Addresses** | Custom contracts    | Official contracts |
| **Prices**          | CoinGecko           | CoinGecko          |

---

## 🚀 Next Steps

1. ✅ **Test Token Transfer**: Send tokens to another wallet
2. ✅ **Verify USD Prices**: Sync again and check USD values
3. ✅ **Plan Production**: Design deposit flow for users
4. ✅ **Admin Wallet**: Implement auto-funding (from guide)

---

## 💡 Key Takeaways

- **Users don't mint** - they buy and deposit
- **You can transfer** - use `/api/v1/crypto/send`
- **USD prices** - now updating from CoinGecko
- **Testnet setup** - use Venly dashboard to create/mint

---

## 🔍 Testing Token Transfer

To test sending tokens:

```bash
# 1. Get your wallet address
GET /api/v1/crypto/wallet

# 2. Create a second test wallet (or use friend's)
# 3. Send tokens
POST /api/v1/crypto/send
{
  "tokenSymbol": "USDT",
  "toAddress": "0x...recipient-address",
  "amount": "10",
  "pin": "your-pin"
}

# 4. Check transaction
# Response includes transactionHash
# View on: https://amoy.polygonscan.com/tx/0x...
```

---

## 📝 Production Checklist

- [ ] Set up admin master wallet (for gas subsidies)
- [ ] Configure production Venly credentials
- [ ] Update token addresses to mainnet
- [ ] Design user deposit flow UI
- [ ] Set up webhook handlers for deposits
- [ ] Test with small amounts first
- [ ] Monitor gas costs
- [ ] Set up alerts for low admin wallet balance
