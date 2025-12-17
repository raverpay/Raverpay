-- Circle Integration Migration
-- Run this SQL manually using psql if prisma migrate fails
-- Usage: psql "$DIRECT_URL" -f circle_integration.sql

-- ============================================
-- ENUMS
-- ============================================

-- Create CircleAccountType enum
DO $$ BEGIN
    CREATE TYPE "CircleAccountType" AS ENUM ('SCA', 'EOA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create CircleWalletState enum
DO $$ BEGIN
    CREATE TYPE "CircleWalletState" AS ENUM ('LIVE', 'FROZEN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create CircleTransactionType enum
DO $$ BEGIN
    CREATE TYPE "CircleTransactionType" AS ENUM ('TRANSFER', 'CONTRACT_EXECUTION', 'CCTP_BURN', 'CCTP_MINT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create CircleTransactionState enum
DO $$ BEGIN
    CREATE TYPE "CircleTransactionState" AS ENUM ('INITIATED', 'QUEUED', 'SENT', 'CONFIRMED', 'COMPLETE', 'FAILED', 'CANCELLED', 'DENIED', 'STUCK', 'CLEARED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create CCTPTransferState enum
DO $$ BEGIN
    CREATE TYPE "CCTPTransferState" AS ENUM ('INITIATED', 'BURN_PENDING', 'BURN_CONFIRMED', 'ATTESTATION_PENDING', 'ATTESTATION_RECEIVED', 'MINT_PENDING', 'MINT_CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Create circle_wallet_sets table
CREATE TABLE IF NOT EXISTS "circle_wallet_sets" (
    "id" TEXT NOT NULL,
    "circleWalletSetId" TEXT NOT NULL,
    "name" TEXT,
    "custodyType" TEXT NOT NULL DEFAULT 'DEVELOPER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circle_wallet_sets_pkey" PRIMARY KEY ("id")
);

-- Create circle_wallets table
CREATE TABLE IF NOT EXISTS "circle_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "circleWalletId" TEXT NOT NULL,
    "walletSetId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "blockchain" TEXT NOT NULL,
    "accountType" "CircleAccountType" NOT NULL DEFAULT 'SCA',
    "state" "CircleWalletState" NOT NULL DEFAULT 'LIVE',
    "name" TEXT,
    "refId" TEXT,
    "custodyType" TEXT NOT NULL DEFAULT 'DEVELOPER',
    "scaCore" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circle_wallets_pkey" PRIMARY KEY ("id")
);

-- Create circle_transactions table
CREATE TABLE IF NOT EXISTS "circle_transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "circleTransactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "CircleTransactionType" NOT NULL,
    "state" "CircleTransactionState" NOT NULL DEFAULT 'INITIATED',
    "sourceAddress" TEXT,
    "destinationAddress" TEXT NOT NULL,
    "tokenId" TEXT,
    "tokenAddress" TEXT,
    "blockchain" TEXT NOT NULL,
    "amounts" TEXT[],
    "feeLevel" TEXT,
    "gasLimit" TEXT,
    "gasPrice" TEXT,
    "maxFee" TEXT,
    "priorityFee" TEXT,
    "transactionHash" TEXT,
    "blockNumber" INTEGER,
    "blockHash" TEXT,
    "networkFee" TEXT,
    "networkFeeUsd" TEXT,
    "refId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "errorReason" TEXT,
    "firstConfirmDate" TIMESTAMP(3),
    "estimatedCompleteDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "cancelledDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circle_transactions_pkey" PRIMARY KEY ("id")
);

-- Create circle_webhook_logs table
CREATE TABLE IF NOT EXISTS "circle_webhook_logs" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "notificationId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "entityId" TEXT,
    "walletId" TEXT,
    "transactionId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- Create circle_cctp_transfers table
CREATE TABLE IF NOT EXISTS "circle_cctp_transfers" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceWalletId" TEXT NOT NULL,
    "sourceChain" TEXT NOT NULL,
    "destinationChain" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "burnTransactionId" TEXT,
    "burnTransactionHash" TEXT,
    "attestationHash" TEXT,
    "attestationStatus" TEXT,
    "mintTransactionId" TEXT,
    "mintTransactionHash" TEXT,
    "state" "CCTPTransferState" NOT NULL DEFAULT 'INITIATED',
    "transferType" TEXT NOT NULL DEFAULT 'STANDARD',
    "feeAmount" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "burnConfirmedAt" TIMESTAMP(3),
    "attestationReceivedAt" TIMESTAMP(3),
    "mintConfirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circle_cctp_transfers_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

-- circle_wallet_sets unique constraints
ALTER TABLE "circle_wallet_sets"
    DROP CONSTRAINT IF EXISTS "circle_wallet_sets_circleWalletSetId_key";
ALTER TABLE "circle_wallet_sets"
    ADD CONSTRAINT "circle_wallet_sets_circleWalletSetId_key" UNIQUE ("circleWalletSetId");

-- circle_wallets unique constraints
ALTER TABLE "circle_wallets"
    DROP CONSTRAINT IF EXISTS "circle_wallets_circleWalletId_key";
ALTER TABLE "circle_wallets"
    ADD CONSTRAINT "circle_wallets_circleWalletId_key" UNIQUE ("circleWalletId");

ALTER TABLE "circle_wallets"
    DROP CONSTRAINT IF EXISTS "circle_wallets_userId_blockchain_key";
ALTER TABLE "circle_wallets"
    ADD CONSTRAINT "circle_wallets_userId_blockchain_key" UNIQUE ("userId", "blockchain");

-- circle_transactions unique constraints
ALTER TABLE "circle_transactions"
    DROP CONSTRAINT IF EXISTS "circle_transactions_reference_key";
ALTER TABLE "circle_transactions"
    ADD CONSTRAINT "circle_transactions_reference_key" UNIQUE ("reference");

ALTER TABLE "circle_transactions"
    DROP CONSTRAINT IF EXISTS "circle_transactions_circleTransactionId_key";
ALTER TABLE "circle_transactions"
    ADD CONSTRAINT "circle_transactions_circleTransactionId_key" UNIQUE ("circleTransactionId");

-- circle_webhook_logs unique constraints
ALTER TABLE "circle_webhook_logs"
    DROP CONSTRAINT IF EXISTS "circle_webhook_logs_notificationId_key";
ALTER TABLE "circle_webhook_logs"
    ADD CONSTRAINT "circle_webhook_logs_notificationId_key" UNIQUE ("notificationId");

-- circle_cctp_transfers unique constraints
ALTER TABLE "circle_cctp_transfers"
    DROP CONSTRAINT IF EXISTS "circle_cctp_transfers_reference_key";
ALTER TABLE "circle_cctp_transfers"
    ADD CONSTRAINT "circle_cctp_transfers_reference_key" UNIQUE ("reference");

-- ============================================
-- INDEXES
-- ============================================

-- circle_wallet_sets indexes
CREATE INDEX IF NOT EXISTS "circle_wallet_sets_circleWalletSetId_idx" ON "circle_wallet_sets"("circleWalletSetId");
CREATE INDEX IF NOT EXISTS "circle_wallet_sets_isActive_idx" ON "circle_wallet_sets"("isActive");

-- circle_wallets indexes
CREATE INDEX IF NOT EXISTS "circle_wallets_circleWalletId_idx" ON "circle_wallets"("circleWalletId");
CREATE INDEX IF NOT EXISTS "circle_wallets_userId_idx" ON "circle_wallets"("userId");
CREATE INDEX IF NOT EXISTS "circle_wallets_walletSetId_idx" ON "circle_wallets"("walletSetId");
CREATE INDEX IF NOT EXISTS "circle_wallets_address_idx" ON "circle_wallets"("address");
CREATE INDEX IF NOT EXISTS "circle_wallets_blockchain_idx" ON "circle_wallets"("blockchain");
CREATE INDEX IF NOT EXISTS "circle_wallets_state_idx" ON "circle_wallets"("state");

-- circle_transactions indexes
CREATE INDEX IF NOT EXISTS "circle_transactions_circleTransactionId_idx" ON "circle_transactions"("circleTransactionId");
CREATE INDEX IF NOT EXISTS "circle_transactions_userId_idx" ON "circle_transactions"("userId");
CREATE INDEX IF NOT EXISTS "circle_transactions_walletId_idx" ON "circle_transactions"("walletId");
CREATE INDEX IF NOT EXISTS "circle_transactions_state_idx" ON "circle_transactions"("state");
CREATE INDEX IF NOT EXISTS "circle_transactions_type_idx" ON "circle_transactions"("type");
CREATE INDEX IF NOT EXISTS "circle_transactions_transactionHash_idx" ON "circle_transactions"("transactionHash");
CREATE INDEX IF NOT EXISTS "circle_transactions_createdAt_idx" ON "circle_transactions"("createdAt");
CREATE INDEX IF NOT EXISTS "circle_transactions_userId_createdAt_idx" ON "circle_transactions"("userId", "createdAt" DESC);

-- circle_webhook_logs indexes
CREATE INDEX IF NOT EXISTS "circle_webhook_logs_eventType_idx" ON "circle_webhook_logs"("eventType");
CREATE INDEX IF NOT EXISTS "circle_webhook_logs_processed_idx" ON "circle_webhook_logs"("processed");
CREATE INDEX IF NOT EXISTS "circle_webhook_logs_receivedAt_idx" ON "circle_webhook_logs"("receivedAt");
CREATE INDEX IF NOT EXISTS "circle_webhook_logs_entityId_idx" ON "circle_webhook_logs"("entityId");
CREATE INDEX IF NOT EXISTS "circle_webhook_logs_walletId_idx" ON "circle_webhook_logs"("walletId");
CREATE INDEX IF NOT EXISTS "circle_webhook_logs_transactionId_idx" ON "circle_webhook_logs"("transactionId");

-- circle_cctp_transfers indexes
CREATE INDEX IF NOT EXISTS "circle_cctp_transfers_userId_idx" ON "circle_cctp_transfers"("userId");
CREATE INDEX IF NOT EXISTS "circle_cctp_transfers_sourceWalletId_idx" ON "circle_cctp_transfers"("sourceWalletId");
CREATE INDEX IF NOT EXISTS "circle_cctp_transfers_state_idx" ON "circle_cctp_transfers"("state");
CREATE INDEX IF NOT EXISTS "circle_cctp_transfers_sourceChain_idx" ON "circle_cctp_transfers"("sourceChain");
CREATE INDEX IF NOT EXISTS "circle_cctp_transfers_destinationChain_idx" ON "circle_cctp_transfers"("destinationChain");
CREATE INDEX IF NOT EXISTS "circle_cctp_transfers_burnTransactionHash_idx" ON "circle_cctp_transfers"("burnTransactionHash");
CREATE INDEX IF NOT EXISTS "circle_cctp_transfers_mintTransactionHash_idx" ON "circle_cctp_transfers"("mintTransactionHash");
CREATE INDEX IF NOT EXISTS "circle_cctp_transfers_createdAt_idx" ON "circle_cctp_transfers"("createdAt");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- circle_wallets foreign keys
ALTER TABLE "circle_wallets"
    DROP CONSTRAINT IF EXISTS "circle_wallets_userId_fkey";
ALTER TABLE "circle_wallets"
    ADD CONSTRAINT "circle_wallets_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "circle_wallets"
    DROP CONSTRAINT IF EXISTS "circle_wallets_walletSetId_fkey";
ALTER TABLE "circle_wallets"
    ADD CONSTRAINT "circle_wallets_walletSetId_fkey" 
    FOREIGN KEY ("walletSetId") REFERENCES "circle_wallet_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- circle_transactions foreign keys
ALTER TABLE "circle_transactions"
    DROP CONSTRAINT IF EXISTS "circle_transactions_userId_fkey";
ALTER TABLE "circle_transactions"
    ADD CONSTRAINT "circle_transactions_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "circle_transactions"
    DROP CONSTRAINT IF EXISTS "circle_transactions_walletId_fkey";
ALTER TABLE "circle_transactions"
    ADD CONSTRAINT "circle_transactions_walletId_fkey" 
    FOREIGN KEY ("walletId") REFERENCES "circle_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- circle_cctp_transfers foreign keys
ALTER TABLE "circle_cctp_transfers"
    DROP CONSTRAINT IF EXISTS "circle_cctp_transfers_userId_fkey";
ALTER TABLE "circle_cctp_transfers"
    ADD CONSTRAINT "circle_cctp_transfers_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables were created
SELECT 'circle_wallet_sets' as table_name, COUNT(*) as row_count FROM circle_wallet_sets
UNION ALL
SELECT 'circle_wallets', COUNT(*) FROM circle_wallets
UNION ALL
SELECT 'circle_transactions', COUNT(*) FROM circle_transactions
UNION ALL
SELECT 'circle_webhook_logs', COUNT(*) FROM circle_webhook_logs
UNION ALL
SELECT 'circle_cctp_transfers', COUNT(*) FROM circle_cctp_transfers;

-- Show success message
SELECT 'Circle integration migration completed successfully!' as status;

