# Alchemy Stablecoin Receiving V1 - Implementation Plan

## Overview

This plan implements **V1** of Alchemy stablecoin integration focused exclusively on **receiving USDC/USDT** on multiple networks. This is a simplified, streamlined version that positions Raverpay as a platform for receiving stablecoins that will be automatically converted to USD in users' Raenest USD wallets.

**Key Principle**: V1 is **receive-only**. Users cannot send stablecoins, import wallets, or manage seed phrases. The focus is on simplicity and security.

---

## V1 Scope

### ✅ What's Included (V1)

- Receive USDC/USDT on multiple networks (Ethereum, Polygon, Arbitrum, Binance Smart Chain, Solana)
- Automatic wallet creation during onboarding flow
- Display wallet address with QR code
- Network-specific warnings when copying address
- Monthly income selection and bank statement upload
- Terms & conditions acceptance
- Admin dashboard for monitoring and crediting user Naira wallets (V2 preparation)

### ❌ What's NOT Included (V1)

- Sending stablecoins (V3+)
- Importing existing wallets (V3+)
- Seed phrase management (V3+)
- Viewing transaction history (V3+)
- Converting stablecoin to Naira (V2)
- Native token (ETH/MATIC/etc.) support (V3+)

---

## User Flow (V1)

### Step 1: Add Money → Currency Selection

**Screen**: Modified `fund-wallet.tsx`

**Current Flow**: Shows "Pay with Card" and "Bank Transfer" tabs

**New Flow**:

1. User clicks "Add Money" on home screen
2. Shows currency selection: **Naira**, **USD**, **EUR**, **GBP**
3. For **Naira**: Shows existing options (Card, Bank Transfer) - **NO CHANGES**
4. For **USD**: Shows **USDT** and **USDC** options

### Step 2: Stablecoin Selection

**Screen**: New `app/stablecoin/select-token.tsx`

**Flow**:

1. User selects **USDT** or **USDC**
2. Shows informational text: _"A stablecoin address is required for receiving USDT/USDC. This address will be automatically created for you."_
3. Shows **"Select Network"** dropdown/selector

### Step 3: Network Selection

**Screen**: Same `app/stablecoin/select-token.tsx` (expanded)

**USDT Networks** (Mainnet):

- USDT Ethereum
- USDT Binance Smart Chain (BSC)
- USDT Polygon
- USDT Solana
- USDT Arbitrum (if supported by Alchemy)

**USDT Networks** (Testnet - for development):

- USDT Sepolia (Ethereum testnet)
- USDT BSC Testnet
- USDT Mumbai (Polygon testnet)
- USDT Solana Devnet
- USDT Arbitrum Sepolia

**USDC Networks** (Mainnet):

- USDC Ethereum
- USDC Polygon
- USDC Solana
- USDC Arbitrum (if supported by Alchemy)

**USDC Networks** (Testnet):

- USDC Sepolia
- USDC Mumbai
- USDC Solana Devnet
- USDC Arbitrum Sepolia

**Note**: Backend should support both mainnet and testnet. Mobile app can toggle via environment variable or config.

### Step 4: Monthly Income & Bank Statement

**Screen**: New `app/stablecoin/kyc-info.tsx`

**Flow**:

1. User selects monthly income range:
   - Under ₦100,000
   - ₦100,000 - ₦500,000
   - ₦500,000 - ₦2,000,000
   - ₦2,000,000 - ₦5,000,000
   - Above ₦5,000,000
2. User uploads bank statement (PDF/image)
   - Use existing file upload service (Cloudinary)
   - Validate file type and size
   - Show preview before proceeding

**Data to Store**:

- Monthly income range
- Bank statement URL (Cloudinary)
- Upload timestamp

### Step 5: Terms & Conditions

**Screen**: New `app/stablecoin/terms.tsx`

**Content**:

1. **Terms and conditions**
   - Standard terms checkbox
2. **Acceptable Use Policy**
   - Text: _"Raverpay stablecoin address available to verified Raenest account holders allows users to receive approved stablecoins that are automatically converted to USD in their Raenest USD Wallet."_
   - "Continue reading" expandable section
