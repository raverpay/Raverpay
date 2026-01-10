# Phase 5: Detailed Tasks

## Prerequisites

- [ ] All core features complete and stable
- [ ] AWS Account created and configured
- [ ] Domain access for DNS changes
- [ ] Backup strategy in place

---

## Part A: AWS Setup

### A.1 Account Configuration

- [ ] Create AWS account (if not exists)
- [ ] Set up billing alerts
- [ ] Create IAM admin user
- [ ] Enable MFA for root account

### A.2 VPC Setup

- [ ] Create VPC for IngantaPay
- [ ] Configure subnets (public/private)
- [ ] Set up Internet Gateway
- [ ] Configure NAT Gateway
- [ ] Set up Security Groups

### A.3 IAM Roles

- [ ] Create role for ECS/EC2
- [ ] Create role for Lambda (if used)
- [ ] Create role for RDS access
- [ ] Set up service-linked roles

---

## Part B: Database Migration

### B.1 RDS Setup

- [ ] Create RDS PostgreSQL instance
- [ ] Configure security group
- [ ] Set up parameter group
- [ ] Enable automated backups
- [ ] Configure multi-AZ (for production)

### B.2 Data Migration

- [ ] Create database dump from Supabase
- [ ] Test restore to local PostgreSQL
- [ ] Upload to RDS
- [ ] Verify data integrity
- [ ] Test application connection

### B.3 Connection Update

- [ ] Update DATABASE_URL in API
- [ ] Update DIRECT_URL in API
- [ ] Test Prisma connection
- [ ] Run migrations on new database

---

## Part C: API Hosting Migration

### C.1 Option A: ECS/Fargate

- [ ] Create ECR repository
- [ ] Build Docker image
- [ ] Push to ECR
- [ ] Create ECS cluster
- [ ] Create task definition
- [ ] Create service
- [ ] Configure load balancer

### C.1 Option B: Elastic Beanstalk

- [ ] Create EB application
- [ ] Create environment
- [ ] Configure environment variables
- [ ] Deploy application
- [ ] Configure load balancer

### C.2 Domain & SSL

- [ ] Request ACM certificate
- [ ] Configure Route 53 (or existing DNS)
- [ ] Set up HTTPS
- [ ] Configure health checks

---

## Part D: Redis Migration

### D.1 ElastiCache Setup

- [ ] Create ElastiCache Redis cluster
- [ ] Configure security group
- [ ] Enable encryption at rest
- [ ] Enable encryption in transit

### D.2 Connection Update

- [ ] Update REDIS_URL in API
- [ ] Test connection
- [ ] Verify BullMQ functionality

---

## Part E: File Storage (S3)

### E.1 S3 Setup

- [ ] Create S3 buckets:
  - [ ] ingantapay-documents (KYC)
  - [ ] ingantapay-assets (public)
  - [ ] ingantapay-backups (private)
- [ ] Configure bucket policies
- [ ] Set up CORS
- [ ] Enable versioning

### E.2 CloudFront

- [ ] Create distribution for assets
- [ ] Configure SSL certificate
- [ ] Set up custom domain (optional)

### E.3 Code Updates

- [ ] Update file upload service
- [ ] Configure AWS SDK
- [ ] Update pre-signed URL generation

---

## Part F: Admin Dashboard Hosting

### F.1 Option A: Amplify

- [ ] Create Amplify app
- [ ] Connect to GitHub repo
- [ ] Configure build settings
- [ ] Set up custom domain

### F.1 Option B: S3 + CloudFront

- [ ] Build Next.js static export
- [ ] Upload to S3
- [ ] Configure CloudFront
- [ ] Set up custom domain

---

## Part G: Email Service Migration (Optional)

### G.1 AWS SES Setup

- [ ] Verify domain
- [ ] Verify email addresses
- [ ] Request production access
- [ ] Configure DKIM/SPF

### G.2 Code Updates

- [ ] Update email service
- [ ] Configure SES SDK
- [ ] Update templates
- [ ] Test sending

---

## Part H: Monitoring & Logging

### H.1 CloudWatch Setup

- [ ] Create log groups
- [ ] Set up alarms
- [ ] Configure dashboards
- [ ] Set up SNS notifications

### H.2 Application Logging

- [ ] Update logging to CloudWatch
- [ ] Configure log retention
- [ ] Set up error alerting

---

## Part I: Environment Variables

### I.1 Secrets Manager

- [ ] Store all secrets in Secrets Manager
- [ ] Update application to fetch secrets
- [ ] Remove hardcoded secrets

### I.2 Environment Updates

Update all secrets:

- [ ] DATABASE_URL
- [ ] REDIS_URL
- [ ] JWT_SECRET
- [ ] PAYSTACK_SECRET_KEY
- [ ] CIRCLE_API_KEY
- [ ] All other API keys

---

## Part J: Testing

### J.1 Staging Environment

- [ ] Deploy to staging
- [ ] Test all API endpoints
- [ ] Test database operations
- [ ] Test file uploads
- [ ] Test email sending
- [ ] Test background jobs

### J.2 Load Testing

- [ ] Run load tests
- [ ] Verify auto-scaling
- [ ] Check performance metrics

---

## Part K: Migration Execution

### K.1 Pre-Migration

- [ ] Announce maintenance window
- [ ] Create final backup
- [ ] Document rollback procedure

### K.2 Migration Steps

1. [ ] Enable maintenance mode
2. [ ] Final data sync
3. [ ] Update DNS records
4. [ ] Deploy to AWS
5. [ ] Verify functionality
6. [ ] Disable maintenance mode

### K.3 Post-Migration

- [ ] Monitor for errors
- [ ] Verify all features work
- [ ] Check performance
- [ ] Update documentation

---

## Rollback Plan

If migration fails:

1. Revert DNS to original servers
2. Verify Railway services running
3. Investigate and fix issues
4. Schedule retry

---

## Cost Estimation

| Service            | Estimated Monthly Cost |
| ------------------ | ---------------------- |
| RDS (db.t3.medium) | $50-100                |
| ECS/Fargate        | $50-150                |
| ElastiCache        | $30-60                 |
| S3 + CloudFront    | $10-30                 |
| Load Balancer      | $20-30                 |
| Route 53           | $10-15                 |
| CloudWatch         | $10-20                 |
| **Total**          | **$180-405/month**     |

_Costs vary based on usage and region_

---

## Services to Keep

| Service     | Reason                                     |
| ----------- | ------------------------------------------ |
| VTPass      | Airtime/data provider - no AWS alternative |
| Paystack    | Payment processor - keep                   |
| Flutterwave | Payment processor - keep                   |
| Circle      | Crypto/USDC - keep                         |
| Sentry      | Error tracking - excellent product         |
| Expo        | Mobile platform - essential                |
