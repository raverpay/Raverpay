-- ============================================
-- AUDIT LOG ENHANCEMENT MIGRATION
-- Manual SQL Migration Script
-- Date: January 5, 2026
-- ============================================

-- Step 1: Create new enum types for audit logs
DO $$ BEGIN
    CREATE TYPE "ActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM', 'WEBHOOK', 'API');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PENDING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new columns to audit_logs table
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS "actorType" "ActorType" DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS "severity" "AuditSeverity" DEFAULT 'LOW',
  ADD COLUMN IF NOT EXISTS "status" "AuditStatus" DEFAULT 'SUCCESS',
  ADD COLUMN IF NOT EXISTS "errorMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "executionTime" INTEGER,
  ADD COLUMN IF NOT EXISTS "deviceId" TEXT,
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "oldValue" JSONB,
  ADD COLUMN IF NOT EXISTS "newValue" JSONB;

-- Step 3: Create new indexes for better query performance
CREATE INDEX IF NOT EXISTS "audit_logs_actortype_idx" ON "audit_logs"("actorType");
CREATE INDEX IF NOT EXISTS "audit_logs_severity_idx" ON "audit_logs"("severity");
CREATE INDEX IF NOT EXISTS "audit_logs_status_idx" ON "audit_logs"("status");
CREATE INDEX IF NOT EXISTS "audit_logs_severity_createdat_idx" ON "audit_logs"("severity", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_status_createdat_idx" ON "audit_logs"("status", "createdAt");

-- Step 4: Update existing records with default values (optional, already done by DEFAULT clause)
-- This ensures all existing records have the new fields populated
UPDATE audit_logs
SET 
  "actorType" = COALESCE("actorType", 'USER'::"ActorType"),
  "severity" = COALESCE("severity", 'LOW'::"AuditSeverity"),
  "status" = COALESCE("status", 'SUCCESS'::"AuditStatus")
WHERE "actorType" IS NULL OR "severity" IS NULL OR "status" IS NULL;

-- Step 5: Verify the migration
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
  AND column_name IN ('actorType', 'severity', 'status', 'errorMessage', 'executionTime', 'deviceId', 'location', 'oldValue', 'newValue')
ORDER BY ordinal_position;

-- Step 6: Display index information
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'audit_logs'
  AND (indexname LIKE '%actor%' 
   OR indexname LIKE '%severity%' 
   OR indexname LIKE '%status%')
ORDER BY indexname;

-- Migration completed successfully
-- Remember to run: pnpm prisma generate
