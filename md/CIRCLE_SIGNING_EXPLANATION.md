# Circle Typed Data Signing for Paymaster

## Overview

For developer-controlled Circle wallets, the backend can sign EIP-712 typed data (permits) using Circle's API.

## Circle API Endpoint

```
POST /v1/w3s/developer/transactions/contractExecution
```

## How It Works

### Step 1: Generate Permit Typed Data

Already implemented in `PermitService.generatePermitTypedData()`

### Step 2: Sign with Circle's API

Circle's developer-controlled wallets can sign typed data via their API.

**Request Format**:

```typescript
{
  "idempotencyKey": "uuid",
  "walletId": "circle-wallet-id",
  "abiFunctionSignature": "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
  "abiParameters": [...],
  "contractAddress": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC
  "feeLevel": "MEDIUM"
}
```

## Alternative: Use EIP-191 Personal Sign

Circle also supports personal message signing:

```
POST /v1/w3s/developer/transactions/sign
```

But for EIP-2612 permits, we need **EIP-712 typed data signing**.

## The Issue

Looking at Circle's current API documentation, **typed data signing for developer-controlled wallets is limited**.

## Solution: Two Approaches

### Approach 1: Use Circle's Transaction API (Current)

Instead of signing a permit separately, we can:

1. Skip the permit signature requirement
2. Use Circle's regular transaction API to approve USDC to Paymaster
3. Then submit the UserOperation

**Pros**: Works with current Circle API
**Cons**: Requires 2 transactions (approve + transfer)

### Approach 2: Modify Paymaster Flow (Recommended)

Since these are developer-controlled wallets:

1. Backend generates the permit typed data
2. Backend uses Circle's signing capability (if available)
3. If not available, use a workaround:
   - Pre-approve USDC to Paymaster contract
   - Use a different Paymaster mode that doesn't require permits

## Recommended Implementation

For **developer-controlled wallets**, the cleanest approach is:

### Option A: Pre-Approval Method

```typescript
// 1. One-time: Approve Paymaster to spend USDC
await circleApi.post('/v1/w3s/developer/transactions/transfer', {
  walletId: wallet.circleWalletId,
  tokenId: 'USDC',
  destinationAddress: PAYMASTER_ADDRESS,
  amounts: ['999999999'], // Large approval
  // This is an ERC-20 approve transaction
});

// 2. Then submit UserOps without permit signature
// Paymaster checks existing allowance instead of permit
```

### Option B: Use User-Controlled Wallets for Paymaster

For the **mobile app**, users can have user-controlled wallets where:

- User signs the permit on their device
- Full EIP-2612 flow works as designed
- More decentralized

## Current Status

Your implementation is **correct for user-controlled wallets**. For developer-controlled wallets, you have two paths:

1. **Keep current implementation** - Works when you add user-controlled wallet support
2. **Add pre-approval flow** - Works now with developer-controlled wallets

## Recommendation

Since you want to test **now** with developer-controlled wallets:

**Use a mock/test signature** for the E2E test, OR implement the pre-approval flow.

For **production**, consider:

- User-controlled wallets for Paymaster (better UX, true gasless)
- Developer-controlled wallets for regular transactions

This is why most Paymaster implementations use **user-controlled wallets** - the user signs the permit on their device, giving true gasless transactions.
