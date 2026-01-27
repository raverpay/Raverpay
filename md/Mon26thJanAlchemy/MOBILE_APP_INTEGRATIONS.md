# 📱 Alchemy Mobile App Integration Plan

**Date**: January 27, 2026  
**Status**: ⏸️ Planning  
**Target**: `raverpay-mobile` (Expo/React Native)  
**Last Updated**: January 27, 2026  
**Focus**: **EOA Wallets Only** (Smart Accounts deferred until gas sponsorship is set up)

---

## 🎯 **Objective**

Create a world-class, seamless experience for users to manage their Alchemy-powered **EOA wallets**. The implementation must be intuitive for new users, robust for existing ones, and highly secure.

**⚠️ Important**: This plan focuses on **EOA wallets only**. Smart Accounts require gas sponsorship (Alchemy Gas Manager), which needs a credit card that isn't set up yet. Smart Account features will be added in Phase 2.

---

## 📊 **API Readiness Status**

**See**: [`API_READINESS_ANALYSIS.md`](./API_READINESS_ANALYSIS.md) for detailed backend API status.

### **✅ APIs Ready (Can Use Now)**

- ✅ Create EOA wallet
- ✅ List wallets
- ✅ Get wallet details
- ✅ Send USDC/USDT tokens
- ✅ Get USDC/USDT balance
- ✅ Transaction history
- ✅ Update wallet name
- ✅ Lock/deactivate wallet

### **🔴 APIs Missing (Need Backend Work)**

