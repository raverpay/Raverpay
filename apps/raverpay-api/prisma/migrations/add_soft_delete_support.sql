-- Migration: Add Soft Delete Support for Users
-- Created: 2025-01-XX
-- Description: Adds deletedAt field to users table and DELETED status to UserStatus enum
-- 
-- Usage: psql "$DIRECT_URL" -f add_soft_delete_support.sql
-- 
-- This migration is idempotent - safe to run multiple times

-- ============================================
-- 1. Add DELETED to UserStatus enum
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'DELETED'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')
    ) THEN
        ALTER TYPE "UserStatus" ADD VALUE 'DELETED';
    END IF;
END$$;

-- ============================================
-- 2. Add deletedAt column to users table
-- ============================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- ============================================
-- 3. Create index for deletedAt (for filtering active users)
-- ============================================
CREATE INDEX IF NOT EXISTS "users_deletedAt_idx" ON users("deletedAt");

-- ============================================
-- 4. Create composite index for active users query
-- ============================================
CREATE INDEX IF NOT EXISTS "users_status_deletedAt_idx" ON users(status, "deletedAt") 
WHERE "deletedAt" IS NULL;

-- ============================================
-- Migration completed successfully
-- ============================================
-- 
-- Verification queries:
-- 
-- Check if DELETED status exists:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus') AND enumlabel = 'DELETED';
-- 
-- Check if deletedAt column exists:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deletedAt';
-- 
-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE '%deletedAt%';

