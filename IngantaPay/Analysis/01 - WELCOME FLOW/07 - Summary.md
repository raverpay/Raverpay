SUMMARY OF CHANGES NEEDED:

New Splash Screen - Simple black background with red circle + white hand icon
New Onboarding Carousel - 4 screens showing app features (create new file: app/(auth)/onboarding.tsx)
Redesigned Welcome Screen - Black theme with phone preview, removed feature list, new button styles

Navigation Flow Update:
Splash → Onboarding (if first time) → Welcome → Login/Register
Splash → Login (if returning user, skip onboarding + welcome)
