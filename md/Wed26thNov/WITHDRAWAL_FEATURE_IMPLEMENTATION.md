# Withdrawal Feature Implementation Summary

## 🎉 Complete Implementation

This document describes the complete withdrawal feature with configurable rates from the admin dashboard.

---

## ✅ What Has Been Implemented

### 1. **Database Schema**

#### New Table: `withdrawal_config`

```sql
CREATE TABLE withdrawal_config (
    id TEXT PRIMARY KEY,
    feeType "WithdrawalFeeType" NOT NULL DEFAULT 'PERCENTAGE',
    feeValue DECIMAL(15,2) NOT NULL,
    minFee DECIMAL(15,2) NOT NULL DEFAULT 0,
    maxFee DECIMAL(15,2),
    tierLevel "KYCTier",
    minWithdrawal DECIMAL(15,2) NOT NULL DEFAULT 100,
    maxWithdrawal DECIMAL(15,2) NOT NULL DEFAULT 50000,
    isActive BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL
);
```

#### New Enums:

- `WithdrawalFeeType`: `FLAT`, `PERCENTAGE`
- Reuses existing `KYCTier`: `TIER_0`, `TIER_1`, `TIER_2`, `TIER_3`

#### Default Configuration Inserted:

```
Fee Type: PERCENTAGE (1.5%)
Min Fee: ₦50
Max Fee: ₦500
Min Withdrawal: ₦100
Max Withdrawal: ₦50,000
Tier Level: NULL (Global - applies to all users)
```

#### Migration Files:

- **Prisma Schema**: `/apps/raverpay-api/prisma/schema.prisma` - Lines 1164-1201
- **SQL Migration**: `/apps/raverpay-api/prisma/migrations/add_withdrawal_config.sql`

---

### 2. **Backend API**

#### Services Updated:

**File**: `/apps/raverpay-api/src/transactions/transactions.service.ts`

**New Methods:**

1. `getWithdrawalConfig(kycTier?)` - Fetch config from database with tier-specific logic
2. `calculateWithdrawalFee(amount, kycTier?)` - Calculate fee based on config
3. `getWithdrawalConfigForUser(userId)` - Get config for mobile app
4. `previewWithdrawalFee(userId, amount)` - Preview fee before withdrawal
5. `getAllWithdrawalConfigs()` - Admin: List all configs
6. `getWithdrawalConfigById(id)` - Admin: Get single config
7. `createWithdrawalConfig(data)` - Admin: Create new config
8. `updateWithdrawalConfig(id, data)` - Admin: Update config
9. `deleteWithdrawalConfig(id)` - Admin: Delete config

**Updated Method:**

- `calculateFee()` - Now async, calls `calculateWithdrawalFee()` for withdrawals
- `withdrawFunds()` - Now uses dynamic fee calculation from database

#### Fee Calculation Logic:

```typescript
1. Check for tier-specific config (e.g., TIER_2)
2. If not found, use global config (tierLevel = null)
3. If no config in database, use hardcoded defaults
4. Calculate fee:
   - FLAT: Use feeValue directly
   - PERCENTAGE: (amount * feeValue) / 100
5. Apply min/max caps
```

#### DTOs Created:

**File**: `/apps/raverpay-api/src/transactions/dto/`

- `create-withdrawal-config.dto.ts`
- `update-withdrawal-config.dto.ts`

#### Controllers Updated:

**User Endpoints** (`transactions.controller.ts`):

```
GET  /api/transactions/withdrawal-config
POST /api/transactions/withdrawal-preview
POST /api/transactions/withdraw (existing, now uses dynamic fees)
```

**Admin Endpoints** (`admin-transactions.controller.ts`):

```
GET    /api/admin/transactions/withdrawal-configs
GET    /api/admin/transactions/withdrawal-configs/:id
POST   /api/admin/transactions/withdrawal-configs
PUT    /api/admin/transactions/withdrawal-configs/:id
DELETE /api/admin/transactions/withdrawal-configs/:id
```

---

### 3. **Admin Dashboard**

#### New Page: `/dashboard/withdrawal-config`

**File**: `/apps/raverpay-admin/app/dashboard/withdrawal-config/page.tsx`

**Features:**

