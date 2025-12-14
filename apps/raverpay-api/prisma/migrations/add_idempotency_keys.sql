-- Migration: Add IdempotencyKey table
-- Description: Adds idempotency key support to prevent duplicate API requests
-- Created: 2025-12-14

-- Create idempotency_keys table
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" VARCHAR(255) NOT NULL UNIQUE,
  "userId" UUID,
  "endpoint" VARCHAR(500) NOT NULL,
  "method" VARCHAR(10) NOT NULL,
  "requestHash" VARCHAR(255) NOT NULL,
  "response" JSONB,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idempotency_keys_key_idx" ON "idempotency_keys"("key");
CREATE INDEX IF NOT EXISTS "idempotency_keys_userId_idx" ON "idempotency_keys"("userId");
CREATE INDEX IF NOT EXISTS "idempotency_keys_status_idx" ON "idempotency_keys"("status");
CREATE INDEX IF NOT EXISTS "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- Add foreign key constraint to users table (optional, for referential integrity)
-- Note: This assumes the users table exists. Adjust if needed.
-- ALTER TABLE "idempotency_keys" 
--   ADD CONSTRAINT "idempotency_keys_userId_fkey" 
--   FOREIGN KEY ("userId") REFERENCES "users"("id") 
--   ON DELETE SET NULL ON UPDATE CASCADE;

-- Add comment to table
COMMENT ON TABLE "idempotency_keys" IS 'Stores idempotency keys to prevent duplicate API requests';

-- Add comments to columns
COMMENT ON COLUMN "idempotency_keys"."key" IS 'Unique idempotency key provided by client';
COMMENT ON COLUMN "idempotency_keys"."userId" IS 'User ID associated with the request (if authenticated)';
COMMENT ON COLUMN "idempotency_keys"."endpoint" IS 'API endpoint path';
COMMENT ON COLUMN "idempotency_keys"."method" IS 'HTTP method (GET, POST, etc.)';
COMMENT ON COLUMN "idempotency_keys"."requestHash" IS 'Hash of request body to detect duplicate requests';
COMMENT ON COLUMN "idempotency_keys"."response" IS 'Cached response for completed requests';
COMMENT ON COLUMN "idempotency_keys"."status" IS 'Status: PENDING, COMPLETED, or FAILED';
COMMENT ON COLUMN "idempotency_keys"."expiresAt" IS 'When the idempotency key expires (typically 24 hours)';

