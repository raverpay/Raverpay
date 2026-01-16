# Frontend Fixes Implementation Guide

## Summary of Issues & Solutions

### ✅ Q6 & Q10: Password Change Flow - PARTIALLY FIXED
**Status**: Password change modal created, needs integration

**What's Done**:
- ✅ Created `components/security/password-change-modal.tsx`
- ✅ Added `changePassword` method to `authApi`
- ✅ Updated `LoginResponse` interface

**What's Needed**:
1. Update `app/login/page.tsx` to check for `mustChangePassword` after MFA verification
2. Update `lib/api-client.ts` to intercept 428 errors and show password change modal
3. Update `components/providers/auth-provider.tsx` to handle password change requirement

### ⏳ Q7: Admin Modal Too Long - NOT STARTED
**Status**: Needs implementation

**Solution**: Split into tabs
- Tab 1: "Basic Information" (name, email, phone, role)
- Tab 2: "Security & IP Whitelist" (IP addresses, MFA status)
- Tab 3: "Email Options" (personal email, send credentials, MFA setup) - only for create

### ⏳ Q8: Re-Authentication Should Use MFA - NEEDS CLARIFICATION
**Status**: Needs clarification

**Current Situation**:
- Backend generates `reAuthToken` AFTER MFA verification (in login/MFA flow)
- Frontend re-auth modal asks for password
- This is inconsistent

**Two Possible Solutions**:

**Option A**: Use existing re-auth token from login
- After login/MFA, store `reAuthToken` in memory
- Use it for 15 minutes
- If expired, prompt for MFA code to get new token

**Option B**: Always prompt for MFA code
- Remove password-based re-auth
- Always require MFA code for re-authentication
- More secure but more steps

**Recommendation**: Option A - Use existing token, fallback to MFA if expired

### ⏳ Q9: Re-Authentication Modal Integration - NEEDS CHECK
**Status**: Modal exists, needs verification of integration

**What to Check**:
1. Is re-auth modal triggered on 428 errors from ReAuthGuard?
2. Is it integrated into admin edit/delete operations?
3. Does API client handle 428 for re-auth?

## Implementation Priority

### Priority 1: Password Change Flow (Critical)
1. Update login flow to handle `mustChangePassword`
2. Update API client to intercept 428 errors
3. Test end-to-end flow

### Priority 2: Re-Authentication Flow
1. Update to use MFA or existing token
2. Ensure integration with admin operations
3. Test re-auth flow

### Priority 3: Admin Modal Improvements
1. Split into tabs
2. Improve UX

## Next Steps

1. **Update Login Flow** (`app/login/page.tsx`):
   - After MFA verification, check for `mustChangePassword`
   - If true, show password change modal instead of redirecting
   - Store `passwordChangeToken` for password change

2. **Update API Client** (`lib/api-client.ts`):
   - Intercept 428 errors
   - Check error type (`PasswordChangeRequired` vs `ReAuthenticationRequired`)
   - Show appropriate modal

3. **Update Auth Provider** (`components/providers/auth-provider.tsx`):
   - Check user's `mustChangePassword` flag
   - Show password change modal if true
   - Block navigation until password changed

4. **Update Re-Auth Modal** (`components/security/re-auth-modal.tsx`):
   - Check if re-auth token exists and is valid
   - If not, prompt for MFA code instead of password
   - Or: Always use MFA code (more secure)

5. **Split Admin Modal** (`app/dashboard/admins/page.tsx`):
   - Use Tabs component
   - Organize fields into logical groups

