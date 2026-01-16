# Frontend Fixes Needed - Admin Provisioning & Security

## Issues Identified

### 1. Password Change Flow (Q6 & Q10)

**Problem**: When `mustChangePassword` is true, the guard returns 428 error which redirects to login. Should show blocking modal instead.

**Current Flow**:

- Backend returns `mustChangePassword: true` and `passwordChangeToken` after MFA verification
- Frontend doesn't handle this - just redirects to dashboard
- `MustChangePasswordGuard` throws 428 error on protected routes
- Frontend doesn't catch 428 for password change

**Required Fix**:

- ✅ Create password change modal component
- ✅ Update login flow to check for `mustChangePassword` after MFA
- ✅ Update API client to intercept 428 errors and show password change modal
- ✅ Modal should block entire screen (not dismissible)
- ✅ After password change, redirect to dashboard

### 2. Admin Modal Too Long (Q7)

**Problem**: Create/Edit admin modal is too long for one screen.

**Required Fix**:

- ✅ Split into tabs: "Basic Info", "Security & IP Whitelist", "Email Options"
- ✅ Use Tabs component from shadcn/ui

### 3. Re-Authentication Should Use MFA (Q8)

**Problem**: Re-auth modal asks for password, but backend generates re-auth tokens after MFA verification.

**Current Flow**:

- Backend generates `reAuthToken` after MFA verification (in login/MFA flow)
- Frontend re-auth modal asks for password
- This is inconsistent - should use MFA instead

**Required Fix**:

- ✅ Update re-auth modal to use MFA code instead of password
- ✅ Or: Use the re-auth token that's already generated after login/MFA
- ✅ If token expired, prompt for MFA code to get new token

### 4. Re-Authentication Modal Integration (Q9)

**Problem**: Re-auth modal exists but may not be integrated into admin operations.

**Required Fix**:

- ✅ Check if re-auth modal is integrated in admin edit/delete operations
- ✅ Ensure 428 errors from ReAuthGuard trigger the modal
- ✅ Update API client to handle 428 for re-auth

### 5. Login Flow Missing Password Change Handling (Q10)

**Problem**: Login flow doesn't check for `mustChangePassword` flag.

**Required Fix**:

- ✅ After MFA verification, check for `mustChangePassword` flag
- ✅ If true, show password change modal instead of redirecting to dashboard
- ✅ Store `passwordChangeToken` for password change endpoint

## Implementation Plan

### Phase 1: Password Change Modal & Flow

1. Create `components/security/password-change-modal.tsx`
2. Update `lib/api/auth.ts` to add `changePassword` method
3. Update `app/login/page.tsx` to handle `mustChangePassword`
4. Update `lib/api-client.ts` to intercept 428 errors for password change
5. Update `components/providers/auth-provider.tsx` to show password change modal

### Phase 2: Re-Authentication Updates

1. Update `components/security/re-auth-modal.tsx` to use MFA
2. Update `lib/api-client.ts` to handle 428 for re-auth
3. Ensure re-auth token from login is stored and used
4. If expired, prompt for MFA to get new token

### Phase 3: Admin Modal Improvements

1. Split admin create modal into tabs
2. Split admin edit modal into tabs
3. Improve UX with better organization

### Phase 4: Integration & Testing

1. Test password change flow end-to-end
2. Test re-authentication flow
3. Test admin operations with re-auth
4. Verify all 428 errors are handled correctly
