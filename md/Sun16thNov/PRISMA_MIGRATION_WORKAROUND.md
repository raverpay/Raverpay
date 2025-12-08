# Prisma Migration Workaround Guide

## Problem: Prisma Migrate Can't Connect to Database

Sometimes `prisma migrate` or `prisma db push` fails due to:
- Network connectivity issues
- Shadow database creation failures (common with Supabase poolers)
- Connection timeout with pooled connections
- PgBouncer compatibility issues

## When This Happens: Manual SQL Migration Process

### Step 1: Generate Prisma Client First
Even if migration fails, always generate the Prisma client to get TypeScript types:

```bash
cd apps/raverpay-api
pnpm prisma generate
```

This gives you type safety even before applying database changes.

### Step 2: Create Manual SQL Migration Script

Extract the schema changes you need to apply by looking at your `prisma/schema.prisma` file and manually creating SQL.

**Key Points:**
- Use `IF NOT EXISTS` for all CREATE statements (idempotent)
- Use `ADD COLUMN IF NOT EXISTS` for ALTER TABLE statements
- Match your existing table naming convention (lowercase_underscore)
- Include all foreign key constraints
- Include all indexes

**Example Template:**

```sql
-- Add new columns to existing table
ALTER TABLE existing_table
  ADD COLUMN IF NOT EXISTS new_column TEXT,
  ADD COLUMN IF NOT EXISTS another_column BOOLEAN DEFAULT false;

-- Create new table
CREATE TABLE IF NOT EXISTS new_table (
    id TEXT NOT NULL,
    userId TEXT NOT NULL,
    someField TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL,

    CONSTRAINT new_table_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS new_table_userId_idx ON new_table(userId);

-- Add foreign key constraints
ALTER TABLE new_table
  ADD CONSTRAINT new_table_userId_fkey
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 3: Connect Directly to Database with psql

Extract your database connection string:

```bash
cd apps/raverpay-api
grep "DIRECT_URL" .env | head -1
```

**Important:** Use `DIRECT_URL`, not `DATABASE_URL`:
- `DATABASE_URL` - Uses PgBouncer pooler (port 6543) - May have compatibility issues with psql
- `DIRECT_URL` - Direct connection (port 5432) - Always works with psql

### Step 4: Execute SQL Script

```bash
cd apps/raverpay-api
psql "postgresql://user:password@host:5432/database" -f your_migration.sql
```

**Real example:**
```bash
psql "postgresql://postgres.xxx:password@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" -f manual_migration.sql
```

### Step 5: Verify Tables Were Created

List all tables:
```bash
psql "your_connection_string" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
```

Check specific table columns:
```bash
psql "your_connection_string" -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'your_table' ORDER BY ordinal_position;"
```

### Step 6: Regenerate Prisma Client (Again)

After database changes are applied:

```bash
cd apps/raverpay-api
pnpm prisma generate
```

This ensures Prisma client is in sync with the actual database schema.

### Step 7: Verify Backend Compilation

```bash
cd apps/raverpay-api
pnpm exec tsc --noEmit
```

Should show 0 errors if everything is correct.

---

## Why We Need Prisma Migrate (vs Manual SQL)

### What Prisma Migrate Provides:

#### 1. **Migration History Tracking**
Prisma maintains a `_prisma_migrations` table that tracks:
- Which migrations have been applied
- When they were applied
- Migration checksums to detect tampering
- Rollback capability

**Without this:** You have no reliable way to know which database is at which version.

#### 2. **Development/Production Parity**
Migrations ensure:
- Dev, staging, and production databases have identical schema
- New team members can run `prisma migrate dev` to get up to date
- CI/CD pipelines can apply migrations automatically

**Manual SQL risk:** Dev database might have changes that production doesn't, causing runtime errors.

#### 3. **Schema Drift Detection**
Prisma can detect when database schema doesn't match `schema.prisma`:

```bash
prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma
```

**Without this:** Database and code can silently diverge, causing bugs.

#### 4. **Automatic Rollback Safety**
Prisma migrate creates:
- Forward migrations (apply changes)
- Shadow database testing (validates migration before applying to production)
- Migration history for rollback

**Manual SQL risk:** No easy way to undo changes if something goes wrong.

#### 5. **Team Collaboration**
With Prisma migrations:
- Pull requests include migration files
- Code reviewers can see database changes
- Migrations are versioned in git
- Merge conflicts in schema are detectable

**Manual SQL risk:** Two developers might make conflicting database changes without knowing.

#### 6. **Cross-Database Compatibility**
Prisma generates database-specific SQL:
- PostgreSQL: Uses `SERIAL`, `JSONB`, `TEXT[]`
- MySQL: Uses `AUTO_INCREMENT`, `JSON`, different syntax
- SQLite: Different constraints and types

**Manual SQL risk:** Might not work if you switch databases.

#### 7. **Type Safety Integration**
When you run `prisma migrate dev`:
1. Applies migration to database
2. Regenerates Prisma Client automatically
3. Updates TypeScript types
4. Triggers type checking

**Manual SQL requires:** Manually regenerating client and hoping you didn't miss anything.

---

## When Manual SQL is Acceptable

### ✅ Good Use Cases:

1. **Database Connectivity Issues** (like this scenario)
   - Can't connect to shadow database
   - PgBouncer/pooler issues
   - Network restrictions

2. **Emergency Hotfixes**
   - Production is down
   - Need to add index immediately
   - Can't wait for deployment pipeline

3. **Data Migrations**
   - Backfilling data
   - Complex data transformations
   - Bulk updates

4. **One-Time Operations**
   - Adding missing indexes
   - Fixing constraint issues
   - Performance optimizations

### ❌ Bad Use Cases:

1. **Regular Development** - Should use `prisma migrate dev`
2. **Production Deployments** - Should use `prisma migrate deploy`
3. **Schema Changes** - Should be in `schema.prisma` first
4. **Adding New Tables/Models** - Should go through Prisma

---

## Best Practice: Hybrid Approach

### Normal Development Flow:
```bash
# 1. Update schema.prisma
# 2. Create migration
pnpm prisma migrate dev --name add_notifications

