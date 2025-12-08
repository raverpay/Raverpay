-- Add OneSignal push notification token fields to notification_preferences table
-- This allows the backend to send push notifications to users via OneSignal API

-- Add OneSignal fields to notification_preferences table
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS "oneSignalPlayerId" TEXT,
  ADD COLUMN IF NOT EXISTS "oneSignalExternalId" TEXT,
  ADD COLUMN IF NOT EXISTS "lastPushTokenUpdate" TIMESTAMP(3);

-- Add index for faster lookups by OneSignal player ID
CREATE INDEX IF NOT EXISTS "notification_preferences_oneSignalPlayerId_idx"
  ON notification_preferences("oneSignalPlayerId");

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
  AND column_name IN ('oneSignalPlayerId', 'oneSignalExternalId', 'lastPushTokenUpdate')
ORDER BY column_name;
