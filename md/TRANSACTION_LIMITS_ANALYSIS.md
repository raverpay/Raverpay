# Transaction Limits & Wallet Funding Analysis

**Date:** 2 December 2024  
**Status:** Current Implementation Analysis + Recommendations

---

## 🔍 Current Implementation Analysis

### 1. **What Happens When Users Transfer More Than Tier Limit?**

#### Current Behavior:

**For Outgoing Transactions (Withdrawals, P2P, Airtime, etc.):**

```typescript
// Transaction is BLOCKED before execution
✅ PREVENTED: User cannot send/withdraw more than their tier limit
🚫 Error thrown: "Daily limit exceeded. You have ₦X remaining out of ₦Y"
```

**For Incoming Transactions (Wallet Funding via DVA/Card):**

```typescript
// Transaction is ALLOWED - NO LIMITS ENFORCED
⚠️ UNRESTRICTED: User can fund wallet with ANY amount
💰 Credits immediately to wallet balance
✅ Transaction recorded as COMPLETED
```

---

## ⚠️ CRITICAL FINDINGS

### **Issue #1: No Funding Limits**

**Current Code:** `processVirtualAccountCredit()` in `transactions.service.ts` (lines 448-548)

```typescript
async processVirtualAccountCredit(
  reference: string,
  amount: number,
  accountNumber: string,
  paystackFee: number = 0,
): Promise<void> {
  // ❌ NO LIMIT CHECK HERE
  // User can fund ₦10,000,000 even if they're TIER_0 (₦50K daily limit)

  const netAmount = amount - paystackFee;

  // Directly credits wallet without checking tier limits
  await this.prisma.$transaction([
    this.prisma.wallet.update({ /* credit balance */ }),
    this.prisma.transaction.create({ /* record deposit */ }),
  ]);
}
```

**Risk Assessment:**

- 🔴 **Money Laundering Risk:** TIER_0 user (unverified) can hold ₦10M+ in wallet
- 🔴 **Regulatory Risk:** CBN requires transaction limits based on KYC level
- 🔴 **Withdrawal Abuse:** User funds ₦1M, tries to withdraw (blocked by limit), but money is stuck
- 🟡 **User Confusion:** "Why can I deposit ₦500K but only withdraw ₦50K?"

---

### **Issue #2: Inconsistent Limit Enforcement**

| Action             | Limit Check | Per-Transaction Limit | Daily Limit |
| ------------------ | ----------- | --------------------- | ----------- |
| **Deposit (DVA)**  | ❌ NO       | ❌ NO                 | ❌ NO       |
| **Deposit (Card)** | ❌ NO       | ❌ NO                 | ❌ NO       |
| **Withdraw**       | ✅ YES      | ✅ YES                | ✅ YES      |
| **P2P Send**       | ✅ YES      | ✅ YES                | ✅ YES      |
| **Airtime**        | ✅ YES      | ❌ NO\*               | ✅ YES      |
| **Data**           | ✅ YES      | ❌ NO\*               | ✅ YES      |
| **Bills**          | ✅ YES      | ❌ NO\*               | ✅ YES      |

\*VTU services have daily limits but no per-transaction limits configured

---

## 📊 Current Tier Limits

### TIER_0 (Unverified - No Email/Phone)

```
Daily Limit:        ₦50,000
Per Transaction:    ₦20,000
Required Action:    Email + Phone verification
CBN Classification: Low-risk account
```

### TIER_1 (Email + Phone Verified)

```
Daily Limit:        ₦300,000
Per Transaction:    ₦100,000
Required Action:    BVN verification recommended
CBN Classification: Medium-risk account
```

### TIER_2 (BVN Verified)

```
Daily Limit:        ₦5,000,000
Per Transaction:    ₦1,000,000
Required Action:    Full KYC for unlimited
CBN Classification: Low-risk account
```

### TIER_3 (Full KYC)

```
Daily Limit:        Unlimited
Per Transaction:    Unlimited
Required Action:    None
CBN Classification: Fully compliant
```

---

## 🏛️ Industry Standards & Best Practices

### **Standard Approach: Deposit Limits Should Match Withdrawal Limits**

#### ✅ **Flutterwave Approach:**

```
TIER_0: ₦50K daily deposit limit = ₦50K daily withdrawal limit
TIER_1: ₦300K daily deposit limit = ₦300K daily withdrawal limit
TIER_2: ₦5M daily deposit limit = ₦5M daily withdrawal limit
```

