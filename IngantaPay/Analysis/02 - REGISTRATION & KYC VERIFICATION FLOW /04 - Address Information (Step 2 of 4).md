IMAGE 4: Address Information (Step 2 of 4)
New Screen: app/(auth)/kyc/address-information.tsx
MOBILE APP PROMPT:

Create app/(auth)/kyc/address-information.tsx for Step 2 of KYC verification.

SCREEN DESIGN:

1. HEADER:
   - Back button (← Back)
   - Title: "Address Information" (white, bold, size: 24px)
   - Subtitle: "Step 2 of 4" (gray-400)
   - Progress bar: 50% filled (2/4 steps)

2. FORM FIELDS:

   Street Address:
   - Label: "Street Address"
   - Icon: Home icon (left)
   - Placeholder: "Enter your street address"
   - Multiline: false

   City / Town:
   - Label: "City / Town"
   - Icon: Map pin icon (left)
   - Placeholder: "Enter your city"

   District / State:
   - Label: "District / State"
   - Icon: Map pin icon (left)
   - Placeholder: "Enter your district"

   Country:
   - Label: "Country"
   - Icon: Map pin icon (left)
   - Placeholder: "Enter your country"
   - Consider using country dropdown/picker

   Postal Code:
   - Label: "Postal Code"
   - Placeholder: "Enter postal code (if applicable)"
   - Optional field (no required indicator)

3. STYLING:
   - Same input styling as Step 1
   - Dark background, white text
   - All fields height: 56px

4. CONTINUE BUTTON:
   - Same as Step 1
   - OnPress: Save → Navigate to Step 3

API: POST /api/kyc/address-details
Validation: All fields required except postal code
