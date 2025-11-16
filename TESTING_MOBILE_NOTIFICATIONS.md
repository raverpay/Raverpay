# Testing Mobile App Notification System

## Overview

This guide helps you test the complete notification system implementation in your mobile app, ensuring all features work correctly with the backend.

---

## Prerequisites

### 1. Backend Must Be Running

```bash
cd apps/mularpay-api
pnpm dev
```

**Verify backend is running:**
- Backend should be accessible at your API URL
- Check logs show: `Nest application successfully started`

### 2. Database Schema Applied

Ensure notification tables exist in your database:
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'notification%'
ORDER BY tablename;
```

**Expected output:**
```
notification_logs
notification_preferences
notification_queue
notification_templates
notifications
```

### 3. Mobile App Running

```bash
cd mularpay-mobileapp
npm start
# Then press 'i' for iOS or 'a' for Android
```

---

## Test Plan

### Phase 1: Basic Notification Display

#### Test 1.1: View Notifications Tab
**Goal:** Verify notifications tab appears with badge

**Steps:**
1. Login to the mobile app
2. Look at the bottom tab bar
3. Find the "Notifications" tab (bell icon)

**Expected Results:**
- ✅ Bell icon visible in tab bar
- ✅ If there are unread notifications, a red badge shows the count
- ✅ Badge shows "99+" if count > 99

**Screenshot Location:** Tab bar at bottom

---

#### Test 1.2: Open Notifications Screen
**Goal:** Verify notifications list loads

**Steps:**
1. Tap on the Notifications tab
2. Wait for screen to load

**Expected Results:**
- ✅ Header shows "Notifications" with back button
- ✅ Settings icon (gear) in top right
- ✅ Two filter tabs: "All" and "Unread"
- ✅ Either notifications display OR empty state shows

**Empty State Should Show:**
- Large bell icon
- "No Notifications" heading
- "You're all caught up!" message

---

### Phase 2: Create Test Notifications

Since you won't have notifications yet, you need to trigger them via backend events.

#### Method 1: Trigger via Webhook (Recommended)

**Test DVA Creation Notification:**

1. In the mobile app, go to Fund Wallet
2. Request a Dedicated Virtual Account (DVA)
3. Complete the BVN verification flow
4. This triggers `dedicatedaccount.assign.success` webhook

**Expected Notification:**
- Title: "Virtual Account Ready"
- Message: "Your dedicated virtual account has been created successfully..."
- Category: ACCOUNT (purple person icon)

---

**Test BVN Verification Notification:**

If you complete BVN verification during DVA creation:

**Expected Notification:**
- Title: "BVN Verification Successful"
- Message: "Your BVN has been verified! Your account has been upgraded to TIER_2..."
- Category: KYC (blue checkmark icon)
- Channels: EMAIL + SMS + IN_APP

---

**Test Deposit Notification:**

1. Transfer money to your DVA account number
2. Wait for Paystack webhook to fire (`charge.success`)

**Expected Notification:**
- Title: "Wallet Funded Successfully"
- Message: "Your wallet has been credited with ₦X via bank transfer"
- Category: TRANSACTION (green cash icon)
- Channels: EMAIL + SMS + IN_APP

---

#### Method 2: Manually Create Notification via API (For Testing)

You can manually create a test notification using Postman or curl:

**Using Postman:**

```http
POST {{API_URL}}/notifications
Authorization: Bearer {{your_jwt_token}}
Content-Type: application/json

{
  "userId": "{{your_user_id}}",
  "type": "TRANSACTION",
  "title": "Test Notification",
  "message": "This is a test notification to verify the mobile app is working",
  "data": {
    "testKey": "testValue"
  }
}
```

**Using curl:**

```bash
curl -X POST http://localhost:3000/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "type": "TRANSACTION",
    "title": "Test Notification",
    "message": "This is a test notification",
    "data": {}
  }'
