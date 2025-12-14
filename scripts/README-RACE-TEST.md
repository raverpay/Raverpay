# Race Condition Test Script

This script tests for race conditions in wallet operations by making concurrent P2P transfer requests.

## Quick Start

```bash
# Basic test (uses defaults)
node scripts/test-race-condition.js

# Custom test with more concurrent requests
CONCURRENT_REQUESTS=20 AMOUNT=5 node scripts/test-race-condition.js

# Use different recipient
RECIPIENT_TAG=another_user node scripts/test-race-condition.js
```

## Default Configuration

- **API URL**: `https://f1fe04b25cdc.ngrok-free.app`
- **Email**: `codeswitthjoseph@gmail.com`
- **Password**: `6thbornR$`
- **Recipient Tag**: `joestacks`
- **Concurrent Requests**: `10`
- **Amount per Request**: `₦10`

## What It Tests

The script simulates a race condition scenario:

1. **Logs in** to get authentication token
2. **Gets initial wallet balance**
3. **Sends N concurrent transfer requests** (default: 10 requests of ₦10 each)
4. **Gets final wallet balance**
5. **Compares expected vs actual balance**

## Expected Behavior (Without Race Conditions)

- If you have ₦1000 and send 10 transfers of ₦10 each:
  - Expected final balance: ₦900
  - All 10 requests should succeed
  - Balance should match exactly

## Race Condition Indicators

The script will detect race conditions if:

1. **Balance Mismatch**: Final balance doesn't match expected value
   - Example: Expected ₦900, but got ₦920 (only 8 transfers debited)
   - Example: Expected ₦900, but got ₦880 (12 transfers debited somehow)

2. **Insufficient Balance Errors**: Some requests fail with "Insufficient balance" even though balance should be sufficient
   - This indicates multiple requests read the same stale balance

3. **Double-Spending**: More money is debited than should be possible
   - Example: Sent ₦100 total but ₦120 was debited

## Example Output

### ✅ No Race Condition Detected

```
📈 Balance Analysis:
   Initial Balance: ₦1,000.00
   Successful Transfers: 10 × ₦10 = ₦100.00
   Expected Final Balance: ₦900.00
   Actual Final Balance: ₦900.00
   Difference: ₦0.00

✅ No race condition detected!
```

### ❌ Race Condition Detected

```
📈 Balance Analysis:
   Initial Balance: ₦1,000.00
   Successful Transfers: 10 × ₦10 = ₦100.00
   Expected Final Balance: ₦900.00
   Actual Final Balance: ₦920.00
   Difference: ₦20.00

❌ RACE CONDITION DETECTED!
   Balance mismatch detected!
   This indicates:
   - Possible double-spending
   - Lost updates
   - Missing pessimistic locking
```

## Environment Variables

| Variable              | Default                               | Description                   |
| --------------------- | ------------------------------------- | ----------------------------- |
| `API_URL`             | `https://f1fe04b25cdc.ngrok-free.app` | Base API URL                  |
| `EMAIL`               | `codeswitthjoseph@gmail.com`          | Login email                   |
| `PASSWORD`            | `6thbornR$`                           | Login password                |
| `RECIPIENT_TAG`       | `joestacks`                           | Recipient tag for transfers   |
| `CONCURRENT_REQUESTS` | `10`                                  | Number of concurrent requests |
| `AMOUNT`              | `10`                                  | Amount per request in NGN     |

## Testing Different Scenarios

### High Concurrency Test

```bash
CONCURRENT_REQUESTS=50 AMOUNT=5 node scripts/test-race-condition.js
```

### Small Amount Test

```bash
CONCURRENT_REQUESTS=20 AMOUNT=1 node scripts/test-race-condition.js
```

### Large Amount Test

```bash
CONCURRENT_REQUESTS=5 AMOUNT=100 node scripts/test-race-condition.js
```

## Prerequisites

1. **Sufficient Balance**: Make sure your wallet has enough balance
   - Required: `CONCURRENT_REQUESTS × AMOUNT`
   - Example: 10 requests × ₦10 = ₦100 minimum

2. **Recipient Account**: The recipient tag (`joestacks`) must exist and be active

3. **Network Access**: Must be able to reach the API URL

## Troubleshooting

### "Insufficient balance" error

- Reduce `CONCURRENT_REQUESTS` or `AMOUNT`
- Fund your wallet first

### "Recipient not found" error

- Verify the recipient tag exists
- Check if recipient account is active

### "Login failed" error

- Verify email and password are correct
- Check if API URL is accessible

### Connection errors

- Verify API URL is correct
- Check network connectivity
- Ensure ngrok tunnel is active (if using ngrok)

## What to Do If Race Condition Detected

If the test detects a race condition:

1. **Review the analysis document**: `apps/raverpay-api/TRANSACTION_SAFETY_ANALYSIS.md`
2. **Implement pessimistic locking**: Add `SELECT FOR UPDATE` to wallet reads
3. **Add serializable isolation**: Use `isolationLevel: Serializable` in transactions
4. **Re-run the test**: Verify the fix works

## Notes

- The test uses real API calls - actual money will be transferred
- Use a test account with limited funds
- The recipient will receive the money (make sure `joestacks` is a test account)
- Run multiple times to increase confidence in results
