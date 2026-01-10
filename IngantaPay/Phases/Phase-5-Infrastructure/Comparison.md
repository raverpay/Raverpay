# Phase 5: Current vs. Target Infrastructure

## Database

| Aspect             | Current             | Target                 |
| ------------------ | ------------------- | ---------------------- |
| Provider           | Supabase            | AWS                    |
| Service            | Supabase PostgreSQL | AWS RDS PostgreSQL     |
| Version            | Latest              | PostgreSQL 15+         |
| High Availability  | Supabase managed    | Multi-AZ (optional)    |
| Backups            | Supabase automated  | RDS automated + manual |
| Connection Pooling | Supabase            | RDS Proxy (optional)   |
| ORM                | Prisma              | Prisma (no change)     |

## API Hosting

| Aspect         | Current                     | Target                           |
| -------------- | --------------------------- | -------------------------------- |
| Provider       | Railway                     | AWS                              |
| Service        | Railway Container           | ECS Fargate or Elastic Beanstalk |
| Auto-scaling   | Railway managed             | ECS auto-scaling                 |
| Load Balancing | Railway managed             | ALB (Application Load Balancer)  |
| Deployment     | Git push                    | ECR + ECS or EB deploy           |
| SSL            | Railway managed             | ACM + ALB                        |
| Domain         | Railway subdomain or custom | Route 53 or existing DNS         |

## Admin Dashboard Hosting

| Aspect   | Current           | Target                             |
| -------- | ----------------- | ---------------------------------- |
| Provider | Railway           | AWS                                |
| Service  | Railway Container | Amplify or S3 + CloudFront         |
| Type     | Server-rendered   | Can stay server-rendered or static |
| CDN      | None              | CloudFront                         |
| SSL      | Railway managed   | ACM                                |

## Caching (Redis)

| Aspect       | Current       | Target               |
| ------------ | ------------- | -------------------- |
| Provider     | Railway addon | AWS                  |
| Service      | Railway Redis | ElastiCache Redis    |
| Cluster Mode | Single node   | Cluster (optional)   |
| Encryption   | Unknown       | At rest + in transit |

## File Storage

| Aspect          | Current           | Target                   |
| --------------- | ----------------- | ------------------------ |
| Provider        | Various/Supabase  | AWS                      |
| Service         | Supabase Storage  | S3                       |
| CDN             | None              | CloudFront               |
| Access Control  | Supabase policies | S3 bucket policies + IAM |
| Pre-signed URLs | Supabase          | AWS SDK                  |

## Email Service

| Aspect         | Current      | Target Option 1            | Target Option 2 |
| -------------- | ------------ | -------------------------- | --------------- |
| Provider       | Resend       | AWS SES                    | Keep Resend     |
| Cost           | $20-50/month | Pay per send (~$0.10/1000) | $20-50/month    |
| Templates      | Handlebars   | Handlebars                 | Handlebars      |
| Deliverability | Good         | Excellent (after warmup)   | Good            |

## SMS Service

| Aspect           | Current      | Target                      |
| ---------------- | ------------ | --------------------------- |
| Provider         | Unknown      | AWS SNS or Africa's Talking |
| Nigeria Coverage | Via provider | Africa's Talking better     |
| Uganda Coverage  | Via provider | Africa's Talking better     |
| Cost             | Varies       | Varies by region            |

## Background Jobs

| Aspect  | Current         | Target              |
| ------- | --------------- | ------------------- |
| Queue   | BullMQ          | BullMQ (keep)       |
| Backend | Redis (Railway) | ElastiCache Redis   |
| Workers | In-process      | ECS tasks or Lambda |

## Monitoring

| Aspect  | Current           | Target                  |
| ------- | ----------------- | ----------------------- |
| Errors  | Sentry            | Keep Sentry             |
| Logs    | Console/Railway   | CloudWatch Logs         |
| Metrics | Railway dashboard | CloudWatch Metrics      |
| Alerts  | Sentry            | CloudWatch Alarms + SNS |
| APM     | Unknown           | X-Ray (optional)        |

## Secrets Management

| Aspect   | Current          | Target                       |
| -------- | ---------------- | ---------------------------- |
| Storage  | .env files       | AWS Secrets Manager          |
| Rotation | Manual           | Automatic (optional)         |
| Access   | Environment vars | SDK or environment injection |

## Third-Party Services (NO CHANGE)

| Service      | Status  | Notes                              |
| ------------ | ------- | ---------------------------------- |
| Paystack     | ✅ KEEP | Primary payment processor          |
| Flutterwave  | ✅ KEEP | Secondary payment processor        |
| Circle       | ✅ KEEP | USDC/crypto wallets                |
| VTPass       | ✅ KEEP | VTU services (airtime, data, etc.) |
| Google OAuth | ✅ KEEP | Social login                       |
| Apple OAuth  | ✅ KEEP | Social login                       |
| Expo         | ✅ KEEP | Mobile platform                    |
| EAS          | ✅ KEEP | Mobile build service               |
| Sentry       | ✅ KEEP | Error tracking                     |

---

## Cost Comparison

### Current (Estimated)

| Service               | Monthly Cost |
| --------------------- | ------------ |
| Railway (API + Admin) | $20-50       |
| Supabase (Database)   | $25-60       |
| Redis (Railway addon) | $5-20        |
| Resend (Email)        | $20-50       |
| Domain                | $1-2         |
| **Total**             | **$71-182**  |

### Target AWS (Estimated)

| Service            | Monthly Cost |
| ------------------ | ------------ |
| RDS (db.t3.medium) | $50-100      |
| ECS/Fargate        | $50-150      |
| ElastiCache        | $30-60       |
| S3 + CloudFront    | $10-30       |
| ALB                | $20-30       |
| Route 53           | $10-15       |
| CloudWatch         | $10-20       |
| SES (optional)     | $10-30       |
| **Total**          | **$190-435** |

### Analysis

- AWS is **2-3x more expensive** for similar setup
- AWS provides **better scalability** and **enterprise features**
- AWS provides **more control** over infrastructure
- **Reserved instances** can reduce costs by 30-50%
- **Savings Plans** available for consistent workloads

---

## Migration Priority

| Component       | Priority | Risk   | Notes                      |
| --------------- | -------- | ------ | -------------------------- |
| Database        | High     | High   | Core of application        |
| API Hosting     | High     | Medium | Can roll back quickly      |
| Redis           | Medium   | Medium | Stateless, easy to migrate |
| File Storage    | Medium   | Low    | Can run parallel           |
| Email           | Low      | Low    | Can switch anytime         |
| Admin Dashboard | Low      | Low    | Stateless                  |

---

## Recommended Migration Order

1. **S3 + CloudFront** - Low risk, can run parallel
2. **ElastiCache** - Quick to set up and switch
3. **RDS** - Critical, needs careful planning
4. **ECS/Fargate** - After database is stable
5. **Admin Dashboard** - Low priority
6. **Email (Optional)** - Only if needed
