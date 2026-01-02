# Transaction Fee System - Testing Checklist

## Pre-Testing Setup

- [ ] Database migration completed (`npx prisma migrate dev`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] API server running (`npm run dev`)
- [ ] Mobile app running (`npm start`)
- [ ] Admin token obtained for testing
- [ ] Fee collection wallet configured

## Unit Tests

### Backend - Fee Calculation Logic

- [ ] Calculate fee for amount below minimum (e.g., 5 USDC → 0.0625 USDC fee)
- [ ] Calculate fee for amount above minimum (e.g., 100 USDC → 0.5 USDC fee)
- [ ] Fee calculation with disabled fees (should return 0)
- [ ] Minimum fee enforcement (12.5 USDC × 0.5% = 0.0625 = minimum)

### Backend - Fee Configuration

- [ ] Get default fee config
- [ ] Update fee percentage
- [ ] Update minimum fee
- [ ] Update collection wallets
- [ ] Enable/disable fees
- [ ] Non-admin cannot update config (403 error)

## Integration Tests

### API Endpoint Tests

#### 1. GET /circle/fees/config

```bash
curl http://localhost:4000/circle/fees/config \
  -H "Authorization: Bearer <TOKEN>"
```

Expected:

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

- [ ] Returns 200 OK
- [ ] Returns correct configuration
- [ ] Works with valid auth token

#### 2. GET /circle/fees/calculate?amount=100

```bash
curl "http://localhost:4000/circle/fees/calculate?amount=100" \
  -H "Authorization: Bearer <TOKEN>"
```

Expected:

```json
{
  "success": true,
  "data": {
    "amount": 100,
    "fee": 0.5,
    "total": 100.5
  }
}
```

- [ ] Returns 200 OK
- [ ] Calculates fee correctly
- [ ] Returns total amount

#### 3. PUT /circle/fees/config (Admin Only)

```bash
curl -X PUT http://localhost:4000/circle/fees/config \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "percentage": 0.75,
    "minFeeUsdc": 0.1
  }'
```

Expected:

```json
{
  "success": true,
  "data": { ... },
  "message": "Fee configuration updated successfully"
}
```

- [ ] Returns 200 OK with admin token
- [ ] Returns 403 Forbidden with non-admin token
- [ ] Updates configuration in database
- [ ] Clears cache after update

#### 4. GET /circle/fees/stats (Admin Only)

```bash
curl http://localhost:4000/circle/fees/stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

- [ ] Returns 200 OK with admin token
- [ ] Returns 403 Forbidden with non-admin token
- [ ] Returns retry queue statistics

#### 5. GET /circle/fees/failed (Admin Only)

```bash
curl http://localhost:4000/circle/fees/failed \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

- [ ] Returns 200 OK with admin token
- [ ] Returns 403 Forbidden with non-admin token
- [ ] Returns list of failed fee collections

### Transaction Flow Tests

#### Test 1: Normal Transfer with Fee Collection

**Setup:**

- Amount: 100 USDC
- Fee: 0.5 USDC (0.5%)
- Total: 100.5 USDC
- Balance: 150 USDC (sufficient)

**Steps:**

1. [ ] Send 100 USDC to recipient address
2. [ ] Verify main transfer executed (check Circle API)
3. [ ] Verify fee transfer executed (check Circle API)
4. [ ] Verify database record:
   - [ ] `amount` = "100"
   - [ ] `serviceFee` = "0.5"
   - [ ] `totalAmount` = "100.5"
   - [ ] `feeCollected` = true
   - [ ] `mainTransferId` is set
   - [ ] `feeTransferId` is set
5. [ ] Verify user balance decreased by 100.5 USDC
6. [ ] Verify recipient received exactly 100 USDC
7. [ ] Verify company wallet received 0.5 USDC

#### Test 2: Transfer with Minimum Fee

**Setup:**

- Amount: 5 USDC
- Fee: 0.0625 USDC (minimum, since 5 × 0.5% = 0.025 < 0.0625)
- Total: 5.0625 USDC

**Steps:**

1. [ ] Send 5 USDC to recipient
2. [ ] Verify fee is 0.0625 USDC (minimum)
3. [ ] Verify total deducted is 5.0625 USDC
4. [ ] Verify both transfers executed

#### Test 3: Insufficient Balance

**Setup:**

- Amount: 100 USDC
- Fee: 0.5 USDC
- Total: 100.5 USDC
- Balance: 100 USDC (insufficient)

**Steps:**

1. [ ] Attempt to send 100 USDC
2. [ ] Verify error message: "Insufficient balance. Required: 100.5 USDC..."
3. [ ] Verify no transfers executed
4. [ ] Verify balance unchanged

#### Test 4: Fee Collection Failure & Retry

**Setup:**

- Simulate fee transfer failure (invalid collection wallet or network error)

**Steps:**

1. [ ] Update collection wallet to invalid address
2. [ ] Send 100 USDC to recipient
3. [ ] Verify main transfer succeeds
4. [ ] Verify fee transfer fails
5. [ ] Verify database record:
   - [ ] `feeCollected` = false
   - [ ] `mainTransferId` is set
   - [ ] `feeTransferId` is null
6. [ ] Verify retry queued in `FeeRetryQueue`:
   - [ ] `status` = "PENDING"
   - [ ] `retryCount` = 0
   - [ ] `walletId` is correct
   - [ ] `fee` is correct
