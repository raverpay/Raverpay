# Push Notifications Setup Guide (OneSignal)

## Current Status

**Backend:** ✅ Partial - Schema ready, service placeholder exists
**Mobile App:** ❌ Not implemented - Needs OneSignal SDK integration

---

## Overview

This guide will help you set up push notifications using OneSignal for your mobile app.

### Why OneSignal?

- ✅ Free tier: 10,000 subscribers
- ✅ Works on iOS and Android
- ✅ Easy React Native integration
- ✅ Rich notifications (images, actions, deep links)
- ✅ Analytics and delivery tracking
- ✅ Scheduled notifications
- ✅ Segments and targeting

---

## Phase 1: OneSignal Account Setup

### Step 1: Create OneSignal Account

1. Go to https://onesignal.com/
2. Click "Get Started Free"
3. Sign up with your email
4. Verify your email

### Step 2: Create a New App

1. Click "New App/Website"
2. Enter app name: "MularPay"
3. Select platform: **Mobile App**
4. Click "Next: Configure Platforms"

### Step 3: Configure Platforms

#### For iOS:
1. Select **Apple iOS (APNs)**
2. You'll need:
   - Apple Developer Account
   - Push Notification Certificate (.p12 file)
   - Team ID
   - Bundle ID (e.g., `com.mularpay.app`)

**Getting iOS Credentials:**
```bash
# 1. Go to developer.apple.com
# 2. Certificates, Identifiers & Profiles
# 3. Keys → Create new key
# 4. Enable "Apple Push Notifications service (APNs)"
# 5. Download .p8 key file
# 6. Copy Key ID and Team ID
```

#### For Android:
1. Select **Google Android (FCM)**
2. You'll need:
   - Firebase project
   - Server Key (from Firebase Console)
   - Sender ID

**Getting Android Credentials:**
```bash
# 1. Go to console.firebase.google.com
# 2. Create project or select existing
# 3. Project Settings → Cloud Messaging
# 4. Copy Server Key and Sender ID
# 5. Enable Cloud Messaging API
```

### Step 4: Get OneSignal App ID

After setup, you'll get:
- **App ID** (e.g., `abc12345-def6-7890-ghij-klmnopqrstuv`)
- **REST API Key** (for backend)

**Save these! You'll need them.**

---

## Phase 2: Backend Implementation

### Step 1: Install OneSignal SDK (Backend)

```bash
cd apps/mularpay-api
pnpm add onesignal-node
```

### Step 2: Add Environment Variables

Add to `apps/mularpay-api/.env`:

```env
# OneSignal Configuration
ONESIGNAL_APP_ID=your_app_id_here
ONESIGNAL_REST_API_KEY=your_rest_api_key_here
```

### Step 3: Create Push Notification Service

Create `apps/mularpay-api/src/services/push/push-notification.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OneSignal from 'onesignal-node';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private client: OneSignal.Client;
  private readonly appId: string;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('ONESIGNAL_APP_ID');
    const apiKey = this.configService.get<string>('ONESIGNAL_REST_API_KEY');

    if (this.appId && apiKey) {
      this.client = new OneSignal.Client(this.appId, apiKey);
      this.logger.log('✅ OneSignal push notification service initialized');
    } else {
      this.logger.warn('⚠️ OneSignal not configured - push notifications disabled');
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    userId: string,
    notification: {
      title: string;
      message: string;
      data?: Record<string, any>;
      imageUrl?: string;
    },
  ): Promise<boolean> {
    if (!this.client) {
      this.logger.warn('OneSignal not initialized');
      return false;
    }

    try {
      const response = await this.client.createNotification({
        headings: { en: notification.title },
        contents: { en: notification.message },
        data: notification.data || {},
        big_picture: notification.imageUrl,
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        // Target specific user by external_user_id
        include_external_user_ids: [userId],
      });

      this.logger.log(`✅ Push sent to user ${userId}: ${response.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send push to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    notification: {
      title: string;
      message: string;
      data?: Record<string, any>;
    },
  ): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const response = await this.client.createNotification({
        headings: { en: notification.title },
        contents: { en: notification.message },
        data: notification.data || {},
        include_external_user_ids: userIds,
      });

      this.logger.log(`✅ Push sent to ${userIds.length} users: ${response.id}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send push to users:', error);
      return false;
    }
  }

  /**
   * Send to all users (broadcast)
   */
  async sendToAll(notification: {
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const response = await this.client.createNotification({
        headings: { en: notification.title },
        contents: { en: notification.message },
        data: notification.data || {},
        included_segments: ['All'],
      });

      this.logger.log(`✅ Broadcast push sent: ${response.id}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send broadcast push:', error);
      return false;
    }
  }
}
```

### Step 4: Update NotificationDispatcher

Update `apps/mularpay-api/src/notifications/notification-dispatcher.service.ts`:

```typescript
import { PushNotificationService } from '../services/push/push-notification.service';

