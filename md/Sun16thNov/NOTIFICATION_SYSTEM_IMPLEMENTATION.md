# MularPay Notification System Implementation Guide

## 📋 Phase 1: COMPLETED ✅

### What We Built:

#### 1. **Database Schema** (Prisma)

##### Enhanced `Notification` Model
```prisma
✅ Multi-channel support: email, SMS, push, in-app
✅ Event type tracking: "deposit", "withdrawal", "bvn_verified", etc.
✅ Category: TRANSACTION, SECURITY, KYC, PROMOTIONAL, SYSTEM, ACCOUNT
✅ Delivery status per channel: {"email": "sent", "sms": "failed"}
✅ Template reference for dynamic content
✅ Auto-cleanup via expiresAt field
```

##### New `NotificationPreference` Model
```prisma
✅ Channel preferences (enable/disable email, SMS, push, in-app)
✅ Event-specific controls (transactionEmails, securitySms, etc.)
✅ Frequency settings (IMMEDIATE, DAILY, WEEKLY, NEVER)
✅ Quiet hours with timezone support
✅ Opt-out category management
```

##### New `NotificationLog` Model
```prisma
✅ Delivery tracking (PENDING → SENT → DELIVERED → OPENED → CLICKED)
✅ Failure tracking with reasons
✅ Retry counter and last retry timestamp
✅ Analytics (openedAt, clickedAt, clickUrl)
✅ Provider-specific message IDs (for webhook tracking)
```

##### New `NotificationTemplate` Model
```prisma
✅ Template management by event + channel
✅ Variable placeholders: {{firstName}}, {{amount}}, {{reference}}
✅ Version control (for A/B testing)
✅ Active/inactive toggle
```

##### New `NotificationQueue` Model
```prisma
✅ Async processing queue
✅ Priority-based delivery
✅ Retry logic (max 3 attempts)
✅ Scheduled delivery support
✅ Error logging
```

---

#### 2. **Backend Services**

##### `NotificationPreferencesService`
```typescript
✅ getPreferences(userId) - Get user preferences (creates defaults if missing)
✅ updatePreferences(userId, dto) - Update preferences
✅ shouldSendNotification(userId, channel, category) - Check if allowed
✅ isInQuietHours(userId) - Timezone-aware quiet hours check
✅ resetToDefault(userId) - Reset to defaults
✅ optOutCategory(userId, category) - Opt out of category
✅ optInCategory(userId, category) - Opt back in
```

**Key Features:**
- **Smart validation**: Checks channel enabled, category preferences, frequency
- **Quiet hours**: Respects user timezone, always allows SECURITY alerts
- **Auto-creation**: Default preferences created on first access

---

##### `NotificationPreferencesController`
```typescript
API Endpoints:
✅ GET /notification-preferences - Get current user preferences
✅ PUT /notification-preferences - Update preferences
✅ POST /notification-preferences/reset - Reset to defaults
✅ POST /notification-preferences/opt-out/:category - Opt out
✅ DELETE /notification-preferences/opt-out/:category - Opt back in
```

All endpoints require JWT authentication.

---

#### 3. **DTOs & Validation**

##### `UpdateNotificationPreferencesDto`
```typescript
✅ All fields optional (partial updates)
✅ Boolean validation for all toggles
✅ Enum validation for frequencies (IMMEDIATE, DAILY, WEEKLY, NEVER)
✅ Array validation for optOutCategories
```

---

## 📊 Database Migration Status

**Status:** ⚠️ Migration created but NOT applied (database was offline)

**To Apply Migration:**
```bash
cd /Users/joseph/Desktop/mularpay/apps/mularpay-api
pnpm prisma migrate dev
```

This will:
1. Create all new tables (notification_preferences, notification_logs, notification_templates, notification_queue)
2. Add new columns to notifications table
3. Create all indexes for performance

---

## 🎯 Phase 2: Next Steps (TODO)

### 1. **Notification Dispatcher Service** (High Priority)

Create `notification-dispatcher.service.ts`:

```typescript
@Injectable()
export class NotificationDispatcherService {

  async sendNotification(event: {
    userId: string;
    eventType: string; // "deposit", "withdrawal", etc.
    category: NotificationCategory;
    channels: string[]; // ["EMAIL", "SMS", "IN_APP"]
    title: string;
    message: string;
    data?: any;
  }) {
    // 1. Get user preferences
    const preferences = await this.preferencesService.getPreferences(event.userId);

    // 2. Filter channels based on preferences
    const allowedChannels = await this.filterChannels(event.userId, event.channels, event.category);

    // 3. Create in-app notification
    const notification = await this.createInAppNotification(event);

    // 4. Queue email/SMS/push notifications
    for (const channel of allowedChannels) {
      await this.queueNotification(event, channel, notification.id);
    }

    // 5. Log delivery attempts
    await this.logDeliveryAttempts(notification.id, allowedChannels);

    return notification;
  }
}
```

