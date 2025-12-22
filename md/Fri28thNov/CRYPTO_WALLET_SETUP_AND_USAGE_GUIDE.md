# 🚀 Crypto Wallet Setup & Usage Guide

## 📋 Overview

This guide explains:

1. ✅ Environment setup (.env configuration)
2. ✅ User flows (new vs existing users)
3. ✅ Testnet usage with Venly's free assets
4. ✅ Admin dashboard requirements
5. ✅ Distinction between OLD crypto system vs NEW Venly wallet

---

## 🔧 Part 1: Environment Setup (.env Configuration)

### Step 1: Generate Encryption Key

```bash
cd /Users/joseph/Desktop/raverpay/apps/raverpay-api

# Generate encryption key for PINs
openssl rand -hex 32
```

Copy the output (64 character hex string).

### Step 2: Add to .env File

Open `/Users/joseph/Desktop/raverpay/apps/raverpay-api/.env` and add these variables:

```env
# ============================================
# VENLY CRYPTO WALLET CONFIGURATION
# ============================================

# Environment: sandbox for testing, production for live
VENLY_ENV=sandbox

# SANDBOX Credentials (for testing - these are PUBLIC test credentials)
VENLY_CLIENT_ID=5104fc22-eb58-427b-ad17-fac2d3c56568
VENLY_CLIENT_SECRET=3smR3Oqa38VOTUdOzErutijgNzLM5aDC

# PRODUCTION Credentials (get from https://portal.venly.io when ready)
# VENLY_CLIENT_ID=your_production_client_id
# VENLY_CLIENT_SECRET=your_production_client_secret

# Encryption key for storing user PINs (PASTE YOUR GENERATED KEY HERE)
CRYPTO_ENCRYPTION_KEY=paste_your_64_char_hex_string_here

# Polygon Token Addresses (DO NOT CHANGE - these are mainnet addresses)
POLYGON_USDT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
POLYGON_USDC_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
```

### Step 3: Restart API Server

```bash
cd /Users/joseph/Desktop/raverpay/apps/raverpay-api
pnpm run start:dev
```

### ✅ Verification

API should start without errors. Check logs for:

```
[Nest] 12345  - Crypto module initialized
[Nest] 12345  - Venly environment: sandbox
```

---

## 👥 Part 2: User Flows - What Users Can Do

### 🆕 NEW USER (Never Used Crypto Wallet)

#### Mobile App Flow:

1. **Open App** → Navigate to "Crypto" tab
2. **See Setup Screen**

   ```
   "Setup Crypto Wallet"
   - Create a secure 6-digit PIN
   - Features listed
   - [Setup Now] button
   ```

3. **Create Wallet** (First Time)
   - Enter 6-digit PIN
   - Confirm PIN
   - Click "Setup Wallet"
   - ⏳ Backend creates:
     - Venly user account
     - MATIC wallet on Polygon
     - Database records
   - ✅ Success! Wallet created

4. **What Happens Automatically** (Venly Sandbox Magic ✨)

   ```
   Your new wallet receives FREE testnet assets:
   - 1 POL Token (testnet MATIC for gas fees)
   - 100 Venly Test Tokens (ERC20)
   - 1 NFT
   ```

5. **First Actions Available**
   - ✅ **View Balance**: See 1 MATIC + test tokens
   - ✅ **Get Wallet Address**: See your unique 0x... address
   - ✅ **Receive**: Show QR code to receive more crypto
   - ✅ **Send**: Send MATIC/tokens to another address
   - ❌ **Convert**: Can't convert test tokens to real Naira

#### What User Can Do Immediately (Sandbox):

```
✅ SEND Test Tokens
   - Send to any Polygon address
   - Practice transaction flow
   - Test PIN verification

✅ RECEIVE Test Tokens
   - Share wallet address
   - Get QR code
   - Receive from faucets: https://faucet.polygon.technology

✅ VIEW Transactions
   - See all sends/receives
   - Track transaction status
   - View transaction hashes

❌ CONVERT to Naira (Sandbox Limitation)
   - Test tokens have no real value
   - Conversion will work but credit test Naira
   - Only works with real tokens in production
```

---

### 🔄 EXISTING USER (Already Has Crypto Wallet)

#### Mobile App Flow:

1. **Open App** → Navigate to "Crypto" tab
2. **See Wallet Home**

   ```
   Total Portfolio Value: $X.XX

   [Receive] [Send] [Convert]

   Your Assets:
   - MATIC: X.XXXX ($X.XX)
   - USDT: X.XX ($X.XX)
   - USDC: X.XX ($X.XX)

   Recent Transactions
   ```

