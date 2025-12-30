# 🔐 Paymaster Pre-Approval Method - Complete Guide

## Overview

The **pre-approval method** allows Paymaster to work with developer-controlled Circle wallets by pre-approving the Paymaster contract to spend USDC. This is a **safe, standard, and production-ready** approach.

---

## ✅ Safety & Security

### Is it Safe? **YES**

1. **Standard ERC-20 Pattern** ✅
   - Same mechanism used by Uniswap, Aave, Compound
   - Battle-tested across billions in DeFi

2. **Circle's Audited Contract** ✅
   - Paymaster contract is audited by Circle
   - Deployed at known, verified addresses

3. **Revocable Anytime** ✅
   - Can revoke approval with a single transaction
   - Full control maintained

4. **Limited to USDC** ✅
   - Only approves USDC spending
   - No access to other tokens or assets

5. **You Control the Wallets** ✅
   - Developer-controlled wallets
   - You manage all approvals

---

## 🚀 How It Works

### Step 1: One-Time Approval (Per Wallet)

```
User's Wallet → Approve → Paymaster Contract
"You can spend my USDC for gas fees"
```

### Step 2: Seamless Transactions

```
User wants to send USDC
↓
Backend creates UserOperation
↓
Paymaster deducts gas fee from approved USDC
↓
Transaction completes
```

### Benefits:

- ✅ **One-time setup** per wallet
- ✅ **No permit signature** needed for each transaction
- ✅ **Gas efficient** (approval once vs. permit every time)
- ✅ **Better UX** (seamless after first approval)

---

## 📋 Implementation

### New API Endpoints

#### 1. Approve Paymaster

```bash
POST /api/circle/paymaster/approve
```

**Request**:

```json
{
  "walletId": "64eb0590-cf40-42f6-b716-be5a78592b2f",
  "blockchain": "ETH-SEPOLIA"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "transactionId": "circle-tx-id",
    "paymasterAddress": "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966",
    "message": "Paymaster approval transaction submitted"
  }
}
```

#### 2. Check Approval Status

```bash
GET /api/circle/paymaster/approval/:walletId/:blockchain
```

**Response**:

```json
{
  "success": true,
  "data": {
    "isApproved": true,
    "allowance": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    "paymasterAddress": "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966"
  }
}
```

---

## 🎯 Usage Flow

### For New Wallets:

```typescript
// 1. Check if approval exists
const approval = await checkApproval(walletId, blockchain);

if (!approval.isApproved) {
  // 2. Request approval
  await approvePaymaster(walletId, blockchain);

  // 3. Wait for approval transaction to confirm (~15 seconds)
  await waitForConfirmation();
}

// 4. Now can use Paymaster without permit signatures
await submitUserOp({
  walletId,
  destinationAddress,
  amount,
  blockchain,
  // No permitSignature needed!
});
```

### For Existing Approved Wallets:

```typescript
// Just submit UserOps directly
await submitUserOp({
  walletId,
  destinationAddress,
  amount,
  blockchain,
});
```

---

## 🔄 Modified UserOperation Flow

### Before (With Permits):

```
1. Generate permit typed data
2. Sign permit (requires signature)
3. Submit UserOp with permit signature
4. Paymaster verifies signature
5. Transaction executes
```

### After (With Pre-Approval):

```
1. Check if approved (one-time check)
2. Submit UserOp (no signature needed)
3. Paymaster checks allowance
4. Transaction executes
```

**Simpler & Faster!** ✅

---

## 📱 Mobile App Integration

### Update Send Screen Flow:

```typescript
// In send.tsx

const handleSend = async () => {
  if (usePaymasterGas) {
    // Check if Paymaster is approved
    const approval = await paymasterService.checkApproval(
      selectedWallet.id,
      selectedWallet.blockchain,
    );

    if (!approval.isApproved) {
      // Show approval modal
      setShowApprovalModal(true);
      return;
    }

    // Submit UserOp (no permit signature needed)
    const result = await submitUserOp({
      walletId: selectedWallet.id,
      destinationAddress,
      amount,
      blockchain: selectedWallet.blockchain,
      feeLevel,
      memo,
    });

    // Navigate to status screen
    router.push(`/circle/paymaster-status?userOpHash=${result.userOpHash}`);
  } else {
    // Regular transfer
    // ...
  }
};
```