**What it does:**
- ✅ Checks user preferences before sending
- ✅ Respects quiet hours (except security alerts)
- ✅ Creates in-app notification immediately
- ✅ Queues email/SMS/push for async processing
- ✅ Logs delivery status

---

### 2. **Update Existing Services** (High Priority)

#### Email Service (`email.service.ts`)
```typescript
// Add to each send method:
async sendTransactionReceipt(email, firstName, transactionDetails) {
  try {
    const result = await this.resend.emails.send({...});

    // ✅ ADD: Log successful delivery
    await this.notificationLogService.logDelivery({
      notificationId,
      userId,
      channel: 'EMAIL',
      status: 'SENT',
      provider: 'resend',
      providerMessageId: result.id,
    });

  } catch (error) {
    // ✅ ADD: Log failure
    await this.notificationLogService.logFailure({
      notificationId,
      userId,
      channel: 'EMAIL',
      status: 'FAILED',
      failureReason: error.message,
    });
  }
}
```

#### SMS Service (`sms.service.ts`)
```typescript
// Same pattern as email - log every send attempt
async sendTransactionAlert(phone, firstName, details) {
  try {
    const result = await this.provider.send({...});

    // ✅ ADD: Log delivery
    await this.notificationLogService.logDelivery({...});

  } catch (error) {
    // ✅ ADD: Log failure
    await this.notificationLogService.logFailure({...});
  }
}
```

---

### 3. **Add Missing Event Triggers** (High Priority)

#### In `paystack-webhook.service.ts`:
```typescript
// BVN Verification Success
async handleCustomerIdentificationSuccess(data: any) {
  // ... existing upgrade logic ...

  // ✅ ADD: Send notification
  await this.notificationDispatcher.sendNotification({
    userId: user.id,
    eventType: 'bvn_verified',
    category: 'KYC',
    channels: ['EMAIL', 'SMS', 'IN_APP', 'PUSH'],
    title: '🎉 BVN Verified Successfully',
    message: `Your BVN has been verified! Your account has been upgraded to TIER_2 with ₦5M transaction limits.`,
    data: {
      previousTier: user.kycTier,
      newTier: 'TIER_2',
    },
  });
}

// DVA Creation Success
async handleDedicatedAccountAssignSuccess(data: any) {
  // ✅ ADD: Send notification
  await this.notificationDispatcher.sendNotification({
    userId: user.id,
    eventType: 'dva_created',
    category: 'ACCOUNT',
    channels: ['EMAIL', 'SMS', 'IN_APP'],
    title: 'Virtual Account Ready!',
    message: `Your dedicated account ${data.account_number} (${data.bank.name}) is now active.`,
    data: {
      accountNumber: data.account_number,
      bankName: data.bank.name,
      accountName: data.account_name,
    },
  });
}
```

#### In `payments.controller.ts`:
```typescript
// Transfer Success
async handleTransferSuccess(data: any) {
  // ✅ ADD: Send notification
  await this.notificationDispatcher.sendNotification({
    userId: transfer.userId,
    eventType: 'withdrawal_success',
    category: 'TRANSACTION',
    channels: ['EMAIL', 'SMS', 'IN_APP', 'PUSH'],
    title: 'Withdrawal Successful',
    message: `₦${transfer.amount} has been sent to ${transfer.accountName}`,
    data: {
      amount: transfer.amount,
      reference: transfer.reference,
      accountNumber: transfer.accountNumber,
      bankName: transfer.bankName,
    },
  });
}

// Transfer Failed
async handleTransferFailed(data: any) {
  // ✅ ADD: Send notification
  await this.notificationDispatcher.sendNotification({
    userId: transfer.userId,
    eventType: 'withdrawal_failed',
    category: 'TRANSACTION',
    channels: ['EMAIL', 'SMS', 'IN_APP', 'PUSH'],
    title: 'Withdrawal Failed',
    message: `Your withdrawal of ₦${transfer.amount} failed. Amount refunded to your wallet.`,
    data: {
      amount: transfer.amount,
      reference: transfer.reference,
      reason: data.message,
    },
  });
}
```

