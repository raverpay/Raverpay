-- Manual migration for SavedRecipient feature
-- Created: 2025-11-17
-- Purpose: Add saved_recipients table to store frequently used phone numbers for VTU services

-- Create saved_recipients table
CREATE TABLE IF NOT EXISTS saved_recipients (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    provider TEXT NOT NULL,
    recipient TEXT NOT NULL,
    "recipientName" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT saved_recipients_pkey PRIMARY KEY (id)
);

-- Create unique constraint to prevent duplicates (user + service + recipient)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'saved_recipients_userId_serviceType_recipient_key'
    ) THEN
        ALTER TABLE saved_recipients
            ADD CONSTRAINT saved_recipients_userId_serviceType_recipient_key
            UNIQUE ("userId", "serviceType", recipient);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS saved_recipients_userId_idx ON saved_recipients("userId");
CREATE INDEX IF NOT EXISTS saved_recipients_userId_serviceType_idx ON saved_recipients("userId", "serviceType");
CREATE INDEX IF NOT EXISTS saved_recipients_lastUsedAt_idx ON saved_recipients("lastUsedAt");

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'saved_recipients_userId_fkey'
    ) THEN
        ALTER TABLE saved_recipients
            ADD CONSTRAINT saved_recipients_userId_fkey
            FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Verify table was created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_recipients';