#### ✅ **Opay Approach:**

```
TIER_0: ₦10K daily (both ways)
TIER_1: ₦200K daily (both ways)
TIER_2: ₦2M daily (both ways)
```

#### ✅ **Kuda Approach:**

```
TIER_1: ₦50K daily (both ways) + prompt to upgrade
TIER_2: ₦200K daily (both ways)
TIER_3: Unlimited (both ways)
```

**Key Principle:** _If you can't withdraw it, you shouldn't be able to deposit it._

---

## 💡 Recommended Solutions

### **Option 1: Enforce Deposit Limits (Recommended)**

**Implementation:**

```typescript
async processVirtualAccountCredit(
  reference: string,
  amount: number,
  accountNumber: string,
  paystackFee: number = 0,
): Promise<void> {
  const netAmount = amount - paystackFee;

  // 1. Get user and check tier
  const virtualAccount = await this.prisma.virtualAccount.findUnique({
    where: { accountNumber },
    include: { user: { select: { kycTier: true } } },
  });

  // 2. Check single transaction limit
  const singleTxLimit = this.getSingleTransactionLimit(virtualAccount.user.kycTier);
  if (amount > singleTxLimit) {
    // REJECT DEPOSIT - Send notification to user
    await this.notifyDepositRejected(
      virtualAccount.userId,
      amount,
      singleTxLimit,
      'Single transaction limit exceeded'
    );
    throw new BadRequestException(
      `Deposit of ₦${amount.toLocaleString()} exceeds your tier limit of ₦${singleTxLimit.toLocaleString()} per transaction.`
    );
  }

  // 3. Check daily deposit limit
  const limitCheck = await this.limitsService.checkDailyLimit(
    virtualAccount.userId,
    amount,
    TransactionLimitType.DEPOSIT // NEW enum value needed
  );

  if (!limitCheck.canProceed) {
    // REJECT DEPOSIT - Send notification to user
    await this.notifyDepositRejected(
      virtualAccount.userId,
      amount,
      limitCheck.remaining,
      'Daily limit exceeded'
    );
    throw new BadRequestException(
      `Daily deposit limit exceeded. You have ₦${limitCheck.remaining.toLocaleString()} remaining out of ₦${limitCheck.limit.toLocaleString()}.`
    );
  }

  // 4. Process deposit (existing logic)
  await this.prisma.$transaction([
    this.prisma.wallet.update({ /* credit balance */ }),
    this.prisma.transaction.create({ /* record deposit */ }),
  ]);

  // 5. Increment daily deposit spending
  await this.limitsService.incrementDailySpend(
    virtualAccount.userId,
    amount,
    TransactionLimitType.DEPOSIT
  );
}
```

**Pros:**

- ✅ Full compliance with CBN regulations
- ✅ Prevents money laundering
- ✅ Consistent limits (deposit = withdrawal)
- ✅ Users understand their account capabilities

**Cons:**

- ⚠️ Rejected deposits may frustrate users
- ⚠️ Paystack already processed the transfer (money is "in limbo")
- ⚠️ Need automatic refund mechanism

---

### **Option 2: Allow Deposit, Lock Excess Amount (Hybrid Approach)**

**Implementation:**

```typescript
async processVirtualAccountCredit(
  reference: string,
  amount: number,
  accountNumber: string,
  paystackFee: number = 0,
): Promise<void> {
  const netAmount = amount - paystackFee;

  // Check tier limits
  const limitCheck = await this.limitsService.checkDailyLimit(
    virtualAccount.userId,
    amount,
    TransactionLimitType.DEPOSIT
  );

  if (!limitCheck.canProceed) {
    // ALLOW DEPOSIT but lock wallet
    await this.walletService.lockWallet(
      virtualAccount.userId,
      `Deposit of ₦${amount.toLocaleString()} exceeds your ${virtualAccount.user.kycTier} daily limit of ₦${limitCheck.limit.toLocaleString()}. Please upgrade your KYC tier to unlock your wallet.`
    );

    // Notify user via email + push
    await this.notifyWalletLockedDueToExcessDeposit(
      virtualAccount.userId,
      amount,
      limitCheck.limit
    );
  }

  // Process deposit normally
  await this.prisma.$transaction([
    this.prisma.wallet.update({ /* credit balance */ }),
    this.prisma.transaction.create({ /* record deposit */ }),
  ]);
}
```

**Pros:**