```

---

### Phase 3: Test Notification Interactions

#### Test 3.1: Mark as Read
**Goal:** Individual notification mark as read

**Steps:**
1. Open notifications screen
2. Find an unread notification (has purple dot + left border)
3. Tap on the notification

**Expected Results:**
- ✅ Purple dot disappears
- ✅ Purple left border disappears
- ✅ Notification stays in "All" tab
- ✅ Notification disappears from "Unread" tab
- ✅ Badge count decreases by 1

---

#### Test 3.2: Mark All as Read
**Goal:** Bulk mark as read

**Steps:**
1. Ensure you have multiple unread notifications
2. Open notifications screen
3. Tap "Mark All as Read" button at top

**Expected Results:**
- ✅ All notifications lose purple dot/border
- ✅ "Unread" tab becomes empty
- ✅ Badge on tab disappears (shows 0)
- ✅ "Mark All as Read" button disappears

---

#### Test 3.3: Delete Notification
**Goal:** Remove notification

**Steps:**
1. Open notifications screen
2. Tap the trash icon on any notification

**Expected Results:**
- ✅ Confirmation dialog appears: "Delete Notification"
- ✅ Tap "Delete"
- ✅ Notification disappears from list
- ✅ If it was unread, badge count decreases

---

#### Test 3.4: Filter Tabs
**Goal:** Switch between All and Unread

**Steps:**
1. Open notifications screen
2. Create 2 notifications (both unread)
3. Mark 1 as read
4. Test filter tabs

**Expected Results:**

**"All" Tab:**
- ✅ Shows 2 notifications (1 read, 1 unread)

**"Unread" Tab:**
- ✅ Shows only 1 notification
- ✅ Badge count shows (1)

---

#### Test 3.5: Pull to Refresh
**Goal:** Reload notifications

**Steps:**
1. Open notifications screen
2. Pull down from top of list
3. Release

**Expected Results:**
- ✅ Loading spinner appears
- ✅ List refreshes with latest data
- ✅ Any new notifications appear at top

---

#### Test 3.6: Infinite Scroll
**Goal:** Load more notifications

**Prerequisites:** Have more than 20 notifications

**Steps:**
1. Open notifications screen
2. Scroll to bottom of list
3. Continue scrolling

**Expected Results:**
- ✅ "Load More" button appears
- ✅ Tap button loads next page
- ✅ Loading indicator shows while fetching
- ✅ New notifications append to list
- ✅ Button disappears when no more pages

---

### Phase 4: Test Notification Preferences

#### Test 4.1: Access Preferences Screen
**Goal:** Open notification settings

**Method 1 - From Notifications Screen:**
1. Open notifications screen
2. Tap settings icon (gear) in top right

**Method 2 - From Profile:**
1. Go to Profile tab
2. Find "Notification Preferences" in Account section
3. Tap it

**Expected Results:**
- ✅ Preferences screen opens
- ✅ Header shows "Notification Preferences"
- ✅ Back button works

---

#### Test 4.2: Toggle Channels
**Goal:** Enable/disable notification channels

**Steps:**
1. Open notification preferences
2. Find "Notification Channels" section
3. Toggle each switch (Email, SMS, Push, In-App)

**Expected Results:**
- ✅ Each toggle switches smoothly
- ✅ Purple color when enabled
- ✅ Gray when disabled
- ✅ Changes are reflected in UI immediately

---

#### Test 4.3: Configure Event Preferences
**Goal:** Set preferences per event type

**Steps:**
1. Scroll to "Transaction Notifications" section
2. Toggle Email, SMS, Push switches
3. Repeat for Security, KYC, Promotional sections

**Expected Results:**
- ✅ Each category has 3 toggle switches
- ✅ Toggles work independently
- ✅ Icons and descriptions are clear

**Default States to Verify:**
- Transaction: All enabled (Email, SMS, Push)
- Security: All enabled
- KYC: All enabled
- Promotional: All disabled

---

#### Test 4.4: Enable Quiet Hours
**Goal:** Configure do-not-disturb period

**Steps:**
1. Scroll to "Quiet Hours" section
2. Toggle "Enable Quiet Hours"
3. Observe the additional info displayed

**Expected Results:**
- ✅ Toggle switches on
- ✅ Shows quiet hours time: "22:00 - 06:00"
- ✅ Shows timezone: "Africa/Lagos"
- ✅ Note about security alerts still working

---

#### Test 4.5: Save Preferences
**Goal:** Persist changes to backend

**Steps:**
1. Make several changes to preferences
2. Scroll to bottom
3. Tap "Save Preferences" button
4. Wait for response

**Expected Results:**
- ✅ Button shows loading state
- ✅ Success alert appears: "Notification preferences updated successfully"
- ✅ Alert has "OK" button
- ✅ Changes persist after closing screen

---

#### Test 4.6: Reset to Defaults
**Goal:** Restore default preferences

**Steps:**
1. Make several changes to preferences
2. Tap "Reset to Defaults" button
3. Confirm in alert dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ "Are you sure..." message shown
- ✅ Cancel and Reset buttons
- ✅ After reset:
  - All transactions: enabled
  - All security: enabled
  - All promotional: disabled
  - Quiet hours: disabled
- ✅ Success message appears

---

### Phase 5: Test Navigation & Deep Links

#### Test 5.1: Navigate from Notification to Transaction
**Goal:** Deep link to transaction details

**Prerequisites:** Have a transaction-related notification

**Steps:**
1. Open notifications
2. Tap a notification with transaction data
3. Should navigate to transaction details

**Expected Results:**
- ✅ Navigates to `/transaction-details/[id]`
- ✅ Transaction details screen shows
- ✅ Back button returns to notifications

---

### Phase 6: Test Badge Updates

#### Test 6.1: Real-time Badge Count
**Goal:** Verify badge updates in real-time

**Steps:**
1. Note current badge count on notifications tab
2. Have someone trigger a notification (or use API)
3. Wait a few seconds

**Expected Results:**
- ✅ Badge count increases automatically
- ✅ No app restart needed
- ✅ React Query polling works

---

#### Test 6.2: Badge After Mark as Read
**Goal:** Badge decreases when marking read

**Steps:**
1. Note badge count (e.g., 5)
2. Mark 1 notification as read
3. Return to home screen

**Expected Results:**
- ✅ Badge shows 4
- ✅ Updates immediately

---

#### Test 6.3: Badge Clears on Mark All
**Goal:** Badge goes to 0

**Steps:**
1. Have unread notifications
2. Mark all as read
3. Check tab bar

**Expected Results:**
- ✅ Badge completely disappears
- ✅ No "0" showing
- ✅ Just the bell icon

---

### Phase 7: Test Error Handling

#### Test 7.1: Network Offline
**Goal:** Handle no connection gracefully

**Steps:**
1. Turn off WiFi/mobile data
2. Try to load notifications
3. Try to mark as read
4. Try to save preferences

**Expected Results:**
- ✅ Error messages appear (not crashes)
- ✅ Previous data still visible (React Query cache)
- ✅ Retry mechanism works when back online

---

#### Test 7.2: Empty States
**Goal:** Proper empty state displays

**Test Empty Notifications:**
1. Mark all as read
2. Delete all notifications
3. View "Unread" tab

**Expected Results:**
- ✅ Bell icon
- ✅ "No Notifications" text
- ✅ Different message for unread vs all

---

### Phase 8: Test with Real Webhook Events

#### Test 8.1: End-to-End DVA Flow
**Complete User Journey:**

1. **Request DVA with BVN:**
   - Go to Fund Wallet
   - Tap Request Virtual Account
   - Fill in BVN details
   - Submit

2. **Check Notifications:**
   - Navigate to Notifications tab
   - Should see "BVN Verification Successful" (if BVN validated)
   - Should see "Virtual Account Ready"

3. **Fund Account:**
   - Transfer money to DVA account number
   - Wait 1-2 minutes

4. **Check Deposit Notification:**
   - Pull to refresh notifications
   - Should see "Wallet Funded Successfully"
   - Amount should match transfer

5. **Verify Email & SMS:**
   - Check email inbox
   - Check SMS messages
   - Should receive same notifications

---

### Phase 9: Cross-Platform Testing

#### Test 9.1: iOS Specific
**Only if testing on iOS:**

- ✅ Tab bar spacing correct
- ✅ Safe area insets respected
- ✅ Swipe gestures work
- ✅ Pull to refresh feels native

#### Test 9.2: Android Specific
**Only if testing on Android:**

- ✅ Material Design ripple effects
- ✅ Back button navigation works
- ✅ Status bar color correct
- ✅ Hardware back button works

---

## Troubleshooting Common Issues

### Issue 1: Badge Not Showing

**Possible Causes:**
1. React Query not fetching data
2. useUnreadCount hook not working
3. API endpoint not returning correct count

**Debug Steps:**
```javascript
// Add console.log in useUnreadCount hook
console.log('Unread count:', unreadCount);
```

**Check Backend:**
```bash
# Check if notifications exist
curl -X GET http://localhost:3000/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Issue 2: Notifications Not Loading

