-- Manual Migration: Add BlockchainConfig table
-- Created: 2025-01-10
-- Purpose: Store per-blockchain configuration for admin management

-- Create blockchain_configs table
CREATE TABLE IF NOT EXISTS blockchain_configs (
    id TEXT NOT NULL,
    blockchain TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isTestnet" BOOLEAN NOT NULL DEFAULT false,
    "feeLabel" TEXT,
    "estimatedCost" TEXT,
    description TEXT,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isCCTPSupported" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT blockchain_configs_pkey PRIMARY KEY (id)
);

-- Create unique index on blockchain
CREATE UNIQUE INDEX IF NOT EXISTS blockchain_configs_blockchain_key ON blockchain_configs(blockchain);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS blockchain_configs_isEnabled_idx ON blockchain_configs("isEnabled");
CREATE INDEX IF NOT EXISTS blockchain_configs_isTestnet_idx ON blockchain_configs("isTestnet");
CREATE INDEX IF NOT EXISTS blockchain_configs_displayOrder_idx ON blockchain_configs("displayOrder");

-- Verify table was created
SELECT tablename FROM pg_tables WHERE tablename = 'blockchain_configs';