3. **Available Actions**:

   **A. RECEIVE Crypto** ✅

   ```
   - Tap "Receive"
   - See QR code with wallet address
   - Copy address to clipboard
   - Share with sender
   - Tokens appear automatically
   ```

   **B. SEND Crypto** ✅

   ```
   - Tap "Send"
   - Select token (USDT/USDC/MATIC)
   - Enter recipient address (0x...)
   - Enter amount
   - Add optional memo
   - Enter PIN
   - Confirm transaction
   - ✅ Sent! Transaction hash shown
   ```

   **C. CONVERT to Naira** ✅ (Production Only)

   ```
   - Tap "Convert"
   - Select token (USDT or USDC)
   - Enter amount
   - See conversion quote:
     * USD value
     * Exchange rate (USD→NGN)
     * Naira amount
     * Fee (percentage)
     * Net amount you'll receive
   - Enter PIN
   - Confirm conversion
   - ✅ Naira instantly added to main wallet
   ```

   **D. VIEW Transactions** ✅

   ```
   - See all crypto transactions
   - Filter by type (send/receive)
   - View details:
     * Transaction hash
     * Amount
     * USD value
     * Status (pending/completed/failed)
     * Confirmations
     * Gas fees
   ```

   **E. REFRESH Balance** ✅

   ```
   - Pull down to refresh
   - Syncs balances from blockchain
   - Updates USD prices
   - Shows latest transactions
   ```

---

## 🧪 Part 3: Using Venly's Testnet Assets

### How Testnet Works:

```
┌─────────────────────────────────────────┐
│  USER CREATES WALLET (Sandbox)          │
│  ↓                                       │
│  Backend calls Venly API                │
│  ↓                                       │
│  Venly creates testnet wallet           │
│  ↓                                       │
│  Venly AUTOMATICALLY deposits:          │
│  - 1 POL Token (Mumbai testnet)         │
│  - 100 Venly Test Tokens                │
│  - 1 NFT                                 │
│  ↓                                       │
│  User sees balance immediately! ✅      │
└─────────────────────────────────────────┘
```

### What You Can Test:

#### 1. **Basic Wallet Operations** ✅

```bash
# Create wallet
curl -X POST http://localhost:3000/v1/crypto/wallet/initialize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "123456"}'

# Response includes wallet address
# Automatically has testnet assets! 🎉
```

#### 2. **Send Testnet Tokens** ✅

```bash
# Send test MATIC to another address
curl -X POST http://localhost:3000/v1/crypto/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenSymbol": "MATIC",
    "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": "0.1",
    "pin": "123456"
  }'
```

#### 3. **Receive More Testnet Tokens** ✅

```bash
# Get your wallet address
curl -X GET http://localhost:3000/v1/crypto/deposit-info \
  -H "Authorization: Bearer YOUR_TOKEN"

# Use Polygon Mumbai Faucet
# Visit: https://faucet.polygon.technology
# Enter your wallet address
# Get free testnet MATIC
```

#### 4. **Check Balances** ✅

```bash
# Sync and view balances
curl -X POST http://localhost:3000/v1/crypto/wallet/sync \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get MATIC balance
curl -X GET http://localhost:3000/v1/crypto/balance/MATIC \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Testnet Limitations:

```
❌ Cannot convert to REAL Naira (test tokens = $0)
❌ Cannot withdraw test Naira
❌ Test transactions don't appear on mainnet
✅ Perfect for testing UI/UX
✅ Perfect for testing transaction flows
✅ Perfect for testing PIN verification
✅ Perfect for testing error handling
```

---

## 🎯 Part 4: Production Migration

### When Ready for Real Money:

#### Step 1: Get Venly Production Credentials

```bash
1. Go to https://portal.venly.io
2. Create account / Login
3. Create new application
4. Get Client ID and Secret
5. Configure webhook URLs (optional)
```

#### Step 2: Update .env

```env
# Change environment
VENLY_ENV=production

