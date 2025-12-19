# Circle Webhook Setup Guide

This document explains how to set up Circle webhooks for the RaverPay application.

## Overview

Circle sends webhook notifications for:

- **Transaction updates** - When transactions change state (pending → confirmed → complete)
- **Wallet state changes** - When wallets are created, frozen, or unfrozen
- **CCTP transfer progress** - Cross-chain transfer state updates

## Webhook Endpoint

Your webhook endpoint is:

**Production:**

```
POST https://api.raverpay.com/api/circle/webhooks
```

**Development (ngrok):**

```
POST https://9bd10726e499.ngrok-free.app/api/circle/webhooks
```

**Local:**

```
POST http://localhost:3001/api/circle/webhooks
```

## Setting Up Webhooks in Circle Console

### Step 1: Access Circle Console

1. Go to [Circle Console](https://console.circle.com)
2. Log in with your Circle account
3. Navigate to **Developer** → **Webhooks**

### Step 2: Add Webhook Subscription

1. Click **Add Subscription**
2. Enter your webhook URL:
   - **Production:** `https://api.raverpay.com/api/circle/webhooks`
   - **Development:** `https://9bd10726e499.ngrok-free.app/api/circle/webhooks`
3. Select the events you want to receive:
   - `transactions.updated` - Transaction state changes
   - `wallets.updated` - Wallet state changes
   - `transfers.updated` - CCTP transfer updates (if using cross-chain)

### Step 3: Get Your Webhook Secret

After creating the subscription:

1. Circle will provide a **webhook secret**
2. Add this to your `.env` file:
   ```env
   CIRCLE_WEBHOOK_SECRET=your_webhook_secret_here
   ```

## Webhook Security

Our webhook handler verifies Circle's signature to ensure authenticity:

```typescript
// The signature is verified automatically
// Located in: apps/raverpay-api/src/circle/webhooks/circle-webhook.service.ts
```

### Signature Verification

Circle signs webhooks using HMAC-SHA256. The signature is included in the `x-circle-signature` header.

## Supported Webhook Events

### Transaction Events

- `transaction.created` - New transaction initiated
- `transaction.pending` - Transaction is being processed
- `transaction.confirmed` - Transaction confirmed on blockchain
- `transaction.complete` - Transaction fully complete
- `transaction.failed` - Transaction failed
- `transaction.cancelled` - Transaction cancelled

### Wallet Events

- `wallet.created` - New wallet created
- `wallet.updated` - Wallet state changed

### CCTP Events (Cross-Chain)

- `cctp.burn_pending` - USDC burn initiated
- `cctp.burn_complete` - USDC burned on source chain
- `cctp.attestation_pending` - Waiting for Circle attestation
- `cctp.attestation_complete` - Attestation received
- `cctp.mint_pending` - Minting on destination chain
- `cctp.complete` - Cross-chain transfer complete

## Testing Webhooks

### Using Circle's Test Events

1. In Circle Console, go to **Webhooks** → your subscription
2. Click **Send Test Event**
3. Select an event type
4. Monitor your logs for the received event

### Using ngrok for Local Development

Your current ngrok development URL is:

```
https://9bd10726e499.ngrok-free.app/api/circle/webhooks
```

**Steps:**

1. Ensure ngrok is running and forwarding to port 3001
2. Start your API: `cd apps/raverpay-api && pnpm start:dev`
3. Use the ngrok URL in Circle Console for testing

**Note:** If ngrok URL changes, update Circle Console webhook subscription accordingly.

### Webhook Logs

Check webhook logs in the admin dashboard:

```
/dashboard/circle-wallets/webhooks
```

Or query the database:

```sql
SELECT * FROM "CircleWebhookLog" ORDER BY "createdAt" DESC LIMIT 20;
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check URL is accessible** - Ensure your API is publicly reachable
2. **Verify SSL** - Circle requires HTTPS in production
3. **Check firewall** - Ensure Circle's IPs are not blocked
4. **Review logs** - Check API logs for any errors

### Signature Verification Failed

1. **Check webhook secret** - Ensure `CIRCLE_WEBHOOK_SECRET` matches Circle Console
2. **Check timestamp** - Webhooks older than 5 minutes are rejected
3. **Raw body parsing** - Ensure body is not modified before verification

### Events Not Processing

1. **Check database connection** - Ensure Prisma can connect
2. **Review webhook service logs** - Look for processing errors
3. **Check idempotency** - Same event ID won't process twice

## Environment Variables

Required environment variables for webhooks:

```env
# Circle Webhook Secret (from Circle Console)
CIRCLE_WEBHOOK_SECRET=your_webhook_secret

# Already configured
CIRCLE_API_KEY=your_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret
CIRCLE_ENVIRONMENT=testnet
CIRCLE_API_BASE_URL=https://api.circle.com/v1/w3s
```

## Production Checklist

- [ ] Webhook URL is HTTPS
- [ ] `CIRCLE_WEBHOOK_SECRET` is set
- [ ] Signature verification is enabled
- [ ] Database migrations are applied
- [ ] Monitoring/alerting is configured
- [ ] Retry handling is tested
- [ ] Idempotency is verified

## Support

For Circle-specific issues:

- [Circle Developer Docs](https://developers.circle.com/w3s)
- [Circle Support](https://support.circle.com)

For RaverPay issues:

- Check API logs
- Review webhook logs in admin dashboard
- Contact development team
