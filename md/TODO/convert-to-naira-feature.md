# Convert to Naira - Feature Specification

**Created:** 2025-01-09  
**Status:** Planning  
**Priority:** High  
**Feature Name:** Convert to Naira

This document outlines the implementation of the USDC to Naira conversion feature (Off-Ramp).

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Flow](#2-user-flow)
3. [Admin Flow & Dual Approval](#3-admin-flow--dual-approval)
4. [Exchange Rate & Pricing](#4-exchange-rate--pricing)
5. [Transaction States](#5-transaction-states)
6. [Notifications](#6-notifications)
7. [Audit Logging](#7-audit-logging)
8. [Configuration & Limits](#8-configuration--limits)
9. [Database Schema](#9-database-schema)
10. [API Endpoints](#10-api-endpoints)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Mobile App UI](#12-mobile-app-ui)
13. [Company Treasury & Accounting](#13-company-treasury--accounting)
14. [Implementation Tasks](#14-implementation-tasks)
15. [Security Concerns & Fixes](#15-security-concerns--fixes)

---

## 1. Overview

### What is "Convert to Naira"?

An off-ramp feature that allows users to convert their USDC tokens to Naira, which is credited to their RaverPay Naira wallet (existing `Wallet` model with `type: NAIRA`).

### Key Points

| Aspect            | Details                                                           |
| ----------------- | ----------------------------------------------------------------- |
| **Input**         | USDC from user's Circle wallet                                    |
| **Output**        | Naira credited to user's existing RaverPay wallet (`type: NAIRA`) |
| **Rate Source**   | CoinGecko (USDC/USD + USD/NGN)                                    |
| **Payout Method** | Credit to in-app Naira wallet                                     |
| **Approval**      | Dual approval: ADMIN first approval → SUPER_ADMIN final approval  |
| **Limits**        | Min: $5, Max: $1,000 (configurable)                               |
| **Destination**   | Company collection wallet (read-only, shown to user)              |
| **PIN Required**  | Yes - user must enter PIN to authorize USDC transfer              |

### Revenue Model

User pays TWO types of fees:

```
1. USDC TRANSFER FEE (same as normal send transactions)
   ├─ Service Fee: 0.5% of amount (min ₦100 equivalent)
   └─ Gas Fee: Sponsored (testnet) or paid by platform (mainnet)

2. CONVERSION SPREAD (platform margin)
   ├─ CoinGecko Rate: 1 USDC = ₦1,599.68
   ├─ Platform Rate:  1 USDC = ₦1,550 (3% spread)
   └─ Your Profit:    ₦49.68 per USDC
```

**Example (100 USDC conversion):**

```
USDC Transfer Fee:    0.50 USDC (0.5% service fee)
Net USDC to convert:  99.50 USDC
Conversion Rate:      ₦1,550/USDC
Gross Naira:          99.50 × ₦1,550 = ₦154,225
Net to User:          ₦154,225

Platform Revenue:
├─ USDC Fee:          0.50 USDC
└─ Spread:            99.50 × ₦49.68 = ₦4,943
```

### Existing Database Models Used

**We use the existing `Wallet` model (NOT creating new NairaWallet):**

```prisma
// Existing model in schema.prisma
model Wallet {
  id             String      @id @default(uuid())
  userId         String
  balance        Decimal     @default(0)
  ledgerBalance  Decimal     @default(0)
  currency       String      @default("NGN")
  type           WalletType? @default(NAIRA)
  // ... other fields
  @@map("wallets")
}

enum WalletType {
  NAIRA
  CRYPTO
  USD
}
```

---

## 2. User Flow

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STEP 1: INITIATE CONVERSION                                   │
│  ───────────────────────────                                   │
│  • User opens "Convert to Naira" screen                        │
│  • Selects source wallet (e.g., USDC on Base)                  │
│  • Enters amount: 100 USDC                                     │
│                                                                 │
│  STEP 2: VIEW QUOTE                                            │
│  ──────────────────                                            │
│  • System fetches live rate from CoinGecko                     │
│  • Displays:                                                   │
│    ┌─────────────────────────────────────┐                     │
│    │  You're converting:    100 USDC     │                     │
│    │  Rate:                 ₦1,550/USDC  │                     │
│    │  Service Fee:          ₦1,000 (0.6%)│                     │
│    │  ─────────────────────────────────  │                     │
│    │  You'll receive:       ₦154,000     │                     │
│    │                                     │                     │
│    │  ⏱️ Rate valid for: 14:59          │                     │
│    │                                     │                     │
│    │  [Confirm Conversion]              │                     │
│    └─────────────────────────────────────┘                     │
│                                                                 │
│  STEP 3: CONFIRM & TRANSFER USDC                               │
│  ───────────────────────────────                               │
│  • User confirms the conversion                                │
│  • System initiates USDC transfer:                             │
│    User Wallet → Company Collection Wallet                     │
│  • User sees "Processing" status                               │
│                                                                 │
│  STEP 4: WAIT FOR ADMIN APPROVAL                               │
│  ───────────────────────────────                               │
│  • Transaction shows "Pending Approval"                        │
│  • User receives notification: "Conversion submitted"          │
│  • Admin reviews and approves                                  │
│                                                                 │
│  STEP 5: NAIRA CREDITED                                        │
│  ──────────────────────                                        │
│  • Admin approves the conversion                               │
│  • System credits user's Naira wallet: ₦154,000                │
│  • User receives notification: "₦154,000 credited!"           │
│  • Transaction marked COMPLETE                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Rate Lock Mechanism

| Setting           | Value                       |
| ----------------- | --------------------------- |
| **Lock Duration** | 15 minutes                  |
| **After Expiry**  | User must request new quote |
| **Stored Data**   | Rate, amounts, timestamp    |

---

## 3. Admin Flow & Dual Approval

### Why Dual Approval?

**Security Concern:** A single admin could abuse wallet crediting to gift money to friends or themselves.

**Solution:** Two-step approval process:

1. **ADMIN** reviews and gives first approval
2. **SUPER_ADMIN** reviews and gives final approval (credits wallet)

### Dual Approval Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STEP 1: USDC CONFIRMED                                        │
│  ──────────────────────                                        │
│  • System detects USDC transfer confirmed                      │
│  • State: PENDING_APPROVAL                                     │
│  • Admins notified: "New conversion ready for review"          │
│                                                                 │
│  STEP 2: ADMIN FIRST APPROVAL                                  │
│  ────────────────────────────                                  │
│  • ADMIN reviews conversion                                    │
│  • ADMIN clicks "Approve" with notes                           │
│  • State: PENDING_FINAL_APPROVAL                               │
│  • SUPER_ADMIN notified: "Conversion awaiting final approval"  │
│                                                                 │
│  STEP 3: SUPER_ADMIN FINAL APPROVAL                            │
│  ───────────────────────────────────                           │
│  • SUPER_ADMIN reviews conversion                              │
│  • Sees: Who did first approval + their notes                  │
│  • SUPER_ADMIN clicks "Final Approve & Credit"                 │
│  • State: COMPLETED                                            │
│  • User's Naira wallet credited                                │
│  • User notified: "₦154,000 credited to your wallet!"          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Admin Dashboard: Conversion Requests

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  Convert to Naira - Pending Approvals                               [Filter ▼] │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  #CNV-001234                               🟡 PENDING FIRST APPROVAL     │ │
│  │  ──────────────────────────────────────────────────────────────────────  │ │
│  │  User:           John Doe (john@example.com)                             │ │
│  │  Amount:         100 USDC → ₦154,000                                    │ │
│  │  Rate Used:      ₦1,540/USDC                                            │ │
│  │  USDC Fee:       0.50 USDC                                              │ │
│  │  ──────────────────────────────────────────────────────────────────────  │ │
│  │  USDC Transfer:  ✅ CONFIRMED (tx: 0xabc...def)                          │ │
│  │  Submitted:      2 minutes ago                                           │ │
│  │  ──────────────────────────────────────────────────────────────────────  │ │
│  │                                                                          │ │
│  │  [ADMIN] [✅ First Approval]   [❌ Reject]   [👁️ View Details]           │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  #CNV-001233                              🟠 PENDING FINAL APPROVAL      │ │
│  │  User:           Jane Smith                                              │ │
│  │  Amount:         50 USDC → ₦77,000                                      │ │
│  │  ──────────────────────────────────────────────────────────────────────  │ │
│  │  First Approval: ✅ admin@raverpay.com (5 min ago)                       │ │
│  │  Notes:          "KYC verified, legitimate user"                         │ │
│  │  ──────────────────────────────────────────────────────────────────────  │ │
│  │                                                                          │ │
│  │  [SUPER_ADMIN] [✅ Final Approve & Credit]   [❌ Reject]                  │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Admin Actions by Role

| Action                      | ADMIN | SUPER_ADMIN | Description                 |
| --------------------------- | ----- | ----------- | --------------------------- |
| **View Pending**            | ✅    | ✅          | See all pending conversions |
| **First Approval**          | ✅    | ✅          | Initial review and approval |
| **Final Approval & Credit** | ❌    | ✅          | Credit user's wallet        |
| **Reject**                  | ✅    | ✅          | Any admin can reject        |
| **View History**            | ✅    | ✅          | See completed conversions   |
| **Edit Settings**           | ❌    | ✅          | Change limits, rates        |

### Approval Modal (First Approval - ADMIN)

```
┌──────────────────────────────────────────────────────┐
│  First Approval - #CNV-001234                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ✅ Pre-Approval Checklist:                          │
│  ───────────────────────                             │
│  [✓] USDC transfer confirmed on blockchain          │
│  [✓] Transaction hash verified                       │
│  [✓] Amount matches request (100 USDC)              │
│  [✓] User KYC status: Verified                      │
│  [✓] No suspicious activity flags                   │
│                                                      │
│  Amount to Credit: ₦154,000                         │
│                                                      │
│  Notes (required):                                   │
│  ┌────────────────────────────────────────────┐     │
│  │ Verified USDC receipt. User is legitimate. │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  ⚠️ This requires SUPER_ADMIN final approval         │
│                                                      │
│  [Cancel]                    [Submit First Approval] │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Approval Modal (Final Approval - SUPER_ADMIN)

```
┌──────────────────────────────────────────────────────┐
│  Final Approval - #CNV-001234                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  First Approval By:                                  │
│  ───────────────────                                 │
│  👤 admin@raverpay.com                               │
│  📅 2025-01-09 19:30:00                             │
│  📝 "Verified USDC receipt. User is legitimate."    │
│                                                      │
│  ✅ Final Checklist:                                 │
│  ─────────────────                                   │
│  [✓] USDC in collection wallet (100 USDC)           │
│  [✓] Naira float sufficient (₦847,000 available)    │
│  [✓] First approval reviewed                         │
│                                                      │
│  Action: Credit ₦154,000 to John Doe's wallet       │
│                                                      │
│  Notes (optional):                                   │
│  ┌────────────────────────────────────────────┐     │
│  │                                            │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  [Cancel]                [Final Approve & Credit]    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Rejection Modal (Any Admin)

```
┌──────────────────────────────────────────────────────┐
│  Reject Conversion - #CNV-001234                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ⚠️ This will reject the conversion request.         │
│                                                      │
│  Reason (required):                                  │
│  ┌────────────────────────────────────────────┐     │
│  │ Suspicious activity detected on account.   │     │
│  │ User flagged for KYC review.               │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  Refund Options:                                     │
│  ○ Refund USDC to user's wallet                     │
│  ● Hold USDC for investigation                      │
│  ○ Forfeit USDC (fraud confirmed)                   │
│                                                      │
│  [Cancel]                    [Reject Conversion]     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Approval Tracking

All approvals tracked with:

- Who approved (userId, email)
- When approved (timestamp)
- What role (ADMIN / SUPER_ADMIN)
- Notes provided
- Action taken

---

## 4. Exchange Rate & Pricing

### Rate Calculation

```typescript
// 1. Get USDC/USD rate from CoinGecko
const usdcToUsd = await coinGecko.getPrice('usd-coin', 'usd'); // e.g., 0.9998

// 2. Get USD/NGN rate from CoinGecko
const usdToNgn = await coinGecko.getPrice('usd', 'ngn'); // e.g., 1600

// 3. Calculate raw USDC/NGN rate
const rawRate = usdcToUsd * usdToNgn; // e.g., 1599.68

// 4. Apply platform spread (configurable)
const spreadPercent = 3; // 3% margin for platform
const platformRate = rawRate * (1 - spreadPercent / 100); // e.g., 1551.69

// 5. Round down for cleaner display
const displayRate = Math.floor(platformRate); // e.g., 1551
```

### CoinGecko API Calls

| Data Needed | CoinGecko Endpoint                             | Frequency   |
| ----------- | ---------------------------------------------- | ----------- |
| USDC/USD    | `/simple/price?ids=usd-coin&vs_currencies=usd` | Every 5 min |
| USD/NGN     | `/simple/price?ids=usd&vs_currencies=ngn`      | Every 5 min |

**Note:** CoinGecko provides USD/NGN as they track fiat rates too.

### Fee Structure

| Fee Type      | Default Value | Configurable   |
| ------------- | ------------- | -------------- |
| **Spread**    | 3%            | ✅ Yes (admin) |
| **Fixed Fee** | ₦0            | ✅ Yes (admin) |
| **Min Fee**   | ₦100          | ✅ Yes (admin) |

**Example Calculation:**

```
User converts: 100 USDC
Rate: ₦1,550/USDC
Gross: 100 × ₦1,550 = ₦155,000

Service Fee: max(₦155,000 × 0.6%, ₦100) = ₦930

Net to User: ₦155,000 - ₦930 = ₦154,070
```

---

## 5. Transaction States

Updated for Dual Approval system:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   QUOTED    │────▶│  PENDING    │────▶│  PENDING    │────▶│  PENDING    │────▶│  COMPLETED  │
│             │     │  TRANSFER   │     │  APPROVAL   │     │  FINAL      │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   EXPIRED   │     │   FAILED    │     │  REJECTED   │     │  REJECTED   │
│             │     │             │     │ (by ADMIN)  │     │(by S_ADMIN) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### State Definitions

| State                      | Description                                   | Next States                      |
| -------------------------- | --------------------------------------------- | -------------------------------- |
| **QUOTED**                 | User viewing quote, rate locked               | PENDING_TRANSFER, EXPIRED        |
| **PENDING_TRANSFER**       | USDC transfer initiated, waiting confirmation | PENDING_APPROVAL, FAILED         |
| **PENDING_APPROVAL**       | USDC confirmed, waiting ADMIN first approval  | PENDING_FINAL_APPROVAL, REJECTED |
| **PENDING_FINAL_APPROVAL** | ADMIN approved, waiting SUPER_ADMIN final     | COMPLETED, REJECTED              |
| **COMPLETED**              | Naira credited to user's wallet               | (terminal)                       |
| **EXPIRED**                | Quote expired (15 min)                        | (terminal)                       |
| **FAILED**                 | USDC transfer failed                          | (terminal)                       |
| **REJECTED**               | Any admin rejected the conversion             | (terminal)                       |

---

## 6. Notifications

Integrated with existing `NotificationDispatcherService`.

### User Notifications

| Event                              | Channel             | Template                                               |
| ---------------------------------- | ------------------- | ------------------------------------------------------ |
| **Quote Created**                  | In-App              | "Rate locked! Complete within 15 minutes."             |
| **Conversion Submitted**           | Push, Email, In-App | "Your conversion of {amount} USDC has been submitted." |
| **USDC Transfer Confirmed**        | Push, In-App        | "We've received your {amount} USDC. Pending approval." |
| **First Approval Received**        | In-App              | "Your conversion is being reviewed by our team."       |
| **Conversion Approved & Credited** | Push, Email, In-App | "₦{nairaAmount} has been credited to your wallet! 🎉"  |
| **Conversion Rejected**            | Push, Email, In-App | "Your conversion was rejected. Reason: {reason}"       |
| **Quote Expiring Soon**            | Push                | "Your rate expires in 5 minutes. Complete now!"        |
| **Quote Expired**                  | In-App              | "Your quote has expired. Request a new one."           |

### Admin Notifications

| Event                                     | Channel          | Recipients         |
| ----------------------------------------- | ---------------- | ------------------ |
| **New Conversion Pending First Approval** | Email, Dashboard | ADMIN, SUPER_ADMIN |
| **Conversion Awaiting Final Approval**    | Email, Dashboard | SUPER_ADMIN only   |
| **High Value Conversion** (>$500)         | Email, SMS       | SUPER_ADMIN only   |
| **Conversion Rejected**                   | Dashboard        | All admins         |
| **Daily Summary**                         | Email            | SUPER_ADMIN        |

### Notification Templates (Create in email templates)

1. `conversion-submitted.hbs` - User submitted conversion
2. `conversion-approved.hbs` - Naira credited confirmation
3. `conversion-rejected.hbs` - Rejection with reason
4. `admin-conversion-pending.hbs` - New conversion for admin review
5. `admin-final-approval-needed.hbs` - For SUPER_ADMIN

---

## 7. Audit Logging

All conversion actions must be logged for compliance and security.

### Audit Events to Log

| Event                       | Logged Data                                          |
| --------------------------- | ---------------------------------------------------- |
| **QUOTE_CREATED**           | userId, amount, rate, expiresAt                      |
| **CONVERSION_INITIATED**    | userId, conversionId, circleTransactionId            |
| **USDC_TRANSFER_CONFIRMED** | conversionId, transactionHash, amount                |
| **FIRST_APPROVAL**          | conversionId, adminId, adminEmail, adminRole, notes  |
| **FINAL_APPROVAL**          | conversionId, adminId, adminEmail, adminRole, notes  |
| **NAIRA_CREDITED**          | conversionId, userId, walletId, amount, balanceAfter |
| **CONVERSION_REJECTED**     | conversionId, adminId, reason, refundOption          |
| **QUOTE_EXPIRED**           | conversionId, userId                                 |

### Audit Log Schema

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  action      String   // FIRST_APPROVAL, FINAL_APPROVAL, etc.
  entityType  String   // NAIRA_CONVERSION, WALLET, etc.
  entityId    String   // ID of the entity
  userId      String?  // User who performed action (admin)
  userEmail   String?  // For quick reference
  userRole    String?  // ADMIN, SUPER_ADMIN
  metadata    Json?    // Additional context
  ipAddress   String?  // For security
  userAgent   String?  // Browser/device info
  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### Existing AuditLog Usage

If you already have an AuditLog model, reuse it. Otherwise, create one following the pattern above.

### Audit Log Viewer (Admin Dashboard)

Create `/dashboard/audit-logs/page.tsx`:

- Filter by action type
- Filter by date range
- Filter by admin
- Search by entity ID
- Export to CSV

## 8. Configuration & Limits

### Admin-Configurable Settings

| Setting             | Default | Min | Max    | Notes                      |
| ------------------- | ------- | --- | ------ | -------------------------- |
| `conversionEnabled` | `true`  | -   | -      | Enable/disable feature     |
| `minAmountUsd`      | `5`     | 1   | 100    | Minimum conversion         |
| `maxAmountUsd`      | `1000`  | 100 | 50000  | Maximum conversion         |
| `dailyLimitUsd`     | `5000`  | 100 | 100000 | Per-user daily limit       |
| `spreadPercent`     | `3`     | 0   | 10     | Platform margin %          |
| `fixedFeeNgn`       | `0`     | 0   | 10000  | Fixed fee per txn          |
| `minFeeNgn`         | `100`   | 0   | 5000   | Minimum fee floor          |
| `quoteTtlMinutes`   | `15`    | 5   | 60     | Rate lock duration         |
| `requireKyc`        | `false` | -   | -      | Require KYC for large txns |
| `kycThresholdUsd`   | `100`   | 50  | 1000   | KYC required above this    |

### Storage

Store in `SystemConfig` table with key: `CONVERT_TO_NAIRA_CONFIG`

```typescript
interface ConvertToNairaConfig {
  enabled: boolean;
  minAmountUsd: number;
  maxAmountUsd: number;
  dailyLimitUsd: number;
  spreadPercent: number;
  fixedFeeNgn: number;
  minFeeNgn: number;
  quoteTtlMinutes: number;
  requireKyc: boolean;
  kycThresholdUsd: number;
}
```

---

## 9. Database Schema

### New Model: NairaConversion

**Reference:** Follow `/md/CRITICAL/PRISMA_MIGRATION_WORKAROUND.md` for migration.

```prisma
// Conversion Request - with Dual Approval support
model NairaConversion {
  id                    String                  @id @default(uuid())
  reference             String                  @unique  // CNV-XXXXXX
  userId                String
  user                  User                    @relation(fields: [userId], references: [id])

  // Source (USDC)
  sourceWalletId        String                  // Circle wallet ID
  sourceBlockchain      String                  // e.g., "BASE-SEPOLIA"
  sourceAmount          Decimal                 // USDC amount before fee
  usdcFee               Decimal                 // USDC transfer fee (0.5%)
  netUsdcAmount         Decimal                 // After fee

  // Destination (Company collection wallet)
  destinationWalletId   String                  // Company collection wallet ID
  destinationAddress    String                  // Company wallet address

  // Rates (locked at quote time)
  usdcToUsdRate         Decimal                 // CoinGecko USDC/USD
  usdToNgnRate          Decimal                 // CoinGecko USD/NGN
  platformRate          Decimal                 // After spread (₦/USDC)
  spreadPercent         Decimal                 // Spread applied

  // Output
  nairaAmount           Decimal                 // Final Naira to credit

  // State (with dual approval)
  state                 NairaConversionState    @default(QUOTED)

  // USDC Transfer
  circleTransactionId   String?                 // Circle transaction ID
  transactionHash       String?                 // Blockchain tx hash
  usdcConfirmedAt       DateTime?

  // FIRST APPROVAL (ADMIN)
  firstApprovalBy       String?                 // Admin user ID
  firstApprovalByEmail  String?                 // For display
  firstApprovalAt       DateTime?
  firstApprovalNotes    String?

  // FINAL APPROVAL (SUPER_ADMIN)
  finalApprovalBy       String?                 // SuperAdmin user ID
  finalApprovalByEmail  String?                 // For display
  finalApprovalAt       DateTime?
  finalApprovalNotes    String?

  // Rejection (any admin)
  rejectedBy            String?
  rejectedByEmail       String?
  rejectedAt            DateTime?
  rejectionReason       String?
  refundOption          String?                 // REFUND, HOLD, FORFEIT

  // Naira Credit
  nairaWalletId         String?                 // User's Naira wallet ID
  nairaTransactionId    String?                 // Transaction record ID
  creditedAt            DateTime?

  // Timestamps
  quotedAt              DateTime                @default(now())
  quoteExpiresAt        DateTime
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  @@index([userId])
  @@index([state])
  @@index([createdAt])
  @@index([firstApprovalBy])
  @@index([finalApprovalBy])
  @@map("naira_conversions")
}

enum NairaConversionState {
  QUOTED                  // Rate locked, user reviewing
  PENDING_TRANSFER        // USDC transfer initiated
  PENDING_APPROVAL        // USDC confirmed, waiting ADMIN first approval
  PENDING_FINAL_APPROVAL  // ADMIN approved, waiting SUPER_ADMIN
  COMPLETED               // Naira credited
  EXPIRED                 // Quote expired
  FAILED                  // USDC transfer failed
  REJECTED                // Any admin rejected
}
```

### Existing Models Used

**We use the existing `Wallet` model - NO new NairaWallet:**

```prisma
// Already exists in schema.prisma
model Wallet {
  id             String      @id @default(uuid())
  userId         String
  balance        Decimal     @default(0)
  ledgerBalance  Decimal     @default(0)
  currency       String      @default("NGN")
  type           WalletType? @default(NAIRA)  // Use type: NAIRA
  // ... other fields
  @@map("wallets")
}

// Already exists - use for tracking credits
model Transaction {
  id            String   @id @default(uuid())
  reference     String   @unique
  userId        String
  type          TransactionType
  status        TransactionStatus
  amount        Decimal
  description   String
  // ... other fields
  @@map("transactions")
}
```

When crediting Naira wallet, create a Transaction record with:

- `type: DEPOSIT` or add new type `CONVERSION`
- `description: "USDC to Naira conversion - CNV-XXXXXX"`
- `metadata: { conversionId, sourceAmount, rate }`

---

## 9. API Endpoints

### User Endpoints

```typescript
// Get conversion quote
POST /api/convert-to-naira/quote
Body: {
  sourceWalletId: string,
  amount: number  // USDC amount
}
Response: {
  success: true,
  data: {
    quoteId: string,
    sourceAmount: "100.00",
    platformRate: 1550,
    serviceFee: 1000,
    nairaAmount: 154000,
    expiresAt: "2025-01-09T20:00:00Z",
    expiresIn: 900  // seconds
  }
}

// Confirm conversion (initiates USDC transfer)
POST /api/convert-to-naira/confirm
Body: {
  quoteId: string
}
Response: {
  success: true,
  data: {
    conversionId: string,
    reference: "CNV-001234",
    state: "PENDING_TRANSFER"
  }
}

// Get conversion status
GET /api/convert-to-naira/:id
Response: {
  success: true,
  data: {
    id: string,
    reference: "CNV-001234",
    state: "PENDING_APPROVAL",
    sourceAmount: "100.00",
    nairaAmount: "154000",
    // ... full details
  }
}

// List user's conversions
GET /api/convert-to-naira?page=1&limit=20&state=COMPLETED
Response: {
  success: true,
  data: [...],
  meta: { total, page, limit }
}

// Get current rate (for display)
GET /api/convert-to-naira/rate
Response: {
  success: true,
  data: {
    platformRate: 1550,
    marketRate: 1600,
    spreadPercent: 3,
    updatedAt: "2025-01-09T19:30:00Z"
  }
}
```

### Admin Endpoints

```typescript
// List pending conversions (filter by state)
GET /api/admin/convert-to-naira?state=PENDING_APPROVAL&page=1
GET /api/admin/convert-to-naira?state=PENDING_FINAL_APPROVAL&page=1
Response: {
  success: true,
  data: [...],
  meta: {
    total,
    page,
    limit,
    pendingFirstApproval: 5,
    pendingFinalApproval: 2
  }
}

// FIRST APPROVAL (ADMIN or SUPER_ADMIN)
POST /api/admin/convert-to-naira/:id/first-approve
Body: {
  notes: string  // Required
}
Response: {
  success: true,
  data: {
    id: string,
    state: "PENDING_FINAL_APPROVAL",
    firstApprovalBy: "admin-user-id",
    firstApprovalAt: "2025-01-09T19:40:00Z"
  }
}

// FINAL APPROVAL (SUPER_ADMIN only - credits wallet)
POST /api/admin/convert-to-naira/:id/final-approve
Headers: { Authorization: Bearer <super_admin_token> }
Body: {
  notes?: string
}
Response: {
  success: true,
  data: {
    id: string,
    state: "COMPLETED",
    nairaAmount: 154000,
    creditedAt: "2025-01-09T19:45:00Z"
  }
}
// Error if not SUPER_ADMIN:
// { success: false, message: "Only SUPER_ADMIN can give final approval" }

// Reject conversion (any admin)
POST /api/admin/convert-to-naira/:id/reject
Body: {
  reason: string,         // Required
  refundOption: "REFUND" | "HOLD" | "FORFEIT"
}
Response: {
  success: true,
  data: {
    id: string,
    state: "REJECTED",
    rejectedBy: "admin-user-id",
    rejectionReason: "Suspicious activity"
  }
}

// Get conversion details (with full audit trail)
GET /api/admin/convert-to-naira/:id
Response: {
  success: true,
  data: {
    // ... conversion details
    firstApprovalBy: "admin@raverpay.com",
    firstApprovalAt: "2025-01-09T19:40:00Z",
    firstApprovalNotes: "USDC verified",
    finalApprovalBy: null,
    // ... etc
  }
}

// Get conversion stats
GET /api/admin/convert-to-naira/stats
Response: {
  success: true,
  data: {
    today: { count: 15, volumeUsdc: 1500, volumeNgn: 2325000 },
    pendingFirstApproval: { count: 3, volumeUsdc: 300 },
    pendingFinalApproval: { count: 2, volumeUsdc: 200 },
    thisMonth: { count: 150, volumeUsdc: 25000 }
  }
}

// Get treasury status
GET /api/admin/convert-to-naira/treasury
Response: {
  success: true,
  data: {
    usdcHoldings: 12350,
    nairaFloatAvailable: 847000,
    totalUserBalances: 10642500,
    netPosition: 9500000,
    healthStatus: "HEALTHY" // or "WARNING" or "CRITICAL"
  }
}

// Update configuration (SUPER_ADMIN only)
PUT /api/admin/convert-to-naira/config
Body: {
  enabled?: boolean,
  minAmountUsd?: number,
  maxAmountUsd?: number,
  spreadPercent?: number,
  // ... other settings
}
```

---

## 10. Admin Dashboard

### Pages to Create

1. **Pending Conversions** (`/dashboard/convert-to-naira/pending`)
   - List of conversions awaiting approval
   - Quick approve/reject actions
   - Filters by status, date, amount

2. **Conversion History** (`/dashboard/convert-to-naira/history`)
   - All completed/rejected conversions
   - Search by user, reference, date
   - Export to CSV

3. **Conversion Settings** (`/dashboard/convert-to-naira/settings`)
   - Enable/disable feature
   - Set limits (min/max/daily)
   - Set spread percentage
   - Set fees

4. **Conversion Analytics** (`/dashboard/convert-to-naira/analytics`)
   - Volume charts (daily/weekly/monthly)
   - Revenue from spread
   - Top users by volume
   - Conversion success rate

### Dashboard Widgets (Home Page)

Add to main dashboard:

```
┌──────────────────────────┐  ┌──────────────────────────┐
│  Pending Conversions     │  │  Today's Volume          │
│         3                │  │    $1,500 / ₦2.3M        │
│  [View All →]            │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```

---

## 11. Mobile App UI

### Screens to Create

1. **Convert to Naira Screen** (`/circle/convert-to-naira`)

```
┌─────────────────────────────────────┐
│  ←  Convert to Naira                │
├─────────────────────────────────────┤
│                                     │
│  From:                              │
│  ┌─────────────────────────────┐   │
│  │ 🔵 USDC on Base             ▼│   │
│  │    Balance: 150.00 USDC      │   │
│  └─────────────────────────────┘   │
│                                     │
│  Amount:                            │
│  ┌─────────────────────────────┐   │
│  │     100                     │   │
│  │     USDC            [MAX]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Rate:          ₦1,550 / USDC      │
│  You'll receive: ₦155,000          │
│  Service Fee:   - ₦1,000           │
│  ─────────────────────────────────  │
│  Net Amount:    ₦154,000           │
│                                     │
│  ℹ️ Naira will be credited to your  │
│     RaverPay wallet after approval  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Get Quote              │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

2. **Quote Confirmation Screen** (`/circle/convert-to-naira/confirm`)

```
┌─────────────────────────────────────┐
│  ←  Confirm Conversion              │
├─────────────────────────────────────┤
│                                     │
│  ⏱️ Rate locked for: 14:32          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │  Converting:   100 USDC     │   │
│  │  Rate:         ₦1,550       │   │
│  │  Service Fee:  ₦1,000       │   │
│  │  ───────────────────────   │   │
│  │  You'll get:   ₦154,000    │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  📍 Credited to:                    │
│     Your RaverPay Naira Wallet      │
│                                     │
│  ⚠️ Processing time: 5-30 minutes   │
│     (pending admin approval)        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    Confirm & Convert        │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

3. **Conversion Status Screen** (`/circle/convert-to-naira/status/:id`)

```
┌─────────────────────────────────────┐
│  ←  Conversion Status               │
├─────────────────────────────────────┤
│                                     │
│        ⏳                           │
│   Pending Approval                  │
│                                     │
│  Reference: CNV-001234              │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Timeline:                          │
│                                     │
│  ✅ Quote created           19:30   │
│  ✅ USDC transferred        19:31   │
│  ⏳ Pending approval        Now     │
│  ⬜ Naira credited          ---     │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Amount:      100 USDC              │
│  You'll get:  ₦154,000              │
│                                     │
│  ℹ️ You'll be notified when your    │
│     Naira wallet is credited.       │
│                                     │
└─────────────────────────────────────┘
```

### Navigation

Add to Circle Wallet screen:

```
[Receive]  [Send]  [Bridge]  [Convert ₦]
```

---

## 12. Implementation Tasks

### Phase 1: Backend Core

- [ ] **12.1.1** Create `NairaConversion` Prisma model and migrate
- [ ] **12.1.2** Create `ConversionConfigService` (read/write SystemConfig)
- [ ] **12.1.3** Create `ConversionRateService` (CoinGecko USD/NGN integration)
- [ ] **12.1.4** Create `ConversionService` (quote, confirm, complete)
- [ ] **12.1.5** Create `ConversionController` (user endpoints)
- [ ] **12.1.6** Integrate with Circle USDC transfer (reuse CircleTransactionService)
- [ ] **12.1.7** Integrate with Naira wallet credit (NairaWalletService)
- [ ] **12.1.8** Add notifications via NotificationDispatcherService

### Phase 2: Admin Backend

- [ ] **12.2.1** Create `AdminConversionController` (admin endpoints)
- [ ] **12.2.2** Add approve/reject logic with Naira credit
- [ ] **12.2.3** Add conversion stats endpoints
- [ ] **12.2.4** Add config management endpoints

### Phase 3: Admin Dashboard

- [ ] **12.3.1** Create pending conversions page
- [ ] **12.3.2** Create conversion history page
- [ ] **12.3.3** Create settings page
- [ ] **12.3.4** Add dashboard widgets
- [ ] **12.3.5** Add analytics page (optional)

### Phase 4: Mobile App

- [ ] **12.4.1** Create conversion service/hooks
- [ ] **12.4.2** Create Convert to Naira screen
- [ ] **12.4.3** Create quote confirmation screen
- [ ] **12.4.4** Create conversion status screen
- [ ] **12.4.5** Create conversion history list
- [ ] **12.4.6** Add navigation button to wallet screen

### Phase 5: Testing

- [ ] **12.5.1** Unit tests for rate calculation
- [ ] **12.5.2** Integration tests for full flow
- [ ] **12.5.3** E2E test on testnet
- [ ] **12.5.4** Admin dual approval flow testing

---

## Files to Create

### Backend

```
/apps/raverpay-api/src/conversion/
├── conversion.module.ts
├── conversion.controller.ts
├── conversion.service.ts
├── services/
│   ├── conversion-rate.service.ts
│   └── conversion-config.service.ts
├── dto/
│   ├── create-quote.dto.ts
│   ├── confirm-conversion.dto.ts
│   └── update-config.dto.ts
└── entities/
    └── naira-conversion.entity.ts

/apps/raverpay-api/src/admin/conversion/
├── admin-conversion.controller.ts
└── admin-conversion.service.ts
```

### Mobile App

```
/apps/raverpay-mobile/app/circle/
├── convert-to-naira.tsx
├── convert-to-naira-confirm.tsx
└── convert-to-naira-status.tsx

/apps/raverpay-mobile/src/
├── hooks/useConversion.ts
└── services/conversion.service.ts
```

### Admin Dashboard

```
/apps/raverpay-admin/app/dashboard/convert-to-naira/
├── page.tsx              (pending list)
├── history/page.tsx      (history)
├── settings/page.tsx     (config)
├── analytics/page.tsx    (stats)
└── [id]/page.tsx         (detail view)

/apps/raverpay-admin/app/dashboard/treasury/
├── page.tsx              (treasury overview)
└── off-ramp/page.tsx     (company off-ramp tracking)

/apps/raverpay-admin/app/dashboard/audit-logs/
└── page.tsx              (audit log viewer)
```

---

## 13. Company Treasury & Accounting

### The "Virtual Wallet" Reality

When admin approves a conversion, the Naira is "created" in the user's wallet. This is a **liability** to the platform.

### Double-Entry Accounting

Every conversion creates two entries:

| Debit (Asset)                         | Credit (Liability)              |
| ------------------------------------- | ------------------------------- |
| USDC in collection wallet (+100 USDC) | User's Naira wallet (+₦154,000) |

### Company Treasury Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Company Treasury                                    [Refresh]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USDC HOLDINGS (Assets Received from Conversions)              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Today's conversions:      $1,250 USDC                  │   │
│  │  This week:                $4,500 USDC                  │   │
│  │  Total accumulated:        $12,350 USDC                 │   │
│  │  [View Collection Wallets]                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  NAIRA CREDITED (Liabilities Created)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Today:                    ₦1,937,500                   │   │
│  │  This week:                ₦6,975,000                   │   │
│  │  Total credited:           ₦19,142,500                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  NAIRA WITHDRAWN (Liabilities Settled via Paystack)            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Today:                    ₦500,000                     │   │
│  │  This week:                ₦2,100,000                   │   │
│  │  Total withdrawn:          ₦8,500,000                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  HEALTH CHECK                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Initial Naira Float:      ₦1,000,000                   │   │
│  │  Total User Balances:      ₦10,642,500                  │   │
│  │  USDC Holdings (@ ₦1,550): ₦19,142,500 equivalent       │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Net Position:             ₦9,500,000 ✅                │   │
│  │                                                         │   │
│  │  [🟢 Healthy - Can process more conversions]            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Treasury Alerts

| Condition                 | Alert                           |
| ------------------------- | ------------------------------- |
| Net Position < ₦500,000   | ⚠️ Low float warning            |
| Net Position < ₦0         | 🔴 CRITICAL - Pause conversions |
| USDC > $2,000 accumulated | 📊 Consider off-ramping batch   |
| Daily volume > $1,500     | ⚠️ Approaching capacity         |

### Solvency Check Before Approval

Before SUPER_ADMIN can final approve, system checks:

```typescript
// Pre-approval solvency check
const nairaToCredit = conversion.nairaAmount;
const availableNaira = await getTreasuryAvailableNaira();

if (nairaToCredit > availableNaira) {
  throw new Error(`Insufficient Naira float. 
    Need: ₦${nairaToCredit}, 
    Available: ₦${availableNaira}. 
    Off-ramp USDC first.`);
}
```

### Your Capacity

| Metric          | Value                    |
| --------------- | ------------------------ |
| Initial Float   | ₦1,000,000               |
| At ₦1,550/USDC  | ~$645 capacity           |
| Expected Volume | $1,500-2,000/day         |
| Gap             | Need ₦2.3M - ₦3.1M float |

**Solutions:**

1. Off-ramp USDC daily to replenish float
2. Start with lower limits, grow as float grows
3. Larger transactions require off-ramp first

---

## 14. Implementation Tasks (Updated)

### Phase 1: Backend Core

- [ ] **14.1.1** Create `NairaConversion` Prisma model and migrate
  - Reference: `/md/CRITICAL/PRISMA_MIGRATION_WORKAROUND.md`
- [ ] **14.1.2** Create `ConversionConfigService` (read/write SystemConfig)
- [ ] **14.1.3** Create `ConversionRateService` (CoinGecko USD/NGN integration)
- [ ] **14.1.4** Create `ConversionService` (quote, confirm, complete)
- [ ] **14.1.5** Create `ConversionController` (user endpoints)
- [ ] **14.1.6** Integrate with Circle USDC transfer (reuse CircleTransactionService)
  - Apply same fees as normal USDC send transactions
- [ ] **14.1.7** Integrate with existing Naira wallet (`Wallet` model with `type: NAIRA`)
- [ ] **14.1.8** Add notifications via NotificationDispatcherService
- [ ] **14.1.9** Add audit logging for all conversion events

### Phase 2: Admin Backend (Dual Approval)

- [ ] **14.2.1** Create `AdminConversionController` (admin endpoints)
- [ ] **14.2.2** Implement dual approval logic:
  - First approval (ADMIN)
  - Final approval (SUPER_ADMIN only)
- [ ] **14.2.3** Add rejection with reason + refund options
- [ ] **14.2.4** Add conversion stats endpoints
- [ ] **14.2.5** Add config management endpoints
- [ ] **14.2.6** Add audit logging for all admin actions

### Phase 3: Admin Dashboard

- [ ] **14.3.1** Create pending conversions page (with dual approval UI)
- [ ] **14.3.2** Create conversion history page
- [ ] **14.3.3** Create settings page
- [ ] **14.3.4** Add dashboard widgets
- [ ] **14.3.5** Create Company Treasury page
- [ ] **14.3.6** Create Audit Logs viewer
- [ ] **14.3.7** Implement confirmation modals with notes fields

### Phase 4: Mobile App

- [ ] **14.4.1** Create conversion service/hooks
- [ ] **14.4.2** Create Convert to Naira screen (reuse patterns from send.tsx)
  - Wallet picker (source wallet)
  - Amount input with MAX button
  - Read-only destination (company wallet shown but not editable)
  - Fee breakdown display
- [ ] **14.4.3** Create quote confirmation screen with PIN modal
- [ ] **14.4.4** Create conversion status screen (similar to transaction-status.tsx)
- [ ] **14.4.5** Create conversion history list
- [ ] **14.4.6** Add navigation button to wallet screen

### Phase 5: Testing

- [ ] **14.5.1** Unit tests for rate calculation
- [ ] **14.5.2** Integration tests for full flow
- [ ] **14.5.3** E2E test on testnet
- [ ] **14.5.4** Dual approval flow testing
- [ ] **14.5.5** Audit log verification

---

## 15. Security Concerns & Fixes

### 15.1 Existing Wallet Page Loophole

**Problem:** The existing wallet management page at `/apps/raverpay-admin/app/dashboard/wallets/[userId]/page.tsx` may allow admins to credit user wallets without proper oversight.

**Risk:** A single admin could gift money to friends.

**Fix Required:**

- Apply dual approval to ANY wallet credit operation
- All manual wallet adjustments must go through the same ADMIN → SUPER_ADMIN flow
- Log all wallet balance changes in audit log

### 15.2 Security Measures

| Measure                 | Implementation                                   |
| ----------------------- | ------------------------------------------------ |
| **Dual Approval**       | ADMIN first, SUPER_ADMIN final for all credits   |
| **Audit Logging**       | Every action logged with admin ID, timestamp, IP |
| **Confirmation Modals** | Required notes field, explicit confirmation      |
| **Role-Based Access**   | Only SUPER_ADMIN can do final credit             |
| **Daily Limits**        | Cap on total conversions per day                 |
| **Alert on High Value** | SUPER_ADMIN notified for >$500 conversions       |
| **Solvency Checks**     | Cannot approve if insufficient float             |

### 15.3 Files to Audit/Fix

- `/apps/raverpay-admin/app/dashboard/wallets/[userId]/page.tsx` - Add dual approval
- Any other pages that allow direct wallet balance modification

---

## Open Questions

1. **Refund on Rejection:** Should rejected conversions auto-refund USDC to user?
2. **Partial Approvals:** Allow admin to approve different amount than requested?
3. **Auto-Approval:** Future: auto-approve small amounts (<$50)?
4. **Multiple Quotes:** Allow user to have multiple active quotes?
5. **Off-Ramp Provider:** Which service to use for company's USDC → Naira (Circle, Binance P2P, OTC)?

---

## Next Steps

After implementing this feature:

1. **Company Off-Ramp Strategy** - How RaverPay converts accumulated USDC to Naira
   - Options: Circle Partner, Binance P2P, OTC desk
   - Create tracking dashboard for off-ramp transactions
2. **Liquidity Management** - Ensuring Naira availability
   - Daily off-ramp batch job
   - Alerts when float is low
   - Automatic pause of conversions when insolvent

3. **Fix Existing Wallet Loophole** - Add dual approval to all wallet credit operations

---

**Last Updated:** 2025-01-09  
**Author:** System Design
