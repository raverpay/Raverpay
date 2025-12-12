# 🚀 RaverPay CI/CD Pipeline

## Overview

This CI/CD pipeline provides automated testing, security scanning, and deployment for the RaverPay monorepo using GitHub Actions and Railway.

---

## 🎯 What It Does

### For Pull Requests & Pushes to Main:
1. ✅ **Code Quality Checks**
   - Prettier formatting validation
   - ESLint linting
   - TypeScript type checking

2. ✅ **Testing**
   - Unit tests for all apps
   - Coverage reporting

3. ✅ **Build Verification**
   - Ensures all apps build successfully
   - Validates Prisma schema generation

4. ✅ **Security Scanning**
   - Dependency vulnerability scanning (pnpm audit)
   - Secret detection (TruffleHog)

### Only on Push to Main:
5. 🚀 **Automated Deployment**
   - Deploys `raverpay-api` to Railway
   - Runs health checks post-deployment

6. 📧 **Email Notifications**
   - Success/failure notifications to raverpay@outlook.com

---

## 📋 Pipeline Stages

```
┌─────────────────────────────────────────┐
│  1. Quality Checks (Parallel)          │
│     - Format Check                      │
│     - Lint                              │
│     - Type Check                        │
├─────────────────────────────────────────┤
│  2. Tests (Parallel)                    │
│     - Unit Tests                        │
│     - Coverage                          │
├─────────────────────────────────────────┤
│  3. Build (Needs: Quality + Tests)      │
│     - Build all apps                    │
│     - Prisma generation                 │
├─────────────────────────────────────────┤
│  4. Security Scan (Parallel with Build) │
│     - Dependency audit                  │
│     - Secret detection                  │
├─────────────────────────────────────────┤
│  5. Deploy (Only on main branch)        │
│     - Deploy to Railway                 │
│     - Health check                      │
├─────────────────────────────────────────┤
│  6. Notify (Always runs after deploy)   │
│     - Email notification                │
└─────────────────────────────────────────┘
```

---

## ⚙️ Setup Instructions

### Step 1: Add GitHub Secrets

You need to add these secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `RAILWAY_TOKEN` | Railway deployment token | Run `railway token` in your terminal |
| `NOTIFICATION_EMAIL` | Email to send from | `raverpay@outlook.com` |
| `NOTIFICATION_EMAIL_PASSWORD` | Email app password | Create app password in Outlook settings |

**Detailed instructions:** See [SETUP_SECRETS.md](./SETUP_SECRETS.md)

---

### Step 2: Configure Branch Protection (Recommended)

For production safety, enable branch protection on `main`:

1. Go to **Settings** → **Branches**
2. Add branch protection rule for `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select status checks:
     - `Quality Checks`
     - `Run Tests`
     - `Build All Apps`
     - `Security Scan`

This ensures no code can be merged to main without passing all checks.

---

## 🔄 Workflow Triggers

### Automatic Triggers

1. **Pull Request to main**
   - Runs all quality checks, tests, and builds
   - Does NOT deploy
   - Provides feedback on the PR

2. **Push to main**
   - Runs all checks
   - **Deploys to Railway** if all checks pass
   - Sends email notification

### Manual Trigger (Optional)

You can manually trigger the workflow from the GitHub Actions tab:
- Go to **Actions** → **CI/CD Pipeline** → **Run workflow**

---

## 🧪 Testing the Pipeline

### Test on a Feature Branch

1. Create a feature branch:
   ```bash
   git checkout -b test-ci-cd
   ```

2. Make a small change:
   ```bash
   echo "# CI/CD Test" >> README.md
   ```

3. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify CI/CD pipeline"
   git push origin test-ci-cd
   ```

4. Create a Pull Request to `main`
   - The pipeline should run automatically
   - Check the "Checks" tab on your PR

5. If all checks pass, merge to `main`
   - Deployment should trigger automatically
   - You should receive an email notification

---

## 📊 Pipeline Performance

- **Quality Checks**: ~2-3 minutes
- **Tests**: ~2-3 minutes
- **Build**: ~3-5 minutes
- **Security Scan**: ~1-2 minutes
- **Deployment**: ~2-3 minutes
- **Total**: ~10-15 minutes (with parallel execution)

---

## 🐛 Troubleshooting

### Pipeline Fails on Format Check
**Fix:** Run `pnpm format` locally and commit changes

### Pipeline Fails on Linting
**Fix:** Run `pnpm lint` locally and fix issues

### Pipeline Fails on Type Check
**Fix:** Run `pnpm typecheck` locally and fix TypeScript errors

### Pipeline Fails on Tests
**Fix:** Run `pnpm test` locally and fix failing tests

### Deployment Fails
1. Check Railway token is valid: `railway whoami`
2. Verify Railway service name matches: `raverpay-api`
3. Check Railway logs: `railway logs --service raverpay-api`

### Email Notifications Not Working
1. Verify secrets are set correctly in GitHub
2. Use an app-specific password (not your regular password)
3. Check GitHub Actions logs for error details

---

## 🔒 Security Features

### 1. Dependency Scanning
- Runs `pnpm audit` on every push
- Fails on HIGH or CRITICAL vulnerabilities
- **Action required:** Fix vulnerabilities before merging

### 2. Secret Detection
- Uses TruffleHog to scan for leaked secrets
- Checks all code changes
- **Action required:** Remove any detected secrets

### 3. Environment Isolation
- Build environment uses dummy values
- Real secrets only on Railway (not in GitHub)
- Separate environments for dev/prod

---

## 🚦 Status Badges (Optional)

Add this to your main README.md to show build status:

```markdown
[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/raverpay/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/YOUR_USERNAME/raverpay/actions/workflows/ci-cd.yml)
```

---

## 📝 Local Development

Before pushing code, run these checks locally:

```bash
# Install dependencies
pnpm install

# Format code
pnpm format

# Check formatting
pnpm format:check

# Run linting
pnpm lint

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Build all apps
pnpm build
```

---

## 🎯 Best Practices

1. **Always create feature branches** - Don't push directly to main
2. **Run checks locally first** - Saves CI/CD time and costs
3. **Write meaningful commit messages** - They appear in deployment emails
4. **Keep PRs small** - Easier to review and faster to merge
5. **Add tests for new features** - Maintains code quality
6. **Review security scan results** - Don't ignore warnings

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Documentation](https://docs.railway.app)
- [TurboRepo Documentation](https://turbo.build/repo/docs)
- [pnpm Documentation](https://pnpm.io)

---

## 🤝 Contributing

When contributing to this repository:

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass locally
4. Create a Pull Request
5. Wait for CI/CD checks to pass
6. Get review approval
7. Merge to `main`

The pipeline will automatically deploy your changes to production!

