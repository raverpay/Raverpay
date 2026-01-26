# Alchemy Migration Plan - Updates & Clarifications

**Date:** January 25, 2026  
**Status:** Important Updates to Migration Plan

---

## Updates Based on Your Setup

### 1. ✅ Package Manager: Using PNPM (Not NPM)

All commands in the migration plan should use `pnpm` instead of `npm`:

```bash
# Install dependencies
pnpm install @alchemy/aa-sdk @alchemy/aa-core @alchemy/aa-accounts

# Prisma commands
pnpm prisma generate
pnpm prisma migrate dev --name add_alchemy_models

# TypeScript check
pnpm exec tsc --noEmit

# Build
pnpm build

# Test
pnpm test
```

---

### 2. ✅ Correct Environment Variables

Based on your **development app setup**, here are the correct environment variables:

```bash
# apps/raverpay-api/.env

# Development - Alchemy
ALCHEMY_DEV_API_KEY=dgVBg25vMTIXti8IBCV-0

# Base Sepolia (Testnet)
ALCHEMY_DEV_BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/dgVBg25vMTIXti8IBCV-0

# Polygon Amoy (NEW Testnet - Mumbai is deprecated)
ALCHEMY_DEV_POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/dgVBg25vMTIXti8IBCV-0

# Arbitrum Sepolia (Testnet)
ALCHEMY_DEV_ARBITRUM_SEPOLIA_RPC=https://arb-sepolia.g.alchemy.com/v2/dgVBg25vMTIXti8IBCV-0

# Gas Manager Policy ID (auto-created by Alchemy)
ALCHEMY_DEV_GAS_POLICY_ID=<your_auto_created_policy_id>

# Webhook Signing Secret (get from Alchemy dashboard)
ALCHEMY_WEBHOOK_SIGNING_SECRET=<your_webhook_secret>

# Encryption Master Key (GENERATE THIS - CRITICAL SECURITY)
ALCHEMY_ENCRYPTION_MASTER_KEY=<generate_with_command_below>
```

**Generate Encryption Master Key**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Test RPC Endpoints** (you already did this):

```bash
# Base Sepolia - Working ✅
curl https://base-sepolia.g.alchemy.com/v2/dgVBg25vMTIXti8IBCV-0 \
     --request POST \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{"id":1,"jsonrpc":"2.0","method":"eth_blockNumber"}'

# Polygon Amoy - Working ✅
curl https://polygon-amoy.g.alchemy.com/v2/dgVBg25vMTIXti8IBCV-0 \
     --request POST \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{"id":1,"jsonrpc":"2.0","method":"eth_blockNumber"}'

# Arbitrum Sepolia - Working ✅
curl https://arb-sepolia.g.alchemy.com/v2/dgVBg25vMTIXti8IBCV-0 \
     --request POST \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{"id":1,"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

---

### 3. ✅ Network Updates: Polygon Amoy (Not Mumbai)

**Important**: Polygon Mumbai testnet is deprecated. Use **Polygon Amoy** instead.

**Updated Network Configuration** in `alchemy-config.service.ts`:

```typescript
getNetworkConfig(blockchain: string, network: string): AlchemyNetworkConfig {
  const configs: Record<string, AlchemyNetworkConfig> = {
    // PRODUCTION NETWORKS
    'POLYGON-mainnet': {
      rpcUrl: this.getRpcUrl('POLYGON', 'mainnet'),
      blockchain: 'POLYGON',
      network: 'mainnet',
      chainId: 137,
      nativeToken: 'POL',
      usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      isTestnet: false,
    },
    'ARBITRUM-mainnet': {
      rpcUrl: this.getRpcUrl('ARBITRUM', 'mainnet'),
      blockchain: 'ARBITRUM',
      network: 'mainnet',
      chainId: 42161,
      nativeToken: 'ETH',
      usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      usdtAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      isTestnet: false,
    },
    'BASE-mainnet': {
      rpcUrl: this.getRpcUrl('BASE', 'mainnet'),
      blockchain: 'BASE',
      network: 'mainnet',
      chainId: 8453,
      nativeToken: 'ETH',
      usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      isTestnet: false,
    },

    // TESTNET NETWORKS
    'BASE-sepolia': {
      rpcUrl: this.getRpcUrl('BASE', 'sepolia'),
      blockchain: 'BASE',
      network: 'sepolia',
      chainId: 84532,
      nativeToken: 'ETH',
      usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      isTestnet: true,
    },
    'POLYGON-amoy': { // ← CHANGED FROM MUMBAI
      rpcUrl: this.getRpcUrl('POLYGON', 'amoy'),
      blockchain: 'POLYGON',
      network: 'amoy',
      chainId: 80002, // Amoy chain ID
      nativeToken: 'POL',
      usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // USDC on Amoy
      isTestnet: true,
    },
    'ARBITRUM-sepolia': {
      rpcUrl: this.getRpcUrl('ARBITRUM', 'sepolia'),
      blockchain: 'ARBITRUM',
      network: 'sepolia',
      chainId: 421614,
      nativeToken: 'ETH',
      usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // USDC on Arbitrum Sepolia
      isTestnet: true,
    },
  };

  const key = `${blockchain}-${network}`;
  const config = configs[key];

  if (!config) {
    throw new Error(`Network config not found for ${key}`);
  }

  return config;
}

