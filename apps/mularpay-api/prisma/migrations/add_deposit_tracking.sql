-- Migration: Add deposit tracking to daily_transaction_limits
-- Date: 2 December 2024
-- Description: Add totalDeposits and depositCount fields to track daily deposit limits

-- Add totalDeposits column
ALTER TABLE "daily_transaction_limits" 
ADD COLUMN IF NOT EXISTS "totalDeposits" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Add depositCount column
ALTER TABLE "daily_transaction_limits" 
ADD COLUMN IF NOT EXISTS "depositCount" INTEGER NOT NULL DEFAULT 0;

-- Add comment to table
COMMENT ON COLUMN "daily_transaction_limits"."totalDeposits" IS 'Total amount deposited today';
COMMENT ON COLUMN "daily_transaction_limits"."depositCount" IS 'Number of deposits made today';

-- Create index for deposit tracking (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS "daily_transaction_limits_totaldeposits_idx" 
ON "daily_transaction_limits"("totalDeposits");

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'daily_transaction_limits'
  AND column_name IN ('totalDeposits', 'depositCount');
