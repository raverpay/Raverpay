#!/bin/bash

# Saved Recipients Migration Script
# This script applies the database migration for the saved recipients feature

echo "🚀 Starting Saved Recipients Migration..."
echo ""

# Database connection string
DB_URL="postgresql://postgres.oeanyukxcphqjrsljhqq:mularpay2025@aws-1-eu-north-1.pooler.supabase.com:5432/postgres?connect_timeout=10"

echo "📊 Applying database migration..."
psql "$DB_URL" -f prisma/migrations/add_saved_recipients.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 Verifying table creation..."
    psql "$DB_URL" -c "SELECT tablename FROM pg_tables WHERE tablename = 'saved_recipients';"

    echo ""
    echo "🔧 Generating Prisma Client..."
    pnpm prisma generate

    echo ""
    echo "✅ All done! Now restart your dev server:"
    echo "   pnpm dev"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi
