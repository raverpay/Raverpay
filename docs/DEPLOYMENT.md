# RaverPay Deployment Guide

How to deploy RaverPay to staging and production environments.

## Overview

- **API**: Railway (Docker-based deployment)
- **Web/Admin**: Vercel (Serverless)
- **Mobile**: Expo EAS Build + App Stores
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash (Redis)

## Prerequisites

### Required Accounts

1. **Railway** - API hosting ([railway.app](https://railway.app))
2. **Vercel** - Web/Admin hosting ([vercel.com](https://vercel.com))
3. **Supabase** - Database ([supabase.com](https://supabase.com))
4. **Upstash** - Redis ([upstash.com](https://upstash.com))
5. **Expo** - Mobile builds ([expo.dev](https://expo.dev))
6. **GitHub** - CI/CD and code hosting

### Required Secrets

Store these in GitHub Secrets (`Settings > Secrets > Actions`):

**Staging:**

- `RAILWAY_TOKEN_STAGING`
- `DATABASE_URL_STAGING`
- `REDIS_URL_STAGING`
- `JWT_SECRET_STAGING`
- `JWT_REFRESH_SECRET_STAGING`
- `ENCRYPTION_KEY_STAGING`
- `PAYSTACK_SECRET_KEY_TEST`
- `PAYSTACK_PUBLIC_KEY_TEST`
- `VTPASS_API_KEY_SANDBOX`
- `MONO_SECRET_KEY_TEST`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**Production:**

- `RAILWAY_TOKEN_PRODUCTION`
- `DATABASE_URL_PRODUCTION`
- `REDIS_URL_PRODUCTION`
- `JWT_SECRET_PRODUCTION`
- `JWT_REFRESH_SECRET_PRODUCTION`
- `ENCRYPTION_KEY_PRODUCTION`
- `PAYSTACK_SECRET_KEY_LIVE`
- `PAYSTACK_PUBLIC_KEY_LIVE`
- `VTPASS_API_KEY_LIVE`
- `MONO_SECRET_KEY_LIVE`

**Vercel:**

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_WEB`
- `VERCEL_PROJECT_ID_ADMIN`

## 1. Deploy API to Railway

### Initial Setup

1. Create Railway project: https://railway.app/new
2. Link GitHub repository
3. Select `apps/raverpay-api` as root directory
4. Add environment variables from `.env.production.example`

### Automatic Deployment

Deployments happen automatically via GitHub Actions:

- **Staging**: Push to `develop` branch
- **Production**: Push to `main` branch

### Manual Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

### Database Migrations

Migrations run automatically on production deployment. To run manually:

```bash
# SSH into Railway container
railway run

# Run migrations
npx prisma migrate deploy
```

## 2. Deploy Web & Admin to Vercel

### Initial Setup

1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Link projects:

```bash
cd apps/raverpay-web
vercel link

cd apps/raverpay-admin
vercel link
```

### Automatic Deployment

Deployments happen automatically via GitHub Actions:

- **Staging**: Push to `develop` branch → Preview deployment
- **Production**: Push to `main` branch → Production deployment

### Manual Deployment

```bash
# Web
cd apps/raverpay-web
vercel --prod

# Admin
cd apps/raverpay-admin
vercel --prod
```

### Environment Variables

Add via Vercel Dashboard or CLI:

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter value: https://api.raverpay.com/api
```

## 3. Deploy Mobile App (Expo)

### Initial Setup

```bash
cd apps/raverpay-mobile
eas login
eas init
```

### Build for Android

```bash
# Development build
eas build --platform android --profile development

# Production build (APK for testing)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

### Build for iOS

```bash
# Development build
eas build --platform ios --profile development

# Production build (for App Store)
eas build --platform ios --profile production
```

### Submit to Stores

```bash
# Android Play Store
eas submit --platform android

# iOS App Store
eas submit --platform ios
```

## 4. Post-Deployment Checklist

### API

- [ ] Health check passes: `https://api.raverpay.com/api/health`
- [ ] Swagger docs accessible: `https://api.raverpay.com/api/docs`
- [ ] Database connected (check logs)
- [ ] Redis connected (check logs)
- [ ] Webhooks configured (Paystack, VTPass)

### Web/Admin

- [ ] Site loads correctly
- [ ] API requests work
- [ ] Dark mode works
- [ ] Authentication flows work
- [ ] No console errors

### Mobile

- [ ] App launches successfully
- [ ] API connection works
- [ ] Authentication works
- [ ] Push notifications configured
- [ ] Deep links work

### Monitoring

- [ ] Sentry configured for error tracking
- [ ] Uptime monitoring (UptimeRobot, etc.)
- [ ] Log aggregation (Railway logs, Vercel logs)
- [ ] Performance monitoring

## 5. Rollback Procedures

### API (Railway)

```bash
# Via Railway dashboard
# Deployments > Select previous deployment > Redeploy

# Via CLI
railway rollback
```

### Web/Admin (Vercel)

```bash
# Via Vercel dashboard
# Deployments > Select previous deployment > Promote to Production

# Via CLI
vercel rollback
```

### Database

```bash
# Restore from Supabase backup
# Supabase Dashboard > Database > Backups > Restore
```

## 6. Domains & DNS

### API

Point your domain to Railway:

```
CNAME api.raverpay.com -> <your-railway-domain>
```

### Web

Point your domain to Vercel:

```
CNAME raverpay.com -> cname.vercel-dns.com
CNAME www.raverpay.com -> cname.vercel-dns.com
```

### Admin

```
CNAME admin.raverpay.com -> cname.vercel-dns.com
```

## 7. SSL Certificates

- **Railway**: Automatic SSL via Let's Encrypt
- **Vercel**: Automatic SSL via Let's Encrypt

## 8. Monitoring URLs

After deployment, monitor these endpoints:

- API Health: `https://api.raverpay.com/api/health`
- Web: `https://raverpay.com`
- Admin: `https://admin.raverpay.com`

## Troubleshooting

### Build Failures

Check GitHub Actions logs for detailed error messages.

### Environment Variables Not Loading

Ensure variables are set in:

- Railway dashboard (for API)
- Vercel dashboard (for Web/Admin)
- Expo secrets (for Mobile)

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check Supabase connection pooler settings
- Ensure IP whitelisting allows Railway IPs

### CORS Errors

Update `CORS_ORIGIN` in API environment to include your domains.

## Cost Estimates

### Staging (Monthly)

- Railway: $5-10 (API hosting)
- Vercel: Free (hobby plan)
- Supabase: Free tier
- Upstash: Free tier
- **Total: ~$5-10/month**

### Production (Monthly - 1000 users)

- Railway: $20-50 (based on usage)
- Vercel: Free (hobby) or $20 (pro)
- Supabase: $25 (pro plan)
- Upstash: $10-20
- Cloudinary: $0-10
- **Total: ~$55-125/month**

## Support

For deployment issues:

- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
- Expo: https://expo.dev/support
