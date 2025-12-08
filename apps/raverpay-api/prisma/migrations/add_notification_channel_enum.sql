-- Add NotificationChannel enum type
-- This enum is used to specify which channels a notification was sent through (EMAIL, SMS, PUSH, IN_APP)

DO $$ BEGIN
    CREATE TYPE "NotificationChannel" AS ENUM (
        'EMAIL',
        'SMS',
        'PUSH',
        'IN_APP'
    );
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Enum already exists, do nothing
END $$;
