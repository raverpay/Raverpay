# Phase 3: Home Screen / Dashboard

## Overview

This phase focuses on completely redesigning the home screen (dashboard) to match the IngantaPay dark theme with red accents. This includes the header with balance display, quick actions, utilities section, and recent transactions.

## Objectives

1. Redesign header with red gradient background
2. Integrate balance display into header card
3. Add Mosaic Code / virtual account display
4. Redesign utilities & services section (5 cards in 2-column grid)
5. Redesign transaction list with dark theme
6. Update bottom navigation styling
7. Add wave pattern overlay (optional)

## Scope

### Mobile App Updates
| Component | File Path | Changes |
|-----------|-----------|---------|
| Home Screen | `app/(tabs)/index.tsx` | Complete redesign |
| Tab Layout | `app/(tabs)/_layout.tsx` | Update tab bar styling |
| Transaction Item | `src/components/wallet/TransactionItem.tsx` | Dark theme styling |

### Component Updates
| Component | Changes |
|-----------|---------|
| Header | Red gradient, integrated balance card |
| Balance Display | White text on transparent card |
| Quick Actions | "Add Money" + "Send Money" buttons |
| Utilities Grid | 5 cards in 2-column layout |
| Transaction List | Dark rounded cards |

## Timeline Estimate
- **Estimated Duration**: 6-8 hours
- **Risk Level**: Low

## Dependencies
- Phase 1 (Renaming) complete
- Phase 2 (Theme colors) complete

## AI Analysis Source
All designs are based on:
- `/IngantaPay/Analysis/04 - HOME SCREEN (DASHBOARD)/`

## Key Design Changes

### Header Section
- Background: Red gradient (#8B1C1C → #C41E3A)
- Height: ~320px
- Content: Greeting, icons, balance card
- Wave pattern overlay (optional)

### Balance Card (Inside Header)
- Background: rgba(255,255,255,0.15) with blur
- Border: 1px rgba(255,255,255,0.2)
- Rounded corners (24px)
- Contains: Balance, visibility toggle, Mosaic Code, action buttons

### Utilities Section
- 5 service cards in 2-column grid
- Cards: Dark gray (#2A2A2A), 16px radius
- Icon containers with arrow buttons
- Services: Airtime, Data, Electricity, TV, Water

### Recent Transactions
- Dark rounded cards per transaction
- Icon circles: Blue (outgoing) / Green (incoming)
- Amount: Green (+) / Red (-)
