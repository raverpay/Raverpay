# RaverPay API

A comprehensive fintech backend API built with NestJS, providing digital wallet services, VTU (Virtual Top-Up) purchases, and payment processing for Nigerian users.

## Overview

RaverPay API is a complete financial technology platform that enables users to manage digital wallets, purchase airtime and data bundles, pay bills, and perform financial transactions securely. The platform implements a tiered KYC (Know Your Customer) system with progressive transaction limits.

## Core Features

### Authentication & Security

- User registration with email and phone verification
- JWT-based authentication with refresh token support
- Secure password management with Argon2 hashing
- Password reset via email with OTP verification
- 4-digit transaction PIN for sensitive operations
- Multi-factor authentication support
- Session management with token revocation

### User Management

- Comprehensive user profiles (personal information, address, date of birth)
- Profile picture upload and management via Cloudinary
- Email and phone number verification with OTP
- Account deletion request workflow with admin approval
- One-time profile editing with admin override capability
- User role management (USER, ADMIN, SUPPORT)

### KYC (Know Your Customer) System

Four-tier verification system with progressive limits:

**Tier 0 - Unverified**

- Daily Limit: ₦50,000
- Monthly Limit: ₦50,000
- Requirements: Sign up only

**Tier 1 - Basic**

- Daily Limit: ₦300,000
- Monthly Limit: ₦1,000,000
- Requirements: Email and phone verification

**Tier 2 - Advanced**

- Daily Limit: ₦5,000,000
- Monthly Limit: ₦5,000,000
- Requirements: BVN (Bank Verification Number) verification

**Tier 3 - Premium**

- Daily Limit: Unlimited
- Monthly Limit: Unlimited
- Requirements: NIN (National Identification Number) verification

### Digital Wallet

- Real-time balance tracking with double-entry bookkeeping
- Ledger balance (includes pending transactions)
- Daily and monthly spending limit enforcement
- Wallet locking for security incidents
- Transaction history with advanced filtering and pagination
- Support for multiple transaction types

### Wallet Funding

**Card Payments:**

- Secure card payment via Paystack integration
- Real-time payment verification
- Automated webhook handling for instant crediting

**Virtual Accounts (Dedicated NUBAN):**

- Unique bank account number per user
- Automatic bank transfer detection
- BVN verification required for virtual account creation
- Support for multiple banking providers
- Requery functionality for pending transfers

### Withdrawals

- Bank transfer to any Nigerian bank
- Account name resolution and verification
- Transaction PIN required for authorization
- Automatic refund on failed withdrawals
- Fee structure: ₦25-₦100 depending on amount
- Real-time status tracking via webhooks

### VTU Services (Virtual Top-Up)

**Airtime Purchase:**

- All major Nigerian networks (MTN, GLO, Airtel, 9Mobile)
- Instant delivery
- Support for self-recharge and third-party recharge
- Recipient management

**Data Bundles:**

- Regular and SME data plans
- Multiple validity periods (7 days, 30 days, 365 days)
- Plan sizes from 500MB to 10GB
- Network-specific plan catalogs
- Automatic token/code delivery

**Cable TV Subscriptions:**

- DStv, GOtv, and StarTimes support
- Smart card validation before payment
- Customer name verification
- Multiple subscription packages
- Automatic renewal tracking

**Electricity Bills:**

- Support for all Nigerian DISCOs (power distribution companies)
- Prepaid and postpaid meter support
- Meter number validation
- Customer address verification
- Instant token delivery for prepaid meters
- Flexible amount selection

**Showmax:**

- Monthly subscription plans
- Multiple tier options
- Automated subscription management

**International Airtime & Data:**

- Multi-country support
- Multiple telecom operators per country
- Flexible denomination options
- Real-time exchange rate handling

### Order Management

- Complete order history with status tracking
- Order filtering by service type and date range
- Retry mechanism for failed orders
- Reference-based order lookup
- Saved recipients for quick repeat purchases

### Notifications System

**Multi-Channel Delivery:**

- Email notifications via Resend
- SMS notifications via Termii/VTPass
- Push notifications via OneSignal
- In-app notifications

**Notification Categories:**

- Transaction alerts (credits, debits, failures)
- Security notifications (login, password changes, PIN changes)
- KYC updates (verification status)
- Promotional messages
- System announcements

**User Preferences:**

- Per-channel enable/disable toggles
- Frequency controls (immediate, daily digest, weekly digest, never)
- Quiet hours/Do Not Disturb scheduling
- Category opt-in/opt-out management
- Timezone support

### Payment Processing

**Paystack Integration:**

- Card payments for wallet funding
- Bank transfers via virtual accounts
- Withdrawal processing
- BVN verification
- Webhook handling for automated processing

**VTPass Integration:**

- Airtime and data purchases
- Cable TV subscriptions
- Electricity bill payments
- International top-ups
- Real-time balance checking
- Webhook notifications for transaction status

### Transaction Types Supported

- Deposits (card, bank transfer)
- Withdrawals (bank transfer)
- P2P transfers (between RaverPay users)
- VTU purchases (airtime, data, cable TV, electricity)
- Subscription payments
- Refunds
- Fee deductions

### Audit & Compliance

- Transaction audit trail
- KYC compliance tracking
- Account deletion logging
- Admin action tracking
- Regulatory compliance support

