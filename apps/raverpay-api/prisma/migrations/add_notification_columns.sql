-- Add new columns to existing notifications table
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS "eventType" TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS channels TEXT[] DEFAULT ARRAY['in-app']::TEXT[],
  ADD COLUMN IF NOT EXISTS "deliveryStatus" JSONB,
  ADD COLUMN IF NOT EXISTS "templateId" TEXT,
  ADD COLUMN IF NOT EXISTS variables JSONB;

-- Create indexes
CREATE INDEX IF NOT EXISTS notifications_eventtype_idx ON notifications("eventType");
CREATE INDEX IF NOT EXISTS notifications_category_idx ON notifications(category);

-- Add foreign key constraints to new tables
ALTER TABLE "NotificationPreference" DROP CONSTRAINT IF EXISTS "NotificationPreference_userId_fkey";
ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationLog" DROP CONSTRAINT IF EXISTS "NotificationLog_notificationId_fkey";
ALTER TABLE "NotificationLog" DROP CONSTRAINT IF EXISTS "NotificationLog_userId_fkey";
ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES notifications(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationQueue" DROP CONSTRAINT IF EXISTS "NotificationQueue_userId_fkey";
ALTER TABLE "NotificationQueue"
  ADD CONSTRAINT "NotificationQueue_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
