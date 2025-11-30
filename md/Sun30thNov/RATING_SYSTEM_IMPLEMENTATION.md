# App Rating System Implementation Guide

## ✅ Implementation Complete

The app rating system has been successfully implemented across the backend API and admin dashboard. This feature allows admins to configure and manage in-app rating prompts for the mobile application.

---

## 🏗️ What Was Built

### **Backend API (`apps/mularpay-api`)**

#### 1. **Database Schema**

- Added `AppRatingConfig` model to Prisma schema
- Created migration SQL file: `prisma/migrations/add_app_rating_config.sql`
- Created migration script: `run-rating-migration.sh`

#### 2. **App Config Module** (`src/app-config/`)

```
src/app-config/
├── dto/
│   └── update-rating-config.dto.ts    # Validation DTOs
├── app-config.controller.ts           # API endpoints
├── app-config.service.ts              # Business logic
└── app-config.module.ts               # Module definition
```

#### 3. **API Endpoints**

- **GET** `/app-config/rating-prompt` - Public endpoint for mobile app to fetch config
- **PATCH** `/app-config/rating-prompt` - Admin-only endpoint to update config

### **Admin Dashboard (`apps/mularpay-admin`)**

#### 1. **API Client**

- Created `lib/api/app-config.ts` with TypeScript interfaces and API functions

#### 2. **Settings Page**

- Added new "App Rating" tab to `/dashboard/settings`
- Comprehensive configuration form with:
  - Enable/disable toggle
  - Prompt frequency (days between prompts)
  - Minimum transactions required
  - Minimum usage days required
  - Customizable prompt title and message
  - iOS and Android app store URLs
  - Live preview of the rating modal

---

## 📊 Database Schema

```prisma
model AppRatingConfig {
  id                     String  @id @default(uuid())
  enabled                Boolean @default(true)
  promptFrequencyDays    Int     @default(30)
  minTransactionsRequired Int    @default(3)
  minUsageDaysRequired   Int     @default(7)
  promptTitle            String  @default("Enjoying RaverPay?")
  promptMessage          String  @default("Rate us on the app store! Your feedback helps us improve.")
  iosAppStoreUrl         String
  androidPlayStoreUrl    String
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

---

## 🚀 Deployment Steps

### **1. Run Database Migration**

```bash
cd apps/mularpay-api

# Make the script executable (if not already)
chmod +x run-rating-migration.sh

# Run the migration
./run-rating-migration.sh
```

Or manually with `psql`:

```bash
psql $DATABASE_URL -f prisma/migrations/add_app_rating_config.sql
```

### **2. Generate Prisma Client**

```bash
cd apps/mularpay-api
pnpm prisma generate
```

### **3. Restart Your Servers**

**API Server:**

```bash
cd apps/mularpay-api
pnpm dev
```

**Admin Dashboard:**

```bash
cd apps/mularpay-admin
pnpm dev
```

---

## 🎯 How to Use

### **Admin Dashboard Configuration**

1. Navigate to **Dashboard → Settings**
2. Click on the **"App Rating"** tab
3. Configure the following settings:

**Basic Settings:**

- **Enabled**: Toggle to enable/disable the rating prompt globally
- **Prompt Frequency**: Days to wait between showing prompts (default: 30 days)
- **Min Transactions**: Minimum successful transactions before showing prompt (default: 3)
- **Min Usage Days**: Minimum days since registration (default: 7)

**Customization:**

- **Prompt Title**: Customize the modal title (e.g., "Enjoying RaverPay?")
- **Prompt Message**: Customize the message text

**App Store URLs:**

- **iOS App Store URL**: Your app's Apple App Store link
- **Android Play Store URL**: Your app's Google Play Store link

4. **Preview** the modal appearance in real-time
5. Click **"Save Rating Configuration"** to apply changes

### **Mobile App Integration**

The mobile app fetches the configuration from:

```typescript
GET / app - config / rating - prompt;
```

**Response:**

```json
{
  "id": "uuid",
  "enabled": true,
  "promptFrequencyDays": 30,
  "minTransactionsRequired": 3,
  "minUsageDaysRequired": 7,
  "promptTitle": "Enjoying RaverPay?",
  "promptMessage": "Rate us on the app store! Your feedback helps us improve.",
  "iosAppStoreUrl": "https://apps.apple.com/...",
  "androidPlayStoreUrl": "https://play.google.com/...",
  "createdAt": "2025-11-30T...",
  "updatedAt": "2025-11-30T..."
}
```

---

## 🔧 Configuration Examples

### **For Testing (Aggressive Prompting)**

```json
{
  "enabled": true,
  "promptFrequencyDays": 1,
  "minTransactionsRequired": 0,
  "minUsageDaysRequired": 0
}
```

### **For Production (Best Practices)**

```json
{
  "enabled": true,
  "promptFrequencyDays": 45,
  "minTransactionsRequired": 5,
  "minUsageDaysRequired": 14
}
```

### **For Launch (Conservative)**

```json
{
  "enabled": true,
  "promptFrequencyDays": 90,
  "minTransactionsRequired": 10,
  "minUsageDaysRequired": 30
}
```

---

## 🔐 Security

- **Admin Authentication**: The update endpoint requires JWT authentication
- **Role-Based Access**: Only `ADMIN` and `SUPER_ADMIN` roles can modify settings
- **Input Validation**: All inputs are validated using `class-validator`
- **Public Read Access**: Mobile app can fetch config without authentication

---

## 📱 Mobile App Requirements

Your mobile app should already have the rating system implemented. If not, refer to the documentation in `md/Sun30thNov/RATING_SYSTEM.md` for mobile implementation details.

**Key Mobile Features:**

- ✅ Fetch configuration from API on app startup
- ✅ Track app opens locally
- ✅ Track transaction count
- ✅ Calculate days since registration
- ✅ Check eligibility before showing prompt
- ✅ Respect "Don't Ask Again" preference
- ✅ Handle prompt frequency (days between prompts)

---

## 🧪 Testing

### **1. Test API Endpoints**

**Fetch Configuration:**

```bash
curl http://localhost:4000/app-config/rating-prompt
```

**Update Configuration (with admin token):**

```bash
curl -X PATCH http://localhost:4000/app-config/rating-prompt \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "promptFrequencyDays": 30,
    "minTransactionsRequired": 3
  }'
