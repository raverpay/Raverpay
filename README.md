# RaverPay Fintech App

🇳🇬 Nigerian fintech super-app combining wallet system, VTU services, gift card trading, and crypto trading.

## 📋 Overview

**RaverPay Fintech** is a comprehensive fintech platform designed for the Nigerian market, offering:

- 💰 **Wallet System**: Fund wallet, withdraw, transfer, P2P payments
- 📱 **VTU Services**: Airtime & Data purchase, Cable TV, Electricity bills
- 🎁 **Gift Card Trading**: Buy/sell gift cards (admin-managed)
- ₿ **Crypto Trading**: Buy/sell Bitcoin, Ethereum, USDT with Venly integration
- 🔐 **Secure KYC**: Tiered verification system with BVN/NIN validation
- 👨‍💼 **Admin Dashboard**: Comprehensive management tools (basic scaffold)
- 📧 **Notifications**: Email, SMS, push, and in-app notifications
- 🎫 **Cashback System**: Earn rewards on transactions
- 🎧 **Support System**: Ticketing, live chat, help center

## 🏗️ Architecture

This is a **monorepo** containing:

```
RaverPay-fintech/
├── apps/
│   ├── raverpay-api/          # NestJS backend API
│   ├── raverpay-web/          # Next.js web application (basic scaffold)
│   └── raverpay-admin/        # Next.js admin dashboard (basic scaffold)
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

- **Framework**: React Native + Expo (planned)
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
- **Crypto Wallets**: Venly
- **Media Storage**: Cloudinary
- **Email**: Resend
- **SMS**: VTPass Messaging
- **Monitoring**: Sentry, Logtail, PostHog
- **Queues**: BullMQ with Redis

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
   cd RaverPay-fintech
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy `.env.example` files in each app and fill in your credentials:
   - `apps/raverpay-api/.env`
   - `apps/raverpay-web/.env`
   - `apps/raverpay-admin/.env`

4. **Set up database**

   ```bash
   cd apps/raverpay-api
   pnpm prisma:generate
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

5. **Run development servers**

   In separate terminals:

   ```bash
   # API (Port 3001)
   pnpm dev:api

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

### Phase 1: Backend Core ✅

- User authentication & JWT
- User management & KYC verification
- Wallet system with balance tracking
- Transaction management (deposits, withdrawals, transfers)
- Paystack payment integration
- Virtual accounts for funding
- Email & SMS verification services
- Device management & security
- Rate limiting & audit logging
- Notification system (email, SMS, push, in-app)
- Support ticketing & conversations
- Cashback system
- P2P transfers

### Phase 2: VTU Services ✅

- Airtime purchase (local & international)
- Data bundle subscriptions
- Cable TV payments (DStv, GOtv, StarTimes, Showmax)
- Electricity bill payments (all DISCOs)
- VTPass integration
- Order tracking & webhooks

### Phase 3: Crypto Trading ✅

- Crypto wallet management (Venly integration)
- Buy/sell Bitcoin, Ethereum, USDT
- Crypto balance tracking
- Transaction monitoring
- Exchange rate management
- Webhook handling for crypto transactions

### Phase 4: Gift Card Trading (Admin Only)

- Gift card order management
- Admin approval system
- Rate management

### Phase 5: Mobile App (Planned)

- React Native + Expo implementation
- User authentication screens
- Wallet dashboard
- VTU service interfaces
- Transaction history
- Push notifications

### Phase 6: Web App (Basic Scaffold)

- Next.js application structure
- Basic routing setup

### Phase 7: Admin Dashboard (Basic Scaffold)

- Next.js admin interface
- User management
- Transaction monitoring
- System configuration

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run API tests
pnpm --filter @RaverPay/api test

# Run with coverage
pnpm --filter @RaverPay/api test:cov
```

## 🚢 Deployment

### API (Railway)

```bash
cd apps/raverpay-api
pnpm build
# Deploy to Railway
```

### Web/Admin (Vercel)

```bash
cd apps/raverpay-web
pnpm build
# Deploy to Vercel

cd apps/raverpay-admin
pnpm build
# Deploy to Vercel
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## 📊 Database

The app uses **PostgreSQL** with **Prisma ORM**.

Key models:

- `User` - User accounts with KYC tiers, authentication, and profile data
- `Wallet` - User wallets with balance tracking (Naira, Crypto, USD)
- `Transaction` - Double-entry transaction logs with full audit trail
- `RefreshToken` - JWT refresh token management
- `Device` - Device tracking for security
- `BankAccount` - User bank account information
- `VirtualAccount` - Paystack virtual accounts for funding
- `VTUOrder` - Airtime, data, cable TV, and electricity purchases
- `CryptoOrder` - Cryptocurrency buy/sell orders
- `CryptoTransaction` - Detailed crypto transaction records
- `CryptoBalance` - Real-time crypto wallet balances
- `CryptoConversion` - Crypto to Naira conversion tracking
- `GiftCardOrder` - Gift card trading orders
- `Notification` - User notifications (email, SMS, push, in-app)
- `NotificationPreference` - User notification settings
- `AuditLog` - Comprehensive audit logging
- `Conversation` - Support chat conversations
- `Message` - Support chat messages
- `Ticket` - Support tickets
- `CashbackWallet` - User cashback balance tracking
- `CashbackTransaction` - Cashback earnings and redemptions
- `P2PTransfer` - Peer-to-peer money transfers
- `RateLimitViolation` - Rate limiting tracking
- `DailyTransactionLimit` - Daily spending limits per user
- `SavedRecipient` - Saved VTU recipients
- `AccountDeletionRequest` - Account deletion workflow
- `InboundEmail` - Email processing for support
- `HelpCollection` & `HelpArticle` - Help center content
- `CannedResponse` - Support agent response templates
- `SystemConfig` - System-wide configuration
- `AppRatingConfig` - App rating prompt settings
- `ExchangeRate` - Currency exchange rates
- `CryptoPrice` - Cryptocurrency price data
- `VenlyUser` - Venly wallet integration
- `EmailRouting` - Email routing rules
- `WithdrawalConfig` - Withdrawal fee configuration
- `CryptoWebhookLog` - Crypto webhook processing logs
- `NotificationTemplate` - Notification template management
- `NotificationQueue` - Queued notifications
- `NotificationLog` - Notification delivery logs
- `RateLimitMetrics` - Rate limiting analytics

See [DATABASE.md](./docs/DATABASE.md) for full schema.

## 🔑 Environment Variables

See `.env.example` files in each app for required variables.

Critical variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `PAYSTACK_SECRET_KEY` - Paystack API key
- `VTPASS_API_KEY` - VTPass API key
- `RESEND_API_KEY` - Email service API key
- `VENLY_CLIENT_ID` - Venly crypto wallet API key
- `CLOUDINARY_CLOUD_NAME` - Media storage credentials

## 🤝 Contributing

This is a private project. For any questions, contact the development team.

## 📄 License

UNLICENSED - Private project

## 👨‍💻 Author

** RaverPay Fintech Team**

---

Built with ❤️ for Nigeria 🇳🇬