/**
 * Get supported networks for a blockchain
 */
getSupportedNetworks(blockchain: string): string[] {
  const networks = {
    POLYGON: ['mainnet', 'amoy'], // ← CHANGED FROM MUMBAI
    ARBITRUM: ['mainnet', 'sepolia'],
    BASE: ['mainnet', 'sepolia'],
  };
  return networks[blockchain] || [];
}
```

---

### 4. ✅ Gas Manager Policy Auto-Creation

You mentioned that **Alchemy automatically created a Gas Manager policy** when you created your development app. This is great!

**To get your auto-created policy ID**:

1. Go to Alchemy Dashboard → **Gas Manager**
2. You should see your auto-created policy
3. Click on it to see the **Policy ID**
4. Copy the Policy ID and add to your `.env`:

```bash
ALCHEMY_DEV_GAS_POLICY_ID=your_auto_created_policy_id_here
```

**Note**: The auto-created policy likely has default settings. You may want to customize:

- Spending limits
- Allowed networks
- Custom rules (webhook for approval logic)

---

### 5. 🔑 Database Migration Workflow

Based on your `PRISMA_MIGRATION_WORKAROUND.md`, here's the **correct workflow** for adding Alchemy tables:

#### Option A: If Prisma Migrate Works

```bash
cd apps/raverpay-api

# 1. Update schema.prisma (add Alchemy models from migration plan)

# 2. Create migration
pnpm prisma migrate dev --name add_alchemy_models

# 3. Prisma automatically:
#    - Applies migration to database
#    - Regenerates client
#    - Updates TypeScript types
```

#### Option B: If Prisma Migrate Fails (Connection Issues)

```bash
cd apps/raverpay-api

# 1. Generate client for types (even before DB changes)
pnpm prisma generate

# 2. Create manual SQL migration file
# (See below for complete SQL script)

# 3. Get your DIRECT_URL from .env
grep "DIRECT_URL" .env | head -1

# 4. Apply SQL manually
psql "your_direct_url_here" -f prisma/migrations/add_alchemy_models.sql

# 5. Verify tables created
psql "your_direct_url_here" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'alchemy%' ORDER BY tablename;"

# 6. Regenerate Prisma client
pnpm prisma generate

# 7. Verify TypeScript compilation
pnpm exec tsc --noEmit

# 8. (Optional) Record migration in Prisma history
pnpm prisma migrate dev --create-only --name add_alchemy_models_manual
# Edit the migration file to match manual SQL
pnpm prisma migrate resolve --applied <migration_name>
```

#### Manual SQL Migration Script

Create `apps/raverpay-api/prisma/migrations/add_alchemy_models.sql`:

```sql
-- ================================
-- Alchemy Models Migration
-- ================================

