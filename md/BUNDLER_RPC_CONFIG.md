# Bundler RPC Configuration

Add these to your `apps/raverpay-api/.env` file:

```bash
# Pimlico Bundler RPCs (Testnets)
BUNDLER_RPC_URL_ETH_SEPOLIA=https://api.pimlico.io/v2/11155111/rpc?apikey=pim_LtThuLyku4ievcn9adrrcs
BUNDLER_RPC_URL_ARB_SEPOLIA=https://api.pimlico.io/v2/421614/rpc?apikey=pim_LtThuLyku4ievcn9adrrcs
BUNDLER_RPC_URL_BASE_SEPOLIA=https://api.pimlico.io/v2/84532/rpc?apikey=pim_LtThuLyku4ievcn9adrrcs
BUNDLER_RPC_URL_OP_SEPOLIA=https://api.pimlico.io/v2/11155420/rpc?apikey=pim_LtThuLyku4ievcn9adrrcs
BUNDLER_RPC_URL_MATIC_AMOY=https://api.pimlico.io/v2/80002/rpc?apikey=pim_LtThuLyku4ievcn9adrrcs

# Optional: Gas limit overrides (use defaults if not set)
PAYMASTER_MAX_GAS_LIMIT=1000000
PAYMASTER_VERIFICATION_GAS_LIMIT=200000
PAYMASTER_POSTOP_GAS_LIMIT=15000
```

## Chain ID Reference:

- **Ethereum Sepolia**: 11155111
- **Arbitrum Sepolia**: 421614
- **Base Sepolia**: 84532
- **Optimism Sepolia**: 11155420
- **Polygon Amoy**: 80002

## Next Steps:

1. Add these lines to your `.env` file
2. Restart your API server
3. We'll run the E2E test!
