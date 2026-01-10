# Phase 3: Detailed Tasks

## Prerequisites

- [ ] Phase 1 (Renaming) complete
- [ ] Phase 2 (Theme colors) complete - especially color constants
- [ ] expo-linear-gradient installed

---

## Part A: Dependencies & Setup

### A.1 Install Required Packages

- [ ] Verify `expo-linear-gradient` is installed
- [ ] Verify `expo-clipboard` is installed
- [ ] Verify `expo-haptics` is installed

### A.2 Import Updates

Add to home screen imports:

```typescript
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
```

---

## Part B: Header Section Redesign

### B.1 Header Container

File: `app/(tabs)/index.tsx`

- [ ] Replace purple background with LinearGradient
- [ ] Colors: `['#8B1C1C', '#C41E3A']`
- [ ] Remove rounded bottom corners
- [ ] Increase height to accommodate new layout

### B.2 Header Top Row

- [ ] Left side: "Welcome back," + User name (white text)
- [ ] Right side: Icon row
  - [ ] Gift icon (optional, for cashback)
  - [ ] Notification icon with badge
  - [ ] Profile picture (circular, bordered)

### B.3 Balance Card (Inside Header)

- [ ] Background: `rgba(255,255,255,0.15)` with `backdrop-blur-md`
- [ ] Border: `1px rgba(255,255,255,0.2)`
- [ ] Border radius: 24px
- [ ] Padding: 20px

### B.4 Balance Display

- [ ] "Total Balance" label (white/70%)
- [ ] Balance amount (white, bold, large)
- [ ] Eye icon toggle (white, in circular container)
- [ ] Connect to existing `isBalanceVisible` state

### B.5 Mosaic Code Section

- [ ] Dark container inside balance card
- [ ] Hand icon + "Mosaic Code: XXX - XXXX - XXXX"
- [ ] Copy icon button
- [ ] Implement copy to clipboard with haptic feedback

### B.6 Action Buttons

- [ ] Two white buttons side by side
- [ ] "Add Money" with + icon
- [ ] "Send Money" with paper plane icon
- [ ] Text: Red (#C41E3A)
- [ ] Navigate to respective screens

### B.7 Wave Pattern (Optional)

- [ ] Create SVG component with curved lines
- [ ] Darker red (#8B1C1C)
- [ ] Opacity: 10-20%
- [ ] Position: Background overlay

---

## Part C: Utilities & Services Section

### C.1 Section Header

- [ ] Title: "Utilities & Services" (white, bold)
- [ ] Position: 24px below header

### C.2 Service Cards Grid

- [ ] 2-column layout with flex-wrap
- [ ] 48% width per card
- [ ] 16px gap between cards

### C.3 Individual Service Cards

Create 5 cards:

1. [ ] Airtime Top-Up (phone-portrait-outline)
2. [ ] Data Bundle (wifi)
3. [ ] Electricity Bill (flash-outline)
4. [ ] TV Subscription (tv-outline)
5. [ ] Water/Utility Bill (water-outline)

Card styling:

- [ ] Background: #2A2A2A
- [ ] Border radius: 16px
- [ ] Padding: 16px
- [ ] Icon container: 48x48px, #3A3A3A background
- [ ] Arrow button: 32x32px circle, right side

### C.4 Navigation

- [ ] Each card navigates to respective screen
- [ ] Add haptic feedback on press

---

## Part D: Recent Transactions Section

### D.1 Section Header

- [ ] "Recent Transactions" title (white, bold)
- [ ] "See All" link (red, right side)
- [ ] Navigate to transactions list

### D.2 Transaction Item Redesign

File: `src/components/wallet/TransactionItem.tsx`

- [ ] Background: #2A2A2A
- [ ] Border radius: 16px
- [ ] Padding: 16px
- [ ] Margin bottom: 12px

### D.3 Transaction Item Layout

- [ ] Left: Icon circle (48x48px)
  - Outgoing: Blue (#1E3A8A)
  - Incoming: Green (#059669)
  - Arrow icon rotated appropriately
- [ ] Center: Description + relative time
- [ ] Right: Amount with + or - prefix

### D.4 Amount Styling

- [ ] Credit: Green (#10B981), prefix "+"
- [ ] Debit: Red (#EF4444), prefix "-"

---

## Part E: Bottom Navigation Update

### E.1 Tab Bar Styling

File: `app/(tabs)/_layout.tsx`

- [ ] Background: #1A1A1A
- [ ] Active tint: #FFFFFF (white)
- [ ] Inactive tint: #6B7280 (gray)
- [ ] Border top: 1px #333333
- [ ] Height: 70px

### E.2 Tab Icons

- [ ] Home: home / home-outline
- [ ] Wallet: wallet / wallet-outline
- [ ] Rewards: gift / gift-outline
- [ ] Profile: person / person-outline

### E.3 Icon States

- [ ] Focused: Filled icon, white color
- [ ] Unfocused: Outline icon, gray color

---

## Part F: Remove/Comment Old Elements

### F.1 Elements to Remove

- [ ] Purple background and styling
- [ ] Separate balance card component (if any)
- [ ] Old quick action layout
- [ ] Wallet locked warning banner (move to modal)
- [ ] USDC wallet card (move to wallet tab)
- [ ] Deposit limit indicator (move to settings)

### F.2 Comment Pattern

```typescript
// OLD_RAVERPAY: [description of removed element]
// [commented out code]
```

---

## Part G: Additional Features

### G.1 Pull-to-Refresh

- [ ] Keep/add pull-to-refresh functionality
- [ ] Update styling for dark theme

### G.2 Loading States

- [ ] Update skeleton loaders for dark theme
- [ ] Skeleton background: #2A2A2A
- [ ] Skeleton highlight: #3A3A3A

### G.3 Error States

- [ ] Update error message styling
- [ ] Dark theme friendly colors

### G.4 Empty States

- [ ] Update empty transaction state
- [ ] Dark theme friendly

---

## Part H: Testing

### H.1 Visual Testing

- [ ] Red gradient displays correctly
- [ ] Balance card styling correct
- [ ] Action buttons work
- [ ] Utilities grid layout correct
- [ ] Transactions display correctly
- [ ] Tab bar styled correctly

### H.2 Functional Testing

- [ ] Balance visibility toggle works
- [ ] Copy account number works
- [ ] Haptic feedback works
- [ ] Navigation works for all buttons
- [ ] Pull-to-refresh works
- [ ] Transaction click navigates

### H.3 Platform Testing

- [ ] Test on iOS
- [ ] Test on Android
- [ ] Check StatusBar styling

---

## Notes for AI Agents

1. **Test gradient first**: Before doing full redesign, test LinearGradient works
2. **Keep scroll behavior**: Maintain ScrollView/FlatList functionality
3. **Preserve data fetching**: Don't modify API calls, only UI
4. **Check existing components**: Reuse existing Card, Text, Button where possible
5. **Preserve navigation**: Keep route names consistent
