# IngantaPay Migration Phases

This folder contains the structured implementation plan for migrating the RaverPay codebase to IngantaPay.

## Phase Overview

| Phase | Name                                                                      | Status         | Priority |
| ----- | ------------------------------------------------------------------------- | -------------- | -------- |
| 1     | [Codebase Renaming & Branding](./Phase-1-Renaming/README.md)              | 🔴 Not Started | Critical |
| 2     | [Splash, Onboarding, Welcome & Auth](./Phase-2-Auth-Onboarding/README.md) | 🔴 Not Started | Critical |
| 3     | [Home Screen / Dashboard](./Phase-3-Home-Screen/README.md)                | 🔴 Not Started | High     |
| 4     | [Profile & Settings](./Phase-4-Profile-Settings/README.md)                | 🔴 Not Started | High     |
| 5     | [Infrastructure Migration (AWS)](./Phase-5-Infrastructure/README.md)      | 🔴 Not Started | Medium   |

## Future Phases (Pending New Designs)

| Phase | Name                               | Status                 |
| ----- | ---------------------------------- | ---------------------- |
| 6     | Add Money / Fund Wallet            | ⏸️ Waiting for Designs |
| 7     | Transfer / Send Money              | ⏸️ Waiting for Designs |
| 8     | Circle Wallet Integration          | ⏸️ Waiting for Designs |
| 9     | VTU Services (Airtime, Data, etc.) | ⏸️ Waiting for Designs |
| 10    | Crypto Features                    | ⏸️ Waiting for Designs |

## How to Use This Documentation

Each phase folder contains:

- **README.md** - Overview of the phase
- **Tasks.md** - Detailed task breakdown with checklists
- **Progress.md** - Track completion status
- **Comparison.md** - Current vs. Target state comparison tables

## Rules for AI Agents

Before working on any phase:

1. Read the corresponding phase documentation completely
2. Read the codebase rules in `/IngantaPay/Rules/`
3. Check the current implementation before making changes
4. Respect existing patterns (theme, components, prisma workaround, etc.)
5. Comment out removed code with `// OLD_RAVERPAY:` label
6. Never remove anything without user confirmation

## Key Principles

### 1. Respect Existing Patterns

- **Colors**: Use `/apps/raverpay-mobile/src/constants/colors.ts`
- **Components**: Use existing reusable components in `/apps/raverpay-mobile/src/components/ui/`
- **Typography**: Use `/apps/raverpay-mobile/src/constants/typography.ts`
- **Backend**: Follow NestJS patterns in existing codebase
- **Database**: Follow Prisma workaround patterns (SQL files in `/apps/raverpay-api/prisma/`)

### 2. Dark Mode / Light Mode

The app supports both themes. When updating colors, update BOTH `light` and `dark` sections in `colors.ts`.

### 3. Commenting Out vs. Deleting

When removing features:

```typescript
// OLD_RAVERPAY: Biometric login button removed per IngantaPay designs
// <BiometricButton onPress={handleBiometric} />
```

### 4. Naming Convention

- App folder: `raverpay-mobile` → `mobile`
- API folder: `raverpay-api` → `api`
- Admin folder: `raverpay-admin` → `admin`
- Brand name: "RaverPay" → "Inganta Pay"
- Colors: Purple (#5B55F6) → Red (#C41E3A)
