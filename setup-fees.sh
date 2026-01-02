#!/bin/bash

# Transaction Fee System - Automated Setup Script
# This script creates superadmin, creates fee collection wallet, and configures fees

set -e  # Exit on error

echo "🚀 Starting Transaction Fee System Setup..."
echo ""

# Check if server is running
if ! curl -s http://localhost:3001/api > /dev/null 2>&1; then
    echo "❌ Error: Backend server is not running on port 3001"
    echo "Please start the server first: cd apps/raverpay-api && pnpm dev"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq is not installed. Responses won't be pretty-printed."
    echo "Install with: brew install jq"
    echo ""
    USE_JQ=false
else
    USE_JQ=true
fi

# Step 1: Create superadmin
echo "📝 Step 1: Creating collectionwallet account..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "collectionwallet@raverpay.com",
    "password": "joseph6thbornR$",
    "firstName": "collectionwallet",
    "lastName": "raverpay",
    "phone": "09018142408"
  }')

if [ "$USE_JQ" = true ]; then
    TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
else
    TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to create collectionwallet. Response:"
    echo $RESPONSE
    echo ""
    echo "💡 User might already exist. Try logging in instead:"
    echo 'curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '"'"'{"identifier": "collectionwallet@raverpay.com", "password": "joseph6thbornR$"}'"'"
    exit 1
fi

echo "✅ Superadmin created successfully!"
echo "   Token: ${TOKEN:0:30}..."
echo ""

# Step 2: Create developer wallet for fee collection
echo "💰 Step 2: Creating fee collection wallet on Base Sepolia..."
WALLET_RESPONSE=$(curl -s -X POST http://localhost:3001/api/circle/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blockchain": "BASE-SEPOLIA",
    "accountType": "SCA",
    "name": "Fee Collection Wallet"
  }')

if [ "$USE_JQ" = true ]; then
    WALLET_ADDRESS=$(echo $WALLET_RESPONSE | jq -r '.data.address')
    WALLET_ID=$(echo $WALLET_RESPONSE | jq -r '.data.walletId')
else
    WALLET_ADDRESS=$(echo $WALLET_RESPONSE | grep -o '"address":"[^"]*"' | cut -d'"' -f4)
    WALLET_ID=$(echo $WALLET_RESPONSE | grep -o '"walletId":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$WALLET_ADDRESS" ] || [ "$WALLET_ADDRESS" = "null" ]; then
    echo "❌ Failed to create wallet. Response:"
    echo $WALLET_RESPONSE
    exit 1
fi

echo "✅ Wallet created successfully!"
echo "   Address: $WALLET_ADDRESS"
echo "   Wallet ID: $WALLET_ID"
echo ""

# Step 3: Configure all chains to use this wallet
echo "⚙️  Step 3: Configuring fee collection for all chains..."
CONFIG_RESPONSE=$(curl -s -X PUT http://localhost:3001/api/circle/fees/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"enabled\": true,
    \"percentage\": 0.5,
    \"minFeeUsdc\": 0.0625,
    \"collectionWallets\": {
      \"BASE-SEPOLIA\": \"$WALLET_ADDRESS\",
      \"OP-SEPOLIA\": \"$WALLET_ADDRESS\",
      \"ARB-SEPOLIA\": \"$WALLET_ADDRESS\",
      \"MATIC-AMOY\": \"$WALLET_ADDRESS\",
      \"BASE-MAINNET\": \"$WALLET_ADDRESS\",
      \"OP-MAINNET\": \"$WALLET_ADDRESS\",
      \"ARB-MAINNET\": \"$WALLET_ADDRESS\",
      \"MATIC-POLYGON\": \"$WALLET_ADDRESS\"
    }
  }")

if [ "$USE_JQ" = true ]; then
    SUCCESS=$(echo $CONFIG_RESPONSE | jq -r '.success')
else
    SUCCESS=$(echo $CONFIG_RESPONSE | grep -o '"success":[^,]*' | cut -d':' -f2)
fi

if [ "$SUCCESS" != "true" ]; then
    echo "❌ Failed to configure fees. Response:"
    echo $CONFIG_RESPONSE
    exit 1
fi

echo "✅ Fee configuration updated successfully!"
echo ""

# Step 4: Verify configuration
echo "🔍 Step 4: Verifying configuration..."
VERIFY_RESPONSE=$(curl -s http://localhost:3001/api/circle/fees/config \
  -H "Authorization: Bearer $TOKEN")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Summary:"
echo "   • Fee percentage: 0.5%"
echo "   • Minimum fee: 0.0625 USDC (~₦100)"
echo "   • Fee status: Enabled"
echo "   • Collection wallet: $WALLET_ADDRESS"
echo "   • Wallet ID: $WALLET_ID"
echo ""
echo "🔑 Admin Token (save this!):"
echo "   $TOKEN"
echo ""
echo "📊 Fee Configuration:"
if [ "$USE_JQ" = true ]; then
    echo $VERIFY_RESPONSE | jq .
else
    echo $VERIFY_RESPONSE
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo "   1. Fund a test wallet with USDC"
echo "   2. Send a transfer to test fee collection"
echo "   3. Check fee stats: curl http://localhost:3001/api/circle/fees/stats -H \"Authorization: Bearer $TOKEN\""
echo "   4. View transaction details in mobile app"
echo ""
echo "📚 Documentation:"
echo "   • Full testing guide: md/Fri2ndJan/START_TESTING.md"
echo "   • Quick reference: md/Fri2ndJan/SETUP_COMMANDS.md"
echo ""
echo "Happy testing! 🚀"
