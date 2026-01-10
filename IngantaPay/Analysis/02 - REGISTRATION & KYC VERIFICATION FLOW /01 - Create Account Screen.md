IMAGE 1: Create Account Screen
Corresponding Screen: app/(auth)/register.tsx
MOBILE APP PROMPT:

Update the current registration screen in app/(auth)/register.tsx to match the new Inganta Pay design with these requirements:

DESIGN CHANGES:

1. BACKGROUND & THEME:
   - Change from gray background (bg-gray-50/gray-900) to solid black (#0A0A0A or #1A1A1A)
   - All text should be white or gray for contrast
   - StatusBar: Set to 'light' style

2. HEADER SECTION:
   - Keep the back button but update styling:
     - Remove the circular white/gray background
     - Use simple left arrow (←) with white color
     - Position: top-left, no background circle
   - Update title: "Create Account" (white, bold, size: 28px)
   - Update subtitle: "Join Inganta Pay and start using palm biometric payments" (gray-400, size: 16px)
   - Remove the "Step X of 3" text and step indicators completely

3. FORM LAYOUT - SINGLE PAGE (Remove Multi-Step):
   - Convert from 3-step wizard to single scrollable form
   - Remove step indicator bars
   - Remove handleNext, handleBack step navigation logic
   - Display ALL fields on one screen in this order:
     a. Full Name (single field, not split)
     b. Phone Number
     c. Email Address
     d. Address (text area/multiline)
     e. Password
     f. Referral Code (Optional)

4. INPUT FIELD STYLING:
   - Background: Dark gray (#2A2A2A or #333333)
   - Border: None or subtle 1px gray border
   - Border radius: 12px
   - Height: 56px (except Address field)
   - Text color: White
   - Placeholder color: Gray-500
   - Label color: White, size: 14px, positioned above input
   - Icons: Position on LEFT side, gray color
5. SPECIFIC FIELD REQUIREMENTS:
   - Full Name:
     - Label: "Full Name"
     - Icon: User/person icon (left side)
     - Placeholder: "Enter your full name"
     - Update backend/form to accept single fullName field instead of firstName + lastName
   - Phone Number:
     - Label: "Phone Number"
     - Icon: Phone icon (left side)
     - Placeholder: "+256 700 000 000"
     - Pre-fill country code or add country selector
   - Email Address:
     - Label: "Email Address"
     - Icon: Envelope/mail icon (left side)
     - Placeholder: "your.email@example.com"
   - Address:
     - Label: "Address"
     - Icon: Location/map pin icon (left side)
     - Placeholder: "123 Kampala Road, Nigeria"
     - Make this a MULTILINE input (min 3 rows, max 5 rows)
     - Height: Auto-expand with content
   - Password:
     - Label: "Password"
     - Icon: Lock icon (left side)
     - Placeholder: "Create a strong password"
     - Right icon: Eye icon for show/hide toggle
     - REMOVE password strength indicator
   - Referral Code:
     - Label: "Referral Code (Optional)"
     - Icon: Gift/present icon (left side)
     - Placeholder: "Enter referral code"
     - This field is NOT required

6. SUBMIT BUTTON:
   - Text: "Create Account"
   - Background: Solid red (#C41E3A)
   - Text: White, bold, size: 18px
   - Border radius: 12px
   - Height: 56px
   - Full width with horizontal padding
   - Position: Below form fields with 24px top margin
   - Loading state: Show spinner when isRegistering is true

7. FOOTER TEXT:
   - Update from "Already have an account? Sign In" to:
     "Already have an account? Log in"
   - "Log in" text should be red (#C41E3A), clickable
   - Centered alignment
   - Gray text for main part, red for "Log in"

8. REMOVE COMPLETELY:
   - Multi-step wizard logic (currentStep state)
   - Step indicator bars
   - "Continue" button (replace with single "Create Account" button)
   - Password strength indicator
   - "By creating an account..." terms text (move to welcome screen instead)

FORM VALIDATION UPDATES:

- Update registerSchema to use single fullName field:

```typescript
const registerSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().min(10, 'Please provide a complete address'),
  password: passwordSchema,
  referralCode: z.string().optional(),
});
```

NAVIGATION BEHAVIOR:

- After successful registration, navigate to KYC verification overview screen
- Update onSubmit to call new registration endpoint with updated fields
- Back button should go back to welcome screen

TECHNICAL REQUIREMENTS:

- Use KeyboardAvoidingView to handle keyboard properly
- ScrollView should show all fields without pagination
- Maintain form validation with updated schema
- Update Controller components to match new field names
- Test on both iOS and Android for proper keyboard behavior

BACKEND API PROMPT (for apps/api):
Update the user registration endpoint and database schema to support the new Inganta Pay registration flow with KYC requirements.

DATABASE SCHEMA CHANGES:

1. Update User model/table:
   - Change firstName + lastName to single fullName field (VARCHAR 255)
   - Keep email (unique, required)
   - Keep phone (unique, required)
   - Add address field (TEXT, required)
   - Add referralCode field (VARCHAR 50, optional, nullable)
   - Keep password (hashed)
   - Add kycStatus enum field: 'pending', 'in_progress', 'submitted', 'approved', 'rejected' (default: 'pending')
   - Add kycSubmittedAt (TIMESTAMP, nullable)
   - Add kycApprovedAt (TIMESTAMP, nullable)
   - Add kycRejectedAt (TIMESTAMP, nullable)
   - Add kycReferenceId (VARCHAR 50, unique, nullable) - auto-generated on KYC submission

2. Create new KYCDocument model/table:
   - id (PRIMARY KEY)
   - userId (FOREIGN KEY to User)
   - documentType: ENUM('personal_info', 'address_proof', 'id_document', 'selfie')
   - documentUrl (TEXT) - S3/cloud storage URL
   - status: ENUM('pending', 'approved', 'rejected')
   - uploadedAt (TIMESTAMP)
   - verifiedAt (TIMESTAMP, nullable)
   - rejectionReason (TEXT, nullable)
   - metadata (JSON) - store additional data like ID type, ID number, etc.

3. Create KYCPersonalInfo model/table (for step 1):
   - id (PRIMARY KEY)
   - userId (FOREIGN KEY to User, unique)
   - firstName (VARCHAR 100)
   - lastName (VARCHAR 100)
   - dateOfBirth (DATE)
   - gender (ENUM: 'male', 'female', 'other')
   - nationality (VARCHAR 100)
   - createdAt (TIMESTAMP)
   - updatedAt (TIMESTAMP)

4. Create KYCAddressInfo model/table (for step 2):
   - id (PRIMARY KEY)
   - userId (FOREIGN KEY to User, unique)
   - streetAddress (VARCHAR 255)
   - city (VARCHAR 100)
   - district (VARCHAR 100)
   - country (VARCHAR 100)
   - postalCode (VARCHAR 20, nullable)
   - createdAt (TIMESTAMP)
   - updatedAt (TIMESTAMP)

API ENDPOINTS TO CREATE/UPDATE:

1. POST /api/auth/register
   Request body:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+256700000000",
  "address": "123 Kampala Road, Nigeria",
  "password": "SecurePass123!",
  "referralCode": "REF123" // optional
}
```

Logic:

- Validate all required fields
- Check if referralCode exists (if provided) and is valid
- Hash password using bcrypt
- Create user with kycStatus = 'pending'
- Send verification email
- Return JWT token + user object

Response (201):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+256700000000",
      "address": "123 Kampala Road, Nigeria",
      "kycStatus": "pending",
      "emailVerified": false
    },
    "token": "jwt_token_here"
  }
}
```

2. GET /api/kyc/status
   - Returns current KYC status for authenticated user
   - Include referenceId if submitted
3. POST /api/kyc/personal-information (Step 1)
   Request body:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "nationality": "Nigerian"
}
```

Logic:

- Save to KYCPersonalInfo table
- Update user kycStatus to 'in_progress'

4. POST /api/kyc/address-details (Step 2)
   Request body:

```json
{
  "streetAddress": "123 Main St",
  "city": "Kampala",
  "district": "Central",
  "country": "Uganda",
  "postalCode": "12345"
}
```

5. POST /api/kyc/upload-document (Step 3)
   - Accepts multipart/form-data
   - Fields: documentType, file
   - Upload to S3/cloud storage
   - Save URL to KYCDocument table
   - Support document types: 'national_id', 'passport', 'drivers_license'

6. POST /api/kyc/upload-selfie (Step 4)
   - Accepts image file
   - Implement face detection/verification (optional: use AWS Rekognition or similar)
   - Save to KYCDocument table with type 'selfie'

7. POST /api/kyc/submit
   - Validates all KYC steps are completed
   - Generate unique kycReferenceId (format: KYC-YYYY-MMDD-XXXX)
   - Update user kycStatus to 'submitted'
   - Set kycSubmittedAt timestamp
   - Trigger notification to admin dashboard

   Response:

```json
{
  "success": true,
  "message": "KYC submitted successfully",
  "referenceId": "KYC-2025-1007-3039",
  "estimatedReviewTime": "1-2 business days"
}
```

VALIDATION & SECURITY:

- Add rate limiting to prevent spam registrations
- Implement email verification before KYC submission
- Validate file uploads (max size 5MB, allowed types: jpg, png, pdf)
- Add audit logging for all KYC actions
- Implement proper error handling with descriptive messages

REFERRAL SYSTEM (if applicable):

- Track referralCode usage
- Create ReferralTracking table to log successful referrals
- Implement reward/bonus logic for valid referrals
