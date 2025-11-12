# Next Steps: Paystack DVA Compliance Implementation

This document outlines the steps needed to merge and deploy the Paystack DVA compliance changes.

## 📋 Overview

**Branch:** `claude/review-paystack-virtual-account-011CV4Mbros5c5x8pRwir6WQ`
**Commit:** `f8642ff` - fix(dva): implement compliant multi-step Paystack DVA integration
**Status:** ✅ All code changes committed and pushed

---

## 🔄 Part 1: Merging to Main Branch

### Option A: Merge via GitHub Pull Request (Recommended)

1. **Create Pull Request on GitHub:**
   ```bash
   # Open this URL in your browser:
   https://github.com/joestackss/MularPay-Fintech/pull/new/claude/review-paystack-virtual-account-011CV4Mbros5c5x8pRwir6WQ
   ```

2. **Review Changes:**
   - Review the 10 files changed (+714, -48 lines)
   - Verify all tests pass (if you have CI/CD)
   - Get code review from team members (optional)

3. **Merge PR:**
   - Click "Merge Pull Request" on GitHub
   - Choose merge strategy (recommend "Squash and merge" or "Create a merge commit")
   - Delete the branch after merging

4. **Pull merged changes locally:**
   ```bash
   git checkout main
   git pull origin main
   ```

### Option B: Merge Locally

1. **Switch to main branch:**
   ```bash
   git checkout main
   ```

2. **Pull latest changes from remote:**
   ```bash
   git pull origin main
   ```

3. **Merge the feature branch:**
   ```bash
   git merge claude/review-paystack-virtual-account-011CV4Mbros5c5x8pRwir6WQ
   ```

4. **Resolve conflicts (if any):**
   ```bash
   # If conflicts occur, resolve them manually
   # Then stage the resolved files
   git add .
   git commit -m "Merge DVA compliance changes"
   ```

5. **Push to remote:**
   ```bash
   git push origin main
   ```

6. **Delete the feature branch (optional):**
   ```bash
   git branch -d claude/review-paystack-virtual-account-011CV4Mbros5c5x8pRwir6WQ
   git push origin --delete claude/review-paystack-virtual-account-011CV4Mbros5c5x8pRwir6WQ
   ```

---

## 🗄️ Part 2: Database Migrations

After merging to main, run these commands:

### Step 1: Navigate to API directory
```bash
cd apps/mularpay-api
```

### Step 2: Generate Prisma Client
```bash
# If you have pnpm (recommended)
pnpm prisma:generate

# Or with npm
npm run prisma:generate

# Or directly
npx prisma generate
```

### Step 3: Create and Run Migration
```bash
# Create migration for new fields
pnpm prisma:migrate dev --name add_paystack_dva_compliance_fields

# Or with npm
npm run prisma:migrate dev -- --name add_paystack_dva_compliance_fields

# Or directly
npx prisma migrate dev --name add_paystack_dva_compliance_fields
```

**This migration adds:**
- `User.paystackCustomerCode` (String, unique, nullable)
- `Transaction.channel` (String, nullable)

### Step 4: Verify Migration
```bash
# Check migration status
pnpm prisma:migrate status

# Or
npx prisma migrate status
```

### Step 5: Deploy to Production Database (When Ready)
```bash
# For production deployment
pnpm prisma:migrate deploy

# Or
npx prisma migrate deploy
```

---

## 🔧 Part 3: Configuration Changes

### 1. Configure Paystack Webhook

#### Development Environment:
1. Use a tool like **ngrok** to expose your local server:
   ```bash
   ngrok http 3001
   # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   ```

