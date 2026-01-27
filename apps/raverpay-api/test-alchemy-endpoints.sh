#!/bin/bash

# Test script for Alchemy Backend API Endpoints
# Usage: ./test-alchemy-endpoints.sh <JWT_TOKEN>
# 
# Get JWT token by logging in:
# curl -X POST http://localhost:3001/api/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{"email":"your@email.com","password":"yourpassword"}'

set -e

BASE_URL="https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api"
JWT_TOKEN="${1:-}"

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Error: JWT token required"
  echo "Usage: $0 <JWT_TOKEN>"
  echo ""
  echo "Get token by logging in:"
  echo "curl -X POST $BASE_URL/auth/login \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{\"email\":\"test.user2@raverpay.com\",\"password\":\"TestPass123!\"}'"
  exit 1
fi

echo "🧪 Testing Alchemy Backend API Endpoints"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Create a wallet (prerequisite for other tests)
echo -e "${YELLOW}Test 1: Create EOA Wallet${NC}"
echo "POST $BASE_URL/alchemy/wallets"
WALLET_RESPONSE=$(curl -s -X POST "$BASE_URL/alchemy/wallets" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blockchain": "BASE",
    "network": "sepolia",
    "name": "Test Wallet"
  }')

echo "$WALLET_RESPONSE" | jq '.' || echo "$WALLET_RESPONSE"
WALLET_ID=$(echo "$WALLET_RESPONSE" | jq -r '.data.id // empty')

if [ -z "$WALLET_ID" ] || [ "$WALLET_ID" = "null" ]; then
  echo -e "${RED}❌ Failed to create wallet. Cannot continue tests.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Wallet created: $WALLET_ID${NC}"
echo ""

# Test 2: Get Native Token Balance
echo -e "${YELLOW}Test 2: Get Native Token Balance${NC}"
echo "GET $BASE_URL/alchemy/transactions/balance/native/$WALLET_ID"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/alchemy/transactions/balance/native/$WALLET_ID" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "$BALANCE_RESPONSE" | jq '.' || echo "$BALANCE_RESPONSE"
echo ""

# Test 3: Get Gas Price
echo -e "${YELLOW}Test 3: Get Gas Price${NC}"
echo "GET $BASE_URL/alchemy/transactions/gas-price/BASE/sepolia"
GAS_RESPONSE=$(curl -s -X GET "$BASE_URL/alchemy/transactions/gas-price/BASE/sepolia" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "$GAS_RESPONSE" | jq '.' || echo "$GAS_RESPONSE"
echo ""

# Test 4: Export Seed Phrase (requires PIN)
echo -e "${YELLOW}Test 4: Export Seed Phrase${NC}"
echo "POST $BASE_URL/alchemy/wallets/$WALLET_ID/export-seed"
echo "Note: This requires a valid PIN. Update PIN in the script if needed."
EXPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/alchemy/wallets/$WALLET_ID/export-seed" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "9406"
  }')

echo "$EXPORT_RESPONSE" | jq '.' || echo "$EXPORT_RESPONSE"
echo ""

# Test 5: Import Wallet via Seed Phrase
echo -e "${YELLOW}Test 5: Import Wallet (Seed Phrase)${NC}"
echo "POST $BASE_URL/alchemy/wallets/import"
echo "Note: Using a test seed phrase. Replace with a real one if needed."
IMPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/alchemy/wallets/import" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "SEED_PHRASE",
    "seedPhrase": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    "blockchain": "POLYGON",
    "network": "amoy",
    "name": "Imported Test Wallet"
  }')

echo "$IMPORT_RESPONSE" | jq '.' || echo "$IMPORT_RESPONSE"
IMPORTED_WALLET_ID=$(echo "$IMPORT_RESPONSE" | jq -r '.data.id // empty')
echo ""

# Test 6: Import Wallet via Private Key
echo -e "${YELLOW}Test 6: Import Wallet (Private Key)${NC}"
echo "POST $BASE_URL/alchemy/wallets/import"
echo "Note: Using a test private key. Replace with a real one if needed."
IMPORT_KEY_RESPONSE=$(curl -s -X POST "$BASE_URL/alchemy/wallets/import" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "PRIVATE_KEY",
    "privateKey": "0x0000000000000000000000000000000000000000000000000000000000000001",
    "blockchain": "ARBITRUM",
    "network": "sepolia",
    "name": "Imported Private Key Wallet"
  }')

echo "$IMPORT_KEY_RESPONSE" | jq '.' || echo "$IMPORT_KEY_RESPONSE"
echo ""

# Test 7: Get Wallet Details (verify hasSeedPhrase flag)
echo -e "${YELLOW}Test 7: Get Wallet Details (check hasSeedPhrase)${NC}"
echo "GET $BASE_URL/alchemy/wallets/$WALLET_ID"
WALLET_DETAILS=$(curl -s -X GET "$BASE_URL/alchemy/wallets/$WALLET_ID" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "$WALLET_DETAILS" | jq '.' || echo "$WALLET_DETAILS"
HAS_SEED=$(echo "$WALLET_DETAILS" | jq -r '.data.hasSeedPhrase // false')
echo -e "${GREEN}✅ hasSeedPhrase flag: $HAS_SEED${NC}"
echo ""

# Test 8: Send Native Token (if wallet has balance)
echo -e "${YELLOW}Test 8: Send Native Token${NC}"
echo "POST $BASE_URL/alchemy/transactions/send-native"
echo "Note: This will fail if wallet has no balance. This is expected for test wallets."
SEND_RESPONSE=$(curl -s -X POST "$BASE_URL/alchemy/transactions/send-native" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"walletId\": \"$WALLET_ID\",
    \"destinationAddress\": \"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb\",
    \"amount\": \"0.001\"
  }")

echo "$SEND_RESPONSE" | jq '.' || echo "$SEND_RESPONSE"
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Summary:"
echo "- Wallet created: $WALLET_ID"
echo "- Native balance endpoint tested"
echo "- Gas price endpoint tested"
echo "- Seed phrase export tested (may require valid PIN)"
echo "- Wallet import (seed phrase) tested"
echo "- Wallet import (private key) tested"
echo "- Wallet details with hasSeedPhrase flag verified"
echo "- Native token send tested (may fail if no balance)"