# Update credentials
VENLY_CLIENT_ID=your_real_production_client_id
VENLY_CLIENT_SECRET=your_real_production_client_secret
```

#### Step 3: Update Token Addresses (if needed)

```env
# These are already correct for Polygon Mainnet
POLYGON_USDT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
POLYGON_USDC_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
```

#### Step 4: Restart API

```bash
pnpm run start:dev
```

#### Step 5: Users Get REAL Wallets

```
- New wallets = mainnet addresses
- NO automatic testnet assets
- Users must deposit REAL crypto
- Conversions create REAL Naira
```

---

## 🛠️ Part 5: Admin Dashboard - What Needs to Be Built

### Current State:

You have **TWO SEPARATE** crypto systems:

#### 🔴 OLD System: CryptoOrder (Buy/Sell Crypto Trading)

```
Database Tables:
- CryptoOrder (buy/sell orders)

Admin Endpoints (ALREADY EXIST):
- GET /admin/crypto/orders
- GET /admin/crypto/pending-review
- GET /admin/crypto/stats
- POST /admin/crypto/:orderId/approve
- POST /admin/crypto/:orderId/reject

Admin Dashboard Pages (ALREADY EXIST):
- Crypto orders list
- Pending review queue
- Order approval/rejection
```

#### 🟢 NEW System: Venly Wallet (Send/Receive/Convert)

```
Database Tables (NEW):
- venly_users
- crypto_balances
- crypto_transactions
- crypto_conversions
- exchange_rates
- crypto_prices

Admin Endpoints (NEED TO CREATE):
- ❌ Not created yet!

Admin Dashboard Pages (NEED TO CREATE):
- ❌ Not created yet!
```

### What Admin Features Are Needed for NEW Venly Wallet:

---

## 📊 Admin Requirements for Venly Wallet System

### 1. **Exchange Rate Management** ⚠️ CRITICAL

**Why**: Controls USD → NGN conversion rate for crypto-to-Naira

**Backend Endpoints Needed**:

```typescript
POST / admin / crypto - wallet / exchange - rate; // Set new rate
GET / admin / crypto - wallet / exchange - rate; // Get current rate
GET / admin / crypto - wallet / exchange - rate / history; // Rate history
```

**Dashboard UI Needed**:

```
┌─────────────────────────────────────┐
│ Exchange Rate Management            │
├─────────────────────────────────────┤
│ Current Rate: ₦1,650 per $1         │
│ Last Updated: 2 hours ago           │
│                                      │
│ Set New Rate:                       │
│ ┌──────────────┐                    │
│ │ 1650         │ [Update Rate]      │
│ └──────────────┘                    │
│                                      │
│ Rate History:                       │
│ Nov 27: ₦1,650 → ₦1,655 (+0.3%)    │
│ Nov 26: ₦1,645 → ₦1,650 (+0.3%)    │
└─────────────────────────────────────┘
```

**Implementation**:

```typescript
// API Endpoint
@Post('admin/crypto-wallet/exchange-rate')
@Roles(UserRole.SUPER_ADMIN)
async setExchangeRate(
  @Body() dto: { rate: number; source: string }
) {
  return this.exchangeRateService.setRate(dto.rate, dto.source);
}
```

---

### 2. **Crypto Wallet Overview** 📈

**Why**: Monitor all users' crypto wallets and balances

**Backend Endpoints Needed**:

```typescript
GET    /admin/crypto-wallet/wallets           // List all crypto wallets
GET    /admin/crypto-wallet/wallets/:userId   // Get user's wallet
GET    /admin/crypto-wallet/stats             // Overall statistics
```

**Dashboard UI Needed**:

```
┌─────────────────────────────────────────────────┐
│ Crypto Wallets Overview                         │
├─────────────────────────────────────────────────┤
│ Total Wallets: 1,234                            │
│ Total Value: $45,678 (₦75,367,470)             │
│                                                  │
│ Token Distribution:                             │
│ - USDT: $25,000 (54.7%)                        │
│ - USDC: $15,000 (32.8%)                        │
│ - MATIC: $5,678 (12.5%)                        │
│                                                  │
│ Search Users:                                   │
│ ┌──────────────────────────────┐               │
│ │ Search by email/wallet...    │ [Search]      │
│ └──────────────────────────────┘               │
│                                                  │
│ Recent Wallets:                                 │
│ ┌──────────────────────────────────────────┐   │
│ │ user@email.com                            │   │
│ │ 0x742d...bEb                              │   │
│ │ $125.50 | Created: 2 days ago            │   │
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Implementation**:

