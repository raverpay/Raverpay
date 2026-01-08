# IngantaPay Mobile App Rules

These rules MUST be followed by any AI agent working on the IngantaPay mobile app codebase.

---

## 1. Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab navigation
│   ├── circle/            # Circle wallet screens
│   └── [other screens]    # Feature screens
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # Base UI components
│   │   ├── wallet/       # Wallet-specific components
│   │   └── [others]      # Feature-specific components
│   ├── constants/         # Theme, colors, typography
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API clients
│   ├── services/         # API service functions
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions
├── assets/               # Static assets
└── app.config.js         # Expo configuration
```

---

## 2. Theme & Styling Rules

### ALWAYS Use Centralized Colors
- Colors are defined in `src/constants/colors.ts`
- NEVER hardcode color values in components
- When updating brand colors, update `colors.ts` first

```typescript
// ❌ WRONG
<View style={{ backgroundColor: '#C41E3A' }}>

// ✅ CORRECT
import { colors } from '@/src/constants/colors';
<View style={{ backgroundColor: colors.light.primary[500] }}>
```

### Support Dark Mode
- Always consider both light and dark themes
- Use `useTheme()` hook when needed
- Test changes in both modes

### Typography
- Typography is defined in `src/constants/typography.ts`
- Use the `Text` component from `src/components/ui/Text.tsx`
- Never create inline text styles

```typescript
// ✅ CORRECT
<Text variant="h1" weight="bold">Title</Text>
<Text variant="body" className="text-gray-400">Subtitle</Text>
```

---

## 3. Component Rules

### Use Existing Components
Before creating new components, check if these exist:
- `Button` - For all button actions
- `Input` - For all text inputs
- `Card` - For card containers
- `Text` - For all text
- `ScreenHeader` - For screen headers
- `BottomSheet` - For bottom sheets
- `Skeleton` - For loading states
- `PINModal` - For PIN entry
- `ConfirmationModal` - For confirmations

### Component Location
- UI components go in `src/components/ui/`
- Feature components go in `src/components/[feature]/`
- Screen-specific components stay in the screen file

### Component Exports
- All UI components should be exported from `src/components/ui/index.ts`

---

## 4. State Management Rules

### Use Zustand Stores
- Stores are in `src/store/`
- Each store should be a separate file
- Use persistence only when needed

### Existing Stores
- `auth-store.ts` - Authentication state
- `user-store.ts` - User data
- `wallet-store.ts` - Wallet data
- `onboarding-store.ts` - Onboarding state

### Adding New State
```typescript
// src/store/[name]-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MyState {
  value: string;
  setValue: (v: string) => void;
}

export const useMyStore = create<MyState>()(
  persist(
    (set) => ({
      value: '',
      setValue: (v) => set({ value: v }),
    }),
    {
      name: 'my-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## 5. API Integration Rules

### API Client
- Use the API client in `src/lib/api-client.ts`
- Never create axios instances elsewhere
- Handle errors consistently

### Service Functions
- Create service functions in `src/services/`
- Group by feature (auth.service.ts, wallet.service.ts)
- Return typed responses

### React Query
- Use React Query for server state
- Hooks should be in `src/hooks/`
- Cache appropriately

```typescript
// src/hooks/useMyData.ts
export function useMyData() {
  return useQuery({
    queryKey: ['my-data'],
    queryFn: () => myService.getData(),
  });
}
```

---

## 6. Navigation Rules

### Use Expo Router
- Screens go in `app/` directory
- Use typed routes when possible
- Protect authenticated routes

### Navigation Patterns
```typescript
import { router } from 'expo-router';

// Navigate
router.push('/screen-name');
router.replace('/screen-name');

// With params
router.push({
  pathname: '/screen-name',
  params: { id: '123' },
});

// Go back
router.back();
```

---

## 7. Form Handling Rules

### Use React Hook Form + Zod
- Forms use `react-hook-form`
- Validation uses `zod` schemas
- Controller pattern for inputs

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

const { control, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});

<Controller
  control={control}
  name="email"
  render={({ field: { onChange, value }, fieldState: { error } }) => (
    <Input
      value={value}
      onChangeText={onChange}
      error={error?.message}
    />
  )}
/>
```

---

## 8. Code Style Rules

### TypeScript
- Always use TypeScript
- Define types in `src/types/`
- Avoid `any` - use `unknown` if needed

### Naming Conventions
- Components: PascalCase (`MyComponent.tsx`)
- Hooks: camelCase with `use` prefix (`useMyHook.ts`)
- Constants: SCREAMING_SNAKE_CASE
- Functions: camelCase

### File Naming
- Components: `ComponentName.tsx`
- Hooks: `useHookName.ts`
- Types: `feature.types.ts`
- Services: `feature.service.ts`

---

## 9. Comment Patterns

### Removing Code
```typescript
// OLD_RAVERPAY: Description of what this was
// <ComponentThatWasRemoved prop={value} />
```

### TODO Comments
```typescript
// TODO: Description of what needs to be done
// FIXME: Description of bug to fix
```

### Section Comments
```typescript
// ===============================
// SECTION: Authentication
// ===============================
```

---

## 10. Testing Checklist

Before committing changes:
- [ ] App builds without errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator
- [ ] Dark mode tested
- [ ] Loading states work
- [ ] Error states handled

---

## 11. Common Imports

```typescript
// Navigation
import { router, useLocalSearchParams } from 'expo-router';

// Components
import { Text, Button, Input, Card } from '@/src/components/ui';

// Hooks
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';

// Stores
import { useUserStore } from '@/src/store/user-store';
import { useWalletStore } from '@/src/store/wallet-store';

// Constants
import { colors } from '@/src/constants/colors';
import { typography } from '@/src/constants/typography';

// Icons
import { Ionicons } from '@expo/vector-icons';
```

---

## 12. IngantaPay Specific

### Brand Colors
```typescript
primary: '#C41E3A'   // Red
primaryDark: '#991B1B'
primaryLight: '#DC2626'
background: '#0A0A0A' // Black (auth screens)
card: '#2A2A2A'       // Dark gray
accent: '#F59E0B'     // Yellow (links)
```

### Brand Name
- Always use "Inganta Pay" (with space)
- App name in config: "Inganta Pay"
- Package identifier: "com.ingantapay.app"
