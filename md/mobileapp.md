# RaverPay Mobile App - Complete Specification

**Version:** 1.0
**Last Updated:** 2025-11-11
**Platform:** React Native (Expo)
**Target:** iOS & Android

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Tech Stack & Architecture](#tech-stack--architecture)
3. [Design System](#design-system)
4. [App Structure & Navigation](#app-structure--navigation)
5. [Screen Specifications](#screen-specifications)
6. [User Flows](#user-flows)
7. [State Management Strategy](#state-management-strategy)
8. [API Integration Strategy](#api-integration-strategy)
9. [Security & Data Persistence](#security--data-persistence)
10. [Performance Optimization](#performance-optimization)
11. [Push Notifications](#push-notifications)
12. [Testing Strategy](#testing-strategy)
13. [Development Phases](#development-phases)
14. [API Requirements](#api-requirements)

---

## Executive Summary

RaverPay Mobile is a **production-grade fintech application** built with React Native/Expo that provides:
- Digital wallet management
- Bill payments (airtime, data, cable TV, electricity)
- Bank transfers & withdrawals
- Multi-tier KYC verification
- Real-time transaction tracking
- Secure biometric authentication

**Key Objectives:**
- Native-like iOS experience with 60fps animations
- < 2 second cold start time
- Offline-first architecture with background sync
- Bank-grade security (Keychain, biometrics, PIN)
- Seamless onboarding with progressive KYC

---

## Tech Stack & Architecture

### Core Technologies

#### 1. Framework & Tooling (Already Installed ✅)
```json
{
  "expo": "~54.0.23",
  "expo-router": "~6.0.14",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "typescript": "~5.9.2"
}
```

#### 2. UI & Styling (Already Installed ✅)
```json
{
  "nativewind": "^4.2.1",
  "tailwindcss": "^3.4.17",
  "react-native-reanimated": "~4.1.1",
  "react-native-gesture-handler": "~2.28.0",
  "react-native-safe-area-context": "5.6.0"
}
```

**Note:** For fonts, you'll need to install:
```bash
npx expo install @expo-google-fonts/urbanist expo-font
```

#### 3. State Management & Data Fetching (Already Installed ✅)
```json
{
  "zustand": "^5.0.8",
  "@tanstack/react-query": "^5.90.7"
}
```

**Need to Install:**
```bash
npm install zod react-hook-form @hookform/resolvers
```

#### 4. Security & Storage (Partially Installed)

**Already Installed:**
```json
{
  "@react-native-async-storage/async-storage": "^2.2.0"
}
```

**Need to Install:**
```bash
npx expo install expo-secure-store expo-local-authentication expo-crypto
```

#### 5. Notifications & Media (Partially Installed)

**Already Installed:**
```json
{
  "expo-image": "~3.0.10",
  "expo-haptics": "~15.0.7"
}
```

**Need to Install:**
```bash
# OneSignal
npm install react-native-onesignal onesignal-expo-plugin

# Image picker and notifications
npx expo install expo-image-picker expo-notifications
```

#### 6. Networking & Utilities (Partially Installed)

**Already Installed:**
```json
{
  "axios": "^1.13.2"
}
```

**Need to Install:**
```bash
npm install react-native-toast-message date-fns react-hook-form
```

#### 7. Additional Packages Needed
```bash
# Bottom sheet for modals
npm install @gorhom/bottom-sheet

# WebView for Paystack
npx expo install react-native-webview

# Blur effects
npx expo install expo-blur

# Animations
npm install lottie-react-native

# Clipboard
npx expo install expo-clipboard

# Form validation
npm install zod @hookform/resolvers
```

#### 8. Already Installed (No Action Needed ✅)
```json
{
  "@expo/vector-icons": "^15.0.3",
  "expo-constants": "~18.0.10",
  "expo-font": "~14.0.9",
  "expo-linking": "~8.0.8",
  "expo-splash-screen": "~31.0.10",
  "expo-status-bar": "~3.0.8",
  "expo-system-ui": "~6.0.8",
  "expo-web-browser": "~15.0.9",
  "react-native-screens": "~4.16.0"
}
```

---

### Architecture Pattern: Feature-Based + Layered

```
raverpay-mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth stack (guest only)
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── verify-otp.tsx
│   ├── (main)/                   # Main app (authenticated)
│   │   ├── (tabs)/               # Bottom tabs
│   │   │   ├── index.tsx         # Home/Dashboard
│   │   │   ├── services.tsx      # Services
│   │   │   ├── wallet.tsx        # Wallet
│   │   │   └── profile.tsx       # Profile
│   │   ├── fund-wallet.tsx
│   │   ├── withdraw.tsx
│   │   ├── buy-airtime.tsx
│   │   ├── buy-data.tsx
│   │   ├── pay-cable.tsx
│   │   ├── pay-electricity.tsx
│   │   ├── transaction-details.tsx
│   │   └── notifications.tsx
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx
│
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Base components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Text.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── wallet/
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── TransactionItem.tsx
│   │   │   └── QuickActionButton.tsx
│   │   ├── services/
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── BeneficiaryItem.tsx
│   │   │   └── RecentOrderItem.tsx
│   │   └── shared/
│   │       ├── Header.tsx
│   │       ├── EmptyState.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── features/                 # Feature modules
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   ├── wallet/
│   │   ├── transactions/
│   │   ├── vtu/
│   │   ├── profile/
│   │   └── notifications/
│   │
│   ├── lib/                      # Core utilities
│   │   ├── api/
│   │   │   ├── client.ts         # Axios instance
│   │   │   ├── interceptors.ts   # Auth, refresh, error handling
│   │   │   └── endpoints.ts      # API endpoints
│   │   ├── storage/
│   │   │   ├── secure-store.ts   # Expo SecureStore wrapper
│   │   │   ├── async-storage.ts  # AsyncStorage wrapper
│   │   │   └── cache.ts          # Query cache persistence
│   │   ├── auth/
│   │   │   ├── biometrics.ts     # Face/Touch ID
│   │   │   └── session.ts        # Session management
│   │   └── utils/
│   │       ├── formatters.ts     # Currency, date, phone
│   │       ├── validators.ts     # Custom validations
│   │       └── helpers.ts
│   │
│   ├── store/                    # Zustand stores
│   │   ├── auth.store.ts
│   │   ├── user.store.ts
│   │   ├── wallet.store.ts
│   │   ├── theme.store.ts
│   │   └── settings.store.ts
│   │
│   ├── hooks/                    # Global hooks
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts
│   │   ├── useBiometrics.ts
│   │   ├── useOffline.ts
│   │   └── useToast.ts
│   │
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── config.ts
│   │
│   └── types/
│       ├── api.types.ts
│       ├── navigation.types.ts
│       └── global.types.ts
│
├── assets/
│   ├── fonts/
│   ├── images/
│   ├── lottie/
│   └── icons/
│
├── tailwind.config.js
├── app.json
└── package.json
```

---

## Design System

### Color Palette

After researching top fintech apps (Revolut, N26, Monzo, Cash App), the recommended color scheme is:

#### Option 1: Modern Purple/Blue (RECOMMENDED)
```typescript
// constants/colors.ts
export const colors = {
  light: {
    // Primary
    primary: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',  // Main brand color
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95',
    },

    // Accent (for success, earnings)
    accent: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      500: '#22C55E',
      600: '#16A34A',
    },

    // Neutrals
    background: '#FFFFFF',
    surface: '#F9FAFB',
    card: '#FFFFFF',
    border: '#E5E7EB',

    // Text
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },

    // Semantic
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  dark: {
    // Primary (slightly adjusted for dark mode)
    primary: {
      50: '#1E1B4B',
      100: '#312E81',
      200: '#3730A3',
      300: '#4338CA',
      400: '#6366F1',
      500: '#8B5CF6',
      600: '#A78BFA',
      700: '#C4B5FD',
      800: '#DDD6FE',
      900: '#EDE9FE',
    },

    accent: {
      50: '#14532D',
      100: '#166534',
      500: '#22C55E',
      600: '#4ADE80',
    },

    // Dark neutrals
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',
    border: '#334155',

    text: {
      primary: '#F1F5F9',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
      inverse: '#0F172A',
    },

    success: '#22C55E',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
};
```

**Why this palette?**
- Purple conveys innovation, trust, and premium quality
- Green accents for positive actions (deposits, earnings)
- Excellent contrast ratios (WCAG AAA compliant)
- Looks professional and modern
- Works great in both light/dark modes

#### Alternative: Professional Blue/Green
```typescript
// For a more traditional fintech look
primary: '#0066FF',  // Blue (like PayPal, Wise)
accent: '#00D9B1',   // Mint green (for success states)
```

---

### Typography

```typescript
// constants/typography.ts
import { Platform } from 'react-native';

export const typography = {
  // Font family
  fonts: {
    regular: 'Urbanist_400Regular',
    medium: 'Urbanist_500Medium',
    semibold: 'Urbanist_600SemiBold',
    bold: 'Urbanist_700Bold',
  },

  // Font sizes (iOS-like hierarchy)
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

// Pre-defined text styles
export const textStyles = {
  h1: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['4xl'],
    lineHeight: typography.sizes['4xl'] * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['3xl'],
    lineHeight: typography.sizes['3xl'] * typography.lineHeights.tight,
  },
  h3: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes['2xl'],
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.normal,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  bodyMedium: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  caption: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  button: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    letterSpacing: typography.letterSpacing.wide,
  },
};
```

---

### Spacing System

```typescript
// constants/spacing.ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};

// Component-specific spacing
export const layout = {
  screenPadding: spacing[4],      // 16px horizontal padding
  cardPadding: spacing[4],         // 16px card padding
  sectionGap: spacing[6],          // 24px between sections
  itemGap: spacing[3],             // 12px between list items
  buttonHeight: 52,                // iOS-like button height
  inputHeight: 52,
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
};
```

---

### Responsive Design Strategy

Since React Native doesn't use media queries, we'll use:

#### 1. Responsive Hook
```typescript
// hooks/useResponsive.ts
import { useWindowDimensions } from 'react-native';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isSmallDevice: width < 375,      // iPhone SE
    isMediumDevice: width >= 375 && width < 414,  // iPhone 12/13
    isLargeDevice: width >= 414,     // iPhone Pro Max, iPad
    isTablet: width >= 768,

    // Dynamic spacing
    sp: (base: number) => {
      if (width < 375) return base * 0.9;
      if (width >= 414) return base * 1.1;
      return base;
    },

    // Dynamic font size
    fs: (base: number) => {
      if (width < 375) return base * 0.95;
      if (width >= 414) return base * 1.05;
      return base;
    },
  };
};
```

#### 2. Tailwind Config with Custom Breakpoints
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Import from constants/colors.ts
      },
      fontFamily: {
        regular: ['Urbanist_400Regular'],
        medium: ['Urbanist_500Medium'],
        semibold: ['Urbanist_600SemiBold'],
        bold: ['Urbanist_700Bold'],
      },
    },
  },
};
```

---

### Component Library

#### Base Components (iOS-inspired)

**1. Button Component**
```typescript
// components/ui/Button.tsx
import { Pressable, Text, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
}: ButtonProps) => {
  // Implementation with haptic feedback, animations, etc.
};
```

**2. Input Component**
```typescript
// components/ui/Input.tsx
interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}
```

**3. Text Component (Type-safe)**
```typescript
// components/ui/Text.tsx
type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodyMedium' | 'caption' | 'button';

interface TextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}
```

**4. Card Component**
```typescript
// components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
}
```

**5. Modal Component**
```typescript
// components/ui/Modal.tsx
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}
```

**6. BottomSheet Component**
```typescript
// Using @gorhom/bottom-sheet
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
}
```

---

## App Structure & Navigation

### Navigation Flow

```
Root Navigator
├── (auth) Stack [if !authenticated]
│   ├── welcome
│   ├── login
│   ├── register
│   ├── verify-email
│   └── verify-phone
│
└── (main) Stack [if authenticated]
    ├── (tabs) Bottom Tabs
    │   ├── Home/Dashboard
    │   ├── Services
    │   ├── Wallet
    │   └── Profile
    │
    └── Modals/Screens
        ├── fund-wallet
        ├── withdraw
        ├── buy-airtime
        ├── buy-data
        ├── pay-cable
        ├── pay-electricity
        ├── transaction-details
        ├── notifications
        ├── edit-profile
        ├── change-password
        ├── verify-bvn
        ├── verify-nin
        └── settings
```

### Root Layout with Auth Check

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function RootLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(main)/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  return <Slot />;
}
```

---

## Screen Specifications

### Authentication Screens

#### 1. Welcome Screen
**Route:** `/(auth)/welcome`

**Purpose:** First screen users see, brand introduction

**Layout:**
```
┌─────────────────────────────┐
│                             │
│      [Lottie Animation]     │
│         (Wallet/Money)      │
│                             │
│      RaverPay Logo          │
│                             │
│   "Your Smart Wallet for    │
│    Everything You Need"     │
│                             │
│                             │
│   [Create Account Button]   │
│   [Sign In Button]          │
│                             │
└─────────────────────────────┘
```

**Features:**
- Auto-navigate to main app if token valid
- Smooth animations
- Version number in footer

---

#### 2. Register Screen
**Route:** `/(auth)/register`

**Form Fields:**
- First Name
- Last Name
- Email (with validation icon)
- Phone Number (+234 auto-prefix)
- Password (with strength indicator)
- Terms & Conditions checkbox

**Validations:**
- Email: Valid format
- Phone: Nigerian number only
- Password: Min 8 chars, uppercase, lowercase, number/special
- All fields required

**API Call:** `POST /auth/register`

**Success Flow:**
1. Register success
2. Auto-send email verification
3. Navigate to verify-email screen

---

#### 3. Login Screen
**Route:** `/(auth)/login`

**Form Fields:**
- Email or Phone Number
- Password
- Remember Me toggle
- Forgot Password link

**Features:**
- Biometric login (if previously enabled)
- Auto-fill email if "Remember Me" was checked

**API Call:** `POST /auth/login`

**Success Flow:**
1. Login success
2. Check emailVerified status
3. If not verified → navigate to verify-email
4. If verified → navigate to main app

---

#### 4. Verify Email Screen
**Route:** `/(auth)/verify-email`

**Layout:**
```
┌─────────────────────────────┐
│         [< Back]            │
│                             │
│   "Verify your email"       │
│                             │
│  We sent a code to          │
│  user@email.com [Edit]      │
│                             │
│  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]│
│   (6-digit OTP input)       │
│                             │
│   Didn't receive code?      │
│   Resend (59s)              │
│                             │
│   [Verify Email Button]     │
│                             │
└─────────────────────────────┘
```

**Features:**
- Auto-send code on mount
- Auto-focus OTP input
- Countdown timer (60s) for resend
- Auto-submit when 6 digits entered
- Error handling (invalid/expired code)

**API Calls:**
- `POST /users/send-email-verification` (on mount)
- `POST /users/verify-email` (on submit)

**Success Flow:**
1. Email verified
2. Navigate to verify-phone screen

---

#### 5. Verify Phone Screen
**Route:** `/(auth)/verify-phone`

**Similar to verify-email but:**
- SMS sent via VTPass
- Different heading/copy

**API Calls:**
- `POST /users/send-phone-verification`
- `POST /users/verify-phone`

**Success Flow:**
1. Phone verified
2. User status → ACTIVE
3. KYC tier → TIER_1
4. Navigate to main app (home screen)
5. Show success toast

---

### Main App Screens

#### 6. Home/Dashboard Screen
**Route:** `/(main)/(tabs)/index`

**Header:**
```
┌─────────────────────────────┐
│ [Avatar] Hi, John!          │
│          Good morning 🌅    │
│                             │
│ [Notification Icon (badge)] │
└─────────────────────────────┘
```

**Balance Card:**
```
┌─────────────────────────────┐
│ Available Balance           │
│ ₦125,450.00                 │
│                             │
│ [Ledger: ₦125,450.00]       │
│ [KYC: Tier 1] [👁 Toggle]   │
│                             │
│ [Add Money] [Withdraw]      │
└─────────────────────────────┘
```

**Quick Actions:**
```
┌────────┬────────┬────────┬────────┐
│Airtime │  Data  │ Cable  │Electric│
│  [📱]  │  [📊]  │  [📺] │  [⚡]  │
└────────┴────────┴────────┴────────┘
```

**Recent Transactions:**
```
┌─────────────────────────────┐
│ Recent Transactions [See All]│
│                             │
│ [📱] MTN Airtime            │
│      -₦500.00    [Completed]│
│      2 hours ago            │
│                             │
│ [💰] Wallet Funded          │
│      +₦10,000.00 [Completed]│
│      Yesterday              │
└─────────────────────────────┘
```

**Features:**
- Pull-to-refresh (balance + transactions)
- Balance visibility toggle (show/hide amount)
- KYC tier badge (tap to upgrade)
- Skeleton loading states
- Empty state if no transactions

**API Calls:**
- `GET /wallet` (balance, limits)
- `GET /wallet/transactions?page=1&limit=5` (recent)

---

#### 7. Services Screen
**Route:** `/(main)/(tabs)/services`

**Search Bar:**
```
┌─────────────────────────────┐
│ [🔍] Search services...     │
└─────────────────────────────┘
```

**Service Categories:**
```
┌─────────────────────────────┐
│ Bill Payments               │
│ ┌───────┬───────┬───────┐   │
│ │Airtime│ Data  │ Cable │   │
│ │  📱  │  📊  │  📺  │   │
│ └───────┴───────┴───────┘   │
│ ┌───────┬───────┬───────┐   │
│ │Electric│      │       │   │
│ │  ⚡   │      │       │   │
│ └───────┴───────┴───────┘   │
│                             │
│ Coming Soon                 │
│ ┌───────┬───────┬───────┐   │
│ │Gift   │Crypto │       │   │
│ │Cards  │Trade  │       │   │
│ │ [🔒] │ [🔒] │       │   │
│ └───────┴───────┴───────┘   │
└─────────────────────────────┘
```

**Recent Orders:**
```
┌─────────────────────────────┐
│ Recent Orders               │
│                             │
│ [📱] MTN 1GB Data           │
│      ₦500.00    [Completed] │
│      08012345678            │
│                             │
│ [Retry] [View Receipt]      │
└─────────────────────────────┘
```

**Features:**
- Search (filter services)
- Service cards with tap animation
- Recent orders list
- Pull-to-refresh

**API Calls:**
- `GET /vtu/orders?page=1&limit=10`

---

#### 8. Wallet Screen
**Route:** `/(main)/(tabs)/wallet`

**Header Balance:**
```
┌─────────────────────────────┐
│ Wallet Balance              │
│ ₦125,450.00                 │
│ Ledger: ₦125,450.00         │
└─────────────────────────────┘
```

**Actions:**
```
┌─────────────────────────────┐
│ [💳 Add Money]              │
│ [🏦 Withdraw]               │
│ [🔄 Transfer] (Coming Soon) │
└─────────────────────────────┘
```

**Limits Card:**
```
┌─────────────────────────────┐
│ Transaction Limits (Tier 1) │
│                             │
│ Daily:  ₦25,000 / ₦300,000  │
│ [Progress bar]              │
│                             │
│ Monthly: ₦150,000 / ₦1M     │
│ [Progress bar]              │
│                             │
│ [Upgrade to Tier 2] →       │
└─────────────────────────────┘
```

**Transaction History:**
```
┌─────────────────────────────┐
│ All Transactions [Filter]   │
│                             │
│ Today                       │
│ [...transaction items...]   │
│                             │
│ Yesterday                   │
│ [...transaction items...]   │
│                             │
│ [Load More]                 │
└─────────────────────────────┘
```

**Features:**
- Infinite scroll (pagination)
- Filter by type, status, date range
- Transaction grouping by date
- Tap transaction → detail modal

**API Calls:**
- `GET /wallet`
- `GET /wallet/limits`
- `GET /wallet/transactions?page={n}&limit=20`

---

#### 9. Profile Screen
**Route:** `/(main)/(tabs)/profile`

**Profile Header:**
```
┌─────────────────────────────┐
│      [Avatar with Edit]     │
│                             │
│      John Doe               │
│      john@email.com         │
│      +2348012345678         │
│                             │
│ [✓ Email] [✓ Phone] [Tier 1]│
└─────────────────────────────┘
```

**Menu Sections:**
```
┌─────────────────────────────┐
│ Account                     │
│ → Edit Profile              │
│ → Change Password           │
│ → Transaction PIN           │
│                             │
│ Verification                │
│ → Verify BVN [Tier 2] →     │
│ → Verify NIN [Tier 3] →     │
│                             │
│ Security                    │
│ → Biometric Login [Toggle]  │
│ → Two-Factor Auth (Soon)    │
│                             │
│ Settings                    │
│ → Notifications             │
│ → Theme (Light/Dark/Auto)   │
│ → Language                  │
│                             │
│ Support                     │
│ → Help Center               │
│ → Contact Support           │
│ → Rate App                  │
│                             │
│ [Logout]                    │
│                             │
│ Version 1.0.0               │
└─────────────────────────────┘
```

**API Calls:**
- `GET /users/profile`

---

#### 10. Fund Wallet Screen
**Route:** `/(main)/fund-wallet`

**Options:**
```
┌─────────────────────────────┐
│ Fund Wallet                 │
│                             │
│ Choose Method:              │
│                             │
│ ○ Debit/Credit Card         │
│   Instant (₦50 - ₦2,000 fee)│
│                             │
│ ○ Bank Transfer             │
│   Free (may take 5 mins)    │
│                             │
│ [Continue]                  │
└─────────────────────────────┘
```

**If Card Selected:**
```
┌─────────────────────────────┐
│ Amount                      │
│ ₦ [Input]                   │
│                             │
│ Fee: ₦50                    │
│ Total: ₦10,050              │
│                             │
│ [Proceed to Payment]        │
└─────────────────────────────┘
```

**If Transfer Selected:**
```
┌─────────────────────────────┐
│ Transfer to this account:   │
│                             │
│ Bank: Wema Bank             │
│ Account: 1234567890         │
│ Name: John Doe              │
│                             │
│ [Copy Details]              │
│                             │
│ ⓘ Your wallet will be       │
│   credited automatically    │
└─────────────────────────────┘
```

**Flow:**
1. Select method
2. Enter amount
3. If card → open Paystack WebView
4. After payment → poll verify endpoint
5. Show success/error screen

**API Calls:**
- `POST /transactions/fund/card` → Paystack URL
- `GET /transactions/verify/:reference`
- `GET /transactions/virtual-account`

---

#### 11. Withdraw Screen
**Route:** `/(main)/withdraw`

**Bank Selection:**
```
┌─────────────────────────────┐
│ Withdraw                    │
│                             │
│ Saved Accounts              │
│ ○ GTBank - 0123456789       │
│   John Doe                  │
│                             │
│ + Add New Bank Account      │
│                             │
│ Amount                      │
│ ₦ [Input]                   │
│                             │
│ Fee: ₦25                    │
│ You'll receive: ₦4,975      │
│                             │
│ Transaction PIN             │
│ [PIN Input - 4 digits]      │
│                             │
│ [Withdraw]                  │
└─────────────────────────────┘
```

**Add Bank Account Modal:**
```
┌─────────────────────────────┐
│ Add Bank Account            │
│                             │
│ Bank [Dropdown]             │
│ Account Number              │
│ [Input]                     │
│                             │
│ [Verify Account]            │
│                             │
│ Account Name:               │
│ John Doe ✓                  │
│                             │
│ [Save Account]              │
└─────────────────────────────┘
```

**API Calls:**
- `GET /transactions/banks`
- `POST /transactions/resolve-account`
- `POST /transactions/withdraw`

---

#### 12. Buy Airtime Screen
**Route:** `/(main)/buy-airtime`

```
┌─────────────────────────────┐
│ Buy Airtime                 │
│                             │
│ Network                     │
│ [MTN] [GLO] [Airtel] [9Mobile]│
│                             │
│ Phone Number                │
│ [Input with country code]   │
│ [📱 Contact Picker]         │
│                             │
│ Amount                      │
│ ₦ [Input]                   │
│                             │
│ Quick amounts:              │
│ [100] [200] [500] [1000]    │
│                             │
│ □ Save as beneficiary       │
│                             │
│ Total: ₦500.00              │
│                             │
│ [Purchase Airtime]          │
└─────────────────────────────┘
```

**Features:**
- Auto-detect network from phone number
- Recent/favorite beneficiaries
- Contact picker integration
- Quick amount buttons

**API Calls:**
- `GET /vtu/airtime/providers`
- `POST /vtu/airtime/purchase`

---

#### 13. Buy Data Screen
**Route:** `/(main)/buy-data`

```
┌─────────────────────────────┐
│ Buy Data                    │
│                             │
│ Network                     │
│ [MTN] [GLO] [Airtel] [9Mobile]│
│                             │
│ Phone Number                │
│ [Input]                     │
│                             │
│ Data Plan                   │
│ [Dropdown/Bottom Sheet]     │
│                             │
│ Selected:                   │
│ 1GB - 30 Days - ₦500        │
│                             │
│ Type:                       │
│ ○ Regular  ○ SME (Cheaper)  │
│                             │
│ [Purchase Data]             │
└─────────────────────────────┘
```

**Data Plans Bottom Sheet:**
```
┌─────────────────────────────┐
│ MTN Data Plans              │
│                             │
│ [Search plans...]           │
│                             │
│ ○ 500MB - 30 Days - ₦250    │
│ ○ 1GB - 30 Days - ₦500      │
│ ○ 2GB - 30 Days - ₦900      │
│ ○ 5GB - 30 Days - ₦2,000    │
│                             │
│ SME Plans (Cheaper)         │
│ ○ 1GB - 30 Days - ₦300      │
│ ○ 2GB - 30 Days - ₦600      │
└─────────────────────────────┘
```

**API Calls:**
- `GET /vtu/data/plans/:network`
- `GET /vtu/data/sme-plans/:network`
- `POST /vtu/data/purchase`

---

#### 14. Pay Cable TV Screen
**Route:** `/(main)/pay-cable`

```
┌─────────────────────────────┐
│ Cable TV Subscription       │
│                             │
│ Provider                    │
│ [DStv] [GOtv] [StarTimes]   │
│                             │
│ Smartcard Number            │
│ [Input]                     │
│ [Verify]                    │
│                             │
│ Customer:                   │
│ John Doe ✓                  │
│                             │
│ Package                     │
│ [Dropdown]                  │
│                             │
│ Selected:                   │
│ DStv Compact - ₦10,500      │
│ Valid for 30 days           │
│                             │
│ [Subscribe Now]             │
└─────────────────────────────┘
```

**API Calls:**
- `GET /vtu/cable-tv/plans/:provider`
- `POST /vtu/cable-tv/verify`
- `POST /vtu/cable-tv/pay`

---

#### 15. Pay Electricity Screen
**Route:** `/(main)/pay-electricity`

```
┌─────────────────────────────┐
│ Electricity Payment         │
│                             │
│ DISCO                       │
│ [Dropdown: All providers]   │
│                             │
│ Meter Type                  │
│ ○ Prepaid  ○ Postpaid       │
│                             │
│ Meter Number                │
│ [Input]                     │
│ [Verify]                    │
│                             │
│ Customer:                   │
│ John Doe ✓                  │
│ Address: 123 Street         │
│                             │
│ Amount                      │
│ ₦ [Input]                   │
│                             │
│ [Pay Now]                   │
└─────────────────────────────┘
```

**API Calls:**
- `GET /vtu/electricity/providers`
- `POST /vtu/electricity/verify`
- `POST /vtu/electricity/pay`

---

#### 16. Transaction Details Screen
**Route:** `/(main)/transaction-details/[id]`

```
┌─────────────────────────────┐
│ [< Back]  Transaction       │
│                             │
│      [✓ Success Icon]       │
│                             │
│        ₦10,000.00           │
│                             │
│ Reference                   │
│ TXN_DEP_1699876543210       │
│ [Copy]                      │
│                             │
│ Type                        │
│ Wallet Funding (Card)       │
│                             │
│ Status                      │
│ [✓ Completed]               │
│                             │
│ Date & Time                 │
│ Nov 11, 2025 - 10:30 AM     │
│                             │
│ ────────────────────────    │
│ Amount        ₦10,000.00    │
│ Fee              ₦50.00     │
│ Total        ₦10,050.00     │
│ ────────────────────────    │
│                             │
│ [Download Receipt]          │
│ [Share]                     │
│ [Report Issue]              │
└─────────────────────────────┘
```

**API Calls:**
- `GET /wallet/transactions/:id`

---

#### 17. Notifications Screen
**Route:** `/(main)/notifications`

```
┌─────────────────────────────┐
│ Notifications [Settings]    │
│                             │
│ Filters:                    │
│ [All] [Transactions] [KYC]  │
│                             │
│ Today                       │
│                             │
│ [💰] Wallet Credited        │
│      Your wallet has been   │
│      credited with ₦10,000  │
│      2 hours ago            │
│                             │
│ [📱] Data Purchase Success  │
│      1GB MTN data sent to   │
│      08012345678            │
│      5 hours ago            │
│                             │
│ Yesterday                   │
│                             │
│ [🔐] Account Secured        │
│      Biometric login has    │
│      been enabled           │
│      Yesterday, 3:45 PM     │
└─────────────────────────────┘
```

**Features:**
- Filter by type
- Mark as read
- Clear all
- Pull-to-refresh

**API Calls (Future):**
- `GET /notifications?page=1&limit=20`
- `PUT /notifications/:id/read`

---

#### 18. Forgot Password Screen
**Route:** `/(auth)/forgot-password`

**Layout:**
```
┌─────────────────────────────┐
│         [< Back]            │
│                             │
│   "Forgot Password?"        │
│                             │
│   Don't worry! Enter your   │
│   email and we'll send you  │
│   a reset code.             │
│                             │
│   Email Address             │
│   [Input]                   │
│                             │
│                             │
│   [Send Reset Code]         │
│                             │
│   Remember password?        │
│   [Sign In]                 │
│                             │
└─────────────────────────────┘
```

**Features:**
- Email validation
- Loading state during request
- Success message (code sent)
- Error handling

**API Call:** `POST /auth/forgot-password`

**Success Flow:**
1. Code sent to email
2. Navigate to verify-reset-code screen
3. Show toast: "Reset code sent to your email"

---

#### 19. Verify Reset Code Screen
**Route:** `/(auth)/verify-reset-code`

**Layout:**
```
┌─────────────────────────────┐
│         [< Back]            │
│                             │
│   "Enter Reset Code"        │
│                             │
│  We sent a 6-digit code to  │
│  user@email.com             │
│                             │
│  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]│
│   (6-digit OTP input)       │
│                             │
│   Code expires in 9:45      │
│                             │
│   Didn't receive code?      │
│   Resend (60s)              │
│                             │
│   [Verify Code]             │
│                             │
└─────────────────────────────┘
```

**Features:**
- Auto-focus OTP input
- Countdown timer (10 minutes for expiry)
- Resend code (60s cooldown)
- Auto-submit when 6 digits entered

**API Call:** `POST /auth/verify-reset-code`

**Success Flow:**
1. Code verified
2. Receive reset token
3. Navigate to reset-password screen

---

#### 20. Reset Password Screen
**Route:** `/(auth)/reset-password`

**Layout:**
```
┌─────────────────────────────┐
│         [< Back]            │
│                             │
│   "Create New Password"     │
│                             │
│   Enter your new password   │
│                             │
│   New Password              │
│   [Input with eye toggle]   │
│   [Password strength bar]   │
│                             │
│   Confirm Password          │
│   [Input with eye toggle]   │
│                             │
│   Password must:            │
│   ✓ Be at least 8 chars     │
│   ✓ Have uppercase letter   │
│   ✓ Have lowercase letter   │
│   ✓ Have number or symbol   │
│                             │
│   [Reset Password]          │
│                             │
└─────────────────────────────┘
```

**Features:**
- Real-time password strength indicator
- Password visibility toggle
- Validation checklist
- Matching passwords check

**API Call:** `POST /auth/reset-password`

**Success Flow:**
1. Password reset successfully
2. Show success modal
3. Navigate to login screen
4. Show toast: "Password reset successful. Please login"

---

#### 21. Change Password Screen
**Route:** `/(main)/change-password`

**Layout:**
```
┌─────────────────────────────┐
│ [< Back]  Change Password   │
│                             │
│   Current Password          │
│   [Input with eye toggle]   │
│   Forgot password?          │
│                             │
│   New Password              │
│   [Input with eye toggle]   │
│   [Password strength bar]   │
│                             │
│   Confirm New Password      │
│   [Input with eye toggle]   │
│                             │
│   Password must:            │
│   ✓ Be at least 8 chars     │
│   ✓ Have uppercase letter   │
│   ✓ Have lowercase letter   │
│   ✓ Have number or symbol   │
│                             │
│   [Change Password]         │
│                             │
└─────────────────────────────┘
```

**Features:**
- Verify current password first
- Password strength indicator
- Validation checklist
- Success feedback

**API Call:** `POST /users/change-password`

**Success Flow:**
1. Password changed successfully
2. Show success modal
3. Navigate back to profile
4. Optional: Force re-login for security

---

#### 22. Set Transaction PIN Screen
**Route:** `/(main)/set-pin`

**Layout:**
```
┌─────────────────────────────┐
│ [< Back]  Set Transaction PIN│
│                             │
│   "Secure Your Transactions"│
│                             │
│   Your PIN will be required │
│   for withdrawals and       │
│   purchases.                │
│                             │
│   Create 4-Digit PIN        │
│   [ ]  [ ]  [ ]  [ ]        │
│   (PIN input with dots)     │
│                             │
│   Confirm PIN               │
│   [ ]  [ ]  [ ]  [ ]        │
│                             │
│   Tips:                     │
│   • Don't use 1234 or 0000  │
│   • Don't use birthdate     │
│   • Keep it private         │
│                             │
│   [Set PIN]                 │
│                             │
└─────────────────────────────┘
```

**Features:**
- 4-digit numeric keypad
- PIN masking (show as dots)
- PIN matching validation
- Weak PIN detection (1234, 0000, etc.)
- Haptic feedback

**API Call:** `POST /users/set-pin`

**Success Flow:**
1. PIN set successfully
2. Show success modal
3. Navigate back
4. Enable transaction features

---

#### 23. Change Transaction PIN Screen
**Route:** `/(main)/change-pin`

**Layout:**
```
┌─────────────────────────────┐
│ [< Back]  Change PIN        │
│                             │
│   Current PIN               │
│   [ ]  [ ]  [ ]  [ ]        │
│   Forgot PIN?               │
│                             │
│   New PIN                   │
│   [ ]  [ ]  [ ]  [ ]        │
│                             │
│   Confirm New PIN           │
│   [ ]  [ ]  [ ]  [ ]        │
│                             │
│   [Change PIN]              │
│                             │
└─────────────────────────────┘
```

**Features:**
- Verify current PIN first
- 4-digit numeric inputs
- PIN masking
- Error handling (max 5 attempts)

**API Call:** `POST /users/change-pin`

**Success Flow:**
1. PIN changed successfully
2. Show success modal
3. Navigate back to profile

---

#### 24. Enter PIN Modal (Reusable)
**Component:** `<PINModal />`

**Layout:**
```
┌─────────────────────────────┐
│  Enter Transaction PIN      │
│                             │
│   To complete this purchase │
│   of ₦500.00                │
│                             │
│   [ ]  [ ]  [ ]  [ ]        │
│   (PIN input)               │
│                             │
│   Forgot PIN?               │
│                             │
│   [✓ Numeric Keypad ✓]      │
│   [1] [2] [3]               │
│   [4] [5] [6]               │
│   [7] [8] [9]               │
│   [⌫] [0] [✓]               │
│                             │
└─────────────────────────────┘
```

**Features:**
- Custom numeric keypad
- PIN dots animation
- Biometric option (if enabled)
- Error shake animation
- Auto-close on success

**Usage:**
```typescript
<PINModal
  visible={showPIN}
  amount={500}
  onSuccess={(pin) => handlePurchase(pin)}
  onCancel={() => setShowPIN(false)}
  allowBiometric={true}
/>
```

---

#### 25. Edit Profile Screen
**Route:** `/(main)/edit-profile`

**Layout:**
```
┌─────────────────────────────┐
│ [< Back]  Edit Profile [Save]│
│                             │
│      [Avatar with Camera]   │
│      Tap to change photo    │
│                             │
│   First Name                │
│   [Input: John]             │
│                             │
│   Last Name                 │
│   [Input: Doe]              │
│                             │
│   Email (Verified ✓)        │
│   [Disabled: john@email.com]│
│                             │
│   Phone (Verified ✓)        │
│   [Disabled: +2348012345678]│
│                             │
│   Date of Birth             │
│   [Date Picker: 1990-01-01] │
│                             │
│   Gender                    │
│   [Picker: Male/Female/Other]│
│                             │
│   Address                   │
│   [Input]                   │
│                             │
│   City                      │
│   [Input]                   │
│                             │
│   State                     │
│   [Picker: Lagos, Abuja...] │
│                             │
└─────────────────────────────┘
```

**Features:**
- Avatar upload (camera or gallery)
- Email/Phone locked (verified fields)
- Date picker for DOB
- State dropdown (Nigerian states)
- Auto-save on changes
- Validation

**API Calls:**
- `POST /users/upload-avatar` (when uploading photo)
- `PUT /users/profile` (when saving)

---

#### 26. Verify BVN Screen
**Route:** `/(main)/verify-bvn`

**Layout:**
```
┌─────────────────────────────┐
│ [< Back]  Verify BVN        │
│                             │
│   [Shield Icon]             │
│                             │
│   "Increase Your Limits"    │
│                             │
│   Current Tier: 1           │
│   After Verification: Tier 2│
│                             │
│   Benefits:                 │
│   ✓ Daily: ₦5M (from ₦300K) │
│   ✓ Monthly: ₦20M (from ₦1M)│
│   ✓ Single: ₦1M (from ₦100K)│
│                             │
│   Bank Verification Number  │
│   [Input: 11 digits]        │
│                             │
│   ℹ️ Your BVN is safe and   │
│   encrypted. We comply with │
│   CBN regulations.          │
│                             │
│   [Verify BVN]              │
│                             │
└─────────────────────────────┘
```

**Features:**
- Show current vs new limits
- BVN input (11 digits)
- Security assurance message
- Loading state during verification
- Success animation

**API Call:** `POST /users/verify-bvn`

**Success Flow:**
1. BVN verified
2. KYC tier upgraded to TIER_2
3. Show success modal with new limits
4. Confetti animation
5. Navigate back to profile

---

#### 27. Verify NIN Screen
**Route:** `/(main)/verify-nin`

**Layout:**
```
┌─────────────────────────────┐
│ [< Back]  Verify NIN        │
│                             │
│   [Shield Icon]             │
│                             │
│   "Unlock Full Access"      │
│                             │
│   Current Tier: 2           │
│   After Verification: Tier 3│
│                             │
│   Benefits:                 │
│   ✓ Unlimited daily limit   │
│   ✓ Unlimited monthly limit │
│   ✓ Unlimited per transaction│
│   ✓ Premium support         │
│                             │
│   National Identity Number  │
│   [Input: 11 digits]        │
│                             │
│   ℹ️ Your NIN is encrypted  │
│   and secure.               │
│                             │
│   [Verify NIN]              │
│                             │
└─────────────────────────────┘
```

**API Call:** `POST /users/verify-nin`

**Success Flow:**
1. NIN verified
2. KYC tier upgraded to TIER_3
3. Show premium success modal
4. Navigate back to profile

---

#### 28. Settings Screen
**Route:** `/(main)/settings`

**Layout:**
```
┌─────────────────────────────┐
│ [< Back]  Settings          │
│                             │
│ Appearance                  │
│ → Theme                     │
│   [Light | Dark | Auto]     │
│                             │
│ Security                    │
│ → Biometric Login           │
│   [Toggle: ON]              │
│ → Transaction PIN           │
│   [Change PIN]              │
│ → Two-Factor Auth           │
│   [Coming Soon]             │
│                             │
│ Notifications               │
│ → Push Notifications        │
│   [Toggle: ON]              │
│ → Transaction Alerts        │
│   [Toggle: ON]              │
│ → Promotional Emails        │
│   [Toggle: OFF]             │
│                             │
│ Preferences                 │
│ → Language                  │
│   English (Nigeria)         │
│ → Currency Display          │
│   ₦ (Naira)                 │
│                             │
│ About                       │
│ → Privacy Policy            │
│ → Terms of Service          │
│ → Licenses                  │
│ → App Version               │
│   1.0.0 (Build 1)           │
│                             │
└─────────────────────────────┘
```

**Features:**
- Theme switcher (immediate effect)
- Biometric toggle (test before enabling)
- Push notification preferences
- Legal documents (WebView)

---

#### 29. Success/Error Modals (Reusable Components)

**Success Modal:**
```
┌─────────────────────────────┐
│                             │
│   [✓ Animated Checkmark]    │
│   [Confetti Animation]      │
│                             │
│   "Payment Successful!"     │
│                             │
│   ₦500.00 MTN Airtime has   │
│   been sent to 08012345678  │
│                             │
│   [View Receipt]            │
│   [Done]                    │
│                             │
└─────────────────────────────┘
```

**Error Modal:**
```
┌─────────────────────────────┐
│                             │
│   [✗ Error Icon]            │
│                             │
│   "Payment Failed"          │
│                             │
│   Insufficient balance.     │
│   Please fund your wallet.  │
│                             │
│   [Fund Wallet]             │
│   [Cancel]                  │
│                             │
└─────────────────────────────┘
```

**Features:**
- Lottie animations
- Auto-dismiss option
- Action buttons
- Haptic feedback

---

## User Flows

### Flow 1: Complete Onboarding (First-Time User)

```
1. Open App
   ↓
2. Welcome Screen
   ↓ [Tap "Create Account"]
3. Register Screen
   - Fill form
   - Submit
   ↓
4. API: POST /auth/register
   ↓ Success
5. Auto-send email verification
   ↓
6. Verify Email Screen
   - Enter 6-digit code
   - Submit
   ↓
7. API: POST /users/verify-email
   ↓ Success
8. Auto-send SMS verification
   ↓
9. Verify Phone Screen
   - Enter 6-digit code
   - Submit
   ↓
10. API: POST /users/verify-phone
    ↓ Success (KYC Tier 1 achieved)
11. Show success modal
    ↓
12. Navigate to Home Screen
    ↓
13. Show app tour (first-time)
```

**Time to completion:** ~3-5 minutes

---

### Flow 2: Returning User Login

```
1. Open App
   ↓
2. Check secure storage for token
   ↓ Token exists & valid
3. Check biometrics enabled
   ↓ Yes
4. Show biometric prompt
   ↓ Success
5. API: GET /auth/me (validate token)
   ↓ Success
6. Load user data from cache
   ↓
7. Show Home Screen (with cached data)
   ↓
8. Background: Refresh balance, transactions
```

**Time to completion:** < 2 seconds

---

### Flow 3: Fund Wallet with Card

```
1. Home Screen
   ↓ [Tap "Add Money"]
2. Fund Wallet Screen
   ↓ [Select "Card"]
3. Enter Amount
   ↓ [Tap "Proceed"]
4. API: POST /transactions/fund/card
   ↓ Success (returns Paystack URL)
5. Open WebView (Paystack)
   ↓
6. User enters card details
   ↓ Payment success (redirect)
7. Detect redirect URL
   ↓
8. API: GET /transactions/verify/:reference
   ↓ Success
9. Close WebView
   ↓
10. Show success modal
    - Confetti animation
    - New balance
    ↓
11. Update local wallet balance
    ↓
12. Navigate back to Home
```

---

### Flow 4: Buy Data Bundle

```
1. Services Screen
   ↓ [Tap "Data"]
2. Buy Data Screen
   ↓
3. Select network (MTN)
   ↓
4. API: GET /vtu/data/plans/mtn
   ↓ Success (load plans)
5. Enter phone number
   ↓
6. Select data plan (1GB - ₦500)
   ↓
7. Choose type (SME)
   ↓
8. Review order
   ↓ [Tap "Purchase"]
9. Show PIN modal
   ↓
10. Enter 4-digit PIN
    ↓
11. API: POST /vtu/data/purchase
    ↓ Success (order created)
12. Show processing modal
    ↓
13. Poll order status OR wait for webhook
    ↓ Completed
14. Show success modal
    - Token sent to 08012345678
    ↓
15. Navigate to receipt screen
```

---

### Flow 5: Upgrade KYC to Tier 2

```
1. Profile Screen
   ↓ [Tap "Verify BVN"]
2. BVN Verification Screen
   ↓
3. Show information modal
   - Why we need BVN
   - What you'll get (higher limits)
   ↓
4. Enter BVN (11 digits)
   ↓ [Tap "Verify"]
5. API: POST /users/verify-bvn
   ↓ Success
6. Show success modal
   - New limits
   - Tier badge
   ↓
7. Update local user data
   ↓
8. Navigate back to Profile
```

---

## State Management Strategy

### Zustand Stores

#### 1. Auth Store
```typescript
// store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setTokens: (access: string, refresh: string) => void;
  clearTokens: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setTokens: (access, refresh) => set({
        accessToken: access,
        refreshToken: refresh,
        isAuthenticated: true,
      }),

      clearTokens: () => set({
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      }),

      logout: async () => {
        // Clear all stores
        set({ accessToken: null, refreshToken: null, isAuthenticated: false });
        // Clear React Query cache
        queryClient.clear();
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

#### 2. User Store
```typescript
// store/user.store.ts
interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

#### 3. Wallet Store
```typescript
// store/wallet.store.ts
interface WalletState {
  balance: number;
  ledgerBalance: number;
  dailySpent: number;
  monthlySpent: number;
  dailyLimit: number;
  monthlyLimit: number;
  isBalanceVisible: boolean;

  setWallet: (data: WalletData) => void;
  toggleBalanceVisibility: () => void;
}
```

#### 4. Theme Store
```typescript
// store/theme.store.ts
type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}
```

---

### React Query Configuration

```typescript
// lib/api/query-client.ts
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes
      gcTime: 1000 * 60 * 60 * 24,     // 24 hours
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_CACHE',
});
```

**Key Queries:**

```typescript
// features/wallet/hooks/useWallet.ts
export const useWallet = () => {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data } = await apiClient.get('/wallet');
      return data;
    },
    staleTime: 1000 * 60, // 1 minute (frequent updates)
  });
};

// features/transactions/hooks/useTransactions.ts
export const useTransactions = (page = 1, limit = 20) => {
  return useInfiniteQuery({
    queryKey: ['transactions'],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get('/wallet/transactions', {
        params: { page: pageParam, limit },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined;
    },
  });
};

// features/vtu/hooks/useDataPlans.ts
export const useDataPlans = (network: string) => {
  return useQuery({
    queryKey: ['dataPlans', network],
    queryFn: async () => {
      const { data } = await apiClient.get(`/vtu/data/plans/${network}`);
      return data;
    },
    enabled: !!network,
    staleTime: 1000 * 60 * 60, // 1 hour (rarely changes)
  });
};
```

**Mutations:**

```typescript
// features/vtu/hooks/usePurchaseData.ts
export const usePurchaseData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PurchaseDataPayload) => {
      const { data } = await apiClient.post('/vtu/data/purchase', payload);
      return data;
    },
    onSuccess: () => {
      // Invalidate wallet & transactions
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['vtuOrders'] });
    },
  });
};
```

---

## API Integration Strategy

### Axios Instance with Interceptors

```typescript
// lib/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { secureStorage } from '@/lib/storage/secure-store';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.raverpay.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (handle errors, refresh token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Refresh access token
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Update tokens
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        // Refresh failed → logout
        useAuthStore.getState().clearTokens();
        router.replace('/(auth)/login');
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);
```

---

### API Error Handling

```typescript
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    const { status, data } = error.response;

    return new ApiError(
      status,
      data.message || 'An error occurred',
      data.errors
    );
  }

  if (error.request) {
    return new ApiError(0, 'Network error. Please check your connection.');
  }

  return new ApiError(0, error.message || 'Unknown error');
};
```

---

## Security & Data Persistence

### 1. Secure Token Storage

```typescript
// lib/storage/secure-store.ts
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    return await SecureStore.getItemAsync(key);
  },

  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
};

// Keys
export const SECURE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  PIN: 'transaction_pin',
  BIOMETRIC_PUBLIC_KEY: 'biometric_key',
};
```

---

### 2. Biometric Authentication

```typescript
// lib/auth/biometrics.ts
import * as LocalAuthentication from 'expo-local-authentication';

export const biometrics = {
  async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  async getSupportedTypes(): Promise<string[]> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'face';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'iris';
        default:
          return 'unknown';
      }
    });
  },

  async authenticate(reason: string = 'Authenticate to continue'): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use PIN',
    });

    return result.success;
  },
};
```

---

### 3. Data Persistence Strategy

**What to Store:**

| Data | Storage | Cache | Reason |
|------|---------|-------|--------|
| Access Token | SecureStore | No | Sensitive |
| Refresh Token | SecureStore | No | Sensitive |
| User Profile | AsyncStorage | Yes | Offline access |
| Wallet Balance | AsyncStorage | Yes | Show on startup |
| Transactions | React Query Cache | Yes | Pagination |
| Settings | AsyncStorage | No | Preferences |
| Biometric Enabled | AsyncStorage | No | User choice |

**Cache Strategy:**

```typescript
// On app startup:
1. Load user data from AsyncStorage (instant UI)
2. Check token validity
3. If valid:
   - Show cached data
   - Fetch fresh data in background
   - Update UI when loaded
4. If invalid:
   - Try refresh token
   - If fails → logout
```

---

### 4. Offline Support

```typescript
// hooks/useOffline.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  return { isOffline };
};
```

**Offline UX:**
- Show offline banner
- Disable transaction buttons
- Allow viewing cached data
- Queue mutations (future enhancement)

---

## Performance Optimization

### 1. Fast App Startup

**Target:** < 2 seconds cold start

**Strategies:**
```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });

  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // ...
}
```

**Optimization Checklist:**
- ✅ Use Hermes engine (enabled by default in Expo 52)
- ✅ Lazy load screens with React.lazy()
- ✅ Optimize images with expo-image
- ✅ Use FlatList instead of ScrollView for long lists
- ✅ Memoize expensive components
- ✅ Debounce search inputs

---

### 2. List Performance

```typescript
// components/TransactionList.tsx
import { FlashList } from '@shopify/flash-list';

export const TransactionList = ({ data }) => {
  return (
    <FlashList
      data={data}
      renderItem={({ item }) => <TransactionItem transaction={item} />}
      estimatedItemSize={80}
      keyExtractor={(item) => item.id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
    />
  );
};
```

**Note:** Use FlashList instead of FlatList for better performance

---

### 3. Image Optimization

```typescript
// Use expo-image instead of Image
import { Image } from 'expo-image';

<Image
  source={{ uri: user.avatar }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

---

### 4. Animation Performance

```typescript
// Use Reanimated for 60fps animations
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

const scale = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

// Run on UI thread (not JS thread)
```

---

## Push Notifications

### 1. OneSignal Setup

```typescript
// app/_layout.tsx
import OneSignal from 'react-native-onesignal';

export default function RootLayout() {
  useEffect(() => {
    // OneSignal initialization
    OneSignal.setAppId(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!);

    // Request permission (iOS)
    OneSignal.promptForPushNotificationsWithUserResponse();

    // Notification received handler
    OneSignal.setNotificationWillShowInForegroundHandler(notification => {
      console.log('Notification received:', notification);
      // Display in-app notification
    });

    // Notification opened handler
    OneSignal.setNotificationOpenedHandler(notification => {
      console.log('Notification opened:', notification);
      // Navigate to relevant screen
      const { type, id } = notification.notification.additionalData;

      if (type === 'transaction') {
        router.push(`/transaction-details/${id}`);
      }
    });

    // Get player ID (user's device ID)
    OneSignal.setExternalUserId(user.id);
  }, []);
}
```

---

### 2. Notification Types

```typescript
interface NotificationPayload {
  type: 'transaction' | 'kyc' | 'security' | 'promotional';
  title: string;
  message: string;
  data: {
    transactionId?: string;
    amount?: number;
    // ...
  };
}
```

**Example Notifications:**
- Transaction completed
- Wallet funded
- KYC verified
- Withdrawal successful
- Low balance alert
- Security alert

---

## Testing Strategy

### 1. Unit Tests (Jest)

```typescript
// __tests__/utils/formatters.test.ts
import { formatCurrency, formatPhone } from '@/lib/utils/formatters';

describe('formatCurrency', () => {
  it('should format NGN correctly', () => {
    expect(formatCurrency(1000)).toBe('₦1,000.00');
    expect(formatCurrency(1234567.89)).toBe('₦1,234,567.89');
  });
});
```

---

### 2. Component Tests (React Native Testing Library)

```typescript
// __tests__/components/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('should call onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={onPress} />
    );

    fireEvent.press(getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={onPress} disabled />
    );

    fireEvent.press(getByText('Click Me'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

---

### 3. E2E Tests (Detox - Optional)

```typescript
// e2e/auth.test.ts
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should register a new user', async () => {
    await element(by.id('create-account-btn')).tap();
    await element(by.id('first-name-input')).typeText('John');
    await element(by.id('last-name-input')).typeText('Doe');
    await element(by.id('email-input')).typeText('john@example.com');
    await element(by.id('register-btn')).tap();

    await expect(element(by.text('Verify your email'))).toBeVisible();
  });
});
```

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Core architecture + authentication

**Tasks:**
- [ ] Project setup (Expo, NativeWind, dependencies)
- [ ] Design system (colors, typography, spacing)
- [ ] Base components (Button, Input, Text, Card)
- [ ] API client setup (Axios, interceptors)
- [ ] Auth screens (Welcome, Login, Register)
- [ ] OTP verification screens
- [ ] Auth state management (Zustand)
- [ ] Biometric authentication
- [ ] Splash screen & app icon

**Deliverable:** Fully functional auth flow

---

### Phase 2: Core Features (Week 3-4)
**Goal:** Wallet & dashboard

**Tasks:**
- [ ] Home/Dashboard screen
- [ ] Wallet screen
- [ ] Transaction history (with pagination)
- [ ] Transaction details modal
- [ ] Profile screen
- [ ] Edit profile
- [ ] Change password
- [ ] Pull-to-refresh
- [ ] Loading skeletons
- [ ] Error handling
- [ ] Toast notifications

**Deliverable:** Complete wallet management

---

### Phase 3: Funding & Withdrawals (Week 5)
**Goal:** Money in/out

**Tasks:**
- [ ] Fund wallet screen
- [ ] Paystack WebView integration
- [ ] Payment verification
- [ ] Virtual account display
- [ ] Withdraw screen
- [ ] Bank account management
- [ ] Account name resolution
- [ ] Transaction PIN system (API needed)
- [ ] Success/error animations

**Deliverable:** Functional funding & withdrawals

---

### Phase 4: VTU Services (Week 6-8)
**Goal:** Bill payments

**Tasks:**
- [ ] Services screen
- [ ] Buy airtime screen
- [ ] Buy data screen (with plans bottom sheet)
- [ ] Pay cable TV screen
- [ ] Pay electricity screen
- [ ] Beneficiary management
- [ ] Order history
- [ ] Receipt generation
- [ ] Retry failed orders

**Deliverable:** All VTU services working

---

### Phase 5: KYC & Profile (Week 9)
**Goal:** Identity verification

**Tasks:**
- [ ] BVN verification screen
- [ ] NIN verification screen
- [ ] Profile picture upload (API needed)
- [ ] KYC tier badges
- [ ] Limit visualization
- [ ] Settings screen
- [ ] Theme switcher (light/dark)
- [ ] Notification preferences

**Deliverable:** Complete profile management

---

### Phase 6: Polish & Optimization (Week 10-11)
**Goal:** Production-ready

**Tasks:**
- [ ] Animations & transitions
- [ ] Haptic feedback
- [ ] Dark mode refinement
- [ ] Offline handling
- [ ] Error boundaries
- [ ] Performance optimization
- [ ] Push notifications setup
- [ ] App tour (first-time users)
- [ ] Empty states
- [ ] Loading states
- [ ] Lottie animations

**Deliverable:** Polished user experience

---

### Phase 7: Testing & Deployment (Week 12)
**Goal:** Launch

**Tasks:**
- [ ] Unit tests (critical functions)
- [ ] Component tests
- [ ] Manual testing (all flows)
- [ ] Bug fixes
- [ ] App Store assets (screenshots, description)
- [ ] Privacy policy & terms
- [ ] TestFlight/Internal Testing beta
- [ ] Final QA
- [ ] App Store submission
- [ ] Google Play submission

**Deliverable:** Live on stores

---

## API Requirements

### Critical Endpoints Needed Before Launch

#### 1. Transaction PIN System (HIGH PRIORITY)
```typescript
POST /users/set-pin
Body: { pin: "1234", confirmPin: "1234" }
Response: { success: true }

POST /users/verify-pin
Body: { pin: "1234" }
Response: { valid: true }

POST /users/change-pin
Body: { currentPin: "1234", newPin: "5678" }
Response: { success: true }

// All withdrawal & VTU endpoints should accept:
Body: { ..., pin: "1234" }
```

**Why:** Security requirement for transactions

---

#### 2. Password Reset Flow
```typescript
POST /auth/forgot-password
Body: { email: "user@example.com" }
Response: { message: "Reset code sent" }

POST /auth/verify-reset-code
Body: { email: "user@example.com", code: "123456" }
Response: { resetToken: "..." }

POST /auth/reset-password
Body: { resetToken: "...", newPassword: "..." }
Response: { success: true }
```

**Why:** Users will forget passwords

---

#### 3. Profile Picture Upload
```typescript
POST /users/upload-avatar
Content-Type: multipart/form-data
Body: FormData { file: <image> }
Response: { avatarUrl: "https://..." }

DELETE /users/avatar
Response: { success: true }
```

**Why:** User personalization

---

#### 4. Notifications Endpoints
```typescript
GET /notifications?page=1&limit=20&type=TRANSACTION
Response: {
  notifications: [...],
  pagination: { page, limit, total, hasMore }
}

PUT /notifications/:id/read
Response: { success: true }

PUT /notifications/read-all
Response: { count: 10 }

DELETE /notifications/:id
Response: { success: true }
```

**Why:** In-app notification center

---

### Nice-to-Have Endpoints (Phase 2)

#### 5. Wallet Transfer (P2P)
```typescript
POST /wallet/transfer
Body: {
  recipientIdentifier: "email or phone",
  amount: 5000,
  pin: "1234",
  narration: "Payment for..."
}
Response: { transaction: {...} }
```

#### 6. Beneficiary Management
```typescript
GET /beneficiaries?serviceType=AIRTIME
Response: { beneficiaries: [...] }

POST /beneficiaries
Body: {
  serviceType: "DATA",
  name: "Mom",
  phone: "08012345678",
  network: "MTN"
}

DELETE /beneficiaries/:id
```

#### 7. Transaction Export
```typescript
GET /wallet/transactions/export?format=csv&from=2025-01-01&to=2025-12-31
Response: CSV file download
```

---

## Additional Recommendations

### 1. App Icon & Splash Screen

**Icon Requirements:**
- iOS: 1024x1024px (no alpha channel)
- Android: 512x512px (adaptive icon)

**Colors:**
- Use brand purple (#8B5CF6)
- Simple, recognizable symbol (₦ or wallet icon)

**Splash Screen:**
- Logo + brand name
- Same background as app theme
- Smooth transition to first screen

---

### 2. App Store Optimization

**App Name:**
- "RaverPay - Digital Wallet"

**Subtitle:**
- "Airtime, Bills & Transfers"

**Keywords:**
- wallet, airtime, data, bills, cable, electricity, transfer, payment

**Description:**
- Lead with value proposition
- Highlight key features
- Mention security
- Include social proof (when available)

---

### 3. Compliance & Legal

**Required Pages:**
- Privacy Policy
- Terms of Service
- Cookie Policy (if web version)

**In-App:**
- Delete account option
- Data export option
- Cookie preferences

---

### 4. Analytics & Monitoring

**Recommended Tools:**
- Sentry (error tracking)
- Mixpanel/Amplitude (analytics)
- Firebase Crashlytics

**Key Metrics:**
- Registration completion rate
- Verification completion rate
- Transaction success rate
- Average session duration
- Retention (D1, D7, D30)

---

## Conclusion

This specification provides a complete blueprint for building a **production-grade fintech mobile app**. The architecture is:

✅ **Scalable** - Feature-based structure
✅ **Performant** - Optimized for 60fps
✅ **Secure** - Biometrics, Keychain, PIN
✅ **Offline-first** - Cached data, background sync
✅ **User-friendly** - iOS-inspired design, smooth animations
✅ **Maintainable** - TypeScript, clean code, tests

**Next Steps:**
1. Review this document
2. Set up the project
3. Build design system components
4. Implement authentication flow
5. Iterate on features

**Estimated Timeline:** 10-12 weeks to MVP
**Team Size:** 1-2 developers

Happy building! 🚀
