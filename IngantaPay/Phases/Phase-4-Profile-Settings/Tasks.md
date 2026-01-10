# Phase 4: Detailed Tasks

## Prerequisites

- [ ] Phase 1 (Renaming) complete
- [ ] Phase 2 (Theme colors) complete

---

## Part A: Profile Screen (Main) Redesign

### A.1 Update Container

File: `app/(tabs)/profile.tsx`

- [ ] Change background to black (#0A0A0A)
- [ ] Remove header bar styling
- [ ] Add "Profile" title (white, top-left)

### A.2 Profile Picture Section

- [ ] Center profile picture
- [ ] Size: 112x112px (larger than current)
- [ ] Border: 2px white/20%
- [ ] Fallback: Initial letter in circle

### A.3 User Info Section

- [ ] Center name below picture
- [ ] Center email below name
- [ ] White text for name, gray for email

### A.4 KYC Verified Badge

- [ ] Show only if kycStatus === 'APPROVED'
- [ ] Dark pill background (#3A3A3A)
- [ ] Green checkmark icon
- [ ] "KYC Verified" text
- [ ] Centered below email

### A.5 Mosaic Code Card

- [ ] Background: #3A3A3A
- [ ] Border radius: 16px
- [ ] Left side: "Mosaic Code" label + code (yellow)
- [ ] Right side: "View" button
- [ ] Navigate to mosaic-code-details screen

### A.6 Menu Items

Create 4 menu cards:

1. [ ] Edit Profile (person-outline icon)
2. [ ] Security (shield-outline icon)
3. [ ] App Settings (settings-outline icon)
4. [ ] Help & Support (help-circle-outline icon)

Card styling:

- [ ] Background: #2A2A2A
- [ ] Border radius: 16px
- [ ] Icon container: 48x48px, #3A3A3A
- [ ] Chevron arrow on right

### A.7 Logout Button

- [ ] Background: Red (#C41E3A)
- [ ] Border radius: 16px
- [ ] Centered content
- [ ] Icon (log-out-outline) + "Logout" text
- [ ] Loading state for logout action

### A.8 Remove Old Elements

- [ ] Remove/comment tier badge display
- [ ] Remove/comment P2P username section
- [ ] Remove/comment section headers
- [ ] Remove/comment colored icon backgrounds
- [ ] Remove/comment card containers

---

## Part B: Edit Profile Screen

### B.1 Update Container

File: `app/edit-profile.tsx`

- [ ] Black background
- [ ] Simple header with back button

### B.2 Profile Picture

- [ ] Center layout
- [ ] Size: 120x120px
- [ ] Red camera button overlay (36x36px, bottom-right)
- [ ] "Tap to change photo" text below
- [ ] Keep image picker functionality

### B.3 Form Fields

Update to simplified fields:

1. [ ] Full Name (display only, gray background)
2. [ ] Email (readonly, gray background)
3. [ ] Phone (readonly, gray background)
4. [ ] Address (editable, multiline)

### B.4 Readonly Field Styling

- [ ] Background: Darker gray (#1A1A1A)
- [ ] Text color: Gray (#6B7280)
- [ ] Add lock icon or "Cannot be changed" hint

### B.5 Remove Fields

- [ ] Remove/comment Date of Birth
- [ ] Remove/comment Gender
- [ ] Remove/comment Nationality
- [ ] Remove/comment City
- [ ] Remove/comment State

### B.6 Warning Note

- [ ] Keep one-time edit warning
- [ ] Yellow/amber border (#F59E0B)
- [ ] Dark background

### B.7 Save Button

- [ ] Text: "Save Changes"
- [ ] Background: Red (#C41E3A)
- [ ] Only saves address field

---

## Part C: Security Settings Screen

### C.1 Update Container

File: `app/security-settings.tsx`

- [ ] Black background
- [ ] Simple header

### C.2 Security Score Card (NEW)

- [ ] Green gradient background (#059669 → #047857)
- [ ] Shield icon in concentric circles
- [ ] "Security Score" label
- [ ] Rating text: "Excellent" / "Good" / "Fair" / "Weak"
- [ ] Description: "Your account is well protected"

### C.3 Security Score Logic

Implement calculation:

- [ ] Password changed in 90 days: +25%
- [ ] PIN is set: +25%
- [ ] Biometric enabled: +25%
- [ ] Email verified: +15%
- [ ] Phone verified: +10%
- [ ] Calculate rating based on score

### C.4 Authentication Section

Title: "Authentication"
Toggle items:

1. [ ] Biometric Login (fingerprint icon, blue bg)
2. [ ] Palm Payments (hand icon, gold bg)
3. [ ] Two-Factor Auth (phone icon, purple bg)

### C.5 Password & PIN Section

Title: "Password & PIN"
Navigation items:

1. [ ] Change Password (lock icon, gray bg)
2. [ ] Change PIN (lock icon, gray bg)

### C.6 Toggle Styling

- [ ] Active: Red track (#C41E3A)
- [ ] Inactive: Gray track (#4B5563)
- [ ] Thumb: White

### C.7 Remove Old Elements

- [ ] Remove/comment light theme styling
- [ ] Remove/comment section boxes with borders
- [ ] Remove/comment "Coming soon" badges
- [ ] Remove/comment Login History section
- [ ] Remove/comment debug buttons

---

## Part D: App Settings Screen (NEW)

### D.1 Create Screen

File: `app/app-settings.tsx` **[CREATE NEW]**

- [ ] Create file structure
- [ ] Black background
- [ ] Standard header

### D.2 Notifications Section

Title: "Notifications"
Toggle items:

1. [ ] Push Notifications (bell icon, blue bg #3B82F6)
2. [ ] Email Notifications (mail icon, green bg #10B981)
3. [ ] SMS Notifications (chatbubble icon, purple bg #A855F7)

### D.3 Appearance Section

Title: "Appearance"
Toggle item:

1. [ ] Dark Mode (sun/moon icon, orange bg #F97316)

### D.4 About Section

Title: "About"
Navigation item:

1. [ ] About Inganta Pay (info icon, gray bg)
   - Subtitle: "Version 1.0.0"

### D.5 Toggle State Management

- [ ] Load from AsyncStorage on mount
- [ ] Save to AsyncStorage on change
- [ ] Sync with backend (optional)

### D.6 Reusable Toggle Component

Create SettingToggleItem component:

- [ ] Icon container with custom color
- [ ] Title and subtitle
- [ ] Switch component
- [ ] Proper styling

---

## Part E: Supporting Screens (Optional)

### E.1 Mosaic Code Details

File: `app/mosaic-code-details.tsx` **[CREATE NEW]**

- [ ] Large QR code display
- [ ] Mosaic Code text
- [ ] Copy button
- [ ] Share button (optional)

### E.2 About Screen

File: `app/about.tsx` **[CREATE NEW]**

- [ ] App logo
- [ ] Version number
- [ ] Build number
- [ ] Links to Terms, Privacy Policy
- [ ] Open source licenses (optional)

---

## Part F: Testing

### F.1 Profile Screen

- [ ] Profile picture displays correctly
- [ ] Name and email centered
- [ ] KYC badge shows when approved
- [ ] Mosaic Code card works
- [ ] All menu items navigate correctly
- [ ] Logout works

### F.2 Edit Profile

- [ ] Form displays correctly
- [ ] Readonly fields not editable
- [ ] Address field editable
- [ ] Camera button works
- [ ] Save works

### F.3 Security Settings

- [ ] Security score displays
- [ ] Score calculation correct
- [ ] Toggles work
- [ ] Navigation items work

### F.4 App Settings

- [ ] All toggles work
- [ ] State persists after reload
- [ ] About navigation works

---

## Notes for AI Agents

1. **Use existing components**: Leverage existing Input, Button, Card, etc.
2. **Preserve logout logic**: Keep existing logout functionality
3. **Keep navigation routes**: Use existing route names where possible
4. **Test toggles thoroughly**: Ensure async state management works
5. **Comment removed code**: Use `// OLD_RAVERPAY:` prefix
