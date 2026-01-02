# Transaction Fee System - Ready to Test! 🚀

## ✅ Implementation Status: COMPLETE

All code has been written, database tables created, and compilation verified with 0 errors.

## What's Been Done

### Backend ✅

- ✅ FeeConfigurationService created
- ✅ FeeRetryService with cron job created
- ✅ CircleTransactionService updated with two-transfer logic
- ✅ 6 API endpoints added to CircleController
- ✅ Services registered in CircleModule
- ✅ TypeScript compilation: 0 errors

### Database ✅

- ✅ `circle_transactions` table updated (5 new columns)
- ✅ `fee_retry_queue` table created
- ✅ All indexes created
- ✅ Prisma client regenerated

### Mobile App ✅

- ✅ send.tsx updated with fee calculation
- ✅ transaction-details.tsx updated with fee display
- ✅ API endpoints added

## Quick Start Testing Guide

### Step 1: Start the Backend (if not running)

```bash
cd apps/raverpay-api
pnpm dev
```

Wait for: `Application is running on: http://localhost:3001`

### Step 2: Create Superadmin User & Configure Fees

**First, create your superadmin account:**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "collectionwallet@raverpay.com",
    "password": "joseph6thbornR$",
    "firstName": "superadmin",
    "lastName": "raverpay",
    "phone": "09018142408"
  }'
```

**Save the `accessToken` from the response!**

**Then configure all fee collection wallets at once:**

```bash
curl -X PUT http://localhost:3001/api/circle/fees/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "percentage": 0.5,
    "minFeeUsdc": 0.0625,
    "collectionWallets": {
      "BASE-SEPOLIA": "0xYourWalletAddress",
      "OP-SEPOLIA": "0xYourWalletAddress",
      "ARB-SEPOLIA": "0xYourWalletAddress",
      "MATIC-AMOY": "0xYourWalletAddress",
      "BASE-MAINNET": "0xYourWalletAddress",
      "OP-MAINNET": "0xYourWalletAddress",
      "ARB-MAINNET": "0xYourWalletAddress",
      "MATIC-POLYGON": "0xYourWalletAddress"
    }
  }'
```

**Tip:** You can use the same EVM wallet address for all chains. Start with testnet chains (ending in SEPOLIA/AMOY) for testing.

**See `md/Fri2ndJan/SETUP_COMMANDS.md` for complete workflow with automatic token extraction.**

### Step 3: Verify Configuration

```bash
curl http://localhost:3001/api/circle/fees/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return:

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "percentage": 0.5,
    "minFeeUsdc": 0.0625,
    "collectionWallets": { ... }
  }
}
```

### Step 4: Test Fee Calculation

```bash
# Test with 100 USDC
curl "http://localhost:3001/api/circle/fees/calculate?amount=100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "amount": 100,
#     "fee": 0.5,
#     "total": 100.5
#   }
# }
```

```bash
# Test with small amount (minimum fee should apply)
curl "http://localhost:3001/api/circle/fees/calculate?amount=5" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "amount": 5,
#     "fee": 0.0625,  ← minimum fee
#     "total": 5.0625
#   }
# }
```

### Step 5: Test a Real Transfer

#### Option A: Via Mobile App

1. **Start the mobile app:**

   ```bash
   cd apps/raverpaymobile
   npm start
   ```

2. **Navigate to Send screen**
   - The app will automatically fetch fee config
   - Type an amount (e.g., 10 USDC)
   - You'll see: "10 USDC + 0.0625 USDC service fee"
   - Total will show: 10.0625 USDC

3. **Send the transfer**
   - The system will execute 2 transfers:
     - Transfer 1: 10 USDC to recipient ✓
     - Transfer 2: 0.0625 USDC to company wallet ✓

#### Option B: Via API (Postman/curl)

```bash
curl -X POST http://localhost:3001/api/circle/transactions/transfer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "your-wallet-id",
    "destinationAddress": "0xRecipientAddress...",
    "amount": "10",
    "feeLevel": "MEDIUM"
  }'
```

The backend will automatically:

1. Calculate fee: 0.0625 USDC (minimum)
2. Check balance: Need 10.0625 USDC
3. Execute main transfer: 10 USDC → recipient
4. Execute fee transfer: 0.0625 USDC → company wallet
5. Save transaction with fee details

### Step 6: Verify the Transaction

**Check transaction details:**

```bash
curl http://localhost:3001/api/circle/transactions/YOUR_TRANSACTION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

You should see:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "amount": "10",
    "serviceFee": "0.0625",
    "totalAmount": "10.0625",
    "feeCollected": true,
    "mainTransferId": "circle-tx-id-1",
    "feeTransferId": "circle-tx-id-2",
    ...
  }
}
```

**In the mobile app:**

- Go to transaction history
- Tap on the transaction
- You'll see:
  - Amount Sent: 10 USDC
  - Service Fee: 0.0625 USDC ✓
  - Total Deducted: 10.0625 USDC

### Step 7: Monitor Fee Collection

**Check fee stats (admin only):**

```bash
curl http://localhost:3001/api/circle/fees/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Check retry queue:**

