#!/bin/bash
# Local Smoke Tests for RaverPay API
# Tests critical endpoints against localhost:3001

set -e  # Exit on error

API_URL="${API_URL:-http://localhost:3001}"
TEST_EMAIL="${SMOKE_TEST_EMAIL:-test.user1@raverpay.com}"
TEST_PASSWORD="${SMOKE_TEST_PASSWORD:-TestPass123!}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Running Local Smoke Tests${NC}"
echo -e "${BLUE}📍 API URL: $API_URL${NC}"
echo ""

# Check if API is running
echo -e "${YELLOW}Checking if API is running...${NC}"
if curl -s -f "$API_URL/api/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API is running${NC}"
else
  echo -e "${RED}❌ API is not running at $API_URL${NC}"
  echo -e "${YELLOW}💡 Start the API with: pnpm dev:api${NC}"
  exit 1
fi
echo ""

# Run the smoke tests script with local API URL
API_URL="$API_URL" SMOKE_TEST_EMAIL="$TEST_EMAIL" SMOKE_TEST_PASSWORD="$TEST_PASSWORD" bash .github/workflows/smoke-tests.sh

