# MularPay Fintech App

🇳🇬 Nigerian fintech super-app combining wallet system, VTU services, gift card trading, and crypto trading.

## 📋 Overview

**MularPay Fintech** is a comprehensive fintech platform designed for the Nigerian market, offering:

- 💰 **Wallet System**: Fund wallet, withdraw, transfer
- 📱 **VTU Services**: Airtime & Data purchase (MTN, Glo, Airtel, 9Mobile)
- 🎁 **Gift Card Trading**: Buy/sell gift cards (Amazon, Apple, Steam, etc.)
- ₿ **Crypto Trading**: Buy/sell Bitcoin, Ethereum, USDT
- 🔐 **Secure KYC**: Tiered verification system (BVN, ID cards)
- 👨‍💼 **Admin Dashboard**: Comprehensive management tools

## 🏗️ Architecture

This is a **monorepo** containing:

```
MularPay-fintech/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── mobile/       # React Native (Expo) mobile app
│   ├── web/          # Next.js web application
│   └── admin/        # Next.js admin dashboard
├── packages/
│   ├── shared/       # Shared types and utilities
│   └── config/       # Shared configuration
└── docs/             # Documentation
```

## 🚀 Tech Stack

### Backend

- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Cache**: Redis (Upstash)
- **Auth**: JWT + Refresh Tokens
- **Security**: Argon2, Rate Limiting, Validation
- **Hosting**: Railway

### Mobile

- **Framework**: React Native + Expo
- **Router**: Expo Router
- **State**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **Storage**: Expo Secure Store

### Web/Admin

- **Framework**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand + React Query
- **Hosting**: Vercel

### Third-Party Services

- **Payments**: Paystack
- **VTU**: VTPass
- **Bank Verification**: Mono
- **Media Storage**: Cloudinary
- **Monitoring**: Sentry (planned)

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL database (Supabase account)
- Redis database (Upstash account)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd -MularPay-fintech
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy `.env.example` files in each app and fill in your credentials:

   - `apps/api/.env`
   - `apps/mobile/.env`
   - `apps/web/.env`
   - `apps/admin/.env`

4. **Set up database**

   ```bash
   cd apps/api
   pnpm prisma:generate
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

5. **Run development servers**

   In separate terminals:

   ```bash
   # API (Port 3001)
   pnpm dev:api

   # Mobile (Expo)
   pnpm dev:mobile

   # Web (Port 3000)
   pnpm dev:web

   # Admin (Port 3002)
   pnpm dev:admin
   ```

## 📚 Documentation

See the [docs/](./docs) folder for detailed documentation:

- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Setup Guide](./docs/SETUP.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Security Best Practices](./docs/SECURITY.md)

## 🔐 Security Features

- ✅ Argon2 password hashing
- ✅ JWT authentication with refresh tokens
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ Transaction PIN encryption
- ✅ KYC verification system
- ✅ Audit logging for all actions
- ✅ Webhook signature verification

## 📱 Features by Phase

### Phase 0: Project Setup ✅

- Monorepo structure
- Database schema
- Basic authentication

### Phase 1: Backend Core (In Progress)

- User authentication
- Wallet system
- Transaction management

### Phase 2: Mobile MVP

- User registration/login
- Wallet UI
- Airtime/Data purchase

### Phase 3: VTU Integration

- Paystack integration
- VTPass integration
- Transaction processing

### Phase 4-9: See [docs/ROADMAP.md](./docs/ROADMAP.md)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run API tests
pnpm --filter @MularPay/api test

# Run with coverage
pnpm --filter @MularPay/api test:cov
```

## 🚢 Deployment

### API (Railway)

```bash
cd apps/api
pnpm build
# Deploy to Railway
```

### Web/Admin (Vercel)

```bash
cd apps/web
pnpm build
# Deploy to Vercel
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## 📊 Database

The app uses **PostgreSQL** with **Prisma ORM**.

Key models:

- `User` - User accounts with KYC tiers
- `Wallet` - User wallets with balance tracking
- `Transaction` - Double-entry transaction logs
- `VTUOrder` - Airtime/Data purchases
- `GiftCardOrder` - Gift card trades
- `CryptoOrder` - Crypto trades

See [DATABASE.md](./docs/DATABASE.md) for full schema.

## 🔑 Environment Variables

See `.env.example` files in each app for required variables.

Critical variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `PAYSTACK_SECRET_KEY` - Paystack API key
- `VTPASS_API_KEY` - VTPass API key

## 🤝 Contributing

This is a private project. For any questions, contact the development team.

## 📄 License

UNLICENSED - Private project

## 👨‍💻 Author

** MularPay Fintech Team**

---

Built with ❤️ for Nigeria 🇳🇬
