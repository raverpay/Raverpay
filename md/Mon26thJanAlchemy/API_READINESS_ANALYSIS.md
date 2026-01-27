# 🔍 Alchemy API Readiness Analysis

**Date**: January 27, 2026  
**Focus**: EOA Wallets Only (No Smart Accounts Yet)  
**Status**: Decision Document

---

## ✅ **APIs READY in Backend**

### **Wallet Management**

| Endpoint              | Method                                                 | Status   | Notes                                   |
| --------------------- | ------------------------------------------------------ | -------- | --------------------------------------- |
| Create EOA Wallet     | `POST /alchemy/wallets`                                | ✅ Ready | Creates EOA with encrypted private key  |
| List Wallets          | `GET /alchemy/wallets`                                 | ✅ Ready | Returns all user wallets                |
| Get Wallet by ID      | `GET /alchemy/wallets/:walletId`                       | ✅ Ready | Returns wallet details                  |
| Get Wallet by Network | `GET /alchemy/wallets/by-network/:blockchain/:network` | ✅ Ready | Finds wallet for specific network       |
| Update Wallet Name    | `PATCH /alchemy/wallets/:walletId/name`                | ✅ Ready | Updates wallet name                     |
| Deactivate Wallet     | `DELETE /alchemy/wallets/:walletId`                    | ✅ Ready | Soft delete (sets state to INACTIVE)    |
| Lock Wallet           | `POST /alchemy/wallets/:walletId/lock`                 | ✅ Ready | Security feature (sets state to LOCKED) |
| Mark Compromised      | `POST /alchemy/wallets/:walletId/compromised`          | ✅ Ready | Emergency shutdown                      |

### **Transactions**

| Endpoint                     | Method                                           | Status   | Notes                                                                         |
| ---------------------------- | ------------------------------------------------ | -------- | ----------------------------------------------------------------------------- |
| Send Token                   | `POST /alchemy/transactions/send`                | ✅ Ready | **USDC/USDT only** - requires walletId, destinationAddress, amount, tokenType |
| Get Token Balance            | `POST /alchemy/transactions/balance`             | ✅ Ready | **USDC/USDT only** - requires walletId, tokenType                             |
| Get Transaction History      | `GET /alchemy/transactions/history/:walletId`    | ✅ Ready | Supports limit/offset pagination                                              |
| Get Transaction by Reference | `GET /alchemy/transactions/reference/:reference` | ✅ Ready | Get single transaction details                                                |

### **Internal Methods (Available for Mobile)**

| Method                                     | Status       | Notes                                                                                 |
| ------------------------------------------ | ------------ | ------------------------------------------------------------------------------------- |
| `getDecryptedPrivateKey(walletId, userId)` | ✅ Available | Returns private key (for export functionality) - **Requires PIN/biometric on mobile** |

---

## ❌ **APIs MISSING (Not Implemented)**

### **Critical for EOA Wallets**

| Feature                                  | Priority  | Impact                               | Backend Work Needed                           |
| ---------------------------------------- | --------- | ------------------------------------ | --------------------------------------------- |
| **Import Wallet** (Seed Phrase)          | 🔴 HIGH   | Users can't import existing wallets  | New endpoint + service method                 |
| **Import Wallet** (Private Key)          | 🔴 HIGH   | Users can't import existing wallets  | New endpoint + service method                 |
| **Export Seed Phrase**                   | 🔴 HIGH   | Users can't backup EOA wallets       | Generate mnemonic from private key + endpoint |
| **Native Token Balance** (ETH/MATIC/ARB) | 🟡 MEDIUM | Can't see gas token balance          | New endpoint using `getBalance` from viem     |
| **Send Native Tokens**                   | 🟡 MEDIUM | Can't send ETH/MATIC/ARB             | Extend send endpoint or new endpoint          |
| **Gas Price Estimation**                 | 🟡 MEDIUM | Can't show gas costs before sending  | New endpoint using `estimateGas` from viem    |
| **Transaction Retry**                    | 🟡 MEDIUM | Failed transactions can't be retried | New endpoint + service method                 |
| **Transaction Cancel**                   | 🟢 LOW    | Can't cancel pending transactions    | New endpoint (replace-by-fee)                 |

