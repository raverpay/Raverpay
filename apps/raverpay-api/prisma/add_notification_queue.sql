-- Manual migration for notification_queue table
-- This creates the QueueStatus enum and notification_queue table

-- Create QueueStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "QueueStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create NotificationChannel enum if it doesn't exist (might already exist from notification_logs)
DO $$ BEGIN
    CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification_queue table
CREATE TABLE IF NOT EXISTS "notification_queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "eventType" TEXT NOT NULL,
    "templateId" TEXT,
    "variables" JSONB,
    "status" "QueueStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "notification_queue_userId_idx" ON "notification_queue"("userId");
CREATE INDEX IF NOT EXISTS "notification_queue_status_idx" ON "notification_queue"("status");
CREATE INDEX IF NOT EXISTS "notification_queue_channel_idx" ON "notification_queue"("channel");
CREATE INDEX IF NOT EXISTS "notification_queue_scheduledFor_idx" ON "notification_queue"("scheduledFor");
CREATE INDEX IF NOT EXISTS "notification_queue_priority_idx" ON "notification_queue"("priority");

-- Add foreign key constraint (only if it doesn't exist)
DO $$ BEGIN
    ALTER TABLE "notification_queue"
        ADD CONSTRAINT "notification_queue_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
