# Phase 1.5: Funding & Withdrawals Implementation

**RaverPay - Wallet Funding & Withdrawal System**

---

## 📋 Overview

Phase 1.5 implements the core financial operations: funding wallets and withdrawing funds to bank accounts. This phase integrates with payment gateways (Paystack/Flutterwave) for card payments and bank transfers.

---

## 🎯 Features to Implement

### 1. Funding Methods

- ✅ **Fund via Virtual Account** (Bank Transfer) - Automatic
- ✅ **Fund via Card Payment** (Paystack/Flutterwave)
- ✅ **Fund via Bank Transfer** (Manual verification)

### 2. Withdrawal Methods

- ✅ **Withdraw to Bank Account** (Paystack/Flutterwave Transfer)
- ✅ **Withdrawal fee calculation**
- ✅ **Daily withdrawal limits**

### 3. Virtual Accounts

- ✅ **Generate virtual account numbers** per user
- ✅ **Automatic credit on payment**
- ✅ **Webhook handling**

### 4. Transaction Management

- ✅ **Create deposit transactions**
- ✅ **Create withdrawal transactions**
- ✅ **Update wallet balances atomically**
- ✅ **Handle transaction failures**
- ✅ **Transaction references (unique)**

---

## 💰 Transaction Fees

| Transaction Type            | Fee             | Notes       |
| --------------------------- | --------------- | ----------- |
| Virtual Account Funding     | ₦0              | Free        |
| Card Funding (< ₦2,500)     | ₦50             | Gateway fee |
| Card Funding (≥ ₦2,500)     | 2% (max ₦2,000) | Gateway fee |
| Bank Transfer Funding       | ₦0              | Free        |
| Withdrawal (< ₦5,000)       | ₦10             | Fixed fee   |
| Withdrawal (₦5,000-₦50,000) | ₦25             | Fixed fee   |
| Withdrawal (> ₦50,000)      | ₦50             | Fixed fee   |

---

## 🏗️ Implementation Plan

### Step 1: Transaction Service

- [ ] Create transaction service
- [ ] Generate unique transaction references
- [ ] Create deposit method
- [ ] Create withdrawal method
- [ ] Update wallet balances atomically
- [ ] Handle concurrent transactions (locking)

### Step 2: Payment Gateway Integration

- [ ] Choose gateway (Paystack vs Flutterwave)
- [ ] Set up API credentials
- [ ] Initialize payment for card
- [ ] Verify payment status
- [ ] Handle payment webhooks

### Step 3: Virtual Accounts

- [ ] Generate virtual account per user
- [ ] Store virtual account details
- [ ] Listen for payment webhooks
- [ ] Auto-credit wallet on payment

### Step 4: Bank Transfers (Withdrawals)

- [ ] Get user's bank list
- [ ] Resolve account number
- [ ] Initiate transfer
- [ ] Handle transfer status
- [ ] Update transaction status

### Step 5: Validation & Security

- [ ] Validate sufficient balance
- [ ] Check daily limits
- [ ] Verify wallet not locked
- [ ] Prevent duplicate transactions
- [ ] Rate limiting

### Step 6: Testing

- [ ] Unit tests
- [ ] Integration tests
- [ ] Webhook testing
- [ ] Production testing

---

## 📁 File Structure

```
apps/raverpay-api/src/
├── transactions/
│   ├── transactions.module.ts
│   ├── transactions.controller.ts
│   ├── transactions.service.ts
│   ├── dto/
│   │   ├── index.ts
│   │   ├── fund-wallet.dto.ts
│   │   ├── withdraw-funds.dto.ts
│   │   └── verify-payment.dto.ts
│   └── transactions.types.ts
├── payments/
│   ├── payments.module.ts
│   ├── payments.controller.ts (webhooks)
│   ├── payments.service.ts
│   ├── providers/
│   │   ├── paystack.service.ts
│   │   └── flutterwave.service.ts
│   └── payments.types.ts
├── virtual-accounts/
│   ├── virtual-accounts.module.ts
│   ├── virtual-accounts.service.ts
│   └── virtual-accounts.types.ts
```

---

## 🔧 API Endpoints

### Funding Endpoints

#### 1. Initialize Card Payment

```
POST /api/transactions/fund/card
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 5000,
  "callbackUrl": "https://app.raverpay.com/callback"
}
```

**Response:**

```json
{
  "reference": "TXN_1234567890",
  "authorizationUrl": "https://checkout.paystack.com/abc123",
  "accessCode": "abc123xyz"
}
```

#### 2. Verify Card Payment

```
GET /api/transactions/verify/:reference
Authorization: Bearer {token}
```

**Response:**

```json
{
  "status": "success",
  "reference": "TXN_1234567890",
  "amount": "5000.00",
  "fee": "100.00",
  "netAmount": "5000.00",
  "transactionStatus": "COMPLETED"
}
```

#### 3. Get Virtual Account

```
GET /api/transactions/virtual-account
Authorization: Bearer {token}
```

