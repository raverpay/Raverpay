# Paymaster User-Controlled Wallet E2E Test Plan

**Created**: December 29, 2024  
**Updated**: December 29, 2024 - Added Circle SDK signing flow  
**Status**: Ready to Execute  
**Backend URL**: `http://localhost:3001`

---

## Overview

This test plan covers the end-to-end Paymaster transaction flow using **User-Controlled Wallets** (Advanced Wallets). The Paymaster allows users to pay gas fees in USDC instead of native tokens (ETH, MATIC, etc.).

### Key Requirements for Paymaster
- ✅ **Wallet Type**: SCA (Smart Contract Account)
- ✅ **Custody Type**: USER (User-Controlled, not Developer-Controlled)
- ✅ **USDC Balance**: Sufficient to cover transfer + gas fee
- ✅ **Circle SDK**: Required for signing permits via WebView

---

## How Paymaster Works with User-Controlled Wallets

### Flow Diagram
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │   Backend API   │     │   Circle SDK    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ 1. Sign Permit        │                       │
         │ Challenge Request     │                       │
         │──────────────────────>│                       │
         │                       │ 2. Generate Permit    │
         │                       │ + signTypedData       │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │<──────────────────────│
         │                       │ 3. Return challengeId │
         │<──────────────────────│                       │
         │ 4. challengeId        │                       │
         │                       │                       │
         │ 5. Execute Challenge  │                       │
         │ via WebView           │                       │
         │──────────────────────────────────────────────>│
         │                       │                       │
         │                       │      User enters PIN  │
         │<──────────────────────────────────────────────│
         │ 6. Challenge Success  │                       │
         │                       │                       │
         │ 7. Submit UserOp      │                       │
         │──────────────────────>│                       │
         │                       │ 8. Build & Submit     │
         │                       │ to Bundler            │
         │<──────────────────────│                       │
         │ 9. userOpHash         │                       │
         │                       │                       │
```

---

## Test Participants

### User 2: archjo6@gmail.com (Sender - Has USDC)
| Field | Value |
|-------|-------|
| **Email** | archjo6@gmail.com |
| **Password** | 6thbornR% |
| **User ID** | 4341e407-dd8c-4965-ae5b-ecf03c983db1 |

**User-Controlled Wallet (For Testing):**
| Wallet ID | Blockchain | Address | Balance | Paymaster |
|-----------|------------|---------|---------|-----------|
| 193e263b-6d3f-43c1-94bb-4baec95fb8e9 | ETH-SEPOLIA | 0x099434ff29c48f3d42d3ffd904d0fb29b12240db | **3.0 USDC** ✅ | ✅ Compatible |

### User 1: codeswithjoseph@gmail.com (Recipient)
| Field | Value |
|-------|-------|
| **Email** | codeswithjoseph@gmail.com |
| **Password** | 6thbornR% |
| **Recipient Address** | 0x47f9e07fdc3c7e94482aa2cb03af7f229e08d1ce |

---

## Test Scenario: Send 1 USDC Using Paymaster

### Transaction Details
| Field | Value |
|-------|-------|
| **Sender** | archjo6@gmail.com |
| **Sender Wallet** | 193e263b-6d3f-43c1-94bb-4baec95fb8e9 |
| **Blockchain** | ETH-SEPOLIA |
| **Recipient Address** | 0x47f9e07fdc3c7e94482aa2cb03af7f229e08d1ce |
| **Amount** | 1 USDC |
| **Gas Payment** | USDC via Paymaster |

---

## Phase 1: Backend API Tests

### Test 1.1: Sign Permit Challenge (NEW Endpoint)
This is the key endpoint for user-controlled wallets.

```bash
# First, login as User 2
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "archjo6@gmail.com", "password": "6thbornR%"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Get user token from Circle (stored in SecureStore on mobile)
# For testing, you'd need the userToken from the mobile app

