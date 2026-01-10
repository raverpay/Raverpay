IMAGE 6: Welcome/Auth Screen - "Welcome To Inganta Pay"

Corresponding RaverPay Screen: app/(auth)/welcome.tsx (the main welcome screen shown to first-time users)

AI PROMPT:
Check our current welcome screen in app/(auth)/welcome.tsx and completely redesign it to match the new Inganta Pay welcome/auth screen with these requirements:

MAJOR DESIGN CHANGES:

1. BACKGROUND & LAYOUT:
   - Change background from light (gray-50/gray-900) to solid black/dark gray (#1A1A1A or #0A0A0A)
   - Remove the current feature items section completely

2. APP PREVIEW SECTION (Top Half):
   - Add a phone mockup/preview at the top showing the main dashboard
   - Phone mockup specifications:
     - Display an iPhone frame with content
     - Inside frame: Show a preview of the home dashboard with:
       - Red gradient card showing "Welcome back, John Kingsley"
       - Total Balance display: "₦125,000" with eye icon (visibility toggle)
       - Mosaic Code section showing: "MSC-7834-2901" with hand icon
       - Two action buttons: "Add Money" and "Send Money"
       - "Utilities & Services" section label at bottom
     - Phone frame should have realistic bezels and notch
     - Slight 3D perspective tilt effect
     - Position: Top 50% of screen, centered

3. WELCOME TEXT SECTION (Below phone preview):
   - Title: "Welcome To Inganta Pay" (white, bold, size: 36px, centered)
   - Subtitle: "Experience the future of payments with palm biometric technology" (gray-400, size: 16px, centered, line-height: 24px)
   - Spacing: 24px between title and subtitle

4. ACTION BUTTONS (Bottom section):
   - Primary Button: "Create Account"
     - Background: Solid red (#C41E3A)
     - Text: White, bold, size: 18px
     - Border radius: 12px
     - Height: 56px
     - Full width with 20px horizontal padding
     - Positioned 24px above secondary button
   - Secondary Button: "Login"
     - Background: Dark gray/transparent (rgba(255, 255, 255, 0.1))
     - Text: White, size: 18px
     - Same dimensions as primary button
     - 1px border: rgba(255, 255, 255, 0.2)

5. FOOTER TEXT:
   - Add at bottom: "By continuing, you agree to our Terms & Privacy Policy"
   - Style: Gray-400, size: 14px, centered
   - Links "Terms" and "Privacy Policy" should be clickable
   - Position: 32px from bottom

6. REMOVE COMPLETELY:
   - Current logo section with "RP" text
   - All FeatureItem components (💳, 📱, ⚡)
   - "Your Digital Wallet for Everything" tagline
   - "I already have an account" ghost button

7. NAVIGATION UPDATES:
   - "Create Account" button → navigate to /(auth)/register
   - "Login" button → navigate to /(auth)/login
   - Update setHasSeenWelcome logic to trigger after onboarding completes, not on this screen

8. ANIMATIONS:
   - Phone mockup: Fade in + slide up from bottom (300ms delay)
   - Welcome text: Fade in (500ms delay)
   - Buttons: Fade in + slide up (700ms delay)
   - Use react-native-reanimated for smooth animations

TECHNICAL REQUIREMENTS:

- StatusBar: Set to 'light' style (white icons/text)
- Maintain safe area padding (especially for iPhone notch/island)
- Buttons should have press states (opacity: 0.8 when pressed)
- Phone mockup can be an image asset or SVG component
- Ensure responsive layout for different screen sizes
- Keep dark theme consistency throughout

COLOR PALETTE:

- Background: #0A0A0A or #1A1A1A
- Primary Red: #C41E3A
- White: #FFFFFF
- Gray text: #9CA3AF or #6B7280
- Dark button background: rgba(255, 255, 255, 0.1)

Update the component structure, remove the FeatureItem component entirely, and implement the new layout with proper spacing and animations.
