# User-Controlled Wallet Testing Guide

## 🎯 Complete Testing Flow

This guide covers testing the entire user-controlled wallet system across API, Mobile App, and Admin Dashboard.

---

## 📋 Pre-Testing Checklist

### ✅ Backend API
- [ ] API server running
- [ ] Database migrations applied
- [ ] Circle API key configured
- [ ] Environment variables set

### ✅ Mobile App
- [ ] Circle App ID added to `.env`
- [ ] Development build created
- [ ] Device/simulator ready

### ✅ Admin Dashboard
- [ ] Admin app running
- [ ] Connected to API
- [ ] Admin user logged in

---

## 🚀 Step-by-Step Testing Guide

---

## Phase 1: Backend API Testing (15 minutes)

### Step 1.1: Start the API Server

```bash
cd apps/raverpay-api
pnpm dev
```

**Expected Output:**
```
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO Server listening on http://localhost:3000
```

### Step 1.2: Verify Database Schema

```bash
# Check if CircleUser table exists
npx prisma studio
```

**What to Check:**
- ✅ `CircleUser` table exists
- ✅ `CircleWallet` has `custodyType` column
- ✅ All migrations applied

### Step 1.3: Test User-Controlled Endpoints (Optional but Recommended)

Use Postman/Thunder Client or curl:

#### Test 1: Create Circle User
```bash
curl -X POST http://localhost:3000/circle/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "test@example.com",
    "authMethod": "EMAIL"
  }'
```

**Expected Response:**
```json
{
  "id": "uuid",
  "circleUserId": "circle-user-id",
  "authMethod": "EMAIL",
  "status": "ENABLED"
}
```

#### Test 2: Get Device Token
```bash
curl -X POST http://localhost:3000/circle/auth/email/device-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "deviceToken": "...",
  "deviceEncryptionKey": "...",
  "otpToken": "..."
}
```

**✅ If both tests pass, API is ready!**

---

## Phase 2: Mobile App Testing (30 minutes)

### Step 2.1: Configure Environment

1. **Add Circle App ID to `.env`:**
```env
EXPO_PUBLIC_CIRCLE_APP_ID=d891ca084420932db5436dae705d3fdf
```

2. **Verify API URL:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Step 2.2: Build Development Client

**Important:** You CANNOT use Expo Go. You must build a development client.

#### For iOS:
```bash
cd apps/raverpaymobile
npx expo run:ios
```

#### For Android:
```bash
cd apps/raverpaymobile
npx expo run:android
```

**Expected:** App builds and launches on simulator/device

### Step 2.3: Test Wallet Type Selection

1. **Launch the app**
2. **Login** with your test account
3. **Navigate to Circle section**
4. **Click "Create USDC Wallet"**

**Expected Screen:**
- ✅ "Choose Wallet Type" screen appears
- ✅ Two options visible:
  - "Easy Wallet" (Custodial)
  - "Advanced Wallet" (Non-Custodial)

### Step 2.4: Test User-Controlled Wallet Creation

1. **Select "Advanced Wallet"**

**Expected:**
- ✅ Navigates to setup screen
- ✅ Shows email input

2. **Enter your email** (use a real email you can access)
3. **Click "Send Verification Code"**

**Expected:**
- ✅ Loading indicator appears
- ✅ Success message: "OTP Sent"
- ✅ Email received with 6-digit code
- ✅ Screen changes to OTP input

**Troubleshooting:**
- ❌ "SDK Not Ready" → Wait a few seconds, SDK is initializing
- ❌ "Failed to send code" → Check API logs, verify Circle API key
- ❌ No email received → Check spam folder, verify email service

4. **Enter the 6-digit OTP code**
5. **Click "Verify Code"**

**Expected:**
- ✅ Loading indicator
- ✅ Screen changes to "Creating Your Wallet"
- ✅ Progress indicators show:
  - Email verified ✓
  - Setting up security (loading)
  - Creating wallet (pending)

6. **Circle SDK PIN Setup**

**Expected:**
- ✅ Circle SDK UI appears (native modal)
- ✅ Prompts to create a 6-digit PIN
- ✅ Asks to confirm PIN

