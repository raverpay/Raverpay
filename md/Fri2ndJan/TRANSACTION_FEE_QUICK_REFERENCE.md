# Transaction Fee System - Quick Reference

## 📋 Overview

The transaction fee system adds a configurable service fee to USDC transfers using a two-transfer model.

**Default Settings:**

- Fee: 0.5% of transaction amount
- Minimum: 0.0625 USDC (~₦100)
- Status: Enabled

## 🚀 Quick Start

### 1. Run Database Migration

```bash
cd apps/raverpay-api
npx prisma migrate dev --name add_transaction_fees
npx prisma generate
```

### 2. Configure Collection Wallets

```bash
# Use the same EVM address for all chains
curl -X PUT http://localhost:4000/circle/fees/config \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionWallets": {
      "BASE-MAINNET": "0xYourWallet...",
      "OP-MAINNET": "0xYourWallet...",
      "ARB-MAINNET": "0xYourWallet...",
      "MATIC-POLYGON": "0xYourWallet..."
    }
  }'
```

### 3. Test a Transfer

```bash
# Calculate fee for 100 USDC
curl "http://localhost:4000/circle/fees/calculate?amount=100" \
  -H "Authorization: Bearer <TOKEN>"

# Response: { "amount": 100, "fee": 0.5, "total": 100.5 }
```

## 📊 API Endpoints

### Public/Authenticated

**Get Fee Config**

```
GET /circle/fees/config
```

**Calculate Fee**

```
GET /circle/fees/calculate?amount=100
```

### Admin Only

**Update Config**

```
PUT /circle/fees/config
Body: { "percentage": 0.75, "minFeeUsdc": 0.1 }
```

**Get Statistics**

```
GET /circle/fees/stats
```

**View Failed Fees**

```
GET /circle/fees/failed
```

**Retry Failed Fee**

```
POST /circle/fees/retry/:retryId
```

## 💰 Fee Calculation Examples

| Amount    | Calculated Fee | Minimum Fee | Actual Fee | Total   |
| --------- | -------------- | ----------- | ---------- | ------- |
| 5 USDC    | 0.025          | 0.0625      | **0.0625** | 5.0625  |
| 12.5 USDC | 0.0625         | 0.0625      | **0.0625** | 12.5625 |
| 100 USDC  | 0.5            | 0.0625      | **0.5**    | 100.5   |
| 1000 USDC | 5.0            | 0.0625      | **5.0**    | 1005.0  |

## 🔧 Configuration Options

### Change Fee Percentage

```bash
PUT /circle/fees/config
{ "percentage": 0.75 }  # 0.75% fee
```

### Change Minimum Fee

```bash
PUT /circle/fees/config
{ "minFeeUsdc": 0.1 }  # Minimum 0.1 USDC
```

### Disable Fees

```bash
PUT /circle/fees/config
{ "enabled": false }
```

### Update Collection Wallet

```bash
PUT /circle/fees/config
{
  "collectionWallets": {
    "BASE-MAINNET": "0xNewAddress..."
  }
}
```

## 🔄 Transfer Flow

```
┌─────────────────────────────────────────────┐
│ User initiates transfer: 100 USDC           │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Calculate fee: 0.5 USDC                     │
│ Total required: 100.5 USDC                  │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Validate balance: 150 USDC ✓                │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Transfer 1: User → Recipient (100 USDC) ✓   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Transfer 2: User → Company (0.5 USDC)       │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
    Success          Failed
       │                │
       ▼                ▼
  feeCollected:    Queue retry
      true         (3 attempts)
```

## 🛠️ Troubleshooting

### Check Fee Configuration

```bash
curl http://localhost:4000/circle/fees/config \
  -H "Authorization: Bearer <TOKEN>"
```

### Check Retry Queue

```bash
curl http://localhost:4000/circle/fees/stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### View Failed Collections

```bash
curl http://localhost:4000/circle/fees/failed \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Manually Retry

```bash
curl -X POST http://localhost:4000/circle/fees/retry/<RETRY_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## 📱 Mobile App Integration

The mobile app automatically:

- ✅ Fetches fee config on send screen mount
- ✅ Calculates fees as user types
- ✅ Validates balance including fee
- ✅ Shows fee breakdown in confirmation
- ✅ Displays fees in transaction history

No changes needed from mobile developers!

## 🔍 Monitoring

### Key Metrics

- Fee collection success rate: Target > 95%
- Average retry queue size: Target < 10
- Fee retry success rate: Target > 90%

### Important Logs

```bash
# Fee configuration changes
grep "Fee config updated" logs/

# Failed fee collections
grep "Fee collection failed" logs/

# Admin alerts
grep "ADMIN ALERT" logs/

# Retry attempts
grep "Retrying fee collection" logs/
```

## 📊 Database Schema

### CircleTransaction (Updated)

```sql
serviceFee           VARCHAR   -- "0.5"
feeCollected         BOOLEAN   -- true/false
totalAmount          VARCHAR   -- "100.5"
mainTransferId       VARCHAR   -- Circle API ID
feeTransferId        VARCHAR   -- Circle API ID
```

### FeeRetryQueue (New)

```sql
id                   UUID
walletId             VARCHAR
collectionWallet     VARCHAR
fee                  VARCHAR
mainTransferId       VARCHAR
retryCount           INTEGER
status               VARCHAR   -- PENDING/COMPLETED/FAILED
lastError            VARCHAR
```

## ⚠️ Common Issues

### Issue: "Insufficient balance"

**Solution:** User needs `amount + fee` in balance

- 100 USDC transfer requires 100.5 USDC balance

### Issue: Fee collection failed

**Solution:** Automatic retry in 5 minutes

- Check retry queue: `GET /circle/fees/stats`
- Manual retry: `POST /circle/fees/retry/:id`

### Issue: No collection wallet for blockchain

**Solution:** Configure wallet via API

```bash
PUT /circle/fees/config
{ "collectionWallets": { "BASE-MAINNET": "0x..." } }
```

### Issue: Fees not appearing

**Solution:** Check if fees are enabled

```bash
GET /circle/fees/config
# Verify: "enabled": true
```

## 🎯 Production Checklist

Before going live:

- [ ] Database migration completed
- [ ] Collection wallets configured for all chains
- [ ] Fees tested on testnet
- [ ] Monitoring alerts set up
- [ ] Users notified of new fees
- [ ] Support team trained
- [ ] Rollback procedure documented

## 📞 Support

### For Developers

- Implementation docs: `/md/Fri2ndJan/TRANSACTION_FEE_IMPLEMENTATION_COMPLETE.md`
- Testing checklist: `/md/Fri2ndJan/TRANSACTION_FEE_TESTING_CHECKLIST.md`

### For Support Team

- Check user transaction: Look for `serviceFee` field
- Check if fee collected: `feeCollected` = true/false
- Refund scenario: Main transfer succeeded, fee failed → User got service, fee in retry queue

### For Finance Team

- Daily fee report: Query transactions with `serviceFee > 0`
- Collection wallet balances: Check on blockchain explorers
- Uncollected fees: Query `feeCollected = false`

---

**Last Updated:** January 2, 2026
**Version:** 1.0.0
**Status:** Production Ready ✅
