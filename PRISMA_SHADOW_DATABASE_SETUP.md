# Prisma Shadow Database Configuration Guide
## Fixing the Root Cause of Prisma Migrate Issues

**Date**: January 25, 2026  
**Status**: Optional but Recommended  
**Priority**: Medium (improves development workflow)

---

## The Problem

You've been experiencing this error:
```
Error: P3006
Migration failed to apply cleanly to the shadow database.
Error code: P1014
The underlying table for model `transactions` does not exist.
```

**Root Cause**: Supabase (cloud-hosted PostgreSQL) doesn't allow Prisma to automatically create and drop shadow databases for each migration.

---

## What is the Shadow Database?

According to Prisma's official documentation:

> The shadow database is a second, temporary database that is created and deleted automatically each time you run `prisma migrate dev` and is primarily used to detect problems such as schema drift or potential data loss of the generated migration.

### How It Works:

1. **Detect Schema Drift**: 
   - Creates fresh shadow database
   - Replays all migrations
   - Compares to your dev database
   - Warns if someone manually changed the database

2. **Generate Safe Migrations**:
   - Calculates target schema from Prisma schema
   - Generates migration SQL
   - Evaluates potential data loss
   - Warns you before applying

### Why It Fails on Supabase:

- Supabase requires databases to be created via their UI/API
- Your database user doesn't have `CREATEDB` privilege
- Prisma can't automatically create/drop shadow database
- **Solution**: Manually create and configure shadow database

---

## The Solution: Manual Shadow Database Configuration

### Step 1: Create Shadow Database in Supabase

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Navigate to your project
3. Click "Database" → "Schema"
4. Create new database (or schema):
   - **Name**: `raverpay_shadow` (or any name you prefer)
   - **Description**: "Prisma shadow database for migrations"

#### Option B: Via SQL (if allowed)

```sql
-- Connect to your Supabase database
CREATE DATABASE raverpay_shadow;
```

**Note**: On Supabase, you might need to use a **schema** instead of a separate database:

```sql
-- Create a separate schema as shadow database
CREATE SCHEMA IF NOT EXISTS shadow;
```

---

### Step 2: Add Shadow Database URL to .env

Add to `apps/raverpay-api/.env`:

```bash
# Shadow Database (for Prisma migrations)
# Option A: Separate database (if Supabase allows)
SHADOW_DATABASE_URL="postgresql://postgres.oeanyukxcphqjrsljhqq:NApEwzJ1AloIApJs@aws-1-eu-north-1.pooler.supabase.com:5432/raverpay_shadow"

# Option B: Separate schema in same database (more likely for Supabase)
SHADOW_DATABASE_URL="postgresql://postgres.oeanyukxcphqjrsljhqq:NApEwzJ1AloIApJs@aws-1-eu-north-1.pooler.supabase.com:5432/postgres?schema=shadow"
```

**⚠️ CRITICAL**: 
- **DO NOT** use the same URL as `DATABASE_URL`
- This would delete all your data!

---

### Step 3: Configure Prisma Schema

Update `apps/raverpay-api/prisma/schema.prisma`:

```prisma
datasource db {
  provider        = "postgresql"
  url             = env("DATABASE_URL")
  directUrl       = env("DIRECT_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")  // ← ADD THIS LINE
}
```

---

### Step 4: Test the Configuration

```bash
cd apps/raverpay-api

# This should now work without errors
pnpm prisma migrate dev --name test_shadow_db

# If it works, you'll see:
# ✔ Migration created successfully
# ✔ Applied migration to shadow database
# ✔ Applied migration to development database
```

If successful, **delete the test migration**:
```bash
rm -rf prisma/migrations/*_test_shadow_db
```

---

## Benefits of Fixing This

### Before (Manual SQL Workaround):
- ❌ Can't use `prisma migrate dev`
- ❌ No automatic schema drift detection
- ❌ Manual SQL scripts required
- ❌ No migration rollback capability
- ❌ Team members might have schema differences
- ❌ Risk of data loss from unvalidated migrations

### After (Proper Prisma Migrations):
- ✅ Can use `pnpm prisma migrate dev`
- ✅ Automatic schema drift detection
- ✅ Prisma generates safe SQL automatically
- ✅ Warns about potential data loss
- ✅ Migration history tracked properly
- ✅ Team members stay in sync
- ✅ Production deployments safer

