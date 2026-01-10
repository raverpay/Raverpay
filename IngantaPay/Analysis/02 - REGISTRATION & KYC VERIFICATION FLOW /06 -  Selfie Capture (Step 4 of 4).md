IMAGE 6: Face Detection / Selfie Capture (Step 4 of 4)
New Screen: app/(auth)/kyc/selfie-capture.tsx
MOBILE APP PROMPT:

Create app/(auth)/kyc/selfie-capture.tsx for Step 4 (Selfie Capture) of KYC.

SCREEN DESIGN:

1. HEADER:
   - Back button (← Back)
   - Title: "Face Detection" (white, bold, centered)

2. CAMERA VIEW:
   - Full-screen camera preview (use expo-camera or react-native-vision-camera)
   - Overlay with rounded rectangle frame:
     - Rounded corners with red bracket indicators at 4 corners
     - Portrait orientation frame
     - Semi-transparent dark overlay outside frame
   - Guide text: "Scanning your face" (white, centered below camera)
   - Progress bar below text:
     - Green color (#10B981)
     - Animating from 0% to 100% during capture
     - Show percentage or indeterminate loading
   - Helper text: "Please keep your face centered on the screen and facing forward" (gray, centered at bottom)

3. CAMERA LOGIC:
   - Request camera permissions on mount
   - Auto-detect face in frame (use ML Kit or similar)
   - Show green overlay when face is properly detected
   - Auto-capture when face is centered and clear
   - Alternatively: Show capture button if auto-capture not implemented

4. AFTER CAPTURE:
   - Show preview of captured selfie
   - Options: "Retake" or "Confirm"
   - Confirm: Upload to API → Navigate to verification complete

API: POST /api/kyc/upload-selfie

- Send image as multipart/form-data
- Compress image before upload (max 2MB)

PERMISSIONS:

- Handle camera permission denied gracefully
- Show helpful message if permission denied

Create with proper camera lifecycle management and error handling.