- ✅ User's money is safe (not rejected)
- ✅ Encourages KYC upgrade
- ✅ No Paystack refund complexity

**Cons:**

- ⚠️ User can't access their own money until KYC upgrade
- ⚠️ May cause support tickets ("Why is my wallet locked?")
- ⚠️ Still violates CBN limits (wallet balance exceeds tier)

---

### **Option 3: Allow Deposit, Restrict Withdrawals Only (Current - Not Recommended)**

**Status:** This is what we currently have

**Pros:**

- ✅ User never has rejected deposits
- ✅ Encourages wallet funding

**Cons:**

- 🔴 Violates CBN regulations
- 🔴 Money laundering risk
- 🔴 User frustration ("I deposited ₦500K but can only withdraw ₦50K per day")
- 🔴 Poor UX (asymmetric limits)

---

## 🎯 Recommended Implementation: **Option 1 + Auto-Refund**

### **Enhanced Option 1: Enforce Limits with Automatic Refund**

```typescript
async processVirtualAccountCredit(
  reference: string,
  amount: number,
  accountNumber: string,
  paystackFee: number = 0,
): Promise<void> {
  const netAmount = amount - paystackFee;

  // Get user and check limits
  const virtualAccount = await this.prisma.virtualAccount.findUnique({
    where: { accountNumber },
    include: {
      user: {
        select: { kycTier: true, firstName: true, email: true },
        include: { bankAccounts: { where: { isPrimary: true } } }
      }
    },
  });

  const limitCheck = await this.limitsService.checkDailyLimit(
    virtualAccount.userId,
    amount,
    TransactionLimitType.DEPOSIT
  );

  if (!limitCheck.canProceed) {
    // REJECT DEPOSIT + INITIATE AUTO-REFUND

    // 1. Record rejected transaction
    await this.prisma.transaction.create({
      data: {
        reference,
        userId: virtualAccount.userId,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.FAILED,
        amount: new Decimal(amount),
        fee: new Decimal(paystackFee),
        description: `Deposit rejected: Exceeds ${virtualAccount.user.kycTier} daily limit`,
        metadata: {
          rejectionReason: 'DAILY_LIMIT_EXCEEDED',
          limit: limitCheck.limit,
          spent: limitCheck.spent,
          attemptedAmount: amount,
        },
      },
    });

    // 2. Initiate Paystack refund (if primary bank account exists)
    if (virtualAccount.user.bankAccounts.length > 0) {
      const refundAmount = amount - paystackFee; // Refund net amount (Paystack keeps their fee)

      await this.paystackService.initiateRefundTransfer(
        virtualAccount.user.bankAccounts[0].accountNumber,
        virtualAccount.user.bankAccounts[0].bankCode,
        refundAmount,
        `Refund: Deposit exceeded tier limit`
      );

      // 3. Send notification with refund details
      await this.notificationDispatcher.sendNotification({
        userId: virtualAccount.userId,
        eventType: 'deposit_rejected_refund_initiated',
        category: 'TRANSACTION',
        channels: ['EMAIL', 'PUSH', 'SMS'],
        title: 'Deposit Refund Initiated',
        message: `Your deposit of ₦${amount.toLocaleString()} exceeded your ${virtualAccount.user.kycTier} daily limit of ₦${limitCheck.limit.toLocaleString()}. We're refunding ₦${refundAmount.toLocaleString()} to your bank account within 24 hours.`,
        data: {
          amount,
          refundAmount,
          tier: virtualAccount.user.kycTier,
          limit: limitCheck.limit,
          upgradeUrl: '/kyc/upgrade',
        },
      });
    } else {
      // No bank account - hold in pending balance for manual review
      await this.createPendingRefund(virtualAccount.userId, netAmount, reference);

      await this.notificationDispatcher.sendNotification({
        userId: virtualAccount.userId,
        eventType: 'deposit_rejected_manual_refund',
        category: 'TRANSACTION',
        channels: ['EMAIL', 'PUSH'],
        title: 'Deposit Rejected - Refund Pending',
        message: `Your deposit of ₦${amount.toLocaleString()} exceeded your tier limit. Please contact support to arrange a refund or upgrade your KYC tier.`,
        data: {
          amount,
          tier: virtualAccount.user.kycTier,
          limit: limitCheck.limit,
        },
      });
    }

    throw new BadRequestException(
      `Deposit exceeds ${virtualAccount.user.kycTier} daily limit. Refund initiated.`
    );
  }

  // Process deposit normally
  await this.prisma.$transaction([
    this.prisma.wallet.update({ /* credit balance */ }),
    this.prisma.transaction.create({ /* record deposit */ }),
  ]);

  await this.limitsService.incrementDailySpend(
    virtualAccount.userId,
    amount,
    TransactionLimitType.DEPOSIT
  );
}
```

---

## 🧪 Test Scenarios

### **Scenario 1: TIER_0 User Deposits ₦100K (Exceeds ₦50K Daily Limit)**

**Setup:**

- User: TIER_0 (unverified)
- Daily limit: ₦50,000
- Per-transaction limit: ₦20,000
- Action: User sends ₦100,000 to DVA

**Current Behavior:**

```
1. User sends ₦100,000 to virtual account number
2. Paystack processes transfer (success)
3. Webhook: charge.success fired
4. ✅ Wallet credited with ₦100,000
5. ✅ Transaction recorded as COMPLETED
6. ❌ No limit check performed
7. User now has ₦100K balance but can only withdraw ₦20K per transaction (₦50K daily)
```

**Expected Behavior (Option 1):**

```
1. User sends ₦100,000 to virtual account number
2. Paystack processes transfer (success)
3. Webhook: charge.success fired
4. ❌ Limit check: ₦100K > ₦50K daily limit
5. ❌ Transaction recorded as FAILED
6. 🔄 Paystack refund initiated: ₦100K returned to sender's bank
7. 📧 Notification sent: "Deposit rejected - exceeds tier limit. Upgrade to TIER_1 for ₦300K daily limit."
```

**How to Test:**

```bash
# 1. Create TIER_0 user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "tier0@test.com", "password": "Test1234!", "firstName": "Test", "lastName": "User"}'

