// apply-migration.js
// Node.js script to apply the saved_recipients migration
// Run with: node apply-migration.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres.oeanyukxcphqjrsljhqq:mularpay2025@aws-1-eu-north-1.pooler.supabase.com:5432/postgres?connect_timeout=10";

async function applyMigration() {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'prisma/migrations/add_saved_recipients.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📊 Applying migration...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!\n');

    // Verify table was created
    console.log('🔍 Verifying table creation...');
    const result = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_recipients'"
    );

    if (result.rows.length > 0) {
      console.log('✅ Table "saved_recipients" created successfully!\n');

      // Show table structure
      console.log('📋 Table structure:');
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'saved_recipients'
        ORDER BY ordinal_position
      `);

      console.table(columns.rows);

      console.log('\n✨ Migration completed successfully!');
      console.log('\n📌 Next steps:');
      console.log('   1. Run: pnpm prisma generate');
      console.log('   2. Run: pnpm exec tsc --noEmit');
      console.log('   3. Restart your dev server: pnpm dev');
    } else {
      console.log('❌ Table was not created. Please check the migration file.');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
