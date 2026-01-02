# Admin Dashboard - Fee Management Implementation Plan

## Current Status ❌

**MISSING**: No fee management interface in the admin dashboard yet!

The admin dashboard currently has:

- ✅ Circle Wallets page (`/dashboard/circle-wallets`)
- ✅ Circle Transactions page
- ✅ CCTP Transfers page
- ✅ User management
- ✅ Analytics
- ✅ Withdrawal configuration
- ❌ **NO Fee Configuration page**
- ❌ **NO Fee Collection Wallet overview**
- ❌ **NO Fee Statistics/Analytics**

## What We Need to Add 🎯

### 1. Fee Configuration Page

**Location**: `/dashboard/circle-wallets/fee-config`

**Features needed:**

- ✅ View current fee configuration
  - Fee percentage (currently 0.5%)
  - Minimum fee in USDC (currently 0.0625)
  - Enabled/Disabled status
- ✅ Update fee settings (admin only)
  - Input for percentage (0-100%)
  - Input for minimum fee (USDC)
  - Toggle to enable/disable fees
- ✅ Collection wallet configuration
  - Display current collection wallet address
  - Show balance per blockchain
  - Button to change collection wallet
  - List of all configured chains (BASE-SEPOLIA, OP-SEPOLIA, etc.)

**UI Mock:**

```
┌─────────────────────────────────────────────────┐
│ Fee Configuration                               │
├─────────────────────────────────────────────────┤
│ Status: [Enabled ✓] [Disabled]                 │
│                                                  │
│ Fee Percentage: [0.5] %                         │
│ Minimum Fee: [0.0625] USDC                      │
│                                                  │
│ [Calculate Example]                             │
│ • 100 USDC → Fee: 0.5 USDC → Total: 100.5      │
│ • 5 USDC → Fee: 0.0625 USDC (min) → Total: 5.06│
│                                                  │
│ [Save Changes]                                  │
└─────────────────────────────────────────────────┘
```

---

### 2. Fee Collection Wallet Overview

**Location**: `/dashboard/circle-wallets/fee-collection`

**Features needed:**

- ✅ Display collection wallet address
- ✅ Show balance breakdown by blockchain:
  ```
  BASE-SEPOLIA:    10.5 USDC
  OP-SEPOLIA:      5.2 USDC
  ARB-SEPOLIA:     3.8 USDC
  MATIC-AMOY:      2.1 USDC
  ────────────────────────
  Total:           21.6 USDC
  ```
- ✅ Quick actions:
  - Withdraw fees (transfer to external wallet)
  - Consolidate fees (move all to one chain using CCTP)
  - View transaction history
- ✅ Recent fee collections:
  - List of recent fee transfers
  - Amount, blockchain, timestamp
  - Link to transaction details

**UI Mock:**

```
┌─────────────────────────────────────────────────┐
│ Fee Collection Wallet                           │
├─────────────────────────────────────────────────┤
│ Address: 0x1234...5678 [Copy]                   │
│ Total Balance: 21.6 USDC                        │
│                                                  │
│ ┌─ Balance by Chain ─────────────────────────┐ │
│ │ 🔵 Base Sepolia      10.5 USDC    48.6%   │ │
│ │ 🔴 Optimism Sepolia   5.2 USDC    24.1%   │ │
│ │ 🟣 Arbitrum Sepolia   3.8 USDC    17.6%   │ │
│ │ 🟠 Polygon Amoy       2.1 USDC     9.7%   │ │
│ └───────────────────────────────────────────┘ │
│                                                  │
│ [Withdraw] [Consolidate to Base] [View History] │
└─────────────────────────────────────────────────┘
```

---

### 3. Fee Statistics & Analytics

**Location**: `/dashboard/analytics` (add new section) or `/dashboard/circle-wallets/fee-stats`

**Features needed:**

- ✅ Total fees collected (all time)
- ✅ Fees collected today/this week/this month
- ✅ Average fee per transaction
- ✅ Fee collection success rate
- ✅ Charts:
  - Fees over time (line chart)
  - Fees by blockchain (pie chart)
  - Failed vs successful fee collections
- ✅ Failed fee collections:
  - Count of pending retries
  - List of failed fees with retry status
  - Manual retry buttons

**UI Mock:**

```
┌─────────────────────────────────────────────────┐
│ Fee Collection Analytics                        │
├─────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐     │
│ │All Time   │ │This Month │ │Today      │     │
│ │1,234 USDC │ │  156 USDC │ │  12 USDC  │     │
│ └───────────┘ └───────────┘ └───────────┘     │
│                                                  │
│ Collection Success Rate: 98.5% ✓                │
│ Failed Collections: 3 (auto-retry in progress) │
│                                                  │
│ [View Failed Collections] [Download Report]     │
└─────────────────────────────────────────────────┘
```

---

### 4. Failed Fee Retry Management

**Location**: `/dashboard/circle-wallets/fee-retries`

**Features needed:**

- ✅ List of failed fee collections
- ✅ Retry status (attempt 1/3, 2/3, 3/3)
- ✅ Error messages
- ✅ Manual retry button
- ✅ Cancel retry button
- ✅ View related transaction

**Table columns:**

- Transaction ID
- Amount
- Blockchain
- Retry Attempts (1/3)
- Last Retry At
- Next Retry At
- Error Message
- Actions (Retry Now, Cancel, View)