```bash
curl http://localhost:3001/api/circle/fees/failed \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Should return empty array if all fees collected successfully.

## Testing Scenarios

### Scenario 1: Normal Transfer ✅

- Amount: 100 USDC
- Fee: 0.5 USDC
- Total: 100.5 USDC
- Expected: Both transfers succeed

### Scenario 2: Minimum Fee ✅

- Amount: 5 USDC
- Fee: 0.0625 USDC (minimum)
- Total: 5.0625 USDC
- Expected: Minimum fee applies

### Scenario 3: Insufficient Balance ❌

- Amount: 100 USDC
- Balance: 100 USDC (not enough for fee)
- Expected: Error "Insufficient balance. Required: 100.5 USDC..."

### Scenario 4: Fee Collection Failure (Advanced)

To test the retry mechanism:

1. Set invalid collection wallet:

   ```bash
   curl -X PUT http://localhost:3001/api/circle/fees/config \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"collectionWallets": {"BASE-SEPOLIA": "0xINVALID"}}'
   ```

2. Send a transfer - main transfer succeeds, fee fails
3. Check retry queue:

   ```bash
   curl http://localhost:3001/api/circle/fees/failed \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

4. Fix the wallet address
5. Wait 5 minutes or manually retry:
   ```bash
   curl -X POST http://localhost:3001/api/circle/fees/retry/RETRY_ID \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

## Important Notes

### Fee Configuration

- **Default**: 0.5% with 0.0625 USDC minimum (~₦100)
- **Can be changed** anytime via API (admin only)
- **Can be disabled** by setting `enabled: false`

### Collection Wallets

- **Same address works** for all EVM chains (Base, Optimism, Arbitrum, Polygon)
- **Testnet first**: Set up testnet chains before mainnet
- **Verify access**: Make sure you control the wallet

### Cron Job

- **Runs every 5 minutes** to retry failed fees
- **Max 3 attempts** per failed fee
- **Logs**: Check console for `[FeeRetryService]` logs

### Mobile App

- **Automatic**: Fetches config on send screen mount
- **Real-time**: Calculates fee as user types
- **Clear display**: Shows fee breakdown before confirming

## Troubleshooting

### Issue: "No fee collection wallet configured"

**Solution:** Run Step 2 above to configure wallets

### Issue: "Insufficient balance"

**Solution:** User needs amount + fee. For 100 USDC send, need 100.5 USDC balance

### Issue: Fee not appearing in mobile app

**Solution:**

1. Check backend is running
2. Verify fee config endpoint works
3. Restart mobile app

### Issue: Fee collection failed

**Solution:**

1. Check logs for error message
2. Verify collection wallet address is correct
3. Check wallet has Circle support
4. Fee will auto-retry in 5 minutes

## Quick Commands Reference

```bash
# Backend
cd apps/raverpay-api && pnpm dev

# Mobile
cd apps/raverpaymobile && npm start

# Check config
curl http://localhost:3001/api/circle/fees/config -H "Authorization: Bearer TOKEN"

# Calculate fee
curl "http://localhost:3001/api/circle/fees/calculate?amount=100" -H "Authorization: Bearer TOKEN"

# Check stats (admin)
curl http://localhost:3001/api/circle/fees/stats -H "Authorization: Bearer ADMIN_TOKEN"

# View logs
tail -f apps/raverpay-api/logs/*.log | grep -i fee
```

## What You'll See

### In Console Logs:

```
[FeeConfigurationService] Fee config updated: 0.5%, min 0.0625 USDC
[CircleTransactionService] Transfer requested: 100 USDC + 0.5 USDC fee = 100.5 USDC total
[CircleTransactionService] Main transfer created: abc123...
[CircleTransactionService] Fee transfer created: def456...
[CircleTransactionService] Transaction saved - Fee collected: true
```

### In Mobile App:

- Send screen: "10 USDC + 0.0625 USDC service fee"
- Confirmation: Shows amount, fee, and total separately
- History: Transaction shows fee badge/amount
- Details: Full breakdown with fee collection status

### In Database:

```sql
SELECT
  reference,
  amounts[1] as amount,
  "serviceFee",
  "totalAmount",
  "feeCollected",
  "mainTransferId",
  "feeTransferId"
FROM circle_transactions
WHERE "serviceFee" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 5;
```

## You're All Set! 🎉

The implementation is **100% complete** and ready for testing. Just:

1. ✅ Start backend: `cd apps/raverpay-api && pnpm dev`
2. ✅ Configure wallets: Run Step 2 above
3. ✅ Test transfer: Use mobile app or API
4. ✅ Monitor: Check transaction details and fee stats

**Need help?** Check the documentation:

- Full guide: `md/Fri2ndJan/TRANSACTION_FEE_IMPLEMENTATION_COMPLETE.md`
- Testing checklist: `md/Fri2ndJan/TRANSACTION_FEE_TESTING_CHECKLIST.md`
- Quick reference: `md/Fri2ndJan/TRANSACTION_FEE_QUICK_REFERENCE.md`

Happy testing! 🚀
