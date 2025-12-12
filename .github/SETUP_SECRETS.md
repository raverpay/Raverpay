# GitHub Secrets Setup Guide

To complete the CI/CD pipeline setup, you need to add the following secrets to your GitHub repository.

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

---

## Required Secrets

### 1. `RAILWAY_TOKEN`

**Purpose:** Allows GitHub Actions to deploy to Railway

**How to get it:**

```bash
# Login to Railway CLI
railway login

# Generate a new token
railway token
```

Copy the token and add it as a GitHub secret.

---

### 2. `NOTIFICATION_EMAIL`

**Purpose:** Email address used to send deployment notifications

**Value:** `raverpay@outlook.com`

---

### 3. `NOTIFICATION_EMAIL_PASSWORD`

**Purpose:** Password or app-specific password for the notification email

**How to get it:**

1. Go to Outlook.com
2. Navigate to **Settings** → **Security**
3. Create an **App Password** (recommended for security)
4. Use this app password instead of your regular password

**Note:** If you don't use an app password, you may need to enable "less secure app access", which is NOT recommended for fintech applications.

---

## Optional: Creating an App Password for Outlook

For better security, use an app-specific password:

1. Sign in to your Microsoft account
2. Go to https://account.microsoft.com/security
3. Under **Security basics**, select **Advanced security options**
4. Under **App passwords**, select **Create a new app password**
5. Copy the generated password and use it as `NOTIFICATION_EMAIL_PASSWORD`

---

## Verify Secrets are Added

After adding all secrets, verify by:

1. Going to **Settings** → **Secrets and variables** → **Actions**
2. You should see three secrets:
   - `RAILWAY_TOKEN`
   - `NOTIFICATION_EMAIL`
   - `NOTIFICATION_EMAIL_PASSWORD`

---

## Test the Pipeline

Once secrets are added:

1. Make a small change to any file
2. Commit and push to a feature branch
3. Create a Pull Request to `main`
4. The CI checks should run automatically
5. After merging to `main`, deployment should trigger

---

## Troubleshooting

### Railway Token Issues

If deployment fails with "unauthorized", regenerate the Railway token:

```bash
railway logout
railway login
railway token
```

### Email Notification Issues

- Verify the email and password are correct
- If using 2FA, you MUST use an app password
- Check the GitHub Actions logs for specific error messages

### Health Check Failing

- Verify your API is deployed correctly on Railway
- Check the Railway logs: `railway logs --service raverpay-api`
- Ensure the health endpoint is accessible: https://api.raverpay.com/api/health
