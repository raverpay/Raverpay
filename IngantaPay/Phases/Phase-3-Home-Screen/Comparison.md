# Phase 3: Current vs. Target Comparison

## Header Section

| Element    | Current                | Target                                 |
| ---------- | ---------------------- | -------------------------------------- |
| Background | Purple (#5B55F6)       | Red gradient (#8B1C1C → #C41E3A)       |
| Shape      | Rounded bottom corners | Rectangular with internal rounded card |
| Height     | Variable               | ~320px                                 |
| Pattern    | None                   | Wave pattern overlay (optional)        |

### Header Content

| Element            | Current                | Target                         |
| ------------------ | ---------------------- | ------------------------------ |
| Greeting           | "Welcome back, [Name]" | Same, white text               |
| Icons (right)      | Notifications only     | Gift + Notifications + Profile |
| Notification badge | Current style          | Red badge with count           |
| Profile picture    | Not in header          | Add 40x40px circular           |

## Balance Display

| Element         | Current                    | Target                                    |
| --------------- | -------------------------- | ----------------------------------------- |
| Position        | Separate card below header | Integrated into header                    |
| Card background | White/light                | Semi-transparent (rgba(255,255,255,0.15)) |
| Card border     | Light                      | 1px rgba(255,255,255,0.2)                 |
| Balance text    | Dark text                  | White text                                |
| Eye icon        | Current style              | White, in circular container              |
| Currency symbol | ₦                          | ₦ (keep)                                  |

### Mosaic Code (New)

| Element     | Current        | Target                           |
| ----------- | -------------- | -------------------------------- |
| Display     | Does not exist | "Mosaic Code: XXX - XXXX - XXXX" |
| Icon        | N/A            | Hand icon                        |
| Copy button | N/A            | Copy icon with haptic feedback   |
| Position    | N/A            | Inside balance card              |

## Quick Action Buttons

| Element    | Current              | Target                   |
| ---------- | -------------------- | ------------------------ |
| Layout     | Multiple cards/icons | 2 buttons side by side   |
| Button 1   | Various              | "Add Money"              |
| Button 2   | Various              | "Send Money"             |
| Background | Colored              | White                    |
| Text color | White                | Red (#C41E3A)            |
| Icons      | Various              | + icon, paper plane icon |

## Utilities & Services

| Element         | Current            | Target                         |
| --------------- | ------------------ | ------------------------------ |
| Section title   | Various            | "Utilities & Services"         |
| Layout          | 6 cards, flex-wrap | 5 cards, 2-column grid         |
| Card width      | ~30% each          | 48% each                       |
| Card background | Light              | Dark gray (#2A2A2A)            |
| Card radius     | Various            | 16px                           |
| Card content    | Icon centered      | Icon left + text + arrow right |

### Service Cards

| Current Services | Target Services            |
| ---------------- | -------------------------- |
| Buy Airtime      | Airtime Top-Up ✓           |
| Buy Data         | Data Bundle ✓              |
| Pay Bills        | Electricity Bill ✓         |
| TV Subscription  | TV Subscription ✓          |
| Transfer         | **MOVED** to quick actions |
| P2P Transfer     | **REMOVED** from utilities |
| N/A              | Water/Utility Bill **ADD** |

## Transaction List

| Element         | Current               | Target                |
| --------------- | --------------------- | --------------------- |
| Section title   | "Recent Transactions" | Same                  |
| "See All" link  | Gray/blue             | Red (#C41E3A)         |
| Item background | White/light           | Dark gray (#2A2A2A)   |
| Item radius     | Various               | 16px                  |
| Item border     | Border-bottom         | None (separate cards) |
| Item spacing    | Minimal               | 12px margin-bottom    |

### Transaction Item

| Element               | Current   | Target                   |
| --------------------- | --------- | ------------------------ |
| Icon shape            | Various   | Circular, 48x48px        |
| Icon color (outgoing) | Various   | Blue (#1E3A8A)           |
| Icon color (incoming) | Various   | Green (#059669)          |
| Icon content          | Various   | Directional arrow        |
| Description           | Dark text | White text               |
| Date/time             | Gray text | Gray-400 text            |
| Amount (credit)       | Green     | Green (#10B981) with "+" |
| Amount (debit)        | Red       | Red (#EF4444) with "-"   |

## Bottom Navigation

| Element        | Current          | Target          |
| -------------- | ---------------- | --------------- |
| Background     | Light/system     | Dark (#1A1A1A)  |
| Active color   | Purple (#5B55F6) | White (#FFFFFF) |
| Inactive color | Gray             | Gray (#6B7280)  |
| Border top     | Various          | 1px #333333     |
| Height         | System default   | 70px            |

### Tab Icons

| Tab     | Current Icon | Target Focused | Target Unfocused |
| ------- | ------------ | -------------- | ---------------- |
| Home    | home         | home           | home-outline     |
| Wallet  | wallet       | wallet         | wallet-outline   |
| Rewards | gift         | gift           | gift-outline     |
| Profile | person       | person         | person-outline   |

## Elements to Remove/Hide

| Element                 | Action                           | Reason        |
| ----------------------- | -------------------------------- | ------------- |
| Separate balance card   | Integrate into header            | Design change |
| Wallet locked banner    | Move to modal                    | Cleaner UI    |
| USDC wallet card        | Move to wallet tab               | Focus on fiat |
| Deposit limit indicator | Move to settings                 | Cleaner UI    |
| P2P action card         | Remove from home                 | Simplify      |
| 6-card quick actions    | Replace with utilities + buttons | New design    |

## Color Summary

| Purpose                | Current | Target                     |
| ---------------------- | ------- | -------------------------- |
| Header background      | #5B55F6 | Gradient #8B1C1C → #C41E3A |
| Card background (home) | #FFFFFF | #2A2A2A                    |
| Primary text           | #111827 | #FFFFFF                    |
| Secondary text         | #6B7280 | #9CA3AF                    |
| Tab bar active         | #5B55F6 | #FFFFFF                    |
| Links & accents        | #5B55F6 | #C41E3A                    |

## New Functionality

| Feature              | Current | Target                    |
| -------------------- | ------- | ------------------------- |
| Copy account number  | N/A     | Add with haptic feedback  |
| Wave pattern overlay | N/A     | Optional SVG pattern      |
| Profile in header    | N/A     | Clickable profile picture |
| Gift/rewards icon    | N/A     | Conditional display       |