# 2. Get virtual account
curl -X GET http://localhost:8000/api/transactions/virtual-account \
  -H "Authorization: Bearer {token}"

# 3. Simulate Paystack webhook (manual trigger)
curl -X POST http://localhost:8000/api/webhooks/paystack \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "TEST_REF_001",
      "amount": 10000000, // ₦100,000 in kobo
      "customer": {"email": "tier0@test.com"},
      "channel": "bank_transfer",
      "fees": 100,
      "metadata": {
        "custom_fields": [
          {"display_name": "Account Number", "value": "<DVA_NUMBER>"}
        ]
      }
    }
  }'

# 4. Check wallet balance
curl -X GET http://localhost:8000/api/wallet/balance \
  -H "Authorization: Bearer {token}"

# Expected: Balance = ₦0 (deposit rejected) OR ₦100K (current behavior)
```

---

### **Scenario 2: TIER_1 User Deposits ₦150K (Within Daily, Exceeds Per-Transaction)**

**Setup:**

- User: TIER_1 (Email + Phone verified)
- Daily limit: ₦300,000
- Per-transaction limit: ₦100,000
- Action: User sends ₦150,000 to DVA in one transaction

**Current Behavior:**

```
✅ Deposit succeeds (no per-transaction limit check on deposits)
```

**Expected Behavior (Option 1):**

```
1. ❌ Per-transaction check: ₦150K > ₦100K limit
2. ❌ Transaction REJECTED
3. 🔄 Auto-refund initiated
4. 📧 Notification: "Split your deposit into ₦100K transactions or upgrade to TIER_2"
```

**How to Test:**

```bash
# 1. Create TIER_1 user + verify email/phone
# 2. Trigger webhook with amount: 15000000 (₦150K in kobo)
# 3. Verify rejection + refund
```

---

### **Scenario 3: User Deposits ₦40K, Then ₦20K (Total ₦60K > ₦50K Daily)**

**Setup:**

- User: TIER_0
- Daily limit: ₦50,000
- Already deposited today: ₦40,000
- Action: User deposits ₦20,000 more

**Current Behavior:**

```
✅ Both deposits succeed
User has ₦60K in wallet (exceeds daily limit)
```

**Expected Behavior (Option 1):**

```
1. First deposit (₦40K): ✅ Allowed (40K < 50K)
2. Second deposit (₦20K): ❌ Check: 40K + 20K = 60K > 50K
3. ❌ Second deposit REJECTED
4. 🔄 ₦20K refunded
5. 📧 "You have ₦10K deposit limit remaining today (₦40K already deposited)"
```

**How to Test:**

```bash
# 1. Simulate first webhook: ₦40K
# 2. Wait 1 second
# 3. Simulate second webhook: ₦20K
# 4. Verify second deposit rejected with "₦10K remaining" message
```

---

## 🛠️ Implementation Checklist

### Phase 1: Add Deposit Tracking (Week 1)

- [ ] Add `DEPOSIT` to `TransactionLimitType` enum in `limits.service.ts`
- [ ] Add `totalDeposits` and `depositCount` to `DailyTransactionLimit` model
- [ ] Update `checkDailyLimit()` to handle `DEPOSIT` type
- [ ] Update `incrementDailySpend()` to track deposits
- [ ] Create migration for schema changes

### Phase 2: Enforce Deposit Limits (Week 1)

- [ ] Update `processVirtualAccountCredit()` with limit checks
- [ ] Add per-transaction limit check before daily limit check
- [ ] Create rejection logic with transaction record
- [ ] Add notification system for rejected deposits
- [ ] Test with staging environment

### Phase 3: Auto-Refund System (Week 2)

- [ ] Create `initiateRefundTransfer()` in `paystackService`
- [ ] Create `createPendingRefund()` for manual review cases
- [ ] Build admin panel to manage pending refunds
- [ ] Add email templates for refund notifications
- [ ] Test refund flow end-to-end

### Phase 4: User Education (Week 2)

- [ ] Add tier limits to mobile app UI
- [ ] Show "Remaining deposit limit" in wallet screen
- [ ] Add tier upgrade prompts when limits approached
- [ ] Update FAQ with deposit limit explanations
- [ ] Create support articles

### Phase 5: Monitoring & Rollout (Week 3)

- [ ] Add Sentry alerts for rejected deposits
- [ ] Track rejection rate by tier
- [ ] Monitor user upgrade rate after rejections
- [ ] Gradual rollout: 10% → 50% → 100% of users
- [ ] Gather user feedback

---

## 📈 Expected Impact

### **Compliance:**

- ✅ Full CBN regulatory compliance
- ✅ Reduced AML/CTF risk score
- ✅ Audit-ready transaction logs

### **User Experience:**

- ⚠️ Short-term: 5-10% rejection rate (TIER_0 users)
- ✅ Long-term: Clearer expectations, fewer support tickets
- ✅ Increased KYC upgrade conversion (expected 30%+)

### **Business:**

- ✅ Reduced fraud exposure
- ✅ Higher-quality user base (more verified users)
- ⚠️ Potential revenue impact from rejected transactions
- ✅ Lower chargeback/dispute rate

---

## 🚨 Risks & Mitigation

| Risk                       | Probability | Impact    | Mitigation                                                    |
| -------------------------- | ----------- | --------- | ------------------------------------------------------------- |
| **User backlash**          | 🟡 Medium   | 🔴 High   | Clear communication, gradual rollout, easy KYC upgrade        |
| **Refund failures**        | 🟢 Low      | 🔴 High   | Manual review queue, 24/7 support escalation                  |
| **Paystack refund delays** | 🟡 Medium   | 🟡 Medium | Set expectations (24-48h), alternative refund methods         |
| **Support ticket surge**   | 🔴 High     | 🟡 Medium | Pre-written responses, chatbot integration, FAQ updates       |
| **Revenue drop**           | 🟢 Low      | 🟡 Medium | Monitor KYC upgrade rate, offer incentives for TIER_1 upgrade |

---

## 📝 Recommendation Summary

**Implement Option 1 with Auto-Refund** because:

1. ✅ **Regulatory Compliance:** Meets CBN requirements
2. ✅ **User Protection:** Clear limits prevent confusion
3. ✅ **Fraud Prevention:** Reduces money laundering risk
4. ✅ **Scalability:** System enforces limits automatically
5. ✅ **Fair UX:** Deposit limits = withdrawal limits

**Timeline:** 3 weeks (development + testing + gradual rollout)

**Priority:** 🔴 **HIGH** - Regulatory requirement

---

## 🎯 Next Steps

1. **Review & Approve:** Get stakeholder sign-off on Option 1
2. **Legal Review:** Confirm CBN compliance with legal counsel
3. **Implementation:** Start Phase 1 (add deposit tracking)
4. **Testing:** Use test scenarios provided above
5. **Rollout:** Gradual deployment with monitoring
6. **Feedback:** Collect user feedback and iterate

---

**Document Version:** 1.0  
**Last Updated:** 2 December 2024  
**Reviewed By:** Pending  
**Approved By:** Pending
