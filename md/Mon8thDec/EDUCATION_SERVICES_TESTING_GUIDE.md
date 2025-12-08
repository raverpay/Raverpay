# Education Services Testing Guide

## Overview

Testing guide for JAMB Pin Vending, WAEC Registration, and WAEC Result Checker services.

---

## 📱 Mobile App Testing (apps/raverpay)

### Prerequisites

1. Ensure backend is running and connected
2. Have a funded wallet with sufficient balance
3. Set transaction PIN if not already set
4. Backend should be in **sandbox mode** for testing

### 1. Home Screen Quick Actions

**Location:** Home tab (bottom navigation)

**Test:**

- [ ] Scroll down to "Quick Actions" section
- [ ] Verify 3 new education service cards appear:
  - "Buy JAMB PIN" (graduation cap icon)
  - "WAEC Registration" (document icon)
  - "WAEC Result" (ribbon icon)
- [ ] Tap each card to navigate to respective screens

---

### 2. JAMB Pin Vending (`/buy-jamb-pin`)

#### Test Flow A: Complete Purchase

1. **Navigation**
   - [ ] Tap "Buy JAMB PIN" from home quick actions
   - [ ] Screen displays with title and balance

2. **Plan Selection**
   - [ ] Plans load from VTPass API
   - [ ] Select a JAMB plan (e.g., "JAMB UTME PIN")
   - [ ] Amount displays correctly

3. **Profile ID Input**
   - [ ] Enter 10-digit JAMB Profile ID
   - [ ] **Auto-verification triggers** when 10th digit is entered
   - [ ] Loading state shows during verification
   - [ ] Customer name displays if verification succeeds
   - [ ] Error alert shows if verification fails

4. **Cashback Display**
   - [ ] If cashback available, green card shows discount option
   - [ ] Tap cashback card to toggle apply/remove
   - [ ] Final amount updates when cashback applied

5. **Purchase Flow**
   - [ ] Tap "Buy JAMB PIN" button
   - [ ] Confirmation modal shows transaction details:
     - Plan name
     - Profile ID
     - Customer name
     - Amount
     - Cashback info (if applicable)
   - [ ] Toggle cashback switch in modal (if available)
   - [ ] Tap "Confirm" button
   - [ ] PIN modal appears
   - [ ] Enter 4-digit transaction PIN
   - [ ] Loading state shows during processing
   - [ ] Success state displays with JAMB PIN
   - [ ] Copy button works for PIN

6. **Post-Purchase Verification**
   - [ ] Wallet balance updates
   - [ ] Transaction appears in history
   - [ ] Notification received
   - [ ] Can purchase another PIN

#### Test Flow B: Error Scenarios

- [ ] Test with invalid Profile ID (should fail verification)
- [ ] Test with insufficient wallet balance
- [ ] Test with wrong transaction PIN
- [ ] Test duplicate purchase detection (same Profile ID within cooldown)

---

### 3. WAEC Registration (`/buy-waec-registration`)

#### Test Flow A: Complete Purchase

1. **Navigation**
   - [ ] Tap "WAEC Registration" from home quick actions
   - [ ] Screen displays with title and balance

2. **Plan Selection**
   - [ ] Plans load from VTPass API
   - [ ] Select a WAEC Registration plan
   - [ ] Amount displays correctly

3. **Phone Number Input**
   - [ ] Enter 11-digit phone number (format: 080XXXXXXXX)
   - [ ] Validation shows for invalid formats
   - [ ] Input accepts only numbers

4. **Cashback Display**
   - [ ] If cashback available (₦250 commission), green card shows
   - [ ] Tap to apply/remove cashback discount

5. **Purchase Flow**
   - [ ] Tap "Buy WAEC Registration" button
   - [ ] Confirmation modal shows:
     - Service name
     - Phone number
     - Amount
     - Cashback info
   - [ ] Confirm and enter PIN
   - [ ] Success displays with Registration Token
   - [ ] Copy button works for token

6. **Post-Purchase**
   - [ ] Wallet balance deducted
   - [ ] Token saved for reference
   - [ ] Can purchase another registration

#### Test Flow B: Error Scenarios

- [ ] Test with invalid phone format
- [ ] Test with insufficient balance
- [ ] Test network errors

---