- ✅ View all withdrawal configurations
- ✅ Create new configurations (global or tier-specific)
- ✅ Edit existing configurations
- ✅ Delete configurations
- ✅ Toggle active/inactive status
- ✅ Support for both FLAT and PERCENTAGE fee types
- ✅ Min/Max fee caps
- ✅ Withdrawal limits per config
- ✅ Real-time validation
- ✅ Permission-based access control

**API Client**:
**File**: `/apps/raverpay-admin/lib/api/withdrawal.ts`

- TypeScript interfaces for all DTOs
- API methods for CRUD operations

**UI Components Used:**

- Table for listing configs
- Dialog for create/edit
- AlertDialog for delete confirmation
- Cards for statistics
- Select dropdowns for KYC tiers
- Input fields with validation

---

### 4. **Mobile App**

#### New Hook: `useWithdrawal`

**File**: `/apps/raverpay/src/hooks/useWithdrawal.ts`

**Hooks Exported:**

1. `useWithdrawalConfig()` - Get user's withdrawal config
2. `useWithdrawalPreview()` - Preview withdrawal fee
3. `useWithdrawFunds()` - Execute withdrawal
4. `useBanks()` - Get list of Nigerian banks
5. `useResolveAccount()` - Verify account number
6. `useBankAccounts()` - Get saved bank accounts (TODO: backend)
7. `useAddBankAccount()` - Add bank account (TODO: backend)

#### New Screen: `/app/withdraw.tsx`

**Features:**

- ✅ Amount input with quick amount buttons
- ✅ Real-time fee preview
- ✅ Bank selection with search
- ✅ Auto account name resolution (Paystack)
- ✅ Account verification with checkmark
- ✅ Withdrawal limits display
- ✅ Fee breakdown card
- ✅ PIN confirmation
- ✅ Balance validation
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling
- ✅ Success confirmation
- ✅ Beautiful UI matching existing screens

#### Home Screen Updated:

**File**: `/apps/raverpay/app/(tabs)/index.tsx`

- ✅ Uncommented withdrawal button
- ✅ Wired to navigate to `/withdraw` screen
- ✅ Positioned next to "Add Money" button

#### API Endpoints Added:

**File**: `/apps/raverpay/src/lib/api/endpoints.ts`

```typescript
TRANSACTIONS: {
  WITHDRAWAL_CONFIG: '/transactions/withdrawal-config',
  WITHDRAWAL_PREVIEW: '/transactions/withdrawal-preview',
  // ... existing endpoints
}
```

---

## 📊 How It Works

### User Flow:

1. **User clicks "Withdraw" on home screen**
   - Navigates to `/withdraw` screen

2. **App fetches withdrawal config**
   - `GET /api/transactions/withdrawal-config`
   - Returns user's fee structure and limits based on KYC tier

3. **User enters amount**
   - Real-time fee preview: `POST /api/transactions/withdrawal-preview`
   - Shows: Amount, Fee, Total Debit, Amount to Receive

4. **User selects bank**
   - Fetches Nigerian banks: `GET /api/transactions/banks`
   - Searchable modal with all banks

5. **User enters account number**
   - Auto-resolves account name: `POST /api/transactions/resolve-account`
   - Uses Paystack API for verification
   - Shows green checkmark with account name

6. **User confirms withdrawal**
   - Validates all fields
   - Checks sufficient balance
   - Prompts for PIN

7. **User enters PIN**
   - `POST /api/transactions/withdraw`
   - Backend:
     - Verifies PIN
     - Calculates fee from database config
     - Checks balance
     - Creates withdrawal transaction
     - Calls Paystack transfer API
     - Updates wallet balance
     - Sends notification

8. **Success**
   - Shows confirmation alert
   - Navigates back to home
   - Wallet balance updated

---

## 🔧 Configuration Examples

### Global Configuration (All Users):

```typescript
{
  feeType: "PERCENTAGE",
  feeValue: 1.5,        // 1.5%
  minFee: 50,           // ₦50
  maxFee: 500,          // ₦500
  tierLevel: null,      // Global
  minWithdrawal: 100,   // ₦100
  maxWithdrawal: 50000, // ₦50,000
  isActive: true
}
```

### Tier-Specific Configuration (TIER_2 Users):

```typescript
{
  feeType: "FLAT",
  feeValue: 25,         // ₦25 flat fee
  minFee: 25,
  maxFee: 25,
  tierLevel: "TIER_2",  // BVN verified users
  minWithdrawal: 100,
  maxWithdrawal: 200000, // Higher limit for verified users
  isActive: true
}
```

