# Quick Image Reference Guide

## Essential Images (Generate These First)

### 1. Logo

**Prompt:** Modern fintech logo "RaverPay", purple gradient (#5B55F6), transparent background, dark background compatible, aspect ratio 10:3, dimensions 200x60px, scalable vector format  
**Save as:** `public/logo.svg` or `public/logo.png`

### 2. Hero Visual

**Prompt:** 3D floating credit cards (USD, GBP, EUR), purple glow, dark background, transparent or dark gradient, professional fintech aesthetic, aspect ratio 3:2, dimensions 1200x800px, high resolution  
**Save as:** `public/images/hero-cards-mockup.png`

### 3. App Dashboard Screenshot

**Prompt:** Mobile banking app dashboard, dark theme, purple accents, showing balance and transactions, iPhone format, realistic app interface, aspect ratio 9:19.5 (iPhone), dimensions 375x812px or 1080x1920px, portrait orientation  
**Save as:** `public/images/app-screenshots/app-dashboard.png`

### 4. App Cards Screenshot

**Prompt:** Mobile app virtual card management screen, multiple currency cards, dark theme, purple accents, iPhone format, aspect ratio 9:19.5 (iPhone), dimensions 375x812px or 1080x1920px, portrait orientation  
**Save as:** `public/images/app-screenshots/app-cards.png`

### 5. App Transactions Screenshot

**Prompt:** Mobile app transaction history screen, list of transactions, dark theme, purple accents, iPhone format, aspect ratio 9:19.5 (iPhone), dimensions 375x812px or 1080x1920px, portrait orientation  
**Save as:** `public/images/app-screenshots/app-transactions.png`

---

## Where Images Are Used

| Image                   | Used In Component        | File Path                                            |
| ----------------------- | ------------------------ | ---------------------------------------------------- |
| Logo                    | `Navbar.tsx`             | `public/logo.svg`                                    |
| Hero Visual             | `HeroSection.tsx`        | `public/images/hero-cards-mockup.png`                |
| Dashboard Screenshot    | `AppShowcaseSection.tsx` | `public/images/app-screenshots/app-dashboard.png`    |
| Cards Screenshot        | `AppShowcaseSection.tsx` | `public/images/app-screenshots/app-cards.png`        |
| Transactions Screenshot | `AppShowcaseSection.tsx` | `public/images/app-screenshots/app-transactions.png` |

---

## Quick Copy-Paste Prompts

### Logo

```
Modern fintech logo design for "RaverPay" text, vibrant purple (#5B55F6) and pink gradient, sleek sans-serif typography, minimalist style, fintech aesthetic, clean lines, professional, transparent background, vector style, high resolution, white text with purple accent, aspect ratio 10:3, dimensions 200x60px, scalable vector format
```

### Hero Cards

```
3D rendering of three floating credit cards, USD dollar card, GBP pound card, EUR euro card, stacked at slight angles, modern fintech design, purple glow effect around cards, dark background, glassmorphism style, subtle shadows, professional fintech aesthetic, high quality 3D render, transparent background, cards showing currency symbols, aspect ratio 3:2, dimensions 1200x800px, high resolution
```

### App Dashboard

```
Mobile app dashboard screen mockup, fintech banking app interface, dark theme, purple accent colors (#5B55F6), showing account balance, recent transactions list, quick action buttons, modern UI design, clean typography, professional banking app aesthetic, iPhone screen format, realistic app interface, high quality mockup, aspect ratio 9:19.5 (iPhone), dimensions 375x812px or 1080x1920px, portrait orientation
```

---

## Image Specifications

- **Format:** PNG with transparent background (or SVG for logo)
- **Resolution:** 2x or 3x for retina displays
- **Optimization:** Compress before use (TinyPNG, ImageOptim)
- **WebP:** Convert to WebP format for better performance

---

## After Generating

1. Save images to correct locations
2. Optimize images (compress, convert to WebP)
3. Update components to use the images
4. Test on different screen sizes
