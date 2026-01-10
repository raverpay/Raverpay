IMAGE 2: Onboarding Screen 1 - "Pay With Palm"

Corresponding RaverPay Screen: This appears to be a new onboarding carousel screen (not currently in the codebase)
AI PROMPT:

Create a new onboarding carousel component that will be shown between the splash screen and the welcome/auth screens. This is the first slide in a multi-screen onboarding flow for Inganta Pay.

SCREEN 1 - "PAY WITH PALM" DESIGN:

1. HEADER:
   - Add "Skip" button in top-right corner (white text, no background)
   - Position: absolute, top: 60px, right: 20px

2. MAIN ILLUSTRATION:
   - Center a large card/container with rounded corners (border-radius: 24px)
   - Card background: Deep red gradient (from #8B1C1C at top to #C41E3A at bottom)
   - Inside card: Display hexagonal grid pattern with icons:
     - 3x3 grid of hexagons (some filled white, some gray/transparent)
     - Filled hexagons contain icons: hand icon (top center), hourglass icon (middle left), scan/QR icon (middle center), card/wallet icon (bottom center)
     - One hexagon at top should have a hanging lamp/pendant effect
   - Card size: 80% of screen width, aspect ratio 1:1
   - Add subtle shadow beneath card

3. TEXT CONTENT (below card):
   - Title: "Pay With Palm" (white, bold, size: 32px, centered)
   - Description: "Simply place your palm on the scanner and complete payments instantly - no cards, no phones needed." (gray/white-70%, size: 16px, centered, line-height: 24px)
   - Spacing: 32px gap between card and title, 16px between title and description

4. PAGINATION INDICATOR:
   - Position: Below description text, centered
   - Show 4 vertical bars/dots (first one active/highlighted)
   - Active: white/red color, Inactive: gray-30%
   - Height: 24px, Width: 4px per bar, Gap: 8px between bars

5. NAVIGATION BUTTON:
   - Large red circular button at bottom-center (80px diameter)
   - Contains white right arrow icon
   - Position: absolute, bottom: 60px, horizontally centered
   - Background color: #C41E3A
   - Add subtle shadow for depth

6. OVERALL SCREEN:
   - Background: Pure black (#000000)
   - StatusBar: light style
   - Safe area aware padding

TECHNICAL IMPLEMENTATION:

- Use react-native-reanimated for smooth slide transitions
- Implement swipe gestures (left/right) using react-native-gesture-handler
- Make "Skip" button navigate to welcome/auth screen
- Make arrow button navigate to next onboarding slide
- Store onboarding completion status in onboarding store (hasSeenOnboarding)

Create this as: app/(auth)/onboarding.tsx with a carousel component structure.
