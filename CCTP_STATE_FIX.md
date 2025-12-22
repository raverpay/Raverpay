# CCTP State Update Fix

## Problem

The CCTP transfers were staying in `BURN_PENDING` state forever because:

1. The webhook handler wasn't linking burn transactions to CCTP transfers using the `refId` field
2. The mobile app was using incorrect state names

## Backend Fix (✅ COMPLETED)

### Changes Made to `circle-webhook.service.ts`:

1. **Added refId-based lookup**: Now looks up CCTP transfers by the `refId` from Circle webhooks
2. **Links burn transaction**: Automatically sets `burnTransactionId` when first webhook arrives
3. **Creates CircleTransaction records for CCTP burns**: When a webhook arrives for a CCTP burn transaction that doesn't have a CircleTransaction record yet, it creates one
4. **Tracks all state transitions**: Updates CCTP state for CLEARED, QUEUED, SENT, CONFIRMED states

### The Problem That Was Fixed:

- CCTP service creates a `CircleCCTPTransfer` record and stores the `burnTransactionId`
- But it doesn't create a `CircleTransaction` record for the burn
- When webhooks arrive, the handler was looking for a `CircleTransaction` that didn't exist
- So it would skip processing and the CCTP transfer would stay in `BURN_PENDING` forever

### The Solution:

- When a webhook arrives and no `CircleTransaction` exists, check if it's a CCTP transaction (by `refId`)
- If it is, create the `CircleTransaction` record with all the webhook data
- Then process the CCTP progress update

### State Flow:

```
INITIATED → BURN_PENDING → BURN_CONFIRMED → ATTESTATION_RECEIVED → COMPLETED
```

## Mobile App Fix (⚠️ NEEDS UPDATE)

### Issue

Your mobile app uses **incorrect state names** that don't match the database schema:

**Wrong Names in Mobile:**

- `BURN_COMPLETE` ❌
- `ATTESTATION_COMPLETE` ❌

**Correct Names from Schema:**

- `BURN_CONFIRMED` ✅
- `ATTESTATION_RECEIVED` ✅

### Files to Update

#### 1. Update `src/types/circle.types.ts`

```typescript
export enum CCTPTransferState {
  INITIATED = 'INITIATED',
  BURN_PENDING = 'BURN_PENDING',
  BURN_CONFIRMED = 'BURN_CONFIRMED', // ← Was BURN_COMPLETE
  ATTESTATION_PENDING = 'ATTESTATION_PENDING',
  ATTESTATION_RECEIVED = 'ATTESTATION_RECEIVED', // ← Was ATTESTATION_COMPLETE
  MINT_PENDING = 'MINT_PENDING',
  MINT_CONFIRMED = 'MINT_CONFIRMED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
```

#### 2. Update `app/circle/transaction-status.tsx`

Change these cases:

```typescript
case "BURN_CONFIRMED":  // ← Was BURN_COMPLETE
  return {
    icon: "checkmark-circle-outline" as const,
    color: "#3B82F6",
    title: "Burn Confirmed",  // ← Updated title
    description: "Funds burned. Waiting for attestation...",
    progress: 40,
  };

case "ATTESTATION_RECEIVED":  // ← Was ATTESTATION_COMPLETE
  return {
    icon: "shield-checkmark" as const,
    color: "#3B82F6",
    title: "Attestation Received",  // ← Updated title
    description: "Verification complete. Preparing to mint...",
    progress: 75,
  };
```

## Complete State Progression

### Backend (Database)

```
1. INITIATED          - Transfer created
2. BURN_PENDING       - Burn transaction submitted (CLEARED/QUEUED/SENT)
3. BURN_CONFIRMED     - Burn transaction confirmed on-chain
4. ATTESTATION_PENDING - Waiting for Circle attestation
5. ATTESTATION_RECEIVED - Attestation received from Circle
6. MINT_PENDING       - Mint transaction submitted
7. MINT_CONFIRMED     - Mint transaction confirmed
8. COMPLETED          - Transfer complete
```

### What Webhooks Trigger Updates

| Webhook State | CCTP State Update |
| ------------- | ----------------- |
| CLEARED       | BURN_PENDING      |
| QUEUED        | BURN_PENDING      |
| SENT          | BURN_PENDING      |
| CONFIRMED     | BURN_CONFIRMED    |
| COMPLETE      | BURN_CONFIRMED    |

## Testing

After updating the mobile app:

1. **Create a new CCTP transfer**
2. **Watch the states progress**:
   - Should start at `INITIATED`
   - Move to `BURN_PENDING` when first webhook arrives
   - Move to `BURN_CONFIRMED` when burn tx is confirmed
   - Eventually reach `COMPLETED`

3. **Check the logs** for these messages:
   ```
   Linking burn transaction ... to CCTP transfer ... via refId: CCTP-...
   CCTP burn transaction cleared: ...
   CCTP burn transaction queued: ...
   CCTP burn transaction sent: ...
   CCTP burn confirmed: ... - TxHash: 0x...
   ```

## Summary

✅ **Backend is now fixed** - CCTP transfers will progress through states correctly
⚠️ **Mobile app needs updates** - Change `BURN_COMPLETE` → `BURN_CONFIRMED` and `ATTESTATION_COMPLETE` → `ATTESTATION_RECEIVED`
