-- Add education services to VTUServiceType enum
-- JAMB Pin Vending, WAEC Registration, WAEC Result Checker

-- Add new values to the VTUServiceType enum
ALTER TYPE "VTUServiceType" ADD VALUE IF NOT EXISTS 'JAMB';
ALTER TYPE "VTUServiceType" ADD VALUE IF NOT EXISTS 'WAEC_REGISTRATION';
ALTER TYPE "VTUServiceType" ADD VALUE IF NOT EXISTS 'WAEC_RESULT';

-- Verify the enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'VTUServiceType')
ORDER BY enumsortorder;
