# Transaction Safety Analysis

## Current Implementation Status

### ✅ **1. Atomic Double-Entry Transactions** - IMPLEMENTED

**Status:** ✅ Working correctly

**Evidence:**

- Using Prisma `$transaction` for atomic operations
- Creating both debit and credit transaction records
- Example: P2P transfers create both `_DEBIT` and `_CREDIT` transactions

**Location:** `src/transactions/transactions.service.ts:1499-1591`

```typescript
await this.prisma.$transaction(async (tx) => {
  // Debit sender
  await tx.wallet.update({ ... });
  // Credit receiver
  await tx.wallet.update({ ... });
  // Create sender transaction (debit)
  await tx.transaction.create({ reference: `${reference}_DEBIT`, ... });
  // Create receiver transaction (credit)
  await tx.transaction.create({ reference: `${reference}_CREDIT`, ... });
});
```

**Verdict:** ✅ **NECESSARY** - Already implemented correctly. Keep as-is.

---

### ❌ **2. Pessimistic Locking** - NOT IMPLEMENTED

**Status:** ❌ **CRITICAL GAP** - Race conditions possible

**Problem:**
Wallets are read **OUTSIDE** transactions, then updated **INSIDE** transactions. This creates a **time-of-check to time-of-use (TOCTOU)** race condition.

**Example Race Condition:**

```typescript
// Line 1410: Read wallet OUTSIDE transaction
const senderWallet = await this.prisma.wallet.findUnique({ ... });

// Line 1449: Check balance using OLD value
if (senderWallet.balance.lt(totalDebit)) { ... }

// Line 1499: Transaction starts, but uses STALE balance
await this.prisma.$transaction(async (tx) => {
  // Uses senderWallet.balance from line 1410 (could be stale!)
  const newSenderBalance = senderWallet.balance.minus(totalDebit);
  await tx.wallet.update({ ... });
});
```

**Scenario:**

1. User has ₦1000 balance
2. Request A reads balance: ₦1000
3. Request B reads balance: ₦1000 (concurrent)
4. Request A checks: ₦1000 >= ₦600 ✅ (passes)
5. Request B checks: ₦1000 >= ₦600 ✅ (passes)
6. Request A debits: ₦1000 - ₦600 = ₦400
7. Request B debits: ₦400 - ₦600 = **-₦200** ❌ (negative balance!)

**Impact:**

- **Double-spending** possible
- **Negative balances** possible
- **Lost money** in edge cases

**Solution:** Use `SELECT FOR UPDATE` to lock rows during transaction:

```typescript
await this.prisma.$transaction(async (tx) => {
  // Lock and read wallet WITHIN transaction
  const senderWallet = await tx.$queryRaw`
    SELECT * FROM wallets
    WHERE "userId" = ${senderId} AND type = 'NAIRA'
    FOR UPDATE
  `;

  // Now check balance with locked, fresh data
  if (senderWallet.balance < totalDebit) {
    throw new BadRequestException('Insufficient balance');
  }

  // Update using locked row
  await tx.wallet.update({ ... });
});
```

**Verdict:** ⚠️ **NECESSARY** - **CRITICAL** for fintech. Must implement.

**Affected Operations:**

- P2P transfers (`sendToUser`)
- VTU purchases (data, airtime, etc.)
- Wallet adjustments
- Crypto conversions
- Any operation that reads balance then updates it

---

### ❌ **3. Serializable Isolation Level** - NOT IMPLEMENTED

**Status:** ❌ **MISSING** - Using default READ COMMITTED

**Current:** Prisma uses PostgreSQL's default isolation level: **READ COMMITTED**

**Problem:** READ COMMITTED allows:

- **Non-repeatable reads:** Balance can change between reads
- **Phantom reads:** New transactions can appear between reads
- **Lost updates:** Two transactions can overwrite each other's changes

**Example:**

```typescript
// Transaction 1: Read balance = ₦1000
// Transaction 2: Read balance = ₦1000 (concurrent)
// Transaction 1: Update balance = ₦400 (₦1000 - ₦600)
// Transaction 2: Update balance = ₦400 (₦1000 - ₦600) ❌ Should be -₦200!
```

**Solution:** Use **SERIALIZABLE** isolation level:

```typescript
await this.prisma.$transaction(
  async (tx) => {
    // ... operations
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  },
);
```

**Trade-offs:**

- ✅ **Prevents all race conditions** (phantom reads, lost updates, etc.)
- ⚠️ **Higher lock contention** (more transactions may retry)
- ⚠️ **Slightly slower** (but safer for financial operations)

**Verdict:** ⚠️ **RECOMMENDED** - **HIGHLY RECOMMENDED** for fintech. Consider implementing.

**When to use:**

- All wallet operations (debits, credits, transfers)
- Balance calculations
- Daily limit checks
- Any operation involving money

---

### ⚠️ **4. Idempotency Keys** - PARTIALLY IMPLEMENTED

**Status:** ⚠️ **INCOMPLETE** - Only for webhooks

**Current Implementation:**

- ✅ Webhook handlers check for duplicate `reference` (basic idempotency)
- ❌ No idempotency keys for API requests
- ❌ No idempotency key table/model
- ❌ No client-provided idempotency keys