3. **Automatic Conversion to USD**
   - Text: _"All stablecoins received through your Stablecoin Address will be automatically and irrevocably converted to USD at the prevailing exchange rate at the time of conversion."_
   - "Continue reading" expandable section
4. **Disclaimer**
   - Text: _"Raverpay is not a bank or regulated exchange. All services are provided "as is" and "as available," without any warranties, express or implied, including warranties of merchantability or fitness for a particular purpose."_
   - "Continue reading" expandable section
5. **Checkbox**: "I agree to the terms and conditions"

**UI**: Scrollable screen with checkboxes, expandable sections, and "Continue" button (disabled until all checkboxes checked).

### Step 6: Wallet Creation

**Screen**: New `app/stablecoin/creating.tsx` (Loading screen)

**Backend Action**:

1. Create Alchemy wallet for selected network
2. Store wallet details in database
3. Link wallet to user account
4. Store KYC info (monthly income, bank statement)
5. Store terms acceptance timestamp

**API Call**: `POST /alchemy/wallets/create-stablecoin-wallet`

**Request Body**:

```typescript
{
  tokenType: 'USDT' | 'USDC',
  blockchain: 'ETHEREUM' | 'POLYGON' | 'ARBITRUM' | 'BSC' | 'SOLANA',
  network: 'mainnet' | 'sepolia' | 'mumbai' | 'amoy' | 'bsc-testnet' | 'solana-devnet',
  monthlyIncomeRange: string,
  bankStatementUrl: string,
  termsAccepted: boolean,
  termsAcceptedAt: string
}
```

### Step 7: Success Screen

**Screen**: New `app/stablecoin/success.tsx`

**Content**:

- ✅ **"Approved"** heading
- Text: _"Your stablecoin wallet has been created. You can now view your wallet details to receive money."_
- **"Receive Money"** button

### Step 8: Receive Screen

**Screen**: New `app/stablecoin/receive.tsx`

**Content**:

- Large QR code (wallet address)
- Wallet address (truncated, with copy button)
- Network badge (e.g., "USDC Ethereum")
- Share button

**When User Clicks Copy**:

- Copy address to clipboard
- Show bottom modal with network-specific warning:
  - _"Only use this address on the [NETWORK] network. We're not liable for loss from using the wrong network or sending non-[TOKEN] [NETWORK]."_
  - Example: _"Only use this address on the USDC Ethereum network. We're not liable for loss from using the wrong network or sending non-USDC Ethereum."_

---

## Backend Changes Required

### 1. Database Schema Updates

#### New Table: `stablecoin_wallets`

```prisma
model StablecoinWallet {
  id                String   @id @default(cuid())
  userId            String
  alchemyWalletId  String   // Reference to AlchemyWallet.id
  tokenType         String   // 'USDT' | 'USDC'
  blockchain        String   // 'ETHEREUM' | 'POLYGON' | 'ARBITRUM' | 'BSC' | 'SOLANA'
  network           String   // 'mainnet' | 'sepolia' | 'mumbai' | etc.
  address           String   // Wallet address
  monthlyIncomeRange String?  // Income range selected
  bankStatementUrl  String?  // Cloudinary URL
  termsAccepted     Boolean  @default(false)
  termsAcceptedAt   DateTime?
  status            String   @default("ACTIVE") // 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  alchemyWallet     AlchemyWallet @relation(fields: [alchemyWalletId], references: [id])

  @@unique([userId, tokenType, blockchain, network])
  @@index([userId])
  @@index([address])
}
```

#### Update `AlchemyWallet` Model

Add relation to `StablecoinWallet`:

```prisma
model AlchemyWallet {
  // ... existing fields
  stablecoinWallet StablecoinWallet?
}
```

#### New Table: `stablecoin_deposits` (for tracking incoming transactions)

