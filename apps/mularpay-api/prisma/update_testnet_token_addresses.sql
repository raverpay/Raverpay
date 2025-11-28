-- Update existing crypto balance records to use testnet token addresses
-- Run this migration to fix token addresses for Polygon Amoy testnet

-- Update USDT address to testnet contract
UPDATE crypto_balances
SET 
  "tokenAddress" = '0x420e9c976b04653c64d294b2a380d3e74475c559',
  "lastUpdated" = NOW()
WHERE 
  "tokenSymbol" = 'USDT' 
  AND "tokenAddress" = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

-- Update USDC address to testnet contract
UPDATE crypto_balances
SET 
  "tokenAddress" = '0x420e9c976b04653c64d294b2a380d3e74475c559',
  "lastUpdated" = NOW()
WHERE 
  "tokenSymbol" = 'USDC' 
  AND "tokenAddress" = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

-- Verify the updates
SELECT 
  "tokenSymbol",
  "tokenAddress",
  "balance",
  "lastUpdated"
FROM crypto_balances
WHERE "tokenSymbol" IN ('USDT', 'USDC')
ORDER BY "tokenSymbol";