7. [ ] Fix collection wallet address
8. [ ] Wait 5 minutes for cron job or trigger manually
9. [ ] Verify retry executed successfully
10. [ ] Verify database updated:
    - [ ] `feeCollected` = true
    - [ ] `feeTransferId` is now set
11. [ ] Verify retry removed from queue

#### Test 5: Fees Disabled

**Setup:**

- Disable fees via config: `{ "enabled": false }`

**Steps:**

1. [ ] Disable fees via API
2. [ ] Send 100 USDC to recipient
3. [ ] Verify only main transfer executed
4. [ ] Verify no fee transfer attempted
5. [ ] Verify database record:
   - [ ] `serviceFee` = null
   - [ ] `totalAmount` = "100"
   - [ ] `feeCollected` = false
6. [ ] Re-enable fees after test

### Mobile App Tests

#### Send Screen

- [ ] Fee configuration loads on mount
- [ ] Service fee calculates as user types amount
- [ ] Fee displays under amount input
- [ ] Balance validation includes fee
- [ ] Error message shows total required vs available
- [ ] "Max" button accounts for fee (doesn't allow overdraft)

#### Confirmation Modal

- [ ] Shows "Amount" row
- [ ] Shows "Service Fee" row (if fee > 0)
- [ ] Shows "Network Fee" row
- [ ] Shows "Total" row with correct sum
- [ ] All amounts display correctly

#### Transaction History

- [ ] Transactions show service fee if present
- [ ] Transaction details show:
  - [ ] Service fee amount
  - [ ] Fee collection status icon
  - [ ] Total deducted amount

### Edge Cases

#### Test 1: Very Large Amount

- [ ] Amount: 1,000,000 USDC
- [ ] Fee: 5,000 USDC (0.5%)
- [ ] Verify calculation is correct
- [ ] Verify no overflow errors

#### Test 2: Very Small Amount

- [ ] Amount: 0.01 USDC
- [ ] Fee: 0.0625 USDC (minimum)
- [ ] Total: 0.0725 USDC
- [ ] Verify minimum fee applies

#### Test 3: Exact Minimum Threshold

- [ ] Amount: 12.5 USDC
- [ ] Calculated fee: 0.0625 USDC (12.5 × 0.5%)
- [ ] Verify fee equals minimum exactly

#### Test 4: Multiple Concurrent Transfers

- [ ] Send 3 transfers simultaneously
- [ ] Verify all fees collected
- [ ] Verify no race conditions
- [ ] Verify retry queue handles concurrent failures

#### Test 5: Different Blockchains

Test on each supported chain:

- [ ] BASE-MAINNET
- [ ] OP-MAINNET
- [ ] ARB-MAINNET
- [ ] MATIC-POLYGON
- [ ] Verify correct collection wallet used
- [ ] Verify fees collected to correct address

### Performance Tests

#### Cron Job Performance

- [ ] Queue 100 failed fees
- [ ] Measure cron job execution time
- [ ] Verify completes within 5 minutes
- [ ] Verify no performance degradation

#### API Response Times

- [ ] GET /circle/fees/config < 100ms (cached)
- [ ] GET /circle/fees/calculate < 50ms
- [ ] PUT /circle/fees/config < 200ms

#### Transfer Performance

- [ ] Measure time for transfer with fee vs without
- [ ] Verify fee collection adds < 2 seconds to total time

### Security Tests

#### Authentication

- [ ] Non-admin cannot update fee config
- [ ] Non-admin cannot view fee stats
- [ ] Non-admin cannot view failed fees
- [ ] Non-admin cannot retry fees
- [ ] Admin can perform all operations

#### Input Validation

- [ ] Negative fee percentage rejected
- [ ] Fee percentage > 100 rejected
- [ ] Negative minimum fee rejected
- [ ] Invalid collection wallet address handled gracefully

### Monitoring & Alerting

#### Logs to Verify

- [ ] Fee calculation logs visible
- [ ] Transfer creation logs include fee details
- [ ] Failed fee collection logs appear
- [ ] Retry attempt logs appear
- [ ] Admin alert logs for failed retries

#### Metrics to Track

- [ ] Fee collection success rate > 95%
- [ ] Average retry queue size < 10
- [ ] Fee retry success rate > 90%
- [ ] Average fee per transaction

## Post-Testing

### Production Checklist

- [ ] All tests passed
- [ ] Performance acceptable
- [ ] No memory leaks detected
- [ ] Logs configured correctly
- [ ] Monitoring alerts set up
- [ ] Collection wallets configured for production
- [ ] Backup plan documented
- [ ] Rollback procedure tested

### Documentation

- [ ] API endpoints documented
- [ ] Configuration guide complete
- [ ] Troubleshooting guide available
- [ ] Admin training completed

### Communication

- [ ] Users notified of new fees
- [ ] Terms of service updated
- [ ] FAQ updated
- [ ] Support team trained

---

## Test Results

| Test Category    | Total Tests | Passed | Failed | Notes |
| ---------------- | ----------- | ------ | ------ | ----- |
| Unit Tests       |             |        |        |       |
| API Endpoints    |             |        |        |       |
| Transaction Flow |             |        |        |       |
| Mobile App       |             |        |        |       |
| Edge Cases       |             |        |        |       |
| Performance      |             |        |        |       |
| Security         |             |        |        |       |
| **TOTAL**        |             |        |        |       |

**Overall Status:** [ ] PASS / [ ] FAIL

**Tested By:** ********\_********

**Date:** ********\_********

**Sign-off:** ********\_********
