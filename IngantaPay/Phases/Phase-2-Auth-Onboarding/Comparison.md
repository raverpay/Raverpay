# Phase 2: Current vs. Target Comparison

## Color System

### Primary Colors

| Purpose         | Current (Purple) | Target (Red) |
| --------------- | ---------------- | ------------ |
| Primary 50      | #F5F3FF          | #FEF2F2      |
| Primary 100     | #EDE9FE          | #FEE2E2      |
| Primary 200     | #DDD6FE          | #FECACA      |
| Primary 300     | #C4B5FD          | #FCA5A5      |
| Primary 400     | #A78BFA          | #F87171      |
| **Primary 500** | **#5B55F6**      | **#C41E3A**  |
| Primary 600     | #7C3AED          | #DC2626      |
| Primary 700     | #6D28D9          | #B91C1C      |
| Primary 800     | #5B21B6          | #991B1B      |
| Primary 900     | #4C1D95          | #7F1D1D      |

### Background Colors (Dark Mode)

| Purpose    | Current             | Target               |
| ---------- | ------------------- | -------------------- |
| Background | #0F172A (dark blue) | #0A0A0A (pure black) |
| Surface    | #1E293B             | #1A1A1A              |
| Card       | #1E293B             | #2A2A2A              |
| Border     | #334155             | #333333              |

### Additional Colors

| Purpose       | Current | Target  |
| ------------- | ------- | ------- |
| Accent Yellow | N/A     | #F59E0B |
| Card Light    | N/A     | #3A3A3A |

---

## Splash Screen

