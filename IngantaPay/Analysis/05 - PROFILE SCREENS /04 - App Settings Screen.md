IMAGE 4: App Settings Screen
New Screen: app/app-settings.tsx
MOBILE APP PROMPT:

Create a NEW screen app/app-settings.tsx for App Settings in Inganta Pay.

This screen consolidates notification preferences, theme settings, and app info.

SCREEN STRUCTURE:

1. BACKGROUND & HEADER:
   - Background: Pure black (#0A0A0A)
   - Back button: White arrow
   - Title: "App Settings"
   - StatusBar: light

2. NOTIFICATIONS SECTION:

Section title: "Notifications" (white, bold, 18px)

Items with toggles:
a. Push Notifications

- Icon: bell (blue #3B82F6)
- Title: "Push Notifications"
- Subtitle: "Receive app notifications"
- Toggle: Red/gray

b. Email Notifications

- Icon: bell (green #10B981)
- Title: "Email Notifications"
- Subtitle: "Receive email updates"
- Toggle: Red/gray

c. SMS Notifications

- Icon: bell (purple #A855F7)
- Title: "SMS Notifications"
- Subtitle: "Receive SMS alerts"
- Toggle: Red/gray

3. APPEARANCE SECTION:

Section title: "Appearance" (white, bold)

Single item:

- Icon: sun/moon (orange #F97316)
- Title: "Dark Mode"
- Subtitle: "Use dark theme"
- Toggle: Red/gray

Note: This replaces the full theme-settings screen. Just a simple dark mode toggle.

Logic:

```typescript
const { mode, setThemeMode, isDark } = useTheme();
const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);

const handleDarkModeToggle = () => {
  const newMode = darkModeEnabled ? 'light' : 'dark';
  setThemeMode(newMode);
  setDarkModeEnabled(!darkModeEnabled);
};
```

4. ABOUT SECTION:

Section title: "About" (white, bold)

Single navigation item:

- Icon: information-circle (gray #6B7280)
- Title: "About Inganta Pay"
- Subtitle: "Version 1.0.0"
- Chevron: right arrow
- OnPress: Navigate to /about

COMPONENT STRUCTURE:

```typescript
import { ScreenHeader, Text } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppSettingsScreen() {
  const { isDark, mode, setThemeMode } = useTheme();

  // Notification states
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  // Dark mode state
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);

  // Load notification preferences
  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      const push = await AsyncStorage.getItem('notifications_push');
      const email = await AsyncStorage.getItem('notifications_email');
      const sms = await AsyncStorage.getItem('notifications_sms');

      if (push !== null) setPushEnabled(push === 'true');
      if (email !== null) setEmailEnabled(email === 'true');
      if (sms !== null) setSmsEnabled(sms === 'true');
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  const handleNotificationToggle = async (
    type: 'push' | 'email' | 'sms',
    value: boolean
  ) => {
    try {
      await AsyncStorage.setItem(`notifications_${type}`, value.toString());

      switch (type) {
        case 'push':
          setPushEnabled(value);
          // TODO: Register/unregister push notifications
          break;
        case 'email':
          setEmailEnabled(value);
          // TODO: Update backend preference
          break;
        case 'sms':
          setSmsEnabled(value);
          // TODO: Update backend preference
          break;
      }
    } catch (error) {
      console.error(`Failed to update ${type} notifications:`, error);
    }
  };

  const handleDarkModeToggle = () => {
    const newMode = darkModeEnabled ? 'light' : 'dark';
    setThemeMode(newMode);
    setDarkModeEnabled(!darkModeEnabled);
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <ScreenHeader title="App Settings" />

      <ScrollView className="flex-1 px-5 pt-6">
        {/* Notifications Section */}
        <View className="mb-6">
          <Text variant="h4" className="text-white mb-3">Notifications</Text>

          <SettingToggleItem
            icon="notifications"
            iconBg="#3B82F6"
            title="Push Notifications"
            subtitle="Receive app notifications"
            value={pushEnabled}
            onToggle={(v) => handleNotificationToggle('push', v)}
          />

          <SettingToggleItem
            icon="mail"
            iconBg="#10B981"
            title="Email Notifications"
            subtitle="Receive email updates"
            value={emailEnabled}
            onToggle={(v) => handleNotificationToggle('email', v)}
          />

          <SettingToggleItem
            icon="chatbubble"
            iconBg="#A855F7"
            title="SMS Notifications"
            subtitle="Receive SMS alerts"
            value={smsEnabled}
            onToggle={(v) => handleNotificationToggle('sms', v)}
          />
        </View>

        {/* Appearance Section */}
        <View className="mb-6">
          <Text variant="h4" className="text-white mb-3">Appearance</Text>

          <SettingToggleItem
            icon={darkModeEnabled ? "moon" : "sunny"}
            iconBg="#F97316"
            title="Dark Mode"
            subtitle="Use dark theme"
            value={darkModeEnabled}
            onToggle={handleDarkModeToggle}
          />
        </View>

        {/* About Section */}
        <View className="mb-8">
          <Text variant="h4" className="text-white mb-3">About</Text>

          <TouchableOpacity
            className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center"
            onPress={() => router.push('/about')}
          >
            <View className="w-12 h-12 rounded-full bg-[#4B5563] items-center justify-center mr-4">
              <Ionicons name="information-circle-outline" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text variant="bodyMedium" className="text-white">About Inganta Pay</Text>
              <Text variant="caption" className="text-gray-400">Version 1.0.0</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Reusable Toggle Item Component
interface SettingToggleItemProps {
  icon: keyof typeof
  interface SettingToggleItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

const SettingToggleItem: React.FC<SettingToggleItemProps> = ({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  onToggle,
}) => {
  return (
    <View className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center mb-3">
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: iconBg }}
      >
        <Ionicons name={icon} size={24} color="white" />
      </View>

      <View className="flex-1">
        <Text variant="bodyMedium" className="text-white">{title}</Text>
        <Text variant="caption" className="text-gray-400">{subtitle}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#4B5563', true: '#C41E3A' }}
        thumbColor="white"
        ios_backgroundColor="#4B5563"
      />
    </View>
  );
};

STYLING SPECIFICATIONS:

All cards: #2A2A2A, rounded-2xl, padding 16px
Icons: Circular 48x48px containers with custom colors
Toggles: Red (#C41E3A) when ON, gray (#4B5563) when OFF
Text: White for titles, gray-400 for subtitles
Spacing: 12px between items, 24px between sections

STATE MANAGEMENT:
// Store in AsyncStorage
const NOTIFICATION_KEYS = {
  PUSH: 'notifications_push',
  EMAIL: 'notifications_email',
  SMS: 'notifications_sms',
};

// Load on mount
useEffect(() => {
  loadPreferences();
}, []);

// Save on change
const savePreference = async (key: string, value: boolean) => {
  await AsyncStorage.setItem(key, value.toString());
  // TODO: Sync with backend API
};

API INTEGRATION (TODO):
// Update user notification preferences on backend
POST /api/users/notification-preferences
Body: {
  pushNotifications: boolean,
  emailNotifications: boolean,
  smsNotifications: boolean
}
```

```

---

### **BOTTOM TAB BAR UPDATE**

**PROMPT:**

Update the bottom tab bar styling in app/(tabs)/_layout.tsx to match Inganta Pay design:
CHANGES:

1. TAB BAR STYLING:
<Tabs
  screenOptions={{
    tabBarActiveTintColor: '#FFFFFF', // White for active
    tabBarInactiveTintColor: '#6B7280', // Gray for inactive
    tabBarStyle: {
      backgroundColor: '#1A1A1A', // Dark background
      borderTopWidth: 1,
      borderTopColor: '#333333',
      height: 70,
      paddingBottom: 10,
      paddingTop: 10,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    headerShown: false,
  }}
>

2. TAB ITEMS:
<Tabs.Screen
  name="index"
  options={{
    title: 'Home',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'home' : 'home-outline'}
        size={24}
        color={color}
      />
    ),
  }}
/>

<Tabs.Screen
  name="wallet"
  options={{
    title: 'Wallet',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'wallet' : 'wallet-outline'}
        size={24}
        color={color}
      />
    ),
  }}
/>

<Tabs.Screen
  name="rewards"
  options={{
    title: 'Rewards',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'gift' : 'gift-outline'}
        size={24}
        color={color}
      />
    ),
  }}
/>

<Tabs.Screen
  name="profile"
  options={{
    title: 'Profile',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'person' : 'person-outline'}
        size={24}
        color={color}
      />
    ),
  }}
/>
```

3. REMOVE RED ACCENT:

- No more red/purple colors in tab bar
- Active: White
- Inactive: Gray
- Background: Dark
- Border: Subtle gray

4. ICON BEHAVIOR:

- Use filled icons when tab is active
- Use outline icons when tab is inactive
- Size: 24px
- Color changes based on state

```

---

## **SUMMARY OF PROFILE SECTION CHANGES:**

### **Screens to Update:**
1. ✅ **Profile (Main)** - app/(tabs)/profile.tsx
   - Black background
   - Centered profile picture and info
   - KYC Verified badge
   - Mosaic Code card
   - 4 menu items (Edit Profile, Security, App Settings, Help & Support)
   - Red logout button

2. ✅ **Edit Profile** - app/edit-profile.tsx
   - Simplify form fields (Full Name display, Email, Phone, Address only)
   - Remove DOB, Gender, Nationality, City, State
   - Dark theme
   - Red camera button on avatar
   - Keep one-time edit warning

3. ✅ **Security** - app/security-settings.tsx
   - Add Security Score card with shield
   - Authentication section (3 toggles)
   - Password & PIN section (2 navigation items)
   - Dark theme
   - Red toggles when active

4. ✅ **App Settings (NEW)** - app/app-settings.tsx
   - Notifications section (3 toggles)
   - Appearance section (Dark Mode toggle)
   - About section (1 navigation item)
   - Replaces full theme-settings screen

5. ⚠️ **Help & Support** - Waiting for current codebase

### **Visual Changes:**
- Purple (#5B55F6) → Red (#C41E3A) for primary actions
- Light backgrounds → Pure black (#0A0A0A)
- White cards → Dark gray cards (#2A2A2A)
- Centered profile layout
- Icon backgrounds with specific colors
- Red toggles instead of purple

### **Functional Changes:**
- Simplify edit profile (fewer fields)
- Add security score calculation
- Consolidate settings into App Settings
- Remove theme settings modal (just toggle)
- Add Mosaic Code display
- Improve toggle states

### **Code Changes:**
- Update all color values
- Remove Card component usage (custom styling)
- Add Security Score logic
- Create App Settings screen
- Update tab bar colors
- Simplify form validation

### **Backend Considerations:**

UPDATE USER PREFERENCES API:

Notification Preferences Endpoint:
POST /api/users/notification-preferences
Body: {
pushNotifications: boolean,
emailNotifications: boolean,
smsNotifications: boolean
}
Update Profile Endpoint (Simplified):
PUT /api/users/profile
Body: {
address: string // Only editable field
}
Security Score Endpoint (Optional):
GET /api/users/security-score
Response: {
score: number, // 0-100
rating: string, // "Weak" | "Fair" | "Good" | "Excellent"
factors: string[], // List of active security features
recommendations: string[] // What user can improve
}
Mosaic Code Endpoint:
GET /api/users/mosaic-code
Response: {
code: string, // "705-5745-3411"
formatted: string, // Display format
qrCode: string // Base64 QR code image (optional)
}
```