2. Go to [Paystack Dashboard](https://dashboard.paystack.com/settings/developer)

3. Set webhook URL:
   ```
   https://your-ngrok-url.ngrok.io/webhooks/paystack
   ```

#### Production Environment:
1. Go to [Paystack Dashboard](https://dashboard.paystack.com/settings/developer)

2. Set webhook URL:
   ```
   https://your-production-domain.com/webhooks/paystack
   ```

#### Enable Required Webhook Events:
Check these events in Paystack Dashboard:
- ✅ `charge.success`
- ✅ `customeridentification.success`
- ✅ `customeridentification.failed`
- ✅ `dedicatedaccount.assign.success`
- ✅ `dedicatedaccount.assign.failed`

### 2. Environment Variables

Ensure these variables are set in your `.env` file:

```bash
# apps/mularpay-api/.env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
PAYSTACK_SECRET_KEY="sk_test_..." # or sk_live_... for production
JWT_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
```

---

## 📱 Part 4: Frontend Updates

### Mobile App (React Native)

Update your registration/profile screens to add DVA request functionality:

```typescript
// Example: screens/WalletScreen.tsx or ProfileScreen.tsx

const requestVirtualAccount = async () => {
  try {
    setLoading(true);
    const response = await api.post('/virtual-accounts/request', {
      preferred_bank: 'wema-bank', // optional
    });

    if (response.data.success) {
      Alert.alert('Success', 'Virtual account created successfully!');
      // Refresh user's DVA details
      fetchVirtualAccount();
    } else {
      Alert.alert('Info', response.data.message);
    }
  } catch (error) {
    Alert.alert('Error', error.response?.data?.message || 'Failed to create virtual account');
  } finally {
    setLoading(false);
  }
};

const fetchVirtualAccount = async () => {
  try {
    const response = await api.get('/virtual-accounts/me');
    setVirtualAccount(response.data);
  } catch (error) {
    console.error('Failed to fetch virtual account', error);
  }
};
```

### Web App (Next.js)

Update your wallet/profile pages:

```typescript
// Example: app/wallet/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function WalletPage() {
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestVirtualAccount = async () => {
    try {
      setLoading(true);
      const response = await api.post('/virtual-accounts/request', {
        preferred_bank: 'wema-bank',
      });

      if (response.data.success) {
        toast.success('Virtual account created!');
        fetchVirtualAccount();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create virtual account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVirtualAccount();
  }, []);

  return (
    <div>
      {!virtualAccount ? (
        <button onClick={requestVirtualAccount} disabled={loading}>
          Request Virtual Account
        </button>
      ) : (
        <div>
          <h3>Your Virtual Account</h3>
          <p>Bank: {virtualAccount.bankName}</p>
          <p>Account Number: {virtualAccount.accountNumber}</p>
          <p>Account Name: {virtualAccount.accountName}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Part 5: Testing

### 1. Test Paystack Customer Creation

```bash
# Using curl or Postman
curl -X POST http://localhost:3001/virtual-accounts/request \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferred_bank": "test-bank"
  }'
```

### 2. Test Webhook Handler (Local)

```bash
# Simulate a webhook event
curl -X POST http://localhost:3001/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: test-signature" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "TEST_REF_123",
      "amount": 100000,
      "channel": "dedicated_nuban",
      "authorization": {
        "receiver_bank_account_number": "1234567890",
        "sender_name": "Test User",
        "sender_bank": "Test Bank"
      }
    }
  }'
```

### 3. Test BVN Validation (Test Mode)

Use Paystack's test credentials:

```json
{
  "country": "NG",
  "type": "bank_account",
  "account_number": "0111111111",
  "bvn": "222222222221",
  "bank_code": "007",
  "first_name": "Uchenna",
  "last_name": "Okoro"
}
```

### 4. Test with Demo Bank App

- Go to: https://demo-bank.paystack.com/
- Make a transfer to your test DVA
- Verify webhook is received and wallet is credited

---

## 🚀 Part 6: Deployment Checklist

### Before Deployment:

- [ ] All migrations tested locally
- [ ] Frontend updated to use new DVA request endpoint
- [ ] Webhook URL configured on Paystack Dashboard
- [ ] All webhook events enabled
- [ ] Environment variables set in production
- [ ] API tests passing
- [ ] No breaking changes to existing users

### Deployment Steps:

1. **Deploy Backend (Railway/Heroku/etc.):**
   ```bash
   # Example for Railway
   railway up

   # Or if using git-based deployment
   git push production main
   ```

2. **Run Production Migrations:**
   ```bash
   # SSH into production server or use your platform's CLI
   npx prisma migrate deploy
   ```

3. **Deploy Frontend (Vercel/Netlify/etc.):**
   ```bash
   # Example for Vercel
   vercel --prod

   # Or push to main branch if auto-deployed
   git push origin main
   ```

4. **Verify Deployment:**
   - [ ] API health check: `https://your-api.com/health`
   - [ ] Test DVA request endpoint
   - [ ] Test webhook endpoint
   - [ ] Check logs for errors