---

## Migration Workflow Comparison

### Current Workflow (Manual):
```bash
# 1. Update schema.prisma
# 2. Generate Prisma client
pnpm prisma generate

# 3. Create manual SQL script
# ... write SQL by hand ...

# 4. Apply manually with psql
psql "$DIRECT_URL" -f migrations/my_migration.sql

# 5. Regenerate client
pnpm prisma generate
```

### New Workflow (With Shadow DB):
```bash
# 1. Update schema.prisma

# 2. Create and apply migration (ONE COMMAND!)
pnpm prisma migrate dev --name add_new_feature

# That's it! Prisma:
# - Generates migration SQL
# - Checks for data loss
# - Applies to dev database
# - Regenerates client
# - Tracks in _prisma_migrations table
```

---

## Supabase-Specific Considerations

### If Supabase Doesn't Allow Multiple Databases:

Use a **schema** instead:

1. **Create shadow schema**:
   ```sql
   CREATE SCHEMA IF NOT EXISTS shadow;
   ```

2. **Shadow database URL**:
   ```bash
   SHADOW_DATABASE_URL="postgresql://...postgres?schema=shadow"
   ```

3. **Prisma will**:
   - Use the `shadow` schema instead of `public`
   - Reset this schema (drop all tables) before each migration
   - Keep your `public` schema (main database) safe

### Permissions Required:

Your database user needs:
```sql
-- Check if you have schema creation permission
SELECT has_schema_privilege('postgres', 'shadow', 'CREATE');

-- If not, you might need to grant it
GRANT CREATE ON SCHEMA shadow TO postgres;
```

If you **can't** get these permissions, continue with manual SQL migrations (current approach).

---

## Implementation as a Phase

### Phase 0.5: Configure Shadow Database (Optional)

**Duration**: 30 minutes  
**Priority**: Medium  
**Benefits**: Clean development workflow

#### Tasks:
- [ ] 1. Create shadow database/schema in Supabase
- [ ] 2. Add `SHADOW_DATABASE_URL` to .env
- [ ] 3. Add `shadowDatabaseUrl` to schema.prisma
- [ ] 4. Test with `prisma migrate dev`
- [ ] 5. Update team documentation

#### Files to Modify:
- `apps/raverpay-api/.env` (add `SHADOW_DATABASE_URL`)
- `apps/raverpay-api/prisma/schema.prisma` (add `shadowDatabaseUrl`)

---

## When to Do This?

### Option A: Now (Before Phase 2)
**Pros**: 
- Clean workflow for all future migrations
- Easier for team collaboration

**Cons**: 
- Takes 30 minutes
- Delays Phase 2

### Option B: Later (After Phase 10)
**Pros**: 
- Don't disrupt current momentum
- Manual migrations work fine for now

**Cons**: 
- Continue with workaround workflow
- Need to track manual SQL scripts

### Option C: Never (Keep Manual Migrations)
**Pros**: 
- No setup needed
- Current workflow documented

**Cons**: 
- Missing Prisma's safety features
- More manual work

---

## Recommendation

**Do this LATER** (after Phase 10 or when you have downtime):

**Reasoning**:
1. Current manual SQL approach works
2. You have a documented workaround
3. Focus on getting Alchemy features working first
4. This is a "nice to have" improvement, not critical

**Add it to backlog** as:
- "Improvement: Configure Prisma shadow database for proper migrations"
- Priority: Low (quality of life improvement)
- Estimated time: 30 minutes

---

## Quick Reference Commands

### Check if shadow DB is configured:
```bash
grep "shadowDatabaseUrl" apps/raverpay-api/prisma/schema.prisma
```

### Test shadow DB configuration:
```bash
cd apps/raverpay-api
pnpm prisma migrate dev --create-only --name test_shadow
```

### If it works:
```
✔ Shadow database created
✔ Migration generated
```

### If it fails:
```
Error: Can't create shadow database
```
→ Need to configure manually

---

## Additional Resources

- [Prisma Shadow Database Docs](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database)
- [Supabase Database Schema Docs](https://supabase.com/docs/guides/database/schemas)
- Your `PRISMA_MIGRATION_WORKAROUND.md` (current workaround)

---

**Status**: Documentation complete  
**Action**: Add to backlog for later implementation  
**Updated**: 2026-01-25 12:13 PM