### 4. WAEC Result Checker (`/buy-waec-result`)

#### Test Flow A: Complete Purchase

1. **Navigation**
   - [ ] Tap "WAEC Result" from home quick actions
   - [ ] Screen displays with title and balance

2. **Plan Selection**
   - [ ] Plans load from VTPass API
   - [ ] Select a WAEC Result Checker plan
   - [ ] Amount displays correctly

3. **Phone Number Input**
   - [ ] Enter 11-digit phone number
   - [ ] Validation works correctly

4. **Cashback Display**
   - [ ] Cashback card appears if eligible (₦250)

5. **Purchase Flow**
   - [ ] Tap "Buy WAEC Result Checker" button
   - [ ] Confirmation modal shows details
   - [ ] Confirm and enter PIN
   - [ ] Success displays with **cards array** (Serial + PIN pairs)
   - [ ] Each card shows:
     - Serial number
     - PIN code
     - Copy button (copies both as text)

6. **Post-Purchase**
   - [ ] Multiple cards display correctly
   - [ ] Copy function works for each card
   - [ ] Transaction recorded

#### Test Flow B: Error Scenarios

- [ ] Test with invalid phone
- [ ] Test insufficient balance
- [ ] Test API errors

---

## 🖥️ Admin Dashboard Testing (apps/raverpay-admin)

### Prerequisites

1. Login with admin credentials
2. Navigate to VTU Orders section

### 1. VTU Orders List Page (`/dashboard/vtu`)

**Test Filters:**

- [ ] Click "Service Type" dropdown
- [ ] Verify new options appear:
  - "JAMB"
  - "WAEC Registration"
  - "WAEC Result"
- [ ] Select "JAMB" filter
  - [ ] Only JAMB orders display
- [ ] Select "WAEC Registration" filter
  - [ ] Only WAEC Registration orders display
- [ ] Select "WAEC Result" filter
  - [ ] Only WAEC Result orders display
- [ ] Clear filter shows all orders again

**Verify Order List Displays:**

- [ ] Education service orders appear in table
- [ ] Service type badge shows correctly
- [ ] Amount displays
- [ ] Status shows (SUCCESS/PENDING/FAILED)
- [ ] Timestamp accurate

---

### 2. VTU Order Detail Page (`/dashboard/vtu/[orderId]`)

#### Test JAMB Order Details

1. **Click on a JAMB order**
2. **Verify Education-Specific Section displays:**
   - [ ] "Education Service Details" heading appears
   - [ ] JAMB PIN displays prominently
   - [ ] Copy button available for PIN
   - [ ] Profile ID shows
   - [ ] Customer name displays
   - [ ] Variation/plan name shows

3. **Standard Order Info:**
   - [ ] Order reference
   - [ ] Status badge
   - [ ] Amount breakdown
   - [ ] Timestamp
   - [ ] Provider response data

#### Test WAEC Registration Order Details

1. **Click on a WAEC Registration order**
2. **Verify Education-Specific Section:**
   - [ ] "Education Service Details" heading
   - [ ] Registration Token displays
   - [ ] Copy button works
   - [ ] Phone number shows
   - [ ] Variation name displays

3. **Standard Order Info validated**

#### Test WAEC Result Order Details

1. **Click on a WAEC Result order**
2. **Verify Education-Specific Section:**
   - [ ] "Education Service Details" heading
   - [ ] Multiple cards display in grid/list
   - [ ] Each card shows:
     - Serial number
     - PIN code
     - Copy button
   - [ ] JSON parsing works correctly
   - [ ] Phone number shows
   - [ ] Variation name displays

3. **Standard Order Info validated**

---

## 🔍 Backend API Testing (Optional - Postman/Thunder Client)

### Endpoints to Test

#### 1. Get JAMB Variations

```
GET /api/vtu/jamb/variations
Authorization: Bearer {token}
```

**Expected:** Array of JAMB plans with prices

#### 2. Verify JAMB Profile

```
POST /api/vtu/jamb/verify
Authorization: Bearer {token}
Body: {
  "profileId": "1234567890",
  "variationCode": "jamb"
}
```

**Expected:** Customer name and verification status

#### 3. Purchase JAMB PIN

