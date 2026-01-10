Update authentication endpoints in apps/api to support email OR phone login and password reset.

1. UPDATE LOGIN ENDPOINT:

POST /api/auth/login

Current body:
{
"identifier": "email@example.com", // was "email"
"password": "password123",
"deviceInfo": {...}
}

New logic:

- Accept "identifier" field (can be email OR phone)
- Detect format automatically:
  - If contains "@", treat as email
  - If numeric (with optional + prefix), treat as phone
- Query database: WHERE email = ? OR phone = ?
- Return same response structure

Example implementation logic:

```javascript
// Determine if identifier is email or phone
const isEmail = identifier.includes('@');
const isPhone = /^\+?[0-9]{10,15}$/.test(identifier);

if (!isEmail && !isPhone) {
  throw new Error('Invalid email or phone number format');
}

// Query user
const user = await User.findOne({
  where: isEmail ? { email: identifier } : { phone: identifier },
});

if (!user) {
  throw new Error('User not found');
}

// Continue with password verification, device verification, etc.
```

2. UPDATE FORGOT PASSWORD ENDPOINT:

POST /api/auth/forgot-password

Current body:
{
"email": "user@example.com"
}

New body:
{
"identifier": "user@example.com" // or phone number
}

New logic:

- Accept identifier (email or phone)
- Detect format
- Generate OTP (6-digit code)
- Store in password_reset_tokens table with expiry (15 minutes)
- Send OTP via:
  - Email if identifier is email
  - SMS if identifier is phone number
- Return success message

Response:

```json
{
  "success": true,
  "message": "Reset code sent to your email/phone",
  "identifier": "us***@example.com", // Masked for privacy
  "expiresIn": 900 // 15 minutes in seconds
}
```

3. UPDATE VERIFY RESET CODE ENDPOINT:

POST /api/auth/verify-reset-code

Body:
{
"identifier": "user@example.com",
"code": "123456"
}

Logic:

- Find valid (non-expired) reset token for identifier
- Verify code matches
- Mark token as verified
- Return success with reset token for next step

4. UPDATE RESET PASSWORD ENDPOINT:

POST /api/auth/reset-password

Body:
{
"identifier": "user@example.com",
"code": "123456", // Verified code
"newPassword": "newSecurePassword123"
}

Logic:

- Verify code is still valid and verified
- Hash new password
- Update user password
- Invalidate all reset tokens for this user
- Log password change in audit trail
- Send confirmation email/SMS
- Return success

5. SMS INTEGRATION:

Install SMS service (Twilio, AWS SNS, or African SMS providers like Africa's Talking):

```bash
npm install twilio
# or
npm install africastalking
```

Create SMS service:

```javascript
// services/sms.service.js
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendOTP(phoneNumber, code) {
  try {
    await client.messages.create({
      body: `Your Inganta Pay reset code is: ${code}. Valid for 15 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    return true;
  } catch (error) {
    console.error('SMS send error:', error);
    throw error;
  }
}

module.exports = { sendOTP };
```

6. UPDATE DATABASE SCHEMA:

ALTER password_reset_tokens table:

```sql
ALTER TABLE password_reset_tokens
ADD COLUMN identifier VARCHAR(255) NOT NULL, -- email or phone
ADD COLUMN identifier_type ENUM('email', 'phone') NOT NULL,
ADD COLUMN code VARCHAR(6) NOT NULL,
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN attempts INT DEFAULT 0,
ADD COLUMN max_attempts INT DEFAULT 3,
ADD INDEX idx_identifier (identifier),
ADD INDEX idx_code (code);
```

7. SECURITY ENHANCEMENTS:

- Rate limiting: Max 3 OTP requests per hour per identifier
- Code attempts: Max 3 incorrect attempts before invalidating
- Code expiry: 15 minutes
- OTP format: 6-digit numeric code
- Prevent code reuse: Invalidate after successful reset
- Log all password reset attempts

8. ENVIRONMENT VARIABLES:

Add to .env:

9. ERROR HANDLING:

Return appropriate errors:

- Invalid identifier format
- User not found
- OTP expired
- Invalid OTP code
- Max attempts exceeded
- SMS service failure (fallback to email)

10. TESTING:

Test cases:

- Login with email
- Login with phone
- Forgot password with email
- Forgot password with phone
- Invalid OTP code
- Expired OTP
- Max attempts exceeded
- SMS service failure handling
