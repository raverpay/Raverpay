-- Manual SQL Migration for Notification System
-- Run these SQL commands in your Supabase SQL editor or psql client
-- This adds the 5 new tables and updates the existing Notification table

-- =====================================================
-- STEP 1: Update existing Notification table
-- =====================================================

-- Add new columns to Notification table
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "eventType" TEXT, -- Optional: For categorizing events like "deposit", "bvn_verified"
  ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'SYSTEM', -- TRANSACTION, SECURITY, KYC, etc.
  ADD COLUMN IF NOT EXISTS "channels" TEXT[] DEFAULT ARRAY['in-app']::TEXT[], -- Channels used: email, sms, push
  ADD COLUMN IF NOT EXISTS "deliveryStatus" JSONB, -- Status per channel: {"email": "sent", "sms": "failed"}
  ADD COLUMN IF NOT EXISTS "templateId" TEXT, -- Reference to template used (Phase 2)
  ADD COLUMN IF NOT EXISTS "variables" JSONB; -- Template variables (Phase 2)

-- Create indexes on Notification table
CREATE INDEX IF NOT EXISTS "Notification_eventType_idx" ON "Notification"("eventType");
CREATE INDEX IF NOT EXISTS "Notification_category_idx" ON "Notification"("category");

-- =====================================================
-- STEP 2: Create NotificationPreference table
-- =====================================================

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    -- Channel preferences
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,

    -- Event type preferences
    "transactionEmails" BOOLEAN NOT NULL DEFAULT true,
    "transactionSms" BOOLEAN NOT NULL DEFAULT true,
    "transactionPush" BOOLEAN NOT NULL DEFAULT true,
    "securityEmails" BOOLEAN NOT NULL DEFAULT true,
    "securitySms" BOOLEAN NOT NULL DEFAULT true,
    "securityPush" BOOLEAN NOT NULL DEFAULT true,
    "kycEmails" BOOLEAN NOT NULL DEFAULT true,
    "kycSms" BOOLEAN NOT NULL DEFAULT true,
    "kycPush" BOOLEAN NOT NULL DEFAULT true,
    "promotionalEmails" BOOLEAN NOT NULL DEFAULT false,
    "promotionalSms" BOOLEAN NOT NULL DEFAULT false,
    "promotionalPush" BOOLEAN NOT NULL DEFAULT false,

    -- Frequency controls
    "emailFrequency" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "smsFrequency" TEXT NOT NULL DEFAULT 'IMMEDIATE',

    -- Quiet hours
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'Africa/Lagos',

    -- Opt-outs
    "optOutCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- Create unique index and foreign key
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- STEP 3: Create NotificationLog table
-- =====================================================

CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    -- Delivery tracking
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),

    -- Analytics
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "clickUrl" TEXT,

    -- Provider info
    "provider" TEXT,
    "providerMessageId" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes and foreign keys
CREATE INDEX IF NOT EXISTS "NotificationLog_notificationId_idx" ON "NotificationLog"("notificationId");
CREATE INDEX IF NOT EXISTS "NotificationLog_userId_idx" ON "NotificationLog"("userId");
CREATE INDEX IF NOT EXISTS "NotificationLog_channel_idx" ON "NotificationLog"("channel");
CREATE INDEX IF NOT EXISTS "NotificationLog_status_idx" ON "NotificationLog"("status");

ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- STEP 4: Create NotificationTemplate table
-- =====================================================

CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationTemplate_name_key" ON "NotificationTemplate"("name");

-- =====================================================
-- STEP 5: Create NotificationQueue table
-- =====================================================

CREATE TABLE IF NOT EXISTS "NotificationQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "templateId" TEXT,
    "variables" JSONB,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationQueue_pkey" PRIMARY KEY ("id")
);

-- Create indexes and foreign keys
CREATE INDEX IF NOT EXISTS "NotificationQueue_userId_idx" ON "NotificationQueue"("userId");
CREATE INDEX IF NOT EXISTS "NotificationQueue_status_idx" ON "NotificationQueue"("status");
CREATE INDEX IF NOT EXISTS "NotificationQueue_scheduledFor_idx" ON "NotificationQueue"("scheduledFor");

ALTER TABLE "NotificationQueue"
  ADD CONSTRAINT "NotificationQueue_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- STEP 6: Add Notification relation to User table
-- =====================================================

-- This should already exist, but just in case:
-- ALTER TABLE "Notification"
--   ADD CONSTRAINT "Notification_userId_fkey"
--   FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify the changes were applied:

-- Check new columns in Notification table
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'Notification'
-- AND column_name IN ('eventType', 'category', 'channels', 'deliveryStatus', 'templateId', 'variables');

-- Check new tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('NotificationPreference', 'NotificationLog', 'NotificationTemplate', 'NotificationQueue');

-- =====================================================
-- NOTES
-- =====================================================
-- 1. All changes use IF NOT EXISTS to be idempotent
-- 2. All foreign keys have ON DELETE CASCADE for cleanup
-- 3. Default values match the Prisma schema
-- 4. Indexes are created for performance
-- 5. Run these in order - don't skip steps