-- 1. Create Alchemy Account Type Enum
DO $$ BEGIN
    CREATE TYPE "AlchemyAccountType" AS ENUM ('EOA', 'SMART_CONTRACT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Alchemy Wallet State Enum
DO $$ BEGIN
    CREATE TYPE "AlchemyWalletState" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED', 'COMPROMISED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Alchemy Transaction Type Enum
DO $$ BEGIN
    CREATE TYPE "AlchemyTransactionType" AS ENUM ('SEND', 'RECEIVE', 'INTERNAL', 'SWAP', 'BRIDGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create Alchemy Transaction State Enum
DO $$ BEGIN
    CREATE TYPE "AlchemyTransactionState" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Create alchemy_wallets table
CREATE TABLE IF NOT EXISTS alchemy_wallets (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    address TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    blockchain TEXT NOT NULL,
    network TEXT NOT NULL,
    "accountType" "AlchemyAccountType" NOT NULL DEFAULT 'SMART_CONTRACT',
    state "AlchemyWalletState" NOT NULL DEFAULT 'ACTIVE',
    name TEXT,
    "isGasSponsored" BOOLEAN NOT NULL DEFAULT true,
    "gasPolicyId" TEXT,
    "alchemyAppId" TEXT,
    "webhookId" TEXT,
    "lastKeyRotation" TIMESTAMP(3),
    "keyRotationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT alchemy_wallets_pkey PRIMARY KEY (id)
);

-- 6. Create alchemy_transactions table
CREATE TABLE IF NOT EXISTS alchemy_transactions (
    id TEXT NOT NULL,
    reference TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    type "AlchemyTransactionType" NOT NULL,
    state "AlchemyTransactionState" NOT NULL DEFAULT 'PENDING',
    "sourceAddress" TEXT,
    "destinationAddress" TEXT NOT NULL,
    "tokenAddress" TEXT,
    blockchain TEXT NOT NULL,
    network TEXT NOT NULL,
    amount TEXT NOT NULL,
    "amountFormatted" TEXT,
    "transactionHash" TEXT,
    "blockNumber" BIGINT,
    "blockHash" TEXT,
    "gasUsed" TEXT,
    "gasPrice" TEXT,
    "networkFee" TEXT,
    "networkFeeUsd" TEXT,
    "userOperationHash" TEXT,
    "serviceFee" TEXT,
    "feeCollected" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    confirmations INTEGER NOT NULL DEFAULT 0,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT alchemy_transactions_pkey PRIMARY KEY (id)
);

-- 7. Create alchemy_user_operations table
CREATE TABLE IF NOT EXISTS alchemy_user_operations (
    id TEXT NOT NULL,
    "userOperationHash" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    sender TEXT NOT NULL,
    nonce TEXT NOT NULL,
    "callData" TEXT NOT NULL,
    "callGasLimit" TEXT NOT NULL,
    "verificationGasLimit" TEXT NOT NULL,
    "preVerificationGas" TEXT NOT NULL,
    "maxFeePerGas" TEXT NOT NULL,
    "maxPriorityFeePerGas" TEXT NOT NULL,
    "paymasterAndData" TEXT,
    signature TEXT NOT NULL,
    "bundlerUsed" BOOLEAN NOT NULL DEFAULT true,
    "gasPolicyId" TEXT,
    "gasSponsored" BOOLEAN NOT NULL DEFAULT false,
    "transactionHash" TEXT,
    "blockNumber" BIGINT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT alchemy_user_operations_pkey PRIMARY KEY (id)
);

-- 8. Create alchemy_gas_spending table
CREATE TABLE IF NOT EXISTS alchemy_gas_spending (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    blockchain TEXT NOT NULL,
    network TEXT NOT NULL,
    "gasPolicyId" TEXT NOT NULL,
    date TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalGasUsed" TEXT NOT NULL,
    "totalGasUsd" TEXT NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT alchemy_gas_spending_pkey PRIMARY KEY (id)
);

-- ================================
-- Unique Constraints
-- ================================

-- AlchemyWallet unique constraints
ALTER TABLE alchemy_wallets
    ADD CONSTRAINT IF NOT EXISTS alchemy_wallets_address_key UNIQUE (address);

ALTER TABLE alchemy_wallets
    ADD CONSTRAINT IF NOT EXISTS alchemy_wallets_userId_blockchain_network_key
    UNIQUE ("userId", blockchain, network);

-- AlchemyTransaction unique constraints
ALTER TABLE alchemy_transactions
    ADD CONSTRAINT IF NOT EXISTS alchemy_transactions_reference_key UNIQUE (reference);

-- Only add these if column values can be unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'alchemy_transactions_transactionHash_key'
    ) THEN
        ALTER TABLE alchemy_transactions
            ADD CONSTRAINT alchemy_transactions_transactionHash_key UNIQUE ("transactionHash");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'alchemy_transactions_userOperationHash_key'
    ) THEN
        ALTER TABLE alchemy_transactions
            ADD CONSTRAINT alchemy_transactions_userOperationHash_key UNIQUE ("userOperationHash");
    END IF;
END $$;

-- AlchemyUserOperation unique constraints
ALTER TABLE alchemy_user_operations
    ADD CONSTRAINT IF NOT EXISTS alchemy_user_operations_userOperationHash_key
    UNIQUE ("userOperationHash");

