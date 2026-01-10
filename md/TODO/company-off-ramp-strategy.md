# Company Off-Ramp Strategy & Liquidity Management

**Created:** 2025-01-09  
**Status:** Planning  
**Priority:** High  
**Related:** `/md/TODO/convert-to-naira-feature.md`

This document outlines how RaverPay will convert accumulated USDC to Naira to maintain liquidity for user payouts.

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Liquidity Model](#2-liquidity-model)
3. [Off-Ramp Options](#3-off-ramp-options)
4. [Recommended Strategy](#4-recommended-strategy)
5. [Float Management](#5-float-management)
6. [Admin Dashboard Features](#6-admin-dashboard-features)
7. [Automation (Future)](#7-automation-future)
8. [Implementation Tasks](#8-implementation-tasks)

---

## 1. The Problem

### Your Current Capacity

| Metric                | Value                    |
| --------------------- | ------------------------ |
| Initial Naira Float   | ₦1,000,000               |
| At rate ₦1,550/USDC   | ~$645 capacity           |
| Expected Daily Volume | $1,500 - $2,000          |
| **Gap**               | Need ₦2.3M - ₦3.1M float |

### The Cycle

```
User converts USDC → Naira
         ↓
RaverPay credits user wallet (liability created)
         ↓
User withdraws to bank (Paystack debits your float)
         ↓
Float decreases
         ↓
⚠️ If float hits zero, you can't pay users!
         ↓
Need to off-ramp USDC to replenish float
```

### Why You Need Off-Ramp

Without off-ramping USDC:

1. USDC accumulates in collection wallet (asset)
2. Naira float depletes (liability paid out)
3. Eventually: **No Naira to pay users**

With regular off-ramping:

1. Convert USDC → Naira (via P2P/OTC)
2. Naira enters bank account
3. Float replenished
4. Can continue paying users

---

## 2. Liquidity Model

### Balance Sheet View

```
┌─────────────────────────────────────────────────────────────────┐
│                       RAVERPAY BALANCE SHEET                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ASSETS (What you HAVE):                                        │
│  ├─ Bank Account (Paystack balance):     ₦500,000              │
│  ├─ USDC in Collection Wallets:          $1,200 (≈₦1,860,000)  │
│  └─ TOTAL ASSETS:                        ₦2,360,000            │
│                                                                 │
│  LIABILITIES (What you OWE):                                    │
│  ├─ Sum of User Naira Wallets:           ₦1,800,000            │
│  └─ TOTAL LIABILITIES:                   ₦1,800,000            │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  NET WORTH:                              ₦560,000 ✅            │
│  (You're solvent if Net Worth > 0)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Insight

**You're NOT broke even if Naira float is low** - you have USDC as an asset.

The challenge is **liquidity**: Converting USDC to Naira fast enough to pay users.

### Daily Flow Example

```
Morning:
├─ Naira Float:        ₦800,000
├─ USDC Holdings:      $200

User A converts $100:
├─ USDC Holdings:      $200 + $100 = $300
├─ User A wallet:      +₦154,000
├─ Naira Float:        ₦800,000 (unchanged until withdrawal)

User A withdraws ₦154,000:
├─ Paystack debits:    ₦154,000
├─ Naira Float:        ₦800,000 - ₦154,000 = ₦646,000

Day continues, more conversions + withdrawals:
├─ Naira Float:        ₦200,000 (getting low!)
├─ USDC Holdings:      $800 (accumulated)

End of Day: Time to off-ramp!
├─ Off-ramp $600 USDC → ₦930,000
├─ Naira Float:        ₦200,000 + ₦930,000 = ₦1,130,000
├─ USDC Holdings:      $200 (reserve)
└─ Ready for tomorrow! ✅
```

---

## 3. Off-Ramp Options

### Option A: Binance P2P (Recommended for Start)

| Aspect             | Details                                |
| ------------------ | -------------------------------------- |
| **How it works**   | Sell USDC to Nigerian buyers for Naira |
| **Speed**          | 15-30 minutes per transaction          |
| **Fees**           | 0% Binance fee, but spread in rates    |
| **Effective Rate** | Usually 0.5-1.5% below market          |
| **Limits**         | Depends on your Binance verification   |
| **Effort**         | Manual - need to check trades          |

**Process:**

1. Transfer USDC from Circle collection wallet → Binance
2. Create P2P sell order
3. Buyer sends Naira to your bank
4. Release USDC to buyer
5. Naira now in your bank account

**Pros:**

- Fast
- Low fees
- No relationship needed
- Can start immediately

**Cons:**

- Manual process
- Time-consuming for large volumes
- Need to manage counterparty risk

---

### Option B: OTC Desk (Yellow Card, Quidax)

| Aspect           | Details                       |
| ---------------- | ----------------------------- |
| **How it works** | Direct sale to exchange/desk  |
| **Speed**        | Same day (1-4 hours)          |
| **Fees**         | 1-3% negotiable               |
| **Min Volume**   | Usually $500+                 |
| **Effort**       | Medium - need to contact them |

**Process:**

1. Contact OTC desk (WhatsApp/Email)
2. Get quote for your USDC amount
3. Send USDC to their wallet
4. They send Naira to your bank

**Nigerian OTC Contacts:**

- Yellow Card: business@yellowcard.io
- Quidax: support@quidax.com
- Luno: (institutional desk)

**Pros:**

- Handles larger volumes
- Less time per transaction
- Professional counterparty

**Cons:**

- Higher fees for small amounts
- Need to build relationship
- May have minimum amounts

---

### Option C: Circle Partner Off-Ramp (Future)

| Aspect           | Details                      |
| ---------------- | ---------------------------- |
| **How it works** | Circle's official fiat rails |
| **Speed**        | 1-3 business days            |
| **Fees**         | 1-2%                         |
| **Requirements** | Circle partnership, KYB      |

This is the ideal long-term solution but requires:

- Business verification with Circle
- Banking partnership
- Regulatory compliance

**Not recommended for initial launch** - too slow to set up.

---

### Option D: Crypto Card + Cash Advance (Emergency Only)

| Aspect           | Details                                   |
| ---------------- | ----------------------------------------- |
| **How it works** | Load USDC to crypto card, withdraw at ATM |
| **Speed**        | Instant                                   |
| **Fees**         | 2-4% + ATM fees                           |
| **Limits**       | Low daily limits                          |

**Only for emergencies** - fees are high.

---

## 4. Recommended Strategy

### Phase 1: Manual Binance P2P (Now)

```
Daily Routine:
─────────────
08:00 - Check dashboard for USDC accumulated
09:00 - If USDC > $500, start P2P sell
10:00 - Monitor P2P trades
11:00 - Confirm Naira received in bank
11:30 - Update dashboard: "Float replenished"
```

**Assign this to:** One trusted team member (SUPER_ADMIN)

### Phase 2: OTC Relationship (Month 2+)

Once you have:

- Consistent $1,000+/day volume
- Track record of 30+ days
- Relationship with OTC desk

Negotiate:

- Better rates (1-1.5%)
- Faster processing
- Dedicated contact

### Phase 3: Automated Rails (Month 6+)

Explore:

- Circle partnership
- Banking integration
- Automated USDC → Naira pipeline

---

## 5. Float Management

### Float Thresholds

| Level            | Float Balance       | Action                                    |
| ---------------- | ------------------- | ----------------------------------------- |
| 🟢 **Healthy**   | > ₦500,000          | Normal operations                         |
| 🟡 **Warning**   | ₦200,000 - ₦500,000 | Schedule off-ramp, monitor closely        |
| 🔴 **Critical**  | < ₦200,000          | Urgent off-ramp, pause large conversions  |
| ⛔ **Emergency** | < ₦50,000           | Pause ALL conversions, emergency off-ramp |

### Daily Checklist

```markdown
## Daily Float Check

### Morning (9 AM)

- [ ] Check Naira float balance
- [ ] Check USDC accumulated
- [ ] Check pending conversions
- [ ] Check pending withdrawals
- [ ] Calculate if off-ramp needed today

### Afternoon (2 PM)

- [ ] Execute off-ramp if needed
- [ ] Verify Naira received
- [ ] Update tracking sheet

### Evening (6 PM)

- [ ] Final balance check
- [ ] Log day's statistics
- [ ] Plan for tomorrow
```

### Off-Ramp Decision Matrix

```
IF USDC accumulated > $500 AND Naira float < ₦500,000:
  → Off-ramp 80% of USDC

IF USDC accumulated > $1,000 (regardless of float):
  → Off-ramp excess above $200 reserve

IF Naira float < ₦200,000:
  → URGENT off-ramp immediately
  → Consider pausing conversions temporarily
```

### Reserve Policy

Always keep:

- **USDC Reserve:** $100-200 (for emergencies)
- **Naira Reserve:** ₦200,000 (for small withdrawals)

---

## 6. Admin Dashboard Features

### Treasury Dashboard Page

Create `/dashboard/treasury/page.tsx`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Company Treasury                                        [Refresh] [Export] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │  NAIRA FLOAT                │  │  USDC HOLDINGS              │          │
│  │  ₦847,000                   │  │  $1,250                     │          │
│  │  🟡 Warning - Off-ramp soon │  │  ≈ ₦1,937,500               │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  HEALTH STATUS                                                      │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │  Total Assets:          ₦2,784,500                                 │   │
│  │  Total Liabilities:     ₦1,892,000                                 │   │
│  │  Net Position:          ₦892,500 ✅                                │   │
│  │                                                                     │   │
│  │  ████████████████████░░░░░ 68% Collateralized                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TODAY'S ACTIVITY                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Conversions:           5 transactions ($750 USDC)                  │   │
│  │  Withdrawals:           8 transactions (₦482,000)                   │   │
│  │  Off-Ramps:             1 transaction ($500 → ₦775,000)            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ACTIONS                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [📊 View Off-Ramp History]  [➕ Log New Off-Ramp]  [⚙️ Settings]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Off-Ramp Tracking Page

Create `/dashboard/treasury/off-ramp/page.tsx`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Off-Ramp History                                         [+ Log Off-Ramp] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  Date         Amount       Method      Rate        Naira Received     │ │
│  │  ──────────────────────────────────────────────────────────────────── │ │
│  │  2025-01-09   $500 USDC    Binance P2P ₦1,550     ₦775,000           │ │
│  │  2025-01-08   $600 USDC    Binance P2P ₦1,545     ₦927,000           │ │
│  │  2025-01-07   $400 USDC    Binance P2P ₦1,552     ₦620,800           │ │
│  │  2025-01-06   $1000 USDC   Yellow Card ₦1,540     ₦1,540,000         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  STATISTICS                                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  This Week:    $2,500 USDC → ₦3,862,800 (avg rate: ₦1,545)          │ │
│  │  This Month:   $8,500 USDC → ₦13,175,000 (avg rate: ₦1,550)         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Log Off-Ramp Modal

```
┌──────────────────────────────────────────────────────┐
│  Log Off-Ramp Transaction                            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Amount (USDC):                                      │
│  ┌────────────────────────────────────────────┐     │
│  │ 500                                        │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  Method:                                             │
│  ○ Binance P2P                                      │
│  ○ Yellow Card OTC                                  │
│  ○ Quidax OTC                                       │
│  ○ Other                                            │
│                                                      │
│  Rate (₦/USDC):                                     │
│  ┌────────────────────────────────────────────┐     │
│  │ 1550                                       │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  Naira Received:  ₦775,000 (auto-calculated)        │
│                                                      │
│  Transaction Reference (optional):                   │
│  ┌────────────────────────────────────────────┐     │
│  │ BIN-P2P-12345                              │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  [Cancel]                    [Log Transaction]       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Alert System

Add to dashboard notifications:

| Trigger               | Alert                            |
| --------------------- | -------------------------------- |
| Float < ₦500,000      | 🟡 Float Running Low             |
| Float < ₦200,000      | 🔴 Float Critical - Off-ramp Now |
| Float < ₦50,000       | ⛔ EMERGENCY - Pause Conversions |
| USDC > $1,000         | 📊 Consider Off-Ramping          |
| No off-ramp in 3 days | ⚠️ Review Float Status           |

---

## 7. Automation (Future)

### Phase 3 Goals

When volume justifies ($5,000+/day):

1. **Auto-Detection**
   - System monitors float balance
   - Auto-alerts when off-ramp needed
2. **One-Click Off-Ramp**
   - Pre-configured OTC connection
   - Admin clicks "Off-Ramp Now"
   - System initiates transfer

3. **Scheduled Off-Ramps**
   - Daily automatic off-ramp at 6 PM
   - If USDC > $500, trigger process

### Integration Points (Future)

```typescript
// Potential integrations
interface OffRampProvider {
  name: string;
  getQuote(usdcAmount: number): Promise<{ ngnAmount: number; rate: number }>;
  initiateTransfer(usdcAmount: number, bankAccount: BankAccount): Promise<TransferId>;
  checkStatus(transferId: string): Promise<TransferStatus>;
}

// Providers to integrate
const providers: OffRampProvider[] = [
  new BinanceP2PProvider(), // Requires Binance API
  new YellowCardProvider(), // Requires Yellow Card API
  new CircleOffRampProvider(), // Requires Circle partnership
];
```

---

## 8. Implementation Tasks

### Phase 1: Manual Tracking (Week 1)

- [ ] **8.1.1** Create `CompanyOffRamp` Prisma model
- [ ] **8.1.2** Create off-ramp tracking API endpoints
- [ ] **8.1.3** Create Treasury dashboard page
- [ ] **8.1.4** Create "Log Off-Ramp" modal
- [ ] **8.1.5** Add float alerts to admin notifications

### Phase 2: Monitoring (Week 2)

- [ ] **8.2.1** Create float monitoring service
- [ ] **8.2.2** Add email alerts for low float
- [ ] **8.2.3** Create off-ramp history page
- [ ] **8.2.4** Add treasury stats to main dashboard
- [ ] **8.2.5** Create daily summary email

### Phase 3: Automation (Month 2+)

- [ ] **8.3.1** Evaluate OTC partnerships
- [ ] **8.3.2** Build OTC API integration
- [ ] **8.3.3** Create scheduled off-ramp job
- [ ] **8.3.4** Add one-click off-ramp feature

---

## Database Schema

### New Model: CompanyOffRamp

```prisma
model CompanyOffRamp {
  id                String   @id @default(uuid())
  reference         String   @unique  // OFR-XXXXXX

  // Amount
  usdcAmount        Decimal
  ngnAmount         Decimal
  rate              Decimal  // ₦/USDC

  // Method
  method            String   // BINANCE_P2P, YELLOW_CARD, QUIDAX, OTHER
  providerReference String?  // External ref from provider

  // Status
  status            String   @default("COMPLETED")  // PENDING, COMPLETED, FAILED

  // Bank
  bankName          String?
  accountNumber     String?

  // Audit
  createdBy         String   // Admin who logged it
  createdByEmail    String
  notes             String?

  createdAt         DateTime @default(now())
  completedAt       DateTime?

  @@index([createdAt])
  @@index([method])
  @@map("company_off_ramps")
}
```

---

## API Endpoints

```typescript
// Log a new off-ramp (SUPER_ADMIN only)
POST /api/admin/treasury/off-ramp
Body: {
  usdcAmount: number,
  ngnAmount: number,
  rate: number,
  method: "BINANCE_P2P" | "YELLOW_CARD" | "QUIDAX" | "OTHER",
  providerReference?: string,
  notes?: string
}

// Get off-ramp history
GET /api/admin/treasury/off-ramp?page=1&limit=20

// Get treasury status
GET /api/admin/treasury/status
Response: {
  nairaFloat: 847000,
  usdcHoldings: 1250,
  usdcValueNgn: 1937500,
  totalUserBalances: 1892000,
  netPosition: 892500,
  healthStatus: "WARNING",
  lastOffRamp: "2025-01-08T15:30:00Z",
  alerts: ["Float running low - consider off-ramping"]
}

// Get treasury stats
GET /api/admin/treasury/stats
Response: {
  today: { conversions: 5, withdrawals: 8, offRamps: 1 },
  thisWeek: { totalUsdcOffRamped: 2500, avgRate: 1545 },
  thisMonth: { totalUsdcOffRamped: 8500, avgRate: 1550 }
}
```

---

## Files to Create

```
/apps/raverpay-api/src/treasury/
├── treasury.module.ts
├── treasury.controller.ts
├── treasury.service.ts
└── dto/
    └── create-off-ramp.dto.ts

/apps/raverpay-admin/app/dashboard/treasury/
├── page.tsx              (treasury overview)
├── off-ramp/
│   ├── page.tsx          (off-ramp history)
│   └── [id]/page.tsx     (off-ramp details)
└── settings/page.tsx     (thresholds config)
```

---

## Quick Start Guide

### Day 1: Set Up Tracking

1. Create Google Sheet or Notion table for tracking
2. Columns: Date, USDC Amount, Method, Rate, NGN Received, Reference
3. Log all off-ramps manually

### Day 2-7: Establish Routine

1. Morning: Check float balance
2. Afternoon: Execute off-ramp if needed (Binance P2P)
3. Evening: Log off-ramp in tracking sheet

### Week 2: Build Dashboard

1. Implement treasury dashboard
2. Add automated alerts
3. Create proper off-ramp logging

---

## Risk Mitigation

| Risk                 | Mitigation                                    |
| -------------------- | --------------------------------------------- |
| P2P scammer          | Only trade with verified users, use escrow    |
| Rate volatility      | Lock rate before confirming, complete quickly |
| Bank account frozen  | Use multiple receiving accounts               |
| Low liquidity on P2P | Build relationships with reliable traders     |
| Naira devaluation    | Off-ramp frequently, don't hold excess NGN    |

---

**Last Updated:** 2025-01-09  
**Author:** System Design
