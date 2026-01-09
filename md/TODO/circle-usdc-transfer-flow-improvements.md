# Circle USDC Transfer Flow - Implementation TODO

**Created:** 2025-01-09  
**Updated:** 2025-01-09  
**Status:** Planning  
**Priority:** High  

This document outlines the missing implementations and improvements needed for the Circle USDC transfer flow with gas sponsorship.

---

## Table of Contents

1. [Critical: Company Treasury Wallets](#1-critical-company-treasury-wallets)
2. [Network Configuration & DTO Architecture](#2-network-configuration--dto-architecture)
3. [Gas Fee Display - Testnet vs Mainnet](#3-gas-fee-display---testnet-vs-mainnet)
4. [Admin Dashboard Enhancements](#4-admin-dashboard-enhancements)
5. [Mobile App Fee Level Fix](#5-mobile-app-fee-level-fix)
6. [Analytics & Billing](#6-analytics--billing)
7. [Testing & Verification](#7-testing--verification)
8. [Mobile App UX Issues](#8-mobile-app-ux-issues)
9. [CoinGecko Price Integration & Portfolio Display](#9-coingecko-price-integration--portfolio-display)

---

## 1. Critical: Company Treasury Wallets

**Priority:** 🔴 CRITICAL  
**Status:** ⏳ Not Started  
**Impact:** Fee collection will fail without this

### Problem
Collection wallet addresses are empty strings in the default configuration. Without valid company wallet addresses, fee collection will fail.

### Current State
```typescript
// File: /apps/raverpay-api/src/circle/fees/fee-configuration.service.ts
collectionWallets: {
  'BASE-MAINNET': '',  // ❌ Empty
  'OP-MAINNET': '',
  'ARB-MAINNET': '',
  'MATIC-POLYGON': '',
  'BASE-SEPOLIA': '',
  'OP-SEPOLIA': '',
  'ARB-SEPOLIA': '',
  'MATIC-AMOY': '',
}
```

### Tasks

- [ ] **1.1** Create company treasury wallets on Circle Developer Console for each supported network
  - [ ] BASE-SEPOLIA (testnet)
  - [ ] OP-SEPOLIA (testnet)
  - [ ] ARB-SEPOLIA (testnet)
  - [ ] MATIC-AMOY (testnet)
  - [ ] BASE (mainnet)
  - [ ] OP (mainnet)
  - [ ] ARB (mainnet)
  - [ ] MATIC (mainnet)

- [ ] **1.2** Update the `CIRCLE_FEE_CONFIG` in the `system_config` database table with the actual wallet addresses

- [ ] **1.3** Add validation on app startup to warn if collection wallets are not configured

### Files to Modify
- `/apps/raverpay-api/src/circle/fees/fee-configuration.service.ts`
- Database: `system_config` table

---

## 2. Network Configuration & DTO Architecture

**Priority:** 🟡 Medium  
**Status:** ⏳ Not Started  
**Impact:** Proper architecture, future-proofing

### ⚠️ Key Architectural Decision

**DTOs should include ALL Circle-supported networks, NOT just enabled ones.**

### Why?
DTOs are for **input validation** (is this a valid Circle network?), NOT for **business logic** (is this network enabled?).

If we restrict DTOs to only enabled networks:
1. Admin enables a new network via dashboard
2. User tries to use that network
3. ❌ API throws DTO validation error BEFORE business logic runs
4. Bad UX - error comes from wrong layer

### Correct Architecture
```
Layer 1: DTO Validation
├── Accept ALL valid Circle networks (ETH, MATIC, ARB, BASE, OP, AVAX, SOL, etc.)
├── Reject invalid network names (typos, unsupported)
└── Pass valid input to next layer

Layer 2: Business Logic (Service Layer)
├── Check if network is ENABLED in our config (database)
├── Return friendly error: "This network is currently disabled"
└── Proceed if enabled
```

### All Circle-Supported Networks (for DTOs)

**Mainnet:**
- ETH, MATIC, ARB, BASE, OP, AVAX, SOL

**Testnet:**
- ETH-SEPOLIA, MATIC-AMOY, ARB-SEPOLIA, BASE-SEPOLIA, OP-SEPOLIA, AVAX-FUJI, SOL-DEVNET

### Tasks

- [ ] **2.1** Update DTOs to include ALL Circle-supported networks
  - File: `/apps/raverpay-api/src/circle/dto/index.ts`
  - Include both mainnet and testnet variants
  ```typescript
  enum: [
    // Mainnet
    'ETH', 'MATIC', 'ARB', 'BASE', 'OP', 'AVAX', 'SOL',
    // Testnet
    'ETH-SEPOLIA', 'MATIC-AMOY', 'ARB-SEPOLIA', 'BASE-SEPOLIA', 
    'OP-SEPOLIA', 'AVAX-FUJI', 'SOL-DEVNET'
  ]
  ```

- [ ] **2.2** Update circle.types.ts `CircleBlockchain` type
  - File: `/apps/raverpay-api/src/circle/circle.types.ts`
  - Include all networks in union type

- [ ] **2.3** Add network enabled check in service layer
  - Before processing wallet creation or transfers
  - Check against database/config for enabled status
  - Return clear error: "Network X is not currently enabled"

- [ ] **2.4** Ensure Paymaster and CCTP services have mappings for all networks
  - Even if a network is disabled, having the mapping prevents code errors
  - The enabled check happens before these services are called

### Files to Modify
- `/apps/raverpay-api/src/circle/dto/index.ts`
- `/apps/raverpay-api/src/circle/circle.types.ts`
- `/apps/raverpay-api/src/circle/wallets/circle-wallet.service.ts` (add enabled check)
- `/apps/raverpay-api/src/circle/transactions/circle-transaction.service.ts` (add enabled check)

---

## 3. Gas Fee Display - Testnet vs Mainnet

**Priority:** 🔴 HIGH  
**Status:** ⏳ Not Started  
**Impact:** Accurate cost display, revenue planning

### Problem
Current code shows ALL networks as "Free (Sponsored)" regardless of environment. This is:
- ✅ **Correct for testnet** - Circle provides free gas for development
- ❌ **Incorrect for mainnet** - Circle bills you monthly for gas consumed

### Current State
```typescript
// File: /apps/raverpay-api/src/circle/config/circle.config.service.ts
{
  blockchain: isTestnet ? 'BASE-SEPOLIA' : 'BASE',
  feeLabel: 'Free (Sponsored)',  // ❌ Wrong for mainnet!
  estimatedCost: '$0.00',        // ❌ Wrong for mainnet!
}
```

### Mainnet Reality
On mainnet with Gas Station:
1. Circle **sponsors** the gas (user doesn't need native tokens)
2. Circle **bills you** monthly for the gas consumed
3. You should factor this into your service fee OR display estimated gas costs

### Recommended Fee Labels

| Environment | Network | Fee Label | Estimated Cost |
|-------------|---------|-----------|----------------|
| Testnet | BASE-SEPOLIA | "Free (Testnet)" | $0.00 |
| Testnet | OP-SEPOLIA | "Free (Testnet)" | $0.00 |
| Testnet | ARB-SEPOLIA | "Free (Testnet)" | $0.00 |
| Testnet | MATIC-AMOY | "Free (Testnet)" | $0.00 |
| **Mainnet** | BASE | "Gas Sponsored" | ~$0.001-$0.01 |
| **Mainnet** | OP | "Gas Sponsored" | ~$0.001-$0.01 |
| **Mainnet** | ARB | "Gas Sponsored" | ~$0.01-$0.05 |
| **Mainnet** | MATIC | "Gas Sponsored" | ~$0.001-$0.01 |

### Tasks

- [ ] **3.1** Update `getChainMetadata()` to differentiate testnet vs mainnet
  ```typescript
  {
    blockchain: isTestnet ? 'BASE-SEPOLIA' : 'BASE',
    feeLabel: isTestnet ? 'Free (Testnet)' : 'Gas Sponsored',
    estimatedCost: isTestnet ? '$0.00' : '~$0.01',
    description: isTestnet 
      ? 'Testnet - no real costs'
      : 'Gas fees billed to platform, included in service fee',
  }
  ```

- [ ] **3.2** Add gas cost estimates per network for mainnet
  - Base estimated gas costs on Circle's documentation or actual usage data
  - Update monthly as gas prices change

- [ ] **3.3** Update mobile app UI to show appropriate messaging
  - Testnet: "Free (Testnet)"
  - Mainnet: "Gas Included" or "~$0.01 gas (included)"

- [ ] **3.4** Consider gas cost in service fee calculation
  - Option A: Fixed service fee absorbs gas costs (current: 0.5%)
  - Option B: Dynamic fee = gas estimate + fixed margin
  - Option C: Show gas separately from service fee

- [ ] **3.5** Update documentation notes
  - Remove "All gas fees are currently sponsored (Free)"
  - Add accurate explanation of testnet vs mainnet costs

### Files to Modify
- `/apps/raverpay-api/src/circle/config/circle.config.service.ts`
- `/apps/raverpay-mobile/app/circle/send.tsx` (UI messaging)

---

## 4. Admin Dashboard Enhancements

**Priority:** 🟡 Medium  
**Status:** ⏳ Not Started  
**Impact:** Admin UX, operational control

### 4.1 Collection Wallet Address Editing

**Problem:** Admin can view collection wallets but cannot edit them in the UI.

**Current State:**
- Fee config page shows wallets as read-only
- API already supports updating `collectionWallets` via `PUT /circle/fees/config`

#### Tasks

- [ ] **4.1.1** Add editable input fields for each collection wallet address
  - File: `/apps/raverpay-admin/app/dashboard/circle-wallets/fee-config/page.tsx`
  
- [ ] **4.1.2** Add validation for wallet addresses (valid Ethereum address format)

- [ ] **4.1.3** Add confirmation modal before saving wallet address changes

### 4.2 Blockchain Activation/Deactivation

**Problem:** Supported blockchains are hardcoded. Admins cannot enable/disable networks.

**Current State:**
- Networks are defined in `getSupportedBlockchains()` method
- No database-backed configuration

#### Tasks

- [ ] **4.2.1** Create database model for blockchain configuration
  ```prisma
  model BlockchainConfig {
    id              String   @id @default(uuid())
    blockchain      String   @unique  // e.g., "BASE-SEPOLIA", "MATIC"
    name            String             // e.g., "Base Sepolia", "Polygon"
    symbol          String             // e.g., "ETH", "MATIC"
    isEnabled       Boolean  @default(false)  // Admin can toggle
    isTestnet       Boolean  @default(false)
    feeLabel        String?            // e.g., "Free (Testnet)", "Gas Sponsored"
    estimatedCost   String?            // e.g., "$0.00", "~$0.01"
    description     String?
    isRecommended   Boolean  @default(false)
    displayOrder    Int      @default(0)
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
    
    @@map("blockchain_configs")
  }
  ```

- [ ] **4.2.2** Create BlockchainConfigService to manage configurations
  - Seed initial data on first run
  - Cache configs in memory with TTL
  - Provide `getEnabledBlockchains()` method

- [ ] **4.2.3** Migrate `getSupportedBlockchains()` to use BlockchainConfigService
  - Read from database instead of hardcoded array
  - Fall back to defaults if database is empty

- [ ] **4.2.4** Add admin API endpoints:
  - `GET /admin/circle/blockchains` - List all blockchain configs
  - `PUT /admin/circle/blockchains/:blockchain` - Update config
  - `POST /admin/circle/blockchains/:blockchain/enable` - Enable
  - `POST /admin/circle/blockchains/:blockchain/disable` - Disable

- [ ] **4.2.5** Create admin UI page for blockchain management
  - File: `/apps/raverpay-admin/app/dashboard/circle-wallets/settings/blockchains/page.tsx`
  - Toggle switches for enable/disable
  - Reorder capability (drag & drop)
  - Edit fee labels and descriptions
  - "Recommended" badge toggle

### Files to Create/Modify
- `/apps/raverpay-api/prisma/schema.prisma` - Add new model
- `/apps/raverpay-api/src/circle/config/blockchain-config.service.ts` - New service
- `/apps/raverpay-api/src/admin/circle/admin-circle.controller.ts` - Add endpoints
- `/apps/raverpay-admin/app/dashboard/circle-wallets/fee-config/page.tsx` - Add wallet inputs
- `/apps/raverpay-admin/app/dashboard/circle-wallets/settings/blockchains/page.tsx` - New page

---

## 5. Mobile App Fee Level Fix

**Priority:** 🟡 Medium  
**Status:** ⏳ Not Started  
**Impact:** UX, accurate fee estimation

### Problem
When user toggles fee level (LOW/MEDIUM/HIGH), the estimated gas fee is NOT recalculated.

### Current State
```typescript
// File: /apps/raverpay-mobile/app/circle/send.tsx (lines 167-202)
useEffect(() => {
  const estimate = async () => {
    // ... estimation logic
    const result = await estimateFee({
      walletId: selectedWallet.id,
      destinationAddress,
      amount,
      blockchain: selectedWallet.blockchain,
      // ❌ feeLevel is NOT passed!
    });
  };
  estimate();
}, [amount, destinationAddress, selectedWallet, addressValid, estimateFee, chainsData]);
// ❌ feeLevel is NOT in dependency array!
```

### Tasks

- [ ] **5.1** Add `feeLevel` to the estimation API call
  ```typescript
  const result = await estimateFee({
    walletId: selectedWallet.id,
    destinationAddress,
    amount,
    blockchain: selectedWallet.blockchain,
    feeLevel,  // Add this
  });
  ```

- [ ] **5.2** Add `feeLevel` to the `useEffect` dependency array
  ```typescript
  }, [amount, destinationAddress, selectedWallet, addressValid, estimateFee, chainsData, feeLevel]);
  ```

- [ ] **5.3** Update the `EstimateFeeDto` to accept `feeLevel` parameter (if not already)
  - File: `/apps/raverpay-api/src/circle/dto/index.ts`

- [ ] **5.4** Update `estimateFee` service method to use `feeLevel`
  - File: `/apps/raverpay-api/src/circle/transactions/circle-transaction.service.ts`

- [ ] **5.5** Update the mobile hook `useEstimateFee` to pass `feeLevel`
  - File: `/apps/raverpay-mobile/src/hooks/useCircleWallet.ts`

### Note on Sponsored Chains
Even with sponsored gas, fee level affects:
1. Transaction speed (confirmation time)
2. Paymaster fee estimates (if using USDC for gas)
3. Future non-sponsored networks

### Files to Modify
- `/apps/raverpay-mobile/app/circle/send.tsx`
- `/apps/raverpay-mobile/src/hooks/useCircleWallet.ts`
- `/apps/raverpay-api/src/circle/dto/index.ts` (if needed)
- `/apps/raverpay-api/src/circle/transactions/circle-transaction.service.ts` (if needed)

---

## 6. Analytics & Billing

**Priority:** 🟢 Low  
**Status:** ⏳ Not Started  
**Impact:** Business operations, reporting

### Problem
No comprehensive analytics for tracking fee collection, gas costs, and profit margins.

### Current State
- Basic retry queue stats available via `GET /circle/fees/stats`
- No aggregated analytics
- No Circle invoice reconciliation

### Tasks

- [ ] **6.1** Create fee analytics aggregation queries
  - Total fees collected per day/week/month
  - Fees by blockchain
  - Average fee per transaction
  - Fee collection success rate

- [ ] **6.2** Create analytics dashboard page
  - File: `/apps/raverpay-admin/app/dashboard/circle-wallets/analytics/page.tsx`
  - Charts for fee collection trends
  - Comparison by network

- [ ] **6.3** Add estimated vs actual gas tracking
  - Track `estimatedGasUsdc` vs `actualGasUsdc` in PaymasterUserOperation
  - Calculate profit margins

- [ ] **6.4** Create export functionality
  - Export fee collection data to CSV
  - Monthly reports for accounting

- [ ] **6.5** Add Circle invoice reconciliation (future)
  - Track Circle's monthly invoices
  - Compare with collected fees
  - Alert on discrepancies

### Files to Create
- `/apps/raverpay-api/src/admin/circle/circle-analytics.service.ts`
- `/apps/raverpay-admin/app/dashboard/circle-wallets/analytics/page.tsx`

---

## 7. Testing & Verification

**Priority:** 🟡 Medium  
**Status:** ⏳ Not Started  
**Impact:** Reliability, confidence before mainnet

### Tasks

- [ ] **7.1** Verify Gas Station policies are active in Circle Developer Console
  - [ ] BASE-SEPOLIA
  - [ ] OP-SEPOLIA
  - [ ] ARB-SEPOLIA
  - [ ] MATIC-AMOY

- [ ] **7.2** End-to-end test: Complete transfer flow on testnet
  - [ ] Create a transfer of X USDC
  - [ ] Verify two transactions are created (main + fee)
  - [ ] Verify gas is sponsored (no native token needed)
  - [ ] Verify webhooks are received and processed
  - [ ] Verify database is updated correctly
  - [ ] Verify user receives notification

- [ ] **7.3** Test fee collection failure scenarios
  - [ ] What happens if fee transfer fails but main transfer succeeds?
  - [ ] Verify retry mechanism works
  - [ ] Verify admin notification on final failure

- [ ] **7.4** Test balance validation
  - [ ] User with exact amount + fee can transfer
  - [ ] User with insufficient balance gets clear error

- [ ] **7.5** Test disabled network handling
  - [ ] Try to create wallet on disabled network
  - [ ] Verify friendly error message (not DTO validation error)

- [ ] **7.6** Create automated smoke tests for CI/CD
  - File: `/apps/raverpay-api/test/circle/transfer-flow.e2e-spec.ts`

---

## 8. Mobile App UX Issues

**Priority:** 🟡 Medium  
**Status:** ⏳ Not Started  
**Impact:** User Experience, data accuracy

### 8.1 Wallet Setup Screen - Filter Existing Wallets

**Problem:** The wallet setup screen (`setup.tsx`) shows ALL supported networks, even networks where the user already has a wallet created.

**Current Behavior:**
- User creates a wallet on BASE-SEPOLIA
- Goes back to setup screen
- BASE-SEPOLIA still shows as an option to create
- User might accidentally try to create duplicate wallet

**Expected Behavior:**
- Fetch user's existing wallets
- Filter out networks where wallet already exists
- Only show networks where user doesn't have a wallet yet
- Show message if all networks already have wallets

#### Tasks

- [ ] **8.1.1** Fetch existing wallets in setup screen
  ```typescript
  // In setup.tsx
  const { data: existingWallets } = useCircleWallets();
  ```

- [ ] **8.1.2** Filter out already-created networks from BlockchainSelector
  ```typescript
  const existingBlockchains = existingWallets?.map(w => w.blockchain) || [];
  const availableChains = chainsData?.chains?.filter(
    chain => !existingBlockchains.includes(chain.blockchain)
  );
  ```

- [ ] **8.1.3** Show appropriate UI when all networks have wallets
  - Display: "You already have wallets on all supported networks"
  - Provide link to view existing wallets

- [ ] **8.1.4** Update BlockchainSelector component to accept `excludeChains` prop
  - File: `/apps/raverpay-mobile/src/components/circle/BlockchainSelector.tsx`

### 8.2 Display Native Token Balances (Enhancement)

**Priority:** 🟢 Low  
**Status:** ⏳ Not Started  
**Impact:** UX, transparency

**Current Behavior:**
The mobile app only displays USDC balance, even though the API returns all token balances.

**API Response (returns ALL tokens):**
```json
{
  "balances": [
    { "token": { "symbol": "ETH-SEPOLIA", "isNative": true }, "amount": "0.01" },
    { "token": { "symbol": "USDC", "isNative": false }, "amount": "2" }
  ]
}
```

**Mobile App (only shows USDC):**
```typescript
// circle.store.ts - Only extracts USDC
getUsdcBalance: (walletId) => {
  const usdcBalance = walletBalances.find((b) => b.token?.symbol === 'USDC');
  return usdcBalance?.amount || '0';  // ❌ Ignores native tokens
},
```

**Why This Matters:**
1. Users may have native tokens (ETH, MATIC) from faucets or other sources
2. Transparency - users want to see all their assets
3. Some networks may require native tokens for gas (non-sponsored)

#### Options

**Option A: Keep USDC-Only (Current)**
- App is marketed as "USDC Wallet"
- Simpler UI, less confusion

**Option B: Show All Tokens in Wallet Details**
- Primary display: USDC balance prominently
- Secondary: Collapsible "Other Assets" section

**Option C: Show Total Portfolio Value**
- Calculate USD value of all tokens
- Display: "Total: $X.XX" with breakdown on tap

#### Tasks (If implementing Option B)

- [ ] **8.2.1** Add `getNativeBalance()` helper to circle.store.ts
  ```typescript
  getNativeBalance: (walletId) => {
    const walletBalances = get().balances[walletId] || [];
    const nativeBalance = walletBalances.find((b) => b.token?.isNative === true);
    return nativeBalance ? { symbol: nativeBalance.token.symbol, amount: nativeBalance.amount } : null;
  },
  ```

- [ ] **8.2.2** Update wallet UI to show native token balance
  - Add collapsible "Other Assets" section
  - Show native token with proper formatting

- [ ] **8.2.3** Consider adding token icons for visual distinction
  - ETH icon, MATIC icon, etc.

### Files to Modify

- `/apps/raverpay-mobile/app/circle/setup.tsx`
- `/apps/raverpay-mobile/src/components/circle/BlockchainSelector.tsx`
- `/apps/raverpay-mobile/src/store/circle.store.ts` (for native token display)
- `/apps/raverpay-mobile/app/(tabs)/circle-wallet.tsx` (for UI updates)


---

## 9. CoinGecko Price Integration & Portfolio Display

**Priority:** 🟡 Medium  
**Status:** ⏳ Not Started  
**Impact:** Accurate USD values, portfolio display, production-ready

### Background

CoinGecko integration was previously implemented but is currently **commented out** in the codebase. This needs to be re-enabled to show accurate USD values for all tokens.

### Current State (Disabled)

```typescript
// File: /apps/raverpay-api/src/crypto/services/price.service.ts
async updateAllPrices() {
  // CoinGecko price fetching disabled
  this.logger.warn('CoinGecko price fetching is disabled');
  return;  // ❌ Does nothing!
}
```

**Fallback Currently:** USDC/USDT hardcoded to $1.00, no native token prices.

### Desired State

Use mainnet prices for ALL tokens (including testnet), so the same code works seamlessly when moving to mainnet.

| Token | CoinGecko ID | Use For |
|-------|--------------|---------|  
| **USDC** | `usd-coin` | All USDC on any chain |
| **ETH** | `ethereum` | Native token on Base, Arbitrum, Optimism, ETH-Sepolia |
| **POL** | `polygon-ecosystem-token` | Native token on Polygon, MATIC-AMOY |
| **MATIC** | `matic-network` | Fallback for POL |

### Price Mapping for Testnet

| Testnet Token | Use Mainnet Price |
|---------------|-------------------|
| ETH-SEPOLIA | ETH |
| USDC on BASE-SEPOLIA | USDC |
| Tokens on MATIC-AMOY | POL |
| Tokens on OP-SEPOLIA | ETH |
| Tokens on ARB-SEPOLIA | ETH |

### Portfolio Display Design

```
┌─────────────────────────────────────────────────┐
│                                                 │
│           Total Assets                          │
│             $184.47                             │  ← All tokens in USD
│                                                 │
│   USDC:                                         │
│   • Base:     50.00 USDC    ($49.99)           │
│   • Polygon:  75.00 USDC    ($75.23)           │
│   • Arbitrum: 27.50 USDC    ($27.25)           │
│                                                 │
│   ▼ Native Tokens:                              │
│   • 0.01 ETH (Base)         ($32.00)           │
│   • 0.005 POL (Polygon)     ($2.25)            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Caching Strategy

| Setting | Value | Reason |
|---------|-------|--------|
| **Fetch Frequency** | Every 5 minutes | Balance accuracy vs rate limits |
| **Cache TTL** | 10 minutes | Use cached price if fetch fails |
| **Fallback (USDC)** | $1.00 | If CoinGecko down, assume peg |
| **Fallback (ETH/POL)** | Last cached | Use last known price |
| **API Tier** | Free | 10-30 calls/min (sufficient) |

### Tasks

#### Backend (API)

- [ ] **9.1.1** Re-enable CoinGecko cron job
  - File: `/apps/raverpay-api/src/crypto/cron/price-update.cron.ts`
  - Uncomment the cron decorator and job logic
  - Set to run every 5 minutes

- [ ] **9.1.2** Update PriceService to fetch all needed tokens
  - File: `/apps/raverpay-api/src/crypto/services/price.service.ts`
  - Uncomment `updateAllPrices()` implementation
  - Add ETH to TOKEN_IDS: `ETH: 'ethereum'`
  - Ensure POL fallback logic works

- [ ] **9.1.3** Re-enable PriceService in CryptoModule
  - File: `/apps/raverpay-api/src/crypto/crypto.module.ts`
  - Uncomment PriceService provider and export

- [ ] **9.1.4** Create price API endpoint for mobile app
  ```typescript
  GET /api/prices
  Response: {
    prices: {
      USDC: 0.9998,
      ETH: 3245.50,
      POL: 0.45
    },
    updatedAt: "2025-01-09T12:00:00Z"
  }
  ```

- [ ] **9.1.5** Add price caching with Redis (optional)
  - Cache prices in Redis for faster access
  - TTL: 10 minutes

#### Mobile App

- [ ] **9.2.1** Create price service hook
  - File: `/apps/raverpay-mobile/src/hooks/usePrices.ts`
  ```typescript
  export const usePrices = () => {
    return useQuery({
      queryKey: ['crypto-prices'],
      queryFn: () => api.getPrices(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchInterval: 1000 * 60 * 5,
    });
  };
  ```

- [ ] **9.2.2** Add prices to Circle store
  - File: `/apps/raverpay-mobile/src/store/circle.store.ts`
  ```typescript
  interface CircleState {
    // ... existing
    prices: Record<string, number>;  // { USDC: 0.9998, ETH: 3245.50 }
    setPrices: (prices: Record<string, number>) => void;
    getTokenValueUsd: (symbol: string, amount: number) => number;
    getTotalPortfolioValue: () => number;  // All tokens in USD
  }
  ```

- [ ] **9.2.3** Update wallet screen to show USD values
  - File: `/apps/raverpay-mobile/app/(tabs)/circle-wallet.tsx`
  - Show total portfolio value (all wallets, all tokens)
  - Show per-wallet breakdown with USD values
  - Show native token balances with USD values

- [ ] **9.2.4** Add token symbol to price mapping
  ```typescript
  const TOKEN_PRICE_MAP = {
    'USDC': 'USDC',
    'ETH': 'ETH',
    'ETH-SEPOLIA': 'ETH',  // Testnet uses mainnet price
    'POL': 'POL',
    'MATIC': 'POL',
  };
  ```

- [ ] **9.2.5** Handle price loading/error states
  - Show skeleton while loading
  - Show last cached price if fetch fails
  - Indicate if price is stale (>10 min old)

### Files to Modify

**Backend:**
- `/apps/raverpay-api/src/crypto/cron/price-update.cron.ts`
- `/apps/raverpay-api/src/crypto/services/price.service.ts`
- `/apps/raverpay-api/src/crypto/crypto.module.ts`
- `/apps/raverpay-api/src/crypto/crypto.controller.ts` (add endpoint)

**Mobile:**
- `/apps/raverpay-mobile/src/hooks/usePrices.ts` (new)
- `/apps/raverpay-mobile/src/store/circle.store.ts`
- `/apps/raverpay-mobile/app/(tabs)/circle-wallet.tsx`
- `/apps/raverpay-mobile/src/services/circle.service.ts` (add getPrices)

---


## Implementation Order

### Phase 1: Critical (Before Any Mainnet Activity)
1. 🔴 Company Treasury Wallets (Section 1)
2. 🔴 Gas Fee Display Fix (Section 3)
3. 🟡 Testing & Verification (Section 7)

### Phase 2: Architecture & Admin
4. 🟡 Network DTO Architecture (Section 2)
5. 🟡 Collection Wallet Editing (Section 4.1)
6. 🟡 Mobile App Fee Level Fix (Section 5)
7. 🟡 Mobile App UX Issues (Section 8) - Filter existing wallets from setup screen
8. 🟡 CoinGecko Price Integration (Section 9) - Re-enable prices, portfolio display

### Phase 3: Future Enhancements
9. ⏳ Blockchain Activation/Deactivation UI (Section 4.2)
10. ⏳ Analytics & Billing (Section 6)



---

## Quick Reference: Key Files

### Backend (API)
| File | Purpose |
|------|---------|
| `src/circle/config/circle.config.service.ts` | Chain configuration, metadata |
| `src/circle/fees/fee-configuration.service.ts` | Fee config, collection wallets |
| `src/circle/fees/fee-retry.service.ts` | Failed fee retry logic |
| `src/circle/transactions/circle-transaction.service.ts` | Transfer flow (2 transactions) |
| `src/circle/webhooks/circle-webhook.service.ts` | Webhook processing |
| `src/circle/circle.controller.ts` | API endpoints |
| `src/circle/dto/index.ts` | Request validation (DTOs) |
| `src/circle/circle.types.ts` | TypeScript types |
| `src/admin/circle/admin-circle.service.ts` | Admin operations |

### Mobile App
| File | Purpose |
|------|---------|
| `app/circle/send.tsx` | Transfer UI, fee level selection |
| `src/hooks/useCircleWallet.ts` | API hooks |
| `src/services/paymaster.service.ts` | Paymaster integration |

### Admin Dashboard
| File | Purpose |
|------|---------|
| `app/dashboard/circle-wallets/fee-config/page.tsx` | Fee configuration UI |
| `app/dashboard/circle-wallets/fee-collection/page.tsx` | Fee collection stats |
| `app/dashboard/circle-wallets/fee-retries/page.tsx` | Failed fee retries |

---

## Important Notes

### Gas Fee Realities
- **Testnet:** Gas is truly free (Circle doesn't bill)
- **Mainnet:** Gas is sponsored (user doesn't pay native tokens) BUT Circle bills platform monthly

### Service Fee (Current)
- Fixed 0.5% of transfer amount
- Minimum fee: 0.0625 USDC (~₦100 at ₦1,600/$)
- Configurable via admin dashboard

### Transfer Flow
- Uses TWO separate Circle API transactions:
  1. Main transfer (User → Recipient)
  2. Fee transfer (User → Company Treasury Wallet)
- Failed fee collections retry up to 3 times automatically

### DTO vs Business Logic
- **DTOs:** Validate input format (is it a valid network name?)
- **Business Logic:** Check business rules (is network enabled?)
- Keep these concerns separated for flexibility

---

**Last Updated:** 2025-01-09  
**Author:** System Review