## Technology Stack

### Core Framework

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **PostgreSQL** - Primary database
- **Prisma ORM** - Database toolkit and ORM

### Security

- **JWT** - JSON Web Tokens for authentication
- **Argon2** - Password hashing
- **Crypto** - BVN/NIN encryption
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### External Services

- **Paystack** - Payment processing, virtual accounts, transfers, BVN verification
- **VTPass** - VTU services (airtime, data, bills, SMS)
- **Cloudinary** - Image storage and CDN
- **Resend** - Transactional email delivery
- **Termii** - SMS delivery (alternative)
- **OneSignal** - Push notifications

### Additional Tools

- **Redis** - Caching (partial implementation)
- **Class Validator** - DTO validation
- **Class Transformer** - Object transformation

## API Endpoints Summary

### Authentication (8 endpoints)

- User registration
- Login/logout
- Token refresh
- Password reset workflow
- Email verification
- User profile retrieval

### User Management (14 endpoints)

- Profile CRUD operations
- Avatar upload/delete
- Password and PIN management
- Email/phone verification
- BVN/NIN verification
- Account deletion requests

### Wallet & Transactions (10 endpoints)

- Wallet balance and limits
- Transaction history
- Wallet lock/unlock
- Transaction details
- Funding and withdrawal

### Virtual Accounts (4 endpoints)

- Virtual account creation
- Account details retrieval
- Provider management
- Balance requery

### VTU Services (25+ endpoints)

- Product catalogs (airtime, data, cable TV, electricity, international)
- Account/meter validation
- Purchase endpoints for all services
- Order history and management
- Saved recipients

### Notifications (9 endpoints)

- Notification retrieval and filtering
- Read/unread management
- Notification deletion
- Preference management
- OneSignal integration

### Webhooks (3 endpoints)

- Paystack webhook handler
- VTPass webhook handler
- Payment status updates

## Key Features

### Security Features

- Encrypted BVN and NIN storage
- Transaction PIN for sensitive operations
- Wallet locking mechanism for fraud prevention
- Webhook signature verification
- Rate limiting on sensitive endpoints
- Login blocking for users with pending deletion

### Business Logic

- Double-entry bookkeeping for accurate balance tracking
- Automatic refunds on failed transactions
- Transaction fee calculation and deduction
- KYC tier-based limit enforcement
- Daily and monthly spending tracking
- Saved recipient management

### Developer Experience

- Comprehensive error handling
- Validation at DTO level
- Clear API response structures
- Detailed logging
- Webhook retry mechanisms
- Status tracking for async operations

## Planned Features (Not Yet Implemented)

### Gift Card Trading

- Buy gift cards (Amazon, Apple, Steam, etc.)
- Sell gift cards for cash
- Admin review workflow
- Country-based pricing
- Database models exist but no API implementation

### Crypto Trading

- Buy cryptocurrency (BTC, ETH, USDT)
- Sell cryptocurrency
- Multi-network support (BTC, ETH, TRC20, BEP20)
- Wallet address verification
- Database models exist but no API implementation

## Environment Requirements

- Node.js 18+ recommended
- PostgreSQL 14+
- Redis (optional, for caching)
- Cloudinary account for image uploads
- Paystack account for payments
- VTPass account for VTU services
- Resend account for emails
- OneSignal account for push notifications

## Database Architecture

### Key Models

- User (with KYC, verification, and security fields)
- Wallet (balance tracking, spending limits)
- Transaction (double-entry bookkeeping)
- VTUOrder (service purchases)
- BankAccount (withdrawal destinations)
- VirtualAccount (funding sources)
- Notification (multi-channel notifications)
- NotificationPreference (user preferences)
- RefreshToken (session management)
- AuditLog (compliance tracking)
- AccountDeletionRequest (deletion workflow)
- SavedRecipient (beneficiary management)

### Data Integrity

- Unique constraints on email, phone, BVN, NIN
- Foreign key relationships with cascade rules
- Indexed fields for query performance
- Timestamp tracking (created, updated)
- Soft delete support where applicable

## Webhook Integrations

### Paystack Webhooks

- `charge.success` - Payment confirmed
- `transfer.success` - Withdrawal completed
- `transfer.failed` - Withdrawal failed (auto-refund)
- `transfer.reversed` - Reversal processed
- `dedicatedaccount.assign.success` - Virtual account created

### VTPass Webhooks

- `transaction.success` - VTU order completed
- `transaction.failed` - VTU order failed
- `transaction.pending` - VTU order pending

## API Versioning

Current API version: v1 (implicit in base path `/api`)

## Response Format

All API responses follow a consistent structure with appropriate HTTP status codes and clear error messages. Validation errors include detailed field-level information.

## Rate Limiting

- Virtual account requery: Once every 10 minutes
- OTP requests: Standard rate limiting applied
- Webhook endpoints: No rate limiting (trusted sources with signature verification)

## Compliance & Regulations

- KYC verification required for higher transaction limits
- BVN and NIN data encrypted at rest
- 30-day data retention for deleted accounts
- Transaction audit trails
- Anti-money laundering (AML) considerations in tier limits

## Support

For API integration support, webhook configuration, or technical issues, contact the development team.

---

**Status:** Production-ready API with 80+ endpoints across 10 feature domains. Crypto and gift card features are planned but not yet implemented.
