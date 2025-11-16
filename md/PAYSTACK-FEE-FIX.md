# Paystack Fee Calculation Fix

## ❌ What Was Wrong

### Backend (transactions.service.ts)
**Before:**
```typescript
if (amount < 2500) {
  fee = 50;  // ❌ WRONG! Should be 0
} else {
  fee = Math.min(amount * 0.02, 2000);  // ❌ Should be 1.5% + ₦100
}
```

### Mobile App (fund-wallet.tsx)
**Before:**
```typescript
A transaction fee of ₦100 will be charged for card payments.
// ❌ WRONG! Fee varies based on amount
```

---

## ✅ Correct Implementation

### Paystack Fee Structure:
- **Under ₦2,500**: Only 1.5% (₦100 flat fee is waived)
- **₦2,500+**: 1.5% + ₦100
- **All fees**: Capped at ₦2,000 maximum

### Formula:
```typescript
if (amount < 2500) {
  fee = amount * 0.015; // Only 1.5%, ₦100 waived
} else {
  fee = Math.min(amount * 0.015 + 100, 2000); // 1.5% + ₦100, max ₦2,000
}
```

---

## 📊 Fee Calculation Examples

| Amount | Calculation | Fee | User Receives | Total Charged |
|--------|-------------|-----|---------------|---------------|
| ₦100 | 100 × 0.015 | ₦1.50 | ₦98.50 | ₦100 |
| ₦1,000 | 1,000 × 0.015 | ₦15 | ₦985 | ₦1,000 |
| ₦2,000 | 2,000 × 0.015 | ₦30 | ₦1,970 | ₦2,000 |
| ₦2,499 | 2,499 × 0.015 | ₦37.49 | ₦2,461.51 | ₦2,499 |
| ₦2,500 | (2,500 × 0.015) + 100 | ₦137.50 | ₦2,362.50 | ₦2,500 |
| ₦5,000 | (5,000 × 0.015) + 100 | ₦175 | ₦4,825 | ₦5,000 |
| ₦10,000 | (10,000 × 0.015) + 100 | ₦250 | ₦9,750 | ₦10,000 |
| ₦50,000 | (50,000 × 0.015) + 100 | ₦850 | ₦49,150 | ₦50,000 |
| ₦100,000 | (100,000 × 0.015) + 100 | ₦1,600 | ₦98,400 | ₦100,000 |
| ₦126,666 | (126,666 × 0.015) + 100 | ₦2,000 | ₦124,666 | ₦126,666 |
| ₦200,000 | (200,000 × 0.015) + 100 = ₦3,100 | **₦2,000** ✓ | ₦198,000 | ₦200,000 |
| ₦500,000 | (500,000 × 0.015) + 100 = ₦7,600 | **₦2,000** ✓ | ₦498,000 | ₦500,000 |

**Notes**:
- Under ₦2,500: Only 1.5% (₦100 flat fee waived)
- ₦2,500+: Full fee of 1.5% + ₦100
- Fee capped at ₦2,000 max (happens at ₦126,666+)

---

## 📱 Mobile App Changes

### Dynamic Fee Display

The fee card now shows:

**When amount is empty:**
```
Transaction Fee
Under ₦2,500: Only 1.5% • ₦2,500+: 1.5% + ₦100
```

**When amount < ₦2,500 (e.g., ₦1,000):**
```
Transaction Fee
Fee: ₦15.00 (1.5% only, ₦100 waived)
You'll receive: ₦985.00
```

**When amount ≥ ₦2,500 (e.g., ₦10,000):**
```
Transaction Fee
Fee: ₦250.00 (1.5% + ₦100)
You'll receive: ₦9,750.00
```

---

## 🎯 User Experience Improvements

### Before:
- ❌ Users thought fee was always ₦100
- ❌ No transparency on actual fee amount
- ❌ Fee calculated incorrectly on backend

### After:
- ✅ Users see exact fee before funding
- ✅ Shows "Fee waived" for small amounts
- ✅ Shows how much they'll actually receive
- ✅ Real-time fee calculation as they type
- ✅ Matches Paystack's actual charges

---

## 💡 Business Impact

### Revenue Lost (Before Fix):

For a ₦10,000 funding:
- **Actual Paystack fee**: ₦250
- **What we charged**: ₦200 (using wrong 2% formula)
- **Loss per transaction**: ₦50

### After Fix:
- Fees match Paystack exactly ✅
- No revenue loss ✅
- Transparent to users ✅

---

## 🧪 Testing

### Test Cases:

1. **₦100** - Should show "Fee: ₦1.50 (1.5% only, ₦100 waived)" ✅
2. **₦1,000** - Should show "Fee: ₦15.00 (1.5% only, ₦100 waived)" ✅
3. **₦2,499** - Should show "Fee: ₦37.49 (1.5% only, ₦100 waived)" ✅
4. **₦2,500** - Should show "Fee: ₦137.50 (1.5% + ₦100)" ✅
5. **₦10,000** - Should show "Fee: ₦250.00 (1.5% + ₦100)" ✅
6. **₦100,000** - Should show "Fee: ₦1,600.00 (1.5% + ₦100)" ✅
7. **₦200,000** - Should show "Fee: ₦2,000.00 (1.5% + ₦100)" - capped ✅

---

## 📝 Related Files Changed

1. **Backend**: `/apps/mularpay-api/src/transactions/transactions.service.ts`
   - Fixed `calculateFee()` method for deposits

2. **Mobile App**: `/apps/mularpay-mobileapp/app/fund-wallet.tsx`
   - Added dynamic fee calculation and display

---

## 🚀 Deployment Notes

- ✅ Backend changes need to be deployed to Railway
- ✅ Mobile app changes need new build
- ✅ No database migration required
- ✅ Backward compatible (only affects new transactions)

---

## 📚 References

Paystack Pricing: https://paystack.com/pricing
- Local transactions: 1.5% + ₦100
- ₦100 fee waived for transactions under ₦2,500
- Fees capped at ₦2,000 maximum
