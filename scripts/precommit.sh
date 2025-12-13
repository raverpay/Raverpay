#!/bin/bash
# Pre-commit checks script
# Runs all checks required before committing code

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Running pre-commit checks...${NC}"
echo ""

# Step 1: Format code
echo -e "${YELLOW}Step 1/5: Formatting code...${NC}"
pnpm format
echo -e "${GREEN}✅ Code formatted${NC}"
echo ""

# Step 2: Check formatting
echo -e "${YELLOW}Step 2/5: Verifying code formatting...${NC}"
if pnpm format:check; then
  echo -e "${GREEN}✅ Formatting check passed${NC}"
else
  echo -e "${RED}❌ Formatting check failed!${NC}"
  echo -e "${RED}Run 'pnpm format' to fix formatting issues${NC}"
  exit 1
fi
echo ""

# Step 3: Lint
echo -e "${YELLOW}Step 3/5: Running linter...${NC}"
if pnpm lint; then
  echo -e "${GREEN}✅ Linting passed${NC}"
else
  echo -e "${RED}❌ Linting failed!${NC}"
  exit 1
fi
echo ""

# Step 4: Type check
echo -e "${YELLOW}Step 4/5: Running TypeScript type check...${NC}"
if pnpm typecheck; then
  echo -e "${GREEN}✅ Type checking passed${NC}"
else
  echo -e "${RED}❌ Type checking failed!${NC}"
  exit 1
fi
echo ""

# Step 5: Run tests
echo -e "${YELLOW}Step 5/5: Running tests...${NC}"
if pnpm test; then
  echo -e "${GREEN}✅ Tests passed${NC}"
else
  echo -e "${RED}❌ Tests failed!${NC}"
  exit 1
fi
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All pre-commit checks passed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