### **Nice to Have (Not Critical)**

| Feature            | Priority | Impact               | Backend Work Needed                        |
| ------------------ | -------- | -------------------- | ------------------------------------------ |
| Address Book       | 🟢 LOW   | No saved contacts    | New table + CRUD endpoints                 |
| Push Notifications | 🟢 LOW   | No real-time updates | Webhook integration + notification service |

### **Smart Account Features (Skip for Now)**

| Feature              | Status   | Notes                                                        |
| -------------------- | -------- | ------------------------------------------------------------ |
| Create Smart Account | ✅ Ready | **Skip** - requires gas sponsorship (credit card not set up) |
| Batch Transactions   | ✅ Ready | **Skip** - Smart Account only                                |
| Social Recovery      | ✅ Ready | **Skip** - Smart Account only                                |
| Passkey Recovery     | ✅ Ready | **Skip** - Smart Account only                                |

---

## 🎯 **DECISIONS TO MAKE**

### **Decision 1: Seed Phrase vs Private Key Only**

**Option A: Seed Phrase (BIP-39 Mnemonic)** ✅ **RECOMMENDED**

- **Pros**: Industry standard, easier to backup (12 words vs 64 hex chars), better UX
- **Cons**: Need to generate mnemonic from private key OR change wallet generation to use mnemonic
- **Backend Work**:
  - Option 1: Generate mnemonic during wallet creation, store encrypted mnemonic
  - Option 2: Derive mnemonic from private key when exporting (less secure, not recommended)

**Option B: Private Key Only**

- **Pros**: Already have private keys, no backend changes needed
- **Cons**: Poor UX (64 hex characters), not industry standard, harder to backup
- **Backend Work**: Just expose `getDecryptedPrivateKey` via endpoint (with PIN/biometric check)

**Recommendation**: **Option A** - Generate mnemonic during wallet creation. Store encrypted mnemonic in database.

---

### **Decision 2: Import Wallet Priority**

**Option A: Implement Import First** ✅ **RECOMMENDED**

- Users may have existing wallets from MetaMask, Trust Wallet, etc.
- Essential for wallet portability
- **Backend Work**:
  - `POST /alchemy/wallets/import` endpoint
  - Accept seed phrase OR private key
  - Derive address, check if exists, create wallet

**Option B: Skip Import for MVP**

- Only allow creating new wallets
- Users can't import existing wallets
- **Risk**: Users may abandon if they can't use existing wallets

**Recommendation**: **Option A** - Import is critical for user adoption.

---

### **Decision 3: Native Token Support**

**Current Limitation**: Backend only supports USDC/USDT balances and sends.

**Option A: Add Native Token Support** ✅ **RECOMMENDED**

- Users need ETH/MATIC/ARB for gas fees
- Essential for complete wallet functionality
- **Backend Work**:
  - New endpoint: `GET /alchemy/transactions/balance/native/:walletId`
  - Extend send endpoint: `POST /alchemy/transactions/send-native` OR add `tokenType: 'NATIVE'` to existing endpoint

**Option B: Skip Native Tokens for MVP**

- Only support USDC/USDT
- Users must get native tokens elsewhere for gas
- **Risk**: Poor UX, users confused why they can't see ETH balance

**Recommendation**: **Option A** - Native tokens are essential for gas fees.

---

### **Decision 4: Gas Price Estimation**

**Current Limitation**: No gas price endpoint.

**Option A: Add Gas Estimation** ✅ **RECOMMENDED**

- Show users gas costs before sending
- Better UX (no surprises)
- **Backend Work**:
  - New endpoint: `GET /alchemy/transactions/gas-price/:blockchain/:network`
  - Or: `POST /alchemy/transactions/estimate-gas` (estimate for specific transaction)

**Option B: Skip Gas Estimation**

- Users see gas cost only after transaction is created
- **Risk**: Users may cancel if gas is too high

**Recommendation**: **Option A** - Gas estimation is standard UX.

---

### **Decision 5: Transaction Retry**

**Current Limitation**: Failed transactions can't be retried.

**Option A: Add Retry Functionality** 🟡 **NICE TO HAVE**

