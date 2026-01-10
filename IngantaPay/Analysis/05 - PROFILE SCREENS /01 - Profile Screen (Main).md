IMAGE 1: Profile/Account Screen (Main)
Corresponding Screen: app/(tabs)/profile.tsx
MOBILE APP PROMPT:

Update the current profile screen in app/(tabs)/profile.tsx to match the new Inganta Pay design with these requirements:

CRITICAL DESIGN OVERHAUL:

1. BACKGROUND & THEME:
   - Change from light background (bg-gray-50/gray-900) to pure black (#0A0A0A or #1A1A1A)
   - All cards: Dark gray (#2A2A2A)
   - All text: White or gray for proper contrast
   - StatusBar: light style

2. HEADER SECTION - REMOVE COMPLETELY:
   - Remove the white/gray header bar with "Profile" title
   - Remove border-bottom
   - Start content directly from safe area top
   - Title "Profile" should be top-left, white text, no background

3. USER INFO SECTION - COMPLETE REDESIGN:

Current: Card with circular avatar, name, email, tier badge, and action buttons
New: Centered profile display with different layout

Changes Required:

```typescript
<View className="bg-black pt-16 pb-6">
  {/* Title */}
  <Text variant="h3" className="text-white px-5 mb-8">Profile</Text>

  {/* Profile Picture - Centered */}
  <View className="items-center mb-6">
    {user?.avatar ? (
      <Image
        source={{ uri: user.avatar }}
        className="w-28 h-28 rounded-full border-2 border-white/20"
      />
    ) : (
      <View className="w-28 h-28 rounded-full bg-gray-700 items-center justify-center border-2 border-white/20">
        <Text variant="h1" className="text-white text-4xl">
          {user?.firstName?.charAt(0) || 'U'}
        </Text>
      </View>
    )}
  </View>

  {/* User Info - Centered */}
  <View className="items-center mb-4">
    <Text variant="h2" className="text-white mb-1">
      {user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : 'User Name'}
    </Text>
    <Text variant="body" className="text-gray-400">
      {user?.email || 'user@example.com'}
    </Text>
  </View>

  {/* KYC Verified Badge */}
  {user?.kycStatus === 'APPROVED' && (
    <View className="items-center mb-6">
      <View className="bg-[#3A3A3A] rounded-full px-4 py-2 flex-row items-center">
        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
        <Text variant="caption" className="text-white ml-2">KYC Verified</Text>
      </View>
    </View>
  )}

  {/* Mosaic Code Section */}
  <View className="mx-5 bg-[#3A3A3A] rounded-2xl p-4 flex-row items-center justify-between">
    <View className="flex-1">
      <Text variant="caption" className="text-gray-400 mb-1">Mosaic Code</Text>
      <Text variant="h4" className="text-yellow-500">
        {user?.mosaicCode || '705 - 5745 - 3411'}
      </Text>
    </View>
    <TouchableOpacity
      className="bg-[#4A4A4A] rounded-xl px-4 py-2"
      onPress={() => router.push('/mosaic-code-details')}
    >
      <Text variant="bodyMedium" className="text-yellow-500">View</Text>
    </TouchableOpacity>
  </View>
</View>
```

4. MENU ITEMS SECTION - REDESIGN:

Current: Multiple sections with cards
New: Dark cards with consistent styling

Remove ALL current sections and replace with:

```typescript
<ScrollView className="flex-1 bg-black px-5">
  {/* Edit Profile */}
  <TouchableOpacity
    className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center mb-3"
    onPress={() => router.push('/edit-profile')}
  >
    <View className="w-12 h-12 rounded-full bg-[#3A3A3A] items-center justify-center mr-4">
      <Ionicons name="person-outline" size={24} color="white" />
    </View>
    <Text variant="bodyMedium" className="text-white flex-1">
      Edit Profile
    </Text>
    <Ionicons name="chevron-forward" size={20} color="#666" />
  </TouchableOpacity>

  {/* Security */}
  <TouchableOpacity
    className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center mb-3"
    onPress={() => router.push('/security-settings')}
  >
    <View className="w-12 h-12 rounded-full bg-[#3A3A3A] items-center justify-center mr-4">
      <Ionicons name="shield-outline" size={24} color="white" />
    </View>
    <Text variant="bodyMedium" className="text-white flex-1">
      Security
    </Text>
    <Ionicons name="chevron-forward" size={20} color="#666" />
  </TouchableOpacity>

  {/* App Settings */}
  <TouchableOpacity
    className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center mb-3"
    onPress={() => router.push('/app-settings')}
  >
    <View className="w-12 h-12 rounded-full bg-[#3A3A3A] items-center justify-center mr-4">
      <Ionicons name="settings-outline" size={24} color="white" />
    </View>
    <Text variant="bodyMedium" className="text-white flex-1">
      App Settings
    </Text>
    <Ionicons name="chevron-forward" size={20} color="#666" />
  </TouchableOpacity>

  {/* Help & Support */}
  <TouchableOpacity
    className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center mb-3"
    onPress={() => router.push('/support')}
  >
    <View className="w-12 h-12 rounded-full bg-[#3A3A3A] items-center justify-center mr-4">
      <Ionicons name="help-circle-outline" size={24} color="white" />
    </View>
    <Text variant="bodyMedium" className="text-white flex-1">
      Help & Support
    </Text>
    <Ionicons name="chevron-forward" size={20} color="#666" />
  </TouchableOpacity>

  {/* Logout Button */}
  <TouchableOpacity
    className="bg-[#C41E3A] rounded-2xl p-4 flex-row items-center justify-center mt-6 mb-8"
    onPress={handleLogout}
    disabled={isLoggingOut}
  >
    <Ionicons name="log-out-outline" size={24} color="white" />
    <Text variant="bodyMedium" weight="bold" className="text-white ml-3">
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </Text>
  </TouchableOpacity>
</ScrollView>
```

5. REMOVE COMPLETELY:

From current design:

- Light header with border
- Card-based user info section
- Tier badge display (move to separate tier details screen)
- "Edit Profile" and "Security" buttons in user card
- All section headers ("Account", "Support", "Danger Zone")
- P2P Username section
- Circular icon backgrounds with colors
- All card containers
- Border separators between menu items
- Purple color scheme (#5B55F6)
- Delete Account option (keep if needed, but style differently)

6. KEEP BUT RESTYLE:

- Profile picture (center it)
- User name and email (center them)
- Edit Profile menu item
- Security menu item
- Help Center / Support
- Terms of Service link
- Privacy Policy link
- Logout button (make it red and prominent)
- Delete Account (optional, style as danger)

7. NEW FEATURES TO ADD:

Mosaic Code Display:

- Dark card background (#3A3A3A)
- Label: "Mosaic Code" (gray)
- Code: Yellow/gold text (#F59E0B or #FBBF24)
- Format: XXX - XXXX - XXXX
- "View" button on the right (yellow text)
- OnPress: Navigate to mosaic-code-details screen

KYC Verified Badge:

- Only show if user.kycStatus === 'APPROVED'
- Dark pill background (#3A3A3A)
- Green checkmark icon
- Text: "KYC Verified"
- Centered below email

8. MENU ITEM SPECIFICATIONS:

Each menu item card:

- Background: Dark gray (#2A2A2A)
- Border radius: 16px
- Padding: 16px
- Height: Auto (minimum 72px)
- Margin bottom: 12px
- No border between items

Icon Container (left):

- Size: 48x48px
- Background: Darker gray (#3A3A3A)
- Border radius: 24px (full circle)
- Icon: White, 24px

Text (center):

- Color: White
- Size: 16px
- Weight: Medium
- Flex: 1

Chevron (right):

- Color: Dark gray (#666)
- Size: 20px

9. LOGOUT BUTTON STYLING:

- Background: Red (#C41E3A)
- Border radius: 16px
- Padding: 16px
- Full width
- Center content
- Icon + Text layout
- Icon: log-out-outline
- Text: White, bold
- Position: At bottom with spacing

10. COLOR PALETTE:

Replace throughout:

```typescript
const colors = {
  background: '#0A0A0A',
  cardBackground: '#2A2A2A',
  cardBackgroundLight: '#3A3A3A',
  cardBackgroundDarker: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  accent: '#C41E3A',
  accentYellow: '#F59E0B',
  success: '#10B981',
  border: '#333333',
};
```

11. NAVIGATION UPDATES:

Update all navigation:

- Edit Profile → /edit-profile (no changes)
- Security → /security-settings (no changes)
- App Settings → /app-settings (NEW SCREEN)
- Help & Support → /support (existing)
- Mosaic Code View → /mosaic-code-details (NEW SCREEN)

12. STATE MANAGEMENT:

Keep existing logic for:

- User data fetching
- Logout functionality
- Loading states
- Error handling

Remove logic for:

- P2P username handling (move to separate feature if needed)
- Tier badge display (move to tier details screen)
- Multiple section rendering

TECHNICAL REQUIREMENTS:

- Maintain ScrollView for proper scrolling
- Keep SafeAreaView for proper spacing
- Maintain all existing hooks (useAuth, useUserStore, useTheme)
- Update color scheme throughout
- Test on both iOS and Android
- Ensure proper contrast for accessibility
- Add loading states for logout