---

### 5. Transaction Details Enhancement

**Location**: Existing transaction details pages

**Add to existing transaction detail view:**

- ✅ Service fee amount (if applicable)
- ✅ Fee collection status (✓ Collected / ⏳ Pending / ❌ Failed)
- ✅ Total amount (transfer + fee)
- ✅ Fee transaction ID (link to fee transfer)
- ✅ Collection wallet address

**Example:**

```
Transaction Details
─────────────────────
Amount Sent:     100 USDC
Service Fee:     0.5 USDC ✓ Collected
Network Fee:     0.002 USDC
Total Deducted:  100.502 USDC

Fee Collection:
  Status: ✓ Collected
  Wallet: 0x1234...5678
  TX ID: tx_abc123...
```

---

## API Endpoints Already Available ✅

Good news! The backend already has these endpoints:

1. **GET /circle/fees/config** - Get current fee configuration
2. **PUT /circle/fees/config** - Update fee configuration (admin)
3. **GET /circle/fees/calculate?amount=X** - Calculate fee for amount
4. **GET /circle/fees/stats** - Get fee collection statistics (admin)
5. **GET /circle/fees/failed** - List failed fee collections (admin)
6. **POST /circle/fees/retry/:retryId** - Manually retry failed fee (admin)

---

## Implementation Priority 🚀

### Phase 1: Essential (Do First) ⭐

1. **Fee Configuration Page** - Admins need to adjust fees
2. **Fee Collection Wallet Overview** - See collected fees and balances
3. **Failed Fee Retry Management** - Handle failed collections

### Phase 2: Analytics (Do Second) 📊

4. **Fee Statistics Dashboard** - Monitor fee collection performance
5. **Transaction Details Enhancement** - Show fee info in existing pages

### Phase 3: Advanced (Nice to Have) 🎨

6. **Fee withdrawal interface** - Transfer fees out of collection wallet
7. **Fee consolidation tool** - Move fees to one chain using CCTP
8. **Export/Reports** - Download fee collection reports (CSV/PDF)

---

## Files to Create

### 1. API Client for Fees

**File**: `apps/raverpay-admin/lib/api/fees.ts`

```typescript
import apiClient from '../api-client';

export interface FeeConfig {
  enabled: boolean;
  percentage: number;
  minFeeUsdc: number;
  collectionWallets: Record<string, string>;
}

export interface FeeStats {
  totalCollected: string;
  todayCollected: string;
  thisWeekCollected: string;
  thisMonthCollected: string;
  successRate: number;
  failedCount: number;
  pendingRetries: number;
}

export interface FailedFee {
  id: string;
  mainTransferId: string;
  userId: string;
  walletId: string;
  collectionWallet: string;
  fee: string;
  blockchain: string;
  retryCount: number;
  maxRetries: number;
  lastError: string;
  nextRetryAt: string;
  createdAt: string;
}

export const feesApi = {
  // Get fee configuration
  getConfig: async () => {
    const response = await apiClient.get('/circle/fees/config');
    return response.data as FeeConfig;
  },

  // Update fee configuration
  updateConfig: async (config: Partial<FeeConfig>) => {
    const response = await apiClient.put('/circle/fees/config', config);
    return response.data;
  },

  // Calculate fee for amount
  calculateFee: async (amount: number) => {
    const response = await apiClient.get(`/circle/fees/calculate?amount=${amount}`);
    return response.data as { amount: number; fee: number; total: number };
  },

  // Get fee statistics
  getStats: async () => {
    const response = await apiClient.get('/circle/fees/stats');
    return response.data as FeeStats;
  },

  // Get failed fee collections
  getFailedFees: async () => {
    const response = await apiClient.get('/circle/fees/failed');
    return response.data as FailedFee[];
  },

  // Manually retry failed fee
  retryFee: async (retryId: string) => {
    const response = await apiClient.post(`/circle/fees/retry/${retryId}`);
    return response.data;
  },
};
```

### 2. Fee Configuration Page

**File**: `apps/raverpay-admin/app/dashboard/circle-wallets/fee-config/page.tsx`

### 3. Fee Collection Wallet Page

**File**: `apps/raverpay-admin/app/dashboard/circle-wallets/fee-collection/page.tsx`

### 4. Fee Retries Page

**File**: `apps/raverpay-admin/app/dashboard/circle-wallets/fee-retries/page.tsx`

---

## Summary

**Currently Missing:**

- ❌ No fee configuration UI
- ❌ No fee collection wallet dashboard
- ❌ No fee statistics/analytics
- ❌ No retry management interface
- ❌ Transaction details don't show fee information

**Already Have:**

- ✅ Backend API endpoints are ready
- ✅ Database tables exist
- ✅ Fee collection logic works
- ✅ Retry mechanism runs automatically

**Next Steps:**

1. Create `lib/api/fees.ts` API client
2. Create fee configuration page
3. Create fee collection wallet overview
4. Create retry management page
5. Add fee info to transaction details
6. Update sidebar navigation to include fee pages

**Estimated Implementation Time:**

- API Client: 30 minutes
- Fee Config Page: 2 hours
- Fee Collection Overview: 2 hours
- Retry Management: 1.5 hours
- Transaction Details Update: 1 hour
- **Total: ~7 hours**

Would you like me to start implementing these pages?
