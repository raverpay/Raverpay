-- Migration: Add profile edit tracking fields
-- Description: Add profileEditedOnce and profileEditedAt fields to users table
-- This enforces one-time profile editing for KYC compliance

-- Add profile edit tracking fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "profileEditedOnce" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "profileEditedAt" TIMESTAMP(3);

-- Create index for quick lookups of edited profiles
CREATE INDEX IF NOT EXISTS "users_profileEditedOnce_idx" ON users("profileEditedOnce");

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Profile edit tracking fields added successfully';
END $$;