# Call sign-permit-challenge
curl -s -X POST "http://localhost:3001/api/circle/paymaster/sign-permit-challenge" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "193e263b-6d3f-43c1-94bb-4baec95fb8e9",
    "amount": "1000000",
    "blockchain": "ETH-SEPOLIA",
    "userToken": "<CIRCLE_USER_TOKEN>",
    "destinationAddress": "0x47f9e07fdc3c7e94482aa2cb03af7f229e08d1ce"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "challengeId": "abc123-...",
    "permitData": {
      "typedData": { ... },
      "permitAmount": "1500000",
      "paymasterAddress": "0x...",
      "usdcAddress": "0x...",
      "estimatedGasUsdc": "0.60"
    },
    "walletId": "193e263b-...",
    "blockchain": "ETH-SEPOLIA"
  }
}
```

---

## Phase 2: Mobile App Flow

### Prerequisites
1. ✅ Mobile app running on device/simulator
2. ✅ Logged in as archjo6@gmail.com
3. ✅ User-controlled wallet visible (with "Self-Custody" badge)
4. ✅ Circle SDK initialized

### Mobile Testing Steps

#### Step 2.1: Navigate to Send Screen
1. Open the mobile app
2. Login as **archjo6@gmail.com**
3. Navigate to **Circle Wallet** tab
4. Select the **ETH-SEPOLIA** user-controlled wallet (has "Self-Custody" badge)
5. Tap **Send**

#### Step 2.2: Verify Paymaster Toggle
1. The **"Pay Gas in USDC"** toggle should appear automatically
2. The toggle should be **enabled by default** for user-controlled wallets
3. Gas fee estimate in USDC should be displayed (~$0.60)
4. **Note**: The gas fee estimate is now calculated locally, not via API calls

#### Step 2.3: Enter Transaction Details
1. **Recipient Address**: `0x47f9e07fdc3c7e94482aa2cb03af7f229e08d1ce`
2. **Amount**: `1` USDC
3. Review the transaction summary:
   - Amount: 1 USDC
   - Gas Fee: ~0.60 USDC
   - Total: ~1.60 USDC

#### Step 2.4: Confirm Transaction
1. Tap **Review & Send**
2. Review confirmation modal
3. Tap **Confirm**
4. **Circle SDK WebView opens** (NOT app PIN modal!)
5. Enter your **Circle PIN** in the WebView
6. WebView closes automatically on success

#### Step 2.5: Verify Transaction Status
1. App navigates to **Paymaster Status** screen automatically
2. UserOperation shows with status: PENDING → CONFIRMED
3. Transaction hash appears when confirmed
4. Verify on Etherscan Sepolia

---

## Key Changes Made

### Backend Changes
1. **New Endpoint**: `POST /circle/paymaster/sign-permit-challenge`
   - Generates EIP-2612 permit typed data
   - Calls Circle SDK `signTypedData` to get challengeId
   - Returns challengeId for mobile to execute

2. **New Service Method**: `UserControlledWalletService.signTypedData()`
   - Calls Circle SDK to create signing challenge

### Mobile Changes
1. **Fixed**: Multiple `generate-permit` API calls
   - Now uses simple client-side gas estimation
   - Actual gas calculated only when user confirms

2. **Fixed**: Wrong PIN modal for Paymaster
   - User-controlled wallets now use Circle SDK WebView
   - Developer-controlled wallets still use app PIN modal

3. **New Flow**: Circle SDK integration for signing
   - Gets challengeId from backend
   - Executes challenge via Circle SDK WebView
   - User enters Circle PIN (not app PIN)
   - Submits UserOperation after successful signing

---

## Success Criteria

### ✅ Pre-Test Verification
- [ ] Backend builds successfully
- [ ] Mobile app compiles without errors
- [ ] User-controlled wallet has USDC balance

### ✅ Transaction Flow
- [ ] "Pay Gas in USDC" toggle appears for user-controlled wallet
- [ ] No excessive API calls during transaction setup
- [ ] Circle WebView opens (not app PIN modal)
- [ ] User can enter Circle PIN in WebView
- [ ] Challenge completes successfully
- [ ] UserOperation submitted to bundler
- [ ] Transaction confirmed on-chain

### ✅ Final State
- [ ] Sender USDC balance decreased by ~1.60 USDC
- [ ] Recipient received 1 USDC
- [ ] No ETH/native token used for gas
- [ ] PaymasterUserOperation recorded in database

---

## Troubleshooting

### Circle WebView shows blank/doesn't open
**Cause**: Circle SDK not initialized or userToken expired  
**Solution**: 
- Check `circle_user_token` in SecureStore
- Re-authenticate Circle user if needed

### "Failed to create signing challenge" error
**Cause**: Backend can't reach Circle API  
**Solution**: Check Circle API key and wallet ID

### Challenge fails in WebView
**Cause**: Wrong PIN or security question  
**Solution**: User must enter correct Circle PIN

### UserOperation fails after signing
**Cause**: Insufficient USDC balance or bundler issue  
**Solution**: Check USDC balance includes gas buffer

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/circle/paymaster/sign-permit-challenge` | POST | **NEW** - Get signing challengeId |
| `/circle/paymaster/generate-permit` | POST | Generate permit data only |
| `/circle/paymaster/submit-userop` | POST | Submit UserOperation |
| `/circle/paymaster/userop/:hash` | GET | Get UserOp status |
| `/circle/paymaster/compatible/:walletId` | GET | Check compatibility |

---

**Ready to test! 🚀**