# 3. Prisma automatically:
#    - Applies migration to database
#    - Regenerates client
#    - Updates TypeScript types
```

### When Prisma Migrate Fails:
```bash
# 1. Generate client for types
pnpm prisma generate

# 2. Create manual SQL from schema.prisma
# 3. Apply SQL directly with psql
psql "$DIRECT_URL" -f manual_migration.sql

# 4. Regenerate client
pnpm prisma generate

# 5. Create a migration file for history (optional but recommended)
pnpm prisma migrate dev --create-only --name manual_migration_applied
# Edit the migration file to match what you did manually
pnpm prisma migrate resolve --applied <migration_name>
```

This gives you:
- ✅ Schema changes applied immediately
- ✅ Migration history maintained
- ✅ Team aware of changes (via git)
- ✅ Production deployments can replay migrations

---

## Important Table Naming Convention

### Our Project Convention: `lowercase_underscore`

**Correct:**
```
users
transactions
bank_accounts
notification_logs
notification_preferences
```

**Incorrect:**
```
Users
Transactions
BankAccounts
NotificationLogs  ❌ (Prisma default without @@map)
```

### Prisma Schema Pattern:

```prisma
model NotificationLog {
  id String @id @default(uuid())
  // ... fields

  @@map("notification_logs")  // ← Always add this!
}
```

**Why this matters:**
- PostgreSQL is case-sensitive with quoted identifiers
- Our tables are all lowercase (convention from Supabase/PostgreSQL best practices)
- Prisma defaults to PascalCase table names without `@@map()`
- Manual SQL must match exact table names

### Verifying Table Names:

```bash
psql "$DIRECT_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
```

All should be lowercase with underscores.

---

## Troubleshooting Common Issues

### Issue: "relation does not exist"

**Problem:** Table name case mismatch

**Solution:**
```sql
-- Wrong
ALTER TABLE "Notification" ADD COLUMN ...;  ❌

-- Correct
ALTER TABLE notifications ADD COLUMN ...;  ✅
```

### Issue: "constraint already exists"

**Problem:** Running migration twice

**Solution:** Use `IF NOT EXISTS` everywhere
```sql
ALTER TABLE notifications
  ADD CONSTRAINT IF NOT EXISTS notification_userId_fkey
  FOREIGN KEY (userId) REFERENCES users(id);
```

### Issue: TypeScript errors after manual migration

**Problem:** Prisma client not regenerated

**Solution:**
```bash
pnpm prisma generate
```

### Issue: "pgbouncer" invalid URI parameter

**Problem:** Using pooled connection with psql

**Solution:** Use `DIRECT_URL` instead of `DATABASE_URL`

---

## Quick Reference Commands

```bash
# Generate Prisma client
pnpm prisma generate

# Connect to database
psql "$DIRECT_URL"

# Run SQL file
psql "$DIRECT_URL" -f migration.sql

# List tables
psql "$DIRECT_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"

# Describe table
psql "$DIRECT_URL" -c "\d table_name"

# Check column details
psql "$DIRECT_URL" -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'table_name';"

# Verify TypeScript compilation
pnpm exec tsc --noEmit

# Check Prisma schema vs database diff
pnpm prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma
```

---

## Summary

### When Prisma Migrate Works:
✅ Use it! It's safer, tracked, and team-friendly

### When Prisma Migrate Fails:
1. Generate Prisma client first (for types)
2. Create manual SQL script (idempotent, with IF NOT EXISTS)
3. Connect with psql using DIRECT_URL
4. Apply SQL manually
5. Verify tables created
6. Regenerate Prisma client
7. (Optional) Record migration in Prisma history

### Why Prisma Migrate is Important:
- Migration history and versioning
- Team collaboration and code review
- Automatic rollback capability
- Schema drift detection
- Dev/prod parity
- Type safety integration

### Manual SQL is a workaround, not a replacement!

Always return to proper Prisma migrations once connectivity issues are resolved.
