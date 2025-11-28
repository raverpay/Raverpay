# Venly Testnet Assets - Important Information

## ⚠️ CRITICAL: API-Created Wallets Do NOT Automatically Receive Testnet Assets

### The Confusion

The Venly documentation mentions that sandbox users get free testnet assets:
- 1 POL Token (testnet MATIC for gas fees)
- 100 Venly Test Tokens (ERC20)
- 1 NFT

**However**, this ONLY applies to wallets created through the **Venly Portal** (https://portal.venly.io), NOT wallets created programmatically via the API.

---

## How Venly Testnet Assets Work

### Portal-Created Wallets ✅
When you sign up at https://portal.venly.io:
- Venly creates a test user for you
- Automatically creates a test wallet
- **Automatically funds it with testnet assets**
- You can view these in the portal dashboard

### API-Created Wallets ❌
When you create wallets via the Venly API (what your app does):
- Wallets are created successfully
- Wallet address is generated
- **BUT: Balance starts at 0** (no automatic funding)
- You must manually fund them with testnet assets

---

## Solutions for Getting Testnet Assets

### Option 1: Use External Faucets (Manual)

**Polygon Mumbai Testnet Faucet:**
1. Go to https://faucet.polygon.technology
2. Enter your wallet address (from `wallet.walletAddress`)
3. Complete verification (usually simple captcha)
4. Receive free testnet MATIC (~0.5 POL)

**Pros:**
- Free and unlimited
- Official Polygon faucet
- No cost to you

**Cons:**
- Manual process (user must do this themselves)
- Requires user to understand faucets
- Takes 1-2 minutes per wallet
- Bad UX for your users

---

### Option 2: Admin Master Wallet (Recommended)

Create an admin "master wallet" funded with testnet assets, then programmatically send small amounts to new user wallets.

**Implementation**:

1. **Create Admin Master Wallet** (One-time setup):
   ```typescript
   // Create admin Venly user + wallet via portal or API
   // Fund it generously from Polygon faucet (do this once)
   // Store the admin wallet ID and PIN securely
   ```

2. **Auto-Fund New User Wallets**:
   ```typescript
   // After creating user wallet
   async fundNewWallet(userWalletAddress: string) {
     // Send 0.1 POL from admin wallet to user wallet
     await this.venly.executeTransaction({
       walletId: ADMIN_WALLET_ID,
       to: userWalletAddress,
       type: 'TRANSFER',
       value: 0.1, // 0.1 POL for gas
       signingMethod: ADMIN_SIGNING_METHOD,
     });
   }
   ```

**Pros:**
- Fully automated
- Great UX (users get funded immediately)
- No manual intervention
- Professional experience

**Cons:**
- Requires maintaining admin wallet balance
- Need to refill admin wallet periodically
- Costs you time to set up initially

---

### Option 3: Backend Faucet Endpoint (Best UX)

Create a backend endpoint that interfaces with Polygon faucet API (if available) or uses your funded admin wallet.

**Implementation**:
```typescript
// Add to crypto-wallet.service.ts
async requestTestnetAssets(userId: string) {
  const wallet = await this.getCryptoWallet(userId);

  // Option A: Use admin wallet to send testnet assets
  await this.fundFromAdminWallet(wallet.walletAddress);

  // Option B: Integrate with Polygon faucet API
  // (Note: Most faucets don't have APIs - requires workarounds)

  return { success: true, message: 'Testnet assets sent!' };
}
```

---

## Recommended Implementation Plan

### For Sandbox (Testnet) Environment:

1. **Immediate Solution** (Do this NOW):
   - Update mobile app to show instructions:
     ```
     Your wallet is ready! To get free testnet assets:
     1. Copy your wallet address below
     2. Visit https://faucet.polygon.technology
     3. Paste your address and claim free POL tokens
     ```

   - Add a "Copy Address" button
   - Add a "Open Faucet" button (deeplink to faucet)

2. **Better Solution** (Implement within a week):
   - Create an admin master wallet
   - Fund it with 10-20 POL from faucet (lasts for 100-200 user wallets)
   - Automatically send 0.1 POL to each new user wallet
   - Monitor admin wallet balance
   - Alert when balance drops below 2 POL

3. **Admin Dashboard Feature**:
   - Add "Fund User Wallet" button in admin dashboard
   - Shows admin master wallet balance
   - Allows admins to manually send testnet assets to users
   - Logs all funding transactions

---

### For Production Environment:

**Testnet assets don't exist in production!**

Users MUST deposit real crypto:
- Buy USDT/USDC on an exchange
- Send to their wallet address
- Gas fees (POL/MATIC) cost real money (~$0.01 per transaction)

**Production Onboarding**:
1. User creates wallet ✅
2. App shows deposit instructions:
   ```
   To start using crypto:
   1. Buy USDT or USDC on Binance/Coinbase
   2. Withdraw to Polygon network
   3. Use this address: 0x742d35Cc...
   4. Minimum: $10 worth
   ```
3. App detects deposit (via webhooks)
4. User can now send/convert crypto

**For Gas Fees**:
- Option A: User deposits small amount of MATIC for gas
- Option B: Venly's "Gas Tank" feature (auto-pays gas, charges you)
- Option C: You subsidize gas from company wallet

---

## Current Issue in Your App

**Problem**: Users create wallets but see 0 balance and can't transact.

**Why**: No testnet funding mechanism implemented.

**Quick Fix** (Next 30 minutes):

1. **Update Wallet Creation Response**:
   ```typescript
   // In crypto-wallet.controller.ts
   return {
     wallet,
     message: 'Wallet created successfully!',
     nextSteps: {
       testnet: true,
       instructions: [
         'Your wallet needs testnet assets to make transactions',
         'Get free POL tokens from: https://faucet.polygon.technology',
         'Copy your wallet address and paste it in the faucet',
       ],
       walletAddress: wallet.walletAddress,
       faucetUrl: 'https://faucet.polygon.technology',
     },
   };
   ```

2. **Update Mobile App**:
   - Show these instructions after wallet creation
   - Add "Get Testnet Assets" button
   - Opens faucet in browser with address pre-filled (if possible)

---

## Backend Implementation for Auto-Funding

If you want to implement auto-funding from an admin wallet, here's the code:

### 1. Create Admin Funding Service

```typescript
// src/crypto/services/crypto-faucet.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VenlyService } from '../venly/venly.service';

@Injectable()
export class CryptoFaucetService {
  private readonly logger = new Logger(CryptoFaucetService.name);

  constructor(
    private readonly venly: VenlyService,
    private readonly config: ConfigService,
  ) {}

  async fundNewWallet(walletAddress: string): Promise<void> {
    const adminWalletId = this.config.get('ADMIN_VENLY_WALLET_ID');
    const adminSigningMethod = this.config.get('ADMIN_SIGNING_METHOD');
    const fundingAmount = 0.1; // 0.1 POL for gas

    try {
      await this.venly.executeTransaction({
        walletId: adminWalletId,
        to: walletAddress,
        type: 'TRANSFER',
        value: fundingAmount,
        signingMethod: adminSigningMethod,
      });

      this.logger.log(`Funded wallet ${walletAddress} with ${fundingAmount} POL`);
    } catch (error) {
      this.logger.error(`Failed to fund wallet ${walletAddress}:`, error);
      // Don't throw - funding failure shouldn't block wallet creation
    }
  }
}
```

### 2. Update Wallet Creation to Auto-Fund

```typescript
// In crypto-wallet.service.ts
async initializeCryptoWallet(params: { userId: string; pin: string }) {
  // ... existing wallet creation code ...

  // After wallet is created
  const wallet = await this.prisma.wallet.create({...});

  // Auto-fund in sandbox mode
  if (process.env.VENLY_ENV === 'sandbox') {
    await this.faucet.fundNewWallet(wallet.walletAddress);
  }

  return wallet;
}
```

---

## Environment Variables Needed

Add to `.env`:
```env
# Admin wallet for funding new testnet wallets
ADMIN_VENLY_WALLET_ID=your-admin-wallet-id
ADMIN_VENLY_USER_ID=your-admin-venly-user-id
ADMIN_SIGNING_METHOD_ID=your-admin-signing-method-id
ADMIN_VENLY_PIN=your-admin-pin-encrypted
```

---

## Summary

**Immediate Action Required**:
1. ✅ Understand that API wallets don't auto-receive testnet assets
2. ✅ Choose a funding strategy (manual faucet OR auto-funding)
3. ✅ Update mobile app to show faucet instructions OR
4. ✅ Implement admin wallet auto-funding

**Recommended Approach**:
- **Short-term**: Show faucet instructions in mobile app
- **Long-term**: Implement admin wallet auto-funding for better UX

**For Production**:
- Remove all testnet funding logic
- Show clear deposit instructions
- Require real crypto deposits
- Consider gas fee sponsorship strategy

---

## Need Help?

If you want me to implement the admin auto-funding solution, I can:
1. Create the faucet service
2. Update wallet creation to auto-fund
3. Add admin dashboard to monitor funding
4. Add alerts when admin wallet runs low

Just let me know which approach you prefer!