---

## 📊 Part 7: Monitoring & Maintenance

### 1. Monitor Webhook Events

Check your logs for:
- `charge.success` - Payment received
- `customeridentification.*` - BVN validation status
- `dedicatedaccount.assign.*` - DVA creation status

### 2. Handle Existing Users

**Important:** Users who registered BEFORE this update:
- They do NOT have virtual accounts automatically
- They must request DVA via the new endpoint: `POST /virtual-accounts/request`
- Consider sending an in-app notification or email about this new feature

### 3. Update Documentation

Update your API documentation with new endpoints:
- `POST /virtual-accounts/request`
- `GET /virtual-accounts/me`
- `GET /virtual-accounts/providers`
- `POST /virtual-accounts/requery`

---

## 🔍 Part 8: Verification

After deployment, verify:

```bash
# 1. Check if API is running
curl https://your-api.com/health

# 2. Check if webhook endpoint exists
curl https://your-api.com/webhooks/paystack

# 3. Test DVA request (requires valid JWT)
curl -X POST https://your-api.com/virtual-accounts/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# 4. Check available providers
curl -X GET https://your-api.com/virtual-accounts/providers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Part 9: Rollback Plan (If Needed)

If something goes wrong:

### Rollback Code:
```bash
# Revert the merge
git revert -m 1 <merge-commit-hash>
git push origin main

# Or reset to previous commit (destructive)
git reset --hard <previous-commit-hash>
git push --force origin main
```

### Rollback Database:
```bash
# Rollback last migration
cd apps/mularpay-api
npx prisma migrate resolve --rolled-back <migration-name>

# Or manually revert schema changes
```

---

## ❓ Troubleshooting

### Issue: Prisma client not found
```bash
# Solution
cd apps/mularpay-api
pnpm prisma:generate
```

### Issue: Webhook signature verification fails
```bash
# Solution: Check that PAYSTACK_SECRET_KEY is set correctly
# Verify webhook signature in Paystack Dashboard matches your secret key
```

### Issue: DVA creation fails with "Customer already exists"
```bash
# This is normal - Paystack will return existing customer
# The code handles this automatically
```

### Issue: Migration fails in production
```bash
# Solution: Check database connection
# Ensure DATABASE_URL and DIRECT_URL are correct
# Run: npx prisma migrate status
```

---

## 📞 Support

If you encounter issues:

1. **Check Logs:**
   - Backend: Check your Railway/Heroku logs
   - Frontend: Check browser console
   - Paystack: Check Paystack Dashboard > Logs

2. **Verify Configurations:**
   - Environment variables
   - Webhook URL
   - Webhook events enabled
   - Database connection

3. **Test Locally First:**
   - Always test changes locally before deploying
   - Use Paystack test mode for testing

---

## ✅ Success Criteria

You'll know everything is working when:

- ✅ New users can register without automatic DVA creation
- ✅ Users can request DVA via new endpoint
- ✅ Paystack customer is created successfully
- ✅ DVA is assigned to user
- ✅ Webhooks are received and processed
- ✅ Wallet is credited when user transfers to DVA
- ✅ No errors in logs
- ✅ Frontend displays DVA details correctly

---

## 📅 Post-Deployment Tasks

After successful deployment:

- [ ] Monitor webhook delivery for first 24 hours
- [ ] Send announcement to users about new DVA feature
- [ ] Update user documentation/FAQs
- [ ] Monitor support tickets for DVA-related issues
- [ ] Set up alerts for webhook failures
- [ ] Review and optimize database queries
- [ ] Plan for BVN validation flow (if not already implemented)

---

## 📚 Additional Resources

- [Paystack DVA Documentation](https://paystack.com/docs/payments/dedicated-virtual-accounts)
- [Paystack Customer Validation](https://paystack.com/docs/identity-verification/validate-customer)
- [Paystack Webhooks](https://paystack.com/docs/payments/webhooks)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

**Last Updated:** 2025-11-12
**Branch:** `claude/review-paystack-virtual-account-011CV4Mbros5c5x8pRwir6WQ`
**Status:** Ready for merge and deployment
