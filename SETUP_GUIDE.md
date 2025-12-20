# Monitoring & Queue Infrastructure Setup Guide

This guide walks you through creating accounts and obtaining API keys for all required services.

## Prerequisites

- GitHub account (for release tracking)
- Email address for account creation
- Access to Railway dashboard (for environment variables)

## Service Setup Instructions

### 1. Sentry (Error Tracking) - FREE TIER

**Why:** Track errors, performance issues, and exceptions in production.

**Steps:**
1. Go to https://sentry.io/signup/
2. Sign up with email or GitHub
3. Create a new organization (e.g., "RaverPay")
4. Create a new project:
   - Platform: **Node.js**
   - Project name: **raverpay-api**
5. After creation, you'll see the **DSN** (Data Source Name)
   - Format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
   - Copy this - you'll need it for `SENTRY_DSN`
6. Go to Settings → Projects → raverpay-api → Client Keys (DSN)
   - Copy the DSN
7. (Optional) Set up release tracking:
   - Go to Settings → Projects → raverpay-api → Releases
   - Enable "Associate commits with releases"
   - Connect your GitHub repository

**What you'll get:**
- `SENTRY_DSN`: Your project DSN (starts with `https://`)
- Free tier: 5,000 errors/month

**Upgrade when:** You exceed 5,000 errors/month → Upgrade to Team ($26/month)

---

### 2. Logtail (Log Aggregation) - FREE TIER

**Why:** Centralized log aggregation, search, and alerting.

**Steps:**
1. Go to https://logtail.com/signup
2. Sign up with email or GitHub
3. After login, you'll be in your dashboard
4. Click "Add Source" or "Create Source"
5. Select **Node.js** as the platform
6. Name it: **raverpay-api**
7. Copy the **Source Token** (looks like: `xxxxx_xxxxx_xxxxx`)
   - This is your `LOGTAIL_SOURCE_TOKEN`

**What you'll get:**
- `LOGTAIL_SOURCE_TOKEN`: Your source token
- Free tier: 1GB logs/month, 3-day retention

**Upgrade when:** You exceed 1GB/month → Upgrade to Pro ($2/month for 5GB)

---

### 3. PostHog (Product Analytics) - FREE TIER

**Why:** Track user events, product analytics, and feature flags.

**Steps:**
1. Go to https://posthog.com/signup
2. Sign up with email or GitHub
3. Create a new project:
   - Project name: **RaverPay**
   - Timezone: **Africa/Lagos** (or your timezone)
4. After project creation, go to **Project Settings** → **API Keys**
5. Copy the **Project API Key** (looks like: `phc_xxxxx`)
   - This is your `POSTHOG_API_KEY`
6. Note your **PostHog Host**:
   - Cloud: `https://app.posthog.com` (default)
   - Self-hosted: Your custom domain

**What you'll get:**
- `POSTHOG_API_KEY`: Your project API key (starts with `phc_`)
- `POSTHOG_HOST`: `https://app.posthog.com` (or custom if self-hosted)
- Free tier: 1M events/month

**Upgrade when:** You exceed 1M events/month → Pay-as-you-go ($0.000225/event)

---

### 4. UptimeRobot (Uptime Monitoring) - FREE TIER

**Why:** Monitor API uptime and get alerts when service is down.

**Steps:**
1. Go to https://uptimerobot.com/signup/
2. Sign up with email
3. Verify your email
4. After login, click **"Add New Monitor"**
5. Configure monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** RaverPay API
   - **URL:** `https://api.raverpay.com/api/health` (or your API URL)
   - **Monitoring Interval:** 5 minutes (free tier)
   - **Alert Contacts:** Add your email
6. Click **"Create Monitor"**
7. (Optional) Get API key for programmatic access:
   - Go to **My Settings** → **API Settings**
   - Click **"Generate API Key"**
   - Copy the API key (optional, for `UPTIME_ROBOT_API_KEY`)

**What you'll get:**
- Monitor configured (no API key needed for basic monitoring)
- `UPTIME_ROBOT_API_KEY`: Optional, for programmatic access
- Free tier: 50 monitors, 5-minute intervals

**Upgrade when:** You need 1-minute intervals → Upgrade to Pro ($7/month)

---

### 5. Redis (Already Configured)

**Why:** BullMQ requires Redis for queue storage.

**Current Setup:**
- You're already using Upstash Redis
- Check your Railway dashboard or `.env` for `REDIS_URL`

**What you need:**
- `REDIS_URL`: Your existing Redis connection string
- Format: `redis://default:xxxxx@xxxxx.upstash.io:xxxxx`

**If you need a new Redis instance:**
1. Go to https://upstash.com/
2. Sign up/login
3. Create a new Redis database
4. Copy the connection string

---

## Environment Variables Summary

After setting up all accounts, add these to your `.env` file:

```env
# BullMQ (uses existing Redis)
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:xxxxx

# Sentry
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0

# Logtail
LOGTAIL_SOURCE_TOKEN=xxxxx_xxxxx_xxxxx

# PostHog
POSTHOG_API_KEY=phc_xxxxx
POSTHOG_HOST=https://app.posthog.com

# UptimeRobot (optional, for API access)
UPTIME_ROBOT_API_KEY=xxxxx

# Enable BullMQ (set to 'true' after testing)
USE_BULLMQ_QUEUE=false
```

## Verification Checklist

- [ ] Sentry account created, DSN copied
- [ ] Logtail account created, source token copied
- [ ] PostHog account created, API key copied
- [ ] UptimeRobot monitor created
- [ ] Redis URL confirmed (existing Upstash)
- [ ] All environment variables added to `.env`
- [ ] All environment variables added to Railway dashboard

## Next Steps

1. Complete account setup using this guide
2. Add environment variables to your `.env` file
3. Add environment variables to Railway dashboard
4. Proceed with implementation

## Support

If you encounter issues:
- **Sentry:** https://docs.sentry.io/platforms/javascript/
- **Logtail:** https://logtail.com/docs
- **PostHog:** https://posthog.com/docs
- **UptimeRobot:** https://uptimerobot.com/api/

