-- Add NotificationCategory enum type
-- This enum is used to categorize notifications (TRANSACTION, SECURITY, KYC, etc.)

DO $$ BEGIN
    CREATE TYPE "NotificationCategory" AS ENUM (
        'TRANSACTION',
        'SECURITY',
        'KYC',
        'PROMOTIONAL',
        'SYSTEM',
        'ACCOUNT'
    );
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Enum already exists, do nothing
END $$;
