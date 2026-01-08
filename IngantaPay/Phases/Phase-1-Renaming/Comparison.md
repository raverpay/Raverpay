# Phase 1: Current vs. Target Comparison

## Folder Names

| Current | Target | Notes |
|---------|--------|-------|
| `apps/raverpay-mobile` | `apps/mobile` | Simpler, brand-agnostic name |
| `apps/raverpay-api` | `apps/api` | Simpler, brand-agnostic name |
| `apps/raverpay-admin` | `apps/admin` | Simpler, brand-agnostic name |

## Package Names

| Current | Target | Location |
|---------|--------|----------|
| `raverpay-mobile` or similar | `@ingantapay/mobile` | `apps/mobile/package.json` |
| `raverpay-api` or similar | `@ingantapay/api` | `apps/api/package.json` |
| `raverpay-admin` or similar | `@ingantapay/admin` | `apps/admin/package.json` |

## Mobile App Configuration

| Property | Current | Target |
|----------|---------|--------|
| App Name | "RaverPay" | "Inganta Pay" |
| Slug | "raverpay" | "ingantapay" |
| Scheme | "raverpay" | "ingantapay" |
| iOS Bundle ID | "com.raverpay.app" (or similar) | "com.ingantapay.app" |
| Android Package | "com.raverpay.app" (or similar) | "com.ingantapay.app" |

## Email Templates

| Template | Current Brand | Target Brand |
|----------|---------------|--------------|
| Welcome | "RaverPay" / "Raver Pay" | "Inganta Pay" |
| Password Reset | "RaverPay" | "Inganta Pay" |
| Email Verification | "RaverPay" | "Inganta Pay" |
| Transaction Notifications | "RaverPay" | "Inganta Pay" |
| All Others | "RaverPay" | "Inganta Pay" |

## Color Scheme Changes (Preview for Phase 2+)

| Element | Current Color | Target Color |
|---------|--------------|--------------|
| Primary Brand | #5B55F6 (Purple) | #C41E3A (Red) |
| Primary Dark | #7C3AED | #991B1B |
| Primary Light | #A78BFA | #DC2626 |
| Background (Dark Mode) | #0F172A | #0A0A0A |
| Card Background | #1E293B | #2A2A2A |

> **Note**: Color changes are part of Phase 2+, not Phase 1. This is included for reference only.

## Admin Dashboard

| Element | Current | Target |
|---------|---------|--------|
| Page Title | "RaverPay Admin" | "Inganta Pay Admin" |
| Logo | RaverPay logo | Inganta Pay logo |
| Footer | RaverPay branding | Inganta Pay branding |

## Scripts (Root package.json)

| Current Script | Target Script |
|----------------|---------------|
| `dev:raverpay-api` | `dev:api` |
| `dev:raverpay-mobile` | `dev:mobile` |
| `dev:raverpay-admin` | `dev:admin` |
| `build:raverpay-api` | `build:api` |
| `build:raverpay-admin` | `build:admin` |

---

## Items to Keep Unchanged

These elements should **NOT** be changed in Phase 1:

| Item | Reason |
|------|--------|
| Database name/connection | Data continuity |
| API endpoints | Client compatibility |
| Authentication tokens | Session continuity |
| File structure inside apps | Not part of renaming |
| Component names | Internal naming only |
| Prisma schema | Not branding-related |
| Third-party service keys | Environment-specific |

---

## Verification Checklist

After renaming, verify these still work:

| Check | Expected Result |
|-------|-----------------|
| `pnpm install` | No errors, all dependencies resolve |
| `pnpm build:api` | Successful build |
| `pnpm build:admin` | Successful build |
| `pnpm dev:mobile` | App starts in simulator |
| API health check | Returns 200 OK |
| Admin login | Can log in successfully |
| Mobile app launch | App displays correctly |
