# Admin Provisioning & IP Whitelist Fix Plan

## Problem Statement

When creating new admin/support users, they cannot login because:

1. **IP Whitelist**: Their IP is not whitelisted → blocked at login
2. **MFA Setup**: They can't set up MFA without being authenticated first
3. **Email Access**: New admins may not have access to corporate email (`chinwe@raverpay.com`) yet, so they can't receive:
   - Initial login credentials
   - MFA setup QR codes
   - IP whitelist confirmations

## Current Database Structure

**Table**: `admin_ip_whitelist`

- `id` (UUID)
- `ipAddress` (String, unique) - e.g., "102.89.69.201" or "192.168.1.0/24"
- `description` (String, optional)
- `userId` (String, nullable) - null = global, set = user-specific
- `isActive` (Boolean, default: true)
- `createdBy` (String) - User ID who created the entry
- `createdAt`, `updatedAt`, `lastUsedAt`, `usageCount`

## Solution Plan

### Phase 1: Fix Admin Creation Workflow

#### 1.1 Update `CreateAdminDto`

- Add optional `initialIpAddress?: string` field
- Add optional `skipIpWhitelist?: boolean` (for grace period)
- Add optional `personalEmail?: string` field (for initial credential delivery)
- Add optional `sendCredentials?: boolean` field (default: true)
- Add optional `sendMfaSetup?: boolean` field (default: false)

#### 1.2 Update `AdminAdminsService.createAdmin()`

- After creating admin user:
  - If `initialIpAddress` provided → Create IP whitelist entry
  - If `skipIpWhitelist` is true → Create entry with 24-hour expiry (or flag)
  - If `sendCredentials` is true → Send welcome email with credentials:
    - To `personalEmail` if provided, otherwise to `email`
    - Include: email, temporary password, login URL
    - Include: IP whitelist status
    - Include: MFA setup instructions (if `sendMfaSetup` is false)
  - If `sendMfaSetup` is true → Generate MFA and send QR code:
    - To `personalEmail` if provided, otherwise to `email`
    - Include QR code image or setup link
- Store `personalEmail` in user record (for recovery/notifications)
- Return created admin with IP whitelist status and email sent status

#### 1.3 Update Frontend Admin Creation Form

- Add IP address input field
- Add checkbox: "Skip IP whitelist requirement for 24 hours"
- Add personal email field (optional, for credential delivery)
- Add checkbox: "Send credentials via email" (default: checked)
- Add checkbox: "Generate and send MFA setup" (default: unchecked)
- Show warning about security implications
- Show preview of what will be sent via email

### Phase 2: Add Admin Provisioning Endpoint

#### 2.1 Create `ProvisionAdminDto`

```typescript
{
  adminId: string;
  ipAddress: string;
  description?: string;
  setupMfa?: boolean; // Generate MFA and send via email
}
```

#### 2.2 Create `POST /admin/admins/:id/provision`

- Add IP to whitelist
- Optionally generate MFA setup
- Send email to:
  - `personalEmail` if set, otherwise `email`
- Email includes:
  - Login credentials reminder (email + password reset link)
  - IP whitelist confirmation
  - MFA QR code (if setupMfa = true)
  - Setup instructions
- Log all actions to audit log

### Phase 3: Grace Period for New Admins

#### 3.1 Add `ipWhitelistGracePeriodUntil` field to User model

- Optional DateTime field
- Set when admin is created with `skipIpWhitelist: true`
- Default: 24 hours from creation

#### 3.2 Update `checkIpWhitelist()` logic

```typescript
// Check grace period first
if (user.ipWhitelistGracePeriodUntil && new Date() < user.ipWhitelistGracePeriodUntil) {
  return true; // Allow during grace period
}

// Then check whitelist
// ... existing logic
```

#### 3.3 Add migration for new field

- Add `ipWhitelistGracePeriodUntil` to User table
- Set for existing admins if needed

### Phase 4: Mandatory Password Change on First Login

#### 4.1 Database Schema Update

**Add fields to User model**:

```prisma
model User {
  // ... existing fields
  mustChangePassword Boolean @default(false)  // NEW: Force password change on next login
  passwordChangedAt  DateTime?                // NEW: Track when password was last changed
  // ... rest of fields
}
```

**Migration Steps**:

1. Add `mustChangePassword` boolean field (default: false)
2. Add `passwordChangedAt` DateTime field (nullable)
3. Set `mustChangePassword = true` for all existing admins without `passwordChangedAt`
4. Set `mustChangePassword = true` when creating new admins