**Response:**

```json
{
  "accountNumber": "1234567890",
  "accountName": "RaverPay/JOSEPH STACKS",
  "bankName": "Wema Bank",
  "bankCode": "035",
  "isPermanent": true
}
```

#### 4. Fund via Bank Transfer (Manual)

```
POST /api/transactions/fund/transfer
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 10000,
  "bankName": "GTBank",
  "accountNumber": "0123456789",
  "transactionReference": "GTB/TRF/12345",
  "screenshot": "base64_image_or_url"
}
```

**Response:**

```json
{
  "reference": "TXN_1234567890",
  "status": "PENDING",
  "message": "Transfer submitted for verification",
  "estimatedTime": "5-10 minutes"
}
```

---

### Withdrawal Endpoints

#### 1. Get Bank List

```
GET /api/transactions/banks
Authorization: Bearer {token}
```

**Response:**

```json
{
  "banks": [
    {
      "code": "058",
      "name": "GTBank"
    },
    {
      "code": "011",
      "name": "First Bank"
    }
  ]
}
```

#### 2. Resolve Account Number

```
POST /api/transactions/resolve-account
Authorization: Bearer {token}
Content-Type: application/json

{
  "accountNumber": "0123456789",
  "bankCode": "058"
}
```

**Response:**

```json
{
  "accountNumber": "0123456789",
  "accountName": "JOHN DOE",
  "bankCode": "058",
  "bankName": "GTBank"
}
```

#### 3. Withdraw Funds

```
POST /api/transactions/withdraw
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 5000,
  "accountNumber": "0123456789",
  "accountName": "JOHN DOE",
  "bankCode": "058",
  "narration": "Withdrawal to bank account"
}
```

**Response:**

```json
{
  "reference": "TXN_WD_1234567890",
  "amount": "5000.00",
  "fee": "25.00",
  "totalDebit": "5025.00",
  "status": "PROCESSING",
  "estimatedTime": "Few minutes to 24 hours"
}
```

#### 4. Check Withdrawal Status

```
GET /api/transactions/:reference/status
Authorization: Bearer {token}
```

**Response:**

```json
{
  "reference": "TXN_WD_1234567890",
  "status": "COMPLETED",
  "amount": "5000.00",
  "fee": "25.00",
  "completedAt": "2025-11-09T16:30:00.000Z"
}
```

---

### Webhook Endpoints

#### 1. Paystack Webhook

```
POST /api/payments/webhooks/paystack
Content-Type: application/json
X-Paystack-Signature: signature

{
  "event": "charge.success",
  "data": {
    "reference": "TXN_1234567890",
    "amount": 500000,
    "status": "success"
  }
}
```

#### 2. Flutterwave Webhook

```
POST /api/payments/webhooks/flutterwave
Content-Type: application/json
verif-hash: hash

{
  "event": "charge.completed",
  "data": {
    "tx_ref": "TXN_1234567890",
    "amount": 5000,
    "status": "successful"
  }
}
```

---

## 🔐 Security & Validation

### Pre-Transaction Checks

```typescript
// 1. Wallet must not be locked
if (wallet.isLocked) {
  throw new ForbiddenException('Wallet is locked');
}

// 2. Sufficient balance (for withdrawals)
if (wallet.balance < totalAmount) {
  throw new BadRequestException('Insufficient balance');
}

// 3. Check daily limits
if (dailySpent + amount > dailyLimit) {
  throw new BadRequestException('Daily limit exceeded');
}

// 4. Minimum/Maximum amounts
if (amount < minAmount || amount > maxAmount) {
  throw new BadRequestException('Invalid amount');
}

// 5. Duplicate transaction check
const existing = await findByReference(reference);
if (existing) {
  throw new ConflictException('Duplicate transaction');
}
```

### Transaction Limits

| KYC Tier | Min Deposit | Max Deposit | Min Withdrawal | Max Withdrawal |
| -------- | ----------- | ----------- | -------------- | -------------- |
| TIER_0   | ₦100        | ₦10,000     | ₦100           | ₦5,000         |
| TIER_1   | ₦100        | ₦100,000    | ₦100           | ₦50,000        |
| TIER_2   | ₦100        | ₦1,000,000  | ₦100           | ₦500,000       |
| TIER_3   | ₦100        | Unlimited   | ₦100           | Unlimited      |

---

## 🔄 Transaction Flow

### Card Funding Flow

```
1. User → Request card payment
2. API → Generate transaction reference
3. API → Create PENDING transaction
4. API → Initialize Paystack payment
5. API → Return authorization URL
6. User → Redirected to Paystack
7. User → Enter card details
8. Paystack → Process payment
9. Paystack → Send webhook to API
10. API → Verify payment with Paystack
11. API → Update transaction to COMPLETED
12. API → Credit user wallet
13. API → Send notification to user
```

### Withdrawal Flow

