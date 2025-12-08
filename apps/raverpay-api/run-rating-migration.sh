#!/bin/bash

# App Rating Configuration Migration Script
# This script applies the database migration for the app rating feature

echo "🌟 Starting App Rating Configuration Migration..."
echo ""

# Database connection string (update with your actual connection string)
DB_URL="${DATABASE_URL:-postgresql://postgres.oeanyukxcphqjrsljhqq:mularpay2025@aws-1-eu-north-1.pooler.supabase.com:5432/postgres?connect_timeout=10}"

echo "📊 Applying database migration..."
psql "$DB_URL" -f prisma/migrations/add_app_rating_config.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 Verifying table creation..."
    psql "$DB_URL" -c "SELECT * FROM app_rating_config;"

    echo ""
    echo "🔧 Generating Prisma Client..."
    pnpm prisma generate

    echo ""
    echo "✅ All done! The app rating configuration is ready."
    echo ""
    echo "📱 Next steps:"
    echo "   1. Restart your API server: pnpm dev"
    echo "   2. Access the admin dashboard settings to configure the rating prompt"
    echo "   3. Your mobile app can now fetch the configuration from GET /app-config/rating-prompt"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi
