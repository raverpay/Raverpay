-- Manual Migration: Add Expo Push Token Support
-- Date: 2025-01-18
-- Purpose: Add expoPushToken and lastPushTokenUpdate columns to users table

-- Add Expo push token column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "expoPushToken" TEXT,
  ADD COLUMN IF NOT EXISTS "lastPushTokenUpdate" TIMESTAMP(3);

-- Create index on expoPushToken for faster lookups
CREATE INDEX IF NOT EXISTS users_expoPushToken_idx ON users("expoPushToken");

-- Add comment to document the column
COMMENT ON COLUMN users."expoPushToken" IS 'Expo push notification token for sending push notifications';
COMMENT ON COLUMN users."lastPushTokenUpdate" IS 'Last time the push token was updated';
