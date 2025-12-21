---
name: Monitoring Services Testing Plan
overview: Create a comprehensive testing plan to verify PostHog, Logtail, Sentry, and BullMQ are working correctly. Each service will be tested individually with specific API calls and dashboard verification steps.
todos:
  - id: test-posthog
    content: 'Test PostHog: User identification, transaction events, VTU events, payment events'
    status: completed
  - id: test-logtail
    content: 'Test Logtail: HTTP request logs, error logs, application logs with context'
    status: completed
  - id: test-sentry
    content: 'Test Sentry: Error capture, user context, sensitive data filtering'
    status: pending
  - id: test-bullmq
    content: 'Test BullMQ: Queue initialization, notification processing, webhook retry, reconciliation'
    status: pending
---

# Monitoring Servi

ces Testing Plan

## Overview

This plan provides step-by-step instructions to test each monitoring service (PostHog, Logtail, Sentry, BullMQ) individually. Each test includes specific API calls to make and what to verify in the respective dashboards.

## Prerequisites

- Server running on `http://localhost:3001`
- Login credentials: `codeswithjoseph@gmail.com` / `6thbornR%`
- Environment variables configured for each service
- Access to each service's dashboard

## Testing Order

1. **PostHog** - Analytics and event tracking
2. **Logtail** - Log aggregation
3. **Sentry** - Error tracking
4. **BullMQ** - Queue processing (if enabled)

---

## Phase 1: PostHog Testing

### Step 1.1: Verify PostHog Initialization

**Check Server Logs:**

- Look for: `✅ PostHog initialized` in startup logs
- If missing: Check `POSTHOG_API_KEY` and `POSTHOG_HOST` environment variables

**Dashboard Check:**

- Go to https://app.posthog.com
- Navigate to **Project Settings** → **API Keys**
- Verify your API key is active

### Step 1.2: Test User Identification

**API Call:**

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "identifier": "codeswithjoseph@gmail.com",
  "password": "6thbornR%"
}
```

**What Happens:**

- User is identified in PostHog with properties (email, phone, KYC tier, etc.)
- Event: `$identify` is sent

**Dashboard Verification:**

1. Go to PostHog dashboard → **Persons**
2. Search for user ID or email: `codeswithjoseph@gmail.com`
3. Verify user properties:

- `email`: codeswithjoseph@gmail.com
- `kycTier`: Should show current tier
- `status`: Should show account status
- `emailVerified`: true/false
- `phoneVerified`: true/false

**Expected Result:** User appears in Persons list with all properties set

### Step 1.3: Test Transaction Events

**API Call (Initialize Payment):**

```bash
POST http://localhost:3001/api/transactions/deposit/initialize
Authorization: Bearer <access_token_from_login>
Content-Type: application/json