**Important:** This is handled by Circle's native SDK, not your app.

7. **Complete PIN Setup**

**Expected:**
- ✅ PIN created successfully
- ✅ Returns to your app
- ✅ Shows "Wallet Created!" success screen
- ✅ Lists features:
  - Full control of your funds ✓
  - Gas-free USDC transactions ✓
  - Enhanced security features ✓

8. **Click "Go to Wallet"**

**Expected:**
- ✅ Navigates to Circle wallet screen
- ✅ Shows your new wallet
- ✅ Displays wallet address
- ✅ Shows balance (0 USDC initially)

### Step 2.5: Test Wallet Display

**Check:**
- ✅ Wallet appears in list
- ✅ Shows correct blockchain (ETH-SEPOLIA)
- ✅ Shows account type (SCA)
- ✅ Balance displays correctly

---

## Phase 3: Admin Dashboard Testing (20 minutes)

### Step 3.1: Start Admin Dashboard

```bash
cd apps/raverpay-admin
pnpm dev
```

**Expected:**
```
Ready on http://localhost:3001
```

### Step 3.2: Login to Admin

1. **Open** http://localhost:3001
2. **Login** with admin credentials
3. **Navigate** to Circle Wallets section

### Step 3.3: Test Custody Type Filter

1. **Go to** `/dashboard/circle-wallets`

**Expected:**
- ✅ Wallets table visible
- ✅ "Custody Type" filter dropdown present
- ✅ Options: All, Custodial, Non-Custodial

2. **Select "Non-Custodial"**

**Expected:**
- ✅ Table filters to show only user-controlled wallets
- ✅ Your test wallet appears
- ✅ "Custody" column shows "🔑 Non-Custodial" badge (blue)

3. **Select "Custodial"**

**Expected:**
- ✅ Shows only developer-controlled wallets
- ✅ "Custody" column shows "🛡️ Custodial" badge (green)

### Step 3.4: Test Circle Users Page

1. **Click** "Circle Users" quick link (or navigate to `/dashboard/circle-wallets/users`)

**Expected:**
- ✅ Circle Users page loads
- ✅ Stats cards show:
  - Total Users
  - Email Auth Users
  - Active Users
- ✅ User table displays

2. **Find your test user**

**Expected:**
- ✅ User appears in table
- ✅ Shows email address
- ✅ Shows Circle User ID
- ✅ Auth Method: EMAIL
- ✅ Status: ENABLED
- ✅ Wallet count: 1

3. **Test Search**

**Type** your email in search box

**Expected:**
- ✅ Filters to show only your user
- ✅ Results update in real-time

4. **Test Filters**

**Select** "Email" in Auth Method filter

**Expected:**
- ✅ Shows only email-authenticated users
- ✅ Your user still visible

---

## Phase 4: Paymaster Testing (Optional - Advanced)

### Step 4.1: Fund Your Wallet

Before testing Paymaster, you need USDC in your wallet.

**Options:**
1. Use Circle's testnet faucet
2. Transfer from another wallet
3. Use the receive screen to get your address

### Step 4.2: Test Gas-Free Transaction

1. **In mobile app**, go to Circle wallet
2. **Click "Send"**
3. **Enter:**
   - Recipient address
   - Amount (e.g., 1 USDC)

4. **Toggle "Pay Gas in USDC"** ON

**Expected:**
- ✅ Toggle switches on
- ✅ Shows "Gas fee: $X.XX USDC" in blue box
- ✅ Summary updates to show USDC gas fee

5. **Click "Review & Send"**
6. **Confirm** in modal
7. **Enter PIN**

**Expected:**
- ✅ Transaction submits
- ✅ Navigates to Paymaster status screen
- ✅ Shows UserOperation hash
- ✅ Auto-refreshes status
- ✅ Eventually shows "Transaction Complete"

---

## 🐛 Troubleshooting Guide

### Backend Issues

#### "CircleUser table does not exist"
```bash
cd apps/raverpay-api
npx prisma migrate dev
```

#### "Circle API authentication failed"
- Check `CIRCLE_API_KEY` in `.env`
- Verify API key is valid in Circle Console

