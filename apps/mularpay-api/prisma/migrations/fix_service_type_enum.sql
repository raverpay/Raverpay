-- Fix migration: Convert serviceType from TEXT to ENUM
-- This fixes the "operator does not exist: text = VTUServiceType" error

-- Step 1: Check if the enum type already exists, if not create it
DO $$ BEGIN
    CREATE TYPE "VTUServiceType" AS ENUM ('AIRTIME', 'DATA', 'CABLE_TV', 'ELECTRICITY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Alter the column to use the enum type
ALTER TABLE saved_recipients
    ALTER COLUMN "serviceType" TYPE "VTUServiceType"
    USING "serviceType"::"VTUServiceType";

-- Verify the change
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'saved_recipients' AND column_name = 'serviceType';
