#!/bin/bash
# Smoke Tests for RaverPay API
# Tests critical endpoints after deployment to ensure everything works

set -e  # Exit on error

API_URL="${API_URL:-https://api.raverpay.com}"
TEST_EMAIL="${SMOKE_TEST_EMAIL:-codeswithjoseph@gmail.com}"
TEST_PASSWORD="${SMOKE_TEST_PASSWORD:-6thbornR%}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Helper function to print test results
print_test() {
  local test_name=$1
  local status=$2
  local message=$3
  
  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
    if [ -n "$message" ]; then
      echo "   $message"
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    if [ -n "$message" ]; then
      echo "   $message"
    fi
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name")
  fi
}

# Helper function to make API calls
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local token=$4
  
  local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
  
  if [ -n "$token" ]; then
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
  fi
  
  if [ -n "$data" ]; then
    curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
  fi
  
  curl_cmd="$curl_cmd '$API_URL$endpoint'"
  
  eval "$curl_cmd"
}

echo "🧪 Starting Smoke Tests for RaverPay API"
echo "📍 API URL: $API_URL"
echo ""

# ============================================
# Test 1: Health Check (with response validation)
# ============================================
echo "Test 1: Health Check Endpoint"
response=$(api_call "GET" "/api/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  # Validate response body contains expected fields
  if echo "$body" | grep -q '"status"' && echo "$body" | grep -q '"database"'; then
    status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    database=$(echo "$body" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$status" = "ok" ] && [ "$database" = "connected" ]; then
      print_test "Health Check" "PASS" "Status: $status, Database: $database"
    else
      print_test "Health Check" "FAIL" "Unexpected status: $status or database: $database"
    fi
  else
    print_test "Health Check" "FAIL" "Response missing required fields"
  fi
else
  print_test "Health Check" "FAIL" "HTTP $http_code"
fi
echo ""

# ============================================
# Test 2: Root Endpoint
# ============================================
echo "Test 2: Root Endpoint"
response=$(api_call "GET" "/api")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
  print_test "Root Endpoint" "PASS" "HTTP $http_code"
else
  print_test "Root Endpoint" "FAIL" "HTTP $http_code"
fi
echo ""

# ============================================
# Test 3: Authentication - Login
# ============================================
echo "Test 3: Authentication - Login"
if [ -z "$TEST_EMAIL" ] || [ -z "$TEST_PASSWORD" ]; then
  print_test "Authentication - Login" "FAIL" "Test credentials not provided (SMOKE_TEST_EMAIL, SMOKE_TEST_PASSWORD)"
  ACCESS_TOKEN=""
else
  login_data="{\"identifier\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
  response=$(api_call "POST" "/api/auth/login" "$login_data")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    # Extract access token
    ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$ACCESS_TOKEN" ]; then
      print_test "Authentication - Login" "PASS" "Token obtained successfully"
    else
      print_test "Authentication - Login" "FAIL" "Token not found in response"
      ACCESS_TOKEN=""
    fi
  else
    print_test "Authentication - Login" "FAIL" "HTTP $http_code - $(echo "$body" | head -c 100)"
    ACCESS_TOKEN=""
  fi
fi
echo ""

# ============================================
# Test 4: Authenticated Endpoint - Get Current User
# ============================================
echo "Test 4: Authenticated Endpoint - /auth/me"
if [ -z "$ACCESS_TOKEN" ]; then
  print_test "Get Current User" "SKIP" "Skipped (no access token)"
else
  response=$(api_call "GET" "/api/auth/me" "" "$ACCESS_TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    if echo "$body" | grep -q '"user"'; then
      user_email=$(echo "$body" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
      print_test "Get Current User" "PASS" "User: $user_email"
    else
      print_test "Get Current User" "FAIL" "User object not found"
    fi
  else
    print_test "Get Current User" "FAIL" "HTTP $http_code"
  fi
fi
echo ""

# ============================================
# Test 5: Wallet Balance
# ============================================
echo "Test 5: Wallet Balance"
if [ -z "$ACCESS_TOKEN" ]; then
  print_test "Wallet Balance" "SKIP" "Skipped (no access token)"
else
  response=$(api_call "GET" "/api/wallet" "" "$ACCESS_TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    if echo "$body" | grep -q '"balance"'; then
      balance=$(echo "$body" | grep -o '"balance":"[^"]*"' | cut -d'"' -f4 || echo "$body" | grep -o '"balance":[0-9.]*' | cut -d':' -f2)
      print_test "Wallet Balance" "PASS" "Balance retrieved: $balance"
    else
      print_test "Wallet Balance" "FAIL" "Balance field not found"
    fi
  else
    print_test "Wallet Balance" "FAIL" "HTTP $http_code"
  fi
fi
echo ""

# ============================================
# Test 6: Wallet Limits
# ============================================
echo "Test 6: Wallet Limits"
if [ -z "$ACCESS_TOKEN" ]; then
  print_test "Wallet Limits" "SKIP" "Skipped (no access token)"
else
  response=$(api_call "GET" "/api/wallet/limits" "" "$ACCESS_TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    if echo "$body" | grep -q '"dailyLimit"'; then
      print_test "Wallet Limits" "PASS" "Limits retrieved successfully"
    else
      print_test "Wallet Limits" "FAIL" "Limits not found in response"
    fi
  else
    print_test "Wallet Limits" "FAIL" "HTTP $http_code"
  fi
fi
echo ""

# ============================================
# Test 7: VTU Airtime Providers (Public Catalog)
# ============================================
echo "Test 7: VTU Airtime Providers"
response=$(api_call "GET" "/api/vtu/airtime/providers" "" "$ACCESS_TOKEN")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  if echo "$body" | grep -q '"providers"' || echo "$body" | grep -q 'MTN' || echo "$body" | grep -q 'GLO'; then
    print_test "VTU Airtime Providers" "PASS" "Providers retrieved"
  else
    print_test "VTU Airtime Providers" "FAIL" "Providers not found in response"
  fi
else
  print_test "VTU Airtime Providers" "FAIL" "HTTP $http_code"
fi
echo ""

# ============================================
# Summary
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Smoke Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
  echo ""
  echo "Failed tests:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
  echo -e "${RED}❌ Smoke tests failed!${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}✅ All smoke tests passed!${NC}"
  exit 0
fi

