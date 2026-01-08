# Phase 4: Profile & Settings

## Overview

This phase focuses on redesigning the profile screen and all related settings screens including Edit Profile, Security Settings, and the new App Settings screen.

## Objectives

1. Redesign main Profile screen with dark theme
2. Add Mosaic Code display and KYC verified badge
3. Redesign Edit Profile screen (simplified fields)
4. Redesign Security Settings with security score card
5. Create new App Settings screen (consolidating settings)
6. Update all sub-screens to dark theme

## Scope

### Mobile App - Updated Screens
| Screen | File Path | Changes |
|--------|-----------|---------|
| Profile (Main) | `app/(tabs)/profile.tsx` | Complete redesign |
| Edit Profile | `app/edit-profile.tsx` | Simplified form, dark theme |
| Security Settings | `app/security-settings.tsx` | Add security score, dark theme |

### Mobile App - New Screens
| Screen | File Path | Purpose |
|--------|-----------|---------|
| App Settings | `app/app-settings.tsx` | Consolidated settings |
| Mosaic Code Details | `app/mosaic-code-details.tsx` | View QR code, share |
| About | `app/about.tsx` | App information |

### Backend API (Optional Updates)
| Endpoint | Changes |
|----------|---------|
| GET /users/security-score | New endpoint (optional) |
| PUT /users/notification-preferences | Update endpoint |
| GET /users/mosaic-code | New endpoint (optional) |

## Timeline Estimate
- **Estimated Duration**: 6-8 hours
- **Risk Level**: Low

## Dependencies
- Phase 1 (Renaming) complete
- Phase 2 (Theme colors) complete

## AI Analysis Source
All designs are based on:
- `/IngantaPay/Analysis/05 - PROFILE SCREENS/`

## Key Design Changes

### Profile Screen
- Centered profile picture (112x112px)
- Centered name and email
- KYC Verified badge (if approved)
- Mosaic Code card with "View" button
- 4 menu items (Edit, Security, App Settings, Help)
- Red Logout button at bottom

### Edit Profile
- Simplified to: Full Name (readonly), Email (readonly), Phone (readonly), Address (editable)
- Remove: DOB, Gender, Nationality, City, State
- Red camera button on avatar

### Security Settings
- New Security Score card with shield icon and gradient
- Authentication toggles: Biometric, Palm, 2FA
- Password & PIN navigation items

### App Settings (New)
- Notification toggles: Push, Email, SMS
- Appearance: Dark Mode toggle
- About navigation
