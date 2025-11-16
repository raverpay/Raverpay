# Wallet Deposit Notification Fix

## Problem

When funding wallet via card or bank transfer, users were NOT receiving email/SMS notifications - only in-app notifications were created.

## Root Cause

The `PaymentsController` (which handles the Paystack webhook) was using the old `NotificationsService.createNotification()` method, which only creates in-app notifications.

The proper multi-channel notification system (`NotificationDispatcherService`) was not being used.

## Solution

Updated `PaymentsController` to use `NotificationDispatcherService` instead of `NotificationsService`, which sends notifications via:
- ✅ Email (via Resend)
- ✅ SMS (via Termii/VTPass) - if user enables it
- ✅ In-App (saved to database)

## Changes Made

### File: `src/payments/payments.controller.ts`

#### 1. Updated Imports
```typescript
// Before
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

// After
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
```

#### 2. Updated Constructor
```typescript
// Before
constructor(
  private readonly notificationsService: NotificationsService,
) {}

// After
constructor(
  private readonly notificationDispatcher: NotificationDispatcherService,
) {}
```

#### 3. Updated Virtual Account Payment Notification (Lines 150-174)
```typescript
// Before
await this.notificationsService.createNotification({
  userId: transaction.userId,
  type: NotificationType.TRANSACTION,
  title: 'Wallet Credited',
  message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()}`,
  data: {
    transactionId: transaction.id,
    amount: amountInNaira,
    type: 'DEPOSIT',
  },
});

// After
await this.notificationDispatcher.sendNotification({
  userId: transaction.userId,
  eventType: 'deposit_success',
  category: 'TRANSACTION',
  channels: ['EMAIL', 'SMS', 'IN_APP'],
  title: 'Wallet Funded Successfully',
  message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()} via bank transfer.`,
  data: {
    transactionId: transaction.id,
    amount: amountInNaira,
    reference,
    channel: 'BANK_TRANSFER',
  },
});
```

#### 4. Added Card Payment Notification (Lines 176-210)
Previously, card payments had NO notification at all. Now they do:

```typescript
// NEW CODE
const transaction = await this.transactionsService['prisma'].transaction.findUnique({
  where: { reference },
});

if (transaction) {
  try {
    await this.notificationDispatcher.sendNotification({
      userId: transaction.userId,
      eventType: 'deposit_success',
      category: 'TRANSACTION',
      channels: ['EMAIL', 'SMS', 'IN_APP'],
      title: 'Wallet Funded Successfully',
      message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()} via card payment.`,
      data: {
        transactionId: transaction.id,
        amount: amountInNaira,
        reference,
        channel: 'CARD',
      },
    });
    this.logger.log(`📬 Card deposit notification sent for user ${transaction.userId}`);
  } catch (notifError) {
    this.logger.error(
      `Failed to send card deposit notification to user ${transaction.userId}`,
      notifError,
    );
  }
}
```

## What Now Works

### Bank Transfer (DVA) Deposit
1. User transfers money to their virtual account
2. Paystack sends webhook → `POST /api/payments/webhooks/paystack`
3. Backend credits wallet
4. **NEW**: Backend sends multi-channel notification
5. User receives:
   - ✅ Email notification
   - ✅ SMS notification (if enabled)
   - ✅ In-app notification

### Card Payment Deposit
1. User funds wallet via card
2. Payment succeeds → Paystack sends webhook
3. Backend processes payment
4. **NEW**: Backend sends multi-channel notification
5. User receives:
   - ✅ Email notification
   - ✅ SMS notification (if enabled)
   - ✅ In-app notification

## Testing

### Test 1: Fund Wallet via Card
1. Open mobile app
2. Go to Fund Wallet → Card Payment
3. Complete payment
4. **Expected**:
   - Backend logs: `📬 Card deposit notification sent for user <id>`
   - Email received: "Wallet Funded Successfully"
   - In-app notification appears

### Test 2: Fund Wallet via Bank Transfer (DVA)
1. Transfer money to your virtual account number
2. Wait 1-2 minutes for Paystack webhook
3. **Expected**:
   - Backend logs: `📬 Deposit notification sent for user <id>`
   - Email received: "Wallet Funded Successfully"
   - In-app notification appears

### Test 3: Check Notification Preferences
1. Ensure email is enabled:
   - Profile → Notification Preferences
   - "Email Notifications" = ON
   - "Transaction Notifications" > "Email" = ON

## Backend Logs to Look For

When you fund your wallet, you should now see:

```
[PaymentsController] Webhook event received: charge.success
[PaymentsController] Card payment successful: <reference>
[NotificationDispatcherService] Dispatching deposit_success notification for user <id>
[NotificationDispatcherService] Notification <id> dispatched to channels: EMAIL, IN_APP
[EmailService] Sending email to <email>: Wallet Funded Successfully
[EmailService] ✅ Email sent successfully to <email>
📬 Card deposit notification sent for user <id>
```

## Why It Wasn't Working Before

### The Old Flow (Broken)
1. Webhook received
2. `notificationsService.createNotification()` called
3. Only created database record (IN_APP)
4. NO email sent
5. NO SMS sent

### The New Flow (Fixed)
1. Webhook received
2. `notificationDispatcher.sendNotification()` called
3. Creates database record (IN_APP)
4. Checks user preferences
5. Sends email via Resend ✅
6. Sends SMS if enabled ✅
7. Logs delivery status

## Prerequisites for Emails to Work

Make sure these environment variables are set in `apps/mularpay-api/.env`:

```env
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=MularPay

# SMS Service (VTPass or Termii)
VTPASS_API_KEY=xxxxx
VTPASS_PUBLIC_KEY=xxxxx
```

## Files Modified

- ✅ `src/payments/payments.controller.ts` - Updated to use NotificationDispatcherService

## No Breaking Changes

✅ Webhook endpoint remains the same
✅ Payment processing unchanged
✅ Database schema unchanged
✅ All existing functionality preserved

**Only change**: Notifications now properly send via email/SMS instead of just in-app.

## Next Test

1. Make sure your backend is running
2. Fund your wallet (card or bank transfer)
3. Check terminal for `📬 Deposit notification sent`
4. Check your email inbox
5. Check in-app notifications
6. All three should show the notification!

---

**Note**: If you still don't receive emails, check:
1. `RESEND_API_KEY` is set in `.env`
2. Notification preferences have email enabled
3. Backend logs for email errors
4. Spam folder in email
