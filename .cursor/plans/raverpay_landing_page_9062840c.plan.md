---
name: RaverPay Landing Page
overview: Create a new Next.js landing page app (raverpay-web) with all sections from the design prompt, implementing a modern fintech landing page with dark mode, glassmorphism effects, and smooth animations using Framer Motion.
todos:
  - id: setup-project
    content: Create new Next.js app (raverpay-web) with TypeScript, Tailwind CSS v4, and configure package.json with all dependencies including framer-motion
    status: completed
  - id: setup-design-system
    content: Configure color palette (#5B55F6 primary), dark mode theme, Inter font, and glassmorphism utility classes in globals.css
    status: completed
    dependencies:
      - setup-project
  - id: setup-shadcn
    content: Set up shadcn/ui components (Button, Card, etc.) matching admin app structure
    status: completed
    dependencies:
      - setup-project
  - id: create-navbar
    content: Build Navbar component with logo, desktop menu, mobile hamburger menu, and sticky header behavior
    status: completed
    dependencies:
      - setup-shadcn
  - id: create-hero-section
    content: Implement HeroSection with headline, CTAs, hero visual placeholder, and floating animations
    status: completed
    dependencies:
      - setup-shadcn
  - id: create-social-proof
    content: Build SocialProofSection with scrolling ticker showing stats (50K+ Users, ₦2B+ Processed, etc.)
    status: completed
    dependencies:
      - setup-shadcn
  - id: create-features
    content: Implement FeaturesSection with 6 feature cards (glassmorphism), icons, descriptions, and hover effects
    status: completed
    dependencies:
      - setup-shadcn
  - id: create-how-it-works
    content: Build HowItWorksSection with 3-step process visualization, numbered steps, and animated connecting lines
    status: completed
    dependencies:
      - setup-shadcn
  - id: create-app-showcase
    content: Implement AppShowcaseSection with phone mockup, app screenshots, and download buttons
    status: completed
    dependencies:
      - setup-shadcn
  - id: create-security
    content: Build SecuritySection with security features grid (encryption, 2FA, compliance, monitoring)
    status: completed
    dependencies:
      - setup-shadcn
  - id: create-stats
    content: Implement StatsSection with 4 metrics, counter animations, and gradient background
    status: completed
    dependencies:
      - setup-shadcn
  - id: create-cta-footer
    content: Build final CTASection and Footer component with 4-column layout and links
    status: completed
    dependencies:
      - setup-shadcn
  - id: add-animations
    content: 'Implement Framer Motion animations: scroll-triggered fade-ins, counter animations, hover effects, and floating elements'
    status: completed
    dependencies:
      - create-hero-section
      - create-features
      - create-stats
  - id: responsive-polish
    content: Ensure all sections are fully responsive (mobile-first), test breakpoints, and optimize mobile navigation
    status: in_progress
    dependencies:
      - create-navbar
      - create-hero-section
      - create-features
  - id: accessibility-performance
    content: Add accessibility features (ARIA labels, keyboard nav, focus indicators) and optimize performance (lazy loading, image optimization)
    status: pending
    dependencies:
      - add-animations
      - responsive-polish
---

#RaverPay Fintech Landing Page Implementation Plan

## Overview

Create a new Next.js application (`apps/raverpay-web`) for the public-facing RaverPay landing page. The landing page will showcase RaverPay's fintech services with a modern, premium design featuring dark mode, glassmorphism effects, and smooth animations.

## Project Structure

### New App Creation

- **Location**: `apps/raverpay-web/`
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (matching admin app)
- **UI Components**: shadcn/ui (New York style, matching admin)
- **Icons**: lucide-react (already in use)
- **Animations**: framer-motion (new dependency)
- **Font**: Inter (matching admin app)

## Implementation Steps

### 1. Project Setup

- Create new Next.js app in `apps/raverpay-web/`
- Configure `package.json` with dependencies:
- `next@16.0.10`
- `react@19.2.0` & `react-dom@19.2.0`
- `typescript@^5`
- `tailwindcss@^4` & `@tailwindcss/postcss@^4`
- `framer-motion@^11.x` (for animations)
- `lucide-react@^0.554.0` (icons)
- `clsx@^2.1.1` & `tailwind-merge@^3.4.0` (utilities)
- `next-themes@^0.4.6` (theme management)
- Set up Tailwind CSS v4 configuration matching admin app structure
- Configure shadcn/ui components (copy `components.json` from admin)
- Set up TypeScript config matching admin app
- Create `next.config.ts` with basic configuration

### 2. Design System Setup

- **Color Palette** (in `app/globals.css`):
- Primary: `#5B55F6` (vibrant purple-blue)
- Dark Background: `#0A0B0F` or `#12131A`
- Secondary Dark: `#1A1B23`
- Accent Light: `#7B76FF`
- Accent Dark: `#3D38A8`
- Success Green: `#00D4AA`
- Text Primary: `#FFFFFF`
- Text Secondary: `#A0A3BD`
- Configure CSS variables for dark mode theme
- Set up Inter font from Google Fonts
- Create utility classes for glassmorphism effects

### 3. Core Components

Create reusable components in `components/`:

- `components/ui/` - Copy base shadcn/ui components from admin (Button, Card, etc.)
- `components/sections/` - Landing page sections:
- `HeroSection.tsx` - Hero with CTA buttons
- `SocialProofSection.tsx` - Scrolling ticker with stats
- `FeaturesSection.tsx` - Grid of feature cards
- `HowItWorksSection.tsx` - 3-step process visualization
- `AppShowcaseSection.tsx` - Mobile app mockup display
- `SecuritySection.tsx` - Security features grid
- `TestimonialsSection.tsx` - User testimonials (optional)
- `StatsSection.tsx` - Metrics with counter animations
- `CTASection.tsx` - Final call-to-action
- `Footer.tsx` - Footer with links
- `components/layout/`:
- `Navbar.tsx` - Navigation header
- `MobileMenu.tsx` - Hamburger menu for mobile

### 4. Page Sections Implementation

#### Hero Section (`components/sections/HeroSection.tsx`)

- Bold headline: "Your Gateway to Global Finance"
- Subheadline with value proposition
- Two CTA buttons: "Get Started Free" (primary) and "See How It Works" (outline)
- Hero visual placeholder (3D card mockup or animated illustration)
- Trust indicators: "CAC Registered" badge
- Floating animation for visual elements using Framer Motion

#### Social Proof Section (`components/sections/SocialProofSection.tsx`)

- Scrolling ticker/carousel with stats:
- "50K+ Users" | "₦2B+ Processed" | "150+ Countries Served"
- Partner logos section (if available)
- Smooth infinite scroll animation

#### Features Section (`components/sections/FeaturesSection.tsx`)

- Grid layout (3 columns desktop, 2 tablet, 1 mobile)
- 6 feature cards with glassmorphism:

1. International Bank Accounts
2. Virtual Cards
3. Stablecoin Payments
4. Cross-Border Transfers
5. Bill Payments
6. Creator Tools

- Each card: icon, title, description, "Learn More →" link
- Hover effects: lift with shadow and purple border glow
- Scroll-triggered fade-in animations

#### How It Works Section (`components/sections/HowItWorksSection.tsx`)

- 3-step process visualization
- Large numbered steps (01, 02, 03) with purple gradient
- Animated connecting lines between steps
- Each step: icon, title, description
- Steps:

1. Sign Up in Minutes
2. Choose Your Service
3. Start Transacting

#### App Showcase Section (`components/sections/AppShowcaseSection.tsx`)

- Phone mockup component (angled 15-20 degrees)
- Display key app screens (Dashboard, Cards, Transactions)
- Download buttons: "Download on App Store" and "Get it on Google Play"
- If app not available: "Coming Soon" badges with waitlist CTA

#### Security Section (`components/sections/SecuritySection.tsx`)

- Dark card with purple accent border
- Grid of security features:
- Bank-Level Encryption
- Two-Factor Authentication
- CAC Registered & Compliant
- 24/7 Fraud Monitoring
- Icons for each feature (lock, shield, checkmark)

#### Stats Section (`components/sections/StatsSection.tsx`)

- Full-width gradient background (dark to purple)
- 4 large statistics in a row:
- "50K+ Active Users"
- "₦2B+ Processed Monthly"
- "4.8★ User Rating"
- "150+ Countries Connected"
- Counter animation when section enters viewport (using Framer Motion)

#### Final CTA Section (`components/sections/CTASection.tsx`)

- Bold headline: "Ready to Go Global?"
- Subtext with value proposition
- Large prominent CTA button: "Create Free Account"
- Purple gradient background with subtle pattern overlay

#### Footer (`components/sections/Footer.tsx`)

- Dark background (`#0A0B0F`)
- 4-column layout:
- Column 1: Logo, tagline, social icons
- Column 2: Product links
- Column 3: Company links
- Column 4: Legal links
- Bottom row: Copyright, CAC registration number
- Purple hover states for links

### 5. Navigation Component

- `components/layout/Navbar.tsx`:
- Logo on left
- Desktop menu: Features, How It Works, Security, About
- CTA button: "Get Started"
- Mobile: Hamburger menu with slide-in drawer
- Sticky header with backdrop blur on scroll

### 6. Animations & Interactions

- Install and configure Framer Motion
- Implement scroll-triggered animations using `useInView` hook
- Button hover effects: scale (1.02x) and glow
- Card hover: lift with shadow and purple border glow
- Smooth scroll behavior
- Counter animations for stats section
- Floating animations for hero visual elements

### 7. Responsive Design

- Mobile-first approach
- Breakpoints: mobile (< 768px), tablet (768px - 1024px), desktop (> 1024px)
- Hero: Stack vertically on mobile, image below headline
- Feature grid: 1 column mobile, 2 tablet, 3 desktop
- Navigation: Hamburger menu on mobile
- Font scaling: Hero 32-40px mobile, 48-72px desktop
- Touch-friendly buttons: Minimum 44px height

### 8. Performance Optimization

- Optimize images (WebP format, lazy loading)
- Minimize animation complexity for 60fps
- Code splitting for sections
- Lazy load below-the-fold sections
- Target Lighthouse score: 90+ performance

### 9. Accessibility

- WCAG 2.1 AA compliance
- Proper heading hierarchy (H1 → H2 → H3)
- Alt text for all images
- Keyboard navigation support
- Color contrast: 4.5:1 minimum
- Visible focus indicators
- ARIA labels where needed

### 10. Root Layout & Metadata

- `app/layout.tsx`:
- Configure Inter font
- Set up ThemeProvider (dark mode by default)
- Configure metadata (title, description, OG tags)
- Add Analytics (Vercel Analytics if available)

### 11. Main Page

- `app/page.tsx`:
- Import and render all sections in order
- Implement smooth scroll behavior

### 12. Utilities

- `lib/utils.ts` - Copy `cn` utility from admin
- Create animation variants file for Framer Motion
- Create constants file for stats/metrics

## Assets Needed

### Images/Icons to Create or Source:

1. **Logo** - RaverPay logo (SVG preferred for scalability)
2. **Hero Visual** - One of:

- 3D mockup of virtual cards (USD, GBP, EUR) floating/stacked
- Animated illustration showing money flow across African countries
- Can use placeholder initially, replace with custom design later

3. **Feature Icons** - Custom icons or use lucide-react:

- Globe with bank building (International Bank Accounts)
- Credit card with currency symbols (Virtual Cards)
- Cryptocurrency/blockchain symbol (Stablecoin Payments)
- Exchange arrows/African continent (Cross-Border Transfers)
- Lightning bolt/mobile phone (Bill Payments)
- User group/briefcase (Creator Tools)

4. **App Mockup** - Phone mockup with app screenshots

- Dashboard screen
- Card management screen
- Transaction history screen

5. **Security Icons** - Lock, shield, checkmark (can use lucide-react)
6. **Partner Logos** - If available (optional)
7. **App Store Badges** - Download buttons for App Store and Google Play

### Note on Assets:

- Can start with lucide-react icons for all features
- Use placeholder images for hero visual and app mockup initially
- Logo should be provided or created separately
- App screenshots can be generated from mobile app or designed as mockups

## Git Branch

- Create new branch: `feature/landing-page` or `feature/raverpay-web-landing`
- Branch from: `main`

## Files to Create

### New App Structure:

```javascript
apps/raverpay-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── favicon.ico
├── components/
│   ├── ui/ (shadcn components)
│   ├── sections/
│   │   ├── HeroSection.tsx
│   │   ├── SocialProofSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── AppShowcaseSection.tsx
│   │   ├── SecuritySection.tsx
│   │   ├── TestimonialsSection.tsx (optional)
│   │   ├── StatsSection.tsx
│   │   ├── CTASection.tsx
│   │   └── Footer.tsx
│   └── layout/
│       ├── Navbar.tsx
│       └── MobileMenu.tsx
├── lib/
│   ├── utils.ts
│   └── animations.ts
├── public/
│   └── (assets folder)
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts (or use CSS-based config)
├── postcss.config.mjs
└── components.json
```

## Dependencies Summary

### New Dependencies Needed:

- `framer-motion@^11.x` - For animations
- All other dependencies match admin app

### Existing Dependencies (from admin):

- `next@16.0.10`
- `react@19.2.0` & `react-dom@19.2.0`
- `typescript@^5`
- `tailwindcss@^4`
- `lucide-react@^0.554.0`
- `clsx@^2.1.1`
- `tailwind-merge@^3.4.0`
- `next-themes@^0.4.6`

## Testing Checklist

- [ ] All sections render correctly
- [ ] Responsive on mobile, tablet, desktop
- [ ] Animations work smoothly (60fps)
- [ ] Dark mode displays correctly
- [ ] All links work (CTAs, footer links)
- [ ] Accessibility: keyboard navigation, screen reader friendly
- [ ] Performance: Lighthouse score 90+
- [ ] Cross-browser compatibility

## Next Steps After Implementation

1. Add real content/copy
2. Replace placeholder images with final designs
3. Connect CTAs to actual sign-up flow
