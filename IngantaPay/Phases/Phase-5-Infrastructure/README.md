# Phase 5: Infrastructure Migration

## Overview

This phase focuses on migrating the IngantaPay infrastructure from current providers to AWS and other enterprise-grade solutions as requested by the client.

## Objectives

1. Document current infrastructure and services
2. Plan migration to AWS
3. Identify services to keep vs. replace
4. Create migration roadmap
5. Execute migration with minimal downtime

## Current Infrastructure Analysis

Based on the codebase, the following services are currently in use:

### Database
| Current | Target | Notes |
|---------|--------|-------|
| Supabase PostgreSQL | AWS RDS PostgreSQL | Direct migration possible |
| Prisma ORM | Prisma ORM | Keep - works with any PostgreSQL |

### Hosting
| Current | Target | Notes |
|---------|--------|-------|
| Railway (API) | AWS ECS/Fargate or Elastic Beanstalk | Container-based deployment |
| Railway (Admin) | AWS Amplify or S3+CloudFront | Static site hosting |
| N/A | AWS EC2 (if needed) | Alternative for API |

### File Storage
| Current | Target | Notes |
|---------|--------|-------|
| Supabase Storage (if used) | AWS S3 | Standard migration |
| Any cloud storage | AWS S3 | For KYC documents |

### CDN & Assets
| Current | Target | Notes |
|---------|--------|-------|
| Various | AWS CloudFront | For static assets, images |

### Email Service
| Current | Target | Notes |
|---------|--------|-------|
| Resend | AWS SES | Cost-effective at scale |
| OR Keep Resend | Resend | Good DX, can keep |

### SMS Service
| Current (if any) | Target | Notes |
|-----------------|--------|-------|
| Twilio | AWS SNS | For OTP, notifications |
| Africa's Talking | Keep | Better for African carriers |

### Background Jobs
| Current | Target | Notes |
|---------|--------|-------|
| BullMQ (Redis) | AWS ElastiCache + BullMQ | Keep architecture |
| N/A | AWS SQS + Lambda | Alternative |

### Caching
| Current | Target | Notes |
|---------|--------|-------|
| Redis (Railway addon) | AWS ElastiCache Redis | Direct migration |

### Monitoring
| Current | Target | Notes |
|---------|--------|-------|
| Sentry | Keep Sentry | Excellent error tracking |
| N/A | AWS CloudWatch | Add for infra monitoring |

### Auth & Security
| Current | Target | Notes |
|---------|--------|-------|
| JWT (custom) | Keep | Works fine |
| Passport.js | Keep | Works fine |

### Payment Providers (KEEP ALL)
| Service | Purpose | Recommendation |
|---------|---------|----------------|
| Paystack | NGN payments, DVA | ✅ KEEP |
| Flutterwave | Alternative payments | ✅ KEEP |
| Circle | USDC, crypto wallets | ✅ KEEP |
| VTPass | Airtime, data, bills | ✅ KEEP |

### Third-Party Integrations (KEEP ALL)
| Service | Purpose | Recommendation |
|---------|---------|----------------|
| Expo | Mobile app platform | ✅ KEEP |
| Google OAuth | Social login | ✅ KEEP |
| Apple OAuth | Social login (iOS) | ✅ KEEP |

## Timeline Estimate
- **Planning**: 1-2 weeks
- **Development/Setup**: 2-3 weeks
- **Testing**: 1 week
- **Migration**: 1-2 days (with maintenance window)
- **Total**: 5-7 weeks

## Risk Level
**High** - Database migration and infrastructure changes require careful planning and testing.

## Dependencies
- AWS Account setup
- IAM roles and permissions
- VPC configuration
- Domain/DNS management access

## IMPORTANT
This phase should be executed **after** all core functionality is complete and stable. Migration introduces risk and should not be done while actively developing features.
