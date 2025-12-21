---
name: Monitoring & Queue Infrastructure Implementation
overview: Implement BullMQ for job queues, Sentry for error tracking, Logtail for log aggregation, PostHog for analytics, and enable Prisma Pulse for database monitoring. Migrate existing database-backed notification queue to BullMQ.
todos:
  - id: bullmq-setup
    content: Install BullMQ dependencies and create queue module with Redis connection
    status: completed
  - id: bullmq-notification-processor
    content: Create notification processor to migrate from database queue to BullMQ
    status: completed
    dependencies:
      - bullmq-setup
  - id: bullmq-webhook-processor
    content: Create webhook retry processor for failed webhook processing
    status: completed
    dependencies:
      - bullmq-setup
  - id: bullmq-reconciliation-processor
    content: Create reconciliation processor for stuck transaction checking
    status: completed
    dependencies:
      - bullmq-setup
  - id: migrate-notification-system
    content: Update notification dispatcher to use BullMQ instead of database queue
    status: completed
    dependencies:
      - bullmq-notification-processor
  - id: sentry-setup
    content: Install Sentry, initialize in main.ts, and create exception filter
    status: completed
  - id: sentry-performance
    content: Add performance monitoring to critical endpoints
    status: pending
    dependencies:
      - sentry-setup
  - id: logtail-setup
    content: Install Logtail, create custom logger service, and integrate with NestJS Logger
    status: completed
  - id: logtail-request-interceptor
    content: Create request logging interceptor for structured HTTP request logging
    status: completed
    dependencies:
      - logtail-setup
  - id: posthog-setup
    content: Install PostHog and create analytics service
    status: completed
  - id: posthog-event-tracking
    content: Add event tracking to transactions, VTU, and payment endpoints
    status: completed
    dependencies:
      - posthog-setup
  - id: prisma-pulse
    content: Enable Prisma Pulse and create monitoring service for database changes
    status: pending
  - id: env-config
    content: Add all new environment variables and update configuration service
    status: completed
  - id: testing
    content: Write unit and integration tests for all new services
    status: pending
    dependencies:
      - bullmq-setup
      - sentry-setup
      - logtail-setup
      - posthog-setup
  - id: documentation
    content: Update README and document monitoring setup and environment variables
    status: pending
---

# Monitoring & Queue Infrastructure Implementation Plan

## Overview

This plan implements production-grade monitoring, logging, analytics, and queue infrastructure for RaverPay API. It includes migrating from database-backed queues to BullMQ, adding error tracking, log aggregation, product analytics, and database monitoring.

## Architecture Changes

### Current State

- Database-backed notification queue (`NotificationQueue` table with cron processor)
- NestJS Logger for basic logging
- No error tracking service
- No log aggregation
- No product analytics
- No database monitoring

### Target State

- BullMQ for all background jobs (notifications, webhooks, reconciliation)
- Sentry for error tracking and performance monitoring
- Logtail for centralized log aggregation
- PostHog for product analytics and feature flags
- Prisma Pulse for database change monitoring
- UptimeRobot for external uptime monitoring (configuration only)

## Implementation Phases

### Phase 1: BullMQ Setup & Migration (Priority: High)

#### 1.1 Install Dependencies

- Install `@nestjs/bullmq`, `bullmq`, `ioredis` (already installed)
- Update `package.json` in `apps/raverpay-api/`

#### 1.2 Create BullMQ Module

- Create `apps/raverpay-api/src/queue/queue.module.ts`
- Configure BullMQ with Redis connection (use existing Upstash Redis)
- Set up queue configuration with retry strategies

#### 1.3 Create Queue Processors

- **Notification Queue**: `apps/raverpay-api/src/queue/processors/notification.processor.ts`
- Migrate from `NotificationQueueProcessor` cron-based system
- Process EMAIL, SMS, PUSH, IN_APP notifications
- Implement rate limiting per channel
- Handle retries with exponential backoff
- **Webhook Retry Queue**: `apps/raverpay-api/src/queue/processors/webhook-retry.processor.ts`
- Retry failed webhook processing (Paystack, Circle, VTPass)
- Exponential backoff strategy
- **Reconciliation Queue**: `apps/raverpay-api/src/queue/processors/reconciliation.processor.ts`
- Check stuck transactions (PENDING/PROCESSING > 30 minutes)
- Query processor APIs for actual status
- Update transaction status based on processor response

#### 1.4 Update Notification System

