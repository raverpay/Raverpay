// apply-onesignal-migration.js
// Add OneSignal fields to notification_preferences table
// Run with: node apply-onesignal-migration.js

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
    const migrationPath = path.join(__dirname, 'prisma/migrations/add_onesignal_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔧 Applying OneSignal migration...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!\n');

    // Verify the columns were added
    console.log('🔍 Verifying new columns...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'notification_preferences'
        AND column_name IN ('oneSignalPlayerId', 'oneSignalExternalId', 'lastPushTokenUpdate')
      ORDER BY column_name
    `);

    console.log('New columns added:');
    console.table(result.rows);

    if (result.rows.length === 3) {
      console.log('\n✅ All OneSignal fields added successfully!');
      console.log('\n📌 Next steps:');
      console.log('   1. Generate Prisma Client: pnpm prisma generate');
      console.log('   2. Create backend endpoint to save OneSignal player ID');
      console.log('   3. Update mobile app to send player ID after login');
      console.log('   4. Implement OneSignal service for sending push notifications');
    } else {
      console.log('\n⚠️  Not all columns were added. Please check for errors above.');
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
