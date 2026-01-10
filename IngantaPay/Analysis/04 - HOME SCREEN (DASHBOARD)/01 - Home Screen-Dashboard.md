IMAGE: Home Screen / Dashboard
Corresponding Screen: app/(tabs)/index.tsx
MOBILE APP PROMPT:

Update the current home screen in app/(tabs)/index.tsx to match the new Inganta Pay design with these major changes:

CRITICAL DESIGN OVERHAUL:

1. HEADER SECTION - COMPLETE REDESIGN:

Current: Purple background with greeting and balance card
New: Deep red gradient background with integrated balance display

Changes Required:

- Background: Change from purple (#5B55F6) to deep red gradient
  - Top color: #8B1C1C or #991B1B
  - Bottom color: #C41E3A or #DC2626
  - Add wave pattern overlay (subtle curved lines in darker red)
- Remove rounded bottom corners (make it rectangular with card inside having rounded corners)
- Height: Increase to accommodate new layout (~320px)

Header Content Layout:

```typescript
<View className="bg-gradient-to-b from-[#8B1C1C] to-[#C41E3A] pt-12 pb-6 px-5">
  {/* Top Row: Greeting + Icons */}
  <View className="flex-row items-center justify-between mb-4">
    <View>
      <Text variant="caption" className="text-white/80">Welcome back,</Text>
      <Text variant="h3" className="text-white">John Kingsley</Text>
    </View>

    <View className="flex-row items-center gap-3">
      {/* Cashback/Gift Icon (optional, only if user has cashback) */}
      <TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
        <Ionicons name="gift-outline" size={20} color="white" />
        {/* Small green indicator dot if rewards available */}
      </TouchableOpacity>

      {/* Notifications Icon */}
      <TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
        <Ionicons name="notifications-outline" size={20} color="white" />
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center">
            <Text className="text-white text-xs">{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Profile Picture */}
      <TouchableOpacity className="w-10 h-10 rounded-full border-2 border-white/30">
        <Image
          source={user?.profilePicture || require('@/assets/default-avatar.png')}
          className="w-full h-full rounded-full"
        />
      </TouchableOpacity>
    </View>
  </View>

  {/* Balance Card - INTEGRATED INTO HEADER */}
  <Card className="bg-white/15 backdrop-blur-md rounded-3xl p-5 border border-white/20">
    {/* Balance Display */}
    <View className="items-center mb-4">
      <Text variant="caption" className="text-white/70 mb-1">Total Balance</Text>

      <View className="flex-row items-center">
        <Text variant="display" className="text-white font-bold">
          {isBalanceVisible ? formatCurrency(balance) : "****"}
        </Text>
        <TouchableOpacity onPress={toggleBalanceVisibility} className="ml-3">
          <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <Ionicons
              name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="white"
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>

    {/* Account Number Section */}
    <View className="flex-row items-center justify-center bg-white/10 rounded-2xl py-2 px-4 mb-4">
      <Ionicons name="hand-left-outline" size={16} color="white" className="mr-2" />
      <Text variant="caption" className="text-white/90 mr-2">
        Mosaic Code: 705 - 5745 - 3411
      </Text>
      <TouchableOpacity onPress={() => copyToClipboard(accountNumber)}>
        <Ionicons name="copy-outline" size={16} color="white" />
      </TouchableOpacity>
    </View>

    {/* Action Buttons */}
    <View className="flex-row gap-3">
      <TouchableOpacity
        className="flex-1 bg-white rounded-2xl py-3 flex-row items-center justify-center"
        onPress={() => router.push("/fund-wallet")}
      >
        <Ionicons name="add-circle-outline" size={20} color="#C41E3A" />
        <Text variant="bodyMedium" weight="semibold" className="text-[#C41E3A] ml-2">
          Add Money
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-1 bg-white rounded-2xl py-3 flex-row items-center justify-center"
        onPress={() => router.push("/withdraw")}
      >
        <Ionicons name="paper-plane-outline" size={20} color="#C41E3A" />
        <Text variant="bodyMedium" weight="semibold" className="text-[#C41E3A] ml-2">
          Send Money
        </Text>
      </TouchableOpacity>
    </View>
  </Card>
</View>
```

2. UTILITIES & SERVICES SECTION - REDESIGN:

Current: 6 cards in flex-wrap grid
New: 5 cards in 2-column grid with proper styling

Changes:

- Section title: "Utilities & Services" (white text, bold, size 18px)
- Position: 24px below header
- Background: Keep dark (current bg is fine)

Card Design Changes:

```typescript
<View className="px-5 mt-6">
  <Text variant="h4" weight="bold" className="mb-4">Utilities & Services</Text>

  <View className="flex-row flex-wrap gap-4">
    {/* Each card: 48% width to create 2-column layout */}
    <TouchableOpacity
      className="w-[48%] bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center justify-between"
      onPress={() => router.push("/buy-airtime")}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 rounded-2xl bg-[#3A3A3A] items-center justify-center mr-3">
          <Ionicons name="phone-portrait-outline" size={24} color="white" />
        </View>
        <Text variant="bodyMedium" className="text-white">Airtime Top-Up</Text>
      </View>
      <View className="w-8 h-8 rounded-full bg-[#3A3A3A] items-center justify-center">
        <Ionicons name="arrow-forward" size={16} color="white" />
      </View>
    </TouchableOpacity>

    <TouchableOpacity
      className="w-[48%] bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center justify-between"
      onPress={() => router.push("/buy-data")}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 rounded-2xl bg-[#3A3A3A] items-center justify-center mr-3">
          <Ionicons name="wifi" size={24} color="white" />
        </View>
        <Text variant="bodyMedium" className="text-white">Data Bundle</Text>
      </View>
      <View className="w-8 h-8 rounded-full bg-[#3A3A3A] items-center justify-center">
        <Ionicons name="arrow-forward" size={16} color="white" />
      </View>
    </TouchableOpacity>

    {/* Repeat for Electricity Bill, TV Subscription, Water/Utility Bill */}
    {/* Use icons: flash-outline, tv-outline, water-outline */}
  </View>
</View>
```

Service Cards Specifications:

- Width: 48% (2 columns with gap)
- Background: Dark gray (#2A2A2A)
- Border radius: 16px
- Padding: 16px
- Layout: Icon (left) + Text (center) + Arrow (right)
- Icon container: 48x48px, rounded-2xl, darker gray background
- Arrow button: 32x32px circle, darker gray, top-right corner

Service List:

1. Airtime Top-Up (phone icon)
2. Data Bundle (wifi icon)
3. Electricity Bill (lightning icon)
4. TV Subscription (TV icon)
5. Water/Utility Bill (water drop icon)

6. RECENT TRANSACTIONS SECTION - REDESIGN:

Current: White card with list
New: Dark cards with improved visual hierarchy

Changes:

```typescript
<View className="px-5 mt-6 mb-8">
  <View className="flex-row items-center justify-between mb-4">
    <Text variant="h4" weight="bold">Recent Transactions</Text>
    <TouchableOpacity onPress={() => router.push("/transactions")}>
      <Text variant="bodyMedium" className="text-[#C41E3A]">See All</Text>
    </TouchableOpacity>
  </View>

  {/* Transaction Items - Dark Theme */}
  <View className="space-y-3">
    {recentTransactions.map((transaction) => (
      <TouchableOpacity
        key={transaction.id}
        className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center"
        onPress={() => router.push(`/transaction-details/${transaction.id}`)}
      >
        {/* Icon Circle - Left */}
        <View className="w-12 h-12 rounded-full bg-[#1E3A8A] items-center justify-center mr-4">
          <Ionicons
            name="arrow-forward"
            size={20}
            color="white"
            style={{ transform: [{ rotate: '-45deg' }] }}
          />
        </View>

        {/* Transaction Info - Center */}
        <View className="flex-1">
          <Text variant="bodyMedium" weight="semibold" className="text-white">
            {transaction.description}
          </Text>
          <Text variant="caption" className="text-gray-400 mt-1">
            {formatRelativeTime(transaction.createdAt)}
          </Text>
        </View>

        {/* Amount - Right */}
        <Text
          variant="bodyMedium"
          weight="bold"
          className={transaction.type === 'CREDIT' ? 'text-green-500' : 'text-red-500'}
        >
          {transaction.type === 'CREDIT' ? '+' : '-'}₦ {formatCurrency(transaction.amount)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>
```

Transaction Item Specifications:

- Background: Dark gray (#2A2A2A)
- Border radius: 16px
- Padding: 16px
- Icon: Blue circle (for outgoing), green circle (for incoming)
- Icon should show directional arrow rotated appropriately
- Amount: Green for credit (+), Red for debit (-)
- Spacing: 12px between items

4. BOTTOM NAVIGATION BAR - UPDATE:

Current: Standard tab bar
New: Dark theme with updated styling

```typescript
// In app/(tabs)/_layout.tsx
<Tabs
  screenOptions={{
    tabBarActiveTintColor: '#C41E3A', // Red accent
    tabBarInactiveTintColor: '#6B7280', // Gray
    tabBarStyle: {
      backgroundColor: '#1A1A1A', // Dark background
      borderTopWidth: 0,
      elevation: 0,
      height: 70,
      paddingBottom: 10,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600',
    },
  }}
>
  <Tabs.Screen
    name="index"
    options={{
      title: 'Home',
      tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
    }}
  />
  <Tabs.Screen
    name="wallet"
    options={{
      title: 'Wallet',
      tabBarIcon: ({ color }) => <Ionicons name="wallet" size={24} color={color} />,
    }}
  />
  <Tabs.Screen
    name="rewards"
    options={{
      title: 'Rewards',
      tabBarIcon: ({ color }) => <Ionicons name="gift" size={24} color={color} />,
    }}
  />
  <Tabs.Screen
    name="profile"
    options={{
      title: 'Profile',
      tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
    }}
  />
</Tabs>
```

5. REMOVE COMPLETELY:

From current design:

- Purple header background
- Separate balance card (integrate into header)
- Rounded bottom corners on header
- 6-card grid layout for quick actions
- Light theme balance card
- Wallet locked warning banner (move to modal/bottom sheet instead)
- Deposit limit indicator (show in settings or on fund-wallet screen)
- USDC wallet card (remove or move to separate tab)

6. NEW FEATURES TO ADD:

Add Mosaic Code/Account Number:

- Display virtual account number in header
- Format: XXX - XXXX - XXXX
- Add copy button
- Show hand icon to indicate palm payment system

Add Wave Pattern:

- Create subtle wave/curve pattern overlay on red gradient header
- Use darker red (#8B1C1C) for wave lines
- Multiple curved concentric circles emanating from bottom-right
- Opacity: 10-20%

Profile Picture:

- Add to top-right header
- Circular with white border
- 40x40px size
- Clickable to navigate to profile

7. COLOR PALETTE UPDATES:

Replace ALL instances of:

- Purple (#5B55F6) → Red (#C41E3A)
- Light backgrounds → Dark backgrounds (#1A1A1A, #2A2A2A)
- White cards → Dark gray cards (#2A2A2A)
- Light text → White text where appropriate

New Color Variables:

```typescript
const colors = {
  primary: '#C41E3A', // Red
  primaryDark: '#991B1B',
  primaryLight: '#DC2626',
  background: '#0A0A0A', // Pure black
  cardBackground: '#2A2A2A', // Dark gray
  cardBackgroundLight: '#3A3A3A',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};
```

8. GRADIENT IMPLEMENTATION:

Install gradient library if not already:

```bash
expo install expo-linear-gradient
```

Use in header:

```typescript
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['#8B1C1C', '#C41E3A']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  className="pt-12 pb-6 px-5"
>
  {/* Header content */}
</LinearGradient>
```

9. SPACING & LAYOUT:

Update spacing throughout:

- Header top padding: 48px (safe area)
- Section spacing: 24px between major sections
- Card padding: 20px internally
- Horizontal padding: 20px on screen edges
- Gap between utility cards: 16px

10. LOADING STATES:

Update skeleton loaders to match dark theme:

```typescript
<Skeleton
  width={200}
  height={48}
  style={{ backgroundColor: '#2A2A2A' }}
  highlightColor="#3A3A3A"
/>
```

11. GESTURES & INTERACTIONS:

Add haptic feedback:

```typescript
import * as Haptics from 'expo-haptics';

const handlePress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  router.push('/path');
};
```

12. PERFORMANCE OPTIMIZATIONS:

- Memoize transaction items
- Use FlatList for transactions if list grows
- Lazy load utility icons
- Optimize gradient rendering

13. ACCESSIBILITY:

- Add accessibilityLabel to all touchable elements
- Ensure contrast ratios meet WCAG standards
- Add accessibilityHint for complex interactions
- Support dynamic text sizing

TECHNICAL IMPLEMENTATION NOTES:

1. Update imports:

```typescript
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
```

2. Add copy functionality:

```typescript
const copyToClipboard = async (text: string) => {
  await Clipboard.setStringAsync(text);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  toast.success({ title: 'Copied', message: 'Account number copied to clipboard' });
};
```

3. Add wave pattern (optional - SVG):

```typescript
import Svg, { Path } from 'react-native-svg';

const WavePattern = () => (
  <Svg
    height="100%"
    width="100%"
    style={{ position: 'absolute', opacity: 0.1 }}
  >
    <Path
      d="M0,50 Q100,20 200,50 T400,50"
      stroke="#8B1C1C"
      strokeWidth="2"
      fill="none"
    />
    {/* Add more wave paths */}
  </Svg>
);
```

TESTING CHECKLIST:

- [ ] Red gradient renders correctly
- [ ] Balance visibility toggle works
- [ ] Account number copy works
- [ ] All navigation works
- [ ] Locked wallet flow works
- [ ] Refresh pull-to-refresh works
- [ ] Dark theme consistent throughout
- [ ] Transactions display correctly
- [ ] Icons load properly
- [ ] Profile picture displays
- [ ] Notifications badge shows count
- [ ] Loading states work
- [ ] Error states handled