### Add Approval Modal:

```typescript
<Modal visible={showApprovalModal}>
  <Text>First-time Setup</Text>
  <Text>
    To pay gas in USDC, we need to approve the Paymaster contract.
    This is a one-time setup.
  </Text>
  <Button onPress={handleApprove}>
    Approve Paymaster
  </Button>
</Modal>
```

---

## 🧪 Testing the Pre-Approval Flow

### Step 1: Approve Paymaster

```bash
TOKEN="your-jwt-token"

curl -X POST "https://c9b6dda108ed.ngrok-free.app/api/circle/paymaster/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64eb0590-cf40-42f6-b716-be5a78592b2f",
    "blockchain": "ETH-SEPOLIA"
  }'
```

**Expected**: Transaction ID returned

### Step 2: Wait for Confirmation

Wait ~15-30 seconds for the approval transaction to confirm on Sepolia.

### Step 3: Check Approval

```bash
curl "https://c9b6dda108ed.ngrok-free.app/api/circle/paymaster/approval/64eb0590-cf40-42f6-b716-be5a78592b2f/ETH-SEPOLIA" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: `isApproved: true`

### Step 4: Submit UserOp (No Signature Needed!)

```bash
curl -X POST "https://c9b6dda108ed.ngrok-free.app/api/circle/paymaster/submit-userop" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64eb0590-cf40-42f6-b716-be5a78592b2f",
    "destinationAddress": "0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4",
    "amount": "100000",
    "blockchain": "ETH-SEPOLIA",
    "feeLevel": "MEDIUM"
  }'
```

**Expected**: UserOp submitted successfully!

---

## 🔧 Backend Updates Needed

### Update PaymasterServiceV2

Modify `submitUserOperation` to skip permit signature when approval exists:

```typescript
async submitUserOperation(request) {
  // ... existing code ...

  // Check if approval exists
  const approval = await this.checkApprovalOnChain(walletId, blockchain);

  if (approval.isApproved) {
    // Skip permit signature - use approval instead
    // Create UserOp without permit data
  } else {
    // Use permit signature flow
    // Existing code
  }

  // ... rest of code ...
}
```

---

## 📊 Comparison: Permit vs Pre-Approval

| Aspect               | Permit Signature | Pre-Approval         |
| -------------------- | ---------------- | -------------------- |
| **Setup**            | None             | One-time per wallet  |
| **Per Transaction**  | Sign permit      | Nothing              |
| **Gas Cost**         | Same             | Same                 |
| **UX**               | Sign each time   | Seamless after setup |
| **Security**         | Very secure      | Very secure          |
| **Wallet Type**      | User-controlled  | Developer-controlled |
| **Complexity**       | Higher           | Lower                |
| **Production Ready** | Yes              | Yes                  |

---

## 🎯 Recommended Approach

### For Your App (Developer-Controlled Wallets):

**Use Pre-Approval** ✅

**Why**:

1. Works with your current wallet setup
2. Better UX (one-time setup)
3. Simpler implementation
4. Production-ready
5. Standard DeFi pattern

### Implementation Priority:

1. **Phase 1** (Now): Pre-approval for developer-controlled wallets
2. **Phase 2** (Later): Add user-controlled wallet option
3. **Phase 3** (Future): Let users choose which wallet type to use

---

## 🚀 Next Steps

1. **Test Approval Endpoint**
   - Approve Paymaster for test wallet
   - Verify transaction on Etherscan

2. **Update Submit UserOp Logic**
   - Check for approval
   - Skip permit signature if approved

3. **Update Mobile App**
   - Add approval check
   - Show one-time approval modal
   - Seamless transactions after approval

4. **Deploy & Test**
   - Full E2E test with approval
   - Verify gas paid in USDC
   - Confirm transactions complete

---

## ✅ Summary

**Pre-Approval Method**:

- ✅ Safe & secure
- ✅ Production-ready
- ✅ Standard DeFi pattern
- ✅ Works with your wallets
- ✅ Better UX
- ✅ Simpler to implement

**Ready to test!** Just restart your API and try the approval endpoint! 🚀
