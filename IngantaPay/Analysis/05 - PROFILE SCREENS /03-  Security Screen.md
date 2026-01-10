IMAGE 3: Security Screen
Corresponding Screen: app/security-settings.tsx
MOBILE APP PROMPT:

Update security-settings.tsx to match Inganta Pay design:

DESIGN CHANGES:

1. BACKGROUND & THEME:
   - Background: Pure black
   - All cards: Dark gray (#2A2A2A)
   - Text: White/gray
   - StatusBar: light

2. HEADER:
   - Back button: White arrow
   - Title: "Security"
   - Style: Same as other screens

3. SECURITY SCORE CARD - NEW FEATURE:

Add at top:

```typescript
<View className="mx-5 mt-6 mb-6">
  <View className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-6">
    {/* Shield Icon Circle */}
    <View className="items-center mb-4">
      <View className="w-20 h-20 rounded-full bg-green-800/30 items-center justify-center">
        <View className="w-16 h-16 rounded-full bg-green-700/50 items-center justify-center">
          <Ionicons name="shield-checkmark" size={32} color="white" />
        </View>
      </View>
    </View>

    {/* Score Text */}
    <View className="items-center">
      <Text variant="caption" className="text-white/80 mb-1">
        Security Score
      </Text>
      <Text variant="h1" className="text-white font-bold">
        Excellent
      </Text>
      <Text variant="caption" className="text-white/80 mt-2">
        Your account is well protected
      </Text>
    </View>
  </View>
</View>
```

Security Score Logic:

```typescript
const calculateSecurityScore = () => {
  let score = 0;
  let factors: string[] = [];

  // Password changed in last 90 days: +25%
  if (user?.lastPasswordChange) {
    const daysSince = Math.floor(
      (Date.now() - new Date(user.lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSince < 90) {
      score += 25;
      factors.push('Recent password change');
    }
  }

  // PIN is set: +25%
  if (user?.pinSetAt) {
    score += 25;
    factors.push('Transaction PIN enabled');
  }

  // Biometric login enabled: +25%
  if (isBiometricEnabled) {
    score += 25;
    factors.push('Biometric login active');
  }

  // Email verified: +15%
  if (user?.emailVerified) {
    score += 15;
    factors.push('Email verified');
  }

  // Phone verified: +10%
  if (user?.phoneVerified) {
    score += 10;
    factors.push('Phone verified');
  }

  // Calculate rating
  let rating = 'Weak';
  let color = '#EF4444'; // Red

  if (score >= 80) {
    rating = 'Excellent';
    color = '#10B981'; // Green
  } else if (score >= 60) {
    rating = 'Good';
    color = '#F59E0B'; // Yellow
  } else if (score >= 40) {
    rating = 'Fair';
    color = '#F97316'; // Orange
  }

  return { rating, score, factors, color };
};
```

4. AUTHENTICATION SECTION:

Section title: "Authentication" (white, bold)

Items:
a. Biometric Login

- Icon: fingerprint (blue background #1E40AF)
- Title: "Biometric Login"
- Subtitle: "Use fingerprint to login"
- Toggle: Red when ON, gray when OFF

b. Palm Payments

- Icon: hand (gold/yellow background #B45309)
- Title: "Palm Payments"
- Subtitle: "Pay with palm biometric"
- Toggle: Red when ON, gray when OFF

c. Two-Factor Auth

- Icon: phone (purple background #7C3AED)
- Title: "Two-Factor Auth"
- Subtitle: "Extra layer of security"
- Toggle: Gray (OFF by default)

Toggle Styling:

- Active (ON): Red track (#C41E3A), white thumb
- Inactive (OFF): Gray track (#4B5563), light gray thumb
- Size: Standard iOS/Android switch

5. PASSWORD & PIN SECTION:

Section title: "Password & PIN" (white, bold)

Items:
a. Change Password

- Icon: lock (gray background #4B5563)
- Title: "Change Password"
- Subtitle: "Update your login password"
- Chevron: right arrow

b. Change PIN

- Icon: lock (gray background #4B5563)
- Title: "Change PIN"
- Subtitle: "Update your transaction PIN"
- Chevron: right arrow

6. ITEM CARD STYLING:

Each toggle item:

```typescript
<View className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center mb-3">
  {/* Icon Circle */}
  <View className="w-12 h-12 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: iconBgColor }}>
    <Ionicons name={iconName} size={24} color="white" />
  </View>

  {/* Text Content */}
  <View className="flex-1">
    <Text variant="bodyMedium" className="text-white">
      {title}
    </Text>
    <Text variant="caption" className="text-gray-400">
      {subtitle}
    </Text>
  </View>

  {/* Toggle or Chevron */}
  <Switch
    value={isEnabled}
    onValueChange={handleToggle}
    trackColor={{ false: '#4B5563', true: '#C41E3A' }}
    thumbColor="white"
  />
</View>
```

Each navigation item (Change Password/PIN):

```typescript
<TouchableOpacity
  className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center mb-3"
  onPress={() => router.push(destination)}
>
  <View className="w-12 h-12 rounded-full bg-[#4B5563] items-center justify-center mr-4">
    <Ionicons name="lock-closed-outline" size={24} color="white" />
  </View>

  <View className="flex-1">
    <Text variant="bodyMedium" className="text-white">{title}</Text>
    <Text variant="caption" className="text-gray-400">{subtitle}</Text>
  </View>

  <Ionicons name="chevron-forward" size={20} color="#666" />
</TouchableOpacity>
```

7. SPACING:

- Security Score card: 24px top margin, 24px bottom margin
- Section titles: 16px top padding, 12px bottom padding
- Between items: 12px
- Between sections: 24px
- Bottom padding: 32px

REMOVE COMPLETELY:

- Light theme styling
- Card/Card variant wrappers (use custom styling)
- Section boxes with borders
- "Coming soon" badges
- Login History section
- Debug reset buttons
- Info boxes at bottom

TECHNICAL UPDATES:

- Keep all existing toggle logic
- Maintain biometric integration
- Keep navigation to change password/PIN
- Add security score calculation
- Update color scheme throughout
