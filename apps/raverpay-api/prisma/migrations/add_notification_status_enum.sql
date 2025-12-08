-- Add NotificationStatus enum type
-- This enum is used to track the delivery status of notifications (PENDING, SENT, DELIVERED, FAILED, BOUNCED)

DO $$ BEGIN
    CREATE TYPE "NotificationStatus" AS ENUM (
        'PENDING',
        'SENT',
        'DELIVERED',
        'FAILED',
        'BOUNCED'
    );
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Enum already exists, do nothing
END $$;