```typescript
// Controller
@Get('admin/crypto-wallet/wallets')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
async getAllWallets(
  @Query('page') page?: number,
  @Query('limit') limit?: number,
  @Query('search') search?: string,
) {
  return this.adminCryptoWalletService.getAllWallets({
    page: page || 1,
    limit: limit || 20,
    search,
  });
}

// Service
async getAllWallets(params) {
  const wallets = await this.prisma.wallet.findMany({
    where: {
      type: 'CRYPTO',
      ...(params.search && {
        user: {
          OR: [
            { email: { contains: params.search } },
            { walletAddress: { contains: params.search } },
          ],
        },
      }),
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      cryptoBalances: true,
    },
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  });

  // Calculate total values
  return {
    wallets: wallets.map(w => ({
      ...w,
      totalValue: w.cryptoBalances.reduce((sum, b) =>
        sum + parseFloat(b.usdValue), 0
      ),
    })),
    stats: {
      totalWallets: await this.prisma.wallet.count({ where: { type: 'CRYPTO' }}),
      // ... more stats
    },
  };
}
```

---

### 3. **Conversion Monitoring** 💱

**Why**: Track all crypto → Naira conversions, detect anomalies

**Backend Endpoints Needed**:

```typescript
GET    /admin/crypto-wallet/conversions         // List all conversions
GET    /admin/crypto-wallet/conversions/:id     // Conversion details
GET    /admin/crypto-wallet/conversion-stats    // Statistics
```

**Dashboard UI Needed**:

```
┌──────────────────────────────────────────────┐
│ Crypto Conversions                            │
├──────────────────────────────────────────────┤
│ Today: 45 conversions | $12,345 → ₦20,369M  │
│                                               │
│ Filters:                                      │
│ [All Tokens ▼] [All Status ▼] [Today ▼]     │
│                                               │
│ Recent Conversions:                           │
│ ┌────────────────────────────────────────┐   │
│ │ user@email.com                          │   │
│ │ 100 USDT → ₦165,000 (fee: ₦1,650)     │   │
│ │ Status: Completed | 5 mins ago         │   │
│ │ [View Details]                          │   │
│ ├────────────────────────────────────────┤   │
│ │ another@email.com                       │   │
│ │ 50 USDC → ₦82,500 (fee: ₦825)         │   │
│ │ Status: Completed | 10 mins ago        │   │
│ │ [View Details]                          │   │
│ └────────────────────────────────────────┘   │
│                                               │
│ Suspicious Activity Alerts:                   │
│ ⚠️ Large conversion: $10,000 USDT            │
│ ⚠️ Multiple conversions from same IP         │
└──────────────────────────────────────────────┘
```

**Implementation**:

```typescript
// Controller
@Get('admin/crypto-wallet/conversions')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
async getConversions(
  @Query('page') page?: number,
  @Query('status') status?: string,
  @Query('tokenSymbol') tokenSymbol?: string,
) {
  return this.adminCryptoWalletService.getConversions({
    page: page || 1,
    limit: 20,
    status,
    tokenSymbol,
  });
}

// Service
async getConversions(params) {
  const conversions = await this.prisma.cryptoConversion.findMany({
    where: {
      ...(params.status && { status: params.status }),
      ...(params.tokenSymbol && { tokenSymbol: params.tokenSymbol }),
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  });

  return {
    conversions,
    stats: {
      totalToday: await this.getTodayConversionsCount(),
      totalVolumeToday: await this.getTodayConversionsVolume(),
    },
  };
}
```

---

### 4. **Transaction Monitoring** 🔍

**Why**: Monitor all crypto sends/receives, detect fraud

**Backend Endpoints Needed**:

```typescript
GET    /admin/crypto-wallet/transactions       // List all transactions
GET    /admin/crypto-wallet/transactions/:id   // Transaction details
POST   /admin/crypto-wallet/transactions/:id/flag  // Flag suspicious
```

**Dashboard UI Needed**:

```
┌──────────────────────────────────────────────┐
│ Crypto Transactions                           │
├──────────────────────────────────────────────┤
│ Last 24h: 234 txns | $45,678 volume          │
│                                               │
│ Filters:                                      │
│ [All Types ▼] [All Status ▼] [All Tokens ▼] │
│                                               │
│ Transactions:                                 │
│ ┌────────────────────────────────────────┐   │
│ │ SEND | user@email.com                   │   │
│ │ 10 USDT to 0x742d...bEb                │   │
│ │ Status: Completed ✅                    │   │
│ │ Hash: 0xabcd...1234                     │   │
│ │ [View on PolygonScan] [Flag]           │   │
│ ├────────────────────────────────────────┤   │
│ │ RECEIVE | another@email.com             │   │
│ │ 5 USDC from 0x8934...cdef              │   │
│ │ Status: Pending ⏳ (12 confirmations)   │   │
│ │ [View Details]                          │   │
│ └────────────────────────────────────────┘   │
│                                               │
│ Flagged Transactions: 3                      │
│ [View Flagged Items]                          │
└──────────────────────────────────────────────┘
```

