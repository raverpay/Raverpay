-- Transaction Fee System Migration
-- Date: January 2, 2026
-- Description: Adds service fee tracking and retry queue for transaction fees

-- ====================================
-- 1. Add fee columns to circle_transactions table
-- ====================================

ALTER TABLE circle_transactions
  ADD COLUMN IF NOT EXISTS "serviceFee" TEXT,
  ADD COLUMN IF NOT EXISTS "feeCollected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "totalAmount" TEXT,
  ADD COLUMN IF NOT EXISTS "mainTransferId" TEXT,
  ADD COLUMN IF NOT EXISTS "feeTransferId" TEXT;

-- Add index for fee collection status
CREATE INDEX IF NOT EXISTS "circle_transactions_feeCollected_idx" ON circle_transactions("feeCollected");

-- ====================================
-- 2. Create fee_retry_queue table
-- ====================================

CREATE TABLE IF NOT EXISTS fee_retry_queue (
    id TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "collectionWallet" TEXT NOT NULL,
    fee TEXT NOT NULL,
    "mainTransferId" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fee_retry_queue_pkey PRIMARY KEY (id)
);

-- Add indexes for fee_retry_queue
CREATE INDEX IF NOT EXISTS fee_retry_queue_status_idx ON fee_retry_queue(status);
CREATE INDEX IF NOT EXISTS fee_retry_queue_createdAt_idx ON fee_retry_queue("createdAt");
CREATE INDEX IF NOT EXISTS fee_retry_queue_mainTransferId_idx ON fee_retry_queue("mainTransferId");

-- ====================================
-- Verification queries (commented out)
-- ====================================

-- Check circle_transactions columns:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'circle_transactions'
-- AND column_name IN ('serviceFee', 'feeCollected', 'totalAmount', 'mainTransferId', 'feeTransferId')
-- ORDER BY ordinal_position;

-- Check fee_retry_queue table:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'fee_retry_queue'
-- ORDER BY ordinal_position;

-- Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('circle_transactions', 'fee_retry_queue')
-- AND indexname LIKE '%fee%'
-- ORDER BY tablename, indexname;
