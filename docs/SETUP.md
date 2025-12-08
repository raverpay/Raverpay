# MularPay Setup Guide

Complete setup instructions for the MularPay fintech application.

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (`npm install -g pnpm`)
- **PostgreSQL** database (Supabase account)
- **Redis** database (Upstash account)
- **Git** ([Download](https://git-scm.com/))

## 1. Clone the Repository

```bash
git clone <repository-url>
cd MularPay-Fintech
```

## 2. Install Dependencies

```bash
pnpm install
```

This will install dependencies for all apps and packages in the monorepo.

## 3. Set Up Environment Variables

### API (.env)

```bash
cd apps/mularpay-api
cp .env.example .env
```

Edit `.env` and fill in:

```env
DATABASE_URL="your-supabase-connection-string"
REDIS_URL="your-upstash-redis-url"
JWT_SECRET="generate-with: openssl rand -base64 32"
JWT_REFRESH_SECRET="generate-with: openssl rand -base64 32"
ENCRYPTION_KEY="exactly-32-characters-long-key!"
PAYSTACK_SECRET_KEY="sk_test_xxxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxxx"
# ... other keys from .env.example
```

### Web, Admin, Mobile

Repeat for each app:

```bash
cd apps/mularpay-web
cp .env.example .env
# Edit .env

cd apps/mularpay-admin
cp .env.example .env
# Edit .env

cd apps/mularpay-mobile
cp .env.example .env
# Edit .env
```

## 4. Database Setup (Prisma)

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run migrations (creates all tables)
pnpm prisma:migrate

# (Optional) Seed database with sample data
pnpm prisma:seed

# Open Prisma Studio (visual database editor)
pnpm prisma:studio
```

## 5. Start Development Servers

### Option A: Start All Apps

```bash
pnpm dev
```

This starts:

- API: http://localhost:3001
- Web: http://localhost:3000
- Admin: http://localhost:3002
- Mobile: Expo DevTools

### Option B: Start Individual Apps

```bash
# API only
pnpm dev:api

# Mobile only
pnpm dev:mobile

# Web only
pnpm dev:web

# Admin only
pnpm dev:admin
```

## 6. Access Applications

- **API Swagger Docs**: http://localhost:3001/api/docs
- **Web App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3002
- **Mobile**: Scan QR code in Expo DevTools

## 7. Verify Setup

### Test API Health

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### Test Database Connection

Open Prisma Studio:

```bash
pnpm prisma:studio
```

### Test Mobile App

1. Install Expo Go on your phone
2. Scan QR code from terminal
3. App should load successfully

## 8. Optional: Set Up Staging/Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3001
kill -9 $(lsof -t -i:3001)
```

### Prisma Client Not Generated

```bash
pnpm prisma:generate
```

### Redis Connection Failed

- Verify `REDIS_URL` in `.env`
- The app will run without Redis but caching will be disabled

### Database Migration Failed

```bash
# Reset database (⚠️ deletes all data)
pnpm --filter @raverpay/raverpay-api exec prisma migrate reset
```

### Module Not Found

```bash
# Clean install
pnpm clean
pnpm install
```

## Next Steps

1. Read [SECURITY.md](./SECURITY.md) for security best practices
2. Read [API.md](./API.md) for API documentation
3. Start building features (begin with Phase 1)

## Support

For issues, check:

- GitHub Issues
- README.md
- Individual app documentation
