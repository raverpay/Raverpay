# Soft Delete Migration - Application Instructions

## Overview
This migration adds soft delete support for user accounts:
- Adds `deletedAt` field to `users` table
- Adds `DELETED` status to `UserStatus` enum
- Creates indexes for efficient querying

## Applying the Migration

### Step 1: Generate Prisma Client (for TypeScript types)
```bash
cd apps/mularpay-api
pnpm prisma generate
```

### Step 2: Get Your DIRECT_URL
```bash
cd apps/mularpay-api
grep "DIRECT_URL" .env | head -1
```

**Important:** Use `DIRECT_URL`, not `DATABASE_URL` (DIRECT_URL uses port 5432, DATABASE_URL uses pooled connection)

### Step 3: Apply the Migration
```bash
cd apps/mularpay-api
psql "$DIRECT_URL" -f prisma/migrations/add_soft_delete_support.sql
```

Or with explicit connection string:
```bash
psql "postgresql://user:password@host:5432/database" -f prisma/migrations/add_soft_delete_support.sql
```

### Step 4: Verify Migration Applied

Check if DELETED status exists:
```bash
psql "$DIRECT_URL" -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus') AND enumlabel = 'DELETED';"
```

Check if deletedAt column exists:
```bash
psql "$DIRECT_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deletedAt';"
```

Check indexes:
```bash
psql "$DIRECT_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE '%deletedAt%';"
```

### Step 5: Regenerate Prisma Client
```bash
cd apps/mularpay-api
pnpm prisma generate
```

### Step 6: Verify TypeScript Compilation
```bash
cd apps/mularpay-api
pnpm exec tsc --noEmit
```

Should show 0 errors if everything is correct.

## What This Migration Does

1. **Adds DELETED to UserStatus enum**
   - Allows users to have status = 'DELETED'

2. **Adds deletedAt column to users table**
   - TIMESTAMP(3) field to track when account was soft deleted
   - NULL for active accounts, timestamp for deleted accounts

3. **Creates indexes**
   - `users_deletedAt_idx` - For filtering by deletion date
   - `users_status_deletedAt_idx` - Composite index for active users (WHERE deletedAt IS NULL)

## After Migration

The `DeletionSchedulerService` will automatically:
- Run every hour via cron job
- Process approved deletion requests where `scheduledFor <= now`
- Soft delete user accounts (anonymize data, set deletedAt, update status to DELETED)

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS users_status_deletedAt_idx;
DROP INDEX IF EXISTS users_deletedAt_idx;

-- Remove column
ALTER TABLE users DROP COLUMN IF EXISTS "deletedAt";

-- Note: Cannot remove enum value in PostgreSQL, but it won't cause issues if unused
```

## Notes

- Migration is idempotent (safe to run multiple times)
- Uses `IF NOT EXISTS` for all operations
- Follows lowercase_underscore table naming convention
- Compatible with the Prisma migration workaround process

