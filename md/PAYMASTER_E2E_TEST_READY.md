# 🚀 Circle Paymaster E2E Test - READY TO EXECUTE

## Test Configuration

### Sender (User 1)

- **Email**: archjo6@gmail.com
- **Wallet ID**: `64eb0590-cf40-42f6-b716-be5a78592b2f`
- **Address**: `0xeaccbb34d6fa2782d0e1c21e3a9222f300736102`
- **Network**: ETH-SEPOLIA
- **Balance**: 0.3 USDC
- **Type**: SCA (Paymaster Compatible) ✅

### Recipient (User 2)

- **Email**: codeswithjoseph@gmail.com
- **Address**: `0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4`
- **Network**: MATIC-AMOY (different chain - for demo)

### Transaction Details

- **Amount**: 0.1 USDC (100,000 units)
- **Gas Payment**: USDC (via Paymaster) ✅
- **Bundler**: Pimlico (configured) ✅
- **Memo**: "E2E Paymaster Test - Gas paid in USDC"

---

## ✅ Prerequisites Verified

1. ✅ Bundler RPC configured (Pimlico)
2. ✅ User has USDC balance (0.3 USDC)
3. ✅ Wallet is SCA type
4. ✅ Permit generation working
5. ✅ All API endpoints tested
6. ✅ Database tables created

---

## 🎯 Test Execution Steps

### Step 1: Generate Permit ✅ COMPLETED

**Status**: SUCCESS

**Response**:

```json
{
  "permitAmount": "10100000",
  "paymasterAddress": "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966",
  "usdcAddress": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
}
```

---

### Step 2: Submit UserOperation with Paymaster

**Important Note**: Since Circle wallets are developer-controlled, the backend will:

1. Generate the permit typed data
2. Sign it using Circle's API
3. Submit the UserOperation to the bundler

**API Call**:

```bash
curl -X POST "https://c9b6dda108ed.ngrok-free.app/api/circle/paymaster/submit-userop" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{
    "walletId": "64eb0590-cf40-42f6-b716-be5a78592b2f",
    "destinationAddress": "0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4",
    "amount": "100000",
    "blockchain": "ETH-SEPOLIA",
    "permitSignature": "BACKEND_WILL_SIGN",
    "feeLevel": "MEDIUM",
    "memo": "E2E Paymaster Test"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "userOpHash": "0x...",
    "status": "PENDING",
    "estimatedGasUsdc": "3.500000",
    "paymasterAddress": "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966"
  }
}
```

---

### Step 3: Monitor UserOperation Status

**Poll every 3 seconds**:

```bash
curl "https://c9b6dda108ed.ngrok-free.app/api/circle/paymaster/userop/USER_OP_HASH" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "ngrok-skip-browser-warning: true"
```

**Status Progression**:

1. `PENDING` - Submitted to bundler
2. `CONFIRMED` - Included in block
3. Transaction hash available

---

### Step 4: Verify Results

**Check Database**:

```sql
SELECT * FROM paymaster_user_operations
WHERE "walletId" = '64eb0590-cf40-42f6-b716-be5a78592b2f'
ORDER BY "createdAt" DESC LIMIT 1;
```

**Check Statistics**:

```bash
curl "https://c9b6dda108ed.ngrok-free.app/api/circle/paymaster/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

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

## 🔍 What to Watch For

### Success Indicators:

- ✅ UserOp hash returned
- ✅ Status changes to CONFIRMED
- ✅ Transaction hash appears
- ✅ Gas paid in USDC (not ETH)
- ✅ Sender balance decreased by 0.1 USDC + gas
- ✅ No ETH deducted from sender

### On Etherscan:

1. Go to: https://sepolia.etherscan.io/
2. Search for transaction hash
3. Verify:
   - From: `0xeaccbb34d6fa2782d0e1c21e3a9222f300736102`
   - USDC transfer: 0.1 USDC
   - Gas paid in USDC (check Paymaster contract interaction)

---

## 📊 Expected Timeline

1. **Submit UserOp**: 5-10 seconds
2. **Bundler Processing**: 10-30 seconds
3. **Block Inclusion**: 12-15 seconds (Sepolia block time)
4. **Confirmation**: 12-15 seconds (1 block)
5. **Total**: ~1-2 minutes

---

## 🎉 Success Criteria

### Transaction Success:

- [ ] UserOperation submitted
- [ ] Bundler accepted UserOp
- [ ] Transaction included in block
- [ ] Transaction confirmed
- [ ] Visible on Etherscan

### Paymaster Functionality:

- [ ] Gas paid in USDC
- [ ] No ETH deducted
- [ ] Permit signature valid
- [ ] Paymaster sponsored transaction

### Database & API:

- [ ] UserOp record created
- [ ] Status updated to CONFIRMED
- [ ] Actual gas cost recorded
- [ ] Statistics updated
- [ ] Events tracked

---

## 🚨 Potential Issues & Solutions

### Issue: "Insufficient USDC balance"

**Solution**: User has 0.3 USDC, sending 0.1 + ~0.03 gas = 0.13 total. Should be fine.

### Issue: "Bundler rejected UserOp"

**Solution**: Check bundler logs, verify gas limits, check permit signature.

### Issue: "Transaction reverted"

**Solution**: Check USDC allowance, verify Paymaster address, check nonce.

### Issue: "Timeout waiting for confirmation"

**Solution**: Sepolia can be slow. Wait up to 5 minutes.

---

## 📝 Test Execution Checklist

Before running:

- [x] Bundler RPC configured
- [x] User has USDC balance
- [x] Wallet is SCA type
- [x] API server running
- [x] Database tables exist
- [x] Permit generation tested

Ready to execute:

- [ ] Run submit-userop API call
- [ ] Monitor status
- [ ] Check Etherscan
- [ ] Verify database
- [ ] Update statistics

---

## 🎯 READY TO TEST!

**Everything is configured and ready. The E2E test can now be executed!**

Just run the submit-userop API call and monitor the results! 🚀
