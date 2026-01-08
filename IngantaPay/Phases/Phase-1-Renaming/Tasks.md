# Phase 1: Detailed Tasks

## Pre-Flight Checklist
- [ ] Create a new git branch: `git checkout -b feature/ingantapay-migration`
- [ ] Ensure all current changes are committed
- [ ] Run `pnpm install` and verify all apps build successfully

---

## 1. Mobile App Renaming

### 1.1 Folder Rename
- [ ] Rename `apps/raverpay-mobile` → `apps/mobile`

### 1.2 Package Configuration
- [ ] Update `apps/mobile/package.json`:
  ```json
  {
    "name": "@ingantapay/mobile",
    // ... other updates
  }
  ```

### 1.3 App Configuration
- [ ] Update `apps/mobile/app.json`:
  - [ ] `name`: "Inganta Pay"
  - [ ] `slug`: "ingantapay"
  - [ ] `scheme`: "ingantapay"
  - [ ] `ios.bundleIdentifier`: "com.ingantapay.app"
  - [ ] `android.package`: "com.ingantapay.app"

- [ ] Update `apps/mobile/app.config.js`:
  - [ ] App name references
  - [ ] Bundle identifiers
  - [ ] Any EAS project references

### 1.4 String Replacements in Mobile App
Files to search and replace "RaverPay" → "Inganta Pay":
- [ ] `app/(auth)/welcome.tsx`
- [ ] `app/(auth)/login.tsx`
- [ ] `app/(auth)/register.tsx`
- [ ] `src/components/**/*.tsx`
- [ ] Any notification/toast messages
- [ ] Any error messages

---

## 2. API Renaming

### 2.1 Folder Rename
- [ ] Rename `apps/raverpay-api` → `apps/api`

### 2.2 Package Configuration
- [ ] Update `apps/api/package.json`:
  ```json
  {
    "name": "@ingantapay/api",
    // ... other updates
  }
  ```

### 2.3 Email Templates
Location: `apps/api/src/modules/*/templates/*.hbs` (or similar path)

Update all email templates:
- [ ] Replace "RaverPay" with "Inganta Pay" in:
  - [ ] Welcome email
  - [ ] Password reset email
  - [ ] Email verification
  - [ ] Transaction notifications
  - [ ] KYC status emails (if existing)
  - [ ] Any other transactional emails

- [ ] Update email subjects
- [ ] Update footer text
- [ ] Update any support email addresses

### 2.4 Swagger Documentation
- [ ] Update Swagger title to "Inganta Pay API"
- [ ] Update API description
- [ ] Update any brand references in tags

### 2.5 String Replacements in API
- [ ] SMS templates (if any)
- [ ] Push notification messages
- [ ] Error messages
- [ ] Log messages (optional)

---

## 3. Admin Dashboard Renaming

### 3.1 Folder Rename
- [ ] Rename `apps/raverpay-admin` → `apps/admin`

### 3.2 Package Configuration
- [ ] Update `apps/admin/package.json`:
  ```json
  {
    "name": "@ingantapay/admin",
    // ... other updates
  }
  ```

### 3.3 UI Updates
- [ ] Update page title in `_app.tsx` or `layout.tsx`
- [ ] Update favicon (if needed)
- [ ] Update logo references
- [ ] Update footer text
- [ ] Update any "RaverPay Admin" references

---

## 4. Root Configuration Updates

### 4.1 pnpm-workspace.yaml
- [ ] Update workspace patterns if needed

### 4.2 turbo.json
- [ ] Update any references to old package names

### 4.3 Root package.json
- [ ] Update scripts that reference old folder names:
  ```json
  {
    "scripts": {
      "dev:api": "pnpm --filter @ingantapay/api dev",
      "dev:mobile": "pnpm --filter @ingantapay/mobile start",
      "dev:admin": "pnpm --filter @ingantapay/admin dev"
    }
  }
  ```

### 4.4 CI/CD Files
- [ ] Update `.github/workflows/*.yml` if any reference old names
- [ ] Update any deployment scripts

---

## 5. Shared Packages (if any)

### 5.1 Check packages folder
- [ ] Update any shared package names
- [ ] Update imports in dependent apps

---

## 6. Post-Rename Verification

### 6.1 Install Dependencies
- [ ] Run `pnpm install` at root
- [ ] Verify no resolution errors

### 6.2 Build Verification
- [ ] Run `pnpm build` for API
- [ ] Run `pnpm build` for Admin
- [ ] Run `pnpm start` for Mobile (or build preview)

### 6.3 Functionality Tests
- [ ] Start API and verify it runs
- [ ] Start Admin and verify it loads
- [ ] Start Mobile and verify it loads
- [ ] Run any existing tests

### 6.4 Git Commit
- [ ] Stage all changes
- [ ] Create commit: `feat: rename codebase from RaverPay to IngantaPay (Phase 1)`

---

## Rollback Plan

If something breaks during this phase:
1. `git checkout main` to return to working state
2. `pnpm install` to restore node_modules
3. Investigate issue before retrying

---

## Notes for AI Agents

When executing this phase:
1. Do folder renames one at a time
2. After each major step, verify the apps still work
3. Use `grep -r "RaverPay" --include="*.tsx" --include="*.ts"` to find remaining references
4. Don't forget hidden files and configuration files
5. Be careful with import paths that may break after folder rename