export class NotificationDispatcherService {
  constructor(
    // ... existing dependencies
    private readonly pushService: PushNotificationService, // Add this
  ) {}

  private async sendPush(notificationId: string, event: NotificationEvent) {
    try {
      const pushSent = await this.pushService.sendToUser(event.userId, {
        title: event.title,
        message: event.message,
        data: {
          notificationId,
          ...event.data,
        },
      });

      if (pushSent) {
        await this.logService.logDelivery({
          notificationId,
          userId: event.userId,
          channel: 'PUSH',
          status: 'SENT',
          provider: 'onesignal',
        });
      } else {
        await this.logService.logFailure({
          notificationId,
          userId: event.userId,
          channel: 'PUSH',
          failureReason: 'OneSignal service returned false',
          provider: 'onesignal',
        });
      }
    } catch (error) {
      await this.logService.logFailure({
        notificationId,
        userId: event.userId,
        channel: 'PUSH',
        failureReason: error.message,
        provider: 'onesignal',
      });

      this.logger.error(`Failed to send push for notification ${notificationId}`, error);
    }
  }
}
```

### Step 5: Register Services

Create `apps/mularpay-api/src/services/push/push.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PushNotificationService } from './push-notification.service';

@Module({
  imports: [ConfigModule],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class PushModule {}
```

Update `apps/mularpay-api/src/notifications/notifications.module.ts`:

```typescript
import { PushModule } from '../services/push/push.module';

@Module({
  imports: [PrismaModule, ConfigModule, PushModule], // Add PushModule
  // ... rest
})
```

---

## Phase 3: Mobile App Implementation

### Step 1: Install OneSignal React Native SDK

```bash
cd mularpay-mobileapp
npx expo install onesignal-expo-plugin
npm install react-onesignal
```

### Step 2: Configure app.json

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "onesignal-expo-plugin",
        {
          "mode": "development",
          "devTeam": "YOUR_APPLE_TEAM_ID"
        }
      ]
    ]
  }
}
```

### Step 3: Create OneSignal Configuration

Create `mularpay-mobileapp/src/config/onesignal.config.ts`:

```typescript
import OneSignal from 'react-native-onesignal';
import Constants from 'expo-constants';

export const initializeOneSignal = (userId?: string) => {
  // Get OneSignal App ID from environment
  const appId = Constants.expoConfig?.extra?.oneSignalAppId;

  if (!appId) {
    console.warn('OneSignal App ID not configured');
    return;
  }

  // Initialize OneSignal
  OneSignal.setAppId(appId);

  // Set external user ID (your user's ID)
  if (userId) {
    OneSignal.setExternalUserId(userId);
  }

  // Prompt for push permission (iOS)
  OneSignal.promptForPushNotificationsWithUserResponse((response) => {
    console.log('Push permission:', response);
  });

  // Handle notification opened
  OneSignal.setNotificationOpenedHandler((notification) => {
    console.log('Notification opened:', notification);
    // Handle deep linking here
    const data = notification.notification.additionalData;
    if (data?.notificationId) {
      // Navigate to notification or transaction
    }
  });

  // Handle notification received (foreground)
  OneSignal.setNotificationWillShowInForegroundHandler((notificationReceivedEvent) => {
    const notification = notificationReceivedEvent.getNotification();
    console.log('Notification received:', notification);

    // Display the notification
    notificationReceivedEvent.complete(notification);
  });
};
```

### Step 4: Initialize in App

Update `mularpay-mobileapp/app/_layout.tsx`:

```typescript
import { initializeOneSignal } from '@/src/config/onesignal.config';
import { useUserStore } from '@/src/store/user.store';

export default function RootLayout() {
  const { user } = useUserStore();

  useEffect(() => {
    if (user?.id) {
      // Initialize OneSignal with user ID
      initializeOneSignal(user.id);
    }
  }, [user?.id]);

  return (
    // ... your layout
  );
}
```

### Step 5: Add Environment Variables

Add to `mularpay-mobileapp/.env`:

```env
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_app_id_here
```

Add to `app.json`:

```json
{
  "expo": {
    "extra": {
      "oneSignalAppId": process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID
    }
  }
}
```

### Step 6: Request Permissions

Create notification permission helper:

```typescript
// mularpay-mobileapp/src/utils/notifications.ts
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export async function requestPushPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android doesn't need explicit permission request
    return true;
  }

  // iOS requires permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert(
      'Push Notifications',
      'Enable push notifications in Settings to receive important updates.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Notifications.openSettings() },
      ]
    );
    return false;
  }

  return true;
}
```

---

## Phase 4: Testing Push Notifications

### Test 1: Send Test Push from OneSignal Dashboard

1. Go to OneSignal dashboard
2. Click "Messages" → "New Push"
3. Enter message title and content
4. Click "Send to Test Users"
5. Enter your device's Player ID
6. Send

**Expected:** Push notification appears on your device

### Test 2: Send Push via Backend API

```bash
# Using curl
curl -X POST http://localhost:3000/admin/test-push \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "title": "Test Push",
    "message": "Testing OneSignal integration"
  }'
```

### Test 3: Trigger via Webhook

1. Create a DVA in mobile app
2. Wait for webhook to fire
3. Check if push notification appears
4. Tap notification
5. Should navigate to relevant screen

---

## Phase 5: Advanced Features

### Feature 1: Badge Count Management

```typescript
// Update badge count
OneSignal.setAppBadgeCount(5);

// Clear badge
OneSignal.setAppBadgeCount(0);
```

### Feature 2: Rich Notifications with Images

```typescript
// Backend
await this.pushService.sendToUser(userId, {
  title: 'Wallet Funded',
  message: 'Your wallet has been credited with ₦5,000',
  imageUrl: 'https://example.com/notification-image.png',
  data: { transactionId: '12345' },
});
```

### Feature 3: Action Buttons

```typescript
await this.client.createNotification({
  headings: { en: 'Payment Received' },
  contents: { en: 'You received ₦5,000' },
  buttons: [
    { id: 'view', text: 'View Transaction' },
    { id: 'share', text: 'Share' },
  ],
  include_external_user_ids: [userId],
});
```

### Feature 4: Scheduled Notifications

```typescript
await this.client.createNotification({
  headings: { en: 'Reminder' },
  contents: { en: 'Complete your KYC verification' },
  include_external_user_ids: [userId],
  send_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Send in 24 hours
});
```

---

## Troubleshooting

### Issue 1: Push Not Received on iOS

**Possible causes:**
- Notifications permission denied
- Wrong certificate/key uploaded
- Development vs Production mode mismatch

**Fix:**
```bash
# Check permission status
OneSignal.getDeviceState().then((state) => {
  console.log('Permission:', state.hasNotificationPermission);
  console.log('Player ID:', state.userId);
});
```

### Issue 2: Push Not Received on Android

**Possible causes:**
- Firebase not configured
- Wrong Server Key
- App not in foreground/background

**Fix:**
```bash
# Check FCM token
OneSignal.getDeviceState().then((state) => {
  console.log('Push Token:', state.pushToken);
});
```

### Issue 3: External User ID Not Set

**Symptom:** Push sent but not received

**Fix:**
```typescript
// Ensure user ID is set after login
OneSignal.setExternalUserId(user.id, (results) => {
  console.log('External User ID set:', results);
});
```

---

## Monitoring & Analytics

### OneSignal Dashboard

Monitor in OneSignal dashboard:
- Delivery rate
- Open rate
- Click rate
- Best send times
- Device types

### Backend Logging

Check notification logs:
```sql
SELECT * FROM notification_logs
WHERE channel = 'PUSH'
ORDER BY "createdAt" DESC
LIMIT 20;
```

---

## Summary Checklist

### Backend Setup
- [ ] OneSignal account created
- [ ] iOS and Android configured
- [ ] Environment variables added
- [ ] `onesignal-node` package installed
- [ ] `PushNotificationService` created
- [ ] `NotificationDispatcher` updated
- [ ] Services registered in modules

### Mobile App Setup
- [ ] `onesignal-expo-plugin` installed
- [ ] `app.json` configured
- [ ] OneSignal initialized in app
- [ ] External user ID set on login
- [ ] Permission requested
- [ ] Deep linking configured
- [ ] Environment variables added

### Testing
- [ ] Test push from OneSignal dashboard works
- [ ] Test push from backend API works
- [ ] Webhook triggers push notification
- [ ] Tap notification navigates correctly
- [ ] Badge count updates
- [ ] Works on both iOS and Android

---

## Current Status (What You Need to Do)

Since you haven't implemented OneSignal yet, here's what to do:

**Option 1: Implement Now (Recommended)**
1. Follow Phase 1-3 above
2. Should take ~2-3 hours
3. Push notifications will work immediately

**Option 2: Implement Later**
1. Your in-app notifications work fine without push
2. Users will still get email and SMS
3. Add push notifications in Phase 2

**For Now:**
- In-app notifications ✅ Working
- Email notifications ✅ Working
- SMS notifications ✅ Working
- Push notifications ⏳ Pending (needs OneSignal setup)

The notification system is **fully functional** without push - users just won't get notifications when app is closed. They'll still see them when they open the app!