```

### **2. Test Admin Dashboard**

1. Login as admin
2. Navigate to Settings → App Rating
3. Modify any configuration
4. Click Save
5. Verify changes in the preview
6. Fetch from API to confirm persistence

### **3. Test Mobile App**

1. Clear app data
2. Register new account
3. Complete required transactions (based on config)
4. Wait for required usage days (or reduce in config)
5. Verify prompt appears after next transaction

---

## 🎨 Customization

### **Modify Prompt Appearance**

The mobile app's `RatingPromptModal.tsx` can be customized for:

- Colors and styling
- Icon/emoji
- Button text
- Animation effects

### **Add Analytics Tracking**

Extend the service to track:

- Prompt shown events
- User responses (Rate Now, Maybe Later, Never)
- Conversion rates
- App store redirects

---

## 📈 Recommended Best Practices

1. **Start Conservative**: Use higher thresholds initially
2. **Monitor Ratings**: Track app store ratings after enabling
3. **A/B Testing**: Test different prompt frequencies
4. **Timing**: Show prompts after positive experiences (successful transaction)
5. **Respect Users**: Honor "Don't Ask Again" permanently
6. **Update URLs**: Keep app store URLs current

---

## 🐛 Troubleshooting

### **Migration Fails**

```bash
# Check if table already exists
psql $DATABASE_URL -c "SELECT * FROM app_rating_config;"

# If exists, drop and recreate
psql $DATABASE_URL -c "DROP TABLE app_rating_config CASCADE;"
./run-rating-migration.sh
```

### **TypeScript Errors in Service**

```bash
# Regenerate Prisma Client
cd apps/mularpay-api
pnpm prisma generate

# Restart TypeScript server in VS Code
# CMD+Shift+P → "TypeScript: Restart TS Server"
```

### **API Returns 404**

- Verify migration ran successfully
- Check database has at least one config row
- Restart API server

### **Admin Dashboard Not Loading Config**

- Check browser console for errors
- Verify API endpoint is accessible
- Ensure admin is authenticated

---

## 📝 Files Modified/Created

### **Backend API**

- ✅ `prisma/schema.prisma` - Added AppRatingConfig model
- ✅ `prisma/migrations/add_app_rating_config.sql` - Migration file
- ✅ `run-rating-migration.sh` - Migration script
- ✅ `src/app-config/` - Complete module (controller, service, DTOs, module)
- ✅ `src/app.module.ts` - Registered AppConfigModule

### **Admin Dashboard**

- ✅ `lib/api/app-config.ts` - API client
- ✅ `app/dashboard/settings/page.tsx` - Added App Rating tab

---

## ✨ Next Steps

1. ✅ **Run the migration** on your production database
2. ✅ **Configure settings** in admin dashboard with real app store URLs
3. ✅ **Test the API** endpoint
4. ✅ **Deploy** API and admin changes
5. ✅ **Monitor** user responses and ratings

---

## 🎉 Summary

The rating system is now fully implemented and ready for production use. Admins can easily configure when and how often users see rating prompts, and the mobile app can fetch this configuration dynamically.

**Key Benefits:**

- ✅ No app updates needed to change rating behavior
- ✅ Easy A/B testing through admin dashboard
- ✅ Respects user preferences
- ✅ Optimizes timing for higher conversion
- ✅ Clean, maintainable codebase

Happy rating! 🌟
