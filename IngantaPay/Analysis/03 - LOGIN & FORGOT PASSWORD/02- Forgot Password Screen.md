IMAGE 2: Forgot Password Screen
Corresponding Screen: app/(auth)/forgot-password.tsx
MOBILE APP PROMPT:

Update the forgot password screen in app/(auth)/forgot-password.tsx to match the new Inganta Pay design with these requirements:

DESIGN CHANGES:

1. BACKGROUND & THEME:
   - Background: Solid black (#0A0A0A or #1A1A1A)
   - All text: White or gray
   - StatusBar: light style

2. HEADER SECTION:
   - Back button (← Back):
     - Position: Top-left
     - White text color
     - No circular background
     - Just arrow and text, simple design
     - OnPress: Navigate back to login
   - Remove the icon section completely:
     - Remove the purple circular background with lock emoji
     - Remove the 🔒 emoji icon
     - No icon needed on this screen

3. TITLE & SUBTITLE:
   - Title: "Forgot Password?" (white, bold, size: 32px)
   - Position: Below back button with proper spacing (48px)
   - Subtitle: "Enter your email or phone number and we'll send you a code to reset your password" (gray-400, size: 16px, line-height: 24px)
   - Spacing: 16px between title and subtitle

4. FORM FIELD:

   Email or Phone Input:
   - Label: "Email or Phone" (white, size: 14px, positioned above input)
   - Input styling:
     - Background: Dark gray (#2A2A2A or #333333)
     - Border: None or 1px gray-700
     - Border radius: 12px
     - Height: 56px
     - Text color: White
     - Placeholder: "Enter your email or phone" (gray-500)
   - Left icon: Envelope/mail icon (gray-400)
   - Position: 32px below subtitle
   - Accept both email and phone number formats

5. SUBMIT BUTTON:
   - Text: "Send Reset Code"
   - Background: Solid red (#C41E3A)
   - Text: White, bold, size: 18px
   - Border radius: 12px
   - Height: 56px
   - Full width
   - Position: 24px below input field
   - Loading state: Show spinner when isRequestingReset is true

6. REMOVE COMPLETELY:
   - Footer text ("Remember your password? Sign In")
   - Don't show any footer links on this screen
   - Keep it clean and minimal

7. SPACING & LAYOUT:
   - Consistent padding: 20px horizontal
   - Vertical spacing as specified above
   - Center content if screen height allows
   - Ensure keyboard doesn't cover input (KeyboardAvoidingView)

FORM VALIDATION UPDATES:

Update schema to accept email OR phone:

```typescript
const forgotPasswordSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or phone is required')
    .refine(
      (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[1-9]\d{9,14}$/;
        return emailRegex.test(value) || phoneRegex.test(value);
      },
      { message: 'Please enter a valid email or phone number' },
    ),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
```

Update Controller:

```typescript
<Controller
  control={control}
  name="identifier" // Changed from "email"
  render={({ field: { onChange, onBlur, value } }) => (
    <Input
      label="Email or Phone"
      placeholder="Enter your email or phone"
      keyboardType="default"
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

API INTEGRATION:

- Update forgotPassword function to accept identifier instead of email
- Pass identifier to API endpoint
- Backend should detect if it's email or phone and send OTP accordingly

NAVIGATION:

- After successful submission: Navigate to verify-reset-code with identifier param
- Update router.push to pass identifier instead of email:

```typescript
const onSubmit = async (data: ForgotPasswordFormData) => {
  try {
    await forgotPassword(data);
    router.push({
      pathname: '/(auth)/verify-reset-code',
      params: { identifier: data.identifier }, // Changed from email
    });
  } catch {
    // Error handling
  }
};
```

TECHNICAL REQUIREMENTS:

- Maintain KeyboardAvoidingView behavior
- Keep ScrollView for better UX
- Update hook to handle identifier instead of email
- Test with both email and phone formats
- Ensure proper error messages display

CLEANUP:

- Remove footer section entirely
- Remove circular icon background code
- Simplify header to just back button
- Remove any purple color references
