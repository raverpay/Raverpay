# End-to-End Paymaster Transaction Test Plan

## Test Scenario

**Send 1 USDC from User 1 to User 2 using Paymaster (gas paid in USDC)**

---

## Test Participants

### User 1 (Sender)

- **Email**: archjo6@gmail.com
- **User ID**: `4341e407-dd8c-4965-ae5b-ecf03c983db1`
- **Wallet**: ETH-SEPOLIA SCA
  - **ID**: `64eb0590-cf40-42f6-b716-be5a78592b2f`
  - **Address**: `0xeaccbb34d6fa2782d0e1c21e3a9222f300736102`
  - **Type**: SCA ✅
  - **Paymaster Compatible**: YES ✅

### User 2 (Recipient)

- **Email**: codeswithjoseph@gmail.com
- **User ID**: `2494cdd0-9169-41ea-814b-e6f0b882329c`
- **Wallet**: MATIC-AMOY SCA
  - **ID**: `5906a288-d12d-4f6e-b4e9-f2aaeb5d9c06`
  - **Address**: `0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4`
  - **Type**: SCA ✅

---

## Test Steps

### Step 1: Check User 1 USDC Balance ✅

**Endpoint**: `GET /api/circle/wallets/:id/balance`

**Expected**: Should have USDC balance on ETH-SEPOLIA

---

### Step 2: Generate Permit for Transaction ✅

**Endpoint**: `POST /api/circle/paymaster/generate-permit`

**Request**:

```json
{
  "walletId": "64eb0590-cf40-42f6-b716-be5a78592b2f",
  "amount": "1000000",
  "blockchain": "ETH-SEPOLIA"
}
```

**Expected**: Returns EIP-2612 typed data for permit signature

---

### Step 3: Submit UserOperation with Paymaster

**Endpoint**: `POST /api/circle/paymaster/submit-userop`

**Request**:

```json
{
  "walletId": "64eb0590-cf40-42f6-b716-be5a78592b2f",
  "destinationAddress": "0xRecipientAddress",
  "amount": "1000000",
  "blockchain": "ETH-SEPOLIA",
  "permitSignature": "0x...",
  "feeLevel": "MEDIUM",
  "memo": "E2E Paymaster Test"
}
```

**Expected**:

- Returns `userOpHash`
- Status: PENDING
- Estimated gas in USDC

---

### Step 4: Poll UserOperation Status

**Endpoint**: `GET /api/circle/paymaster/userop/:hash`

**Expected**:

- Status transitions: PENDING → CONFIRMED
- `transactionHash` populated
- `actualGasUsdc` populated
- Transaction visible on block explorer

---

### Step 5: Verify Database Records

**Check**:

- `paymaster_user_operations` table has record
- `userOpHash` matches
- `status` = CONFIRMED
- `actualGasUsdc` populated

---

### Step 6: Verify Balances

**User 1 (Sender)**:

- USDC balance decreased by: 1 USDC + gas fee (in USDC)
- Example: If gas was $3, balance decreased by $4 total

**User 2 (Recipient)**:

- USDC balance increased by: 1 USDC
- Gas NOT deducted (paid by sender via Paymaster)

---

### Step 7: Check Paymaster Statistics

**Endpoint**: `GET /api/circle/paymaster/stats`

**Expected**:

```json
{
  "totalUserOps": 1,
  "confirmedUserOps": 1,
  "pendingUserOps": 0,
  "totalGasSpentUsdc": "3.500000",
  "averageGasPerTxUsdc": "3.500000"
}
```

---

## Success Criteria

### ✅ Transaction Success

- [ ] UserOperation submitted successfully
- [ ] Status changed to CONFIRMED
- [ ] Transaction hash received
- [ ] Visible on Etherscan

### ✅ Gas Payment in USDC

- [ ] Gas fee deducted in USDC (not ETH)
- [ ] Sender's USDC balance decreased by amount + gas
- [ ] No ETH deducted from sender

### ✅ Database Records

- [ ] UserOperation record created
- [ ] Status updated to CONFIRMED
- [ ] Actual gas cost recorded
- [ ] Transaction hash stored

### ✅ Statistics Updated

- [ ] Total UserOps incremented
- [ ] Confirmed UserOps incremented
- [ ] Total gas spent updated
- [ ] Average gas calculated

---

## Prerequisites

### Required:

1. ✅ User 1 has USDC on ETH-SEPOLIA
2. ⏳ Bundler RPC configured (e.g., Pimlico)
3. ⏳ Backend has access to wallet signing (Circle developer-controlled)

### Environment Variables Needed:

```bash
BUNDLER_RPC_URL_ETH_SEPOLIA=https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY
```

---

## Alternative: Same-Chain Test

If cross-chain is complex, we can test on same chain:

### User 1 → User 1 (Different Address)

- **From**: `0xeaccbb34d6fa2782d0e1c21e3a9222f300736102` (ETH-SEPOLIA)
- **To**: Any test address on ETH-SEPOLIA
- **Amount**: 1 USDC
- **Gas**: Paid in USDC via Paymaster

This simplifies testing while proving Paymaster works.

---

## Expected Timeline

1. **Check Balance**: 5 seconds
2. **Generate Permit**: 5 seconds
3. **Submit UserOp**: 10 seconds
4. **Bundler Processing**: 30-60 seconds
5. **On-chain Confirmation**: 30-60 seconds
6. **Total**: ~2-3 minutes

---

## Monitoring

### During Test:

- Watch backend logs for UserOp submission
- Monitor bundler response
- Check block explorer for transaction
- Verify database updates

### After Test:

- Check admin dashboard
- Verify statistics
- Review gas costs
- Confirm balances

---

## Rollback Plan

If test fails:

1. Check bundler RPC connectivity
2. Verify USDC balance sufficient
3. Check permit signature validity
4. Review backend logs for errors
5. Retry with different parameters

---

## Next Steps

Ready to execute when:

1. ✅ Bundler RPC is configured
2. ✅ User 1 has USDC balance
3. ✅ Backend is running
4. ✅ All endpoints tested

**Let's run the E2E test!** 🚀
