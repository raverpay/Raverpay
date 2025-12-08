-- Manual Migration: Add Account Deletion Request Feature
-- Created: 2025-11-17
-- Description: Adds AccountDeletionRequest table and updates User model

-- ============================================
-- 1. Update User table with deletion fields
-- ============================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "deletionRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMP(3);

-- ============================================
-- 2. Add PENDING_DELETION to UserStatus enum
-- ============================================
-- Note: PostgreSQL enums need special handling
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'PENDING_DELETION'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')
    ) THEN
        ALTER TYPE "UserStatus" ADD VALUE 'PENDING_DELETION';
    END IF;
END$$;

-- ============================================
-- 3. Create DeletionRequestStatus enum
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeletionRequestStatus') THEN
        CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');
    END IF;
END$$;

-- ============================================
-- 4. Create account_deletion_requests table
-- ============================================
CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    -- Request details
    reason TEXT NOT NULL,
    "customReason" TEXT,

    -- Verification
    "passwordVerified" BOOLEAN NOT NULL DEFAULT true,

    -- Status tracking
    status "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',

    -- Admin review
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,

    -- Timestamps
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id)
);

-- ============================================
-- 5. Create indexes for account_deletion_requests
-- ============================================
CREATE INDEX IF NOT EXISTS "account_deletion_requests_userId_idx" ON account_deletion_requests("userId");
CREATE INDEX IF NOT EXISTS "account_deletion_requests_status_idx" ON account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS "account_deletion_requests_requestedAt_idx" ON account_deletion_requests("requestedAt");

-- ============================================
-- 6. Add foreign key constraint
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'account_deletion_requests_userId_fkey'
    ) THEN
        ALTER TABLE account_deletion_requests
            ADD CONSTRAINT account_deletion_requests_userId_fkey
            FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- ============================================
-- Migration completed successfully
-- ============================================
