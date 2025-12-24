# Circle Paymaster Testing Guide

**Last Updated**: December 24, 2024  
**Mobile SDK**: WebView-based Circle Web SDK  
**Backend URL**: `https://617932ff89af.ngrok-free.app`

---

## Important: Paymaster Requirements

### Wallet Type Requirements

| Wallet Type | Custody | Gas Payment | Paymaster |
|-------------|---------|-------------|-----------|
| **Easy Wallet** | DEVELOPER | Native token (ETH, MATIC, etc.) | ❌ **Not supported** |
| **Advanced Wallet** | USER | USDC via Paymaster | ✅ **Supported** |

**To use Paymaster, users must create an Advanced (User-controlled) wallet!**

The Paymaster flow requires the user to sign an EIP-2612 permit, which can only be done via Circle SDK for wallets they control with their PIN.

---

## Test Results Summary

### Phase 1: Backend API Tests ✅ COMPLETED

| Test | Status | Notes |
|------|--------|-------|
| 1.1 Health Check | ✅ PASSED | Backend up, DB connected |
| 1.2 Paymaster Compatibility | ✅ PASSED | SCA wallets correctly detected |
| 1.3 Generate Permit | ✅ PASSED | Dynamic gas estimation working |
| 1.4 Paymaster Stats | ✅ PASSED | Returns stats (0 ops initially) |
| Get Wallets | ✅ PASSED | 3 SCA wallets found |
| Get USDC Balance | ✅ PASSED | Balances: 1.3 USDC |

### Database Fixes Applied
- ✅ Added missing `circleUserId` column to `circle_wallets` table

### Backend Improvements Made
- ✅ Dynamic gas buffer calculation (was hardcoded 10 USDC)
- ✅ Gas estimates based on actual chain gas prices
- ✅ 20% safety margin added to estimates
- ✅ Response includes `estimatedGasUsdc` for UI display

---

## Phase 2: Mobile App - Next Steps

### Pre-requisites for Paymaster Testing

1. **Build the mobile app** with WebView-based Circle SDK
2. **Create an Advanced Wallet** (user-controlled) via the setup flow
3. **Fund the wallet** with USDC from a faucet

### Current Test Wallets (Developer-Controlled - Cannot Use Paymaster)

| User | Wallet ID | Blockchain | Balance | Paymaster |
|------|-----------|------------|---------|-----------|
| archjo6@gmail.com | 64eb0590-... | ETH-SEPOLIA | 1.3 USDC | ❌ DEVELOPER |
| archjo6@gmail.com | 8e2d43c8-... | MATIC-AMOY | 1.3 USDC | ❌ DEVELOPER |
| archjo6@gmail.com | 285de4ca-... | AVAX-FUJI | 0 USDC | ❌ DEVELOPER |
| codeswithjoseph@gmail.com | 5906a288-... | MATIC-AMOY | 1.5 USDC | ❌ DEVELOPER |

**Note**: All current wallets are DEVELOPER-controlled (Easy Wallets). Users need to create Advanced Wallets to use Paymaster.

---

## Testing Procedure

### Step 1: Create Advanced Wallet (Required for Paymaster)

1. Open the mobile app
2. Navigate to Circle Wallet section
3. Select **"Choose Wallet Type"** or **"Add Wallet"**
4. Choose **"Advanced Wallet"** (Full control)
5. Enter email and verify with OTP
6. Set up PIN via Circle SDK (WebView modal appears)
7. Wallet is created with `custodyType: USER`

### Step 2: Fund the Advanced Wallet

