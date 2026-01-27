# Circle USDC Integration - Complete Testing Guide

This guide provides step-by-step instructions for testing the Circle USDC wallet integration in both the mobile app and admin dashboard, from start to finish.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Testnet USDC](#getting-testnet-usdc)
3. [Mobile App Testing](#mobile-app-testing)
4. [Admin Dashboard Testing](#admin-dashboard-testing)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### ✅ Before You Start

- [x] Circle API integration complete
- [x] Backend API running
- [x] Mobile app installed on device/simulator
- [x] Admin dashboard accessible
- [x] Test user account created

### 🔑 Required Information

- **Test User Credentials**:
  - Email: `test.user1@raverpay.com`
  - Password: `TestPass123!`

- **Test Wallet Created**:
  - Address: `0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4`
  - Network: MATIC-AMOY (Polygon Testnet)
  - Wallet ID: `70e824e7-b8aa-5964-886f-b8da5625555d`

### 🌐 API Endpoints

- **Production**: `https://api.raverpay.com/api`
- **Development**: `https://f9474a29882e.ngrok-free.app/api`

---

## Getting Testnet USDC

Before testing transfers, you need testnet USDC tokens. Here's how to get them:

### Option 1: Circle's USDC Faucet (Recommended)

1. **Visit Circle's Faucet**
   - Go to: https://faucet.circle.com/

2. **Select Network**
   - Choose **"Polygon Amoy"** from the network dropdown

3. **Enter Your Wallet Address**

   ```
   0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4
   ```

4. **Request USDC**
   - Click "Request USDC"
   - You'll receive 10 test USDC tokens
   - Wait 1-2 minutes for confirmation

5. **Verify Receipt**
   - Check your wallet balance in the app
   - Or view on block explorer: https://amoy.polygonscan.com/

### Option 2: Polygon Amoy Faucet + Swap

If Circle's faucet isn't available:

1. **Get Test MATIC**
   - Visit: https://faucet.polygon.technology/
   - Select "Polygon Amoy Testnet"
   - Enter your address: `0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4`
   - Get test MATIC tokens

2. **Swap for USDC**
   - Use a testnet DEX or bridge
   - Or request USDC from Circle's Discord/Support

### Option 3: Circle Developer Console

1. **Login to Circle Console**
   - Go to: https://console.circle.com/

2. **Navigate to Wallets**
   - Find your wallet in the dashboard

3. **Manual Transfer**
   - Use Circle's test USDC pool to transfer to your wallet

---

## Mobile App Testing

### Test Flow Overview

```
Login → View Dashboard → Create/View Wallet → Fund Wallet → Send USDC →
View Transactions → Cross-Chain Transfer → Check Balance
```

---

### Step 1: Login to Mobile App

**Action:**

1. Open RaverPay mobile app
2. Enter credentials:
   - Email: `codeswithjoseph@gmail.com`
   - Password: `6thbornR%`
3. Tap "Login"

**Expected Result:**

- ✅ Login successful
- ✅ Redirected to home screen
- ✅ User balance displayed

**Screenshot Location:** Home screen with balance

---

### Step 2: Navigate to Circle Wallet

**Action:**

1. On home screen, scroll down
2. Find **"USDC Wallet"** card
3. Tap on the card

**OR:**

1. Tap **"USDC"** quick action button in the quick actions row

**Expected Result:**

- ✅ Navigated to Circle wallet dashboard (`/circle`)
- ✅ Wallet information displayed
- ✅ Balance shows (0 USDC initially)

**What You'll See:**

```
Circle Wallet Dashboard
├── Wallet Card
│   ├── Address: 0x69476...f54f4
│   ├── Network: MATIC-AMOY
│   └── Balance: 0.00 USDC
├── Action Buttons
│   ├── Send
│   ├── Receive
│   └── Bridge
└── Transaction History (empty initially)
```

---

### Step 3: View Wallet Details

**Action:**

1. On Circle wallet dashboard
2. Observe wallet information

**Expected Result:**

- ✅ Wallet address displayed (truncated)
- ✅ Network badge shows "MATIC-AMOY"
- ✅ Balance shows "0.00 USDC" (before funding)
- ✅ QR code visible

**Verify:**

- Tap address to copy
- Toast notification: "Address copied"

---

### Step 4: Get Receive Address

**Action:**

1. Tap **"Receive"** button
2. View receive screen

**Expected Result:**

- ✅ Full wallet address displayed
- ✅ QR code generated
- ✅ Network information shown
- ✅ Copy button works

**What You'll See:**

```
Receive USDC
├── QR Code (scannable)
├── Address: 0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4
├── Network: Polygon Amoy Testnet
├── Copy Address button
└── Share button
```

**Action:**

- Tap "Copy Address"
- Use this address to fund from faucet (see "Getting Testnet USDC" section above)

---

### Step 5: Fund Your Wallet

**Action:**

1. Copy your wallet address from receive screen
2. Go to Circle's faucet: https://faucet.circle.com/
3. Select "Polygon Amoy"
4. Paste your address
5. Request 10 USDC
6. Wait 1-2 minutes

**Expected Result:**

- ✅ Transaction confirmed on blockchain
- ✅ Balance updates in app (may need to refresh)

**Verify Balance:**

1. Return to Circle wallet dashboard
2. Pull down to refresh
3. Balance should show ~10 USDC

**Troubleshooting:**

- If balance doesn't update, wait 2-3 minutes and refresh again
- Check transaction on explorer: https://amoy.polygonscan.com/address/YOUR_ADDRESS

---

### Step 6: Send USDC

**Action:**

1. Tap **"Send"** button
2. Fill in the send form:
   - **To Address**: `0x742d35Cc6634C0532925a3b844Bc454e4438f44e` (example)
   - **Amount**: `1.5`
   - **Note** (optional): "Test transfer"
3. Tap **"Continue"**
4. Review transaction details
5. Tap **"Confirm Send"**

**Expected Result:**

- ✅ Transaction initiated
- ✅ Loading indicator appears
- ✅ Success message: "Transaction submitted"
- ✅ Transaction ID displayed
- ✅ Redirected to transaction details

**Transaction Details Screen Shows:**

```
Transaction Details
├── Status: PENDING → COMPLETE
├── Amount: 1.5 USDC
├── To: 0x742d...f44e
├── Network: MATIC-AMOY
├── Transaction Hash: 0x...
├── Gas Fee: ~0.001 MATIC (or 0 if using Paymaster)
└── Timestamp
```

**Wait Time:**

- Transaction should complete in 15-30 seconds
- Status will auto-update via webhooks

---

### Step 7: View Transaction History

**Action:**

1. Return to Circle wallet dashboard
2. Scroll to **"Recent Transactions"** section
3. Or tap **"View All Transactions"**

**Expected Result:**

- ✅ Transaction list displayed
- ✅ Each transaction shows:
  - Type (Send/Receive)
  - Amount
  - Status badge (Pending/Complete/Failed)
  - Timestamp
  - Network icon

**Transaction Item Shows:**

```
📤 Send
1.5 USDC
To: 0x742d...f44e
Complete • 2 minutes ago
MATIC-AMOY
```

---

### Step 8: Test Cross-Chain Transfer (CCTP)

**Action:**

1. Tap **"Bridge"** button on dashboard
2. Fill in CCTP form:
   - **From Network**: MATIC-AMOY
   - **To Network**: ETH-SEPOLIA
   - **Amount**: `2.0`
   - **Destination Address**: Your address or different address
3. Tap **"Continue"**
4. Review details:
   - Source chain fees
   - Destination chain
   - Estimated time: 10-20 minutes
5. Tap **"Confirm Bridge"**

**Expected Result:**

- ✅ CCTP transfer initiated
- ✅ Burn transaction on source chain
- ✅ Attestation fetched from Circle
- ✅ Mint transaction on destination chain
- ✅ Status updates through each phase

**CCTP Phases:**

```
1. INITIATED    → Transaction submitted
2. PENDING      → Burning USDC on source
3. ATTESTED     → Circle attestation obtained
4. COMPLETE     → USDC minted on destination
```

**Wait Time:**

- Full CCTP transfer: 10-20 minutes
- Check status in "Bridge History" tab

---

### Step 9: Test Paymaster (Gas in USDC)

**Action:**

1. When sending USDC, look for **"Pay gas in USDC"** toggle
2. Enable the toggle
3. Proceed with send transaction

**Expected Result:**

- ✅ Gas fee shown in USDC (not MATIC)
- ✅ No native token balance required
- ✅ Transaction completes successfully
- ✅ Gas fee deducted from USDC balance

**Fee Display:**

```
Transaction Fee
Estimated: 0.05 USDC
(Paid with USDC via Paymaster)
```

**Note:** Paymaster is only available on supported networks:

- MATIC (Polygon)
- MATIC-AMOY (Polygon Testnet)
- ARB (Arbitrum)
- ARB-SEPOLIA (Arbitrum Testnet)

---

### Step 10: Test Blockchain Selector

**Action:**

1. If you have wallets on multiple chains
2. Tap network selector dropdown
3. Switch between chains

**Expected Result:**

- ✅ Available networks listed
- ✅ Current network highlighted
- ✅ Balance updates when switching
- ✅ Transaction history filtered by network

---

## Admin Dashboard Testing

### Admin Test Flow Overview

```
Login → View Wallets → View Transactions → Check Webhooks →
View Settings → Export Data
```

---

### Step 1: Login to Admin Dashboard

**Action:**

1. Open browser
2. Navigate to: `https://admin.raverpay.com/` (or your admin URL)
3. Login with admin credentials

**Expected Result:**

- ✅ Login successful
- ✅ Redirected to admin dashboard
- ✅ Sidebar menu visible

---

### Step 2: Navigate to Circle Wallets

**Action:**

1. In sidebar, find **"Circle USDC"** menu item
2. Click on it

**Expected Result:**

- ✅ Navigated to `/dashboard/circle-wallets`
- ✅ Wallet overview page displayed

**What You'll See:**

```
Circle Wallets Overview
├── Stats Cards
│   ├── Total Wallets
│   ├── Total USDC Value
│   ├── Active Users
│   └── Total Transactions
└── Wallets Table
    ├── User
    ├── Address
    ├── Network
    ├── Balance
    ├── Status
    └── Created At
```

---

### Step 3: View All Wallets

**Action:**

1. On Circle wallets page
2. Review the wallets table
3. Use filters:
   - Filter by blockchain
   - Filter by status (LIVE/PENDING)
   - Search by address or user

**Expected Result:**

- ✅ All Circle wallets displayed in table
- ✅ Pagination works (if >10 wallets)
- ✅ Filters apply correctly
- ✅ Search finds matching wallets

**Table Shows:**
| User | Address | Blockchain | Balance | Status | Created |
|------|---------|------------|---------|--------|---------|
| Ravestar O. | 0x6947...54f4 | MATIC-AMOY | 8.50 USDC | LIVE | Dec 18 |

**Actions Available:**

- Click row to view wallet details
- Click address to copy
- Click blockchain to filter
- Export to CSV

---

### Step 4: View Wallet Details

**Action:**

1. Click on any wallet row
2. View detailed wallet information

**Expected Result:**

- ✅ Modal or detail page opens
- ✅ Complete wallet information shown:
  - Full address
  - User information
  - Wallet set ID
  - Account type (SCA/EOA)
  - Creation date
  - Current balance
  - Transaction history for this wallet

---

### Step 5: View Transactions

**Action:**

1. In sidebar, click **"Circle USDC" → "Transactions"**
2. Navigate to `/dashboard/circle-wallets/transactions`

**Expected Result:**

- ✅ All Circle transactions displayed
- ✅ Transaction table loaded

**What You'll See:**

```
Circle Transactions
├── Stats
│   ├── Total Volume
│   ├── Total Transactions
│   ├── Success Rate
│   └── Average Transaction
└── Transactions Table
    ├── Transaction ID
    ├── User
    ├── Type (Send/Receive)
    ├── Amount
    ├── From/To Address
    ├── Status
    ├── Network
    └── Timestamp
```

**Table Shows:**
| ID | User | Type | Amount | From/To | Status | Network | Time |
|----|------|------|--------|---------|--------|---------|------|
| a1b2... | Ravestar | SEND | 1.5 USDC | 0x742d...f44e | COMPLETE | MATIC-AMOY | 5m ago |
| c3d4... | Ravestar | RECEIVE | 10 USDC | Faucet | COMPLETE | MATIC-AMOY | 1h ago |

---

### Step 6: Filter and Search Transactions

**Action:**

1. Use transaction filters:
   - **Status**: All, Pending, Complete, Failed
   - **Type**: All, Send, Receive
   - **Network**: All, or specific blockchain
   - **Date Range**: Last 24h, 7 days, 30 days, Custom
2. Use search box:
   - Search by transaction ID
   - Search by address
   - Search by user

**Expected Result:**

- ✅ Filters apply immediately
- ✅ Search results displayed
- ✅ URL updates with filter params
- ✅ Can combine multiple filters

---

### Step 7: View Transaction Details

**Action:**

1. Click on any transaction row
2. View detailed transaction modal

**Expected Result:**

- ✅ Modal opens with full details:
  ```
  Transaction Details
  ├── Transaction ID
  ├── Status with timeline
  ├── User information
  ├── Amount and currency
  ├── From address (full)
  ├── To address (full)
  ├── Network
  ├── Transaction hash (with explorer link)
  ├── Block number
  ├── Gas fee
  ├── Timestamps (created, updated, completed)
  └── Raw transaction data (collapsible)
  ```

**Actions Available:**

- Copy transaction ID
- View on block explorer (link)
- Copy addresses
- Export transaction data

---

### Step 8: View CCTP Transfers

**Action:**

1. In sidebar, click **"Circle USDC" → "CCTP Transfers"**
2. Navigate to `/dashboard/circle-wallets/cctp-transfers`

**Expected Result:**

- ✅ Cross-chain transfer list displayed
- ✅ CCTP-specific information shown

**Table Shows:**
| ID | User | Amount | From Chain | To Chain | Status | Attestation | Time |
|----|------|--------|------------|----------|--------|-------------|------|
| x1y2... | Ravestar | 2.0 USDC | MATIC-AMOY | ETH-SEPOLIA | COMPLETE | ✓ | 15m ago |

**Status Phases:**

- INITIATED
- PENDING (burning)
- ATTESTED (Circle attestation)
- COMPLETE (minted)
- FAILED

---

### Step 9: View Webhook Logs

**Action:**

1. In sidebar, click **"Circle USDC" → "Webhooks"**
2. Navigate to `/dashboard/circle-wallets/webhooks`

**Expected Result:**

- ✅ Webhook event log displayed
- ✅ Real-time webhook processing shown

**What You'll See:**

```
Webhook Events
├── Stats
│   ├── Total Events
│   ├── Success Rate
│   └── Last Event Time
└── Events Table
    ├── Event ID
    ├── Event Type
    ├── Subscription ID
    ├── Status (Processed/Failed)
    ├── Payload (collapsible)
    └── Timestamp
```

**Event Types:**

- `wallets.created`
- `wallets.updated`
- `transactions.created`
- `transactions.completed`
- `transactions.failed`

**Actions:**

- Click to view full payload
- Filter by event type
- Search by subscription ID

---

### Step 10: View Settings

**Action:**

1. In sidebar, click **"Circle USDC" → "Settings"**
2. Navigate to `/dashboard/circle-wallets/settings`

**Expected Result:**

- ✅ Settings page displayed
- ✅ Configuration information shown

**Tabs Available:**

**1. Overview Tab:**

- Environment (Testnet/Mainnet)
- Configuration status
- Default blockchain
- Default account type

**2. Credentials Tab:**

- API Key (masked)
- Entity Secret (masked)
- Environment variables
- Security warnings

**3. Networks Tab:**

- List of supported blockchains
- Default network highlighted
- Paymaster support indicators

**4. Paymaster Tab:**

- Networks with Paymaster support
- Configuration details

**Actions:**

- Test Connection button
- Refresh configuration
- View (but not edit) credentials

---

### Step 11: Export Data

**Action:**

1. On any list page (Wallets/Transactions)
2. Click **"Export"** button
3. Select format: CSV or JSON
4. Click **"Download"**

**Expected Result:**

- ✅ Export dialog appears
- ✅ File downloads with current filters applied
- ✅ CSV/JSON contains all visible data

**CSV Format:**

```csv
ID,User,Address,Blockchain,Balance,Status,Created
abc123,Ravestar,0x6947...,MATIC-AMOY,8.50,LIVE,2025-12-18
```

---

## Troubleshooting

### Mobile App Issues

#### Issue: Balance Not Updating

**Symptoms:**

- Funded wallet but balance shows 0
- Transactions complete but balance unchanged

**Solutions:**

1. **Pull to Refresh**
   - Swipe down on wallet screen to refresh
2. **Wait for Confirmation**
   - Blockchain confirmations take 30-60 seconds
   - Wait 2-3 minutes and refresh again

3. **Check Transaction Status**
   - View transaction on block explorer
   - Verify it's confirmed on-chain

4. **Restart App**
   - Close and reopen the app
   - Re-login if necessary

#### Issue: Send Transaction Fails

**Symptoms:**

- Transaction fails immediately
- "Insufficient balance" error
- "Invalid address" error

**Solutions:**

1. **Check Balance**
   - Ensure you have enough USDC
   - Account for gas fees (if not using Paymaster)

2. **Verify Address**
   - Ensure recipient address is valid
   - Check correct network (can't send MATIC-AMOY to mainnet)

3. **Check Network**
   - Verify you're on correct network
   - Some addresses only work on specific chains

4. **Try Lower Amount**
   - Leave small buffer for fees
   - Try sending 90% of balance instead of 100%

#### Issue: Transaction Stuck in Pending

**Symptoms:**

- Transaction shows "Pending" for >5 minutes
- No confirmation on blockchain

**Solutions:**

1. **Check Gas Price**
   - Network might be congested
   - Wait 10-15 minutes

2. **View on Explorer**
   - Check if transaction appears on block explorer
   - If not, it may not have been submitted

3. **Try Accelerate**
   - Use "Accelerate Transaction" button
   - Increases gas price to speed up

4. **Last Resort: Cancel**
   - Use "Cancel Transaction" button
   - Only works if transaction hasn't been mined

#### Issue: CCTP Transfer Taking Too Long

**Symptoms:**

- CCTP transfer stuck in "PENDING"
- No attestation received

**Solutions:**

1. **Wait**
   - CCTP transfers take 10-20 minutes normally
   - Can take up to 30 minutes on testnet

2. **Check Burn Transaction**
   - Verify burn transaction confirmed on source chain
   - If not confirmed, wait for blockchain confirmation

3. **Check Circle Status**
   - Visit Circle's status page: https://status.circle.com/
   - Verify attestation service is operational

4. **Contact Support**
   - If >1 hour, contact support with transfer ID

---

### Admin Dashboard Issues

#### Issue: Wallets Not Showing

**Symptoms:**

- Empty wallet table
- "No wallets found" message

**Solutions:**

1. **Check Filters**
   - Clear all filters
   - Reset to default view

2. **Verify Permissions**
   - Ensure admin account has SUPER_ADMIN, ADMIN, or SUPPORT role
   - Re-login if permissions changed

3. **Refresh Page**
   - Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
   - Clear browser cache

#### Issue: Webhook Events Not Appearing

**Symptoms:**

- Webhook log is empty
- Events not being received

**Solutions:**

1. **Verify Webhook Configuration**
   - Check webhook URL is correct in Circle Console
   - Verify webhook secret matches .env file

2. **Test Webhook**
   - In Circle Console, send test webhook
   - Should appear in logs within seconds

3. **Check Backend Logs**
   - View API server logs
   - Look for webhook processing errors

4. **Verify Signature**
   - Ensure CIRCLE_WEBHOOK_SECRET is set
   - Signature verification must match Circle's public key

#### Issue: Settings Page Shows "Not Configured"

**Symptoms:**

- isConfigured: false
- Credentials not loading

**Solutions:**

1. **Check Environment Variables**

   ```bash
   # In backend .env file
   CIRCLE_API_KEY=TEST_API_KEY:...
   CIRCLE_ENTITY_SECRET=...
   CIRCLE_API_BASE_URL=https://api.circle.com/v1/w3s
   ```

2. **Restart Backend**
   - Restart API server to load new environment
   - Clear any cached config

3. **Test Connection**
   - Click "Test Connection" button
   - Should return success if credentials valid

---

### Network/API Issues

#### Issue: "Network Error" or "API Unavailable"

**Symptoms:**

- Can't connect to backend
- All requests fail
- Timeout errors

**Solutions:**

1. **Check Backend Status**
   - Verify API server is running
   - Check server logs for errors

2. **Verify API URL**
   - Mobile: Check `API_BASE_URL` in config
   - Admin: Check endpoint URLs

3. **Test Endpoint**

   ```bash
   curl https://your-api-url.com/api/health
   ```

4. **Check Network**
   - Verify internet connection
   - Try different network/WiFi

#### Issue: Circle API Errors

**Symptoms:**

- "Circle API Error" messages
- 400/401/500 status codes from Circle

**Solutions:**

1. **Verify API Key**
   - Check API key is correct and active
   - Test with Circle's API explorer

2. **Check Rate Limits**
   - Circle has rate limits
   - Wait and retry

3. **Verify Environment**
   - Ensure using correct environment (testnet/mainnet)
   - Check API base URL matches environment

4. **Check Circle Status**
   - Visit: https://status.circle.com/
   - Look for service outages

---

## Success Criteria Checklist

### ✅ Mobile App Testing Complete

- [ ] Login successful
- [ ] Circle wallet visible on home screen
- [ ] Wallet created/loaded successfully
- [ ] Balance displays correctly
- [ ] Can copy wallet address
- [ ] Receive screen shows QR code
- [ ] Funded wallet with testnet USDC
- [ ] Balance updated after funding
- [ ] Send transaction successful
- [ ] Transaction appears in history
- [ ] Transaction status updates
- [ ] Can view transaction details
- [ ] CCTP transfer initiated (optional)
- [ ] CCTP completed successfully (optional)
- [ ] Paymaster works on supported chains (optional)

### ✅ Admin Dashboard Testing Complete

- [ ] Login to admin successful
- [ ] Can navigate to Circle section
- [ ] Wallets table loads
- [ ] Can view all wallets
- [ ] Filters work correctly
- [ ] Search finds wallets
- [ ] Can view wallet details
- [ ] Transactions table loads
- [ ] Can filter transactions
- [ ] Can view transaction details
- [ ] CCTP transfers visible
- [ ] Webhook logs showing events
- [ ] Settings page loads
- [ ] Configuration displays correctly
- [ ] Test connection works
- [ ] Can export data

---

## Test Data Summary

### Test User

```
Email: codeswithjoseph@gmail.com
Password: 6thbornR%
User ID: 2494cdd0-9169-41ea-814b-e6f0b882329c
```

### Test Wallet

```
Address: 0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4
Wallet ID: 70e824e7-b8aa-5964-886f-b8da5625555d
Network: MATIC-AMOY
Account Type: SCA
```

### Test Recipient (for transfers)

```
Address: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
(Example testnet address)
```

### Useful Links

- Circle Faucet: https://faucet.circle.com/
- Polygon Amoy Explorer: https://amoy.polygonscan.com/
- Circle Console: https://console.circle.com/
- Circle Status: https://status.circle.com/

---

## Next Steps After Testing

Once all tests pass:

1. **Document Results**
   - Take screenshots of successful tests
   - Note any issues encountered
   - Record performance metrics

2. **User Acceptance Testing**
   - Have real users test the flow
   - Gather feedback on UX

3. **Performance Testing**
   - Test with multiple concurrent users
   - Measure response times
   - Check webhook processing speed

4. **Security Review**
   - Audit entity secret handling
   - Review API endpoint security
   - Test rate limiting

5. **Prepare for Production**
   - Create production Circle account
   - Generate production entity secret
   - Update webhook URLs
   - Configure mainnet environment
   - Deploy to production

---

**Testing Guide Version**: 1.0  
**Last Updated**: December 18, 2025  
**Status**: Ready for Testing ✅
