IMAGE 2: Edit Profile Screen
Corresponding Screen: app/edit-profile.tsx
MOBILE APP PROMPT:

Update the edit profile screen in app/edit-profile.tsx to match Inganta Pay design:

DESIGN CHANGES:

1. BACKGROUND & THEME:
   - Background: Pure black (#0A0A0A)
   - All text: White or gray
   - StatusBar: light style

2. HEADER:
   - Back button: White arrow, no circular background
   - Title: "Edit Profile" (white, size: 20px)
   - Position: Standard iOS/Android header position

3. PROFILE PICTURE SECTION:
   - Keep centered layout
   - Size: 120x120px
   - Add small red camera button overlay (bottom-right)
     - Background: Red (#C41E3A)
     - Size: 36x36px
     - Icon: camera (white)
   - Text below: "Tap to change photo" (gray, size: 14px)
   - Keep image picker functionality

4. FORM FIELDS - SAME DATA, NEW STYLING:

All input fields:

- Background: Dark gray (#2A2A2A)
- Border: None or 1px #333
- Border radius: 12px
- Height: 56px
- Text color: White
- Placeholder: Gray (#6B7280)
- Label: White, size: 14px, above input
- Icons: Gray, left side

Field List (in order):

1. Full Name (single field, not split)
   - Label: "Full Name"
   - Icon: person-outline
   - Value: `${user.firstName} ${user.lastName}`
   - Note: This combines firstName + lastName
2. Email Address
   - Label: "Email Address"
   - Icon: mail-outline
   - Disabled/Read-only (gray background #1A1A1A)
   - Show verification checkmark if verified
3. Phone Number
   - Label: "Phone Number"
   - Icon: call-outline
   - Disabled/Read-only (gray background #1A1A1A)
   - Show verification checkmark if verified

4. Address (multiline)
   - Label: "Address"
   - Icon: location-outline
   - Multiline: true
   - Min lines: 3
   - Editable (if not locked)

5. REMOVE DATE OF BIRTH, GENDER, NATIONALITY:
   - These fields should NOT appear in this screen
   - They were collected during KYC
   - Keep them in backend but don't show here

6. REMOVE CITY AND STATE FIELDS:
   - Only show single Address field
   - Keep backend logic but simplify UI

7. WARNING NOTE BOX:
   - Keep the warning about one-time edit
   - Style updates:
     - Background: Darker background with yellow/amber border
     - Border: 2px yellow/amber (#F59E0B)
     - Border radius: 12px
     - Icon: warning (yellow)
     - Text: White for title, gray for description
   Content:
   Note:
   Changes to your email or phone number may require verification.
8. SAVE BUTTON:
   - Text: "Save Changes"
   - Background: Red (#C41E3A)
   - Full width
   - Height: 56px
   - Border radius: 12px
   - Position: Bottom with proper spacing

9. READ-ONLY FIELD STYLING:
   - Background: Darker gray (#1A1A1A)
   - Text: Gray (#6B7280)
   - Add "Cannot be changed" hint text below
   - Disable text input

10. LOCKED STATE:
    - If user.profileEditedOnce is true:
      - Show lock icon next to title
      - Gray out all editable fields
      - Change Save button to "Profile Locked" (disabled)
      - Show red banner: "Profile Locked - Contact Support"

FORM STRUCTURE UPDATE:

```typescript
// Simplify to just these fields
interface EditProfileForm {
  fullName: string; // Readonly display
  email: string; // Readonly
  phone: string; // Readonly
  address: string; // Editable (if not locked)
}

// On save, send only address to backend
const handleSave = async () => {
  await apiClient.put('/users/profile', {
    address: address.trim(),
  });
};
```

REMOVE COMPLETELY:

- Date of Birth field and picker
- Gender selection buttons
- Nationality field
- City field
- State field
- First Name / Last Name split (combine into Full Name display)
- Multiple card sections (use single form)

API UPDATES NEEDED:

- Backend should still store all KYC data
- Edit profile endpoint should only update: address
- Full name is display-only (from firstName + lastName)
- Email/phone changes should trigger separate verification flow
