# Phase 2: Detailed Tasks

## Prerequisites

- [ ] Phase 1 (Renaming) complete
- [ ] New logo asset: `splash-icon-inganta.png` (red circle with white hand icon)
- [ ] Onboarding illustration assets (or create placeholder components)

---

## Part A: Theme & Color System Updates

### A.1 Update Color Constants

File: `apps/mobile/src/constants/colors.ts`

- [ ] Update primary color:

  ```typescript
  // FROM
  500: '#5B55F6', // Main brand color (purple)

  // TO
  500: '#C41E3A', // Main brand color (red)
  ```

- [ ] Update full primary color palette to red shades
- [ ] Update dark mode background colors:
  ```typescript
  background: '#0A0A0A', // Pure black
  surface: '#1A1A1A',    // Slightly lighter
  card: '#2A2A2A',       // Card background
  ```
- [ ] Add new color constants for IngantaPay:
  ```typescript
  accent: {
    yellow: '#F59E0B', // For links like "Forgot Password"
    red: '#C41E3A',    // Primary red
    darkRed: '#991B1B',
  }
  ```

### A.2 Create Theme Constants (if not exists)

- [ ] Create centralized theme file for auth screens
- [ ] Define consistent styling variables

---

## Part B: Splash Screen

### B.1 Update Splash Screen

File: `app/(auth)/welcome.tsx` (splash section)

