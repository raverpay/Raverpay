# Apply Saved Recipients Migration

## Step-by-Step Guide

Follow these steps exactly to apply the database migration for the saved recipients feature.

### Step 1: Navigate to API Directory

```bash
cd /Users/joseph/Desktop/mularpay/apps/mularpay-api
```

### Step 2: Get Your Database Connection String

```bash
grep "DIRECT_URL" .env
```

Copy the connection string that looks like:
```
DIRECT_URL="postgresql://postgres.xxx:password@aws-xxx.pooler.supabase.com:5432/postgres"
```

### Step 3: Apply the Migration Manually

Replace `YOUR_CONNECTION_STRING` with the actual DIRECT_URL from Step 2:

```bash
psql "YOUR_CONNECTION_STRING" -f prisma/migrations/add_saved_recipients.sql
```

**Example:**
```bash
psql "postgresql://postgres.abc123:mypassword@aws-0-eu-north-1.pooler.supabase.com:5432/postgres" -f prisma/migrations/add_saved_recipients.sql
```

**Expected Output:**
You should see:
```
CREATE TABLE
DO
CREATE INDEX
CREATE INDEX
CREATE INDEX
DO
 tablename
-----------------
 saved_recipients
(1 row)
```

### Step 4: Verify Table Was Created

```bash
psql "YOUR_CONNECTION_STRING" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_recipients';"
```

You should see:
```
    tablename
-----------------
 saved_recipients
(1 row)
```

### Step 5: Verify Table Structure

```bash
psql "YOUR_CONNECTION_STRING" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'saved_recipients' ORDER BY ordinal_position;"
```

You should see columns: id, userId, serviceType, provider, recipient, recipientName, lastUsedAt, usageCount, createdAt, updatedAt

### Step 6: Generate Prisma Client

This will update the Prisma Client with the new SavedRecipient model:

```bash
pnpm prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

### Step 7: Verify TypeScript Compilation

```bash
pnpm exec tsc --noEmit
```

**Expected Output:**
Should show **0 errors**. If you see errors, the Prisma client generation didn't work.

### Step 8: Restart Your Development Server

Stop your current dev server (Ctrl+C) and restart it:

```bash
pnpm dev
```

## Troubleshooting

### Problem: "psql: command not found"

**Solution:** Install PostgreSQL client tools:
- **macOS:** `brew install postgresql`
- **Ubuntu/Debian:** `sudo apt-get install postgresql-client`
- **Windows:** Download from https://www.postgresql.org/download/windows/

### Problem: "connection refused" or "timeout"

**Solution:** Make sure you're using `DIRECT_URL` (port 5432), not `DATABASE_URL` (port 6543).

### Problem: Prisma Client still showing errors after generation

**Solution:**
1. Delete node_modules/.prisma folder: `rm -rf node_modules/.prisma`
2. Regenerate: `pnpm prisma generate`
3. Restart TypeScript server in your editor

### Problem: Table already exists error

**Solution:** The migration script is idempotent (uses `IF NOT EXISTS`), so it's safe to run multiple times. If you see this, the table was already created successfully.

## Verification Checklist

After completing all steps, verify:

- [ ] Table `saved_recipients` exists in database
- [ ] Table has 10 columns (id, userId, serviceType, provider, recipient, recipientName, lastUsedAt, usageCount, createdAt, updatedAt)
- [ ] `pnpm prisma generate` completes without errors
- [ ] `pnpm exec tsc --noEmit` shows 0 errors
- [ ] Development server starts without errors
- [ ] Backend compiles successfully

## What This Migration Does

1. Creates the `saved_recipients` table to store frequently used phone numbers
2. Adds unique constraint to prevent duplicate recipients per user per service
3. Creates indexes for fast lookups by userId and serviceType
4. Sets up foreign key to users table with CASCADE delete
5. Automatically tracks usage count and last used timestamp

## Next Steps After Migration

Once the migration is successful:

1. **Test Airtime Purchase:**
   - Buy airtime for a phone number
   - Check if the number appears in "Recent Numbers" on next purchase

2. **Test Data Purchase:**
   - Buy data for a phone number
   - Verify the number is saved separately for DATA service

3. **Test Auto-Fill:**
   - Tap a saved number
   - Verify phone number and network auto-fill

4. **Check Database:**
   ```bash
   psql "YOUR_CONNECTION_STRING" -c "SELECT * FROM saved_recipients LIMIT 5;"
   ```

## Migration File Location

The migration SQL file is located at:
```
/Users/joseph/Desktop/mularpay/apps/mularpay-api/prisma/migrations/add_saved_recipients.sql
```

## Rollback (If Needed)

If you need to rollback this migration:

```bash
psql "YOUR_CONNECTION_STRING" -c "DROP TABLE IF EXISTS saved_recipients CASCADE;"
```

Then regenerate Prisma client and remove the SavedRecipient model from schema.prisma.
