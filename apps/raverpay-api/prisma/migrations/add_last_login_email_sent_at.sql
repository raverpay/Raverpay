-- Migration: Add lastLoginEmailSentAt field to users table
-- Created: 2025-11-29
-- Description: Adds field to track when last login notification email was sent for rate limiting

-- Add lastLoginEmailSentAt column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "lastLoginEmailSentAt" TIMESTAMP(3);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS "users_lastLoginEmailSentAt_idx" ON users("lastLoginEmailSentAt");

