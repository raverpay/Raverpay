-- Add NotificationType enum type
-- This enum is used to categorize the type of notification (TRANSACTION, KYC, SECURITY, PROMOTIONAL, SYSTEM)

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM (
        'TRANSACTION',
        'KYC',
        'SECURITY',
        'PROMOTIONAL',
        'SYSTEM'
    );
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Enum already exists, do nothing
END $$;
