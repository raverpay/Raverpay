-- ============================================
-- WITHDRAWAL CONFIGURATION MIGRATION
-- ============================================
-- This migration adds withdrawal configuration support
-- Allows admins to configure withdrawal fees and limits from dashboard

-- Create withdrawal fee type enum
DO $$ BEGIN
    CREATE TYPE "WithdrawalFeeType" AS ENUM ('FLAT', 'PERCENTAGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create withdrawal_config table
CREATE TABLE IF NOT EXISTS withdrawal_config (
    id TEXT NOT NULL,
    "feeType" "WithdrawalFeeType" NOT NULL DEFAULT 'PERCENTAGE',
    "feeValue" DECIMAL(15,2) NOT NULL,
    "minFee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "maxFee" DECIMAL(15,2),
    "tierLevel" "KYCTier",
    "minWithdrawal" DECIMAL(15,2) NOT NULL DEFAULT 100,
    "maxWithdrawal" DECIMAL(15,2) NOT NULL DEFAULT 50000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT withdrawal_config_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_config_tierLevel_key ON withdrawal_config("tierLevel");
CREATE INDEX IF NOT EXISTS withdrawal_config_isActive_idx ON withdrawal_config("isActive");

-- Insert default global configuration (no tier specified - applies to all)
INSERT INTO withdrawal_config (
    id,
    "feeType",
    "feeValue",
    "minFee",
    "maxFee",
    "tierLevel",
    "minWithdrawal",
    "maxWithdrawal",
    "isActive",
    description,
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'PERCENTAGE',
    1.5, -- 1.5% fee
    50, -- Minimum ₦50 fee
    500, -- Maximum ₦500 fee
    NULL, -- Global config (applies to all tiers if no tier-specific config exists)
    100, -- Minimum withdrawal ₦100
    50000, -- Maximum withdrawal ₦50,000 (can be overridden by KYC tier limits)
    true,
    'Default withdrawal configuration with 1.5% fee (min ₦50, max ₦500)',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Withdrawal configuration table created successfully';
    RAISE NOTICE 'Default config: 1.5%% fee with min ₦50, max ₦500';
    RAISE NOTICE 'Withdrawal limits: ₦100 - ₦50,000';
END $$;