- Better UX for network failures
- **Backend Work**:
  - New endpoint: `POST /alchemy/transactions/:txId/retry`
  - Re-submit failed transaction with same parameters

**Option B: Skip Retry**

- Users must manually re-create transaction
- **Risk**: Minor inconvenience

**Recommendation**: **Option B** - Can add later, not critical for MVP.

---

## 📋 **RECOMMENDED IMPLEMENTATION PLAN**

### **Phase 1: Core EOA Features** (MVP)

1. ✅ **Use Existing APIs**:
   - Create wallet
   - List wallets
   - Send USDC/USDT
   - Get USDC/USDT balance
   - Transaction history

2. 🔴 **Backend Work Required**:
   - **Seed Phrase Generation**: Modify `generateEOAWallet` to generate BIP-39 mnemonic, store encrypted
   - **Export Seed Phrase**: `GET /alchemy/wallets/:walletId/export-seed` (requires PIN/biometric)
   - **Import Wallet**: `POST /alchemy/wallets/import` (accept seed phrase or private key)
   - **Native Token Balance**: `GET /alchemy/transactions/balance/native/:walletId`
   - **Send Native Token**: Extend send endpoint or new endpoint
   - **Gas Price**: `GET /alchemy/transactions/gas-price/:blockchain/:network`

3. 🟡 **Mobile Work**:
   - Wallet creation flow with seed phrase backup
   - Import wallet flow
   - Native token balance display
   - Gas price display in send flow
   - Export seed phrase (with PIN/biometric)

### **Phase 2: Enhanced Features** (Post-MVP)

- Transaction retry
- Address book
- Push notifications
- Advanced gas settings

### **Phase 3: Smart Accounts** (Future)

- When credit card is accepted for gas sponsorship
- Passkey setup
- Social recovery
- Batch transactions

---

## 🚨 **CRITICAL GAPS**

### **1. Seed Phrase Management** 🔴 **BLOCKER**

**Problem**: No way to backup/restore EOA wallets  
**Impact**: Users lose wallets if device is lost  
**Solution**:

- Generate BIP-39 mnemonic during wallet creation
- Store encrypted mnemonic in database
- Add export endpoint (with PIN/biometric protection)
- Add import endpoint

### **2. Import Functionality** 🔴 **BLOCKER**

**Problem**: Users can't import existing wallets  
**Impact**: Poor user adoption, users abandon app  
**Solution**:

- Add import endpoint (seed phrase + private key)
- Validate and derive address
- Check for duplicates

### **3. Native Token Support** 🟡 **HIGH PRIORITY**

**Problem**: Can't see/send ETH/MATIC/ARB (gas tokens)  
**Impact**: Users confused, can't pay gas fees  
**Solution**:

- Add native token balance endpoint
- Extend send endpoint for native tokens

---

## ✅ **WHAT WE CAN BUILD NOW (Without Backend Changes)**

1. **Wallet Dashboard**: List wallets, show balances (USDC/USDT only)
2. **Send Flow**: Send USDC/USDT (with gas estimation if we add endpoint)
3. **Receive Flow**: Show QR code, copy address
4. **Transaction History**: Display past transactions
5. **Wallet Settings**: Rename wallet, view address

**Limitations**:

- No seed phrase backup (users can't restore wallets)
- No import (users can't use existing wallets)
- No native token support (users can't see/send ETH/MATIC/ARB)

---

## 📝 **NEXT STEPS**

1. **Decide on seed phrase approach** (generate during creation vs derive on export)
2. **Prioritize backend work**:
   - Seed phrase generation + export
   - Import wallet
   - Native token support
3. **Start mobile implementation** with existing APIs
4. **Add missing backend endpoints** as needed

---

## 🔗 **Related Files**

- Backend Controller: `apps/raverpay-api/src/alchemy/controllers/alchemy-wallet.controller.ts`
- Backend Service: `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.ts`
- Transaction Service: `apps/raverpay-api/src/alchemy/transactions/alchemy-transaction.service.ts`
- Mobile Plan: `md/Mon26thJanAlchemy/MOBILE_APP_INTEGRATIONS.md`
