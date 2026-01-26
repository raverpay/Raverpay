# Alchemy Production Migration Plan

## Comprehensive Implementation Strategy for RaverPay

**Date:** January 25, 2026  
**Status:** Planning Phase - DO NOT IMPLEMENT YET  
**Purpose:** Add Alchemy as an alternative blockchain infrastructure provider alongside Circle

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Alchemy Dashboard Configuration](#alchemy-dashboard-configuration)
4. [Database Schema Changes](#database-schema-changes)
5. [Backend Implementation Plan](#backend-implementation-plan)
6. [Admin Dashboard Integration](#admin-dashboard-integration)
7. [Mobile App Integration](#mobile-app-integration)
8. [Security Implementation](#security-implementation)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Strategy](#deployment-strategy)
11. [Monitoring & Alerts](#monitoring--alerts)
12. [Cost Management](#cost-management)
13. [Risk Mitigation](#risk-mitigation)
14. [Production Checklist](#production-checklist)

---

## Executive Summary

### Migration Approach: **Dual Provider Strategy**

Instead of migrating FROM Circle TO Alchemy, we will implement Alchemy as an **alternative provider** that runs alongside Circle. This approach:

- ✅ **Minimizes Risk**: Keep Circle running while testing Alchemy
- ✅ **Provides Redundancy**: Failover if one provider has issues
- ✅ **Enables A/B Testing**: Compare performance and costs
- ✅ **Gradual Rollout**: Start with testnet, then production gradually
- ✅ **Provider Flexibility**: Switch providers per wallet type or user segment

### Key Differences: Circle vs Alchemy

| Feature                 | Circle                         | Alchemy                      | Implementation Impact                       |
| ----------------------- | ------------------------------ | ---------------------------- | ------------------------------------------- |
| **Key Management**      | Circle manages keys via MPC    | **YOU manage keys**          | HIGH - New encryption infrastructure needed |
| **Wallet Creation**     | Circle API creates wallets     | You generate wallets locally | MEDIUM - New wallet service                 |
| **Transaction Signing** | Circle signs transactions      | **You sign locally**         | HIGH - New signing infrastructure           |
| **Gas Sponsorship**     | Built-in                       | Gas Manager API              | MEDIUM - Policy configuration               |
| **Account Type**        | EOA (Externally Owned Account) | Smart Contract Wallets (AA)  | HIGH - Different architecture               |
| **Transaction History** | Circle API                     | Transfers API + Webhooks     | MEDIUM - New API integration                |
| **Webhooks**            | Circle Webhooks                | Alchemy Webhooks             | MEDIUM - New webhook handlers               |

### Timeline Estimate

- **Phase 1**: Infrastructure & Security (3-4 weeks)
- **Phase 2**: API Integration (2-3 weeks)
- **Phase 3**: Dashboard & Mobile (2-3 weeks)
- **Phase 4**: Testing & Security Audit (2-3 weeks)
- **Phase 5**: Gradual Production Rollout (2-4 weeks)

**Total**: 11-17 weeks (3-4 months)

---

## Current Architecture Analysis

### Your Current Codebase Structure

```
raverpay/
├── apps/
│   ├── raverpay-api/          # NestJS backend
│   │   ├── src/circle/        # Circle integration
│   │   │   ├── wallets/       # Wallet management
│   │   │   ├── transactions/  # USDC transfers, CCTP
│   │   │   ├── paymaster/     # Gas sponsorship
│   │   │   ├── webhooks/      # Circle webhooks
│   │   │   ├── entity/        # Entity secret encryption
│   │   │   └── config/        # Circle configuration
│   │   └── prisma/            # Database schema
│   ├── raverpay-admin/        # Next.js admin dashboard
│   └── raverpay-mobile/       # Expo mobile app
```

### Circle Integration Points (What We'll Replicate)

1. **Wallet Services**
   - `CircleWalletService` - Creates wallets via Circle API
   - `WalletSetService` - Manages wallet sets
   - `EntitySecretService` - Encrypts entity secret per request

2. **Transaction Services**
   - `CircleTransactionService` - USDC transfers
   - `CCTPService` - Cross-chain transfers
   - `PaymasterService` - Gas sponsorship

3. **Database Models**
   - `CircleWallet` - Stores wallet metadata
   - `CircleTransaction` - Transaction records
   - `CircleCCTPTransfer` - Cross-chain transfers
   - `CircleUser` - User-controlled wallet users

4. **Security Features**
   - AES-256-GCM encryption (MfaEncryptionUtil pattern)
   - PBKDF2 key derivation (100k iterations)
   - Rate limiting
   - 2FA/MFA
   - Audit logging

---

## Alchemy Dashboard Configuration

### Step 1: Create Alchemy Account & Apps

#### 1.1 Create Account

1. Go to https://dashboard.alchemy.com
2. Sign up with company email
3. Complete verification

#### 1.2 Create Applications

**Best Practice**: Create separate apps for each environment to isolate traffic and costs.

**Development App**:

```
Name: RaverPay Development
Description: Development environment for testing
Networks:
  - Base Sepolia (Testnet)
  - Polygon Mumbai (Testnet) - if still available
  - Arbitrum Sepolia (Testnet)
```

**Staging App**:

```
Name: RaverPay Staging
Description: Staging environment for pre-production testing
Networks:
  - Base Sepolia (Testnet)
  - Polygon Mumbai (Testnet)
  - Arbitrum Sepolia (Testnet)
```

**Production App**:

```
Name: RaverPay Production
Description: Production environment
Networks:
  - Polygon Mainnet
  - Arbitrum One
  - Base Mainnet
```

#### 1.3 Get API Keys

For each app:

1. Navigate to app dashboard
2. Click "API Keys" or "Endpoints"
3. Copy the API key (format: `https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY`)
4. Store securely in environment variables

**Environment Variables Needed**:

```bash
# Development
ALCHEMY_DEV_API_KEY=your_dev_api_key
ALCHEMY_DEV_BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_DEV_POLYGON_MUMBAI_RPC=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_DEV_ARBITRUM_SEPOLIA_RPC=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY

# Production
ALCHEMY_PROD_API_KEY=your_prod_api_key
ALCHEMY_PROD_POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_PROD_ARBITRUM_RPC=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_PROD_BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Account Kit (if using Account Abstraction SDK)
ALCHEMY_ACCOUNT_KIT_API_KEY=your_account_kit_key
```

### Step 2: Configure Gas Manager

#### 2.1 Navigate to Gas Manager

1. In Alchemy Dashboard, go to "Gas Manager"
2. Click "Create Policy"

#### 2.2 Create Gas Policies

**Development Policy**:

```
Name: RaverPay Dev Gas Policy
Description: Gas sponsorship for development testing
Type: Spending Rules
Configuration:
  - Max Spend per User Operation: $5 USD
  - Max Spend per Sender: $50 USD/day
  - Overall Policy Max Spend: $500 USD/month
  - Sponsorship Expiry: 1 hour
  - Allowed Networks: Base Sepolia, Polygon Mumbai, Arbitrum Sepolia
  - Sponsor on Error: false
```

**Production Policy**:

```
Name: RaverPay Production Gas Policy
Description: Gas sponsorship for production users
Type: Spending Rules + Custom Rules
Configuration:
  - Max Spend per User Operation: $2 USD
  - Max Spend per Sender: $20 USD/day
  - Overall Policy Max Spend: $10,000 USD/month
  - Sponsorship Expiry: 10 minutes
  - Allowed Networks: Polygon, Arbitrum, Base
  - Custom Rule Webhook: https://api.raverpay.com/webhooks/alchemy/gas-approval
  - Sponsor on Error: false
```

#### 2.3 Gas Policy Webhook (Production)

Create webhook endpoint to approve/reject gas sponsorship requests:

```typescript
// apps/raverpay-api/src/alchemy/webhooks/gas-policy.controller.ts
@Post('gas-approval')
async approveGasSponsorship(@Body() payload: GasPolicyWebhookDto) {
  // payload contains: userOperation, sender, network, estimatedGasCost

  // 1. Check if user exists and is in good standing
  const user = await this.findUserByWalletAddress(payload.sender);
  if (!user || user.status !== 'ACTIVE') {
    return { approved: false, reason: 'User not found or inactive' };
  }

  // 2. Check if user has exceeded daily limits
  const dailyGasSpent = await this.getDailyGasSpent(user.id);
  if (dailyGasSpent > MAX_DAILY_GAS_PER_USER) {
    return { approved: false, reason: 'Daily gas limit exceeded' };
  }

  // 3. Check if transaction looks suspicious
  const isSuspicious = await this.checkSuspiciousActivity(payload);
  if (isSuspicious) {
    await this.alertSecurityTeam(payload);
    return { approved: false, reason: 'Suspicious activity detected' };
  }

  // 4. Approve
  return { approved: true };
}
```

### Step 3: Configure Webhooks

#### 3.1 Create Address Activity Webhooks

For each wallet created, register a webhook to track transactions:

1. Go to "Notify" or "Webhooks" in Alchemy Dashboard
2. Click "Create Webhook"
3. Configure:

```
Type: Address Activity
Description: Track wallet transactions for [USER_ID]
Webhook URL: https://api.raverpay.com/webhooks/alchemy/address-activity
Networks: Polygon, Arbitrum, Base
Addresses: [User's Alchemy wallet address]
Webhook Version: V2
Events to track:
  - External Transfers
  - ERC20 Transfers
  - ERC721 Transfers (if NFTs supported)
  - ERC1155 Transfers (if NFTs supported)
```

**Authentication**:

- Use Alchemy's signing secret to verify webhook authenticity
- Store signing secret in env: `ALCHEMY_WEBHOOK_SIGNING_SECRET`

#### 3.2 Create Mined Transaction Webhooks

Optional: For critical transactions, create specific mined transaction webhooks:

```
Type: Mined Transactions
Description: Track specific transaction confirmations
Webhook URL: https://api.raverpay.com/webhooks/alchemy/mined-transactions
Networks: Polygon, Arbitrum, Base
```

### Step 4: Configure Account Kit SDK (for Smart Wallets)

If using Account Abstraction (recommended for better UX):

1. Go to "Account Kit" in dashboard
2. Enable Account Kit for your app
3. Configure:
   - Signer: Email/Social login provider (or Passkeys)
   - Smart Account Type: Light Account (gas-optimized)
   - Gas Manager: Link to your Gas Manager policy

**SDK Installation** (will be done in implementation phase):

```bash
npm install @alchemy/aa-sdk @alchemy/aa-core @alchemy/aa-accounts
```

---

## Database Schema Changes

### New Models for Alchemy

Add these models to `apps/raverpay-api/prisma/schema.prisma`:

```prisma
// Alchemy Wallet - Similar to CircleWallet but for Alchemy
model AlchemyWallet {
  id                    String                 @id @default(uuid())
  userId                String
  address               String                 @unique
  encryptedPrivateKey   String                 // AES-256-GCM encrypted private key
  blockchain            String                 // POLYGON, ARBITRUM, BASE
  network               String                 // mainnet, testnet
  accountType           AlchemyAccountType     @default(SMART_CONTRACT) // EOA | SMART_CONTRACT
  state                 AlchemyWalletState     @default(ACTIVE)
  name                  String?
  isGasSponsored        Boolean                @default(true)
  gasPolicyId           String?                // Alchemy Gas Manager policy ID
  alchemyAppId          String?                // Alchemy app ID
  webhookId             String?                // Alchemy webhook ID for this address
  lastKeyRotation       DateTime?
  keyRotationCount      Int                    @default(0)
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  // Relations
  user                  User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  alchemyTransactions   AlchemyTransaction[]
  alchemyUserOps        AlchemyUserOperation[]

  @@unique([userId, blockchain, network])
  @@index([userId])
  @@index([address])
  @@index([blockchain])
  @@index([network])
  @@index([state])
  @@map("alchemy_wallets")
}

// Alchemy Transaction - Track all transactions
model AlchemyTransaction {
  id                    String                    @id @default(uuid())
  reference             String                    @unique
  userId                String
  walletId              String
  type                  AlchemyTransactionType
  state                 AlchemyTransactionState   @default(PENDING)
  sourceAddress         String?
  destinationAddress    String
  tokenAddress          String?                   // ERC20 token address (USDC, USDT, etc.)
  blockchain            String
  network               String
  amount                String                    // Amount in wei/smallest unit
  amountFormatted       String?                   // Human-readable amount
  transactionHash       String?                   @unique
  blockNumber           BigInt?
  blockHash             String?
  gasUsed               String?
  gasPrice              String?
  networkFee            String?                   // in native token (POL, ETH, etc.)
  networkFeeUsd         String?
  userOperationHash     String?                   @unique
  serviceFee            String?                   // Service fee in USDC
  feeCollected          Boolean                   @default(false)
  errorCode             String?
  errorMessage          String?
  confirmations         Int                       @default(0)
  isInternal            Boolean                   @default(false) // true if both addresses are internal
  metadata              Json?
  completedAt           DateTime?
  failedAt              DateTime?
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  // Relations
  user                  User                      @relation(fields: [userId], references: [id], onDelete: Cascade)
  wallet                AlchemyWallet             @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([walletId])
  @@index([state])
  @@index([type])
  @@index([transactionHash])
  @@index([userOperationHash])
  @@index([createdAt])
  @@index([userId, createdAt(sort: Desc)])
  @@map("alchemy_transactions")
}

// Alchemy UserOperation - Track Account Abstraction UserOps
model AlchemyUserOperation {
  id                    String                 @id @default(uuid())
  userOperationHash     String                 @unique
  walletId              String
  userId                String
  sender                String                 // Smart account address
  nonce                 String
  callData              String                 // Hex-encoded call data
  callGasLimit          String
  verificationGasLimit  String
  preVerificationGas    String
  maxFeePerGas          String
  maxPriorityFeePerGas  String
  paymasterAndData      String?                // Paymaster info if gas sponsored
  signature             String                 // User signature
  bundlerUsed           Boolean                @default(true)
  gasPolicyId           String?                // Gas Manager policy used
  gasSponsored          Boolean                @default(false)
  transactionHash       String?                // Final transaction hash
  blockNumber           BigInt?
  status                String                 @default("PENDING") // PENDING, INCLUDED, FAILED
  errorMessage          String?
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  // Relations
  wallet                AlchemyWallet          @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId])
  @@index([userId])
  @@index([userOperationHash])
  @@index([status])
  @@index([createdAt])
  @@map("alchemy_user_operations")
}

// Gas Manager Spending Tracker
model AlchemyGasSpending {
  id                String    @id @default(uuid())
  userId            String
  walletAddress     String
  blockchain        String
  network           String
  gasPolicyId       String
  date              DateTime  @default(now()) // Date for daily tracking
  totalGasUsed      String    // in wei
  totalGasUsd       String    // in USD
  transactionCount  Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([userId, walletAddress, date])
  @@index([userId])
  @@index([date])
  @@index([walletAddress])
  @@map("alchemy_gas_spending")
}

// Enums
enum AlchemyAccountType {
  EOA               // Externally Owned Account (traditional wallet)
  SMART_CONTRACT    // Smart Contract Account (Account Abstraction)
}

enum AlchemyWalletState {
  ACTIVE
  INACTIVE
  LOCKED
  COMPROMISED
}

enum AlchemyTransactionType {
  SEND            // Send USDC/USDT to external address
  RECEIVE         // Receive USDC/USDT
  INTERNAL        // Internal transfer between RaverPay users
  SWAP            // Token swap (future feature)
  BRIDGE          // Cross-chain bridge (future feature)
}

enum AlchemyTransactionState {
  PENDING         // Transaction created but not submitted
  SUBMITTED       // Submitted to blockchain
  CONFIRMED       // Included in block
  COMPLETED       // Finalized with sufficient confirmations
  FAILED          // Transaction failed
  CANCELLED       // User cancelled
}

// Relations addition to User model
// Add to existing User model:
model User {
  // ... existing fields ...
  alchemyWallets        AlchemyWallet[]
  alchemyTransactions   AlchemyTransaction[]
  // ... rest of existing relations ...
}
```

### Migration Script

Create migration:

```bash
cd apps/raverpay-api
npx prisma migrate dev --name add_alchemy_models
```

---

## Backend Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 Private Key Encryption Service

Create `apps/raverpay-api/src/alchemy/encryption/alchemy-key-encryption.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AlchemyKeyEncryptionService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 16;
  private readonly SALT_LENGTH = 32;
  private readonly TAG_LENGTH = 16;
  private readonly KEY_LENGTH = 32;
  private readonly ITERATIONS = 100000; // PBKDF2 iterations

  constructor(private configService: ConfigService) {}

  /**
   * Encrypt a private key using AES-256-GCM
   * Returns: base64 encoded string containing: salt:iv:encrypted:authTag
   */
  encryptPrivateKey(privateKey: string, userId: string): string {
    // Derive encryption key from master key + userId
    const masterKey = this.configService.get('ALCHEMY_ENCRYPTION_MASTER_KEY');
    const salt = crypto.randomBytes(this.SALT_LENGTH);

    const encryptionKey = crypto.pbkdf2Sync(
      `${masterKey}:${userId}`,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      'sha512',
    );

    // Encrypt
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, encryptionKey, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine: salt:iv:encrypted:authTag
    return [salt.toString('hex'), iv.toString('hex'), encrypted, authTag.toString('hex')].join(':');
  }

  /**
   * Decrypt a private key
   */
  decryptPrivateKey(encryptedData: string, userId: string): string {
    const [saltHex, ivHex, encrypted, authTagHex] = encryptedData.split(':');

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Derive same encryption key
    const masterKey = this.configService.get('ALCHEMY_ENCRYPTION_MASTER_KEY');
    const encryptionKey = crypto.pbkdf2Sync(
      `${masterKey}:${userId}`,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      'sha512',
    );

    // Decrypt
    const decipher = crypto.createDecipheriv(this.ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Rotate encryption for a private key (use when rotating master key)
   */
  async rotateEncryption(
    oldEncryptedKey: string,
    userId: string,
    newMasterKey: string,
  ): Promise<string> {
    // Decrypt with old key
    const privateKey = this.decryptPrivateKey(oldEncryptedKey, userId);

    // Re-encrypt with new master key
    // Temporarily use new master key
    const oldMasterKey = this.configService.get('ALCHEMY_ENCRYPTION_MASTER_KEY');
    this.configService['internalConfig']['ALCHEMY_ENCRYPTION_MASTER_KEY'] = newMasterKey;

    const newEncrypted = this.encryptPrivateKey(privateKey, userId);

    // Restore old master key
    this.configService['internalConfig']['ALCHEMY_ENCRYPTION_MASTER_KEY'] = oldMasterKey;

    return newEncrypted;
  }
}
```

#### 1.2 Wallet Generation Service

Create `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { AlchemyKeyEncryptionService } from '../encryption/alchemy-key-encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AlchemyAccountType } from '@prisma/client';

@Injectable()
export class AlchemyWalletGenerationService {
  private readonly logger = new Logger(AlchemyWalletGenerationService.name);

  constructor(
    private encryptionService: AlchemyKeyEncryptionService,
    private prisma: PrismaService,
  ) {}

  /**
   * Generate a new EOA wallet for a user
   */
  async generateEOAWallet(userId: string, blockchain: string, network: string) {
    this.logger.log(`Generating EOA wallet for user ${userId} on ${blockchain}-${network}`);

    // 1. Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const address = wallet.address;

    this.logger.debug(`Generated address: ${address}`);

    // 2. Encrypt private key
    const encryptedPrivateKey = this.encryptionService.encryptPrivateKey(privateKey, userId);

    // 3. Store in database
    const alchemyWallet = await this.prisma.alchemyWallet.create({
      data: {
        userId,
        address,
        encryptedPrivateKey,
        blockchain,
        network,
        accountType: AlchemyAccountType.EOA,
        state: 'ACTIVE',
        isGasSponsored: false, // EOA wallets don't get gas sponsorship
      },
    });

    this.logger.log(`Created Alchemy EOA wallet ${alchemyWallet.id} for user ${userId}`);

    return {
      walletId: alchemyWallet.id,
      address,
      blockchain,
      network,
    };
  }

  /**
   * Generate a Smart Contract Account using Account Kit
   * (Recommended for production - enables gas sponsorship)
   */
  async generateSmartAccount(
    userId: string,
    blockchain: string,
    network: string,
    gasPolicyId?: string,
  ) {
    this.logger.log(`Generating Smart Account for user ${userId} on ${blockchain}-${network}`);

    // 1. Generate EOA as signer (this will control the smart account)
    const signerWallet = ethers.Wallet.createRandom();
    const signerPrivateKey = signerWallet.privateKey;

    // 2. Create smart account using Alchemy Account Kit SDK
    // (This will be implemented with actual SDK in next step)
    const smartAccountAddress = await this.createSmartAccountWithAlchemy(
      signerWallet,
      blockchain,
      network,
    );

    this.logger.debug(`Generated smart account: ${smartAccountAddress}`);

    // 3. Encrypt signer's private key
    const encryptedPrivateKey = this.encryptionService.encryptPrivateKey(signerPrivateKey, userId);

    // 4. Store in database
    const alchemyWallet = await this.prisma.alchemyWallet.create({
      data: {
        userId,
        address: smartAccountAddress,
        encryptedPrivateKey, // This is the signer's key
        blockchain,
        network,
        accountType: AlchemyAccountType.SMART_CONTRACT,
        state: 'ACTIVE',
        isGasSponsored: true,
        gasPolicyId,
      },
    });

    this.logger.log(`Created Alchemy Smart Account ${alchemyWallet.id} for user ${userId}`);

    return {
      walletId: alchemyWallet.id,
      address: smartAccountAddress,
      blockchain,
      network,
    };
  }

  /**
   * Create smart account using Alchemy SDK
   * (Placeholder - will be implemented with actual SDK)
   */
  private async createSmartAccountWithAlchemy(
    signerWallet: ethers.Wallet,
    blockchain: string,
    network: string,
  ): Promise<string> {
    // TODO: Implement with @alchemy/aa-sdk
    // For now, return a placeholder
    throw new Error('Not implemented - requires @alchemy/aa-sdk integration');
  }

  /**
   * Get wallet private key (decrypted) - USE WITH EXTREME CAUTION
   * Only use for transaction signing, never expose to external API
   */
  async getDecryptedPrivateKey(walletId: string, userId: string): Promise<string> {
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet || wallet.userId !== userId) {
      throw new Error('Wallet not found or access denied');
    }

    return this.encryptionService.decryptPrivateKey(wallet.encryptedPrivateKey, userId);
  }
}
```

#### 1.3 Configuration Service

Create `apps/raverpay-api/src/alchemy/config/alchemy-config.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AlchemyNetworkConfig {
  rpcUrl: string;
  blockchain: string;
  network: string;
  chainId: number;
  nativeToken: string;
  usdcAddress: string;
  usdtAddress?: string;
  isTestnet: boolean;
}

@Injectable()
export class AlchemyConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Get RPC URL for a specific network
   */
  getRpcUrl(blockchain: string, network: string): string {
    const envKey = `ALCHEMY_${blockchain.toUpperCase()}_${network.toUpperCase()}_RPC`;
    const rpcUrl = this.configService.get(envKey);

    if (!rpcUrl) {
      throw new Error(`RPC URL not configured for ${blockchain}-${network}`);
    }

    return rpcUrl;
  }

  /**
   * Get API key
   */
  getApiKey(environment: 'dev' | 'prod' = 'prod'): string {
    const envKey = environment === 'dev' ? 'ALCHEMY_DEV_API_KEY' : 'ALCHEMY_PROD_API_KEY';
    return this.configService.get(envKey);
  }

  /**
   * Get Gas Manager policy ID
   */
  getGasPolicyId(environment: 'dev' | 'prod' = 'prod'): string {
    const envKey =
      environment === 'dev' ? 'ALCHEMY_DEV_GAS_POLICY_ID' : 'ALCHEMY_PROD_GAS_POLICY_ID';
    return this.configService.get(envKey);
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(blockchain: string, network: string): AlchemyNetworkConfig {
    const configs: Record<string, AlchemyNetworkConfig> = {
      'POLYGON-mainnet': {
        rpcUrl: this.getRpcUrl('POLYGON', 'mainnet'),
        blockchain: 'POLYGON',
        network: 'mainnet',
        chainId: 137,
        nativeToken: 'POL',
        usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
        usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
        isTestnet: false,
      },
      'ARBITRUM-mainnet': {
        rpcUrl: this.getRpcUrl('ARBITRUM', 'mainnet'),
        blockchain: 'ARBITRUM',
        network: 'mainnet',
        chainId: 42161,
        nativeToken: 'ETH',
        usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
        usdtAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT on Arbitrum
        isTestnet: false,
      },
      'BASE-mainnet': {
        rpcUrl: this.getRpcUrl('BASE', 'mainnet'),
        blockchain: 'BASE',
        network: 'mainnet',
        chainId: 8453,
        nativeToken: 'ETH',
        usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        isTestnet: false,
      },
      // Testnets
      'BASE-sepolia': {
        rpcUrl: this.getRpcUrl('BASE', 'sepolia'),
        blockchain: 'BASE',
        network: 'sepolia',
        chainId: 84532,
        nativeToken: 'ETH',
        usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
        isTestnet: true,
      },
      // Add more networks as needed
    };

    const key = `${blockchain}-${network}`;
    const config = configs[key];

    if (!config) {
      throw new Error(`Network config not found for ${key}`);
    }

    return config;
  }

  /**
   * Get supported blockchains
   */
  getSupportedBlockchains(): string[] {
    return ['POLYGON', 'ARBITRUM', 'BASE'];
  }

  /**
   * Get supported networks for a blockchain
   */
  getSupportedNetworks(blockchain: string): string[] {
    const networks = {
      POLYGON: ['mainnet', 'mumbai'],
      ARBITRUM: ['mainnet', 'sepolia'],
      BASE: ['mainnet', 'sepolia'],
    };
    return networks[blockchain] || [];
  }
}
```

### Phase 2: Transaction Services (Week 3-4)

#### 2.1 Transaction Service

Create `apps/raverpay-api/src/alchemy/transactions/alchemy-transaction.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { AlchemyConfigService } from '../config/alchemy-config.service';
import { AlchemyWalletGenerationService } from '../wallets/alchemy-wallet-generation.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AlchemyTransactionService {
  private readonly logger = new Logger(AlchemyTransactionService.name);

  constructor(
    private configService: AlchemyConfigService,
    private walletService: AlchemyWalletGenerationService,
    private prisma: PrismaService,
  ) {}

  /**
   * Send USDC/USDT to an address
   */
  async sendToken(params: {
    userId: string;
    walletId: string;
    destinationAddress: string;
    amount: string; // in smallest unit (e.g., USDC has 6 decimals)
    tokenAddress: string; // USDC or USDT contract address
    blockchain: string;
    network: string;
  }) {
    this.logger.log(`Sending token from wallet ${params.walletId} to ${params.destinationAddress}`);

    // 1. Get wallet and check ownership
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { id: params.walletId },
    });

    if (!wallet || wallet.userId !== params.userId) {
      throw new Error('Wallet not found or access denied');
    }

    // 2. Check if destination is internal (another RaverPay user)
    const isInternal = await this.isInternalAddress(params.destinationAddress);

    // 3. Create transaction record
    const reference = `ALCHEMY-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const transaction = await this.prisma.alchemyTransaction.create({
      data: {
        reference,
        userId: params.userId,
        walletId: params.walletId,
        type: isInternal ? 'INTERNAL' : 'SEND',
        sourceAddress: wallet.address,
        destinationAddress: params.destinationAddress,
        tokenAddress: params.tokenAddress,
        blockchain: params.blockchain,
        network: params.network,
        amount: params.amount,
        state: 'PENDING',
        isInternal,
      },
    });

    // 4. If internal, handle differently (update balances, no blockchain tx)
    if (isInternal) {
      return this.handleInternalTransfer(transaction.id, params);
    }

    // 5. Send blockchain transaction
    try {
      const txHash = await this.sendBlockchainTransaction(wallet, params);

      // Update transaction with hash
      await this.prisma.alchemyTransaction.update({
        where: { id: transaction.id },
        data: {
          transactionHash: txHash,
          state: 'SUBMITTED',
        },
      });

      this.logger.log(`Transaction submitted: ${txHash}`);

      return {
        transactionId: transaction.id,
        reference,
        transactionHash: txHash,
        status: 'SUBMITTED',
      };
    } catch (error) {
      // Update transaction as failed
      await this.prisma.alchemyTransaction.update({
        where: { id: transaction.id },
        data: {
          state: 'FAILED',
          errorMessage: error.message,
          failedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Send blockchain transaction (EOA)
   */
  private async sendBlockchainTransaction(
    wallet: any,
    params: {
      userId: string;
      destinationAddress: string;
      amount: string;
      tokenAddress: string;
      blockchain: string;
      network: string;
    },
  ): Promise<string> {
    // 1. Get RPC provider
    const networkConfig = this.configService.getNetworkConfig(params.blockchain, params.network);
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);

    // 2. Get decrypted private key
    const privateKey = await this.walletService.getDecryptedPrivateKey(wallet.id, params.userId);
    const signer = new ethers.Wallet(privateKey, provider);

    // 3. Create ERC20 contract instance
    const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
    const tokenContract = new ethers.Contract(params.tokenAddress, erc20Abi, signer);

    // 4. Send transaction
    const tx = await tokenContract.transfer(params.destinationAddress, params.amount);

    // 5. Return transaction hash
    return tx.hash;
  }

  /**
   * Handle internal transfer (between RaverPay users)
   */
  private async handleInternalTransfer(transactionId: string, params: any) {
    this.logger.log(`Handling internal transfer for transaction ${transactionId}`);

    // TODO: Implement internal transfer logic
    // - Verify both users have Alchemy wallets
    // - Update balances in database
    // - Mark transaction as completed
    // - Skip blockchain transaction

    throw new Error('Internal transfers not yet implemented');
  }

  /**
   * Check if address belongs to a RaverPay user
   */
  private async isInternalAddress(address: string): Promise<boolean> {
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { address: address.toLowerCase() },
    });
    return !!wallet;
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(walletId: string, userId: string) {
    // Verify ownership
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet || wallet.userId !== userId) {
      throw new Error('Wallet not found or access denied');
    }

    // Get transactions from database
    const transactions = await this.prisma.alchemyTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return transactions;
  }

  /**
   * Get balance for a token
   */
  async getTokenBalance(params: {
    walletId: string;
    userId: string;
    tokenAddress: string;
    blockchain: string;
    network: string;
  }): Promise<string> {
    // 1. Verify ownership
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { id: params.walletId },
    });

    if (!wallet || wallet.userId !== params.userId) {
      throw new Error('Wallet not found or access denied');
    }

    // 2. Get RPC provider
    const networkConfig = this.configService.getNetworkConfig(params.blockchain, params.network);
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);

    // 3. Query balance
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];
    const tokenContract = new ethers.Contract(params.tokenAddress, erc20Abi, provider);

    const balance = await tokenContract.balanceOf(wallet.address);

    return balance.toString();
  }
}
```

**Continue in next file due to length...**