{
  "amount": 1000
}
```

**What Happens:**

- Event: `deposit_initiated` is captured
- Event: `transaction_initiated` is captured (type: DEPOSIT)

**Dashboard Verification:**

1. Go to PostHog dashboard → **Activity**
2. Filter by event: `deposit_initiated` or `transaction_initiated`
3. Verify event properties:

- `amount`: 1000
- `paymentMethod`: "card"
- `provider`: "paystack"
- `kycTier`: User's KYC tier
- `reference`: Transaction reference

**Expected Result:** Events appear in Activity feed within 10-20 seconds (flush interval)

### Step 1.4: Test VTU Purchase Events

**API Call (Purchase Airtime):**

```bash
POST http://localhost:3001/api/vtu/airtime/purchase
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "network": "MTN",
  "phone": "08012345678",
  "amount": 500,
  "pin": "1234"
}
```

**What Happens:**

- Event: `vtu_purchase_initiated` is captured
- Event: `vtu_purchase_completed` or `vtu_purchase_failed` is captured

**Dashboard Verification:**

1. Go to PostHog dashboard → **Activity**
2. Filter by event: `vtu_purchase_initiated`
3. Verify event properties:

- `serviceType`: "AIRTIME"
- `amount`: 500
- `network`: "MTN"
- `recipient`: "08012345678"
- `provider`: "VTPASS"

**Expected Result:** VTU purchase events appear in Activity feed

### Step 1.5: Test P2P Transfer Events

**API Call (Send Money):**

```bash
POST http://localhost:3001/api/transactions/p2p/send
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "recipientTag": "<another_user_tag>",
  "amount": 100,
  "message": "Test transfer"
}
```

**What Happens:**

- Event: `transaction_initiated` (type: P2P_TRANSFER)
- Event: `transaction_completed` (type: P2P_TRANSFER)

**Dashboard Verification:**

1. Go to PostHog dashboard → **Activity**
2. Filter by event: `transaction_completed`
3. Filter by properties: `type: P2P_TRANSFER`
4. Verify event properties for both sender and receiver

**Expected Result:** P2P transfer events appear for both sender and receiver---

## Phase 2: Logtail Testing

### Step 2.1: Verify Logtail Initialization

**Check Server Logs:**

- Look for: `✅ Logtail initialized` in startup logs
- If missing: Check `LOGTAIL_SOURCE_TOKEN` environment variable

**Dashboard Check:**

- Go to https://logtail.com
- Navigate to **Sources** → Verify your source token is active

### Step 2.2: Test Application Logs

**API Call (Any endpoint):**

```bash
GET http://localhost:3001/api/transactions/history
Authorization: Bearer <access_token>
```

**What Happens:**

- Request is logged via `RequestLoggerInterceptor`
- Log includes: method, path, status, duration, user ID

**Dashboard Verification:**

1. Go to Logtail dashboard → **Live Tail** or **Search**
2. Filter by context: `RequestLogger`
3. Look for log entry with:

- `method`: "GET"
- `path`: "/api/transactions/history"
- `statusCode`: 200
- `userId`: User ID
- `duration`: Request duration in ms

**Expected Result:** HTTP request logs appear in Logtail within 1-2 seconds

### Step 2.3: Test Error Logs

**API Call (Trigger Error):**

```bash
GET http://localhost:3001/api/transactions/invalid-endpoint
Authorization: Bearer <access_token>
```

**What Happens:**

- 404 error is logged
- Error log sent to Logtail

**Dashboard Verification:**

1. Go to Logtail dashboard → **Search**
2. Filter by level: `error` or `warn`
3. Look for log entry with:

- `statusCode`: 404
- `path`: "/api/transactions/invalid-endpoint"
- Error message

**Expected Result:** Error logs appear in Logtail

### Step 2.4: Test Custom Logger

**Check Server Logs:**

- Any `this.logger.log()`, `this.logger.error()`, etc. calls should appear in Logtail
- Example: Login logs, transaction logs, etc.

**Dashboard Verification:**

1. Go to Logtail dashboard → **Search**
2. Filter by context: Service names (e.g., `AuthService`, `TransactionsService`)
3. Verify structured logs with context

**Expected Result:** Application logs appear in Logtail with proper context---

## Phase 3: Sentry Testing

### Step 3.1: Verify Sentry Initialization

**Check Server Logs:**

- Look for: `✅ Sentry initialized for environment: ...` in startup logs
- If missing: Check `SENTRY_DSN` environment variable

**Dashboard Check:**

- Go to https://sentry.io
- Navigate to **Settings** → **Projects** → Verify your project is active

### Step 3.2: Test Error Capture (5xx Errors)

**API Call (Trigger Server Error):**

```bash
# This will require a code change or an endpoint that throws an error
# For testing, you can temporarily modify an endpoint to throw an error
POST http://localhost:3001/api/transactions/deposit/initialize
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": -1000  # Invalid amount to trigger validation error
}
```

**What Happens:**

- 400 error (BadRequestException) - Won't be captured (only 5xx)
- To test 5xx: Need to trigger actual server error

**Alternative: Test with SENTRY_CAPTURE_ALL=true**Set environment variable:

```env
SENTRY_CAPTURE_ALL=true
```

Then trigger any error:

```bash
GET http://localhost:3001/api/invalid-endpoint
Authorization: Bearer <access_token>
```

**Dashboard Verification:**

1. Go to Sentry dashboard → **Issues**
2. Look for new issue with:

- Error message
- Stack trace
- Request context (method, URL, headers)
- User context (if authenticated)
- Breadcrumbs

**Expected Result:** Error appears in Sentry Issues within 1-2 seconds

### Step 3.3: Test User Context

**API Call (Authenticated Request that Errors):**

```bash
# Make authenticated request that errors
GET http://localhost:3001/api/invalid-endpoint
Authorization: Bearer <access_token>
```

**Dashboard Verification:**

1. Go to Sentry dashboard → **Issues** → Click on error
2. Check **User** section:

- `id`: User ID
- `email`: codeswithjoseph@gmail.com
- `username`: If available

**Expected Result:** User context is attached to error

### Step 3.4: Test Sensitive Data Filtering

**API Call (Request with Sensitive Data):**

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "identifier": "codeswithjoseph@gmail.com",
  "password": "6thbornR%"
}
```

