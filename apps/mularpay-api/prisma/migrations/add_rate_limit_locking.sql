-- Add rate limit locking fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "rateLimitLockCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastRateLimitLockAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "rateLimitLockReason" TEXT;

-- Create index for locked accounts query
CREATE INDEX IF NOT EXISTS "users_lockeduntil_idx" ON users("lockedUntil");
CREATE INDEX IF NOT EXISTS "users_ratelimitlockcount_idx" ON users("rateLimitLockCount");