-- AlchemyGasSpending unique constraints
ALTER TABLE alchemy_gas_spending
    ADD CONSTRAINT IF NOT EXISTS alchemy_gas_spending_userId_walletAddress_date_key
    UNIQUE ("userId", "walletAddress", date);

-- ================================
-- Indexes
-- ================================

-- AlchemyWallet indexes
CREATE INDEX IF NOT EXISTS alchemy_wallets_userId_idx ON alchemy_wallets("userId");
CREATE INDEX IF NOT EXISTS alchemy_wallets_address_idx ON alchemy_wallets(address);
CREATE INDEX IF NOT EXISTS alchemy_wallets_blockchain_idx ON alchemy_wallets(blockchain);
CREATE INDEX IF NOT EXISTS alchemy_wallets_network_idx ON alchemy_wallets(network);
CREATE INDEX IF NOT EXISTS alchemy_wallets_state_idx ON alchemy_wallets(state);

-- AlchemyTransaction indexes
CREATE INDEX IF NOT EXISTS alchemy_transactions_userId_idx ON alchemy_transactions("userId");
CREATE INDEX IF NOT EXISTS alchemy_transactions_walletId_idx ON alchemy_transactions("walletId");
CREATE INDEX IF NOT EXISTS alchemy_transactions_state_idx ON alchemy_transactions(state);
CREATE INDEX IF NOT EXISTS alchemy_transactions_type_idx ON alchemy_transactions(type);
CREATE INDEX IF NOT EXISTS alchemy_transactions_transactionHash_idx ON alchemy_transactions("transactionHash");
CREATE INDEX IF NOT EXISTS alchemy_transactions_userOperationHash_idx ON alchemy_transactions("userOperationHash");
CREATE INDEX IF NOT EXISTS alchemy_transactions_createdAt_idx ON alchemy_transactions("createdAt");
CREATE INDEX IF NOT EXISTS alchemy_transactions_userId_createdAt_idx ON alchemy_transactions("userId", "createdAt" DESC);

-- AlchemyUserOperation indexes
CREATE INDEX IF NOT EXISTS alchemy_user_operations_walletId_idx ON alchemy_user_operations("walletId");
CREATE INDEX IF NOT EXISTS alchemy_user_operations_userId_idx ON alchemy_user_operations("userId");
CREATE INDEX IF NOT EXISTS alchemy_user_operations_userOperationHash_idx ON alchemy_user_operations("userOperationHash");
CREATE INDEX IF NOT EXISTS alchemy_user_operations_status_idx ON alchemy_user_operations(status);
CREATE INDEX IF NOT EXISTS alchemy_user_operations_createdAt_idx ON alchemy_user_operations("createdAt");

-- AlchemyGasSpending indexes
CREATE INDEX IF NOT EXISTS alchemy_gas_spending_userId_idx ON alchemy_gas_spending("userId");
CREATE INDEX IF NOT EXISTS alchemy_gas_spending_date_idx ON alchemy_gas_spending(date);
CREATE INDEX IF NOT EXISTS alchemy_gas_spending_walletAddress_idx ON alchemy_gas_spending("walletAddress");

-- ================================
-- Foreign Key Constraints
-- ================================

