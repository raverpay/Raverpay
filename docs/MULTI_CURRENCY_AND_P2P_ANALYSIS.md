# Multi-Currency & P2P Transfer Analysis

**Date:** December 1, 2024  
**Status:** Research & Planning Phase  
**Branch:** `feature/multi-currency-p2p` (to be created)

---

## Executive Summary

This document analyzes three potential features for MularPay:

1. **Peer-to-Peer (P2P) transfers with user tags** - Fast transfers between MularPay users
2. **Multi-currency support** - Operating across Nigeria, Ghana, Kenya, Côte d'Ivoire, and South Africa
3. **International card payments in USD** - Accepting USD payments from international cards

---

## Table of Contents

1. [Feature 1: P2P Transfers with Tags](#feature-1-p2p-transfers-with-tags)
2. [Feature 2: Multi-Currency Support](#feature-2-multi-currency-support)
3. [Feature 3: International USD Card Payments](#feature-3-international-usd-card-payments)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Legal & Compliance](#legal-compliance)

---

## Feature 1: P2P Transfers with Tags

### Overview

Enable instant transfers between MularPay users using unique tags (like @username) without needing bank details or Paystack verification.

### Current State Analysis

#### ✅ What We Have:

- **Dual wallet system**: NAIRA and CRYPTO wallets per user
- **Transaction system**: Double-entry bookkeeping with `Transaction` model
- **Withdrawal to banks**: Using Paystack transfers API (waits for webhooks)
- **Unique identifiers**: Email and phone (both unique in schema)
- **Internal transaction processing**: Atomic Prisma transactions for wallet operations

#### ❌ What We're Missing:

- **User tags/handles**: No `@username` or unique tag field in User model
- **P2P transfer logic**: No endpoint for user-to-user transfers
- **Tag lookup system**: No way to find users by tag
- **Transfer limits**: No P2P-specific limits (only withdrawal limits exist)

### Technical Implementation

#### Schema Changes Required

```prisma
model User {
  // ... existing fields

  // NEW: Unique tag for P2P transfers
  tag         String? @unique // e.g., "johndoe" (without @)
  tagSetAt    DateTime?
  tagChangedCount Int @default(0) // Limit tag changes (e.g., once per year)

  // Relations
  sentTransfers     P2PTransfer[] @relation("SenderTransfers")
  receivedTransfers P2PTransfer[] @relation("ReceiverTransfers")
}

model P2PTransfer {
  id          String   @id @default(uuid())
  reference   String   @unique // TXN_P2P_xxx

  senderId    String
  sender      User     @relation("SenderTransfers", fields: [senderId], references: [id])

  receiverId  String
  receiver    User     @relation("ReceiverTransfers", fields: [receiverId], references: [id])

  amount      Decimal  @db.Decimal(15, 2)
  fee         Decimal  @default(0) @db.Decimal(15, 2)

  // Status tracking
  status      TransactionStatus @default(COMPLETED) // Instant = completed immediately

  // Optional message
  message     String?  @db.VarChar(200)

  // Link to Transaction records (one for sender debit, one for receiver credit)
  senderTransactionId   String
  receiverTransactionId String

  createdAt   DateTime @default(now())

  @@index([senderId])
  @@index([receiverId])
  @@index([createdAt])
  @@index([senderId, createdAt])
  @@index([receiverId, createdAt])
  @@map("p2p_transfers")
}
```

#### Flow Comparison

**Current Withdrawal Flow** (External Bank Transfer):

```
1. User requests withdrawal → /transactions/withdraw
2. Validate user, amount, bank details
3. Debit wallet in database transaction
4. Call Paystack transfer API (async)
5. Wait for transfer.success webhook ⏱️ (minutes to hours)
6. Send notification
```

**New P2P Transfer Flow** (Internal Transfer):

```
1. User sends to @tag → /transactions/send (NEW endpoint)
2. Look up receiver by tag
3. Validate both users, amount, limits
4. Atomic transaction:
   a. Debit sender's NAIRA wallet
   b. Credit receiver's NAIRA wallet
   c. Create 2 Transaction records (debit + credit)
   d. Create 1 P2PTransfer record
5. Send instant notifications to both parties ✅ (no webhook wait)
```

**Key Difference:** Internal transfers don't call Paystack = instant settlement!

#### API Endpoints Needed

```typescript
// NEW Controller: transactions.controller.ts additions

// 1. Send money to user by tag
@Post('send')
@UseGuards(JwtAuthGuard, TransactionPinGuard)
async sendToUser(
  @CurrentUser() user: User,
  @Body() dto: SendToUserDto, // { recipientTag, amount, message?, pin }
): Promise<P2PTransferResponse> {}

// 2. Lookup user by tag (autocomplete)
@Get('lookup/:tag')
@UseGuards(JwtAuthGuard)
async lookupUserByTag(
  @Param('tag') tag: string,
): Promise<{ tag: string; name: string; avatar?: string }> {}

// 3. Set/update user tag
@Post('set-tag')
@UseGuards(JwtAuthGuard)
async setUserTag(
  @CurrentUser() user: User,
  @Body() dto: SetTagDto, // { tag: string }
): Promise<{ tag: string }> {}

// 4. Get P2P transfer history
@Get('p2p-history')
@UseGuards(JwtAuthGuard)
async getP2PHistory(
  @CurrentUser() user: User,
  @Query() query: PaginationDto,
): Promise<PaginatedResponse<P2PTransfer>> {}
```

#### Service Implementation Outline

```typescript
// transactions.service.ts

async sendToUser(
  senderId: string,
  recipientTag: string,
  amount: number,
  message?: string,
): Promise<P2PTransferResponse> {
  // 1. Validate sender and receiver exist
  const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
  const receiver = await this.prisma.user.findUnique({
    where: { tag: recipientTag.toLowerCase() }
  });

  if (!receiver) throw new NotFoundException('User not found');
  if (sender.id === receiver.id) throw new BadRequestException('Cannot send to yourself');

  // 2. Get sender's NAIRA wallet
  const senderWallet = await this.prisma.wallet.findUnique({
    where: { userId_type: { userId: senderId, type: 'NAIRA' } }
  });

  // 3. Get receiver's NAIRA wallet
  const receiverWallet = await this.prisma.wallet.findUnique({
    where: { userId_type: { userId: receiver.id, type: 'NAIRA' } }
  });

  // 4. Calculate fee (e.g., 0% for P2P, or ₦10 flat)
  const fee = 0; // Or this.calculateP2PFee(amount);
  const totalDebit = amount + fee;

  // 5. Check balance
  if (senderWallet.balance.lt(totalDebit)) {
    throw new BadRequestException('Insufficient balance');
  }

  // 6. Check daily P2P limit
  await this.limitsService.checkLimit(
    senderId,
    amount,
    TransactionLimitType.P2P_TRANSFER
  );

  // 7. Atomic database transaction
  const reference = this.generateReference('p2p');

  const result = await this.prisma.$transaction(async (tx) => {
    // Debit sender
    const newSenderBalance = senderWallet.balance.minus(totalDebit);
    await tx.wallet.update({
      where: { id: senderWallet.id },
      data: { balance: newSenderBalance, ledgerBalance: newSenderBalance },
    });

    // Credit receiver
    const newReceiverBalance = receiverWallet.balance.plus(amount);
    await tx.wallet.update({
      where: { id: receiverWallet.id },
      data: { balance: newReceiverBalance, ledgerBalance: newReceiverBalance },
    });

    // Create sender transaction (debit)
    const senderTxn = await tx.transaction.create({
      data: {
        reference: `${reference}_DEBIT`,
        userId: senderId,
        type: TransactionType.TRANSFER, // Existing enum value
        status: TransactionStatus.COMPLETED,
        amount: new Decimal(amount),
        fee: new Decimal(fee),
        totalAmount: new Decimal(totalDebit),
        balanceBefore: senderWallet.balance,
        balanceAfter: newSenderBalance,
        description: `Sent ₦${amount} to @${receiver.tag}`,
        metadata: { recipientTag: receiver.tag, recipientId: receiver.id, message },
      },
    });

    // Create receiver transaction (credit)
    const receiverTxn = await tx.transaction.create({
      data: {
        reference: `${reference}_CREDIT`,
        userId: receiver.id,
        type: TransactionType.DEPOSIT, // Existing enum value (or add TRANSFER_RECEIVED)
        status: TransactionStatus.COMPLETED,
        amount: new Decimal(amount),
        fee: new Decimal(0),
        totalAmount: new Decimal(amount),
        balanceBefore: receiverWallet.balance,
        balanceAfter: newReceiverBalance,
        description: `Received ₦${amount} from @${sender.tag || sender.firstName}`,
        metadata: { senderTag: sender.tag, senderId: sender.id, message },
      },
    });

    // Create P2P transfer record
    const p2pTransfer = await tx.p2PTransfer.create({
      data: {
        reference,
        senderId: sender.id,
        receiverId: receiver.id,
        amount: new Decimal(amount),
        fee: new Decimal(fee),
        status: TransactionStatus.COMPLETED,
        message,
        senderTransactionId: senderTxn.id,
        receiverTransactionId: receiverTxn.id,
      },
    });

    return { senderTxn, receiverTxn, p2pTransfer };
  });

  // 8. Send notifications (async, non-blocking)
  this.sendP2PNotifications(sender, receiver, amount, message);

  // 9. Update daily limits
  await this.limitsService.incrementDailySpend(
    senderId,
    amount,
    TransactionLimitType.P2P_TRANSFER
  );

  return {
    reference: result.p2pTransfer.reference,
    amount: amount.toString(),
    recipient: {
      tag: receiver.tag,
      name: `${receiver.firstName} ${receiver.lastName}`,
    },
    status: 'COMPLETED',
  };
}
```

### Advantages Over Bank Transfers

| Feature           | Bank Transfer (Current)             | P2P Transfer (New)         |
| ----------------- | ----------------------------------- | -------------------------- |
| **Speed**         | Minutes to hours (Paystack)         | Instant (internal DB)      |
| **Cost**          | Paystack fees (₦50+)                | Free or minimal (₦0-10)    |
| **Lookup**        | Need 10-digit account # + bank code | Simple @tag                |
| **Webhooks**      | Must wait for webhook               | No external provider       |
| **Reversibility** | Complex (Paystack refund)           | Easier (internal reversal) |
| **Limits**        | Subject to bank policies            | Fully customizable         |

### Business Rules to Define

1. **Tag Requirements:**
   - Length: 3-20 characters
   - Format: Alphanumeric + underscores (a-z, 0-9, \_)
   - Case-insensitive but stored lowercase
   - Reserved words: admin, support, official, mularpay, etc.
   - Changes: Once per year? Or pay ₦500 to change?

2. **P2P Limits:**
   - Per transaction: ₦50 - ₦500,000 (based on KYC tier)
   - Daily limit: ₦2M (Tier 3), ₦500K (Tier 2), ₦50K (Tier 1)
   - Monthly limit: Optional cap

3. **Fees:**
   - Free for all P2P? (to encourage adoption)
   - Or ₦10 flat fee? (revenue generation)
   - Or tiered: Free under ₦5K, ₦10 above

4. **Security:**
   - Require transaction PIN
   - Optional: OTP for large amounts (>₦100K)
   - Rate limiting: Max 20 transfers per day

---

## Feature 2: Multi-Currency Support

### Overview

Enable users in Ghana, Kenya, Côte d'Ivoire, and South Africa to:

- Fund wallets with local currency (GHS, KES, XOF, ZAR)
- Withdraw to local banks
- Transfer within their country
- _Potentially_ transfer across countries

### Current State Analysis

#### ✅ What We Have:

- **Wallet.currency field**: Already exists! (default "NGN")
- **Country field in User**: Already tracking user's country (default "Nigeria")
- **Paystack multi-country support**: Paystack operates in NG, GH, KE, CI, ZA
- **Transaction model**: Flexible enough to support multiple currencies

#### ❌ What We're Missing:

- **Multi-currency funding**: DVA creation logic is Nigeria-only
- **Currency-specific bank lists**: `getBanks()` only fetches NGN banks
- **Exchange rate system**: No FX conversion logic
- **Country-specific limits**: KYC tiers are Nigeria-centric (BVN)
- **Country-specific compliance**: Each country has different identity requirements

### Paystack Multi-Country Support

According to Paystack documentation:

- **Nigeria**: Full support (Cards, Transfers, DVA, BVN verification)
- **Ghana**: Cards, Mobile Money, DVA with Ghana Card verification
- **Kenya**: Cards, M-Pesa, DVA with National ID verification
- **South Africa**: Cards, DVA with ID Number verification
- **Côte d'Ivoire**: Limited support (Cards, Mobile Money)

### Implementation Flow Comparison

**Current Flow (Nigeria Only):**

```
1. User signs up → country = "Nigeria" (default)
2. User creates DVA → BVN required
3. User funds wallet → NGN credited
4. User withdraws → Paystack transfer to Nigerian bank
5. All transactions in NGN
```

**New Flow (Multi-Country):**

```
1. User signs up → Select country (NG/GH/KE/CI/ZA)
2. User creates DVA → Country-specific ID verification:
   - NG: BVN
   - GH: Ghana Card
   - KE: National ID
   - ZA: ID Number
   - CI: May not support DVA yet
3. User funds wallet → Local currency credited (GHS/KES/ZAR/XOF)
4. User withdraws → Country-specific bank transfer
5. Transactions in local currency
```

### Schema Changes Required

```prisma
model User {
  // ... existing fields

  // Update country to enum
  country Country @default(NIGERIA)

  // Country-specific ID verification
  ghanaCardNumber   String? @unique // Ghana
  kenyaNationalId   String? @unique // Kenya
  southAfricaIdNumber String? @unique // South Africa

  // Verification status per country
  ghanaCardVerified     Boolean @default(false)
  kenyaNationalIdVerified Boolean @default(false)
  southAfricaIdVerified Boolean @default(false)
}

enum Country {
  NIGERIA  // NGN
  GHANA    // GHS
  KENYA    // KES
  SOUTH_AFRICA // ZAR
  COTE_DIVOIRE // XOF
}

model Wallet {
  // ... existing fields

  // Currency should match user's country
  currency Currency @default(NGN)
}

enum Currency {
  NGN // Nigerian Naira
  GHS // Ghanaian Cedi
  KES // Kenyan Shilling
  ZAR // South African Rand
  XOF // West African CFA Franc (Côte d'Ivoire)
  USD // Future: for virtual cards
}

// NEW: Currency-specific limits
model CountryConfig {
  id          String   @id @default(uuid())
  country     Country  @unique
  currency    Currency

  // Withdrawal limits in local currency
  minWithdrawal Decimal @db.Decimal(15, 2)
  maxWithdrawal Decimal @db.Decimal(15, 2)

  // Transaction limits per KYC tier (in local currency)
  tier0Limit  Decimal @db.Decimal(15, 2)
  tier1Limit  Decimal @db.Decimal(15, 2)
  tier2Limit  Decimal @db.Decimal(15, 2)
  tier3Limit  Decimal @db.Decimal(15, 2)

  // DVA support
  dvaSupported Boolean @default(true)
  dvaProvider  String? // "paystack-nigeria", "paystack-ghana"

  // Identity verification requirements
  idVerificationRequired Boolean @default(true)
  idType                 String? // "BVN", "GHANA_CARD", "NATIONAL_ID"

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("country_configs")
}

// NEW: Exchange rates for cross-border transfers
model ExchangeRate {
  id String @id @default(uuid())

  // Existing fields for crypto conversion
  fromCurrency String // USD
  toCurrency   String // NGN
  rate         Decimal @db.Decimal(10, 2)

  // Add country-to-country rates
  fromCountry Country?
  toCountry   Country?

  // Fee for cross-border transfers
  platformFeePercent Decimal @db.Decimal(5, 2) // e.g., 3.00%

  isActive Boolean @default(true)
  setBy    String // Admin user ID
  setAt    DateTime @default(now())

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([fromCurrency, toCurrency, isActive])
  @@index([fromCountry, toCountry, isActive])
}
```

### Cross-Border Transfer Flow

**Scenario:** Kenyan user wants to send money to Nigerian user

```typescript
async sendCrossBorder(
  senderId: string,
  recipientId: string,
  amountInSenderCurrency: number, // e.g., 1000 KES
): Promise<CrossBorderTransferResponse> {

  const sender = await this.prisma.user.findUnique({
    where: { id: senderId },
    include: { wallets: true }
  });

  const receiver = await this.prisma.user.findUnique({
    where: { id: recipientId },
    include: { wallets: true }
  });

  // 1. Get sender's wallet (KES)
  const senderWallet = sender.wallets.find(w => w.type === 'NAIRA');
  // sender.country = KENYA, senderWallet.currency = KES

  // 2. Get receiver's wallet (NGN)
  const receiverWallet = receiver.wallets.find(w => w.type === 'NAIRA');
  // receiver.country = NIGERIA, receiverWallet.currency = NGN

  // 3. Get exchange rate KES → NGN
  const exchangeRate = await this.prisma.exchangeRate.findFirst({
    where: {
      fromCountry: sender.country, // KENYA
      toCountry: receiver.country, // NIGERIA
      isActive: true,
    },
    orderBy: { setAt: 'desc' },
  });

  if (!exchangeRate) {
    throw new BadRequestException('Cross-border transfer not supported for this route');
  }

  // 4. Calculate conversion
  // Example: 1000 KES × 3.2 NGN/KES = 3200 NGN
  const amountInReceiverCurrency = amountInSenderCurrency * Number(exchangeRate.rate);

  // 5. Calculate fee (e.g., 3% of sender amount)
  const feePercent = Number(exchangeRate.platformFeePercent);
  const fee = amountInSenderCurrency * (feePercent / 100);
  const totalDebit = amountInSenderCurrency + fee;

  // 6. Debit sender (KES), credit receiver (NGN)
  const result = await this.prisma.$transaction(async (tx) => {
    // Debit sender's KES wallet
    const newSenderBalance = senderWallet.balance.minus(totalDebit);
    await tx.wallet.update({
      where: { id: senderWallet.id },
      data: { balance: newSenderBalance },
    });

    // Credit receiver's NGN wallet
    const newReceiverBalance = receiverWallet.balance.plus(amountInReceiverCurrency);
    await tx.wallet.update({
      where: { id: receiverWallet.id },
      data: { balance: newReceiverBalance },
    });

    // Create transactions with currency info
    const senderTxn = await tx.transaction.create({
      data: {
        userId: senderId,
        type: TransactionType.TRANSFER,
        amount: new Decimal(amountInSenderCurrency),
        fee: new Decimal(fee),
        totalAmount: new Decimal(totalDebit),
        currency: 'KES',
        balanceBefore: senderWallet.balance,
        balanceAfter: newSenderBalance,
        description: `Sent ${amountInSenderCurrency} KES to ${receiver.firstName}`,
        metadata: {
          recipientId: receiver.id,
          originalAmount: amountInSenderCurrency,
          originalCurrency: 'KES',
          convertedAmount: amountInReceiverCurrency,
          convertedCurrency: 'NGN',
          exchangeRate: Number(exchangeRate.rate),
          feePercent,
        },
      },
    });

    const receiverTxn = await tx.transaction.create({
      data: {
        userId: receiver.id,
        type: TransactionType.DEPOSIT,
        amount: new Decimal(amountInReceiverCurrency),
        currency: 'NGN',
        balanceBefore: receiverWallet.balance,
        balanceAfter: newReceiverBalance,
        description: `Received ${amountInReceiverCurrency} NGN from ${sender.firstName}`,
        metadata: {
          senderId: sender.id,
          originalAmount: amountInSenderCurrency,
          originalCurrency: 'KES',
        },
      },
    });

    return { senderTxn, receiverTxn };
  });

  return {
    debitedAmount: `${totalDebit} KES`,
    creditedAmount: `${amountInReceiverCurrency} NGN`,
    exchangeRate: Number(exchangeRate.rate),
    fee: `${fee} KES (${feePercent}%)`,
  };
}
```

### Paystack Multi-Country API Changes

```typescript
// paystack.service.ts

async getBanksByCountry(country: Country): Promise<BankInfo[]> {
  const currencyMap = {
    NIGERIA: 'NGN',
    GHANA: 'GHS',
    KENYA: 'KES',
    SOUTH_AFRICA: 'ZAR',
    COTE_DIVOIRE: 'XOF',
  };

  const currency = currencyMap[country];

  const response = await fetch(`${this.baseUrl}/bank?currency=${currency}`, {
    headers: { Authorization: `Bearer ${this.secretKey}` },
  });

  const data = await response.json();
  return data.data;
}

async createDedicatedVirtualAccountMultiCountry(
  customerCode: string,
  country: Country,
  preferredBank: string,
  identificationData: {
    type: 'bvn' | 'ghana_card' | 'national_id' | 'id_number';
    number: string;
    firstName: string;
    lastName: string;
    phone: string;
  },
): Promise<VirtualAccountResponse> {
  // Paystack requires different parameters per country
  const payload: any = {
    customer: customerCode,
    preferred_bank: preferredBank,
    country: country.substring(0, 2), // "NG", "GH", "KE", "ZA"
  };

  // Add country-specific verification
  if (country === 'NIGERIA') {
    payload.bvn = identificationData.number;
  } else if (country === 'GHANA') {
    payload.ghana_card = identificationData.number;
  } else if (country === 'KENYA') {
    payload.national_id = identificationData.number;
  } else if (country === 'SOUTH_AFRICA') {
    payload.id_number = identificationData.number;
  }

  const response = await fetch(`${this.baseUrl}/dedicated_account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!data.status) {
    throw new BadRequestException(data.message);
  }

  return data.data;
}
```

### Country-Specific Withdrawal Limits

**Nigeria:**

- Tier 0: ₦50,000 daily
- Tier 1: ₦300,000 daily
- Tier 2: ₦5,000,000 daily
- Tier 3: Unlimited

**Ghana:** (1 GHS ≈ 0.08 USD ≈ 130 NGN)

- Tier 0: GHS 400 daily (~₦50K equivalent)
- Tier 1: GHS 2,400 daily (~₦300K)
- Tier 2: GHS 40,000 daily (~₦5M)
- Tier 3: Unlimited

**Kenya:** (1 KES ≈ 0.0077 USD ≈ 12 NGN)

- Tier 0: KES 4,000 daily (~₦50K)
- Tier 1: KES 24,000 daily (~₦300K)
- Tier 2: KES 400,000 daily (~₦5M)
- Tier 3: Unlimited

---

## Feature 3: International USD Card Payments

### Overview

Accept payments from international credit/debit cards in USD, enabling:

- Subscription model businesses to charge in USD
- E-commerce businesses to accept international payments
- Crypto wallet funding from USD cards

### Current State Analysis

#### ✅ What We Have:

- **Paystack payment gateway**: Already integrated for NGN cards
- **Card payment endpoint**: `/transactions/initialize` (NGN only)
- **Webhook handling**: `charge.success` event processing
- **Transaction model**: Supports any currency via `currency` field

#### ❌ What We're Missing:

- **USD payment initialization**: No endpoint to accept USD amounts
- **USD wallet**: No `WalletType.USD` logic (schema has it but unused)
- **USD to NGN conversion**: No auto-conversion flow
- **International card approval**: Must request Paystack to enable USD

### Paystack USD Payment Requirements

From Paystack Dashboard notification:

> "To receive payments from international cards in US dollars, please send us a request"

**What this means:**

1. **Not automatic**: Requires Paystack approval per business
2. **Business verification**: Must prove legitimate use case
3. **Compliance**: May require additional KYC/business docs
4. **Settlement**: USD payments settle to USD balance (needs NGN conversion)

**Use Cases Paystack Approves:**

- SaaS/subscription businesses with international customers
- E-commerce selling to US/EU markets
- Freelance platforms connecting Nigerian talent with global clients
- Digital products/services targeting diaspora

**Use Cases Paystack May Reject:**

- Pure domestic businesses (should use NGN)
- Businesses trying to bypass FX controls
- High-risk industries

### Implementation Flow

**Option 1: USD Wallet + Manual Conversion**

```
1. User selects "Fund with USD Card"
2. API creates Paystack payment link (currency: USD)
3. User pays $100 USD with international card
4. Webhook: charge.success → Credit user's USD wallet
5. User manually converts USD → NGN at admin-set rate
6. NGN credited to NAIRA wallet
```

**Option 2: Auto-Convert to NGN**

```
1. User selects "Fund with USD Card"
2. API shows: "$100 USD = ₦165,000 NGN (Rate: ₦1650/$)"
3. User confirms and pays
4. Webhook: charge.success → Immediate conversion
5. NGN credited to NAIRA wallet (no USD wallet involved)
```

**Recommendation:** Start with Option 2 (auto-convert) for simplicity.

### Schema Changes

```prisma
enum WalletType {
  NAIRA  // Existing
  CRYPTO // Existing
  USD    // ACTIVATE THIS
}

model Transaction {
  // ... existing fields

  // Add original currency tracking
  originalAmount   Decimal? @db.Decimal(15, 2)
  originalCurrency String?  // "USD"
  conversionRate   Decimal? @db.Decimal(10, 2) // e.g., 1650.00
}

// Reuse existing ExchangeRate model
model ExchangeRate {
  // ... existing fields

  // Add USD → NGN rates
  fromCurrency String // "USD"
  toCurrency   String // "NGN"
  rate         Decimal @db.Decimal(10, 2) // 1650.00
}
```

### API Implementation

```typescript
// transactions.controller.ts

@Post('initialize-usd')
@UseGuards(JwtAuthGuard)
async initializeUsdPayment(
  @CurrentUser() user: User,
  @Body() dto: InitializeUsdPaymentDto, // { amountUsd: number }
): Promise<InitializePaymentResponse> {
  return this.transactionsService.initializeUsdPayment(user.id, dto.amountUsd);
}

// transactions.service.ts

async initializeUsdPayment(
  userId: string,
  amountUsd: number,
): Promise<InitializePaymentResponse> {
  const user = await this.usersService.findById(userId);

  // Get current USD → NGN rate
  const exchangeRate = await this.prisma.exchangeRate.findFirst({
    where: {
      fromCurrency: 'USD',
      toCurrency: 'NGN',
      isActive: true,
    },
    orderBy: { setAt: 'desc' },
  });

  if (!exchangeRate) {
    throw new BadRequestException('USD payments not available');
  }

  const rate = Number(exchangeRate.rate);
  const amountNgn = amountUsd * rate;

  // Generate reference
  const reference = this.generateReference('usd_deposit');

  // Initialize Paystack payment in USD
  const payment = await this.paystackService.initializePayment(
    user.email,
    amountUsd, // Amount in USD
    reference,
    'USD', // Currency parameter
    {
      userId: user.id,
      originalAmountUsd: amountUsd,
      expectedAmountNgn: amountNgn,
      conversionRate: rate,
    },
  );

  // Create pending transaction
  await this.prisma.transaction.create({
    data: {
      reference,
      userId: user.id,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      amount: new Decimal(amountNgn), // Store NGN equivalent
      currency: 'NGN',
      originalAmount: new Decimal(amountUsd),
      originalCurrency: 'USD',
      conversionRate: new Decimal(rate),
      description: `Deposit via USD card: $${amountUsd} USD`,
      provider: 'paystack',
      providerRef: payment.reference,
    },
  });

  return {
    authorizationUrl: payment.authorization_url,
    reference: payment.reference,
    message: `You will be charged $${amountUsd} USD. Your wallet will be credited ₦${amountNgn.toLocaleString()} NGN`,
  };
}

// Webhook handler: payments.controller.ts

async handleChargeSuccess(webhookData: any) {
  const { reference, amount, currency, fees } = webhookData.data;

  const transaction = await this.prisma.transaction.findUnique({
    where: { reference },
  });

  if (currency === 'USD') {
    // USD payment - convert to NGN
    const amountUsd = amount / 100; // Paystack sends in cents
    const metadata = transaction.metadata as any;
    const amountNgn = metadata.expectedAmountNgn;

    // Credit NAIRA wallet
    await this.transactionsService.processVirtualAccountCredit(
      transaction.userId,
      amountNgn,
      reference,
      fees / 100, // Fee in USD (convert to NGN if needed)
      {
        originalAmountUsd: amountUsd,
        originalCurrency: 'USD',
        conversionRate: metadata.conversionRate,
      },
    );
  } else {
    // Normal NGN payment
    await this.transactionsService.processVirtualAccountCredit(
      transaction.userId,
      amount / 100,
      reference,
      fees / 100,
    );
  }
}
```

### Paystack Setup Required

**Step 1: Request USD Payment Access**

1. Email Paystack support (support@paystack.com)
2. Subject: "Request for International Card Payment Access"
3. Provide:
   - Business name: MularPay
   - Business type: Fintech / Digital Wallet
   - Use case: "Enable users to fund wallets from international USD cards for crypto purchases and cross-border transfers"
   - Expected volume: Start with $10K/month, grow to $100K/month
   - Compliance: Registered business with CAC, CBN licenses (if applicable)

**Step 2: Update Paystack Settings**

- Dashboard → Settings → Payments
- Enable "International Payments"
- Set currencies: NGN, USD
- Set settlement preference: Auto-convert USD → NGN or keep USD balance

**Step 3: Test Implementation**

- Use Paystack test cards: `4084084084084081` (Visa - International)
- Test with test secret key first
- Verify webhooks receive USD amounts correctly

---

## Legal & Compliance

### Nigeria Regulations

#### 1. **Central Bank of Nigeria (CBN)**

**Licenses Required:**

- **Payment Service Bank (PSB) License** - For wallet services (₦2B minimum capital)
  - OR **Switching & Processing License** (₦2B minimum capital)
  - OR **Mobile Money Operator (MMO) License** (₦2B minimum capital)
- **Super Agent License** - For VTU services

**Current Status Risk:** If MularPay doesn't have these licenses, operating is **illegal**.

**Penalty:** Up to ₦10M fine + shutdown order.

**Documentation Required:**

- CAC registration certificate
- Tax clearance certificate
- Board resolutions
- Business plan
- AML/CFT compliance policy
- Data protection policy

**Timeline:** 6-12 months for approval.

#### 2. **Foreign Exchange Regulations**

**Law:** Foreign Exchange (Monitoring and Miscellaneous Provisions) Act 1995

**Key Restrictions:**

- **Cross-border transfers**: Must use authorized dealers (commercial banks)
- **Multi-currency accounts**: Require Central Bank approval
- **USD transactions**: Domiciliary accounts only for trade/services

**What This Means for MularPay:**

- ❌ **Cannot offer multi-currency wallets without CBN approval**
- ❌ **Cannot facilitate cross-border P2P transfers directly**
- ✅ **Can partner with licensed banks** to offer cross-border transfers (as aggregator)
- ✅ **Can accept USD cards** if funds are immediately converted to NGN

**Penalty:** ₦50,000 - ₦500,000 fine + 2 years imprisonment for illegal FX operations.

#### 3. **Know Your Customer (KYC) Requirements**

**Law:** Money Laundering (Prevention and Prohibition) Act 2022

**Minimum KYC:**

- Full name
- Date of birth
- Address (residential)
- BVN (Bank Verification Number)
- Photo ID (National ID, Driver's License, International Passport)

**Transaction Limits Without KYC:**

- ₦50,000 daily (Tier 0)
- Must upgrade to Tier 2 for ₦5M+ transactions

**Penalty:** ₦5M - ₦10M fine for non-compliance.

---

### Ghana Regulations

#### 1. **Bank of Ghana (BoG)**

**Licenses Required:**

- **Payment Service Provider (PSP) License** - For electronic money services
- **Dedicated Electronic Money Issuer (DEMI) License** - For wallet services

**Capital Requirement:** GHS 5M (~₦650M)

**KYC Requirements:**

- Ghana Card (mandatory national ID)
- TIN (Tax Identification Number)
- Proof of address

**Timeline:** 6-9 months.

#### 2. **Cross-Border Transfers**

**Status:** Ghana is part of **ECOWAS** (Economic Community of West African States).

**ECOWAS Payment Systems:**

- Can transfer GHS ↔ XOF (Côte d'Ivoire) via WAMZ (West African Monetary Zone)
- Requires partnership with WAMZ-authorized banks

**To/From Nigeria:** No direct retail corridor. Must use SWIFT or Western Union-style remittance.

---

### Kenya Regulations

#### 1. **Central Bank of Kenya (CBK)**

**Licenses Required:**

- **Payment Service Provider License** - For digital wallets
- **Remittance License** - For cross-border transfers

**Capital Requirement:** KES 100M (~₦120M)

**KYC Requirements:**

- National ID or Passport
- KRA PIN (Tax ID)
- Proof of address

**Timeline:** 6-12 months.

#### 2. **M-Pesa Integration**

**Opportunity:** Kenya's M-Pesa has 30M+ users.

**Partnership Required:** Must integrate with Safaricom's M-Pesa API.

**Alternative:** Use Paystack Kenya (launched 2022) for card/M-Pesa payments.

---

### South Africa Regulations

#### 1. **South African Reserve Bank (SARB)**

**Licenses Required:**

- **Financial Services Provider (FSP) License** - For payment services
- **Exemption 17** - For low-value stored value accounts

**Capital Requirement:** ZAR 5M (~₦220M)

**KYC Requirements:**

- ID Number (South African citizens)
- Passport (foreigners)
- FICA (Financial Intelligence Centre Act) compliance

**Timeline:** 12-18 months.

#### 2. **Cross-Border Transfers**

**Status:** South Africa is part of **SADC** (Southern African Development Community).

**SIRESS (SADC Integrated Regional Electronic Settlement System):**

- Can transfer ZAR to other SADC countries (Zimbabwe, Zambia, etc.)
- Not connected to West Africa (Nigeria, Ghana)

---

### Côte d'Ivoire Regulations

#### 1. **BCEAO (Central Bank of West African States)**

**Currency:** XOF (West African CFA Franc) - shared with Benin, Burkina Faso, Mali, Niger, Senegal, Togo, Guinea-Bissau.

**Licenses Required:**

- **EMI License (Établissement de Monnaie Électronique)** - For e-wallets
- Issued by BCEAO and country-level regulator

**Capital Requirement:** XOF 2B (~₦2.6M USD ~₦4B NGN)

**KYC Requirements:**

- National ID (Carte d'Identité Nationale)
- NINA (Numéro d'Identification National)

**Timeline:** 12-18 months.

#### 2. **Cross-Border Within CFA Zone**

**Status:** All 8 WAEMU countries use XOF. Transfers are domestic.

**To Nigeria:** No direct corridor. Must use banks or remittance companies.

---

### Cross-Border Transfer Compliance Summary

| Route                        | Possible?    | Regulatory Path                                          | Estimated Cost |
| ---------------------------- | ------------ | -------------------------------------------------------- | -------------- |
| **Nigeria ↔ Ghana**         | ⚠️ Difficult | Requires PSP license in both + ECOWAS partnership        | $500K+ setup   |
| **Nigeria ↔ Kenya**         | ⚠️ Difficult | No regional integration. Needs remittance licenses.      | $500K+ setup   |
| **Nigeria ↔ South Africa**  | ⚠️ Difficult | No regional integration. Needs remittance licenses.      | $500K+ setup   |
| **Nigeria ↔ Côte d'Ivoire** | ⚠️ Difficult | ECOWAS member but different currency zones (NGN vs XOF). | $500K+ setup   |
| **Ghana ↔ Côte d'Ivoire**   | ✅ Easier    | Both in WAEMU/ECOWAS. GHS ↔ XOF via authorized banks.   | $200K+ setup   |
| **Within CFA Zone**          | ✅ Easy      | Same currency (XOF). Domestic transfers.                 | Minimal        |

---

### Recommended Legal Strategy

#### **Phase 1: Focus on Nigeria Only** (Current)

- ✅ Get CBN license (PSB or MMO)
- ✅ Implement P2P transfers with tags (no license needed - internal transfers)
- ✅ Accept USD cards with auto-convert to NGN (CBN approval needed)
- ⏱️ **Timeline:** 6-12 months
- 💰 **Cost:** ₦5M - ₦20M (legal fees, compliance setup)

#### **Phase 2: Expand to 1-2 Countries** (12-18 months)

- Target Ghana (Paystack support + ECOWAS proximity)
- Apply for BoG PSP license
- Each country operates independently (no cross-border yet)
- ⏱️ **Timeline:** 12-18 months per country
- 💰 **Cost:** $200K - $500K per country

#### **Phase 3: Cross-Border Transfers** (24+ months)

- Partner with licensed remittance operators (e.g., Flutterwave, Chipper Cash)
- OR build own remittance infrastructure with MTL (Money Transfer License) in each country
- Focus on high-volume corridors (Nigeria ↔ Ghana, Nigeria ↔ UK Diaspora)
- ⏱️ **Timeline:** 24+ months
- 💰 **Cost:** $1M+ (legal, partnerships, compliance)

---

## Implementation Roadmap

### Phase 1: P2P Transfers with Tags (Fastest - 2-4 weeks)

**Technical Complexity:** 🟢 Low (internal logic only)
**Legal Complexity:** 🟢 None (internal transfers)
**Revenue Impact:** 🟡 Medium (increase user engagement)

**Steps:**

1. ✅ Verify schema supports tags → Add `tag` field to User model
2. ✅ Create P2PTransfer model
3. ✅ Implement tag lookup endpoint
4. ✅ Implement send-to-user endpoint with atomic transactions
5. ✅ Add P2P-specific transaction limits
6. ✅ Update mobile/web UI to support @tag search
7. ✅ Test with internal users
8. ✅ Launch to public

**Blockers:** None (can start immediately)

---

### Phase 2: USD Card Payments (Medium - 4-8 weeks)

**Technical Complexity:** 🟡 Medium (FX conversion logic)
**Legal Complexity:** 🟡 Medium (Paystack approval needed)
**Revenue Impact:** 🟢 High (tap into diaspora market)

**Steps:**

1. ⏱️ Submit USD payment request to Paystack (2-4 weeks approval time)
2. ✅ Create ExchangeRate admin management (set USD → NGN rate)
3. ✅ Implement USD payment initialization endpoint
4. ✅ Update webhook handler to process USD payments
5. ✅ Add USD → NGN conversion logic
6. ✅ Update UI to show USD payment option
7. ⚠️ Test with Paystack test USD cards
8. ⏱️ Wait for Paystack production approval
9. ✅ Launch to public

**Blockers:**

- Paystack approval (2-4 weeks)
- May require additional business verification

---

### Phase 3: Multi-Currency (Hardest - 6-12 months)

**Technical Complexity:** 🔴 High (country-specific logic)
**Legal Complexity:** 🔴 Very High (licenses in 4+ countries)
**Revenue Impact:** 🟢 Very High (10x addressable market)

**Steps:**

1. 🔴 Research & choose target country (Ghana recommended)
2. 🔴 Engage local legal counsel
3. 🔴 Apply for PSP license (~12 months)
4. ✅ Build country-specific modules (parallel with legal)
   - Country enum in User model
   - CountryConfig model
   - Multi-currency wallet logic
   - Country-specific DVA creation
   - Country-specific bank lists
5. ✅ Implement cross-border FX conversion
6. ⚠️ Test in sandbox environment
7. ⏱️ Wait for license approval
8. 🟢 Soft launch in new country
9. 🟢 Monitor compliance & adjust
10. 🔁 Repeat for next country

**Blockers:**

- License approval (6-18 months per country)
- Capital requirements (₦650M+ per country)
- Ongoing compliance costs

---

## Risk Analysis

### P2P Transfers Risks

| Risk                 | Probability | Impact  | Mitigation                                                    |
| -------------------- | ----------- | ------- | ------------------------------------------------------------- |
| **Fraud/Scams**      | 🟡 Medium   | 🔴 High | Transaction PIN, rate limiting, ML fraud detection            |
| **Chargebacks**      | 🟢 Low      | 🟢 Low  | Internal transfers (no external provider)                     |
| **Money Laundering** | 🟡 Medium   | 🔴 High | Daily limits, KYC enforcement, suspicious activity monitoring |
| **Tag Squatting**    | 🟡 Medium   | 🟢 Low  | Reserved words, change fees, admin reclaim policy             |

**Recommendation:** ✅ Low-risk, high-reward. Proceed with caution on limits.

---

### USD Card Payments Risks

| Risk                    | Probability | Impact    | Mitigation                                            |
| ----------------------- | ----------- | --------- | ----------------------------------------------------- |
| **Paystack Rejection**  | 🟡 Medium   | 🟡 Medium | Strong use case, compliance docs ready                |
| **FX Volatility**       | 🟢 Low      | 🟡 Medium | Update rates daily, add buffer (e.g., +2% markup)     |
| **International Fraud** | 🟡 Medium   | 🔴 High   | Paystack's fraud detection, velocity limits           |
| **CBN Scrutiny**        | 🟡 Medium   | 🔴 High   | Auto-convert to NGN (no USD wallet), stay under radar |

**Recommendation:** ✅ Medium-risk, high-reward. Start small and scale.

---

### Multi-Currency Risks

| Risk                       | Probability | Impact  | Mitigation                                            |
| -------------------------- | ----------- | ------- | ----------------------------------------------------- |
| **License Rejection**      | 🟡 Medium   | 🔴 High | Hire local experts, strong business case              |
| **Regulatory Changes**     | 🟡 Medium   | 🔴 High | Diversify countries, stay updated                     |
| **Operational Complexity** | 🔴 High     | 🔴 High | Hire country managers, build scalable systems         |
| **Capital Burden**         | 🔴 High     | 🔴 High | Raise funding ($2M+), prioritize profitable countries |

**Recommendation:** ⚠️ High-risk, very high-reward. Only pursue with strong funding.

---

## Cost Estimates

### P2P Transfers

- **Development:** 2 engineers × 2 weeks = $4K - $8K
- **Testing:** $500
- **Legal Review:** $1K - $2K (ensure AML compliance)
- **Total:** $5.5K - $10.5K

### USD Card Payments

- **Development:** 1 engineer × 4 weeks = $4K - $8K
- **Paystack Application Fee:** $0 (free)
- **FX Buffer Loss:** ~2% on transactions (operational cost)
- **Legal Review:** $2K - $5K (CBN compliance)
- **Total:** $6K - $13K (one-time) + ongoing FX management

### Multi-Currency (Per Country)

- **Legal & Licensing:** $50K - $200K
- **Capital Requirement:** $220K - $650K (refundable if you shut down)
- **Development:** 3 engineers × 6 months = $50K - $100K
- **Local Operations:** $5K - $10K/month (staff, office, compliance)
- **Total:** $300K - $1M per country (first year)

---

## Recommendations

### ✅ **Immediate Action: P2P Transfers**

- **Why:** Low-hanging fruit. Instant value to users. No legal blockers.
- **Timeline:** 2-4 weeks
- **Investment:** $10K
- **Expected ROI:** 20-30% increase in user engagement, 10% increase in transaction volume

### ✅ **Short-Term: USD Card Payments**

- **Why:** Tap into diaspora market. High-value users. Paystack approval likely.
- **Timeline:** 6-8 weeks (including Paystack approval)
- **Investment:** $15K
- **Expected ROI:** $50K - $100K/month in new deposits (at 2% FX margin = $1K - $2K profit/month)

### ⚠️ **Long-Term: Multi-Currency**

- **Why:** Massive market expansion. Competitive moat. But very expensive.
- **Timeline:** 12-24 months per country
- **Investment:** $1M+ for first country
- **Expected ROI:** 5x user base, but only profitable at scale (100K+ users per country)
- **Alternative:** Partner with existing multi-currency platforms (Flutterwave, Chipper Cash) as white-label solution

---

## Next Steps

1. **Create feature branch:**

   ```bash
   git checkout -b feature/multi-currency-p2p
   ```

2. **Start with P2P Transfers:**
   - Add schema migrations
   - Implement backend endpoints
   - Update mobile/web UI

3. **Parallel: Apply for USD Payments:**
   - Draft email to Paystack
   - Gather business docs (CAC, compliance policies)
   - Submit request

4. **Research Multi-Currency:**
   - Engage legal counsel in Ghana
   - Request quotations for PSP license application
   - Build financial model (capital needs, break-even analysis)

5. **Review & Decide:**
   - Present analysis to stakeholders
   - Get approval for P2P + USD
   - Defer multi-currency until Series A funding

---

## Conclusion

**Feature Viability Summary:**

| Feature            | Technical Feasibility | Legal Feasibility           | Recommended Action               |
| ------------------ | --------------------- | --------------------------- | -------------------------------- |
| **P2P Transfers**  | ✅ Easy               | ✅ No blockers              | ✅ **Start immediately**         |
| **USD Payments**   | ✅ Medium             | ✅ Paystack approval needed | ✅ **Start application process** |
| **Multi-Currency** | ⚠️ Hard               | 🔴 Requires $1M+ licenses   | ⏸️ **Defer until funded**        |

**Best Path Forward:**

1. Ship P2P transfers in 4 weeks → Boost engagement
2. Launch USD payments in 8 weeks → Capture diaspora market
3. Validate demand for multi-currency via surveys
4. Raise Series A ($2M+) to fund multi-currency expansion
5. Start with Ghana (Paystack support, ECOWAS proximity)
6. Build cross-border transfer partnerships as stopgap solution

---

**Document Version:** 1.0  
**Last Updated:** December 1, 2024  
**Next Review:** After P2P launch (estimated January 2025)
