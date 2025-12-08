-- Manual Migration: Device Fingerprinting & Security Features
-- Date: 2025-11-28
-- Description: Adds device management, account locking, and daily transaction limits

-- ============================================
-- 1. Add Security Columns to Users Table
-- ============================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastFailedLoginAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastSuccessfulLoginIp" TEXT;

-- ============================================
-- 2. Update UserStatus Enum (Add LOCKED status)
-- ============================================

-- Check if LOCKED value already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'LOCKED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')
  ) THEN
    ALTER TYPE "UserStatus" ADD VALUE 'LOCKED';
  END IF;
END$$;

-- ============================================
-- 3. Create Devices Table
-- ============================================

CREATE TABLE IF NOT EXISTS devices (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    -- Device Identification
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,

    -- Location & Network
    "ipAddress" TEXT NOT NULL,
    "lastIpAddress" TEXT,
    location TEXT,
    "userAgent" TEXT,

    -- Status
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    "firstLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT devices_pkey PRIMARY KEY (id),
    CONSTRAINT devices_deviceId_key UNIQUE ("deviceId")
);

-- Create indexes for devices table
CREATE INDEX IF NOT EXISTS devices_userId_idx ON devices("userId");
CREATE INDEX IF NOT EXISTS devices_deviceId_idx ON devices("deviceId");
CREATE INDEX IF NOT EXISTS devices_isActive_idx ON devices("isActive");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'devices_userId_fkey'
  ) THEN
    ALTER TABLE devices
      ADD CONSTRAINT devices_userId_fkey
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- ============================================
-- 4. Create Daily Transaction Limits Table
-- ============================================

CREATE TABLE IF NOT EXISTS daily_transaction_limits (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    date TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Spending tracking
    "totalTransferred" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAirtime" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalData" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalBillPayments" DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Transaction counts
    "transferCount" INTEGER NOT NULL DEFAULT 0,
    "withdrawalCount" INTEGER NOT NULL DEFAULT 0,
    "airtimeCount" INTEGER NOT NULL DEFAULT 0,
    "dataCount" INTEGER NOT NULL DEFAULT 0,
    "billPaymentCount" INTEGER NOT NULL DEFAULT 0,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT daily_transaction_limits_pkey PRIMARY KEY (id)
);

-- Create unique constraint for userId + date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_transaction_limits_userId_date_key'
  ) THEN
    ALTER TABLE daily_transaction_limits
      ADD CONSTRAINT daily_transaction_limits_userId_date_key UNIQUE ("userId", date);
  END IF;
END$$;

-- Create indexes for daily_transaction_limits table
CREATE INDEX IF NOT EXISTS daily_transaction_limits_userId_idx ON daily_transaction_limits("userId");
CREATE INDEX IF NOT EXISTS daily_transaction_limits_date_idx ON daily_transaction_limits(date);

-- ============================================
-- Migration Complete
-- ============================================

-- Verify tables were created
SELECT
  'devices' AS table_name,
  COUNT(*) AS row_count
FROM devices
UNION ALL
SELECT
  'daily_transaction_limits' AS table_name,
  COUNT(*) AS row_count
FROM daily_transaction_limits;

-- Show new columns in users table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('failedLoginAttempts', 'lockedUntil', 'lastFailedLoginAt', 'lastSuccessfulLoginIp')
ORDER BY column_name;