**Dashboard Verification:**

1. Go to Sentry dashboard → **Issues**
2. Check error details → **Request** section
3. Verify:

- `password` field is `[Filtered]`
- `authorization` header is `[Filtered]`
- No sensitive data exposed

**Expected Result:** Sensitive data is filtered in Sentry---

## Phase 4: BullMQ Testing (If Enabled)

### Step 4.1: Verify BullMQ Initialization

**Check Environment:**

```bash
# Verify USE_BULLMQ_QUEUE is set
echo $USE_BULLMQ_QUEUE
# Should be: true
```

**Check Server Logs:**

- Look for: QueueModule initialization
- Look for: Queue processors starting

**Check Redis Connection:**

- Verify Redis is accessible
- Check for Redis connection errors in logs

### Step 4.2: Test Notification Queue

**API Call (Trigger Notification):**

```bash
# Any action that triggers a notification
POST http://localhost:3001/api/transactions/deposit/initialize
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 1000
}
```

**What Happens:**

- Notification job is added to BullMQ queue
- NotificationProcessor processes the job

**Verification Methods:**

1. **Check Server Logs:**

- Look for: `[NotificationProcessor] Processing notification job`
- Look for: `[NotificationProcessor] Notification sent successfully`

2. **Check Redis (if accessible):**

   ```bash
         # Connect to Redis and check queue
         redis-cli -u <REDIS_URL>
         > KEYS bull:notifications:*
         > LLEN bull:notifications:waiting
   ```

3. **Check Database:**

- Check `NotificationQueue` table for processed entries
- Check `Notification` table for created notifications

**Expected Result:** Notifications are processed via BullMQ queue

### Step 4.3: Test Webhook Retry Queue

**API Call (Trigger Webhook):**

```bash
# Simulate a webhook that fails
# This would require a webhook endpoint that intentionally fails
```

**Verification:**

- Check Redis for `bull:webhook-retry:*` keys
- Check server logs for retry attempts

### Step 4.4: Test Reconciliation Queue

**Verification:**

- Reconciliation queue runs on schedule
- Check server logs for reconciliation processor activity

---

## Testing Checklist

### PostHog

- [ ] User identification on login
- [ ] Transaction events (initiated, completed, failed)
- [ ] VTU purchase events
- [ ] Payment events
- [ ] P2P transfer events

### Logtail

- [ ] HTTP request logs
- [ ] Error logs
- [ ] Application logs with context
- [ ] Structured logging

### Sentry

- [ ] Error capture (5xx errors)
- [ ] User context attachment
- [ ] Sensitive data filtering
- [ ] Request context
- [ ] Breadcrumbs

### BullMQ (if enabled)

- [ ] Queue initialization
- [ ] Notification processing
- [ ] Webhook retry queue
- [ ] Reconciliation queue

---

## Troubleshooting

### PostHog Events Not Appearing

- Check `POSTHOG_API_KEY` is set
- Check `POSTHOG_HOST` is correct
- Wait 10-20 seconds (flush interval)
- Check server logs for PostHog errors

### Logtail Logs Not Appearing

- Check `LOGTAIL_SOURCE_TOKEN` is set
- Check network connectivity
- Check server logs for Logtail errors
- Verify source token in Logtail dashboard

### Sentry Errors Not Appearing

- Check `SENTRY_DSN` is set
- Only 5xx errors are captured by default (set `SENTRY_CAPTURE_ALL=true` for all)
- Check server logs for Sentry initialization
- Verify DSN in Sentry dashboard

### BullMQ Not Working

- Check `USE_BULLMQ_QUEUE=true` is set
- Check Redis connection
- Check QueueModule is loaded in app.module.ts
- Check server logs for queue initialization

---

## Next Steps

After completing all tests:

1. Document any issues found
2. Verify all dashboards are receiving data
3. Set up alerts/notifications in each service