- ❌ **Seed phrase generation/export** (CRITICAL - users can't backup wallets)
- ❌ **Import wallet** (CRITICAL - users can't import existing wallets)
- ❌ **Native token balance** (ETH/MATIC/ARB) - HIGH PRIORITY
- ❌ **Send native tokens** - HIGH PRIORITY
- ❌ **Gas price estimation** - MEDIUM PRIORITY
- ❌ Transaction retry - LOW PRIORITY

### **⏸️ Deferred (Smart Accounts)**

- ⏸️ Create Smart Account (requires gas sponsorship)
- ⏸️ Batch transactions
- ⏸️ Social recovery
- ⏸️ Passkey recovery

---

## 🛠️ **Technical Foundation**

### **1. API Endpoints (`lib/api/endpoints.ts`)**

Add the following to `API_ENDPOINTS`:

```typescript
ALCHEMY: {
  WALLETS: {
    LIST: '/alchemy/wallets',
    CREATE: '/alchemy/wallets',
    DETAIL: (id: string) => `/alchemy/wallets/${id}`,
    BY_NETWORK: (chain: string, net: string) => `/alchemy/wallets/by-network/${chain}/${net}`,
    UPDATE_NAME: (id: string) => `/alchemy/wallets/${id}/name`,
    DEACTIVATE: (id: string) => `/alchemy/wallets/${id}`,
  },
  TRANSACTIONS: {
    SEND: '/alchemy/transactions/send',
    BALANCE: '/alchemy/transactions/balance',
    HISTORY: '/alchemy/transactions/history',
    GAS_PRICE: '/alchemy/transactions/gas-price',
  }
}
```

### **2. Service Layer (`services/alchemy.service.ts`)**

Implement a class-based service following the project pattern to handle data fetching and errors.

### **3. Components & UI**

**Core Components**:

- **Wallet Card**: Visual representation of the wallet with balance, chain badge, and account type indicator (EOA vs Smart Account)
- **Network Selector**: Clean UI to switch between Base, Polygon, and Arbitrum with:
  - Network status indicator (connected/disconnected)
  - RPC endpoint health check
  - Network-specific token support badges
- **Transaction Item**: Detailed row for transaction history with:
  - Status icons (pending, confirmed, failed)
  - Token icons and amounts
  - Timestamp (relative: "2 hours ago" + absolute)
  - Tap to view details
- **Gas Savings Widget**: Visual tracker showing "Total Gas Saved" via sponsorship with:
  - Lifetime savings counter
  - Monthly savings chart
  - Estimated annual savings projection

**New Components Needed**:

- **Seed Phrase Display**: Secure word-by-word reveal component with verification quiz
- **QR Code Scanner**: Camera-based scanner with address validation
- **Address Book Card**: Contact card with avatar, name, address (truncated), and quick-send button
- **Gas Price Selector**: Slider/buttons for Standard/Fast/Custom gas selection
- **Network Badge**: Visual indicator showing current network (with color coding)
- **Transaction Status Tracker**: Real-time status updates with progress bar
- **Asset List**: Multi-token balance display with native tokens (ETH/MATIC/ARB) + ERC20 tokens
- **Recovery Setup Wizard**: Step-by-step flow for passkey/social recovery setup

---

## 🛣️ **User Journeys**

### **1. First-Time Alchemy User** (EOA Only)

- **Educational Onboarding**: A 2-3 slide carousel explaining:
  - What is a crypto wallet?
  - How to backup your wallet (seed phrase)
  - Security best practices
- **Creation Flow**:
  - **Network Selection**: Choose blockchain (Base, Polygon, Arbitrum) and network (mainnet/testnet)
  - **Wallet Creation**: Automated creation with progress bar
  - **Seed Phrase Backup** 🔴 **CRITICAL**:
    - Display 12-word recovery phrase (word-by-word, requires PIN/biometric to reveal)
    - Verification quiz (user must select words in correct order)
    - **Warning**: "Store securely. RaverPay cannot recover lost seed phrases."
    - Options: Copy to clipboard, Save to secure location, Write down physically
- **Security**:
  - PIN/biometric setup for transaction signing
  - Seed phrase backup verification
  - **Note**: Private key export available but seed phrase is preferred

### **2. Existing / Returning User**

- **Wallet Detection**: On login, automatically load existing Alchemy wallets
- **Dashboard**: Overview of all active wallets across different chains
  - Show USDC/USDT balances (native token balances when backend is ready)
  - Network badges (Base/Polygon/Arbitrum)
  - Quick actions: Send, Receive, View Details
- **Import Existing Wallet** 🔴 **CRITICAL** (when backend is ready):
  - Import via 12-word seed phrase
  - Import via private key (QR scan or manual entry)
  - Validate and link to user account
- **Real-time Sync**: Automatic UI refresh when backend receives Alchemy webhooks (Socket.io or polling fallback)

### **3. Transaction Flow** (EOA Wallets Only)

#### **Send Token Flow**

1. **Recipient Selection**:
   - Manual address input (with validation and checksum verification)
   - **QR Code Scanner**: Scan recipient address
   - **Paste from Clipboard**: Auto-detect and validate address
   - **Address Book**: 🟡 Deferred (can add later)

2. **Amount Input**:
   - **Token selector**: USDC, USDT (Native tokens when backend is ready)
   - Amount input with fiat (USD/NGN) conversion display
   - **Max Button**: Auto-fill maximum available (accounting for gas)
   - **Balance Display**: Show available balance prominently
   - **Insufficient Balance Warning**: Real-time validation

3. **Gas Estimation & Display** 🔴 **NEEDS BACKEND**:
   - Show estimated gas fee in native token (ETH/MATIC/ARB)
   - Show gas fee in USD equivalent
   - **Gas Price Options**: Standard, Fast, Custom (when backend supports)
   - Real-time gas price updates (when backend endpoint is ready)
   - **Current Limitation**: Can't show gas cost until backend adds gas price endpoint

4. **Transaction Review**:
   - Summary card showing:
     - Recipient address (with checksummed format)
     - Amount (token + USD equivalent)
     - Network fee (when available)
     - Total amount
     - Network indicator (Base/Polygon/Arbitrum badge)
   - **Transaction Speed**: Estimated confirmation time (when gas price available)

5. **Confirmation**:
   - **Transaction PIN** or **Biometrics** required
   - **Transaction Signing**: Handled securely in backend (private key never exposed to mobile)
   - Loading state with progress: "Signing..." → "Submitting..." → "Confirming..."

6. **Success View**:
   - Confetti animation
   - Transaction hash (with copy button)
   - "View on Explorer" button (links to Etherscan/Polygonscan/etc.)
   - "Share Receipt" action (generates shareable image/PDF)

7. **Error Handling**:
   - **Failed Transactions**:
     - Clear error message (user-friendly, not technical)
     - "Retry" button 🟡 (when backend supports retry)
     - Link to support if error persists
   - **Network Errors**:
     - "Transaction pending - check status later"
     - Show in pending transactions list
   - **Insufficient Gas**:
     - Clear message: "Not enough [TOKEN] for gas fees"
     - "Add Funds" button linking to receive screen

#### **Receive Flow**

1. **QR Code Display**:
   - Large QR code with wallet address
   - Address displayed below (with copy button)
   - **Share Options**: Share as image or text
   - **Network Badge**: Clear indicator of which network (Base/Polygon/Arbitrum)

2. **Copy Address**:
   - One-tap copy with toast confirmation
   - Show first 6 + last 4 characters for verification
   - Full address available on tap

#### **Native Token Support** 🔴 **NEEDS BACKEND**

- **Balance Display**: Show ETH/MATIC/ARB balance (when backend endpoint is ready)
- **Send Native Tokens**: Send ETH/MATIC/ARB (when backend endpoint is ready)
- **Current Limitation**: Only USDC/USDT supported until backend adds native token endpoints

---

## 🔐 **Security & Recovery**

### **1. Seed Phrase / Recovery Phrase Management** ⚠️ **CRITICAL - Industry Standard**

**For EOA Wallets** (Standard Practice - Coinbase, MetaMask, Trust Wallet):

- **12-Word Mnemonic Generation**: Generate BIP-39 compliant 12-word recovery phrase during wallet creation
- **Secure Display Flow**:
  1. Show phrase word-by-word with "Reveal" button (requires PIN/biometric)
  2. **Never show all words at once** - display 3-4 words at a time
  3. Require user to verify by selecting words in correct order
  4. **Critical Warning**: "Never share your recovery phrase. Anyone with these words can access your wallet."
- **Backup Options**:
  - **Cloud Backup** (Encrypted): Store encrypted phrase in iCloud/Google Drive with separate password
  - **Manual Backup**: Copy to secure password manager or write down physically
  - **Never store unencrypted** in device storage or screenshots
- **Recovery Phrase Verification**: User must correctly verify phrase before wallet is activated
- **Export Functionality**: Allow users to re-view their recovery phrase (with PIN/biometric) for backup purposes

**Implementation Notes**:

- Use `@scure/bip39` or `viem/accounts` for mnemonic generation
- Store encrypted mnemonic in SecureStore (never plaintext)
- Display warning: "RaverPay cannot recover lost recovery phrases. Store securely."

### **2. Import Existing Wallet** ⚠️ **MISSING - Industry Standard**

**Import Methods** (Standard across all major wallets):

- **Import via Recovery Phrase**:
  - 12-word mnemonic input (with word suggestions/autocomplete)
  - Validate phrase checksum before proceeding
  - Derive wallet address and verify it matches expected format
- **Import via Private Key**:
  - QR code scan or manual entry
  - Validate private key format (0x + 64 hex chars)
  - Show derived address for confirmation
- **Import via Keystore File**:
  - Support JSON keystore files (MetaMask, Trust Wallet format)
  - Require password to decrypt
- **Wallet Detection**:
  - Check if imported wallet already exists in system
  - Offer to "Link" existing wallet vs "Create New"

**UI Flow**:

```
[Create New Wallet] [Import Existing Wallet]
  ↓
[Enter 12-word recovery phrase]
  ↓
[Verify phrase] → [Set wallet name] → [Done]
```

### **3. Private Key Management**

- **EOA Wallets**: Users can view and copy their private key after passing biometric/PIN authentication.
- **Warning UI**: Critical red "Security Zone" warning about sharing private keys.
- **Export Options**:
  - Export as QR code (for scanning into other wallets)
  - Copy to clipboard (with auto-clear after 60 seconds)
  - Export as JSON keystore file (encrypted with user password)

### **4. Recovery (Smart Accounts)** - Enhanced

**Alchemy Account Kit Standard Features**:

- **Passkey Recovery** (Primary Method):
  - Register recovery EOA during smart account setup
  - Generate recovery mnemonic (12 words) - user must store securely
  - If passkey lost, use recovery mnemonic to restore access
- **Social Recovery**:
  - Link email as recovery owner
  - Link trusted contacts (friends/family) as recovery guardians
  - Require threshold of guardians to approve recovery (e.g., 3 of 5)
- **Recovery Questions** (Backend Integration):
  - Set up security questions during wallet creation
  - Use answers to verify identity during recovery flow
- **Recovery Flow UI**:
  - Clear "Lost Access?" button on login screen
  - Step-by-step recovery wizard
  - Progress indicators and estimated time

### **5. Verification Layer**

- **PIN Lock**: All critical actions (Send, View Key, Deactivate, Export) require the user's 4/6 digit Transaction PIN.
- **Biometric Prompt**: Seamless FaceID/Fingerprint fallback for confirmed users.
- **Session Management**:
  - PIN/biometric required after app backgrounded for >5 minutes
  - Auto-lock after 15 minutes of inactivity

---

## 🎨 **Screen Architecture (`app/alchemy/`)**

| Screen                   | Description                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `index.tsx`              | **Main Dashboard**: Tabbed view of all wallets + "Gas Savings" tracker + network selector.             |
| `onboarding.tsx`         | **Education**: Carousel explaining Smart Accounts & AA benefits (3-5 slides).                          |
| `create.tsx`             | **Wallet Creation**: Step-by-step wizard for chain/account type selection.                             |
| `import.tsx`             | **Import Wallet**: Import via seed phrase, private key, or keystore file. ⚠️ **NEW**                   |
| `seed-phrase-backup.tsx` | **Seed Phrase Backup**: Display and verify recovery phrase (EOA wallets). ⚠️ **NEW**                   |
| `wallet/[id].tsx`        | **Wallet Detail**: Balance, "Send" button, "Receive" button, Assets list (native + ERC20).             |
| `wallet/[id]/assets.tsx` | **Assets View**: Detailed list of all tokens (native + ERC20) with balances. ⚠️ **NEW**                |
| `transaction/[id].tsx`   | **Transaction Details**: Full breakdown (Hash, Fees, Block Explorer, Status tracking).                 |
| `send.tsx`               | **Transaction Wizard**: Recipient → Amount → Review → Confirm → Success.                               |
| `send-batch.tsx`         | **Batch Send**: Multi-recipient transaction (Smart Accounts only). ⚠️ **NEW**                          |
| `receive.tsx`            | **QR Code View**: QR code + address + share options + payment request link.                            |
| `settings/[id].tsx`      | **Wallet Settings**: Rename, Export Private Key, Export Seed Phrase, Recovery Setup, Network Settings. |
| `recovery/setup.tsx`     | **Recovery Setup**: Configure passkey recovery or social recovery. ⚠️ **NEW**                          |
| `recovery/initiate.tsx`  | **Recovery Flow**: Step-by-step recovery wizard for lost access. ⚠️ **NEW**                            |
| `address-book/index.tsx` | **Address Book**: List of saved contacts with quick-send. ⚠️ **NEW**                                   |
| `address-book/add.tsx`   | **Add Contact**: Save address with name and optional avatar. ⚠️ **NEW**                                |
| `gas-settings.tsx`       | **Gas Settings**: Customize gas price (EOA wallets). ⚠️ **NEW**                                        |

---

## 🎣 **Hooks & State (`hooks/useAlchemy.ts`)**

Create shared hooks for data fetching:

- `useAlchemyWallets()`: Fetch list of wallets.
- `useAlchemyTransactions(walletId?)`: Fetch transaction history.
- `useAlchemyTransactionDetails(id)`: Fetch single transaction with explorer links.
- `useAlchemyGasStats()`: Fetch total gas saved/sponsored for the user.
- `useAlchemySend()`: Mutation for sending tokens with sponsorship check.

---

## 🚀 **Implementation Plan**

### **Phase 1: MVP with Existing APIs** (Start Here)

**What We Can Build Now** (Backend APIs Ready):

1. ✅ **Step 1**: Register API endpoints and create `alchemy.types.ts`
2. ✅ **Step 2**: Build `AlchemyService` and hooks (`useAlchemy.ts`)
3. ✅ **Step 3**: Implement **Main Dashboard** (list wallets, show balances)
4. ✅ **Step 4**: Implement **Wallet Creation** (EOA only, no seed phrase yet)
5. ✅ **Step 5**: Build **Send Flow** (USDC/USDT only, no gas estimation yet)
6. ✅ **Step 6**: Implement **Receive Flow** (QR code, copy address)
7. ✅ **Step 7**: Implement **Transaction History** screen
8. ✅ **Step 8**: Add **Wallet Settings** (rename, view address)

**Limitations**:

- ❌ No seed phrase backup (users can't restore wallets)
- ❌ No import (users can't use existing wallets)
- ❌ No native token support (can't see/send ETH/MATIC/ARB)
- ❌ No gas price display (users don't know gas cost)

---

### **Phase 2: Critical Backend Work** (Blockers)

**Backend Must Implement** (Before Production):

1. 🔴 **Seed Phrase Generation & Export**
   - Modify `generateEOAWallet` to generate BIP-39 mnemonic
   - Store encrypted mnemonic in database
   - Add `GET /alchemy/wallets/:walletId/export-seed` endpoint

2. 🔴 **Import Wallet**
   - Add `POST /alchemy/wallets/import` endpoint
   - Accept seed phrase or private key
   - Derive address and create wallet

3. 🟡 **Native Token Support**
   - Add `GET /alchemy/transactions/balance/native/:walletId` endpoint
   - Extend send endpoint for native tokens OR add `POST /alchemy/transactions/send-native`

4. 🟡 **Gas Price Estimation**
   - Add `GET /alchemy/transactions/gas-price/:blockchain/:network` endpoint
   - Or: `POST /alchemy/transactions/estimate-gas`

**Mobile Work** (After Backend):

- Seed phrase backup flow
- Import wallet flow
- Native token balance display
- Gas price display in send flow

---

### **Phase 3: Enhanced Features** (Post-MVP)

**Nice to Have**:

- Transaction retry
- Address book (can be local only)
- Push notifications
- Deep linking

---

### **Phase 4: Smart Accounts** (Future)

**When**: Gas sponsorship is set up

- Smart Account creation
- Batch transactions
- Social recovery
- Passkey recovery

---

## 💡 **Next Actions**

### **Immediate (Can Start Now)**

- [ ] Review the mobile app's `crypto` folder for component reuse
- [ ] Register API endpoints in `lib/api/endpoints.ts`
- [ ] Create `alchemy.types.ts` with TypeScript types
- [ ] Build `AlchemyService` class
- [ ] Create hooks (`useAlchemy.ts`)
- [ ] Implement Main Dashboard (list wallets)
- [ ] Implement Wallet Creation flow (EOA only)
- [ ] Implement Send Flow (USDC/USDT only)
- [ ] Implement Receive Flow

### **Backend Work Required** (Before Production)

- [ ] **CRITICAL**: Implement seed phrase generation in `generateEOAWallet`
- [ ] **CRITICAL**: Add seed phrase export endpoint
- [ ] **CRITICAL**: Add wallet import endpoint
- [ ] **HIGH**: Add native token balance endpoint
- [ ] **HIGH**: Add native token send endpoint
- [ ] **MEDIUM**: Add gas price estimation endpoint

### **Mobile Work** (After Backend)

- [ ] Implement seed phrase backup flow
- [ ] Implement wallet import flow
- [ ] Add native token support
- [ ] Add gas price display

---

## 📋 **Decision Summary**

1. ✅ **EOA Only**: Focus on EOA wallets, defer Smart Accounts
2. 🔴 **Seed Phrase**: Must implement (generate during creation, export endpoint)
3. 🔴 **Import**: Must implement (seed phrase + private key)
4. 🟡 **Native Tokens**: High priority (balance + send endpoints)
5. 🟡 **Gas Estimation**: Medium priority (gas price endpoint)
6. 🟢 **Retry/Address Book**: Low priority (can add later)
7. ⏸️ **Smart Accounts**: Deferred until gas sponsorship is set up

See [`API_READINESS_ANALYSIS.md`](./API_READINESS_ANALYSIS.md) for detailed backend API status and decisions.

---

---

## 🚨 **Critical Missing Features** (Backend Work Required)

### **1. Seed Phrase / Recovery Phrase** 🔴 **BLOCKER - HIGH PRIORITY**

**Status**: ❌ **Backend Not Implemented**  
**Industry Standard**: ✅ Required by Coinbase, MetaMask, Trust Wallet  
**Why Critical**:

- EOA wallets are unusable without recovery phrase
- Users cannot restore wallets if device is lost
- No way to export wallet to other apps
- Security risk if users don't understand backup importance

**Backend Work Required**:

- Generate BIP-39 12-word mnemonic during EOA creation (modify `generateEOAWallet`)
- Store encrypted mnemonic in database (new field in `AlchemyWallet` table)
- Add endpoint: `GET /alchemy/wallets/:walletId/export-seed` (requires PIN/biometric verification)

**Mobile Work Required**:

- Secure display flow with verification quiz
- Export functionality (with PIN/biometric protection)
- Recovery flow for importing existing phrase

### **2. Import Existing Wallet** 🔴 **BLOCKER - HIGH PRIORITY**

**Status**: ❌ **Backend Not Implemented**  
**Industry Standard**: ✅ Standard feature in all major wallets  
**Why Critical**:

- Users expect to import wallets from other apps
- Essential for wallet portability
- Users may have existing wallets they want to use

**Backend Work Required**:

- Add endpoint: `POST /alchemy/wallets/import`
- Accept seed phrase (12-word mnemonic) OR private key
- Derive address, check for duplicates, create wallet

**Mobile Work Required**:

- Import via 12-word recovery phrase (with word suggestions)
- Import via private key (QR scan or manual entry)
- Wallet detection and linking

### **3. Native Token Support** 🟡 **HIGH PRIORITY - NEEDS BACKEND**

**Status**: ❌ **Backend Not Implemented** (Only USDC/USDT supported)  
**Industry Standard**: ✅ All wallets support native tokens (ETH/MATIC/ARB)  
**Why Important**:

- Users need native tokens (ETH/MATIC/ARB) for gas fees
- Essential for complete wallet functionality
- Users confused if they can't see ETH balance

**Backend Work Required**:

- Add endpoint: `GET /alchemy/transactions/balance/native/:walletId`
- Extend send endpoint to support native tokens OR add: `POST /alchemy/transactions/send-native`
- Use `getBalance` from viem to fetch native token balance

**Mobile Work Required**:

- Display native token balance (ETH/MATIC/ARB)
- Support sending/receiving native tokens
- Show native token balance in wallet card

### **4. Gas Price Estimation** 🟡 **MEDIUM PRIORITY - NEEDS BACKEND**

**Status**: ❌ **Backend Not Implemented**  
**Industry Standard**: ✅ All wallets show gas costs before sending  
**Why Important**:

- Users want to know gas costs before confirming
- Better UX (no surprises)
- Essential for EOA wallets (users pay gas)

**Backend Work Required**:

- Add endpoint: `GET /alchemy/transactions/gas-price/:blockchain/:network`
- Or: `POST /alchemy/transactions/estimate-gas` (estimate for specific transaction)
- Use viem's `estimateGas` or fetch from RPC

**Mobile Work Required**:

- Display gas price in send flow
- Show gas cost in USD equivalent
- Gas price options (Standard/Fast/Custom) when backend supports

### **5. Transaction Retry** 🟢 **LOW PRIORITY - NICE TO HAVE**

**Status**: ❌ **Backend Not Implemented**  
**Industry Standard**: ✅ All wallets allow retry failed transactions  
**Why Nice to Have**:

- Better UX for network failures
- Users don't need to manually re-create transaction

**Backend Work Required**:

- Add endpoint: `POST /alchemy/transactions/:txId/retry`
- Re-submit failed transaction with same parameters

**Mobile Work Required**:

- "Retry" button on failed transactions
- Show retry status

### **6. Address Book / Contacts** 🟢 **LOW PRIORITY - CAN BE LOCAL ONLY**

**Status**: ⏸️ **Can implement locally (no backend needed)**  
**Industry Standard**: ✅ Common feature for frequent recipients  
**Why Nice to Have**:

- Improves UX for repeated transactions
- Reduces address input errors
- Faster transaction flow

**Implementation**:

- **Option A**: Local storage only (AsyncStorage/SecureStore)
- **Option B**: Backend sync (new table + CRUD endpoints)
- **Recommendation**: Start with Option A (local only), add sync later if needed

### **7. Push Notifications** 🟢 **LOW PRIORITY - NICE TO HAVE**

**Status**: ⏸️ **Can add later**  
**Industry Standard**: ✅ Real-time transaction status updates  
**Why Nice to Have**:

- Users want instant transaction confirmations
- Better than polling for status

**Implementation**:

- Backend webhook integration (already exists)
- Mobile push notification service
- Notification preferences

### **8. Deep Linking** 🟢 **LOW PRIORITY - NICE TO HAVE**

**Status**: ⏸️ **Can add later**  
**Industry Standard**: ✅ Support for ethereum:// protocol  
**Why Nice to Have**:

- Users can open wallet from payment links
- Better integration with dApps

**Implementation**:

- Handle `ethereum:` protocol links
- Auto-fill send form from payment request

---

## ⏸️ **DEFERRED: Smart Account Features** (Phase 2)

**When**: After gas sponsorship (Alchemy Gas Manager) is set up with credit card

### **Smart Account Features** (Not in MVP)

- ⏸️ Create Smart Account (requires gas sponsorship)
- ⏸️ Batch transactions
- ⏸️ Social recovery
- ⏸️ Passkey recovery
- ⏸️ Gas sponsorship UI ("Gas Sponsored by RaverPay" badge)

**Note**: Backend already has Smart Account endpoints, but we're deferring mobile implementation until gas sponsorship is configured.

---

## 💡 **Next Actions**

- [ ] Review the mobile app's `crypto` folder for component reuse.
- [ ] **PRIORITY**: Implement seed phrase generation and backup flow (EOA wallets).
- [ ] **PRIORITY**: Implement wallet import functionality (seed phrase, private key).
- [ ] Add native token (ETH/MATIC/ARB) support to balance and send flows.
- [ ] Implement address book/contacts feature.
- [ ] Add transaction retry and error handling.
- [ ] Set up push notifications for transaction status.
- [ ] Implement passkey setup flow for Smart Accounts.
- [ ] Add social recovery setup and initiation flows.
- [ ] Begin Step 1 of implementation.