```
POST /api/vtu/jamb/purchase
Authorization: Bearer {token}
Body: {
  "profileId": "1234567890",
  "variationCode": "jamb",
  "pin": "1234",
  "useCashback": false,
  "cashbackAmount": 0
}
```

**Expected:** Success with PIN in response

#### 4. Get WAEC Registration Variations

```
GET /api/vtu/waec-registration/variations
Authorization: Bearer {token}
```

#### 5. Purchase WAEC Registration

```
POST /api/vtu/waec-registration/purchase
Authorization: Bearer {token}
Body: {
  "phone": "08012345678",
  "variationCode": "waec-registration",
  "pin": "1234",
  "useCashback": false,
  "cashbackAmount": 0
}
```

**Expected:** Success with token

#### 6. Get WAEC Result Variations

```
GET /api/vtu/waec-result/variations
Authorization: Bearer {token}
```

#### 7. Purchase WAEC Result

```
POST /api/vtu/waec-result/purchase
Authorization: Bearer {token}
Body: {
  "phone": "08012345678",
  "variationCode": "waec-result",
  "pin": "1234",
  "useCashback": false,
  "cashbackAmount": 0
}
```

**Expected:** Success with cards array

---

## ✅ Success Criteria

### Mobile App

- [ ] All three services accessible from home screen
- [ ] Plan variations load correctly
- [ ] JAMB auto-verification works silently
- [ ] Phone validation works for WAEC services
- [ ] Cashback system integrates properly
- [ ] Purchase flows complete successfully
- [ ] PINs/tokens/cards display and copy correctly
- [ ] Error handling works (insufficient balance, invalid inputs)
- [ ] Transaction history updates
- [ ] Notifications sent

### Admin Dashboard

- [ ] New filter options appear
- [ ] Filtering works correctly
- [ ] Order details display education-specific data
- [ ] PINs/tokens/cards visible and copyable
- [ ] JSON parsing works for WAEC Result cards
- [ ] No UI breaks or console errors

### Backend

- [ ] All 7 endpoints respond correctly
- [ ] Rate limiting enforced (10 purchases/hour)
- [ ] VTPass API integration working
- [ ] Response parsing correct for each service
- [ ] Database records created properly
- [ ] Cashback commission awarded (₦150 JAMB, ₦250 WAEC)
- [ ] Transaction flows complete (wallet locking, refunds on error)

---

## 🐛 Known Issues to Watch For

1. **TypeScript Language Server**: Some enum type errors may show in VS Code but won't affect runtime (restart VS Code if needed)
2. **Expo Router Types**: Route type warnings for new screens will resolve after dev server restart
3. **VTPass Sandbox**: Use sandbox mode for testing - some services may have limited test data
4. **JAMB Profile Verification**: Test profiles need to be valid in VTPass sandbox
5. **WAEC Result Cards**: Ensure JSON parsing handles various card formats from VTPass

---

## 📝 Test Checklist Summary

- [ ] Mobile: All 3 quick action cards navigate correctly
- [ ] Mobile: JAMB purchase flow (with auto-verification)
- [ ] Mobile: WAEC Registration purchase flow
- [ ] Mobile: WAEC Result purchase flow (with cards display)
- [ ] Mobile: Cashback integration works
- [ ] Mobile: Error handling for all scenarios
- [ ] Admin: Filter dropdown shows new options
- [ ] Admin: JAMB order detail shows PIN
- [ ] Admin: WAEC Reg order detail shows token
- [ ] Admin: WAEC Result order detail shows cards
- [ ] Backend: All 7 endpoints functional
- [ ] Database: Orders recorded with correct serviceType enum

---

## 🎯 Priority Test Order

1. **Start here:** Mobile JAMB purchase (most complex with verification)
2. **Then:** Mobile WAEC Registration (simpler, single token)
3. **Then:** Mobile WAEC Result (cards array parsing)
4. **Finally:** Admin dashboard filtering and details

---

## 💡 Tips

- Use **sandbox mode** credentials from VTPass documentation
- Test with small amounts first
- Check console logs for detailed error messages
- Verify wallet balance before each test
- Take screenshots of successful purchases for records
- Test on both iOS and Android if possible
- Clear app cache if encountering stale data

---

**Ready to test! Start with the mobile app JAMB flow and work through each service systematically.** 🚀
