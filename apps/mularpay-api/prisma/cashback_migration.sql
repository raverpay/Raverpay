-- ============================================
-- CASHBACK SYSTEM MIGRATION
-- ============================================
-- This migration adds cashback functionality to the MularPay platform

-- Step 1: Add cashback fields to existing vtu_orders table
ALTER TABLE vtu_orders
  ADD COLUMN IF NOT EXISTS "cashbackEarned" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cashbackRedeemed" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cashbackPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Step 2: Add cashback field to existing transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS "cashbackRedeemed" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Step 3: Create cashback_config table
CREATE TABLE IF NOT EXISTS cashback_config (
    id TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    provider TEXT,
    "minAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "maxCashback" DECIMAL(15,2),
    description TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT cashback_config_pkey PRIMARY KEY (id)
);

-- Step 4: Create unique constraint on cashback_config
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cashback_config_serviceType_provider_key'
    ) THEN
        ALTER TABLE cashback_config
        ADD CONSTRAINT cashback_config_serviceType_provider_key
        UNIQUE ("serviceType", provider);
    END IF;
END$$;

-- Step 5: Create indexes on cashback_config
CREATE INDEX IF NOT EXISTS cashback_config_serviceType_idx ON cashback_config("serviceType");
CREATE INDEX IF NOT EXISTS cashback_config_isActive_idx ON cashback_config("isActive");

-- Step 6: Create cashback_wallets table
CREATE TABLE IF NOT EXISTS cashback_wallets (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalEarned" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "availableBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalRedeemed" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT cashback_wallets_pkey PRIMARY KEY (id)
);

-- Step 7: Create unique constraint on cashback_wallets userId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cashback_wallets_userId_key'
    ) THEN
        ALTER TABLE cashback_wallets
        ADD CONSTRAINT cashback_wallets_userId_key
        UNIQUE ("userId");
    END IF;
END$$;

-- Step 8: Create index on cashback_wallets
CREATE INDEX IF NOT EXISTS cashback_wallets_userId_idx ON cashback_wallets("userId");

-- Step 9: Add foreign key constraint for cashback_wallets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cashback_wallets_userId_fkey'
    ) THEN
        ALTER TABLE cashback_wallets
        ADD CONSTRAINT cashback_wallets_userId_fkey
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- Step 10: Create CashbackTransactionType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CashbackTransactionType') THEN
        CREATE TYPE "CashbackTransactionType" AS ENUM ('EARNED', 'REDEEMED', 'EXPIRED', 'REVERSED');
    END IF;
END$$;

-- Step 11: Create cashback_transactions table
CREATE TABLE IF NOT EXISTS cashback_transactions (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    type "CashbackTransactionType" NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    "balanceBefore" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "sourceReference" TEXT,
    description TEXT NOT NULL,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT cashback_transactions_pkey PRIMARY KEY (id)
);

-- Step 12: Create indexes on cashback_transactions
CREATE INDEX IF NOT EXISTS cashback_transactions_userId_idx ON cashback_transactions("userId");
CREATE INDEX IF NOT EXISTS cashback_transactions_sourceReference_idx ON cashback_transactions("sourceReference");
CREATE INDEX IF NOT EXISTS cashback_transactions_type_idx ON cashback_transactions(type);
CREATE INDEX IF NOT EXISTS cashback_transactions_createdAt_idx ON cashback_transactions("createdAt");
CREATE INDEX IF NOT EXISTS cashback_transactions_userId_createdAt_idx ON cashback_transactions("userId", "createdAt");

-- Step 13: Add foreign key constraint for cashback_transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cashback_transactions_userId_fkey'
    ) THEN
        ALTER TABLE cashback_transactions
        ADD CONSTRAINT cashback_transactions_userId_fkey
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- Step 14: Insert default cashback configurations
-- MTN Data: 2%
INSERT INTO cashback_config (id, "serviceType", percentage, "isActive", provider, "minAmount", "maxCashback", description, "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'DATA',
    2.00,
    true,
    'MTN',
    100,
    50,
    'MTN Data Cashback - 2%',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- GLO Data: 2.5%
INSERT INTO cashback_config (id, "serviceType", percentage, "isActive", provider, "minAmount", "maxCashback", description, "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'DATA',
    2.50,
    true,
    'GLO',
    100,
    50,
    'GLO Data Cashback - 2.5%',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- AIRTEL Data: 2%
INSERT INTO cashback_config (id, "serviceType", percentage, "isActive", provider, "minAmount", "maxCashback", description, "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'DATA',
    2.00,
    true,
    'AIRTEL',
    100,
    50,
    'Airtel Data Cashback - 2%',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 9MOBILE Data: 2%
INSERT INTO cashback_config (id, "serviceType", percentage, "isActive", provider, "minAmount", "maxCashback", description, "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'DATA',
    2.00,
    true,
    '9MOBILE',
    100,
    50,
    '9mobile Data Cashback - 2%',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Airtime for all networks: 1%
INSERT INTO cashback_config (id, "serviceType", percentage, "isActive", provider, "minAmount", "maxCashback", description, "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'AIRTIME',
    1.00,
    true,
    NULL,
    50,
    20,
    'Airtime Cashback - 1% for all networks',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Cable TV: 1.5%
INSERT INTO cashback_config (id, "serviceType", percentage, "isActive", provider, "minAmount", "maxCashback", description, "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'CABLE_TV',
    1.50,
    true,
    NULL,
    1000,
    100,
    'Cable TV Cashback - 1.5%',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Electricity: 0.5%
INSERT INTO cashback_config (id, "serviceType", percentage, "isActive", provider, "minAmount", "maxCashback", description, "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'ELECTRICITY',
    0.50,
    true,
    NULL,
    500,
    50,
    'Electricity Cashback - 0.5%',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Migration complete
-- Run: SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'cashback%' ORDER BY tablename;
-- to verify tables were created