---

### 4. **Push Notifications** (Medium Priority)

#### Install OneSignal:
```bash
cd /Users/joseph/Desktop/mularpay/apps/mularpay-api
pnpm add onesignal-node
```

#### Create `push-notification.service.ts`:
```typescript
import * as OneSignal from 'onesignal-node';

@Injectable()
export class PushNotificationService {
  private client: OneSignal.Client;

  constructor(private configService: ConfigService) {
    this.client = new OneSignal.Client(
      this.configService.get('ONESIGNAL_APP_ID'),
      this.configService.get('ONESIGNAL_API_KEY'),
    );
  }

  async sendPush(userId: string, notification: {
    title: string;
    message: string;
    data?: any;
  }) {
    // Get user's device tokens from database
    const devices = await this.getDeviceTokens(userId);

    if (devices.length === 0) {
      return; // User hasn't enabled push on any device
    }

    const result = await this.client.createNotification({
      headings: { en: notification.title },
      contents: { en: notification.message },
      include_player_ids: devices,
      data: notification.data,
    });

    return result;
  }
}
```

#### Create `DeviceToken` model:
```prisma
model DeviceToken {
  id       String @id @default(uuid())
  userId   String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  token    String @unique // OneSignal player ID
  platform String // "ios" or "android"
  isActive Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@map("device_tokens")
}
```

---

### 5. **Notification Templates** (Medium Priority)

#### Seed Default Templates:
```typescript
// In prisma/seed.ts
const templates = [
  {
    name: 'deposit-success-email',
    eventType: 'deposit',
    channel: 'EMAIL',
    subject: 'Deposit Successful - ₦{{amount}}',
    bodyTemplate: `
      Hi {{firstName}},

      Your wallet has been credited with ₦{{amount}}.

      Transaction Reference: {{reference}}
      New Balance: ₦{{newBalance}}
      Date: {{date}}

      Thank you for using MularPay!
    `,
    variables: ['firstName', 'amount', 'reference', 'newBalance', 'date'],
  },
  {
    name: 'deposit-success-sms',
    eventType: 'deposit',
    channel: 'SMS',
    bodyTemplate: 'Hi {{firstName}}! ₦{{amount}} deposited. Ref: {{reference}}. Balance: ₦{{newBalance}}. - MularPay',
    variables: ['firstName', 'amount', 'reference', 'newBalance'],
  },
  // ... more templates
];
```

#### Create `TemplateService`:
```typescript
@Injectable()
export class TemplateService {
  async renderTemplate(templateName: string, variables: Record<string, any>) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { name: templateName },
    });

    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    let rendered = template.bodyTemplate;

    // Replace all {{variable}} with values
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return {
      subject: template.subject,
      body: rendered,
    };
  }
}
```

---

### 6. **Queue Processor** (Medium Priority)

#### Install Bull Queue:
```bash
pnpm add @nestjs/bull bull
pnpm add -D @types/bull
```

#### Create `notification-queue.processor.ts`:
```typescript
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('notifications')
export class NotificationQueueProcessor {

  @Process('send-email')
  async sendEmail(job: Job) {
    const { userId, notificationId, templateId, variables } = job.data;

    try {
      // 1. Render template
      const rendered = await this.templateService.renderTemplate(templateId, variables);

      // 2. Send email
      await this.emailService.send(user.email, rendered.subject, rendered.body);

      // 3. Log success
      await this.logService.logDelivery({
        notificationId,
        userId,
        channel: 'EMAIL',
        status: 'SENT',
      });

    } catch (error) {
      // Retry up to 3 times
      if (job.attemptsMade < 3) {
        throw error; // Bull will retry
      }

      // Log failure after max retries
      await this.logService.logFailure({
        notificationId,
        userId,
        channel: 'EMAIL',
        status: 'FAILED',
        failureReason: error.message,
      });
    }
  }

  @Process('send-sms')
  async sendSms(job: Job) {
    // Same pattern as email
  }

  @Process('send-push')
  async sendPush(job: Job) {
    // Same pattern as email
  }
}
```

---

## 🔄 Complete Flow Example

### User Deposits ₦10,000 via DVA:

