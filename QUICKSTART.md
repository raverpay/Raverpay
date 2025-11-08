# 🚀 MularPay Quick Start Guide

## ✅ What's Already Done

- ✅ All `.env` files created with your credentials
- ✅ Encryption key generated
- ✅ Dependencies installed
- ✅ Project structure complete

## ⚠️ Action Required (5 minutes)

### 1. Fix Supabase Connection String

Your current DATABASE_URL might have issues with the special character in the password.

**Option A: Get the correct URL from Supabase** (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project: `oeanyukxcphqjrsljhqq`
3. Click **Settings** → **Database**
4. Scroll to **Connection string**
5. Copy the **Connection pooling** string (recommended for serverless)
6. Replace `[YOUR-PASSWORD]` with `joseph6thbornS$`
7. Update `apps/mularpay-api/.env` line 14

The pooler URL should look like:
```
DATABASE_URL="postgresql://postgres.oeanyukxcphqjrsljhqq:joseph6thbornS$@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

**Option B: URL-encode the current one**

If the above doesn't work, the `$` in your password needs encoding:
```
DATABASE_URL="postgresql://postgres:joseph6thbornS%24@db.oeanyukxcphqjrsljhqq.supabase.co:5432/postgres"
```

### 2. Get Webhook Secrets (Can do later)

For now, these are placeholders in your `.env`:

**Paystack Webhook Secret:**
1. Login to https://dashboard.paystack.com
2. Go to **Settings** → **API Keys & Webhooks**
3. Scroll to **Webhooks** section
4. Copy your webhook secret
5. Update line 46 in `apps/mularpay-api/.env`

**Mono Webhook Secret:**
1. Login to https://app.withmono.com
2. Go to **Settings** → **Webhooks**
3. Copy your webhook secret
4. Update line 62 in `apps/mularpay-api/.env`

> **Note**: Webhooks are only needed when deploying. For local development, you can skip this for now.

---

## 🎯 Start Developing (3 commands)

### Step 1: Generate Prisma Client

```bash
pnpm prisma:generate
```

This creates the TypeScript types for your database.

### Step 2: Create Database Tables

```bash
pnpm prisma:migrate
```

This will:
- Connect to your Supabase database
- Create all tables (users, wallets, transactions, etc.)
- Ask you to name the migration (e.g., "initial_setup")

### Step 3: Start All Apps

```bash
pnpm dev
```

This starts:
- **API**: http://localhost:3001 (Swagger docs at `/api/docs`)
- **Web**: http://localhost:3000
- **Admin**: http://localhost:3002
- **Mobile**: Expo DevTools (scan QR with Expo Go app)

Or start individually:
```bash
pnpm dev:api      # Just the API
pnpm dev:web      # Just the web app
pnpm dev:admin    # Just the admin
pnpm dev:mobile   # Just the mobile app
```

---

## 🧪 Verify Everything Works

### Test 1: API Health Check

Once the API is running:
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 5.123,
  "environment": "development"
}
```

### Test 2: API Documentation

Open in browser: http://localhost:3001/api/docs

You should see the Swagger UI with all API endpoints.

### Test 3: Database Connection

```bash
pnpm prisma:studio
```

This opens a visual database editor at http://localhost:5555

You should see all your tables (users, wallets, transactions, etc.)

### Test 4: Web Apps

- Web: http://localhost:3000 (should show MularPay landing page)
- Admin: http://localhost:3002 (should show admin dashboard)

### Test 5: Mobile App

1. Install **Expo Go** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Run `pnpm dev:mobile`
3. Scan the QR code with Expo Go
4. App should load showing "MularPay" splash screen

---

## 📦 Your Current Setup Summary

### ✅ Credentials Configured

| Service | Status | Environment |
|---------|--------|-------------|
| Supabase | ✅ Ready | Staging DB |
| Upstash Redis | ✅ Ready | TLS enabled |
| Paystack | ✅ Ready | Test keys |
| VTPass | ✅ Ready | Sandbox |
| Mono | ✅ Ready | Test keys |
| Cloudinary | ✅ Ready | Production |
| Sentry | ✅ Ready | Error tracking |

### ⏳ Pending

| Item | When Needed |
|------|-------------|
| Paystack Webhook Secret | Before deploying webhooks |
| Mono Webhook Secret | Before deploying webhooks |
| Paystack Live Keys | Before production launch |
| VTPass Live Keys | Before production launch |
| Mono Live Keys | Before production launch |

---

## 🚨 Common Issues & Fixes

### Database Connection Error

**Error**: `Can't reach database server`

**Fix**:
1. Verify your Supabase project is not paused (free tier auto-pauses)
2. Check the DATABASE_URL is correct
3. Try the pooler connection string (see Step 1 above)

### Redis Connection Error

**Error**: `ECONNREFUSED` or timeout

**Fix**:
1. Verify Upstash Redis database is active
2. Make sure you're using `rediss://` (with double 's')
3. Check the token is correct

### Prisma Generate Fails

**Error**: `Prisma schema not found`

**Fix**:
```bash
cd apps/mularpay-api
pnpm prisma:generate
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001`

**Fix**:
```bash
# Kill the process using port 3001
kill -9 $(lsof -t -i:3001)

# Or use a different port
PORT=3002 pnpm dev:api
```

---

## 🎓 Next: Phase 1 Development

Once everything is running, we'll build:

**Phase 1: Backend Core** (Next 2-3 hours)
1. ✅ User registration with email/phone validation
2. ✅ Login with JWT authentication
3. ✅ Email verification system
4. ✅ User profile management
5. ✅ Transaction PIN setup
6. ✅ Wallet creation
7. ✅ Basic transaction logging

Ready to start? Just let me know! 🚀

---

## 📚 Helpful Commands

```bash
# Monorepo commands
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm lint             # Lint all apps
pnpm test             # Run all tests
pnpm clean            # Clean all build artifacts

# Database commands
pnpm prisma:generate  # Generate Prisma Client
pnpm prisma:migrate   # Run migrations
pnpm prisma:studio    # Open database GUI
pnpm prisma:seed      # Seed sample data

# Individual app commands
pnpm dev:api          # Start API only
pnpm dev:web          # Start web only
pnpm dev:admin        # Start admin only
pnpm dev:mobile       # Start mobile only

# Useful shortcuts
pnpm --filter @mularpay/mularpay-api [command]    # Run command in API
pnpm --filter @mularpay/mularpay-web [command]    # Run command in Web
```

---

## 🆘 Get Help

- **Setup Issues**: See `docs/SETUP.md`
- **Deployment**: See `docs/DEPLOYMENT.md`
- **Security**: See `docs/SECURITY.md`
- **API Reference**: See `docs/API.md`
- **Swagger Docs**: http://localhost:3001/api/docs (when running)

---

**Status**: Phase 0 Complete ✅
**Next**: Phase 1 - Backend Core Development
**Time to first API call**: ~5 minutes after setup