**Possible Causes:**
1. API endpoint wrong
2. Authentication token expired
3. CORS issues

**Debug Steps:**
1. Open React Native Debugger
2. Check Network tab
3. Look for failed requests
4. Verify API_URL in `.env`

**Check API Endpoint:**
```javascript
// In src/lib/api/client.ts
console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
```

---

### Issue 3: Preferences Not Saving

**Possible Causes:**
1. PUT request failing
2. Validation errors
3. Missing fields

**Debug Steps:**
1. Check backend logs for errors
2. Verify DTO validation
3. Check response in Network tab

**Backend Check:**
```bash
# Check user's preferences exist
curl -X GET http://localhost:3000/notification-preferences \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Issue 4: FlashList Not Rendering

**Possible Causes:**
1. estimatedItemSize incorrect
2. Data array empty
3. Parent View has no height

**Fix:**
```javascript
// Ensure parent View has flex-1
<View className="flex-1">
  <FlashList ... />
</View>
```

---

## Testing Checklist

Use this checklist to ensure complete testing:

### Basic Features
- [ ] Notifications tab visible in tab bar
- [ ] Badge shows unread count
- [ ] Notifications screen loads
- [ ] Empty state displays when no notifications
- [ ] FlashList renders all notifications

### Interactions
- [ ] Tap notification marks as read
- [ ] Mark all as read works
- [ ] Delete notification works
- [ ] Filter tabs work (All/Unread)
- [ ] Pull to refresh works
- [ ] Infinite scroll / Load more works

### Preferences
- [ ] Access preferences from profile
- [ ] Access preferences from notifications
- [ ] Toggle channels works
- [ ] Toggle event preferences works
- [ ] Enable quiet hours works
- [ ] Save preferences works
- [ ] Reset to defaults works

### Navigation
- [ ] Navigate from notification to transaction
- [ ] Back button works everywhere
- [ ] Tab navigation doesn't lose state

### Real Data
- [ ] DVA creation sends notification
- [ ] BVN verification sends notification
- [ ] Deposit sends notification
- [ ] Email received
- [ ] SMS received

### Edge Cases
- [ ] Works offline (cached data)
- [ ] Handles errors gracefully
- [ ] No crashes on empty data
- [ ] Badge updates in real-time
- [ ] Works on both iOS and Android

---

## Success Criteria

Your notification system is working correctly if:

✅ **Notifications appear in-app** after backend events (DVA, deposit, etc.)
✅ **Badge shows correct unread count** on notifications tab
✅ **Mark as read** updates UI and badge immediately
✅ **Preferences save** and persist across app restarts
✅ **FlashList scrolls smoothly** with 100+ notifications
✅ **Pull to refresh** loads new notifications
✅ **Deep links work** (tap notification → transaction details)
✅ **Multi-channel delivery** (email + SMS + in-app all receive)
✅ **No crashes** under any scenario

---

## Next Steps After Testing

Once all tests pass:

1. **Performance Testing**
   - Test with 1000+ notifications
   - Measure scroll performance
   - Check memory usage

2. **Push Notifications** (Phase 2)
   - Integrate OneSignal
   - Test background notifications
   - Test notification actions

3. **User Feedback**
   - Beta test with real users
   - Collect feedback on UX
   - Iterate on design

4. **Analytics**
   - Track open rates
   - Monitor delivery success
   - Measure user engagement

---

## Support

If you encounter issues during testing:

1. Check backend logs: `apps/mularpay-api/logs`
2. Check React Native logs: Metro bundler output
3. Use React Native Debugger for frontend debugging
4. Check database for notification records
5. Verify API endpoints with Postman/curl

**Common Commands:**
```bash
# Backend logs
cd apps/mularpay-api
pnpm dev | grep "Notification"

# Mobile logs
cd mularpay-mobileapp
npm start
# Then press 'j' to open debugger

# Database check
psql $DATABASE_URL -c "SELECT * FROM notifications ORDER BY \"createdAt\" DESC LIMIT 10;"
```

---

**Happy Testing! 🎉**