-- AlchemyWallet foreign keys
ALTER TABLE alchemy_wallets
    ADD CONSTRAINT IF NOT EXISTS alchemy_wallets_userId_fkey
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlchemyTransaction foreign keys
ALTER TABLE alchemy_transactions
    ADD CONSTRAINT IF NOT EXISTS alchemy_transactions_userId_fkey
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE alchemy_transactions
    ADD CONSTRAINT IF NOT EXISTS alchemy_transactions_walletId_fkey
    FOREIGN KEY ("walletId") REFERENCES alchemy_wallets(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlchemyUserOperation foreign keys
ALTER TABLE alchemy_user_operations
    ADD CONSTRAINT IF NOT EXISTS alchemy_user_operations_walletId_fkey
    FOREIGN KEY ("walletId") REFERENCES alchemy_wallets(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ================================
-- Verification
-- ================================

-- List all Alchemy tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'alchemy%'
ORDER BY tablename;

-- Count rows (should all be 0 initially)
SELECT
    'alchemy_wallets' as table_name, COUNT(*) as row_count FROM alchemy_wallets
UNION ALL
SELECT 'alchemy_transactions', COUNT(*) FROM alchemy_transactions
UNION ALL
SELECT 'alchemy_user_operations', COUNT(*) FROM alchemy_user_operations
UNION ALL
SELECT 'alchemy_gas_spending', COUNT(*) FROM alchemy_gas_spending;
```

---

## 6. ⚠️ CRITICAL: Smart Account vs EOA - Why It Matters

### Your Question: "Why is Smart Account a placeholder? Can users use crypto without it?"

**Short Answer**: Yes, users can use crypto with **EOA (Externally Owned Accounts)**, but **Smart Accounts are recommended** for production because they enable **gas sponsorship** and better UX.

### Detailed Explanation

#### EOA (Externally Owned Account)

**What it is**: Traditional wallet (like MetaMask)

- Has a private key
- User signs every transaction
- **User must have native token (POL, ETH) for gas**
- Direct blockchain interaction

**Pros**:

- ✅ Simpler to implement
- ✅ Works immediately (no SDK integration)
- ✅ Standard Ethereum wallet

**Cons**:

- ❌ **User must fund wallet with POL/ETH for gas fees**
- ❌ **Poor UX for non-crypto users**
- ❌ No gas sponsorship possible
- ❌ Can't batch transactions
- ❌ No social recovery

**User Experience with EOA**:

```
1. User wants to send 10 USDC
2. System: "Error: You need 0.01 POL for gas fees"
3. User: "What is POL? Where do I get it?"
4. User must:
   - Buy POL on exchange
   - Transfer POL to wallet
   - THEN send USDC
```

**Result**: **Terrible UX for non-crypto users** ❌

---

#### Smart Account (Account Abstraction)

**What it is**: Smart contract wallet (ERC-4337)

- Still has a "signer" (private key)
- But transactions go through a smart contract
- **Alchemy Gas Manager sponsors gas**
- Bundler submits transactions

**Pros**:

- ✅ **Gas sponsorship** - users don't need POL/ETH
- ✅ **Better UX** - just sign and go
- ✅ Batch transactions (save gas)
- ✅ Social recovery possible
- ✅ Programmable logic

**Cons**:

- ❌ More complex to implement
- ❌ Requires Alchemy Account Kit SDK
- ❌ Slightly more code

**User Experience with Smart Account**:

```
1. User wants to send 10 USDC
2. User confirms transaction
3. Done! (Alchemy sponsors gas)
```

**Result**: **Great UX** ✅

---

### Why Smart Account Implementation Was a Placeholder

In the migration plan, the Smart Account creation was marked as placeholder because:

1. **Requires SDK Integration**: Need to install `@alchemy/aa-sdk`
2. **More Complex Setup**: Need to configure Account Kit
3. **Documentation Unclear**: Alchemy's docs change frequently

But it's **NOT optional for production** - it's **critical for good UX**.

---

### Recommended Approach

#### Phase 1: Start with EOA (Testing)

```typescript
// Simple implementation - for testing only
async generateEOAWallet(userId: string) {
  const wallet = ethers.Wallet.createRandom();
  // Store encrypted private key
  // Users must fund with POL/ETH for gas
}
```

**Use for**:

- ✅ Initial testing
- ✅ Understanding the flow
- ✅ Testnet development

**Don't use for production** - UX is bad for users

---

#### Phase 2: Implement Smart Accounts (Production)

**Installation**:

```bash
cd apps/raverpay-api
pnpm install @alchemy/aa-sdk @alchemy/aa-core @alchemy/aa-accounts viem@^2.21.27
```

**Implementation**:

```typescript
import { createModularAccountAlchemyClient } from '@alchemy/aa-alchemy';
import { LocalAccountSigner, sepolia } from '@alchemy/aa-core';
import { generatePrivateKey } from 'viem/accounts';

async generateSmartAccount(userId: string, blockchain: string, network: string) {
  // 1. Generate signer (this is still a private key, but it controls the smart account)
  const privateKey = generatePrivateKey();
  const signer = LocalAccountSigner.privateKeyToAccountSigner(privateKey);

  // 2. Get network config
  const networkConfig = this.configService.getNetworkConfig(blockchain, network);
  const alchemyApiKey = this.configService.getApiKey('dev');
  const gasPolicyId = this.configService.getGasPolicyId('dev');

  // 3. Create smart account client
  const client = await createModularAccountAlchemyClient({
    apiKey: alchemyApiKey,
    chain: sepolia, // or your network
    signer,
    gasManagerConfig: {
      policyId: gasPolicyId, // Your Gas Manager policy
    },
  });

  // 4. Get smart account address
  const smartAccountAddress = await client.getAddress();

  // 5. Encrypt and store signer's private key
  const encryptedPrivateKey = this.encryptionService.encryptPrivateKey(privateKey, userId);

  // 6. Save to database
  const wallet = await this.prisma.alchemyWallet.create({
    data: {
      userId,
      address: smartAccountAddress,
      encryptedPrivateKey,
      blockchain,
      network,
      accountType: 'SMART_CONTRACT',
      isGasSponsored: true,
      gasPolicyId,
    },
  });

  return {
    walletId: wallet.id,
    address: smartAccountAddress,
  };
}

async sendUSDCWithSmartAccount(params: {
  userId: string;
  walletId: string;
  destinationAddress: string;
  amount: string;
  tokenAddress: string;
}) {
  // 1. Get wallet and decrypt signer key
  const wallet = await this.prisma.alchemyWallet.findUnique({
    where: { id: params.walletId },
  });

  const privateKey = await this.decryptPrivateKey(wallet.encryptedPrivateKey, params.userId);
  const signer = LocalAccountSigner.privateKeyToAccountSigner(privateKey);

  // 2. Create client
  const client = await createModularAccountAlchemyClient({
    apiKey: this.configService.getApiKey('dev'),
    chain: sepolia,
    signer,
    gasManagerConfig: {
      policyId: wallet.gasPolicyId,
    },
  });

  // 3. Create USDC transfer call
  const usdcContract = {
    address: params.tokenAddress,
    abi: ['function transfer(address to, uint256 amount)'],
  };

  // 4. Send transaction (gas is sponsored!)
  const userOpResult = await client.sendUserOperation({
    uo: {
      target: params.tokenAddress,
      data: encodeFunctionData({
        abi: usdcContract.abi,
        functionName: 'transfer',
        args: [params.destinationAddress, BigInt(params.amount)],
      }),
    },
  });

  // 5. Wait for transaction to be mined
  const txHash = await client.waitForUserOperationTransaction({
    hash: userOpResult.hash,
  });

  return {
    userOperationHash: userOpResult.hash,
    transactionHash: txHash,
  };
}
```

**Use for**:

- ✅ Production
- ✅ Better user experience
- ✅ Gas sponsorship
- ✅ Professional fintech app

---

### Why Smart Accounts Are Critical for RaverPay

RaverPay is a **fintech app for non-crypto users**. Your users:

- Don't know what "gas fees" are
- Don't want to buy POL/ETH
- Just want to send money like Venmo/CashApp

**With EOA**: "You need to buy POL first" ❌  
**With Smart Account**: "Just confirm the transaction" ✅

---

## Implementation Priority

### Phase 1: MVP (Weeks 1-4)

- ✅ Database schema
- ✅ Encryption infrastructure
- ✅ **EOA wallets** (for testing)
- ✅ Basic USDC transfers (users fund gas manually)
- ✅ Webhook integration

**Result**: Working but not production-ready

### Phase 2: Production (Weeks 5-8)

- ✅ **Smart Account integration** (THE CRITICAL PIECE)
- ✅ Gas Manager configuration
- ✅ Admin dashboard
- ✅ Mobile app
- ✅ Security audit

**Result**: Production-ready with good UX

---

## Summary of Updates

1. **✅ Package Manager**: Use `pnpm` not `npm`
2. **✅ Networks**: Use Polygon Amoy (not Mumbai)
3. **✅ Environment Variables**: Your actual API key and RPC URLs
4. **✅ Gas Policy**: Auto-created policy ID from dashboard
5. **✅ Database Migration**: Follow your PRISMA_MIGRATION_WORKAROUND.md process
6. **✅ Smart Accounts**: NOT optional for production - critical for UX

---

## Next Steps

1. **✅ Update environment variables** with your actual API key
2. **Add encryption master key** (generate securely)
3. **Get Gas Policy ID** from Alchemy dashboard
4. **Run database migration** (using pnpm and your workaround process if needed)
5. **Start with EOA** implementation for testing
6. **Plan Smart Account** integration for production

---

## Questions?

**Q: Do we need Smart Accounts for MVP?**  
A: No for testing, **YES for production**. Users won't accept "buy POL first" UX.

**Q: Is it hard to implement Smart Accounts?**  
A: Harder than EOA, but Alchemy's SDK simplifies it. ~1-2 weeks of work.

**Q: What if Gas Manager fails?**  
A: Have fallback to EOA mode where users self-fund gas. But should be rare.

**Q: Can we switch from EOA to Smart Accounts later?**  
A: Yes, but users would need new wallets. Better to start with Smart Accounts.

---

**Updated**: January 25, 2026  
**Based on**: Your actual Alchemy setup + Prisma workflow