```prisma
model StablecoinDeposit {
  id                String   @id @default(cuid())
  stablecoinWalletId String
  transactionHash   String   @unique
  tokenType         String   // 'USDT' | 'USDC'
  amount            String   // Amount in token units (e.g., "100.50")
  amountUSD         Decimal? // Converted USD amount
  blockchain        String
  network           String
  blockNumber       String?
  status            String   @default("PENDING") // 'PENDING' | 'CONFIRMED' | 'CONVERTED' | 'FAILED'
  confirmedAt       DateTime?
  convertedAt       DateTime?
  nairaCredited     Boolean  @default(false) // V2: Whether Naira was credited
  nairaAmount       Decimal? // V2: Amount credited in Naira
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  stablecoinWallet StablecoinWallet @relation(fields: [stablecoinWalletId], references: [id])

  @@index([stablecoinWalletId])
  @@index([transactionHash])
  @@index([status])
}
```

### 2. New API Endpoints

#### Create Stablecoin Wallet

**Endpoint**: `POST /alchemy/wallets/create-stablecoin-wallet`

**Controller**: `AlchemyWalletController`

**DTO**:

```typescript
export class CreateStablecoinWalletDto {
  @IsEnum(['USDT', 'USDC'])
  tokenType: 'USDT' | 'USDC';

  @IsEnum(['ETHEREUM', 'POLYGON', 'ARBITRUM', 'BSC', 'SOLANA'])
  blockchain: string;

  @IsString()
  network: string; // 'mainnet' | 'sepolia' | 'mumbai' | etc.

  @IsString()
  monthlyIncomeRange: string;

  @IsString()
  bankStatementUrl: string;

  @IsBoolean()
  termsAccepted: boolean;
}
```

**Service Logic**:

1. Validate user doesn't already have wallet for this tokenType/blockchain/network combo
2. Create Alchemy wallet using existing `AlchemyWalletGenerationService`
3. Create `StablecoinWallet` record
4. Store KYC info and terms acceptance
5. Return wallet details (address, network info)

**Response**:

```typescript
{
  success: true,
  data: {
    id: string,
    address: string,
    tokenType: 'USDT' | 'USDC',
    blockchain: string,
    network: string,
    qrCode: string, // Base64 QR code or URL
    createdAt: string
  }
}
```

#### Get User's Stablecoin Wallets

**Endpoint**: `GET /alchemy/wallets/stablecoin`

**Response**: List of all stablecoin wallets for user

#### Get Stablecoin Wallet Details

**Endpoint**: `GET /alchemy/wallets/stablecoin/:walletId`

**Response**: Wallet details including address, network, QR code

#### Get Wallet by Token & Network

**Endpoint**: `GET /alchemy/wallets/stablecoin/by-token/:tokenType/:blockchain/:network`

**Response**: Single wallet or 404

### 3. Webhook Handler Updates

**File**: `apps/raverpay-api/src/alchemy/webhooks/alchemy-webhook.service.ts`

**New Handler**: Process incoming stablecoin deposits

**Flow**:

