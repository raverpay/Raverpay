# 🐛 Wallet Balance Bug Fix - December 1, 2025

## 📌 Problem Summary

A user with **₦1,900 in their NAIRA wallet** was seeing:

- ❌ Mobile app displaying **₦0 balance**
- ❌ Transaction history showing impossible values:
  - `balanceBefore: ₦0`
  - `balanceAfter: -₦100`
- ❌ Crypto wallet showing `dailySpent` and `monthlySpent` even though they never made crypto transactions

---

## 🔍 Root Cause Analysis

### The Core Issue: Missing Wallet Type Filter

Since implementing the **dual wallet system** (NAIRA + CRYPTO), users have TWO wallets:

```json
{
  "wallets": [
    {
      "id": "7d3a3b2e-0181-4661-b46f-4656062199bd",
      "userId": "4341e407-dd8c-4965-ae5b-ecf03c983db1",
      "type": "NAIRA",
      "balance": "1900.00",
      "currency": "NGN"
    },
    {
      "id": "9bb9ad86-fa5c-49a4-8178-1e27a7f5c82e",
      "userId": "4341e407-dd8c-4965-ae5b-ecf03c983db1",
      "type": "CRYPTO",
      "balance": "0.00",
      "currency": "CRYPTO"
    }
  ]
}
```

### What Was Wrong?

Throughout the codebase, wallet queries were using:

```typescript
// ❌ BAD: Returns first wallet found (could be NAIRA or CRYPTO)
const wallet = await this.prisma.wallet.findFirst({
  where: { userId },
});
```

**Problem:** `findFirst` returns **whichever wallet was created first** in the database. For this user:

- Their CRYPTO wallet was created first
- So `findFirst` returned the CRYPTO wallet with ₦0 balance
- But the NAIRA wallet was still being debited correctly!

---

## 🐞 The Three Bugs Explained

### Bug #1: Wrong `balanceBefore` in Transactions

**Timeline of what happened:**

1. User wants to buy ₦100 airtime
2. Code checks balance:

   ```typescript
   const wallet = await findFirst({ where: { userId } });
   // Returns CRYPTO wallet with ₦0 ❌
   const balanceBefore = wallet.balance; // ₦0 ❌
   ```

3. Code calculates `balanceAfter`:

   ```typescript
   const balanceAfter = balanceBefore - 100; // 0 - 100 = -100 ❌
   ```

4. Code debits the correct wallet:

   ```typescript
   await wallet.update({
     where: {
       userId_type: { userId, type: 'NAIRA' }, // ✅ Correct!
     },
     data: {
       balance: { decrement: 100 },
     },
   });
   ```

5. Transaction record created with **wrong values**:
   ```json
   {
     "balanceBefore": "0.00", // ❌ Should be 2000.00
     "balanceAfter": "-100.00", // ❌ Should be 1900.00
     "amount": "100.00" // ✅ Correct
   }
   ```

**Result:** Transaction succeeded, wallet debited correctly, but history shows impossible values.

---

### Bug #2: Crypto Wallet Getting NAIRA Spending Stats

Because the CRYPTO wallet was being queried for `balanceBefore`, even though the NAIRA wallet was updated, the tracking got confused:

```json
// Crypto wallet showing NAIRA spending
{
  "type": "CRYPTO",
  "balance": "0.00",
  "dailySpent": "6000.00", // ❌ From NAIRA transactions!
  "monthlySpent": "6000.00" // ❌ From NAIRA transactions!
}
```

---

### Bug #3: Mobile App Showing ₦0

The mobile app calls `/api/wallet` endpoint which uses:

```typescript
async getWalletBalance(userId: string) {
  const wallet = await this.prisma.wallet.findFirst({
    where: { userId },  // ❌ Returns first wallet (CRYPTO with ₦0)
  });
  return { balance: wallet.balance }; // Returns ₦0 ❌
}
```

**Result:** User sees ₦0 in their app even though they have ₦1,900 in NAIRA wallet.

---

## ✅ The Fix

### What Was Changed?

Updated **ALL** wallet queries to explicitly specify the wallet type:

```typescript
// ✅ GOOD: Always returns NAIRA wallet
const wallet = await this.prisma.wallet.findFirst({
  where: {
    userId,
    type: 'NAIRA', // 🎯 Explicit type filter
  },
});
```

---

## 📂 Files Fixed (20 instances across 9 files)

### 1. **VTU Service** (`src/vtu/vtu.service.ts`)

Fixed **9 instances**:

- ✅ `checkWalletBalance()` - Balance validation
- ✅ `lockWalletForTransaction()` - Wallet locking
- ✅ Airtime purchase `balanceBefore` calculation
- ✅ Data purchase `balanceBefore` calculation
- ✅ Cable TV purchase `balanceBefore` calculation (Regular)
- ✅ Cable TV purchase `balanceBefore` calculation (Showmax)
- ✅ Electricity purchase `balanceBefore` calculation
- ✅ International airtime purchase `balanceBefore` calculation
- ✅ Refund operations `balanceBefore` calculation

