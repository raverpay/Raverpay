# Railway Deployment Guide - RaverPay API

**Deploy your RaverPay API to Railway and get a public URL accessible from anywhere in the world!**

---

## 🚂 Why Railway?

- ✅ **Free Tier**: $5 free credit/month
- ✅ **Easy Setup**: Deploy from GitHub in minutes
- ✅ **Automatic HTTPS**: Your API gets SSL certificate automatically
- ✅ **PostgreSQL Support**: Built-in database (or use your existing Supabase)
- ✅ **Environment Variables**: Easy to manage secrets
- ✅ **Auto-deploys**: Push to GitHub = auto-deploy

---

## 📋 Prerequisites

- [x] Railway account (you already have one!)
- [x] GitHub repository connected
- [x] Working API locally (✅ Phase 1.2 complete)
- [x] Supabase database (✅ Already configured)

---

## 🚀 Deployment Steps

### Step 1: Login to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway to access your repositories

---

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: **`RaverPay-Fintech`**
4. Railway will detect your monorepo

---

### Step 3: Configure Service

1. Railway will ask which service to deploy
2. Click **"Add a service"** → **"GitHub Repo"**
3. Select: `apps/raverpay-api` as the root directory

**Or manually configure:**

- Click **"Settings"** in your service
- Set **Root Directory**: `apps/raverpay-api`
- Set **Build Command**: `pnpm install && pnpm prisma:generate && pnpm build`
- Set **Start Command**: `pnpm start:prod`

---

### Step 4: Add Environment Variables

Click **"Variables"** tab and add these:

#### Required Variables:

```bash
# Database (use your Supabase credentials)
DATABASE_URL=postgresql://postgres.oeanyukxcphqjrsljhqq:raverpay2025@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres.oeanyukxcphqjrsljhqq:raverpay2025@aws-1-eu-north-1.pooler.supabase.com:5432/postgres

# JWT Secrets
JWT_SECRET=yieimEN8XJ4FGSqmqnxAJRZXojJRaTyUzZ16xhJQSRc=
JWT_REFRESH_SECRET=SERH8IvnZhOGiMaz6nnKGtpoC3nTWS9K8xMsOiaqoV4=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=c1ef2834225ac0192441571f896328b3

# App Config
NODE_ENV=production
PORT=3001

# CORS - Add your Railway URL after deployment
CORS_ORIGIN=https://your-railway-url.railway.app,http://localhost:3000

# Redis
REDIS_URL=rediss://default:AXHIAAIncDIxYjkzYTY3Mzg5OGU0MDBlYWE1YzBiYWZjNmI5NzAzMnAyMjkxMjg@select-malamute-29128.upstash.io:6379

# Paystack
PAYSTACK_SECRET_KEY=sk_test_05ca4ccc9473c1f13c3d2ea0e43f040baca5aeb5
PAYSTACK_PUBLIC_KEY=pk_test_8e2d2be54903a2f026ab2f2613e76f1935c27cfa

# VTPass
VTPASS_API_KEY=7294b6aaa8f6d27b8c8c1c4583be97be
VTPASS_PUBLIC_KEY=PK_756e892dd5a602dfc1cc78af2a7e8dd6c0ef9042f06
VTPASS_SECRET_KEY=SK_85881e96bcf54d0bea935eeb180a387d43c1d45367c
VTPASS_BASE_URL=https://sandbox.vtpass.com/api

# Mono
MONO_SECRET_KEY=test_sk_dr6zxqqkrb2aohw8vbni
MONO_PUBLIC_KEY=test_pk_k15ghap0k5giede1o7j3s

# Cloudinary
CLOUDINARY_CLOUD_NAME=db9jqfl6u
CLOUDINARY_API_KEY=456676969434554
CLOUDINARY_API_SECRET=dh2nQlFpX-rDNtc6jBYuNIRs0HE

# Sentry
SENTRY_DSN=https://6913f738ccdd24d0d225343e7334698f@o4510330939310080.ingest.de.sentry.io/4510330940751952
```

**⚠️ Important:**

- Copy these from your local `.env` file
- Don't share these publicly
- Use Railway's "Variable" feature (they're encrypted)

---

### Step 5: Deploy!

1. Click **"Deploy"** button
2. Railway will:
   - Clone your repo
   - Install dependencies
   - Generate Prisma client
   - Build your NestJS app
   - Start the server

**Watch the logs:**

- Click "Deployments" tab
- Click the latest deployment
- Watch build logs in real-time

---

### Step 6: Get Your Public URL

Once deployed:

1. Click **"Settings"** tab
2. Scroll to **"Domains"**
3. Click **"Generate Domain"**
4. Railway will give you a URL like:
   ```
   https://raverpay-api-production.up.railway.app
   ```

**✅ Your API is now live!**

---

## 🧪 Test Your Deployed API

### Test 1: Health Check

```bash
curl https://YOUR-RAILWAY-URL.railway.app/api/health | python3 -m json.tool
```

**Expected:**

```json
{
  "status": "ok",
  "database": "connected",
  ...
}
```

---

### Test 2: Register a User

```bash
curl -X POST https://YOUR-RAILWAY-URL.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@raverpay.com",
    "phone": "08012345678",
    "password": "Test@1234",
    "firstName": "Test",
    "lastName": "User"
  }' | python3 -m json.tool
```

---

### Test 3: Login

