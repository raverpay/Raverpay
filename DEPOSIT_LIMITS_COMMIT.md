# Commit Message

feat: implement deposit limits with wallet lock (Option 2)

Implements comprehensive deposit limit enforcement following Option 2
(Allow Deposit, Lock Wallet) strategy to comply with CBN regulations
and prevent money laundering while ensuring user funds are never rejected.

## Core Changes

### Backend Implementation

- Add DEPOSIT to TransactionLimitType enum in limits.service.ts
- Extend DailyTransactionLimit model with totalDeposits and depositCount fields
- Update checkDailyLimit() and incrementDailySpend() to track deposits
- Implement automatic wallet lock when deposit limits exceeded
- Add multi-channel notifications (Email, Push, SMS) for locked wallets
- Create audit logs for automated wallet locks

### API Updates

- Update GET /api/wallet endpoint to include deposit limit information:
  - dailyDepositLimit: Current tier's daily limit
  - dailyDepositSpent: Amount deposited today
  - dailyDepositRemaining: Remaining capacity
- Enhanced processVirtualAccountCredit() with limit checks
- Wallet automatically locked when limits exceeded (not rejected)

### Database Schema

- Add totalDeposits (Decimal 15,2) to daily_transaction_limits
- Add depositCount (Integer) to daily_transaction_limits
- Migration: apps/mularpay-api/prisma/migrations/add_deposit_tracking.sql

## How It Works

1. User deposits funds via DVA/card
2. Backend checks daily & per-transaction deposit limits
3. If limit exceeded:
   - ✅ Deposit ACCEPTED (money safe in wallet)
   - 🔒 Wallet LOCKED automatically
   - 📧 Notifications sent (Email + Push + SMS)
   - 📝 Audit log created
4. User sees lock status with upgrade prompt in app
5. Unlock via KYC tier upgrade (instant for TIER_1)

## Tier Limits (Deposits)

- TIER_0: ₦50,000 daily, ₦20,000 per-tx
- TIER_1: ₦300,000 daily, ₦100,000 per-tx
- TIER_2: ₦5,000,000 daily, ₦1,000,000 per-tx
- TIER_3: Unlimited

## Benefits

- ✅ User funds never rejected (better UX than Option 1)
- ✅ Strong KYC upgrade incentive (unlock your own money)
- ✅ Simpler implementation (no Paystack refund complexity)
- ✅ Full regulatory compliance with CBN limits
- ✅ Prevents money laundering via unverified accounts
- ✅ Clear audit trail

## Testing

See DEPOSIT_LIMITS_IMPLEMENTATION_SUMMARY.md for:

- 4 comprehensive test scenarios
- Expected results for each tier
- Notification templates
- Monitoring queries

## Documentation

- md/DEPOSIT_LIMITS_IMPLEMENTATION_SUMMARY.md - Complete implementation guide
- md/TRANSACTION_LIMITS_ANALYSIS.md - Analysis & options comparison
- md/MOBILE_APP_WALLET_LOCK_CHANGES.md - Mobile app UI changes needed

## Breaking Changes

None - backwards compatible. Existing users unaffected until next deposit.

## Migration Required

Run SQL migration on Supabase before deployment:

```bash
apps/mularpay-api/prisma/migrations/add_deposit_tracking.sql
```

## Next Steps

1. Run migration on Supabase
2. Test 4 scenarios on staging
3. Update mobile app UI (see MOBILE_APP_WALLET_LOCK_CHANGES.md)
4. Deploy to production
5. Monitor lock rate & upgrade conversion

Resolves: Deposit limit enforcement gap
Related: CBN compliance, KYC tier system
