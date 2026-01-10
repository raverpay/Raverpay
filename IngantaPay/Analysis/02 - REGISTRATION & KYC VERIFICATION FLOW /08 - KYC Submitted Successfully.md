IMAGE 8: KYC Submitted Successfully
New Screen: app/(auth)/kyc/submitted-successfully.tsx
MOBILE APP PROMPT:

Create app/(auth)/kyc/submitted-successfully.tsx - final KYC submission confirmation screen.

SCREEN DESIGN:

1. BACKGROUND: Black

2. TOP SECTION (Centered):
   - Success icon:
     - Large circular container (120px diameter)
     - Dark green background (#065F46 or #047857)
     - White checkmark icon with circular arrow (refresh/complete symbol)
     - Add subtle shadow/glow effect
   - Title: "KYC Submitted Successfully" (white, bold, size: 28px, centered)
   - Subtitle: "Your documents are being reviewed. We'll notify you once verification is complete." (gray-400, size: 16px, centered, line-height: 24px)

3. INFORMATION BOX:
   - Background: Dark gray (#2A2A2A)
   - Border radius: 16px
   - Padding: 20px
   - Icon: Clock icon (left side, gray)
   - Content:
     - Title: "Review in Progress" (white, bold, size: 18px)
     - Description: "Verification typically takes 1-2 business days. You can use limited features while we review your documents." (gray-400, size: 14px, line-height: 22px)

4. REFERENCE ID:
   - Label: "Reference ID:" (gray-500, size: 14px)
   - Value: "KYC-2025-1007-3039" (white, mono font, size: 16px)
   - Position: Below info box, centered
   - Add copy icon/button next to ID

5. CONTINUE BUTTON:
   - Text: "Continue to App"
   - Background: Red (#C41E3A)
   - Full width, 56px height
   - OnPress: Navigate to main app (dashboard/tabs) with limited access

STATE MANAGEMENT:

- Update user kycStatus to 'submitted' in local state
- Store referenceId for future reference
- Update UI throughout app to show "KYC Pending" badges/restrictions

Create with proper animations and copy-to-clipboard functionality for reference ID.