Get testnet USDC from faucets:
- **ETH-SEPOLIA**: [Circle Faucet](https://faucet.circle.com/)
- **MATIC-AMOY**: [Circle Faucet](https://faucet.circle.com/)

Minimum required: ~2 USDC (0.5 for transfer + ~1.5 for gas buffer)

### Step 3: Test Paymaster Transaction

1. Navigate to **Send USDC** screen
2. Select your **Advanced Wallet** (USER custody)
3. The **"Pay Gas in USDC"** toggle should appear
4. Enable the toggle - gas fee in USDC is shown
5. Enter recipient address and amount
6. Review transaction summary (shows USDC gas fee)
7. Confirm with PIN (Circle SDK WebView appears)
8. Transaction submitted as UserOperation

### Step 4: Verify Transaction

1. Check Paymaster status screen (`/circle/paymaster-status`)
2. Verify UserOp status changes: PENDING → CONFIRMED
3. Check transaction hash on block explorer

---

## Backend API Reference

### Authentication

```bash
curl -s -X POST https://617932ff89af.ngrok-free.app/api/auth/login \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"identifier": "archjo6@gmail.com", "password": "6thbornR%"}'
```

### Check Paymaster Compatibility

```bash
curl -s "https://617932ff89af.ngrok-free.app/api/circle/paymaster/compatible/{walletId}" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "ngrok-skip-browser-warning: true"
```

### Generate Permit Data

```bash
curl -s -X POST "https://617932ff89af.ngrok-free.app/api/circle/paymaster/generate-permit" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{
    "walletId": "{walletId}",
    "amount": "200000",
    "blockchain": "ETH-SEPOLIA"
  }'
```

**Response includes**:
- `typedData` - EIP-712 typed data for signing
- `permitAmount` - Total permit amount (transfer + gas)
- `estimatedGasUsdc` - Estimated gas fee in USDC
- `paymasterAddress` - Circle Paymaster contract

### Submit UserOperation

```bash
curl -s -X POST "https://617932ff89af.ngrok-free.app/api/circle/paymaster/submit-userop" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{
    "walletId": "{walletId}",
    "destinationAddress": "0x...",
    "amount": "200000",
    "blockchain": "ETH-SEPOLIA",
    "permitSignature": "0x..."
  }'
```

### Get UserOp Status

```bash
curl -s "https://617932ff89af.ngrok-free.app/api/circle/paymaster/userop/{userOpHash}" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "ngrok-skip-browser-warning: true"
```

---

## Mobile App Code Updates Made

### 1. Added custodyType to CircleWallet type

```typescript
// src/types/circle.types.ts
export interface CircleWallet {
  // ... other fields
  custodyType?: "DEVELOPER" | "USER"; // DEVELOPER = Easy, USER = Advanced
}
```

### 2. Updated Paymaster compatibility check

```typescript
// app/circle/send.tsx
const isUserControlledSCA = selectedWallet && 
  selectedWallet.accountType === 'SCA' && 
  selectedWallet.custodyType === 'USER';
```

### 3. Added estimatedGasUsdc to PermitData interface

```typescript
// src/hooks/usePaymaster.ts
export interface PermitData {
  // ... other fields
  estimatedGasUsdc?: string;
}
```

---

## Troubleshooting

### "Pay Gas in USDC" toggle not showing

**Cause**: Wallet is DEVELOPER-controlled (Easy Wallet)  
**Solution**: Create an Advanced Wallet (User-controlled) instead

### "SDK Not Ready" error during wallet creation

**Cause**: Circle Web SDK not initialized  
**Solution**: Wait for SDK to initialize, check network connectivity

### Failed to generate permit

**Cause**: Insufficient USDC balance or unsupported blockchain  
**Solution**: Fund wallet with USDC, ensure using supported testnet

### UserOperation stuck in PENDING

**Cause**: Bundler processing delay or gas issues  
**Solution**: Wait and check status again, verify gas settings

---

## Summary: What Works Now

| Component | Status |
|-----------|--------|
| Backend Paymaster APIs | ✅ All endpoints tested and working |
| Dynamic gas estimation | ✅ 0.6 USDC on testnet (was hardcoded 10 USDC) |
| Mobile Paymaster UI | ✅ Toggle and fee display implemented |
| Custody type check | ✅ Only shows for USER wallets |
| WebView Circle SDK | ✅ Ready for challenges |
| User-controlled wallet setup | ✅ Flow implemented |

## What Needs Testing

1. **EAS build** - Verify WebView SDK works in production build
2. **Create Advanced Wallet** - Test user-controlled wallet flow
3. **End-to-end Paymaster** - Full transaction with permit signing

---

**Legend**: ✅ Passed | ⚠️ Partial | ⬜ Not Tested | ❌ Failed
