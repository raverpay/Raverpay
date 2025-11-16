-- Add missing expiresAt column to notifications table
-- This column is used for auto-cleanup of old notifications

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
  AND column_name = 'expiresAt';