### 2. **Wallet Service** (`src/wallet/wallet.service.ts`)

Fixed **2 instances**:

- ✅ `getWalletBalance()` - Main balance endpoint (used by mobile app)
- ✅ `lockWallet()` - Wallet locking for security

### 3. **Paystack Webhook** (`src/webhooks/paystack-webhook.service.ts`)

Fixed **1 instance**:

- ✅ Virtual account credit processing

### 4. **Support Bot** (`src/support/bot.service.ts`)

Fixed **1 instance**:

- ✅ Balance inquiry handler

### 5. **Admin Wallets** (`src/admin/wallets/admin-wallets.service.ts`)

Fixed **3 instances**:

- ✅ `getWalletByUserId()` - Admin wallet lookup
- ✅ `adjustWalletBalance()` - Admin balance adjustment
- ✅ `resetLimits()` - Daily/monthly limit reset

### 6. **Admin Transactions** (`src/admin/transactions/admin-transactions.service.ts`)

Fixed **1 instance**:

- ✅ Transaction reversal

### 7. **Admin VTU** (`src/admin/vtu/admin-vtu.service.ts`)

Fixed **1 instance**:

- ✅ VTU order refund

### 8. **Admin Giftcards** (`src/admin/giftcards/admin-giftcards.service.ts`)

Fixed **1 instance**:

- ✅ Giftcard order refund

### 9. **Admin Crypto** (`src/admin/crypto/admin-crypto.service.ts`)

Fixed **1 instance**:

- ✅ Crypto sell approval (crediting NAIRA wallet)

---

## 🎯 Expected Results After Deployment

### Immediate Fixes:

1. ✅ **Mobile app will display correct balance**: ₦1,900 instead of ₦0
2. ✅ **All new transactions will show correct `balanceBefore` and `balanceAfter`**
3. ✅ **Crypto wallet will stop accumulating NAIRA spending stats**
4. ✅ **No more negative balance scenarios**

### Example: Next Transaction Will Look Like This:

**Before Fix:**

```json
{
  "type": "VTU_AIRTIME",
  "amount": "100.00",
  "balanceBefore": "0.00", // ❌ Wrong
  "balanceAfter": "-100.00", // ❌ Wrong
  "status": "COMPLETED"
}
```

**After Fix:**

```json
{
  "type": "VTU_AIRTIME",
  "amount": "100.00",
  "balanceBefore": "1900.00", // ✅ Correct
  "balanceAfter": "1800.00", // ✅ Correct
  "status": "COMPLETED"
}
```

---

## 📊 Current User Data Status

The affected user's **actual wallet balances are CORRECT** in the database:

| Wallet Type | Balance | Status     |
| ----------- | ------- | ---------- |
| NAIRA       | ₦1,900  | ✅ Correct |
| CRYPTO      | ₦0      | ✅ Correct |

**Note:** Historical transactions with wrong `balanceBefore`/`balanceAfter` values will **NOT** be auto-corrected. Only new transactions will have accurate values.

---

## 🚀 Deployment Steps

1. **Commit the changes** to your repository
2. **Deploy to production**
3. **Restart the API server** (or wait for auto-deployment)
4. **Clear Redis cache** (if applicable):
   ```bash
   redis-cli FLUSHDB
   ```
5. **Test with mobile app**: Check if balance shows correctly

---

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Mobile app shows correct NAIRA balance
- [ ] User can successfully purchase airtime/data
- [ ] New transaction shows correct `balanceBefore` and `balanceAfter`
- [ ] Crypto wallet doesn't get NAIRA spending updates
- [ ] Admin dashboard shows correct wallet balance
- [ ] Refunds credit the correct wallet

---

## 🔐 Why This Happened

### Timeline:

1. **Phase 1**: App had only NAIRA wallets
   - Queries used `findFirst({ where: { userId } })` - **worked fine** ✅

2. **Phase 2**: Added CRYPTO wallets
   - Each user now has 2 wallets
   - Old queries still used `findFirst({ where: { userId } })` - **started failing** ❌
   - `findFirst` is non-deterministic when multiple records match

3. **Phase 3**: This fix
   - Explicitly filter by `type: 'NAIRA'` - **fixed** ✅

---

## 💡 Lessons Learned

1. **Always be explicit with queries** when multiple records can match
2. **Test with users who have multiple wallets** of different types
3. **Use `where` clauses with all relevant filters**, not just primary identifiers
4. **Transaction history should be validated** during testing

---

## 📞 Support

If you encounter any issues after deployment:

1. Check server logs for wallet query errors
2. Verify user has both NAIRA and CRYPTO wallets
3. Test the `/api/wallet` endpoint directly
4. Check transaction creation logs for `balanceBefore` values

---

**Fixed by:** GitHub Copilot  
**Date:** December 1, 2025  
**Impact:** Critical - Affects all users with both NAIRA and CRYPTO wallets