- Modify `apps/raverpay-api/src/notifications/notification-dispatcher.service.ts`
- Replace database queue writes with BullMQ job creation
- Remove dependency on `NotificationQueueProcessor`
- Update `apps/raverpay-api/src/notifications/notifications.module.ts`
- Import `QueueModule` instead of `NotificationQueueProcessor`
- Remove cron-based processor

#### 1.5 Update Webhook Handlers

- Modify `apps/raverpay-api/src/webhooks/paystack-webhook.service.ts`
- Add webhook retry queue on processing failure
- Modify `apps/raverpay-api/src/circle/webhooks/circle-webhook.service.ts`
- Add webhook retry queue on processing failure

#### 1.6 Database Migration

- Keep `NotificationQueue` table for backward compatibility (deprecate gradually)
- Add migration to mark old queue entries as migrated

### Phase 2: Sentry Integration (Priority: Critical)

#### 2.1 Install Dependencies

- Install `@sentry/node`, `@sentry/profiling-node`
- Update `package.json`

#### 2.2 Initialize Sentry

- Create `apps/raverpay-api/src/common/sentry/sentry.service.ts`
- Initialize Sentry in `apps/raverpay-api/src/main.ts` before app creation
- Configure environment, release tracking, performance monitoring

#### 2.3 Create Exception Filter

- Create `apps/raverpay-api/src/common/filters/sentry-exception.filter.ts`
- Capture all exceptions with context (user ID, request data, transaction IDs)
- Filter sensitive data (passwords, tokens, BVN)
- Integrate with existing error handling

#### 2.4 Add Performance Monitoring

- Instrument critical endpoints:
- Transaction endpoints (`apps/raverpay-api/src/transactions/`)
- Payment endpoints (`apps/raverpay-api/src/payments/`)
- VTU endpoints (`apps/raverpay-api/src/vtu/`)
- Webhook endpoints (`apps/raverpay-api/src/webhooks/`)

#### 2.5 Configure Release Tracking

- Add release tracking for deployments
- Link Sentry to GitHub for commit tracking

### Phase 3: Logtail Integration (Priority: High)

#### 3.1 Install Dependencies

- Install `@logtail/node`, `@logtail/winston` (optional Winston integration)
- Update `package.json`

#### 3.2 Create Logtail Service

- Create `apps/raverpay-api/src/common/logging/logtail.service.ts`
- Create custom NestJS logger that extends NestJS Logger
- Integrate with Logtail API

#### 3.3 Replace NestJS Logger

- Create `apps/raverpay-api/src/common/logging/custom-logger.service.ts`
- Extend NestJS Logger to send logs to Logtail
- Maintain console output for local development
- Add structured logging with context (user ID, transaction ID, request ID)

#### 3.4 Update Main Bootstrap

- Replace default logger in `apps/raverpay-api/src/main.ts`
- Configure log levels per environment

#### 3.5 Add Request Logging Interceptor

- Create `apps/raverpay-api/src/common/interceptors/request-logger.interceptor.ts`
- Log all HTTP requests with:
- Request method, path, query, body (sanitized)
- Response status, duration
- User ID, IP address
- Transaction IDs (if applicable)

### Phase 4: PostHog Integration (Priority: Medium)

#### 4.1 Install Dependencies

- Install `posthog-node`
- Update `package.json`

#### 4.2 Create PostHog Service

- Create `apps/raverpay-api/src/common/analytics/posthog.service.ts`
- Initialize PostHog client
- Create wrapper methods for tracking events

#### 4.3 Add Event Tracking

- **Transaction Events**: Track in `apps/raverpay-api/src/transactions/transactions.service.ts`
- `transaction_initiated`, `transaction_completed`, `transaction_failed`
- Include: type, amount, status, user_id
- **VTU Events**: Track in `apps/raverpay-api/src/vtu/vtu.service.ts`
- `vtu_purchase_initiated`, `vtu_purchase_completed`, `vtu_purchase_failed`
- Include: service_type, amount, network, status
- **Payment Events**: Track in `apps/raverpay-api/src/payments/payments.controller.ts`
- `payment_initiated`, `payment_successful`, `payment_failed`
- Include: amount, method, status

#### 4.4 Add User Identification

- Identify users on login in `apps/raverpay-api/src/auth/auth.service.ts`
- Set user properties (KYC tier, account status)

#### 4.5 Add Feature Flags (Optional)

- Use PostHog feature flags for gradual rollouts
- Example: New VTU provider rollout

### Phase 5: Prisma Pulse Setup (Priority: Low)

#### 5.1 Enable Prisma Pulse

