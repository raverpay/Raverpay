# Circle USDC Wallet - Mobile Navigation Guide

## 📱 How to Access Circle Wallet

The Circle USDC wallet is **NOT a tab** in the bottom navigation. Instead, it's accessible from the **home screen** in two prominent ways.

---

## 🎯 Navigation Methods

### Method 1: USDC Wallet Card (Recommended)

**Location:** Home screen, scroll down below main wallet balance

**What it looks like:**

```
┌──────────────────────────────────┐
│  💵  USDC Wallet              → │  ← Blue gradient card
│      Send & Receive Stablecoins  │
│  ──────────────────────────────  │
│  ✓ Multi-chain                   │
│  ✓ Cross-chain Bridge            │
│  ✓ Low Fees                      │
└──────────────────────────────────┘
```

**Features:**

- **Large, prominent card** with blue gradient (from #2775CA to #1E5A99)
- Dollar sign ($) icon
- Clear title: "USDC Wallet"
- Subtitle: "Send & Receive Stablecoins"
- Three feature badges
- Right arrow indicating it's tappable

**User Action:**

1. Open app → Home screen
2. Scroll down past main wallet balance
3. Tap the **blue USDC Wallet card**
4. Opens Circle wallet dashboard

---

### Method 2: Quick Action Button

**Location:** Home screen, in the "Quick Actions" row

**What it looks like:**

```
Quick Actions:
┌──────┐ ┌──────┐ ┌──────┐
│ USDC │ │Airtime│ │ Data │  ← Row of buttons
└──────┘ └──────┘ └──────┘
   ↑
  Tap here
```

**Features:**

- Blue button with "logo-usd" icon
- Label: "USDC"
- Same blue color (#2775CA) as the card
- Part of quick action buttons row

**User Action:**

1. Open app → Home screen
2. Look for Quick Actions row
3. Tap the **"USDC"** button (blue)
4. Opens Circle wallet dashboard

---

## 🗺️ Full Navigation Map

```
App Navigation Structure
├── (tabs)/                      ← Bottom tab bar
│   ├── index (Home)            ← Contains USDC navigation
│   ├── wallet
│   ├── crypto
│   ├── vtu
│   └── profile
│
└── circle/                      ← Accessed from Home
    ├── index                   ← Dashboard (Main screen)
    ├── setup                   ← Create new wallet
    ├── send                    ← Send USDC
    ├── receive                 ← Receive USDC (QR code)
    ├── bridge                  ← Cross-chain transfer (CCTP)
    ├── transactions            ← Transaction history
    └── transaction-details     ← Individual transaction
```

---

## 📍 Step-by-Step: First Time User

### Scenario: User wants to access USDC wallet

1. **Open RaverPay App**
   - User opens app and logs in

2. **Home Screen Loads**

   ```
   ┌────────────────────────────┐
   │ Good Morning, User         │
   │ ₦50,000.00                │ ← Main balance
   │ [Eye icon to toggle]       │
   ├────────────────────────────┤
   │ [Cashback card]            │
   ├────────────────────────────┤
   │ 💵 USDC Wallet          → │ ← USER SEES THIS
   │    Send & Receive...       │
   │    ✓ Multi-chain           │
   └────────────────────────────┘
   ```

3. **User Taps USDC Wallet Card**
   - Card has visual feedback (press state)
   - Navigates with slide animation

4. **Circle Dashboard Opens**

   ```
   ┌────────────────────────────┐
   │ ← Back    Circle Wallet    │
   ├────────────────────────────┤
   │ Wallet Card                │
   │ Address: 0x6947...54f4     │
   │ Balance: 10.00 USDC        │
   │ Network: MATIC-AMOY        │
   ├────────────────────────────┤
   │ [Send] [Receive] [Bridge]  │
   ├────────────────────────────┤
   │ Recent Transactions        │
   │ [Transaction list...]      │
   └────────────────────────────┘
   ```

5. **From Dashboard, User Can:**
   - View wallet balance
   - Tap "Send" → Send USDC screen
   - Tap "Receive" → QR code screen
   - Tap "Bridge" → Cross-chain transfer
   - Tap "View All" → Full transaction history
   - Tap transaction → Transaction details

---

## 🎨 Visual Design Details

### USDC Wallet Card Styling

```typescript
// Location: apps/raverpaymobile/app/(tabs)/index.tsx
// Line: 351-394

<TouchableOpacity onPress={() => router.push('/circle')}>
  <Card
    variant="elevated"
    className="bg-gradient-to-r from-[#2775CA] to-[#1E5A99]"
  >
    {/* Card content */}
  </Card>
</TouchableOpacity>
```

**Design Specs:**

- **Background:** Gradient from #2775CA (blue) to #1E5A99 (darker blue)
- **Icon:** White circle with "$" symbol
- **Text Colors:**
  - Title: white/80% opacity
  - Subtitle: white, bold
  - Features: white/80% with green checkmarks (#10B981)
- **Border:** White/20% opacity between sections
- **Elevation:** Card shadow for depth

### Quick Action Button Styling

```typescript
// Location: apps/raverpaymobile/app/(tabs)/index.tsx
// Line: 399-404

<QuickActionCard
  icon="logo-usd"
  title="USDC"
  color="#2775CA"
  onPress={() => router.push('/circle')}
/>
```

**Design Specs:**

- **Icon:** Ionicons "logo-usd"
- **Background:** #2775CA (blue)
- **Size:** Consistent with other quick action buttons
- **Label:** "USDC"

---

## 🧪 Testing the Navigation

### Test Case 1: USDC Wallet Card

**Steps:**

1. Login to app
2. Verify home screen loaded
3. Scroll down to find USDC Wallet card
4. Verify card is visible with:
   - Blue gradient background
   - "$" icon
   - "USDC Wallet" title
   - "Send & Receive Stablecoins" subtitle
   - Three feature badges
   - Right arrow icon
5. Tap the card
6. Verify navigation to Circle dashboard
7. Verify slide animation

**Expected Result:** ✅ Successfully navigates to `/circle`

---

### Test Case 2: Quick Action Button

**Steps:**

1. Login to app
2. Verify home screen loaded
3. Locate "Quick Actions" section
4. Find "USDC" button (blue, with $ icon)
5. Tap the button
6. Verify navigation to Circle dashboard

**Expected Result:** ✅ Successfully navigates to `/circle`

---

### Test Case 3: Back Navigation

**Steps:**

1. Access Circle wallet (either method)
2. Now on Circle dashboard
3. Tap back button (top left)
4. Verify returns to home screen

**Expected Result:** ✅ Returns to home screen, maintaining scroll position

---

### Test Case 4: Deep Navigation

**Steps:**

1. Access Circle wallet
2. From dashboard, tap "Send"
3. Verify on Send screen
4. Tap back → Returns to dashboard
5. Tap back again → Returns to home

**Expected Result:** ✅ Navigation stack works correctly

---

## 🐛 Troubleshooting

### Issue: "Can't find USDC Wallet card"

**Solution:**

- Scroll down on home screen
- Card appears AFTER main wallet balance
- May need to scroll past other cards

### Issue: "USDC button not in Quick Actions"

**Solution:**

- Quick Actions row is near top of home screen
- USDC should be the FIRST button (blue)
- Refresh app if not visible

### Issue: "Tapping card does nothing"

**Possible Causes:**

1. Navigation not set up correctly
2. Route `/circle` not found
3. JavaScript error

**Debug Steps:**

```bash
# Check route exists
ls apps/raverpaymobile/app/circle/

# Expected files:
# _layout.tsx
# index.tsx
# send.tsx
# receive.tsx
# bridge.tsx
# transactions.tsx
# transaction-details.tsx

# Check for errors in console
# Run app in development mode and check logs
```

### Issue: "Circle dashboard is blank"

**Solution:**

- Check if wallet exists in database
- Verify API connection
- Check Circle API credentials
- View console logs for errors

---

## 📝 Code References

### Home Screen Navigation (Method 1)

**File:** `apps/raverpaymobile/app/(tabs)/index.tsx`

```typescript:351:403:apps/raverpaymobile/app/(tabs)/index.tsx
{/* USDC Wallet Card */}
<TouchableOpacity className="mt-6" onPress={() => router.push('/circle')}>
  <Card variant="elevated" className="bg-gradient-to-r from-[#2775CA] to-[#1E5A99] p-4">
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-3">
          <Text variant="h4" className="text-white font-bold">
            $
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="bodyMedium" className="text-white/80">
            USDC Wallet
          </Text>
          <Text variant="h5" className="text-white font-bold">
            Send & Receive Stablecoins
          </Text>
        </View>
      </View>
      <View className="bg-white/20 rounded-full p-2">
        <Ionicons name="chevron-forward" size={20} color="white" />
      </View>
    </View>
    {/* Features */}
  </Card>
</TouchableOpacity>

{/* Quick Actions */}
<QuickActionCard
  icon="logo-usd"
  title="USDC"
  color="#2775CA"
  onPress={() => router.push('/circle')}
/>
```

### Circle Layout Configuration

**File:** `apps/raverpaymobile/app/circle/_layout.tsx`

```typescript:1:22:apps/raverpaymobile/app/circle/_layout.tsx
import { Stack } from 'expo-router';

export default function CircleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="send" />
      <Stack.Screen name="receive" />
      <Stack.Screen name="bridge" />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="transaction-details" />
    </Stack>
  );
}
```

---

## ✅ Navigation Checklist

- [x] USDC Wallet card present on home screen
- [x] Card has correct styling (blue gradient)
- [x] Card has correct text and icons
- [x] Card navigates to `/circle` on tap
- [x] Quick Action button present
- [x] Button has correct icon and color
- [x] Button navigates to `/circle` on tap
- [x] Circle route exists at `app/circle/`
- [x] All 7 Circle screens created
- [x] Layout configured with Stack navigation
- [x] Back navigation works correctly
- [x] Animations configured (slide_from_right)

---

## 🎯 Summary

**Circle Wallet Access:**

- ❌ NOT in bottom tab bar
- ✅ Accessible from **Home screen** (2 ways)
- ✅ Prominent blue card (primary method)
- ✅ Quick action button (secondary method)
- ✅ Both navigate to `/circle` route

**Why Not a Tab?**

- Circle wallet is a specialized feature
- Not primary navigation like Home, Wallet, Profile
- Similar to other features accessed from Home (VTU, Gift Cards, etc.)
- Keeps bottom navigation clean and focused

**User Experience:**

- Easy to discover (large card on home screen)
- Quick access (one tap from home)
- Consistent with app's navigation pattern
- Feature highlighted as special/premium

---

**Created:** December 18, 2025  
**Status:** ✅ Navigation Verified  
**Routes:** All working correctly
