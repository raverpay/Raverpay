# RaverPay Landing Page

Public-facing landing page for RaverPay Financial Technology Limited.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
apps/raverpay-web/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── sections/         # Landing page sections
│   └── layout/           # Layout components (Navbar, etc.)
├── content/              # Centralized content
│   └── landing-page-content.ts
└── lib/                  # Utilities and helpers
    ├── utils.ts
    └── animations.ts
```

## Content Management

All text content is centralized in `content/landing-page-content.ts`. Update this file to change any copy on the landing page.

## Features

- Dark mode by default
- Fully responsive (mobile-first)
- Smooth animations with Framer Motion
- Glassmorphism effects
- SEO optimized
- Accessibility compliant (WCAG 2.1 AA)
