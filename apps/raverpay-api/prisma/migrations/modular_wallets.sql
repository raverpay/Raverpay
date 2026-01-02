-- Manual SQL Migration for Circle Modular Wallets
-- Created: 2026-01-02
-- Description: Add tables for Circle Modular Wallets and Passkey Credentials

-- ============================================
-- CREATE circle_modular_wallets TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS circle_modular_wallets (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    circle_wallet_id TEXT NOT NULL,
    address TEXT NOT NULL,
    blockchain TEXT NOT NULL,
    name TEXT,
    state TEXT NOT NULL DEFAULT 'LIVE',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,

    CONSTRAINT circle_modular_wallets_pkey PRIMARY KEY (id),
    CONSTRAINT circle_modular_wallets_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for circle_modular_wallets
CREATE INDEX IF NOT EXISTS circle_modular_wallets_user_id_idx ON circle_modular_wallets(user_id);
CREATE INDEX IF NOT EXISTS circle_modular_wallets_address_idx ON circle_modular_wallets(address);
CREATE UNIQUE INDEX IF NOT EXISTS circle_modular_wallets_circle_wallet_id_key ON circle_modular_wallets(circle_wallet_id);

-- ============================================
-- CREATE passkey_credentials TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS passkey_credentials (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    rp_id TEXT,
    username TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    last_used_at TIMESTAMP(3),

    CONSTRAINT passkey_credentials_pkey PRIMARY KEY (id),
    CONSTRAINT passkey_credentials_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for passkey_credentials
CREATE INDEX IF NOT EXISTS passkey_credentials_user_id_idx ON passkey_credentials(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS passkey_credentials_credential_id_key ON passkey_credentials(credential_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('circle_modular_wallets', 'passkey_credentials') ORDER BY tablename;

-- Check circle_modular_wallets columns
SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'circle_modular_wallets' ORDER BY ordinal_position;

-- Check passkey_credentials columns
SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'passkey_credentials' ORDER BY ordinal_position;