```
1. Paystack webhook received → charge.success
   ↓
2. Wallet credited in database
   ↓
3. NotificationDispatcher.sendNotification({
     userId: "user-123",
     eventType: "deposit",
     category: "TRANSACTION",
     channels: ["EMAIL", "SMS", "IN_APP", "PUSH"],
     title: "Deposit Successful",
     message: "₦10,000 deposited",
     data: { amount: 10000, reference: "TXN_123" }
   })
   ↓
4. Check user preferences:
   - Email: ✅ Enabled (transactionEmails = true)
   - SMS: ✅ Enabled (transactionSms = true)
   - Push: ✅ Enabled (transactionPush = true)
   - Quiet Hours: ❌ Not in quiet hours
   ↓
5. Create in-app notification immediately
   ↓
6. Queue email job → Bull Queue
   ↓
7. Queue SMS job → Bull Queue
   ↓
8. Queue push job → Bull Queue
   ↓
9. Worker processes email:
   - Render template: "deposit-success-email"
   - Send via Resend
   - Log delivery: SENT
   ↓
10. Worker processes SMS:
   - Render template: "deposit-success-sms"
   - Send via Termii
   - Log delivery: SENT
   ↓
11. Worker processes push:
   - Send via OneSignal
   - Log delivery: SENT
   ↓
12. User receives:
   - ✅ In-app notification (instant)
   - ✅ Email (within seconds)
   - ✅ SMS (within seconds)
   - ✅ Push notification (instant)
```

---

## 📱 Mobile App Integration (Next)

### Frontend Tasks:

#### 1. **Create Notification Preferences Screen**
```typescript
// app/settings/notifications.tsx

import { useQuery, useMutation } from '@tanstack/react-query';

export default function NotificationSettingsScreen() {
  const { data: preferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => apiClient.get('/notification-preferences'),
  });

  const updatePreferences = useMutation({
    mutationFn: (updates) =>
      apiClient.put('/notification-preferences', updates),
  });

  return (
    <ScrollView>
      <Section title="Email Notifications">
        <Switch
          value={preferences?.transactionEmails}
          onValueChange={(value) =>
            updatePreferences.mutate({ transactionEmails: value })
          }
          label="Transaction Alerts"
        />
        <Switch
          value={preferences?.securityEmails}
          label="Security Alerts"
        />
        ...
      </Section>

      <Section title="SMS Notifications">
        ...
      </Section>

      <Section title="Quiet Hours">
        <Switch value={preferences?.quietHoursEnabled} />
        <TimePicker value={preferences?.quietHoursStart} />
        <TimePicker value={preferences?.quietHoursEnd} />
      </Section>
    </ScrollView>
  );
}
```

#### 2. **Push Notification Setup (OneSignal)**
```bash
# In mobile app
npm install react-native-onesignal
```

```typescript
// app/_layout.tsx
import OneSignal from 'react-native-onesignal';

OneSignal.setAppId('YOUR_ONESIGNAL_APP_ID');

OneSignal.setNotificationOpenedHandler((notification) => {
  console.log('Notification opened:', notification);
  // Navigate to relevant screen
});

OneSignal.promptForPushNotificationsWithUserResponse((response) => {
  console.log('Push permission:', response);

  // Send device token to backend
  const playerId = OneSignal.getDeviceState().userId;
  apiClient.post('/device-tokens', {
    token: playerId,
    platform: Platform.OS,
  });
});
```

#### 3. **Real-time In-App Notifications**
```typescript
// Use WebSocket or polling to get new notifications
const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: () => apiClient.get('/notifications'),
  refetchInterval: 30000, // Poll every 30 seconds
});

// Show unread count badge
<TabBarIcon
  name="notifications"
  badge={notifications?.filter(n => !n.isRead).length}
/>
```

---

## ✅ Summary

### Phase 1 Complete:
- ✅ Database schema with 5 new models
- ✅ Notification preferences service
- ✅ Preference management API
- ✅ User control over all channels
- ✅ Quiet hours support
- ✅ Foundation for analytics

### Phase 2 (Next):
- ⏳ Notification dispatcher service
- ⏳ Update email/SMS services with logging
- ⏳ Add missing event triggers
- ⏳ Push notification integration
- ⏳ Template management
- ⏳ Queue processor

### Phase 3 (Future):
- ⏳ Notification analytics dashboard
- ⏳ Delivery webhooks from providers
- ⏳ A/B testing for messages
- ⏳ Daily/weekly digest emails
- ⏳ Mobile app notification center

---

**Status:** ✅ Phase 1 complete and committed
**Next Action:** Run database migration when DB is online
**Commit:** `792d9b4` - feat: implement comprehensive notification preference system (Phase 1)