```bash
curl -X POST https://YOUR-RAILWAY-URL.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@raverpay.com",
    "password": "Test@1234"
  }' | python3 -m json.tool
```

---

### Test from Your Phone/Another Computer

Share your Railway URL with anyone, anywhere in the world:

```
https://YOUR-RAILWAY-URL.railway.app/api/health
```

They can test it in their browser or with curl!

---

## 🔧 Update CORS for Your Deployed URL

After deployment, update your CORS settings:

1. Go to Railway → Your Project → Variables
2. Update `CORS_ORIGIN`:

```
CORS_ORIGIN=https://your-railway-url.railway.app,https://your-web-app.vercel.app,http://localhost:3000
```

3. Redeploy (Railway auto-redeploys on variable changes)

---

## 📊 Monitor Your Deployment

### View Logs

```bash
# In Railway dashboard:
# 1. Click your service
# 2. Click "Deployments"
# 3. Click "View Logs"
```

**Or use Railway CLI:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs
```

---

## 🐛 Troubleshooting

### Build Failed

**Check:**

1. Build logs in Railway dashboard
2. Ensure all dependencies are in `package.json`
3. Ensure Prisma generates correctly

**Fix:**

```bash
# Test build locally first
cd apps/raverpay-api
pnpm build
```

---

### Database Connection Failed

**Check:**

1. `DATABASE_URL` is correctly set in Railway variables
2. Supabase database is active (not paused)
3. Connection string includes `?pgbouncer=true` for pooler

**Test connection:**

```bash
# In Railway, go to Variables and verify:
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...
```

---

### Port Issues

Railway automatically assigns a port. Ensure your `main.ts` uses:

```typescript
const port = process.env.PORT || 3001;
await app.listen(port);
```

✅ This is already in your code!

---

### Environment Variables Not Loading

**Check:**

1. All required variables are set in Railway
2. No typos in variable names
3. Restart deployment after adding variables

---

## 💰 Railway Pricing

**Free Tier:**

- $5 credit/month
- Enough for development/testing
- ~500 hours of runtime

**Pro Plan** ($20/month):

- $20 credit/month
- More resources
- Better for production

**Tip:** Start with free tier, upgrade when needed!

---

## 🔄 Continuous Deployment

Railway auto-deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Railway automatically:
# 1. Detects the push
# 2. Builds the app
# 3. Deploys if build succeeds
```

**⚠️ Production Tip:**

- Use separate Railway projects for **staging** and **production**
- Deploy staging from `develop` branch
- Deploy production from `main` branch

---

## 🌐 Custom Domain (Optional)

Want to use your own domain?

1. Buy a domain (Namecheap, GoDaddy, etc.)
2. In Railway → Settings → Domains → Custom Domain
3. Add your domain: `api.raverpay.com`
4. Update DNS records as Railway instructs
5. Railway provisions SSL automatically

---

## ✅ Deployment Checklist

Before going live:

- [ ] All environment variables set in Railway
- [ ] Database connection tested
- [ ] Health check endpoint returns 200
- [ ] User registration works
- [ ] User login works
- [ ] Protected routes require JWT
- [ ] CORS configured for your frontend URLs
- [ ] Logs show no errors
- [ ] Test from external device/network
- [ ] Document your Railway URL

---

## 📱 Share Your API

Once deployed, you can test from:

- ✅ Your computer
- ✅ Your phone (4G/5G network)
- ✅ Your colleague's computer
- ✅ Any device with internet access
- ✅ Postman/Insomnia
- ✅ Your frontend apps (Web/Mobile)

**Your API URL:**

```
https://YOUR-RAILWAY-URL.railway.app/api
```

**Example endpoints:**

```
GET  https://YOUR-RAILWAY-URL.railway.app/api/health
POST https://YOUR-RAILWAY-URL.railway.app/api/auth/register
POST https://YOUR-RAILWAY-URL.railway.app/api/auth/login
POST https://YOUR-RAILWAY-URL.railway.app/api/auth/refresh
GET  https://YOUR-RAILWAY-URL.railway.app/api/auth/me
```

---

## 🎯 Next Steps After Deployment

1. **Update Frontend URLs:**
   - Update `NEXT_PUBLIC_API_URL` in web app
   - Update `EXPO_PUBLIC_API_URL` in mobile app

2. **Test from Frontend:**
   - Connect your React Native app
   - Connect your Next.js web app
   - Test end-to-end user flows

3. **Monitor:**
   - Check Railway logs regularly
   - Monitor database usage in Supabase
   - Track API response times

4. **Continue Development:**
   - Phase 1.3: User Module
   - Phase 1.4: Wallet Module
   - Phase 1.5: Transaction Module

---

## 🔗 Useful Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs:** https://docs.railway.app
- **Your Supabase:** https://supabase.com/dashboard
- **GitHub Repo:** https://github.com/joestackss/RaverPay-Fintech

---

## 💡 Pro Tips

1. **Use Railway CLI** for faster deployments
2. **Set up staging environment** for testing
3. **Enable Railway's monitoring** for uptime alerts
4. **Use environment-specific variables** (staging vs production)
5. **Keep secrets in Railway**, never commit them

---

**Ready to deploy?** Follow the steps above and your API will be live in ~5 minutes! 🚀

**Questions?** Check Railway's excellent docs or their Discord community.

---

**Document Created:** November 9, 2025  
**Deployment Status:** Ready to Deploy ✅
