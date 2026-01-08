# Phase 2: Splash, Onboarding, Welcome & Authentication

## Overview

This phase focuses on redesigning the entire authentication flow including splash screen, onboarding carousel, welcome screen, registration, login, and password recovery. This also includes the new KYC verification flow and palm enrollment screens.

## Objectives

1. Redesign splash screen with new IngantaPay branding
2. Create new 4-screen onboarding carousel
3. Redesign welcome/auth screen
4. Update registration to single-page form with new fields
5. Create full KYC verification flow (4 steps)
6. Update login screen
7. Update forgot password flow
8. Create palm enrollment screen
9. Update backend APIs to support new functionality

## Scope

### Mobile App - New Screens
| Screen | Status | File Path |
|--------|--------|-----------|
| Onboarding Carousel | **NEW** | `app/(auth)/onboarding.tsx` |
| KYC Overview | **NEW** | `app/(auth)/kyc-overview.tsx` |
| KYC Personal Info | **NEW** | `app/(auth)/kyc/personal-information.tsx` |
| KYC Address Info | **NEW** | `app/(auth)/kyc/address-information.tsx` |
| KYC ID Verification | **NEW** | `app/(auth)/kyc/id-verification.tsx` |
| KYC Selfie Capture | **NEW** | `app/(auth)/kyc/selfie-capture.tsx` |
| KYC Identity Verified | **NEW** | `app/(auth)/kyc/identity-verified.tsx` |
| KYC Submitted | **NEW** | `app/(auth)/kyc/submitted-successfully.tsx` |
| Palm Enrollment | **NEW** | `app/(auth)/palm-enrollment.tsx` |

### Mobile App - Updated Screens
| Screen | File Path | Changes |
|--------|-----------|---------|
| Splash | `app/(auth)/welcome.tsx` | New design, black bg, red logo |
| Welcome | `app/(auth)/welcome.tsx` | Complete redesign |
| Register | `app/(auth)/register.tsx` | Single page, new fields |
| Login | `app/(auth)/login.tsx` | Remove biometric button, new styling |
| Forgot Password | `app/(auth)/forgot-password.tsx` | New styling, email/phone support |

### Backend API - New Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Updated registration with new fields |
| `/api/kyc/status` | GET | Get user's KYC status |
| `/api/kyc/personal-information` | POST | Save KYC step 1 |
| `/api/kyc/address-details` | POST | Save KYC step 2 |
| `/api/kyc/upload-document` | POST | Upload ID document |
| `/api/kyc/upload-selfie` | POST | Upload selfie |
| `/api/kyc/submit` | POST | Submit KYC for review |
| `/api/palm-enrollment/centers` | GET | Get nearby enrollment centers |

### Backend API - Updated Endpoints
| Endpoint | Changes |
|----------|---------|
| `/api/auth/login` | Accept identifier (email OR phone) |
| `/api/auth/forgot-password` | Accept identifier, send SMS or email |

### Database Changes (New Tables)
- `kyc_personal_info`
- `kyc_address_info`
- `kyc_documents`
- `kyc_audit_log`
- `palm_enrollment_centers`
- `palm_enrollment_requests`
- `referral_tracking`

### Database Changes (Updated Tables)
- `users` - Add fullName, address, referralCode, kycStatus, kycReferenceId, etc.

### Admin Dashboard - New Pages
| Page | Route | Purpose |
|------|-------|---------|
| KYC Overview | `/admin/kyc` | Dashboard with stats and submissions |
| KYC Review | `/admin/kyc/review/[id]` | Review individual KYC submission |
| KYC Settings | `/admin/kyc/settings` | Configure KYC settings |
| KYC Analytics | `/admin/kyc/analytics` | KYC metrics and charts |

## Timeline Estimate
- **Mobile App Changes**: 10-15 hours
- **Backend API Changes**: 8-12 hours
- **Database Migrations**: 2-3 hours
- **Admin Dashboard**: 6-8 hours
- **Total**: 26-38 hours

## Dependencies
- Phase 1 (Renaming) must be complete
- New logo assets required (splash-icon-inganta.png)
- Onboarding illustration assets required
- S3/cloud storage configured for document uploads (optional)

## AI Analysis Source
All designs and requirements are based on the AI analysis in:
- `/IngantaPay/Analysis/01 - WELCOME FLOW/`
- `/IngantaPay/Analysis/02 - REGISTRATION & KYC VERIFICATION FLOW/`
- `/IngantaPay/Analysis/03 - LOGIN & FORGOT PASSWORD/`

## Key Design Principles

### Color Changes (Apply Throughout)
```typescript
// OLD (Purple theme)
primary: '#5B55F6'
background: '#F9FAFB' (light) / '#0F172A' (dark)

// NEW (Red/Dark theme)
primary: '#C41E3A'
primaryDark: '#991B1B'
background: '#0A0A0A' (always dark in auth flows)
cardBackground: '#2A2A2A'
```

### Typography
- Titles: White, bold, 28-32px
- Subtitles: Gray-400, 16px
- Labels: White, 14px
- Buttons: White, bold, 18px

### Input Fields
- Background: Dark gray (#2A2A2A)
- Border radius: 12px
- Height: 56px
- Icons: Left side, gray
- Text: White

### Buttons
- Primary: Red (#C41E3A), full width, 56px height
- Secondary: Dark gray with border, same dimensions