### Mobile App Issues

#### "SDK not initialized"
**Solution:**
1. Check `EXPO_PUBLIC_CIRCLE_APP_ID` in `.env`
2. Rebuild development client
3. Check console logs for initialization errors

#### "Cannot use Expo Go"
**Solution:**
- You MUST use development build
- Run `npx expo run:ios` or `npx expo run:android`

#### "OTP not received"
**Solution:**
1. Check API logs for email service errors
2. Verify email service is configured
3. Check spam folder
4. Try different email address

#### "PIN setup doesn't appear"
**Solution:**
1. Ensure Circle SDK is properly installed
2. Check that you're using development build (not Expo Go)
3. Verify App ID is correct
4. Check device logs for SDK errors

### Admin Dashboard Issues

#### "No users showing"
**Solution:**
1. Check API connection
2. Verify user was created successfully
3. Check browser console for errors
4. Refresh the page

#### "Custody filter not working"
**Solution:**
1. Check that `custodyType` column exists in database
2. Verify wallets have `custodyType` set
3. Check API response in Network tab

---

## ✅ Testing Checklist

### Backend API
- [ ] Server starts successfully
- [ ] Database schema is correct
- [ ] Create Circle User endpoint works
- [ ] Get Device Token endpoint works
- [ ] Get User Token endpoint works
- [ ] Initialize Wallet endpoint works

### Mobile App
- [ ] App builds and launches
- [ ] Circle SDK initializes
- [ ] Wallet type selection works
- [ ] Email input works
- [ ] OTP email received
- [ ] OTP verification works
- [ ] Circle SDK PIN setup appears
- [ ] PIN creation successful
- [ ] Wallet created successfully
- [ ] Wallet displays in list
- [ ] Balance shows correctly

### Admin Dashboard
- [ ] Dashboard loads
- [ ] Circle Wallets page works
- [ ] Custody type filter works
- [ ] Custody column displays badges
- [ ] Circle Users page loads
- [ ] User stats display correctly
- [ ] User table shows data
- [ ] Search works
- [ ] Filters work

### Paymaster (Optional)
- [ ] Toggle appears in send screen
- [ ] Gas fee estimate shows
- [ ] Transaction submits
- [ ] Status screen appears
- [ ] UserOperation completes
- [ ] Gas paid in USDC

---

## 📊 Expected Results Summary

### Successful Test Run:
1. ✅ Backend API responds to all endpoints
2. ✅ Mobile app creates user-controlled wallet
3. ✅ Circle SDK handles PIN setup
4. ✅ Wallet appears in mobile app
5. ✅ Admin dashboard shows wallet with correct custody type
6. ✅ Admin dashboard shows user in Circle Users page
7. ✅ All filters and search work correctly

### Time Estimate:
- Backend testing: 15 minutes
- Mobile app testing: 30 minutes
- Admin dashboard testing: 20 minutes
- **Total: ~65 minutes**

---

## 🎉 Success Criteria

You've successfully tested everything when:

1. ✅ User can create a user-controlled wallet via mobile app
2. ✅ Circle SDK handles authentication and PIN setup
3. ✅ Wallet appears in mobile app with correct details
4. ✅ Admin can see the wallet with "Non-Custodial" badge
5. ✅ Admin can see the user in Circle Users page
6. ✅ All filters and search work correctly
7. ✅ (Optional) Paymaster transactions work

---

## 📝 Notes

- **First time setup** may take longer due to SDK initialization
- **OTP emails** may take 1-2 minutes to arrive
- **PIN setup** is handled entirely by Circle SDK (native UI)
- **Testnet** transactions are free but may be slower
- **Development builds** are required for native modules

---

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review console logs (mobile app, API, admin)
3. Verify all environment variables are set
4. Ensure you're using development build (not Expo Go)
5. Check Circle Console for API errors

---

## 🚀 Ready to Test!

Start with **Phase 1 (Backend API)** to ensure the foundation is solid, then move to **Phase 2 (Mobile App)** for the main testing, and finish with **Phase 3 (Admin Dashboard)** to verify everything is visible and manageable.

Good luck! 🎉
