-- Migration: Add DVA Creation Status Tracking
-- Date: 2025-01-14
-- Description: Adds fields to track DVA creation status, retry count, and failure reasons
-- Uses IF NOT EXISTS for idempotency (safe to run multiple times)

-- Add new columns to virtual_accounts table
ALTER TABLE virtual_accounts 
  ADD COLUMN IF NOT EXISTS "creationStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastRetryAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

-- Create index on creationStatus for faster queries
CREATE INDEX IF NOT EXISTS virtual_accounts_creationStatus_idx ON virtual_accounts("creationStatus");

-- Update existing records to have ACTIVE status if they are active
-- Only update records where creationStatus is NULL (idempotent)
UPDATE virtual_accounts 
SET "creationStatus" = CASE 
  WHEN "isActive" = true THEN 'ACTIVE'
  ELSE 'INACTIVE'
END
WHERE "creationStatus" IS NULL;