1. Receive webhook from Alchemy about incoming transaction
2. Verify transaction is for USDT/USDC
3. Check if destination address matches any `StablecoinWallet.address`
4. Create `StablecoinDeposit` record with status `PENDING`
5. Wait for confirmations (or use Alchemy's confirmation status)
6. Update status to `CONFIRMED` when transaction is confirmed
7. **V2**: Trigger conversion to USD/Naira workflow

**Webhook Event Types to Handle**:

- `TRANSACTION_RECEIVED` - New incoming transaction
- `TRANSACTION_CONFIRMED` - Transaction confirmed on blockchain
- `TRANSACTION_FAILED` - Transaction failed

### 4. Network Configuration

**File**: `apps/raverpay-api/src/alchemy/config/alchemy-config.service.ts`

**Add Network Mappings**:

```typescript
const NETWORK_CONFIG = {
  USDT: {
    ETHEREUM: {
      mainnet: { chainId: 1, tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
      sepolia: { chainId: 11155111, tokenAddress: '0x...' },
    },
    POLYGON: {
      mainnet: { chainId: 137, tokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
      mumbai: { chainId: 80001, tokenAddress: '0x...' },
    },
    BSC: {
      mainnet: { chainId: 56, tokenAddress: '0x55d398326f99059fF775485246999027B3197955' },
      testnet: { chainId: 97, tokenAddress: '0x...' },
    },
    // ... etc
  },
  USDC: {
    ETHEREUM: {
      mainnet: { chainId: 1, tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      sepolia: { chainId: 11155111, tokenAddress: '0x...' },
    },
    // ... etc
  },
};
```

### 5. Admin Endpoints (V2 Preparation)

#### List Stablecoin Deposits (Pending Conversion)

**Endpoint**: `GET /admin/alchemy/stablecoin-deposits`

**Query Params**:

- `status`: Filter by status (PENDING, CONFIRMED, CONVERTED)
- `tokenType`: Filter by token (USDT, USDC)
- `page`, `limit`: Pagination

**Response**: List of deposits with user info, amounts, timestamps

#### Credit User Naira Wallet (V2)

**Endpoint**: `POST /admin/alchemy/stablecoin-deposits/:depositId/credit-naira`

**Guards**: `@UseGuards(JwtAuthGuard, RolesGuard, ReAuthGuard)` - **MFA Required**

**DTO**:

```typescript
export class CreditNairaDto {
  @IsString()
  reason: string; // Admin justification

  @IsString()
  mfaCode: string; // MFA verification code
}
```

**Service Logic**:

1. Verify MFA code (using existing `ReAuthGuard`)
2. Get deposit details
3. Calculate Naira amount (using exchange rate + markup)
4. Credit user's Naira wallet (using existing `AdminWalletsService.adjustBalance`)
5. Update deposit status to `CONVERTED`
6. Set `nairaCredited: true` and `nairaAmount`
7. Create audit log
8. Send notification to user

**Note**: This endpoint is prepared for V2 but can be tested manually in V1.

---

## Mobile App Changes Required

### 1. Update Fund Wallet Screen

**File**: `apps/raverpay-mobile/app/fund-wallet.tsx`

**Changes**:

- Add currency selector before tabs
- Show currency options: Naira, USD, EUR, GBP
- For Naira: Show existing tabs (Card, Bank Transfer) - **NO CHANGES**
- For USD: Navigate to stablecoin selection flow
- For EUR/GBP: Show "Coming Soon" message (or hide for now)

### 2. New Screens

#### Screen 1: Select Token

**File**: `apps/raverpay-mobile/app/stablecoin/select-token.tsx`

**Features**:

- Token selection (USDT, USDC)
- Informational text about stablecoin address
- Network dropdown/selector
- Continue button

#### Screen 2: KYC Info

**File**: `apps/raverpay-mobile/app/stablecoin/kyc-info.tsx`

**Features**:

- Monthly income range selector (radio buttons or dropdown)
- Bank statement upload (file picker + preview)
- Continue button

#### Screen 3: Terms & Conditions

**File**: `apps/raverpay-mobile/app/stablecoin/terms.tsx`

**Features**:

- Scrollable terms content
- Expandable sections
- Checkboxes for each section
- "I agree" checkbox
- Continue button (disabled until all checked)

#### Screen 4: Creating Wallet (Loading)

**File**: `apps/raverpay-mobile/app/stablecoin/creating.tsx`

**Features**:

- Loading spinner
- "Creating your wallet..." message
- Auto-navigate to success screen on completion

#### Screen 5: Success Screen

**File**: `apps/raverpay-mobile/app/stablecoin/success.tsx`

**Features**:

- Success icon/checkmark
- "Approved" heading
- Success message
- "Receive Money" button

#### Screen 6: Receive Screen

**File**: `apps/raverpay-mobile/app/stablecoin/receive.tsx`

**Features**:

- QR code display (use `react-native-qrcode-svg`)
- Wallet address (truncated, copyable)
- Network badge
- Share button
- Copy button (triggers bottom modal)

#### Screen 7: Network Warning Modal

**Component**: `apps/raverpay-mobile/src/components/stablecoin/NetworkWarningModal.tsx`

**Features**:

- Bottom sheet modal
- Network-specific warning message
- "Got it" button

### 3. API Service Updates

**File**: `apps/raverpay-mobile/src/lib/api/endpoints.ts`

**Add**:

```typescript
ALCHEMY: {
  STABLECOIN: {
    CREATE_WALLET: '/alchemy/wallets/create-stablecoin-wallet',
    GET_WALLETS: '/alchemy/wallets/stablecoin',
    GET_WALLET: (walletId: string) => `/alchemy/wallets/stablecoin/${walletId}`,
    GET_BY_TOKEN: (tokenType: string, blockchain: string, network: string) =>
      `/alchemy/wallets/stablecoin/by-token/${tokenType}/${blockchain}/${network}`,
  }
}
```

**File**: `apps/raverpay-mobile/src/services/alchemy.service.ts` (new)

**Create service**:

```typescript
class AlchemyStablecoinService {
  async createStablecoinWallet(data: CreateStablecoinWalletRequest) {
    // Call API
  }

  async getStablecoinWallets() {
    // Call API
  }

  async getStablecoinWallet(walletId: string) {
    // Call API
  }
}
```

### 4. Types

**File**: `apps/raverpay-mobile/src/types/stablecoin.types.ts` (new)

```typescript
export type StablecoinToken = 'USDT' | 'USDC';
export type StablecoinBlockchain = 'ETHEREUM' | 'POLYGON' | 'ARBITRUM' | 'BSC' | 'SOLANA';
export type StablecoinNetwork =
  | 'mainnet'
  | 'sepolia'
  | 'mumbai'
  | 'amoy'
  | 'bsc-testnet'
  | 'solana-devnet';

export interface StablecoinWallet {
  id: string;
  address: string;
  tokenType: StablecoinToken;
  blockchain: StablecoinBlockchain;
  network: StablecoinNetwork;
  qrCode?: string;
  createdAt: string;
}

export interface CreateStablecoinWalletRequest {
  tokenType: StablecoinToken;
  blockchain: StablecoinBlockchain;
  network: StablecoinNetwork;
  monthlyIncomeRange: string;
  bankStatementUrl: string;
  termsAccepted: boolean;
}
```

### 5. Dependencies

**File**: `apps/raverpay-mobile/package.json`

**Add**:

```json
{
  "dependencies": {
    "react-native-qrcode-svg": "^6.2.0",
    "@gorhom/bottom-sheet": "^4.5.0", // For bottom modal
    "react-native-image-picker": "^7.0.0" // For bank statement upload
  }
}
```

---

## Admin Dashboard Changes Required

### 1. New Page: Stablecoin Deposits

**File**: `apps/raverpay-admin/app/admin/alchemy/stablecoin-deposits/page.tsx`

**Features**:

- Table of all stablecoin deposits
- Filters: Status, Token Type, Date Range
- Columns:
  - User (name, email)
  - Token Type (USDT/USDC)
  - Network
  - Amount (token)
  - Amount (USD) - if converted
  - Status
  - Transaction Hash (link to explorer)
  - Created At
  - Actions (Credit Naira button - V2)

### 2. Credit Naira Modal (V2 Preparation)

**Component**: `apps/raverpay-admin/components/alchemy/CreditNairaModal.tsx`

**Features**:

- MFA verification input
- Reason/justification textarea
- Amount display (token → USD → Naira with markup)
- Exchange rate display
- Markup fee display
- Confirm button

**Integration**: Use existing MFA modal pattern from admin dashboard

### 3. API Integration

**File**: `apps/raverpay-admin/lib/api/alchemy.ts` (new)

**Functions**:

- `getStablecoinDeposits(params)`
- `creditNairaWallet(depositId, data)`

---

## V2 Planning: Convert Stablecoin to Naira

### Overview

V2 adds the ability to convert received stablecoins to Naira and credit users' Raverpay Naira wallets.

### Key Questions Answered

**Q: To convert to Naira, would that not mean they will still need to send?**
**A**: No. The conversion happens **automatically** when stablecoins are received:

1. User receives USDC/USDT to their Raverpay wallet address
2. Webhook detects the deposit
3. System automatically converts to USD (using exchange rate)
4. Admin reviews and credits user's Naira wallet (with MFA)
5. User sees Naira in their Raverpay wallet

**Alternative Flow (Fully Automated)**:

1. User receives stablecoin
2. System automatically sells stablecoin on exchange (Binance, etc.)
3. System receives Naira
4. System credits user's Naira wallet automatically
5. User notified

### V2 Features

#### 1. Automatic Conversion Workflow

- Webhook receives deposit confirmation
- Calculate USD equivalent (using CoinGecko or exchange API)
- Apply Raverpay markup fee (configurable in admin)
- Queue conversion job
- Admin reviews and approves (with MFA)
- Credit user's Naira wallet
- Send notification

#### 2. Exchange Integration

**Options**:

- **Binance API**: Sell USDT/USDC for Naira
- **Luno API**: Sell stablecoin for Naira
- **Manual Process**: Admin sells on exchange, then credits user

**Recommendation**: Start with **manual process** (admin credits after selling), then automate in V2.1

#### 3. Exchange Rate Management

**Admin Dashboard**:

- View current exchange rates (USDT/USDC → USD → NGN)
- Configure markup percentage (e.g., 2% markup)
- View rate history
- Manual rate override (with MFA)

**API**: `GET /admin/alchemy/exchange-rates`
**API**: `POST /admin/alchemy/exchange-rates` (update, MFA required)

#### 4. Conversion Queue

**Database Table**: `stablecoin_conversions`

```prisma
model StablecoinConversion {
  id                String   @id @default(cuid())
  depositId         String   @unique
  stablecoinWalletId String
  tokenAmount       String   // Original token amount
  usdAmount         Decimal  // USD equivalent
  exchangeRate      Decimal  // Rate used
  markupPercentage  Decimal  // Raverpay markup
  markupAmount      Decimal  // Markup fee in USD
  nairaAmount       Decimal  // Final Naira amount
  status            String   @default("PENDING") // 'PENDING' | 'APPROVED' | 'CREDITED' | 'FAILED'
  approvedBy         String?  // Admin user ID
  approvedAt         DateTime?
  creditedAt         DateTime?
  failureReason     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  deposit           StablecoinDeposit @relation(fields: [depositId], references: [id])
  stablecoinWallet  StablecoinWallet @relation(fields: [stablecoinWalletId], references: [id])
}
```

#### 5. Admin Workflow

1. Admin views pending conversions
2. Admin reviews deposit (transaction hash, amount, user)
3. Admin sells stablecoin on exchange (manual or automated)
4. Admin receives Naira
5. Admin clicks "Credit User" button
6. MFA verification required
7. System credits user's Naira wallet
8. Conversion marked as completed
9. User receives notification

#### 6. Automated Selling (V2.1)

**Future Enhancement**:

- Integrate Binance/Luno API
- Automatically sell stablecoin when deposit confirmed
- Receive Naira to Raverpay's exchange account
- Automatically credit user (with admin approval workflow)

**Safety**: Always require admin approval before crediting, even if selling is automated.

### V2 API Endpoints

#### Get Exchange Rates

**Endpoint**: `GET /alchemy/exchange-rates`

**Response**:

```typescript
{
  success: true,
  data: {
    USDT: {
      USD: "1.00",
      NGN: "1500.00", // With markup
      baseRate: "1470.00", // Without markup
      markup: "2.0%" // Markup percentage
    },
    USDC: {
      USD: "1.00",
      NGN: "1500.00",
      baseRate: "1470.00",
      markup: "2.0%"
    },
    lastUpdated: "2026-01-27T12:00:00Z"
  }
}
```

#### Get Conversion Queue

**Endpoint**: `GET /admin/alchemy/conversions`

**Query Params**: `status`, `page`, `limit`

#### Credit User Naira

**Endpoint**: `POST /admin/alchemy/conversions/:conversionId/credit`

**MFA Required**: Yes (via `ReAuthGuard`)

**DTO**:

```typescript
{
  mfaCode: string,
  reason: string,
  exchangeReference?: string // Reference from exchange sale
}
```

---

## V3+ Planning: Full Wallet Features

### Features for Future Versions

#### V3: Sending Stablecoins

- Send USDT/USDC to external addresses
- Gas fee estimation
- Transaction confirmation
- Transaction history

#### V4: Wallet Management

- Import existing wallets (seed phrase/private key)
- Export seed phrase (with PIN/biometric)
- Multiple wallets per user
- Wallet naming

#### V5: Advanced Features

- Cross-chain bridging
- Staking
- DeFi integrations
- NFT support

---

## Testing Checklist

### V1 Testing

#### Mobile App

- [ ] Currency selection works
- [ ] Token selection (USDT/USDC) works
- [ ] Network selection shows correct options
- [ ] Monthly income selection works
- [ ] Bank statement upload works
- [ ] Terms & conditions screen works
- [ ] Wallet creation flow works
- [ ] Success screen displays correctly
- [ ] Receive screen shows QR code
- [ ] Copy address works
- [ ] Network warning modal appears
- [ ] Share functionality works

#### Backend

- [ ] Create stablecoin wallet endpoint works
- [ ] Webhook handler processes deposits
- [ ] Database records created correctly
- [ ] Network configuration is correct
- [ ] Admin endpoints work (list deposits)

#### Integration

- [ ] End-to-end flow: Select token → Create wallet → Receive address
- [ ] Webhook receives deposit → Creates deposit record
- [ ] Admin can view deposits

### V2 Testing (When Implemented)

- [ ] Exchange rate API works
- [ ] Conversion queue displays correctly
- [ ] Admin can credit Naira wallet (with MFA)
- [ ] User receives notification
- [ ] Audit logs created

---

## Security Considerations

### V1

- ✅ Wallet addresses are user-specific
- ✅ Terms acceptance is recorded
- ✅ KYC info is stored securely
- ✅ Network warnings prevent wrong-network sends
- ✅ Admin operations require MFA (V2)

### V2

- ✅ MFA required for crediting Naira wallets
- ✅ Exchange rate markup is configurable
- ✅ All conversions are audited
- ✅ Admin actions are logged

---

## Deployment Plan

### Phase 1: Backend (Week 1)

1. Database migrations
2. API endpoints
3. Webhook handlers
4. Admin endpoints (basic)

### Phase 2: Mobile App (Week 2)

1. Update fund wallet screen
2. Create new screens
3. API integration
4. Testing

### Phase 3: Admin Dashboard (Week 2-3)

1. Stablecoin deposits page
2. Credit Naira modal (V2 prep)
3. Testing

### Phase 4: Integration & Testing (Week 3)

1. End-to-end testing
2. Webhook testing
3. Admin workflow testing
4. Bug fixes

### Phase 5: V2 Implementation (Future)

1. Exchange rate management
2. Conversion queue
3. Automated selling (optional)
4. Admin credit workflow

---

## Success Criteria

### V1

- ✅ Users can select USDT/USDC and network
- ✅ Users can complete KYC info and terms
- ✅ Wallets are created successfully
- ✅ Users can view their wallet address and QR code
- ✅ Network warnings prevent mistakes
- ✅ Admin can view incoming deposits
- ✅ Webhooks process deposits correctly

### V2

- ✅ Deposits are automatically queued for conversion
- ✅ Admin can credit Naira wallets with MFA
- ✅ Exchange rates are configurable
- ✅ Users receive notifications
- ✅ All actions are audited

---

## Notes

1. **Solana Support**: Verify Alchemy supports Solana. If not, remove from network options or use alternative provider.

2. **Binance Smart Chain**: Verify Alchemy supports BSC. If not, use alternative provider or remove.

3. **Testnet vs Mainnet**: Use environment variables to switch between testnet and mainnet networks.

4. **Exchange Integration**: For V2, start with manual process, then automate later.

5. **Markup Configuration**: Make markup percentage configurable in admin dashboard with MFA protection.

6. **Rate Limits**: Consider rate limiting on wallet creation endpoint to prevent abuse.

7. **KYC Verification**: Consider adding admin approval for KYC info before wallet creation (optional enhancement).

---

## Estimated Timeline

- **V1**: 3-4 weeks
- **V2**: 2-3 weeks (after V1)
- **V3+**: TBD

---

## Questions for Clarification

1. Should KYC info (monthly income, bank statement) require admin approval before wallet creation?
2. What markup percentage should be applied for stablecoin → Naira conversion? (Default: 2%?)
3. Should conversion to Naira be automatic (with admin oversight) or manual (admin-initiated)?
4. Which exchange should be used for selling stablecoins? (Binance, Luno, other?)
5. Should users be able to have multiple stablecoin wallets (different networks) or one per token type?