### Multiple Configs Priority:

```
1. Check for user's KYC tier config (e.g., TIER_2)
2. If not found, use global config (tierLevel = null)
3. If no config in DB, use hardcoded default
```

---

## 📝 Fee Calculation Examples

### Example 1: Percentage Fee

```
Config: 1.5% fee, min ₦50, max ₦500

Withdrawal Amount: ₦5,000
Calculated Fee: ₦5,000 * 1.5% = ₦75
Applied Min/Max: ₦75 (within range)
Final Fee: ₦75
Total Debit: ₦5,075
User Receives: ₦5,000
```

### Example 2: Percentage Fee with Min Cap

```
Config: 1.5% fee, min ₦50, max ₦500

Withdrawal Amount: ₦1,000
Calculated Fee: ₦1,000 * 1.5% = ₦15
Applied Min/Max: ₦50 (below minimum)
Final Fee: ₦50
Total Debit: ₦1,050
User Receives: ₦1,000
```

### Example 3: Percentage Fee with Max Cap

```
Config: 1.5% fee, min ₦50, max ₦500

Withdrawal Amount: ₦50,000
Calculated Fee: ₦50,000 * 1.5% = ₦750
Applied Min/Max: ₦500 (above maximum)
Final Fee: ₦500
Total Debit: ₦50,500
User Receives: ₦50,000
```

### Example 4: Flat Fee

```
Config: ₦25 flat fee

Withdrawal Amount: ₦10,000
Calculated Fee: ₦25
Final Fee: ₦25
Total Debit: ₦10,025
User Receives: ₦10,000
```

---

## 🎨 UI/UX Features

### Mobile App:

- ✅ Clean, modern design matching existing screens
- ✅ Real-time fee calculation and display
- ✅ Account auto-verification with visual feedback
- ✅ Quick amount buttons for common values
- ✅ Searchable bank selection
- ✅ Clear fee breakdown in blue card
- ✅ Green success card for verified account
- ✅ Purple info card with important notes
- ✅ Form validation with helpful error messages
- ✅ Loading states and skeletons
- ✅ PIN confirmation modal
- ✅ Success alert with next steps

### Admin Dashboard:

- ✅ Professional table layout
- ✅ Statistics cards at top
- ✅ Color-coded status badges
- ✅ Search and filter (ready for expansion)
- ✅ Modal forms with validation
- ✅ Delete confirmation dialogs
- ✅ Tier badges (Global, TIER_0, etc.)
- ✅ Fee type badges (Fixed, Percentage)
- ✅ Responsive design

---

## 🔒 Security Features

1. **PIN Verification**: Required for all withdrawals
2. **Account Verification**: Paystack validates account before withdrawal
3. **Balance Checks**: Validates sufficient funds including fees
4. **Transaction Limits**: Min/Max per KYC tier
5. **Rate Limiting**: API rate limits on sensitive endpoints
6. **Admin Only**: Config management restricted to admin users
7. **Audit Logging**: All transactions logged with metadata

---

## 🚀 Testing Instructions

### Admin Dashboard Testing:

1. **Access the page**:

   ```
   http://localhost:3001/dashboard/withdrawal-config
   ```

2. **Create Global Config**:
   - Click "Add Configuration"
   - Leave "KYC Tier" as "Global"
   - Set Fee Type: "Percentage"
   - Fee Value: 1.5
   - Min Fee: 50
   - Max Fee: 500
   - Min Withdrawal: 100
   - Max Withdrawal: 50000
   - Active: ✓
   - Click "Create"

3. **Create Tier-Specific Config**:
   - Click "Add Configuration"
   - Select "TIER_2" for KYC Tier
   - Set Fee Type: "Fixed Amount"
   - Fee Value: 25
   - Min Withdrawal: 100
   - Max Withdrawal: 200000
   - Click "Create"

4. **Edit Config**:
   - Click edit icon on any config
   - Modify values
   - Click "Update"

5. **Delete Config**:
   - Click delete icon
   - Confirm deletion

### Mobile App Testing:

1. **Navigate to Withdraw**:
   - Open app
   - Click "Withdraw" button on home screen

2. **Test Fee Preview**:
   - Enter amount: 5000
   - Observe fee calculation in blue card
   - Try different amounts