```
1. User → Request withdrawal
2. API → Validate balance & limits
3. API → Resolve account details
4. API → Create PENDING transaction
5. API → Debit user wallet
6. API → Update transaction to PROCESSING
7. API → Initiate Paystack transfer
8. Paystack → Process transfer
9. Paystack → Send webhook
10. API → Update transaction to COMPLETED
11. API → Send notification to user
```

### Virtual Account Flow

```
1. User → Register on platform
2. API → Generate virtual account (Paystack)
3. API → Store account details
4. User → Transfer to virtual account
5. Bank → Process transfer
6. Paystack → Detect payment
7. Paystack → Send webhook
8. API → Verify payment
9. API → Create DEPOSIT transaction
10. API → Credit user wallet
11. API → Send notification
```

---

## 🎯 Payment Gateway Recommendation

### Option 1: Paystack (Recommended)

**Pros:**

- ✅ Most popular in Nigeria
- ✅ Excellent documentation
- ✅ Virtual accounts (free)
- ✅ Automated transfers
- ✅ Great dashboard
- ✅ Webhook reliability

**Pricing:**

- Card payments: 1.5% + ₦100 (capped at ₦2,000)
- Bank transfers: Free
- Transfers out: ₦50 per transfer

**Features:**

- Virtual accounts (dedicated)
- Card payments
- Bank transfers out
- Refunds
- Webhook events

### Option 2: Flutterwave

**Pros:**

- ✅ Pan-African coverage
- ✅ Multiple payment methods
- ✅ Good documentation
- ✅ Virtual accounts

**Pricing:**

- Card payments: 1.4% + ₦100
- Transfers: ₦50 per transfer

---

## 📊 Database Changes

### Transaction Model Enhancement

Already exists in schema - verify fields:

```prisma
model Transaction {
  id              String   @id @default(uuid())
  reference       String   @unique

  userId          String
  user            User     @relation(fields: [userId], references: [id])

  type            TransactionType
  status          TransactionStatus @default(PENDING)

  amount          Decimal  @db.Decimal(15, 2)
  fee             Decimal  @default(0) @db.Decimal(15, 2)
  totalAmount     Decimal  @db.Decimal(15, 2)

  balanceBefore   Decimal  @db.Decimal(15, 2)
  balanceAfter    Decimal  @db.Decimal(15, 2)

  currency        String   @default("NGN")
  metadata        Json?

  provider        String?  // "paystack", "flutterwave"
  providerRef     String?
  providerStatus  String?

  description     String

  createdAt       DateTime @default(now())
  completedAt     DateTime?
  failedAt        DateTime?

  @@index([userId, status])
  @@index([reference])
  @@map("transactions")
}
```

### Virtual Account Model (New)

```prisma
model VirtualAccount {
  id            String   @id @default(uuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])

  accountNumber String   @unique
  accountName   String
  bankName      String
  bankCode      String

  provider      String   // "paystack", "flutterwave"
  providerRef   String   @unique

  isActive      Boolean  @default(true)
  isPermanent   Boolean  @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([accountNumber])
  @@map("virtual_accounts")
}
```

---

## 🧪 Testing Strategy

### Unit Tests

- Transaction reference generation (unique)
- Fee calculation
- Balance updates (atomic)
- Validation logic

### Integration Tests

- Card payment initialization
- Payment verification
- Webhook signature validation
- Withdrawal processing

### Webhook Testing

- Use ngrok for local testing
- Test all webhook events
- Test duplicate webhooks
- Test signature verification

---

## 🚨 Important Considerations

### 1. Idempotency

- Use transaction references as idempotency keys
- Handle duplicate webhook calls
- Atomic balance updates with database transactions

### 2. Error Handling

- Graceful degradation
- Retry failed transfers (exponential backoff)
- Alert on critical failures
- Log all payment gateway responses

### 3. Monitoring

- Track success/failure rates
- Monitor webhook delivery
- Alert on stuck transactions
- Dashboard for pending transactions

### 4. Compliance

- CBN regulations compliance
- KYC limits enforcement
- Transaction monitoring
- Suspicious activity detection

---

## 🎯 Success Metrics

- **Funding Success Rate:** > 95%
- **Withdrawal Success Rate:** > 90%
- **Average Funding Time:** < 2 minutes (card), instant (virtual account)
- **Average Withdrawal Time:** < 30 minutes (up to 24 hours)
- **Webhook Reliability:** > 99%
- **Failed Transaction Rate:** < 5%

---

## 🚀 Next Steps After Phase 1.5

**Phase 2.1**: VTU Services

- Airtime purchase
- Data bundle purchase
- Cable TV subscription
- Electricity bills

**Phase 2.2**: Gift Cards

- Buy gift cards
- Sell gift cards
- Gift card trading

---

**Implementation Date:** November 9, 2025  
**Status:** Planning Complete ✅  
**Estimated Duration:** 3-4 days  
**Priority:** HIGH (Core feature)

---

**Payment Gateway Decision:** Paystack  
**Reasoning:** Most popular, better virtual accounts, excellent documentation