| Element        | Current                     | Target                       |
| -------------- | --------------------------- | ---------------------------- |
| Background     | Gray (bg-gray-50/gray-900)  | Pure black (#0A0A0A)         |
| Logo           | splash-icon.png (purple RP) | Red circle + white hand icon |
| Animation      | Scale + opacity             | Scale 0.8→1.0, 1500ms        |
| Text           | Has text elements           | No text - logo only          |
| StatusBar      | Default                     | Light style                  |
| Auto-nav timer | 2 seconds                   | Keep 2 seconds               |

---

## Onboarding Flow

| Element     | Current        | Target                    |
| ----------- | -------------- | ------------------------- |
| Onboarding  | Does not exist | 4-screen carousel         |
| Slide 1     | N/A            | "Pay With Palm"           |
| Slide 2     | N/A            | "Secure Wallet"           |
| Slide 3     | N/A            | "Instant Bill Payments"   |
| Slide 4     | N/A            | "Cashback & Rewards"      |
| Skip button | N/A            | Top-right, white text     |
| Navigation  | N/A            | Red circular arrow button |
| Pagination  | N/A            | 4 vertical bars           |
| Store       | hasSeenWelcome | Add hasSeenOnboarding     |

---

## Welcome Screen

| Element          | Current                     | Target                             |
| ---------------- | --------------------------- | ---------------------------------- |
| Background       | Light gray                  | Dark/black (#1A1A1A)               |
| Logo section     | "RP" text, purple           | Phone mockup preview               |
| Feature items    | 3 emoji cards (💳📱⚡)      | **REMOVE**                         |
| Title            | "RaverPay"                  | "Welcome To Inganta Pay"           |
| Subtitle         | "Your Digital Wallet..."    | "Experience the future..."         |
| Primary button   | "Get Started"               | "Create Account" (red)             |
| Secondary button | "I already have an account" | "Login" (dark gray)                |
| Footer           | None                        | "By continuing... Terms & Privacy" |

---

## Registration Form

| Element         | Current                 | Target                    |
| --------------- | ----------------------- | ------------------------- |
| Form type       | 3-step wizard           | Single page scroll        |
| Step indicators | 3 bars                  | **REMOVE**                |
| First Name      | Required                | **COMBINE**               |
| Last Name       | Required                | **COMBINE** → Full Name   |
| Full Name       | N/A                     | New field                 |
| Phone           | Required                | Keep (add country code)   |
| Email           | Required                | Keep                      |
| Address         | Not in form             | **ADD** (multiline)       |
| Password        | With strength indicator | Remove indicator          |
| Referral Code   | Not in form             | **ADD** (optional)        |
| Button          | "Continue" → Next step  | "Create Account" (single) |
| After submit    | Navigate to tabs        | Navigate to KYC Overview  |

---

## KYC Flow (New)

| Screen          | Current        | Target            |
| --------------- | -------------- | ----------------- |
| KYC Overview    | Does not exist | New screen        |
| Personal Info   | Does not exist | Step 1 of 4       |
| Address Info    | Does not exist | Step 2 of 4       |
| ID Verification | Does not exist | Step 3 of 4       |
| Selfie Capture  | Does not exist | Step 4 of 4       |
| Success screens | Does not exist | 2 new screens     |
| Palm Enrollment | Does not exist | Optional post-KYC |

---

## Login Screen

| Element          | Current                  | Target                  |
| ---------------- | ------------------------ | ----------------------- |
| Background       | Light/gray               | Black (#0A0A0A)         |
| Back button      | Present                  | **REMOVE**              |
| User greeting    | "Welcome back, [Name]!"  | **REMOVE**              |
| Switch account   | Present                  | **REMOVE**              |
| Email field      | Email only               | "Email or Phone"        |
| Password field   | Present                  | Keep                    |
| Biometric button | Face ID/Fingerprint      | **REMOVE** (keep logic) |
| "OR" divider     | Present                  | **REMOVE**              |
| Forgot Password  | Gray link                | Yellow text (#F59E0B)   |
| Login button     | Purple                   | Red (#C41E3A)           |
| Footer           | "Don't have an account?" | Keep, update colors     |

---

## Forgot Password Screen

| Element     | Current                     | Target             |
| ----------- | --------------------------- | ------------------ |
| Background  | Light/gray                  | Black              |
| Header icon | 🔒 with purple circle       | **REMOVE**         |
| Title       | "Reset Password" or similar | "Forgot Password?" |
| Field       | Email only                  | "Email or Phone"   |
| Footer link | "Remember your password?"   | **REMOVE**         |
| Button      | Previous text               | "Send Reset Code"  |

---

## Input Field Styling

| Property      | Current    | Target              |
| ------------- | ---------- | ------------------- |
| Background    | White/gray | Dark gray (#2A2A2A) |
| Border        | Light gray | None or #333        |
| Border radius | Various    | 12px                |
| Height        | Various    | 56px                |
| Text color    | Dark       | White               |
| Placeholder   | Gray       | Gray-500            |
| Icon position | Various    | Left side           |
| Icon color    | Various    | Gray-400            |

---

## Button Styling

| Type             | Current           | Target                    |
| ---------------- | ----------------- | ------------------------- |
| Primary bg       | #5B55F6 (purple)  | #C41E3A (red)             |
| Primary text     | White             | White                     |
| Primary height   | Various           | 56px                      |
| Primary radius   | Various           | 12px                      |
| Secondary bg     | Transparent/light | rgba(255,255,255,0.1)     |
| Secondary border | Various           | 1px rgba(255,255,255,0.2) |

---

## Backend Changes

### User Model

| Field          | Current        | Target             |
| -------------- | -------------- | ------------------ |
| firstName      | Required       | Keep (for KYC)     |
| lastName       | Required       | Keep (for KYC)     |
| fullName       | Does not exist | **ADD**            |
| address        | Does not exist | **ADD**            |
| referralCode   | Does not exist | **ADD** (optional) |
| kycStatus      | Does not exist | **ADD** (enum)     |
| kycSubmittedAt | Does not exist | **ADD**            |
| kycApprovedAt  | Does not exist | **ADD**            |
| kycRejectedAt  | Does not exist | **ADD**            |
| kycReferenceId | Does not exist | **ADD**            |

### New Tables

| Table                    | Current | Target     |
| ------------------------ | ------- | ---------- |
| kyc_personal_info        | N/A     | **CREATE** |
| kyc_address_info         | N/A     | **CREATE** |
| kyc_documents            | N/A     | **CREATE** |
| kyc_audit_log            | N/A     | **CREATE** |
| palm_enrollment_centers  | N/A     | **CREATE** |
| palm_enrollment_requests | N/A     | **CREATE** |
| referral_tracking        | N/A     | **CREATE** |

### API Endpoints

| Endpoint                   | Current                     | Target                                 |
| -------------------------- | --------------------------- | -------------------------------------- |
| POST /auth/register        | Accepts firstName, lastName | Accept fullName, address, referralCode |
| POST /auth/login           | Accepts email               | Accept identifier (email OR phone)     |
| POST /auth/forgot-password | Accepts email               | Accept identifier                      |
| GET /kyc/status            | N/A                         | **CREATE**                             |
| POST /kyc/\*               | N/A                         | **CREATE** (multiple)                  |

---

## Navigation Flow Comparison

### Current Flow

```
App Launch → Splash → Welcome → Login/Register → Tabs
                         ↓
                    (optional)
                         ↓
                   Email Verify
```

### Target Flow

```
App Launch → Splash → Onboarding (if first time) → Welcome → Register → KYC Flow → Tabs
                                                      ↓               ↓
                                                    Login ←──────── Palm Enrollment (optional)
                                                      ↓
                                                    Tabs
```

---

## Items Not Changing in This Phase

| Item                     | Reason               |
| ------------------------ | -------------------- |
| Tab navigation structure | Part of later phases |
| Home screen design       | Part of Phase 3      |
| Profile screens          | Part of Phase 4      |
| VTU services             | Part of later phases |
| Crypto features          | Part of later phases |
| Wallet functions         | Part of later phases |
