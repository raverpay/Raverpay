Corresponding RaverPay Screen: Fourth/final slide in onboarding carousel

AI PROMPT:
Add the fourth and final slide to the onboarding carousel: "Cashback & Rewards"

SCREEN 4 DESIGN SPECIFICATIONS:

1. HEADER:
   - Same "Back" and "Skip" buttons as previous screens
   - Same positioning

2. MAIN ILLUSTRATION:
   - Center card with red gradient background
   - Inside card: Display rewards/benefits visualization:
     - Multiple floating white pill badges with reward offers:
       - "3% Cashback" with red dot indicator (top-right area)
       - "5% Discount" with green dot indicator (left side)
       - "10% Bonus Points" with purple/pink dot indicator (right side)
       - "7% Bonus Points" with orange/yellow dot indicator (bottom-left)
     - Bottom center: Large circular gradient element (darker red to lighter red)
     - Inside circle: White circular area with red gift box icon
     - Badges should appear to float at different depths (subtle shadows)
   - Same card dimensions and styling

3. TEXT CONTENT:
   - Title: "Cashback & Rewards" (white, bold, size: 32px, centered)
   - Description: "Earn cashback on every transaction and unlock exclusive rewards with Mosaic Points." (gray/white-70%, size: 16px, centered, line-height: 24px)
   - Same spacing pattern

4. PAGINATION INDICATOR:
   - Fourth (last) bar/dot active
   - All previous bars inactive
   - Same styling and position

5. NAVIGATION BUTTON:
   - Same red circular arrow button
   - This is the FINAL slide, so arrow button should:
     - Navigate to the welcome screen (app/(auth)/welcome.tsx)
     - Set hasSeenOnboarding = true in onboarding store
     - The welcome screen should now show the full auth options
   - "Back" → Screen 3
   - "Skip" → welcome/auth screen

TECHNICAL IMPLEMENTATION:

- Add staggered fade-in animation for the reward badges (each badge appears with slight delay)
- Gift box icon could have subtle pulse animation
- After this screen, mark onboarding as complete
- Ensure smooth transition to welcome/auth screen
