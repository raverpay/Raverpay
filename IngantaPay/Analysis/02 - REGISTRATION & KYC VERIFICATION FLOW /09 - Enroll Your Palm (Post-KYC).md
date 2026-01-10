New Screen: app/(auth)/palm-enrollment.tsx
MOBILE APP PROMPT:

Create app/(auth)/palm-enrollment.tsx - optional palm biometric enrollment screen (shown after KYC or later).

SCREEN DESIGN:

1. HEADER:
   - "Skip for now" button (top-right, white text)
   - Position allows user to skip this step

2. TOP SECTION (Centered):
   - Palm icon:
     - Circular background (100px diameter, dark yellow/gold #B45309)
     - White/yellow palm hand icon centered
   - Title: "Enroll Your Palm" (white, bold, size: 28px, centered)
   - Subtitle: "Visit any of our partner locations to complete your palm biometric enrollment" (gray-400, size: 16px, centered, line-height: 24px)

3. ENROLLMENT CENTERS LIST:
   - Section title: "Nearby Enrollment Centers" (white, bold, size: 20px)

   Location Card 1 - Shoprite Lugogo:
   - Background: Green gradient (#047857 to #059669)
   - Border radius: 16px
   - Padding: 20px
   - Content:
     - Name: "Shoprite Lugogo" (white, bold, size: 18px)
     - Badge: "Available" (green-400, pill shape, top-right)
     - Address: "📍 Lugogo Mall, Kampala" (white, size: 14px)
     - Distance: "1.2 km away" (white, size: 14px)
     - Button: "Get Directions" (white background, green text, full width, rounded)

   Location Card 2 - Quality Supermarket:
   - Same styling as Card 1
   - Name: "Quality Supermarket"
   - Available badge
   - Address: "📍 Garden City, Kampala"
   - Distance: "2.5 km away"

   Location Card 3 - Game Store Ntinda:
   - Same structure
   - Name: "Game Store Ntinda"
   - No "Available" badge (just show as regular location)
   - Address: "📍 Ntinda Complex"
   - Distance: "3.8 km away"
   - No "Get Directions" button (since it's not showing available status clearly)

4. INFORMATION BOX (Bottom):
   - Background: Dark gray (#2A2A2A)
   - Border radius: 12px
   - Padding: 16px
   - Title: "What to expect:" (white, bold)
   - List items:
     - "The process takes about 2 minutes"
     - "Bring a valid ID for verification"
     - "Your palm data is encrypted and secure"
     - "Start using palm payments immediately"
   - Use bullet points or numbered list
   - Text: Gray-400, size: 14px

FEATURES:

- Get Directions button: Open in Maps app with coordinates
- Skip for now: Navigate to main app without palm enrollment
- Track enrollment status in user profile

API ENDPOINTS (Backend):

- GET /api/palm-enrollment/centers?lat={lat}&lng={lng}
  - Return nearby enrollment centers
- POST /api/palm-enrollment/request
  - Log that user visited enrollment center (scan QR code at location)

NAVIGATION:

- This can be shown:
  - After KYC approval
  - From settings/profile later
  - As an optional onboarding step

Create with map integration (expo-location) and proper error handling.
