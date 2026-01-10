Create email and SMS templates for password reset flow.

EMAIL TEMPLATE: Password Reset OTP

Subject: Your Inganta Pay Password Reset Code

## Body:

Hello,

You requested to reset your Inganta Pay password. Use the code below to continue:

**{{OTP_CODE}}**

This code will expire in 15 minutes.

If you didn't request this, please ignore this email and your password will remain unchanged.

For security reasons, never share this code with anyone.

Best regards,
Inganta Pay Team

---

SMS TEMPLATE: Password Reset OTP

## Body:

## Your Inganta Pay reset code is: {{OTP_CODE}}. Valid for 15 minutes. Never share this code.

CHARACTER COUNT: 89 characters (within 160 SMS limit)
