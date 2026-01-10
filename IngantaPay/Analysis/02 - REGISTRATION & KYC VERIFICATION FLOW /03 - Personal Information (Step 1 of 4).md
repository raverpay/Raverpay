IMAGE 3: Personal Information (Step 1 of 4)
New Screen: app/(auth)/kyc/personal-information.tsx
MOBILE APP PROMPT:

Create a new screen app/(auth)/kyc/personal-information.tsx for the first step of KYC verification.

SCREEN DESIGN:

1. HEADER:
   - Back button (← Back) in top-left, white color
   - Title: "Personal Information" (white, bold, size: 24px)
   - Subtitle: "Step 1 of 4" (gray-400, size: 16px)
   - Progress bar below subtitle:
     - Full width, height: 4px
     - Background: gray-700
     - Progress fill: white, width: 25% (1/4 complete)

2. FORM FIELDS (in order):

   First Name:
   - Label: "First Name" (white, size: 14px)
   - Input background: Dark gray (#2A2A2A)
   - Icon: User icon (left, gray)
   - Placeholder: "Enter your first name"
   - Border radius: 12px, height: 56px

   Last Name:
   - Label: "Last Name" (white, size: 14px)
   - Same styling as First Name
   - Placeholder: "Enter your last name"

   Date of Birth:
   - Label: "Date of Birth" (white, size: 14px)
   - Icon: Calendar icon (left, gray)
   - Placeholder: "mm/dd/yyyy"
   - OnPress: Open date picker modal
   - Format: MM/DD/YYYY
   - Validation: User must be 18+ years old

   Gender:
   - Label: "Gender" (white, size: 14px)
   - Dropdown/Select input
   - Placeholder: "Select your gender"
   - Options: Male, Female, Other
   - Background: Dark gray
   - Chevron icon on right

   Nationality:
   - Label: "Nationality" (white, size: 14px)
   - Icon: Location/globe icon (left, gray)
   - Placeholder: "Enter your nationality"
   - Could be dropdown with country list or text input

3. CONTINUE BUTTON:
   - Text: "Continue"
   - Background: Red (#C41E3A)
   - Full width, height: 56px
   - Border radius: 12px
   - Position: Bottom with 24px margin
   - OnPress: Validate form → Save data → Navigate to Step 2

FORM VALIDATION:

- All fields are required
- Date of Birth: Must be 18+ years old
- Show error messages below each field in red
- Disable Continue button until all fields are valid

API INTEGRATION:

- POST /api/kyc/personal-information
- Save data on Continue press
- Show loading spinner on button while saving
- Handle errors gracefully with toast notifications

STATE MANAGEMENT:

- Use react-hook-form with zod validation
- Store form data locally before API submission
- Track completion status for progress tracking

Create with TypeScript, proper error handling, and responsive design.
