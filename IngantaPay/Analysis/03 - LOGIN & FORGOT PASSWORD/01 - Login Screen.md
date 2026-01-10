IMAGE 1: Login Screen
Corresponding Screen: app/(auth)/login.tsx
MOBILE APP PROMPT:

Update the current login screen in app/(auth)/login.tsx to match the new Inganta Pay design with these requirements:

DESIGN CHANGES:

1. BACKGROUND & THEME:
   - Change from gray background (bg-gray-50/gray-900) to solid black (#0A0A0A or #1A1A1A)
   - All text should be white or gray for contrast
   - StatusBar: Set to 'light' style (white icons)

2. REMOVE COMPLETELY:
   - Back button at the top (this is the main login screen, no back needed)
   - The circular white/gray background on back button
   - User greeting ("Welcome back, [Name]!")
   - "Not [Name]? Switch account" link
   - Biometric login button (Face ID/Fingerprint)
   - "OR" divider between regular and biometric login
   - Any circular icon backgrounds

3. HEADER SECTION:
   - Title: "Welcome Back" (white, bold, size: 32px)
   - Subtitle: "Login to continue to your Mosaic Wallet" (gray-400, size: 16px)
   - No back button
   - Spacing: 64px from top of safe area

4. FORM FIELDS:

   Email or Phone Field:
   - Label: "Email or Phone" (white, size: 14px, positioned above input)
   - Input styling:
     - Background: Dark gray (#2A2A2A or #333333)
     - Border: None or subtle 1px gray-700
     - Border radius: 12px
     - Height: 56px
     - Text color: White
     - Placeholder: "Enter your email or phone" (gray-500)
   - Left icon: Envelope/mail icon (gray-400)
   - Update to accept either email OR phone number
   - Validation: Accept both email format and phone format

   Password Field:
   - Label: "Password" (white, size: 14px)
   - Same input styling as above
   - Left icon: Lock icon (gray-400)
   - Right icon: Eye icon for show/hide password toggle (gray-400)
   - Placeholder: "Enter your password"
   - Secure text entry enabled by default

5. FORGOT PASSWORD LINK:
   - Text: "Forgot Password?" (yellow/gold color: #F59E0B or #FBBF24)
   - Position: Right-aligned below password field
   - Font size: 14px
   - No underline, just colored text
   - OnPress: Navigate to forgot-password screen

6. LOGIN BUTTON:
   - Text: "Login"
   - Background: Solid red (#C41E3A)
   - Text: White, bold, size: 18px
   - Border radius: 12px
   - Height: 56px
   - Full width with horizontal padding
   - Position: 32px below forgot password link
   - Loading state: Show spinner when isLoggingIn is true

7. FOOTER TEXT:
   - Text: "Dont' have an account? Sign up" (note the typo "Dont'" - match design exactly)
   - Position: Centered, 24px below login button
   - First part gray-400, "Sign up" should be red (#C41E3A)
   - OnPress "Sign up": Navigate to register screen

8. SPACING & LAYOUT:
   - Use proper vertical spacing between elements
   - 16px gap between form fields
   - 12px gap between password field and forgot password link
   - 32px gap between forgot password and login button
   - Center content vertically if screen is tall enough

FORM VALIDATION UPDATES:

Update the schema to accept email OR phone:

```typescript
const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or phone is required')
    .refine(
      (value) => {
        // Check if it's a valid email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // Check if it's a valid phone (10-15 digits, optionally starting with +)
        const phoneRegex = /^\+?[1-9]\d{9,14}$/;

        return emailRegex.test(value) || phoneRegex.test(value);
      },
      { message: 'Please enter a valid email or phone number' },
    ),
  password: passwordSchema,
});

type LoginFormData = z.infer<typeof loginSchema>;
```

Update the form field:

```typescript
<Controller
  control={control}
  name="identifier" // Changed from "email"
  render={({ field: { onChange, onBlur, value } }) => (
    <Input
      label="Email or Phone"
      placeholder="Enter your email or phone"
      keyboardType="default" // Changed from "email-address"
      autoCapitalize="none"
      leftIcon="mail-outline"
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      error={errors.identifier?.message}
      required
    />
  )}
/>
```

BIOMETRIC AUTHENTICATION UPDATES:

- Remove the biometric login button from UI completely
- Keep the biometric logic in the background for future use
- Remove all UI elements related to Face ID/Fingerprint
- Keep isBiometricEnabled and related hooks but don't show in UI

NAVIGATION BEHAVIOR:

- Remove back button functionality (this is a main entry point)
- Login button: Submit form → API call → Navigate based on response
- "Sign up" link: Navigate to register screen
- "Forgot Password?" link: Navigate to forgot-password screen

TECHNICAL REQUIREMENTS:

- Update API call to use "identifier" instead of "email"
- Backend should handle both email and phone login
- Maintain device fingerprint logic
- Keep all existing error handling
- Remove hasPasswordInput state (no longer needed without biometric button)
- Clean up unused biometric UI code

REMOVE THESE SECTIONS COMPLETELY:

- User greeting logic and state
- Biometric button component
- "OR" divider
- Switch account functionality
- hasPasswordInput useState and useEffect
- Biometric loading state UI
