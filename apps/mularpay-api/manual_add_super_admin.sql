-- Manual migration: Add SUPER_ADMIN role to UserRole enum
-- This is a workaround for when prisma migrate cannot connect to database

-- Add SUPER_ADMIN to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- Verify the enum values
-- Uncomment to check:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'UserRole'::regtype ORDER BY enumsortorder;
