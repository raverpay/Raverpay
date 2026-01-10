IMAGE 1: Splash Screen
Corresponding RaverPay Screen: Splash/Loading screen (likely when app first launches or when hasSeenWelcome = true)
AI PROMPT:

Analyze the current splash screen in app/(auth)/welcome.tsx (the section that shows when hasSeenWelcome is true) and update it to match the Inganta Pay splash screen design with these requirements:

DESIGN CHANGES:

1. Background: Change from gray (bg-gray-50 dark:bg-gray-900) to solid black (#000000 or #0A0A0A)
2. Logo Design: Replace the current splash-icon.png with a new centered logo featuring:
   - A red circular background (use color: #C41E3A or similar deep red)
   - White hand/palm icon centered in the circle
   - Circle should be approximately 120-140px in diameter
   - Add subtle shadow/glow effect to make it stand out against black background
3. Remove all text elements - this should be a pure logo splash screen
4. Animation: Keep the current scale and opacity animations but adjust timing:
   - Logo should scale from 0.8 to 1.0 (smoother entry)
   - Duration: 1500ms instead of current timing
   - Use easeOut curve for more premium feel

TECHNICAL REQUIREMENTS:

- Maintain StatusBar with light style (white icons) since background is black
- Keep the auto-navigation timer (2 seconds) for returning users
- Ensure the logo remains perfectly centered both vertically and horizontally
- Add a very subtle fade-in effect for the entire screen (0 to 1 opacity over 300ms)

Update the Image source to use a new asset: splash-icon-inganta.png (you'll need to create/add this asset with the red circle and white hand icon)
