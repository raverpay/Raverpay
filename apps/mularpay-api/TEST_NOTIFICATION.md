# Testing Wallet Deposit Notifications

## How to Test if Deposit Notifications Are Working

### Method 1: Check Backend Logs (Real-time)

When you fund your wallet, check the terminal where `pnpm dev` is running. You should see:

```
✅ Wallet credited: User <user_id> - ₦<amount>
📬 Deposit notification sent for user <user_id>
```

If you DON'T see these logs, the webhook might not be reaching your backend.

### Method 2: Check Database for Notifications

Run this query to see if notifications were created:

```sql
SELECT
  id,
  title,
  message,
  category,
  channels,
  "isRead",
  "createdAt"
FROM notifications
WHERE category = 'TRANSACTION'
ORDER BY "createdAt" DESC
LIMIT 5;
```

### Method 3: Check Notification Logs

Check if emails/SMS were attempted:

```sql
SELECT
  nl.id,
  nl.channel,
  nl.status,
  nl."failureReason",
  nl."sentAt",
  n.title
FROM notification_logs nl
JOIN notifications n ON n.id = nl."notificationId"
ORDER BY nl."createdAt" DESC
LIMIT 10;
```

### Method 4: Check Your Notification Preferences

Make sure your preferences allow transaction notifications:

```sql
SELECT
  "emailEnabled",
  "transactionEmails",
  "smsEnabled",
  "transactionSms",
  "inAppEnabled"
FROM notification_preferences
WHERE "userId" = 'YOUR_USER_ID';
```

**Expected values for emails to work:**
- `emailEnabled`: true
- `transactionEmails`: true

## Common Issues & Solutions

### Issue 1: Webhook Not Reaching Backend

**Symptom**: No logs in terminal when you fund wallet

**Possible causes:**
1. Ngrok URL not set in Paystack dashboard
2. Paystack webhook secret mismatch
3. Webhook endpoint not registered

**Check:**
```bash
# In terminal, you should see:
[PaystackWebhookController] Received webhook: charge.success
```

### Issue 2: Notification Created But Email Not Sent

**Symptom**: Notification in database but no email received

**Possible causes:**
1. Email service not configured (Resend API key missing)
2. User preferences disabled email
3. Email service error

**Check environment variables:**
```env
# In apps/mularpay-api/.env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Check email service:**
```typescript
// Look for errors in logs like:
[EmailService] Failed to send email: ...
```

### Issue 3: User Preferences Blocking Notifications

**Symptom**: Code runs but channels filtered out

**Check logs for:**
```
No channels allowed for user <user_id>, skipping
```

**Solution:**
- Go to notification preferences in mobile app
- Enable "Email Notifications"
- Enable "Transaction Notifications" > "Email"

### Issue 4: In-App Notification Created But Not Showing

**Symptom**: Notification in database but not in mobile app

**Possible causes:**
1. React Query not refetching
2. User ID mismatch
3. Query filter issue

**Solution:**
- Pull to refresh on notifications screen
- Check that userId in database matches logged-in user
- Check React Query devtools

## Manual Test (For Debugging)

If you want to manually test notifications without funding wallet:

### Option 1: Use the Backend Directly

Create a test endpoint (temporary):

```typescript
// In any controller
@Get('test-notification')
async testNotification(@Request() req) {
  await this.notificationDispatcher.sendNotification({
    userId: req.user.id,
    eventType: 'test_deposit',
    category: 'TRANSACTION',
    channels: ['EMAIL', 'IN_APP'],
    title: 'Test Wallet Funding',
    message: 'This is a test notification to verify the system works.',
    data: { amount: 5000, test: true },
  });
  return { message: 'Test notification sent' };
}
```

Then call:
```bash
curl -X GET http://localhost:3000/test-notification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Option 2: Simulate Paystack Webhook

Use Postman or curl to send a fake webhook:

```bash
curl -X POST http://localhost:3000/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: YOUR_SIGNATURE" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "test_ref_123",
      "amount": 500000,
      "channel": "dedicated_nuban",
      "authorization": {
        "receiver_bank_account_number": "YOUR_DVA_NUMBER",
        "sender_name": "Test User",
        "sender_bank": "Test Bank"
      }
    }
  }'
```

## What Should Happen When You Fund Your Wallet

1. **Paystack receives bank transfer** → sends webhook to your backend
2. **Backend receives webhook** → logs "Received webhook: charge.success"
3. **Backend processes payment** → credits wallet, creates transaction
4. **Backend sends notification** → calls NotificationDispatcher
5. **Dispatcher checks preferences** → filters channels
6. **Dispatcher creates notification** → saves to database (IN_APP)
7. **Dispatcher sends email** → calls EmailService
8. **EmailService sends via Resend** → logs success/failure
9. **Mobile app refetches** → shows notification in-app
10. **You receive email** → check inbox

## Quick Diagnostic Checklist

When you fund your wallet, check these in order:

- [ ] Terminal shows "Received webhook: charge.success"
- [ ] Terminal shows "Wallet credited: User X - ₦Y"
- [ ] Terminal shows "📬 Deposit notification sent for user X"
- [ ] Database has new notification (query above)
- [ ] Database has notification_log entries
- [ ] Email service shows success (or error) in logs
- [ ] Mobile app shows notification
- [ ] Email inbox has message

If any step fails, that's where the issue is!

## Current Status

Based on the code review:

✅ **Webhook handler exists** - `paystack-webhook.service.ts:140-154`
✅ **Notification dispatch called** - Sends to EMAIL, SMS, IN_APP
✅ **Notification dispatcher exists** - Multi-channel orchestration
✅ **Email service exists** - Uses Resend
✅ **Mobile app integrated** - Fetches and displays notifications

**What to check:**
1. Are webhooks reaching your backend? (check ngrok terminal)
2. Is Resend API key configured? (check .env)
3. Are notification preferences enabled? (check mobile app settings)
4. Are emails going to spam? (check spam folder)

---

**Next Steps:**
1. Fund wallet again
2. Watch backend terminal for logs
3. Check database for notification
4. Check email (including spam)
5. Pull to refresh mobile app