3. **Test Bank Selection**:
   - Click "Choose your bank"
   - Search for "GTBank"
   - Select a bank

4. **Test Account Verification**:
   - Enter valid 10-digit account number
   - Wait for auto-resolution
   - Verify green checkmark appears with name

5. **Test Validation**:
   - Try amount below minimum
   - Try amount above maximum
   - Try with invalid account number
   - Try with insufficient balance

6. **Complete Withdrawal**:
   - Fill all fields correctly
   - Click "Withdraw" button
   - Enter PIN
   - Verify success message

### API Testing (cURL):

```bash
# Get withdrawal config (user)
curl -X GET http://localhost:4000/api/transactions/withdrawal-config \
  -H "Authorization: Bearer YOUR_TOKEN"

# Preview withdrawal fee
curl -X POST http://localhost:4000/api/transactions/withdrawal-preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'

# Get all configs (admin)
curl -X GET http://localhost:4000/api/admin/transactions/withdrawal-configs \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Create config (admin)
curl -X POST http://localhost:4000/api/admin/transactions/withdrawal-configs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feeType": "PERCENTAGE",
    "feeValue": 1.5,
    "minFee": 50,
    "maxFee": 500,
    "minWithdrawal": 100,
    "maxWithdrawal": 50000,
    "isActive": true
  }'
```

---

## 📁 Files Created/Modified

### Backend:

- ✅ `prisma/schema.prisma` - Added WithdrawalConfig model
- ✅ `prisma/migrations/add_withdrawal_config.sql` - Database migration
- ✅ `src/transactions/dto/create-withdrawal-config.dto.ts` - New
- ✅ `src/transactions/dto/update-withdrawal-config.dto.ts` - New
- ✅ `src/transactions/dto/index.ts` - Updated exports
- ✅ `src/transactions/transactions.service.ts` - Added config methods
- ✅ `src/transactions/transactions.controller.ts` - Added endpoints
- ✅ `src/admin/transactions/admin-transactions.service.ts` - Added methods
- ✅ `src/admin/transactions/admin-transactions.controller.ts` - Added endpoints

### Admin Dashboard:

- ✅ `lib/api/withdrawal.ts` - New API client
- ✅ `app/dashboard/withdrawal-config/page.tsx` - New page

### Mobile App:

- ✅ `src/hooks/useWithdrawal.ts` - New hook
- ✅ `src/lib/api/endpoints.ts` - Added endpoints
- ✅ `app/withdraw.tsx` - New screen
- ✅ `app/(tabs)/index.tsx` - Uncommented button

### Documentation:

- ✅ `md/WITHDRAWAL_FEATURE_IMPLEMENTATION.md` - This file

---

## ✨ Future Enhancements

### Optional (Not Implemented):

1. **Save Bank Accounts**:
   - Add backend endpoints for saving/managing bank accounts
   - Add UI for managing saved accounts
   - Quick withdraw to primary account

2. **Withdrawal History**:
   - Dedicated screen showing only withdrawals
   - Filter by status, date range
   - Export to CSV

3. **Schedule Withdrawals**:
   - Allow users to schedule withdrawals
   - Recurring withdrawals

4. **Withdrawal Limits**:
   - Daily/weekly/monthly withdrawal caps
   - Per-transaction limits beyond amount limits

5. **Multi-Currency**:
   - Support for USD, EUR withdrawals
   - Different fee structures per currency

6. **Withdrawal Analytics**:
   - Admin dashboard for withdrawal metrics
   - Success/failure rates
   - Average processing time

---

## 🎯 Success Metrics

This implementation provides:

- ✅ **Flexibility**: Admin can change fees without code deployment
- ✅ **Tier-Based**: Different rates for different KYC levels
- ✅ **Transparency**: Users see exact fees before confirming
- ✅ **Validation**: Multiple checks prevent errors
- ✅ **Security**: PIN required, account verification
- ✅ **User Experience**: Beautiful UI, real-time feedback
- ✅ **Scalability**: Database-driven, supports unlimited configs

---

## 📞 Support

For questions or issues:

1. Check this documentation first
2. Review API endpoint responses
3. Check browser/app console for errors
4. Verify database migration applied correctly
5. Ensure environment variables are set

---

**Implementation Date**: January 2025
**Status**: ✅ Complete and Ready for Testing
**Version**: 1.0
