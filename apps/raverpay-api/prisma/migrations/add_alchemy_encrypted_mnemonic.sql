-- ================================
-- Add encryptedMnemonic to AlchemyWallet
-- Date: 2026-01-27
-- Description: Add encrypted mnemonic field for seed phrase backup support
-- ================================

-- Add encryptedMnemonic column to alchemy_wallets table
-- This field is nullable to support existing wallets without mnemonics
ALTER TABLE alchemy_wallets
ADD COLUMN IF NOT EXISTS "encryptedMnemonic" TEXT;

-- Add comment to document the field
COMMENT ON COLUMN alchemy_wallets."encryptedMnemonic" IS 'AES-256-GCM encrypted BIP-39 mnemonic (12 words) - nullable for existing wallets';
