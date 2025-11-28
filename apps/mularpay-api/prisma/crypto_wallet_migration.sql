-- ============================================
-- CRYPTO WALLET SYSTEM MIGRATION
-- Manual SQL migration for adding crypto wallet functionality
-- Created: 2025-01-14
-- ============================================

-- ============================================
-- 1. CREATE ENUMS
-- ============================================

-- WalletType enum
DO $$ BEGIN
  CREATE TYPE "WalletType" AS ENUM ('NAIRA', 'CRYPTO', 'USD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CryptoTransactionType enum
DO $$ BEGIN
  CREATE TYPE "CryptoTransactionType" AS ENUM ('RECEIVE', 'SEND', 'CONVERT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- TransactionDirection enum
DO $$ BEGIN
  CREATE TYPE "TransactionDirection" AS ENUM ('INCOMING', 'OUTGOING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CryptoTransactionStatus enum
DO $$ BEGIN
  CREATE TYPE "CryptoTransactionStatus" AS ENUM ('PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ConversionStatus enum
DO $$ BEGIN
  CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new transaction types to existing TransactionType enum
DO $$ BEGIN
  -- Add CRYPTO_DEPOSIT if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CRYPTO_DEPOSIT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'CRYPTO_DEPOSIT';
  END IF;

  -- Add CRYPTO_SEND if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CRYPTO_SEND' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'CRYPTO_SEND';
  END IF;

  -- Add CRYPTO_TO_NAIRA if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CRYPTO_TO_NAIRA' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'CRYPTO_TO_NAIRA';
  END IF;

  -- Add USD_DEPOSIT if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USD_DEPOSIT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'USD_DEPOSIT';
  END IF;

  -- Add USD_WITHDRAWAL if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USD_WITHDRAWAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'USD_WITHDRAWAL';
  END IF;

  -- Add CARD_LOAD if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CARD_LOAD' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'CARD_LOAD';
  END IF;

  -- Add CARD_PURCHASE if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CARD_PURCHASE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'CARD_PURCHASE';
  END IF;

  -- Add CRYPTO_TO_USD if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CRYPTO_TO_USD' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'CRYPTO_TO_USD';
  END IF;
END $$;

-- ============================================
-- 2. MODIFY EXISTING WALLETS TABLE
-- ============================================

-- Add type column (default NAIRA for existing wallets)
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS type "WalletType" DEFAULT 'NAIRA';

-- Add crypto wallet specific columns
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS "venlyWalletId" TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS "walletAddress" TEXT;

-- Drop old unique constraint on userId (if exists)
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_userId_key;

-- Add new unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS wallets_userId_type_key ON wallets("userId", type);
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_venlyWalletId_key" ON wallets("venlyWalletId") WHERE "venlyWalletId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_walletAddress_key" ON wallets("walletAddress") WHERE "walletAddress" IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS wallets_type_idx ON wallets(type);
CREATE INDEX IF NOT EXISTS "wallets_walletAddress_idx" ON wallets("walletAddress");
CREATE INDEX IF NOT EXISTS "wallets_venlyWalletId_idx" ON wallets("venlyWalletId");

-- ============================================
-- 3. CREATE VENLY USER TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS venly_users (
  id TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "venlyUserId" TEXT NOT NULL,
  "venlySigningMethodId" TEXT,
  "venlyReference" TEXT NOT NULL,
  "encryptedPin" TEXT NOT NULL,
  "pinSetAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT venly_users_pkey PRIMARY KEY (id),
  CONSTRAINT "venly_users_userId_key" UNIQUE ("userId"),
  CONSTRAINT "venly_users_venlyUserId_key" UNIQUE ("venlyUserId")
);

-- Add foreign key
ALTER TABLE venly_users
  DROP CONSTRAINT IF EXISTS "venly_users_userId_fkey",
  ADD CONSTRAINT "venly_users_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "venly_users_venlyUserId_idx" ON venly_users("venlyUserId");
CREATE INDEX IF NOT EXISTS "venly_users_userId_idx" ON venly_users("userId");

-- ============================================
-- 4. CREATE CRYPTO BALANCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crypto_balances (
  id TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "tokenSymbol" TEXT NOT NULL,
  "tokenAddress" TEXT,
  "tokenDecimals" INTEGER NOT NULL DEFAULT 18,
  balance DECIMAL(36, 18) NOT NULL,
  "rawBalance" TEXT NOT NULL,
  "usdPrice" DECIMAL(18, 8),
  "usdValue" DECIMAL(18, 2),
  "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT crypto_balances_pkey PRIMARY KEY (id),
  CONSTRAINT "crypto_balances_walletId_tokenSymbol_key" UNIQUE ("walletId", "tokenSymbol")
);

-- Add foreign key
ALTER TABLE crypto_balances
  DROP CONSTRAINT IF EXISTS "crypto_balances_walletId_fkey",
  ADD CONSTRAINT "crypto_balances_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES wallets(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "crypto_balances_walletId_idx" ON crypto_balances("walletId");
CREATE INDEX IF NOT EXISTS "crypto_balances_tokenSymbol_idx" ON crypto_balances("tokenSymbol");

-- ============================================
-- 5. CREATE CRYPTO TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crypto_transactions (
  id TEXT NOT NULL,
  reference TEXT NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  type "CryptoTransactionType" NOT NULL,
  direction "TransactionDirection" NOT NULL,
  "fromAddress" TEXT NOT NULL,
  "toAddress" TEXT NOT NULL,
  "tokenSymbol" TEXT NOT NULL,
  "tokenAddress" TEXT,
  "tokenDecimals" INTEGER NOT NULL DEFAULT 6,
  amount DECIMAL(36, 18) NOT NULL,
  "rawAmount" TEXT NOT NULL,
  "usdValue" DECIMAL(18, 2) NOT NULL,
  "gasFee" DECIMAL(10, 6),
  "gasFeeUsd" DECIMAL(10, 2),
  network TEXT NOT NULL DEFAULT 'MATIC',
  "blockNumber" INTEGER,
  "blockHash" TEXT,
  confirmations INTEGER NOT NULL DEFAULT 0,
  "hasReachedFinality" BOOLEAN NOT NULL DEFAULT false,
  nonce INTEGER,
  status "CryptoTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "failureReason" TEXT,
  memo TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT crypto_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT crypto_transactions_reference_key UNIQUE (reference),
  CONSTRAINT "crypto_transactions_transactionHash_key" UNIQUE ("transactionHash")
);

-- Add foreign keys
ALTER TABLE crypto_transactions
  DROP CONSTRAINT IF EXISTS "crypto_transactions_userId_fkey",
  ADD CONSTRAINT "crypto_transactions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "crypto_transactions_userId_idx" ON crypto_transactions("userId");
CREATE INDEX IF NOT EXISTS "crypto_transactions_walletId_idx" ON crypto_transactions("walletId");
CREATE INDEX IF NOT EXISTS "crypto_transactions_transactionHash_idx" ON crypto_transactions("transactionHash");
CREATE INDEX IF NOT EXISTS crypto_transactions_status_idx ON crypto_transactions(status);
CREATE INDEX IF NOT EXISTS crypto_transactions_type_idx ON crypto_transactions(type);
CREATE INDEX IF NOT EXISTS crypto_transactions_direction_idx ON crypto_transactions(direction);
CREATE INDEX IF NOT EXISTS "crypto_transactions_submittedAt_idx" ON crypto_transactions("submittedAt");
CREATE INDEX IF NOT EXISTS "crypto_transactions_status_submittedAt_idx" ON crypto_transactions(status, "submittedAt");

-- ============================================
-- 6. CREATE CRYPTO CONVERSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crypto_conversions (
  id TEXT NOT NULL,
  reference TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenSymbol" TEXT NOT NULL,
  "cryptoAmount" DECIMAL(36, 18) NOT NULL,
  "usdValue" DECIMAL(18, 2) NOT NULL,
  "nairaAmount" DECIMAL(18, 2) NOT NULL,
  "exchangeRate" DECIMAL(10, 2) NOT NULL,
  "feePercent" DECIMAL(5, 2) NOT NULL,
  "feeAmount" DECIMAL(18, 2) NOT NULL,
  "netNaira" DECIMAL(18, 2) NOT NULL,
  status "ConversionStatus" NOT NULL DEFAULT 'PENDING',
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "cryptoTransactionId" TEXT,
  "nairaTransactionId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT crypto_conversions_pkey PRIMARY KEY (id),
  CONSTRAINT crypto_conversions_reference_key UNIQUE (reference)
);

-- Add foreign key
ALTER TABLE crypto_conversions
  DROP CONSTRAINT IF EXISTS "crypto_conversions_userId_fkey",
  ADD CONSTRAINT "crypto_conversions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "crypto_conversions_userId_idx" ON crypto_conversions("userId");
CREATE INDEX IF NOT EXISTS crypto_conversions_status_idx ON crypto_conversions(status);
CREATE INDEX IF NOT EXISTS "crypto_conversions_requestedAt_idx" ON crypto_conversions("requestedAt");

-- ============================================
-- 7. CREATE EXCHANGE RATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT NOT NULL,
  "fromCurrency" TEXT NOT NULL,
  "toCurrency" TEXT NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  "platformFeePercent" DECIMAL(5, 2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "setBy" TEXT NOT NULL,
  "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  source TEXT,
  notes TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT exchange_rates_pkey PRIMARY KEY (id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "exchange_rates_fromCurrency_toCurrency_isActive_idx" ON exchange_rates("fromCurrency", "toCurrency", "isActive");
CREATE INDEX IF NOT EXISTS "exchange_rates_isActive_idx" ON exchange_rates("isActive");

-- ============================================
-- 8. CREATE CRYPTO PRICES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crypto_prices (
  id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  "usdPrice" DECIMAL(18, 8) NOT NULL,
  source TEXT NOT NULL DEFAULT 'coingecko',
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT crypto_prices_pkey PRIMARY KEY (id),
  CONSTRAINT "crypto_prices_symbol_fetchedAt_key" UNIQUE (symbol, "fetchedAt")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS crypto_prices_symbol_idx ON crypto_prices(symbol);
CREATE INDEX IF NOT EXISTS "crypto_prices_fetchedAt_idx" ON crypto_prices("fetchedAt");

-- ============================================
-- 9. CREATE CRYPTO WEBHOOK LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crypto_webhook_logs (
  id TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  "processedAt" TIMESTAMP(3),
  error TEXT,
  "transactionHash" TEXT,
  "fromAddress" TEXT,
  "toAddress" TEXT,
  amount DECIMAL(18, 8),
  "tokenSymbol" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT crypto_webhook_logs_pkey PRIMARY KEY (id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "crypto_webhook_logs_eventType_idx" ON crypto_webhook_logs("eventType");
CREATE INDEX IF NOT EXISTS "crypto_webhook_logs_transactionHash_idx" ON crypto_webhook_logs("transactionHash");
CREATE INDEX IF NOT EXISTS crypto_webhook_logs_processed_idx ON crypto_webhook_logs(processed);
CREATE INDEX IF NOT EXISTS "crypto_webhook_logs_receivedAt_idx" ON crypto_webhook_logs("receivedAt");

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Run: pnpm prisma generate
-- to regenerate Prisma Client with new types