- Update `apps/raverpay-api/prisma/schema.prisma`
- Add Pulse configuration for real-time database events

#### 5.2 Create Pulse Service

- Create `apps/raverpay-api/src/common/monitoring/prisma-pulse.service.ts`
- Subscribe to transaction changes
- Subscribe to wallet balance changes
- Log significant events to Logtail

### Phase 6: Environment Configuration

#### 6.1 Add Environment Variables

Update `.env.example` and document:

```env
# BullMQ
REDIS_URL=redis://...

# Sentry
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0

# Logtail
LOGTAIL_SOURCE_TOKEN=...

# PostHog
POSTHOG_API_KEY=...
POSTHOG_HOST=https://app.posthog.com

# Uptime Monitoring (external config)
UPTIME_ROBOT_API_KEY=... (optional)
```



#### 6.2 Update Configuration Service

- Add new config values to `apps/raverpay-api/src/common/config/`
- Validate required environment variables on startup

### Phase 7: Testing & Validation

#### 7.1 Unit Tests

- Test BullMQ processors
- Test Sentry exception filter
- Test Logtail service
- Test PostHog service

#### 7.2 Integration Tests

- Test queue job processing
- Test error tracking
- Test log aggregation
- Test analytics tracking

#### 7.3 Manual Testing

- Verify notifications are processed via BullMQ
- Verify errors are captured in Sentry
- Verify logs appear in Logtail
- Verify events appear in PostHog

### Phase 8: Documentation & Deployment

#### 8.1 Update Documentation

- Update `apps/raverpay-api/README.md` with new services
- Document environment variables
- Document monitoring setup

#### 8.2 Deployment Checklist

- Set environment variables in Railway
- Verify Redis connection for BullMQ
- Verify Sentry DSN is set
- Verify Logtail token is set
- Verify PostHog API key is set
- Configure UptimeRobot (external)

#### 8.3 Monitoring Setup

- Set up Sentry alerts for critical errors
- Set up Logtail alerts for error patterns
- Set up UptimeRobot monitors for API health endpoint
- Configure PostHog dashboards

## File Structure

```javascript
apps/raverpay-api/src/
├── queue/
│   ├── queue.module.ts
│   ├── queue.service.ts
│   └── processors/
│       ├── notification.processor.ts
│       ├── webhook-retry.processor.ts
│       └── reconciliation.processor.ts
├── common/
│   ├── sentry/
│   │   └── sentry.service.ts
│   ├── filters/
│   │   └── sentry-exception.filter.ts
│   ├── logging/
│   │   ├── logtail.service.ts
│   │   └── custom-logger.service.ts
│   ├── interceptors/
│   │   └── request-logger.interceptor.ts
│   ├── analytics/
│   │   └── posthog.service.ts
│   └── monitoring/
│       └── prisma-pulse.service.ts
```



## Migration Strategy

### Notification Queue Migration

1. Deploy BullMQ alongside existing system
2. Process new notifications via BullMQ
3. Keep processing old database queue entries via cron (temporary)
4. After 7 days, remove database queue processor
5. Keep `NotificationQueue` table for audit trail

### Zero-Downtime Deployment

- Deploy in stages (BullMQ first, then monitoring)
- Use feature flags to enable/disable new systems
- Monitor error rates during migration

## Success Criteria

1. All notifications processed via BullMQ
2. All errors captured in Sentry with context
3. All logs aggregated in Logtail
4. Key events tracked in PostHog
5. Database changes monitored via Prisma Pulse
6. No increase in error rates during migration
7. Queue processing latency < 5 seconds
8. 100% error capture rate in Sentry

## Rollback Plan

- Keep old notification queue processor code for 2 weeks
- Can disable new services via environment variables
- Database queue can be re-enabled if needed
- All changes are backward compatible

## Estimated Timeline

- Phase 1 (BullMQ): 2-3 days
- Phase 2 (Sentry): 1 day
- Phase 3 (Logtail): 1 day
- Phase 4 (PostHog): 1 day
- Phase 5 (Prisma Pulse): 0.5 days
- Phase 6 (Config): 0.5 days
- Phase 7 (Testing): 1-2 days
- Phase 8 (Docs/Deploy): 0.5 days

**Total: 7-10 days**

## Dependencies

- Existing Redis (Upstash) - already configured
- Sentry account (free tier to start)
- Logtail account (free tier to start)
- PostHog account (free tier to start)
- UptimeRobot account (free tier)

## Risk Mitigation

- Test BullMQ migration in staging first
- Monitor queue processing closely after deployment