- [ ] Change background from gray to black (#0A0A0A)
- [ ] Replace logo with new IngantaPay logo
- [ ] Update animations (scale 0.8→1.0, 1500ms duration)
- [ ] Keep auto-navigation timer (2 seconds)
- [ ] Set StatusBar to 'light' style

Reference: `/IngantaPay/Analysis/01 - WELCOME FLOW/01 - Splash Screen.md`

---

## Part C: Onboarding Carousel (NEW)

### C.1 Create Onboarding Screen

File: `app/(auth)/onboarding.tsx` **[CREATE NEW]**

- [ ] Create file structure with carousel component
- [ ] Implement slide data array with 4 slides:
  1. "Pay With Palm"
  2. "Secure Wallet"
  3. "Instant Bill Payments"
  4. "Cashback & Rewards"

### C.2 Implement Carousel UI

- [ ] Header with Skip button (top-right)
- [ ] Back button (from slide 2+, top-left)
- [ ] Main illustration card (red gradient background)
- [ ] Title and description text
- [ ] Pagination dots/bars (4 indicators)
- [ ] Navigation button (red circular with arrow)

### C.3 Carousel Logic

- [ ] Swipe gestures (react-native-gesture-handler)
- [ ] Slide transitions (react-native-reanimated)
- [ ] Skip → Welcome screen
- [ ] Complete → Welcome screen + mark hasSeenOnboarding

### C.4 Onboarding Store

File: `src/store/onboarding-store.ts` (or update existing)

- [ ] Add `hasSeenOnboarding` state
- [ ] Persist to AsyncStorage

### C.5 Onboarding Assets

- [ ] Create/add placeholder illustrations for 4 slides
- [ ] OR create programmatic illustrations with icons

Reference: `/IngantaPay/Analysis/01 - WELCOME FLOW/02-05 - Onboarding Screens.md`

---

## Part D: Welcome/Auth Screen Redesign

### D.1 Redesign Welcome Screen

File: `app/(auth)/welcome.tsx`

- [ ] Change background to black (#0A0A0A or #1A1A1A)
- [ ] Add phone mockup preview at top (optional, can skip initially)
- [ ] Update title: "Welcome To Inganta Pay"
- [ ] Update subtitle about palm biometric
- [ ] Primary button: "Create Account" (red)
- [ ] Secondary button: "Login" (dark gray with border)
- [ ] Footer: Terms & Privacy Policy link

### D.2 Remove Old Elements

- [ ] Remove/comment out FeatureItem components
- [ ] Remove "Your Digital Wallet for Everything" tagline
- [ ] Remove RaverPay logo section
- [ ] Remove "I already have an account" ghost button

### D.3 Add Animations

- [ ] Fade in + slide up for text
- [ ] Button entrance animations
- [ ] Use react-native-reanimated

Reference: `/IngantaPay/Analysis/01 - WELCOME FLOW/06 - Auth Screen.md`

---

## Part E: Registration Screen Redesign

### E.1 Redesign Register Screen

File: `app/(auth)/register.tsx`

- [ ] Convert from multi-step wizard to single scroll form
- [ ] Remove step indicators
- [ ] Update background to black

### E.2 Update Form Fields

- [ ] Full Name (single field, replacing firstName + lastName)
- [ ] Phone Number (with country code)
- [ ] Email Address
- [ ] Address (multiline)
- [ ] Password (remove strength indicator)
- [ ] Referral Code (optional)

### E.3 Update Form Schema

```typescript
const registerSchema = z.object({
  fullName: z.string().min(3),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().min(10),
  password: passwordSchema,
  referralCode: z.string().optional(),
});
```

### E.4 Update Input Styling

- [ ] Dark backgrounds (#2A2A2A)
- [ ] Left-aligned icons
- [ ] 12px border radius
- [ ] 56px height

### E.5 Update Button & Footer

- [ ] "Create Account" button (red)
- [ ] "Already have an account? Log in" (gray + red)

### E.6 Navigation Update

- [ ] After registration → KYC Overview screen

Reference: `/IngantaPay/Analysis/02 - REGISTRATION & KYC VERIFICATION FLOW/01 - Create Account Screen.md`

---

## Part F: KYC Flow (NEW SCREENS)

### F.1 KYC Overview Screen

File: `app/(auth)/kyc-overview.tsx` **[CREATE NEW]**

- [ ] Shield icon with dark background
- [ ] Title: "Complete KYC Verification"
- [ ] 4 clickable step cards
- [ ] Note box about 5 minutes
- [ ] "Start Verification" button

### F.2 KYC Personal Information

File: `app/(auth)/kyc/personal-information.tsx` **[CREATE NEW]**

- [ ] Header with progress bar (25%)
- [ ] Fields: First Name, Last Name, DOB, Gender, Nationality
- [ ] Date picker for DOB
- [ ] Dropdown for Gender
- [ ] Continue button

### F.3 KYC Address Information

File: `app/(auth)/kyc/address-information.tsx` **[CREATE NEW]**

- [ ] Header with progress bar (50%)
- [ ] Fields: Street Address, City, District, Country, Postal Code
- [ ] Continue button

### F.4 KYC ID Verification

File: `app/(auth)/kyc/id-verification.tsx` **[CREATE NEW]**

- [ ] Header with progress bar (75%)
- [ ] ID type selection (National ID, Passport, Driver's License)
- [ ] Selection cards with radio behavior
- [ ] Continue button

### F.5 KYC Document Upload

File: `app/(auth)/kyc/upload-document.tsx` **[CREATE NEW]**

- [ ] Camera/gallery picker
- [ ] Document preview
- [ ] Retake option
- [ ] Upload progress

### F.6 KYC Selfie Capture

File: `app/(auth)/kyc/selfie-capture.tsx` **[CREATE NEW]**

- [ ] Camera view with face frame overlay
- [ ] Face detection guidance
- [ ] Auto-capture or manual button
- [ ] Progress indicator

### F.7 KYC Success Screens

Files: `identity-verified.tsx`, `submitted-successfully.tsx` **[CREATE NEW]**

- [ ] Selfie preview with checkmark
- [ ] Success messages
- [ ] Reference ID display
- [ ] Continue to app button

### F.8 Palm Enrollment (Optional)

File: `app/(auth)/palm-enrollment.tsx` **[CREATE NEW]**

- [ ] Skip option
- [ ] Enrollment centers list
- [ ] Get directions integration
- [ ] What to expect info

Reference: `/IngantaPay/Analysis/02 - REGISTRATION & KYC VERIFICATION FLOW/02-09.md`

---

## Part G: Login Screen Redesign

### G.1 Redesign Login Screen

File: `app/(auth)/login.tsx`

- [ ] Update background to black
- [ ] Remove back button
- [ ] Update title: "Welcome Back"
- [ ] Update subtitle about Mosaic Wallet

### G.2 Update Form Fields

- [ ] Change email field to "Email or Phone"
- [ ] Update identifier validation (accept email OR phone)
- [ ] Keep password field with eye toggle

### G.3 Remove Biometric UI

- [ ] Remove/comment out biometric login button
- [ ] Remove "OR" divider
- [ ] Remove user greeting section
- [ ] Keep biometric logic for future use (commented)

### G.4 Update Styling

- [ ] "Forgot Password?" link (yellow color)
- [ ] "Login" button (red)
- [ ] Footer: "Don't have an account? Sign up"

Reference: `/IngantaPay/Analysis/03 - LOGIN & FORGOT PASSWORD/01 - Login Screen.md`

---

## Part H: Forgot Password Redesign

### H.1 Redesign Forgot Password

File: `app/(auth)/forgot-password.tsx`

- [ ] Update background to black
- [ ] Simplify header (back button, no icon)
- [ ] Update title and subtitle
- [ ] Change email field to "Email or Phone"
- [ ] Remove footer link
- [ ] Update button: "Send Reset Code"

### H.2 Update Validation

- [ ] Accept both email and phone formats
- [ ] Update schema to use `identifier`

Reference: `/IngantaPay/Analysis/03 - LOGIN & FORGOT PASSWORD/02 - Forgot Password Screen.md`

---

## Part I: Backend API Updates

### I.1 Update User Model

File: `apps/api/prisma/schema.prisma`

- [ ] Add fields: fullName, address, referralCode
- [ ] Add kycStatus enum
- [ ] Add kycSubmittedAt, kycApprovedAt, kycRejectedAt
- [ ] Add kycReferenceId

### I.2 Create KYC Tables Migration

File: `apps/api/prisma/kyc_migration.sql` **[CREATE NEW]**

- [ ] kyc_personal_info table
- [ ] kyc_address_info table
- [ ] kyc_documents table
- [ ] kyc_audit_log table

### I.3 Create KYC Module

Files in `apps/api/src/modules/kyc/` **[CREATE NEW]**

- [ ] kyc.module.ts
- [ ] kyc.controller.ts
- [ ] kyc.service.ts
- [ ] kyc.dto.ts
- [ ] kyc entities

### I.4 Update Auth Endpoints

- [ ] Register: Accept fullName, address, referralCode
- [ ] Login: Accept identifier (email OR phone)
- [ ] Forgot Password: Accept identifier

### I.5 Create KYC Endpoints

- [ ] GET /kyc/status
- [ ] POST /kyc/personal-information
- [ ] POST /kyc/address-details
- [ ] POST /kyc/upload-document (multipart)
- [ ] POST /kyc/upload-selfie (multipart)
- [ ] POST /kyc/submit

### I.6 Email/SMS Templates

- [ ] Create KYC submission confirmation email
- [ ] Create KYC approved email
- [ ] Create KYC rejected email
- [ ] Create password reset SMS template

Reference: `/IngantaPay/Analysis/02 - REGISTRATION & KYC VERIFICATION FLOW/10-11.md`
Reference: `/IngantaPay/Analysis/03 - LOGIN & FORGOT PASSWORD/03-04.md`

---

## Part J: Admin Dashboard (KYC Management)

### J.1 KYC Overview Page

Route: `/admin/kyc`

- [ ] Statistics cards
- [ ] Submissions table
- [ ] Filters and search

### J.2 KYC Review Page

Route: `/admin/kyc/review/[id]`

- [ ] User information display
- [ ] Document viewer
- [ ] Approval/rejection workflow

### J.3 KYC Admin Endpoints

- [ ] GET /admin/kyc/submissions
- [ ] GET /admin/kyc/submission/:id
- [ ] PATCH /admin/kyc/submission/:id/status

Reference: `/IngantaPay/Analysis/02 - REGISTRATION & KYC VERIFICATION FLOW/10 - ADMIN DASHBOARD.md`

---

## Part K: Testing & Verification

### K.1 Mobile App Testing

- [ ] Splash screen displays correctly
- [ ] Onboarding carousel works
- [ ] Welcome screen navigation works
- [ ] Registration flow works end-to-end
- [ ] KYC flow works (all steps)
- [ ] Login with email works
- [ ] Login with phone works
- [ ] Forgot password flow works
- [ ] Dark theme consistent throughout

### K.2 API Testing

- [ ] Registration with new fields works
- [ ] Login with identifier works
- [ ] KYC endpoints return expected responses
- [ ] Document uploads work

### K.3 Admin Testing

- [ ] KYC submissions display
- [ ] Approval workflow works
- [ ] Rejection workflow works

---

## Notes for AI Agents

1. **Theme Updates First**: Update colors.ts before working on screens
2. **One Screen at a Time**: Complete one screen fully before moving to next
3. **Test Often**: Run the app frequently to verify changes
4. **Comment Old Code**: Use `// OLD_RAVERPAY:` prefix when commenting out
5. **Keep Patterns**: Use existing components (Input, Button, Card, etc.)
6. **Check Existing**: Some screens may already have similar logic - adapt rather than recreate