#### 4.2 Update Admin Creation

**In `AdminAdminsService.createAdmin()`**:

- Set `mustChangePassword: true` when creating new admin
- Set `passwordChangedAt: null` (or don't set it)
- Include in welcome email: "⚠️ You must change your password on first login and verify with MFA code"

#### 4.3 Update Login Flow

**In `AuthService.login()`**:

- After successful MFA verification, check `mustChangePassword` flag
- If `mustChangePassword === true`:
  - Return `mustChangePassword: true` in login response
  - Do NOT return access token yet
  - Return a temporary token for password change endpoint
  - Frontend should redirect to password change page/modal

**Login Response Example**:

```typescript
// Normal login
{
  accessToken: "...",
  refreshToken: "...",
  user: {...}
}

// Password change required
{
  mustChangePassword: true,
  passwordChangeToken: "temporary_token_for_password_change",
  user: {...}
}
```

#### 4.4 Create Password Change Endpoint

**New Endpoint**: `POST /api/admin/auth/change-password`

**Request DTO**:

```typescript
{
  passwordChangeToken: string,  // From login response
  currentPassword: string,       // Current temporary password
  newPassword: string,           // New password
  mfaCode: string                // MFA code OR backup code
}
```

**Flow**:

1. Verify `passwordChangeToken` (JWT with purpose: 'password-change', expires in 15 minutes)
2. Verify `currentPassword` matches user's password
3. Verify `mfaCode`:
   - If MFA enabled: Verify against `twoFactorSecret` using `speakeasy.totp.verify()`
   - If backup code: Check against `mfaBackupCodes` array and remove used code
4. Validate `newPassword` meets requirements (same as registration)
5. Hash and update password using `argon2.hash()`
6. Set `mustChangePassword = false`
7. Set `passwordChangedAt = new Date()`
8. Generate and return new access/refresh tokens
9. Log password change to audit log with `AuditAction.PASSWORD_CHANGED`

**Guards**: `@UseGuards(JwtAuthGuard)` - but token is temporary password-change token

**Files to Create**:

- `apps/raverpay-api/src/admin/auth/admin-auth.controller.ts` (new file)
- `apps/raverpay-api/src/admin/auth/admin-auth.service.ts` (new file)
- `apps/raverpay-api/src/admin/auth/dto/change-password.dto.ts` (new file)

**Files to Update**:

- `apps/raverpay-api/src/auth/auth.service.ts` (update login method)
- `apps/raverpay-api/src/admin/admins/admin-admins.service.ts` (update createAdmin)

#### 4.5 Frontend Implementation

**Password Change Modal/Page**:

- Show modal/page immediately after login if `mustChangePassword === true`
- Form fields:
  - Current Password (pre-filled or hidden if using token)
  - New Password
  - Confirm New Password
  - MFA Code (6-digit input)
  - Backup Code option (toggle: "Use backup code instead")
- On submit:
  - Call `POST /api/admin/auth/change-password`
  - On success: Store new tokens, redirect to dashboard
  - On error: Show error message (invalid MFA code, weak password, etc.)

**Files to Create**:

- `apps/raverpay-admin/app/dashboard/auth/change-password/page.tsx` (new)
- `apps/raverpay-admin/app/dashboard/auth/change-password/components/ChangePasswordModal.tsx` (new)

**Files to Update**:

- `apps/raverpay-admin/app/dashboard/auth/login/page.tsx` (handle `mustChangePassword` response)

#### 4.6 Guard to Enforce Password Change

**New Guard**: `MustChangePasswordGuard`

- Check if `user.mustChangePassword === true`
- If true: Block access, return 428 (Precondition Required) with message
- Use on all admin routes except:
  - `/api/admin/auth/change-password`
  - `/api/admin/auth/logout`
  - `/api/admin/auth/refresh` (maybe)

**Files to Create**:

- `apps/raverpay-api/src/common/guards/must-change-password.guard.ts` (new)

**Usage**:

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
export class AdminController {
  // All routes blocked until password changed
}
```

#### 4.7 Update Email Template

**Welcome Email**:

- Add prominent section: "⚠️ IMPORTANT: You must change your password on first login"
- Explain MFA code requirement for password change
- Include backup code instructions
- Emphasize security: "This ensures only you can access your account"

### Phase 5: MFA Setup Without Authentication

#### 5.1 Create `POST /auth/mfa/setup-unauthenticated`

- Requires:
  - Email
  - Temporary token (sent via email when admin is created)
  - OR: Account created < 24 hours ago + email verification
- Generates MFA secret and QR code
- Returns setup data (user must verify with code to enable)

#### 4.2 Update Admin Creation

- Generate temporary setup token
- Send email to `personalEmail` (if provided) or `email` with:
  - Welcome message
  - Setup token
  - Link to MFA setup page
  - QR code image (if MFA setup requested)

## Implementation Order

1. **CRITICAL - Immediate**: Fix security vulnerabilities (Phase 7)
2. **High Priority**: Mandatory password change on first login (Phase 4)
3. **High Priority**: Add IP whitelist during admin creation (Phase 1.1-1.2)
4. **Medium Priority**: Add admin edit capabilities (Phase 6)
5. **Short-term**: Add provisioning endpoint (Phase 2)
6. **Medium-term**: Add grace period (Phase 3)
7. **Long-term**: Unauthenticated MFA setup (Phase 5)

## Database Queries for Debugging

### Check IP Whitelist for User

```sql
-- Find user by email
SELECT id, email, role FROM "User" WHERE email = 'joestacks@raverpay.com';

-- Check IP whitelist entries (replace USER_ID)
SELECT
  id,
  "ipAddress",
  description,
  "userId",
  "isActive",
  "createdAt",
  "lastUsedAt"
FROM admin_ip_whitelist
WHERE "isActive" = true
  AND ("userId" = 'USER_ID' OR "userId" IS NULL)
ORDER BY "createdAt" DESC;

-- Check all IP whitelist entries
SELECT * FROM admin_ip_whitelist ORDER BY "createdAt" DESC;
```

### Check if IP matches (exact or CIDR)

```sql
-- Check exact match
SELECT * FROM admin_ip_whitelist
WHERE "ipAddress" = '102.89.68.239' AND "isActive" = true;

-- Check CIDR ranges (manual check needed)
SELECT * FROM admin_ip_whitelist
WHERE "ipAddress" LIKE '%/%' AND "isActive" = true;
```

### Phase 6: Admin Edit Capabilities

#### 5.1 Update `UpdateAdminDto`

- Add optional `ipAddresses?: string[]` field (array of IPs to whitelist)
- Add optional `mfaEnabled?: boolean` field
- Add optional `mfaSecret?: string` field (for resetting MFA)
- Add optional `twoFactorEnabled?: boolean` field
- Add optional `twoFactorSecret?: string` field (for resetting MFA secret)

#### 5.2 Update `AdminAdminsService.updateAdmin()`

- Allow updating admin IP whitelist entries
- Allow enabling/disabling MFA for admin
- Allow resetting MFA secret (requires new setup)
- Require re-authentication (ReAuthGuard) for these sensitive operations
- Log all changes to audit log

#### 5.3 Update Frontend Admin Edit Form

- Add IP whitelist management section (list, add, remove IPs)
- Add MFA status toggle (enable/disable)
- Add "Reset MFA" button (requires re-auth)
- Show re-authentication modal before saving sensitive changes
- Display current IP whitelist entries for the admin

### Phase 7: Fix Security Vulnerabilities (CRITICAL)

#### 7.1 Fix IP Whitelist Endpoint - Add Re-Authentication Guard

**Current Issue**: `POST /admin/security/ip-whitelist` accepts requests without verifying MFA code, even though frontend shows MFA modal.

**Fix**:

- Add `@UseGuards(ReAuthGuard)` to `addIpWhitelist()` endpoint
- Add `@UseGuards(ReAuthGuard)` to `updateIpWhitelist()` endpoint
- Add `@UseGuards(ReAuthGuard)` to `removeIpWhitelist()` endpoint
- Require `X-Recent-Auth-Token` header with valid re-auth token
- Verify the re-auth token contains valid MFA verification

**Implementation**:

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard, ReAuthGuard) // Add ReAuthGuard
@Roles(UserRole.SUPER_ADMIN)
async addIpWhitelist(
  @Body() dto: CreateIpWhitelistDto,
  @GetUser('id') userId: string,
) {
  return this.adminSecurityService.addIpWhitelist(dto, userId);
}
```

#### 7.2 Fix Admin Edit Endpoints - Add Re-Authentication Guard

**Current Issue**: Admin edit endpoints don't require re-authentication for sensitive changes.

**Fix**:

- Add `@UseGuards(ReAuthGuard)` to `updateAdmin()` endpoint
- Require re-auth token when updating:
  - IP whitelist entries
  - MFA status
  - Role changes
  - Password changes (if added)

#### 7.3 Fix Locked Admin Access Bug

**Current Issue**: Admins with `status: "LOCKED"` can still access dashboard after login. The `AccountLockGuard` only checks `lockedUntil` field but doesn't check `user.status === UserStatus.LOCKED`.

**Fix**:

- Update `AccountLockGuard.isAccountLocked()` to also check `user.status === UserStatus.LOCKED`
- Update `AccountLockGuard.canActivate()` to check both:
  - `user.status === UserStatus.LOCKED` (permanent lock)
  - `user.lockedUntil > now()` (temporary lock)
- Block access and return 403 Forbidden if account is locked
- Log locked account access attempts

**Implementation**:

```typescript
// Update AccountLockGuard.canActivate()
const user = request.user;
if (!user?.id) {
  return true;
}

// Check status-based lock
if (user.status === UserStatus.LOCKED) {
  throw new ForbiddenException('Your account is locked. Please contact support.');
}

// Check time-based lock (existing logic)
const isLocked = await this.accountLockingService.isAccountLocked(user.id);
if (isLocked) {
  throw new ForbiddenException(
    'Your account has been temporarily locked. Please contact support or wait for the lock to expire.',
  );
}
```

**Also update `AccountLockingService.isAccountLocked()`**:

```typescript
async isAccountLocked(userId: string): Promise<boolean> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,  // Add status check
      lockedUntil: true
    },
  });

  if (!user) return false;

  // Check status-based lock
  if (user.status === UserStatus.LOCKED) {
    return true;
  }

  // Check time-based lock
  if (!user.lockedUntil) return false;

  const now = new Date();
  if (user.lockedUntil > now) {
    return true; // Still locked
  }

  // Lock expired, clear it
  await this.prisma.user.update({
    where: { id: userId },
    data: { lockedUntil: null, rateLimitLockReason: null },
  });

  return false;
}
```

#### 7.4 Verify MFA Code in Re-Authentication Flow

**Current Issue**: Frontend shows MFA modal but backend doesn't verify the code.

**Fix**:

- Ensure `ReAuthGuard` properly verifies the re-auth token
- The re-auth token should only be issued after successful MFA verification
- Verify token contains `purpose: 'reauth'` and is not expired (< 15 minutes)
- If token is invalid, return 428 Precondition Required

**Note**: The re-auth token is generated in `/auth/mfa/verify` endpoint after MFA code is verified. The frontend should:

1. Show MFA modal
2. Call `/auth/mfa/verify` with tempToken + code
3. Receive re-auth token in response
4. Include re-auth token in `X-Recent-Auth-Token` header for sensitive operations

## Implementation Order (Updated)

1. **CRITICAL - Immediate**: Fix security vulnerabilities (Phase 7)
   - 7.1: Add ReAuthGuard to IP whitelist endpoints
   - 7.2: Fix admin edit endpoints
   - 7.3: Fix locked admin access bug
   - 7.4: Verify MFA code verification flow
2. **CRITICAL - Immediate**: Mandatory password change on first login (Phase 4)
   - 4.1: Add database fields (`mustChangePassword`, `passwordChangedAt`)
   - 4.2: Update admin creation to set flag
   - 4.3: Update login flow to check flag
   - 4.4: Create password change endpoint with MFA verification
   - 4.5: Frontend password change modal/page
   - 4.6: Create `MustChangePasswordGuard` to block dashboard access
3. **High Priority**: Add IP whitelist during admin creation (Phase 1.1-1.2)
4. **Medium Priority**: Add admin edit capabilities (Phase 6)
5. **Short-term**: Add provisioning endpoint (Phase 2)
6. **Medium-term**: Add grace period (Phase 3)
7. **Long-term**: Unauthenticated MFA setup (Phase 5)

## Security Checklist

- [ ] **NEW**: New admins must change password on first login
- [ ] **NEW**: Password change requires MFA code verification
- [ ] **NEW**: Password change accepts both MFA code and backup codes
- [ ] **NEW**: Dashboard access blocked until password is changed
- [ ] **NEW**: `mustChangePassword` flag set on admin creation
- [ ] IP whitelist endpoints require re-authentication
- [ ] Re-auth token is verified (not just checked for existence)
- [ ] MFA code is actually verified before issuing re-auth token
- [ ] Locked admins cannot access dashboard
- [ ] Admin edit endpoints require re-authentication
- [ ] All sensitive operations logged to audit log
- [ ] Re-auth tokens expire after 15 minutes
- [ ] Frontend properly handles 428 Precondition Required responses

## Testing Checklist

- [ ] **NEW**: Create admin → `mustChangePassword` flag is true
- [ ] **NEW**: Login with new admin → Returns `mustChangePassword: true` instead of tokens
- [ ] **NEW**: Try to access dashboard → Blocked with 428 error
- [ ] **NEW**: Change password with valid MFA code → Success, can access dashboard
- [ ] **NEW**: Change password with invalid MFA code → Rejected
- [ ] **NEW**: Change password with backup code → Success, backup code removed
- [ ] **NEW**: Change password with weak password → Rejected
- [ ] **NEW**: Password change token expires after 15 minutes
- [ ] Create admin with IP whitelist → Can login immediately
- [ ] Create admin without IP → Cannot login (expected)
- [ ] Create admin with grace period → Can login for 24 hours
- [ ] Provision existing admin → IP added, can login
- [ ] MFA setup without auth → Works for new admins
- [ ] IP whitelist check logs correctly
- [ ] Audit logs capture all actions
- [ ] Adding IP requires valid MFA code (rejects random codes)
- [ ] Editing admin requires re-authentication
- [ ] Locked admin cannot access dashboard
- [ ] Re-auth token expires after 15 minutes
- [ ] Invalid re-auth token returns 428 error

## Summary of Critical Security Fixes Needed

### 1. Mandatory Password Change on First Login (CRITICAL)

**Problem**: New admins receive credentials but there's no enforcement to change password on first login. Password change doesn't require MFA verification.

**Fix**:

- Add `mustChangePassword` and `passwordChangedAt` fields to User model
- Enforce password change on first login (block dashboard access until changed)
- Require MFA code verification when changing password
- Create `/api/admin/auth/change-password` endpoint with MFA verification

**Files**:

- `apps/raverpay-api/prisma/schema.prisma` (add fields)
- `apps/raverpay-api/src/admin/auth/admin-auth.controller.ts` (new)
- `apps/raverpay-api/src/admin/auth/admin-auth.service.ts` (new)
- `apps/raverpay-api/src/common/guards/must-change-password.guard.ts` (new)
- `apps/raverpay-api/src/auth/auth.service.ts` (update login flow)
- `apps/raverpay-api/src/admin/admins/admin-admins.service.ts` (set flag on creation)
- Frontend: Password change modal/page

### 2. IP Whitelist Endpoint Security (CRITICAL)

**Problem**: Adding IP addresses doesn't verify MFA code - accepts any random code
**Fix**: Add `@UseGuards(ReAuthGuard)` to IP whitelist endpoints
**Files**: `apps/raverpay-api/src/admin/security/admin-security.controller.ts`

### 3. Locked Admin Access (CRITICAL)

**Problem**: Admins with `status: "LOCKED"` can still access dashboard
**Fix**: Update `AccountLockGuard` to check `user.status === UserStatus.LOCKED`
**Files**:

- `apps/raverpay-api/src/common/guards/account-lock.guard.ts`
- `apps/raverpay-api/src/common/services/account-locking.service.ts`

### 4. Admin Edit Capabilities

**Problem**: Cannot edit admin IP whitelist or MFA status
**Fix**: Add fields to `UpdateAdminDto` and require re-authentication
**Files**:

- `apps/raverpay-api/src/admin/dto/admin.dto.ts`
- `apps/raverpay-api/src/admin/admins/admin-admins.service.ts`
- `apps/raverpay-api/src/admin/admins/admin-admins.controller.ts`

### 5. Re-Authentication Flow Verification

**Problem**: Frontend shows MFA modal but backend doesn't verify the code
**Fix**: Ensure re-auth token is only issued after MFA code verification
**Files**:

- `apps/raverpay-api/src/auth/auth.controller.ts` (verify `/auth/mfa/verify` endpoint)
- Frontend: Ensure MFA modal calls `/auth/mfa/verify` and uses returned token

## Email Delivery Strategy & Best Practices

### The Problem

When creating an admin with email `chinwe@raverpay.com`, they may not have access to that email yet, so they can't receive:

- Initial login credentials
- MFA setup QR codes
- IP whitelist confirmations

### Industry Standard Approaches

**Option 1: Corporate Email Setup First (Most Secure - Recommended)**

- IT sets up `chinwe@raverpay.com` BEFORE creating admin account
- Send credentials to corporate email
- Admin sets MFA on first login
- **Pros**: Secure, audit trail, professional
- **Cons**: Requires email setup coordination

**Option 2: Personal Email for Initial Setup (Practical - Your Situation)**

- Add `personalEmail` field to User model
- Send initial credentials to personal Gmail
- Once corporate email is ready, use it for ongoing notifications
- Keep personal email for account recovery
- **Pros**: Works immediately, practical
- **Cons**: Less secure, personal emails can be compromised

**Option 3: Hybrid Approach (Best of Both Worlds)**

- Primary email: Corporate (`chinwe@raverpay.com`) - for ongoing notifications
- Personal email: Personal Gmail - for initial setup and recovery
- Credential delivery options:
  - Email to personal email (if provided)
  - OR: Show on screen (admin writes down securely)
  - OR: Send via SMS/WhatsApp
  - OR: In-person handoff
- **Pros**: Flexible, secure for ongoing use
- **Cons**: More complex to implement

### Recommended Implementation

#### Database Schema Addition

```prisma
model User {
  // ... existing fields
  email          String   @unique  // Corporate email (chinwe@raverpay.com)
  personalEmail String?  @unique  // Personal email for recovery/initial setup
  // ... rest of fields
}
```

#### Email Delivery Priority Logic

1. **Initial Credentials**: Send to `personalEmail` if provided, otherwise `email`
2. **MFA Setup**: Send to `personalEmail` if provided, otherwise `email`
3. **Ongoing Notifications**: Always use `email` (corporate email)
4. **Recovery/Reset**: Use `personalEmail` if available, fallback to `email`

#### Security Considerations

**Pros of Personal Email**:

- ✅ Admin can receive credentials immediately
- ✅ Works even if corporate email isn't set up yet
- ✅ Useful for account recovery
- ✅ Common practice in many organizations

**Cons of Personal Email**:

- ⚠️ Less secure than corporate email
- ⚠️ Personal emails can be compromised
- ⚠️ No corporate audit trail

**Mitigation Strategies**:

- Require password change on first login (force password reset)
- Set expiration on initial credentials (24-48 hours)
- Log all credential deliveries to audit log
- Send to BOTH emails if both are provided (for audit trail)
- Require admin to verify personal email before using it
- Use personal email ONLY for initial setup, switch to corporate email after

### Email Template Content

**Welcome Email (to personalEmail or email)**:

```
Subject: Welcome to RaverPay Admin Dashboard - Action Required

Hi [FirstName],

Your admin account has been created. Please complete setup within 24 hours.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: [email]
Temporary Password: [password]
Login URL: https://myadmin.raverpay.com/login

⚠️ CHANGE YOUR PASSWORD IMMEDIATELY AFTER FIRST LOGIN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECURITY SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IP Whitelist: [IP addresses or "Contact IT to whitelist your IP"]
MFA Status: [If QR code included: "Scan QR code below" | Otherwise: "Set up on first login"]

[If MFA setup requested: Include QR code image as attachment]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Log in using the credentials above
2. Change your password immediately
3. Set up MFA (if QR code provided, scan it now)
4. Contact IT to whitelist your IP address (if not already done)

This email was sent to your [personalEmail/email] address.
If you did not request this account, please contact security@raverpay.com immediately.

Best regards,
RaverPay Security Team
```

### Alternative Credential Delivery Methods

If email isn't reliable, consider:

1. **On-Screen Display** (Most Secure)
   - Show credentials on admin creation screen
   - Admin writes them down securely
   - No email needed

2. **SMS/WhatsApp**
   - Send password via SMS
   - Send MFA QR code link via WhatsApp
   - More reliable than email

3. **Secure Password Manager**
   - Generate shareable link (1Password, LastPass)
   - Admin accesses via link
   - Auto-expires after 24 hours

4. **In-Person Handoff**
   - Admin creates account
   - Credentials printed/displayed
   - Handed to new admin in person

### Recommendation

**For Your Situation**: Use **Option 2 (Personal Email)** with these safeguards:

1. Add `personalEmail` field to User model
2. Send initial credentials to `personalEmail` (if provided), otherwise `email`
3. Require password change on first login
4. Log all credential deliveries
5. Once corporate email is set up, use it for all ongoing notifications
6. Keep personal email for account recovery only

This balances security with practicality for your current workflow.