---

### 5. **Analytics Dashboard** 📊

**Why**: Visualize crypto wallet adoption and usage

**Backend Endpoints Needed**:

```typescript
GET / admin / crypto - wallet / analytics / adoption; // Wallet creation over time
GET / admin / crypto - wallet / analytics / volume; // Transaction volume
GET / admin / crypto - wallet / analytics / tokens; // Token distribution
```

**Dashboard UI Needed**:

```
┌──────────────────────────────────────────────┐
│ Crypto Wallet Analytics                       │
├──────────────────────────────────────────────┤
│ Wallet Adoption (Last 30 Days)               │
│ ┌──────────────────────────────────────┐     │
│ │      Chart showing wallet creation    │     │
│ │         over time                     │     │
│ └──────────────────────────────────────┘     │
│                                               │
│ Transaction Volume by Token                   │
│ ┌──────────────────────────────────────┐     │
│ │   USDT: ████████████ 60%             │     │
│ │   USDC: ██████ 30%                   │     │
│ │   MATIC: ██ 10%                      │     │
│ └──────────────────────────────────────┘     │
│                                               │
│ Top Users by Volume:                          │
│ 1. user1@email.com - $15,000                 │
│ 2. user2@email.com - $12,500                 │
│ 3. user3@email.com - $10,000                 │
└──────────────────────────────────────────────┘
```

---

## 🔑 Key Differences: OLD vs NEW Crypto Systems

### OLD CryptoOrder System (Buy/Sell Trading)

```
Purpose: Users buy/sell crypto for Naira
Flow: User places order → Admin approves → Funds transferred
Tables: CryptoOrder
Admin Role: Manual approval of orders
Status: Already implemented ✅
```

### NEW Venly Wallet System (Self-Custody Wallet)

```
Purpose: Users have their own wallet, send/receive/convert
Flow: Automated blockchain transactions via Venly API
Tables: venly_users, crypto_balances, crypto_transactions, crypto_conversions
Admin Role: Monitor activity, set rates, detect fraud
Status: Backend ✅ | Mobile ✅ | Admin Dashboard ❌
```

### They Co-Exist!

```
┌─────────────────────────────────────┐
│ User Dashboard                       │
├─────────────────────────────────────┤
│ OLD: "Buy/Sell Crypto"              │
│  - Place buy/sell orders            │
│  - Wait for admin approval          │
│                                      │
│ NEW: "Crypto Wallet"                │
│  - Your own blockchain wallet       │
│  - Instant send/receive/convert     │
│  - No admin approval needed         │
└─────────────────────────────────────┘
```

---

## ✅ Summary Checklist

### Backend API Setup:

- [ ] Add crypto env variables to `.env`
- [ ] Generate encryption key with `openssl rand -hex 32`
- [ ] Restart API server
- [ ] Verify crypto endpoints work

### Mobile App:

- [ ] Install QR code dependencies
- [ ] Implement screens from guide
- [ ] Test wallet creation flow
- [ ] Test send/receive with testnet

### Admin Dashboard (TODO):

- [ ] Create exchange rate management page
- [ ] Create wallet overview page
- [ ] Create conversion monitoring page
- [ ] Create transaction monitoring page
- [ ] Create analytics dashboard
- [ ] Build API endpoints for above features

### Production Migration (Later):

- [ ] Get Venly production credentials
- [ ] Update .env to production
- [ ] Test with small real amounts
- [ ] Deploy to users

---

## 📞 Support & Resources

**Venly Documentation**: https://docs.venly.io
**Venly Portal**: https://portal.venly.io
**Polygon Faucet**: https://faucet.polygon.technology
**Backend Docs**: `/Users/joseph/Desktop/raverpay/CRYPTO_BACKEND_COMPLETE.md`
**Mobile Guide**: `/Users/joseph/Desktop/raverpay/CRYPTO_WALLET_MOBILE_IMPLEMENTATION_GUIDE.md`

---

_Ready to use with testnet! Switch to production when needed._
