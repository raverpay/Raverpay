// fix-migration.js
// Fix the serviceType column to use ENUM instead of TEXT
// Run with: node fix-migration.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres.oeanyukxcphqjrsljhqq:mularpay2025@aws-1-eu-north-1.pooler.supabase.com:5432/postgres?connect_timeout=10";

async function fixMigration() {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read the fix migration file
    const migrationPath = path.join(__dirname, 'prisma/migrations/fix_service_type_enum.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔧 Applying fix migration...');
    await client.query(sql);
    console.log('✅ Fix applied successfully!\n');

    // Verify the column type
    console.log('🔍 Verifying column type...');
    const result = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'saved_recipients' AND column_name = 'serviceType'
    `);

    console.log('Column details:');
    console.table(result.rows);

    if (result.rows[0]?.udt_name === 'VTUServiceType') {
      console.log('\n✅ Column type fixed successfully!');
      console.log('\n📌 Next steps:');
      console.log('   1. Restart your dev server (Ctrl+C, then: pnpm dev)');
      console.log('   2. Test the saved recipients feature');
    } else {
      console.log('\n⚠️  Column type was not updated. Please check for errors above.');
    }

  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixMigration();
