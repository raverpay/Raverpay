IMAGE 2: Complete KYC Verification Overview
New Screen: app/(auth)/kyc-overview.tsx
MOBILE APP PROMPT:

Create a new screen app/(auth)/kyc-overview.tsx for the KYC verification overview page in Inganta Pay.

SCREEN DESIGN SPECIFICATIONS:

1. BACKGROUND & HEADER:
   - Background: Black (#0A0A0A)
   - Back button: Top-left, white arrow with "Back" text
   - StatusBar: light style

2. TOP SECTION:
   - Shield icon in circle:
     - Dark gray circular background (80px diameter)
     - White shield icon centered inside
     - Position: Centered horizontally, below back button
   - Title: "Complete KYC Verification" (white, bold, size: 28px, centered)
   - Subtitle: "We need to verify your identity to activate your Mosaic Wallet and enable all features" (gray-400, size: 16px, centered, line-height: 24px)
   - Spacing: 32px between icon and title, 16px between title and subtitle

3. KYC STEPS LIST:
   Create 4 clickable card items with consistent styling:

   Card Container Styling:
   - Background: Dark gray (#2A2A2A)
   - Border radius: 16px
   - Padding: 20px
   - Margin bottom: 16px between cards
   - Flex direction: row
   - Align items: center

   Each card structure:
   - Left: Icon container (circular, gray background, 48px diameter)
   - Center: Text content (title + subtitle)
   - Right: No arrow or indicator (keep simple)

   Card 1 - Personal Information:
   - Icon: Document/form icon (white)
   - Title: "Personal Information" (white, bold, size: 18px)
   - Subtitle: "Provide your basic details" (gray-400, size: 14px)

   Card 2 - Address Details:
   - Icon: Document/location icon (white)
   - Title: "Address Details" (white, bold, size: 18px)
   - Subtitle: "Enter your residential address" (gray-400, size: 14px)

   Card 3 - ID Verification:
   - Icon: Camera/ID card icon (white)
   - Title: "ID Verification" (white, bold, size: 18px)
   - Subtitle: "Upload your ID document" (gray-400, size: 14px)

   Card 4 - Selfie Capture:
   - Icon: Camera icon (white)
   - Title: "Selfie Capture" (white, bold, size: 18px)
   - Subtitle: "Take a verification selfie" (gray-400, size: 14px)

4. INFORMATION NOTE BOX:
   - Position: Below the 4 cards
   - Background: Dark gray (#2A2A2A)
   - Border: 1px gray-700
   - Border radius: 12px
   - Padding: 16px
   - Content:
     - Label: "Note:" (white, bold)
     - Text: "This process takes about 5 minutes. Please have your ID document ready." (gray-400, size: 14px, line-height: 20px)

5. START BUTTON:
   - Text: "Start Verification"
   - Background: Solid red (#C41E3A)
   - Text: White, bold, size: 18px
   - Border radius: 12px
   - Height: 56px
   - Full width
   - Position: At bottom with 24px margin from note box
   - OnPress: Navigate to first KYC step (Personal Information)

NAVIGATION & STATE:

- Back button: Navigate to previous screen (dashboard or welcome)
- Each card should be clickable and navigate to respective KYC step
- Start Verification button: Navigate to /kyc/personal-information
- Store KYC progress in state (track which steps are completed)
- Show completion checkmarks on cards that are already completed

TECHNICAL IMPLEMENTATION:

- Use ScrollView for proper scrolling
- Implement SafeAreaView for proper spacing
- Add loading states if fetching existing KYC data
- Handle navigation with expo-router
- Consider using FlatList if animating card appearance

Create this component with proper TypeScript types and error handling.
