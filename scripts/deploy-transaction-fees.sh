#!/bin/bash

# Transaction Fee System - Deployment Guide
# Run this script to deploy the transaction fee system

set -e

echo "🚀 Transaction Fee System Deployment"
echo "===================================="
echo ""

# Step 1: Database Migration
echo "📊 Step 1: Running database migrations..."
cd apps/raverpay-api
npx prisma migrate dev --name add_transaction_fees_and_retry_queue
npx prisma generate
echo "✅ Database migration complete"
echo ""

# Step 2: Verify Services
echo "🔍 Step 2: Verifying service registration..."
if grep -q "FeeConfigurationService" src/circle/circle.module.ts; then
    echo "✅ FeeConfigurationService registered"
else
    echo "❌ FeeConfigurationService not found in module"
    exit 1
fi

if grep -q "FeeRetryService" src/circle/circle.module.ts; then
    echo "✅ FeeRetryService registered"
else
    echo "❌ FeeRetryService not found in module"
    exit 1
fi
echo ""

# Step 3: Configuration
echo "⚙️  Step 3: Fee configuration setup"
echo ""
echo "IMPORTANT: Configure your fee collection wallets"
echo "You can use the same EVM wallet address for all chains:"
echo ""
echo "Example:"
echo "PUT http://localhost:4000/circle/fees/config"
echo "Authorization: Bearer <ADMIN_TOKEN>"
echo "{"
echo '  "enabled": true,'
echo '  "percentage": 0.5,'
echo '  "minFeeUsdc": 0.0625,'
echo '  "collectionWallets": {'
echo '    "BASE-MAINNET": "0xYourWallet...",'
echo '    "OP-MAINNET": "0xYourWallet...",'
echo '    "ARB-MAINNET": "0xYourWallet...",'
echo '    "MATIC-POLYGON": "0xYourWallet...",'
echo '    "BASE-SEPOLIA": "0xYourWallet...",'
echo '    "OP-SEPOLIA": "0xYourWallet...",'
echo '    "ARB-SEPOLIA": "0xYourWallet...",'
echo '    "MATIC-AMOY": "0xYourWallet..."'
echo "  }"
echo "}"
echo ""

# Step 4: Start services
echo "🏃 Step 4: Starting services..."
echo "Run: npm run dev"
echo ""

# Step 5: Test endpoints
echo "🧪 Step 5: Testing endpoints..."
echo ""
echo "Test fee configuration endpoint:"
echo "curl http://localhost:4000/circle/fees/config \\"
echo '  -H "Authorization: Bearer <TOKEN>"'
echo ""
echo "Calculate fee for 100 USDC:"
echo "curl http://localhost:4000/circle/fees/calculate?amount=100 \\"
echo '  -H "Authorization: Bearer <TOKEN>"'
echo ""

echo "✅ Deployment script complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure collection wallets via API"
echo "2. Test a transfer with fees enabled"
echo "3. Monitor fee retry queue"
echo "4. Set up monitoring alerts"
echo ""
