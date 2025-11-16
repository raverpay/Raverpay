-- Add missing columns to notification_preferences table

-- First, create the NotificationFrequency enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "NotificationFrequency" AS ENUM ('IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add frequency columns
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS "emailFrequency" "NotificationFrequency" DEFAULT 'IMMEDIATE',
  ADD COLUMN IF NOT EXISTS "smsFrequency" "NotificationFrequency" DEFAULT 'IMMEDIATE',
  ADD COLUMN IF NOT EXISTS "pushFrequency" "NotificationFrequency" DEFAULT 'IMMEDIATE';

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
  AND column_name IN ('emailFrequency', 'smsFrequency', 'pushFrequency')
ORDER BY column_name;