**Example (Webhook):**

```typescript
// src/webhooks/paystack-webhook.service.ts:67-74
const existing = await this.prisma.transaction.findUnique({
  where: { reference },
});

if (existing) {
  this.logger.warn(`Transaction already processed: ${reference}`);
  return; // Idempotent - returns without error
}
```

**Problem:**

- API clients can't retry safely
- Network failures can cause duplicate transactions
- No way to ensure exactly-once semantics

**Solution:** Implement idempotency keys:

```typescript
// 1. Add to schema
model IdempotencyKey {
  id        String   @id @default(uuid())
  key       String   @unique
  userId    String?
  endpoint  String
  method    String
  requestHash String
  response  Json?
  status    String   @default("PENDING") // PENDING, COMPLETED, FAILED
  createdAt DateTime @default(now())
  expiresAt DateTime

  @@index([key])
  @@index([userId])
}

// 2. Middleware to check idempotency
async function checkIdempotency(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return next();
  }

  const existing = await prisma.idempotencyKey.findUnique({
    where: { key: idempotencyKey }
  });

  if (existing && existing.status === 'COMPLETED') {
    // Return cached response
    return res.json(existing.response);
  }

  // Store key, process request, update key with response
}
```

**Verdict:** ⚠️ **RECOMMENDED** - Important for production reliability, especially for:

- Payment processing
- Wallet top-ups
- P2P transfers
- Any operation that charges users

---

## Summary & Recommendations

| Feature                    | Status         | Priority        | Impact if Missing                  |
| -------------------------- | -------------- | --------------- | ---------------------------------- |
| **Atomic Double-Entry**    | ✅ Implemented | ✅ Keep         | None (already working)             |
| **Pessimistic Locking**    | ❌ Missing     | 🔴 **CRITICAL** | Double-spending, negative balances |
| **Serializable Isolation** | ❌ Missing     | 🟡 **HIGH**     | Race conditions, lost updates      |
| **Idempotency Keys**       | ⚠️ Partial     | 🟡 **MEDIUM**   | Duplicate transactions on retry    |

---

## Recommended Implementation Order

### **Phase 1: Critical (Do First)**

1. **Pessimistic Locking** - Prevents double-spending
   - Add `SELECT FOR UPDATE` to all wallet reads within transactions
   - Move balance checks inside transactions

### **Phase 2: High Priority**

2. **Serializable Isolation Level** - Prevents race conditions
   - Add `isolationLevel: Serializable` to all financial transactions
   - Monitor for increased retry rates

### **Phase 3: Production Hardening**

3. **Idempotency Keys** - Prevents duplicate transactions
   - Add `IdempotencyKey` model
   - Create middleware for API endpoints
   - Implement for critical operations (payments, transfers)

---

## Code Examples

### Example 1: Fix P2P Transfer with Pessimistic Locking

**Before (Vulnerable):**

```typescript
// Read wallet OUTSIDE transaction
const senderWallet = await this.prisma.wallet.findUnique({ ... });

// Check balance
if (senderWallet.balance.lt(totalDebit)) { ... }

// Update INSIDE transaction (race condition!)
await this.prisma.$transaction(async (tx) => {
  const newBalance = senderWallet.balance.minus(totalDebit); // Uses stale value!
  await tx.wallet.update({ ... });
});
```

**After (Safe):**

```typescript
await this.prisma.$transaction(
  async (tx) => {
    // Lock and read wallet WITHIN transaction
    const senderWallet = await tx.wallet.findUnique({
      where: { userId_type: { userId: senderId, type: 'NAIRA' } },
    });

    // Use Prisma's raw query for FOR UPDATE
    const lockedWallet = await tx.$queryRaw<Wallet[]>`
    SELECT * FROM wallets 
    WHERE "userId" = ${senderId} AND type = 'NAIRA'
    FOR UPDATE
  `;

    const currentBalance = new Decimal(lockedWallet[0].balance);

    // Check balance with fresh, locked data
    if (currentBalance.lt(totalDebit)) {
      throw new BadRequestException('Insufficient balance');
    }

    // Update using locked row
    const newBalance = currentBalance.minus(totalDebit);
    await tx.wallet.update({
      where: { id: lockedWallet[0].id },
      data: { balance: newBalance, ledgerBalance: newBalance },
    });

    // ... rest of transaction
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  },
);
```

---

## Testing Recommendations

1. **Concurrency Tests:**
   - Simulate 100 concurrent transfer requests
   - Verify no double-spending
   - Verify no negative balances

2. **Race Condition Tests:**
   - Two requests with same balance check
   - Verify only one succeeds

3. **Idempotency Tests:**
   - Send same request twice with idempotency key
   - Verify same response returned

---

## Conclusion

**Current State:** Your API has **basic transaction safety** but is **vulnerable to race conditions** in high-concurrency scenarios.

**Critical Gap:** **Pessimistic locking** is the most important missing feature. Without it, you risk:

- Double-spending
- Negative balances
- Financial discrepancies

**Recommendation:** Implement pessimistic locking **immediately**, then add serializable isolation level for additional safety.
