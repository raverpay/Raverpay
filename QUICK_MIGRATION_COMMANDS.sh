#!/bin/bash
# Quick Migration Commands for Saved Recipients Feature
# Run these commands in order

echo "====== SAVED RECIPIENTS MIGRATION ======"
echo ""
echo "Step 1: Navigate to API directory"
cd /Users/joseph/Desktop/mularpay/apps/mularpay-api

echo ""
echo "Step 2: Get your DIRECT_URL"
echo "Your connection string is:"
grep "DIRECT_URL" .env | sed 's/DIRECT_URL=//'

echo ""
echo "Step 3: Copy the connection string above and run this command:"
echo "psql \"YOUR_CONNECTION_STRING_HERE\" -f prisma/migrations/add_saved_recipients.sql"

echo ""
echo "Step 4: After running the SQL migration, generate Prisma client:"
echo "pnpm prisma generate"

echo ""
echo "Step 5: Verify TypeScript compilation:"
echo "pnpm exec tsc --noEmit"

echo ""
echo "Step 6: Restart your dev server"
echo "pnpm dev"

echo ""
echo "====== MIGRATION COMPLETE ======"
