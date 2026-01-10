New Screen: app/(auth)/kyc/id-verification.tsx
MOBILE APP PROMPT:

Create app/(auth)/kyc/id-verification.tsx for Step 3 of KYC verification.

SCREEN DESIGN:

1. HEADER:
   - Back button (← Back)
   - Title: "ID Verification" (white, bold)
   - Subtitle: "Step 3 of 4"
   - Progress bar: 75% filled (3/4 steps)

2. ID TYPE SELECTION:
   - Label: "Select ID Type" (white, bold, size: 18px)
   - 3 selectable card options:

   Card 1 - National ID:
   - Icon: ID card icon (circular gray background)
   - Text: "National ID" (white, size: 18px)
   - Background: Dark gray (#2A2A2A)
   - Border: 1px gray-600
   - Border radius: 16px
   - Height: 80px
   - Add selection indicator (checkmark or border highlight when selected)

   Card 2 - Passport:
   - Same styling
   - Icon: Passport/document icon
   - Text: "Passport"

   Card 3 - Driver's License:
   - Same styling
   - Icon: License/card icon
   - Text: "Driver's License"

3. SELECTION STATE:
   - Only one can be selected at a time
   - Selected card: Brighter background or colored border
   - Unselected: Default dark gray

4. CONTINUE BUTTON:
   - Initially disabled (dark red/gray)
   - Enabled when ID type is selected
   - Text: "Continue"
   - OnPress: Store selected ID type → Navigate to document upload screen

STATE:

- Track selectedIdType: 'national_id' | 'passport' | 'drivers_license' | null
- Update UI based on selection

NAVIGATION:

- After selection + Continue: Navigate to /kyc/upload-document with idType param
