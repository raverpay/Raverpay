# Phase 1.5 Environment Setup

## Environment Variables Required

Add these variables to your `.env` file (both local and production):

```bash
# Payment Gateway - Paystack
# Get your keys from: https://dashboard.paystack.com/#/settings/developer
PAYSTACK_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxxxx"  # Test key
# PAYSTACK_SECRET_KEY="sk_live_xxxxxxxxxxxxxxxxxxxxxx"  # Production key (uncomment for prod)

PAYSTACK_PUBLIC_KEY="pk_test_xxxxxxxxxxxxxxxxxxxxxx"  # Optional, for frontend
```

---

## Getting Paystack API Keys

1. **Sign up for Paystack:**
   - Go to https://paystack.com/
   - Create an account
   - Complete business verification (for production keys)

2. **Get Test Keys:**
   - Login to https://dashboard.paystack.com/
   - Go to Settings → API Keys & Webhooks
   - Copy your **Test Secret Key** (starts with `sk_test_`)
   - Copy your **Test Public Key** (starts with `pk_test_`)

3. **Testing Mode:**
   - Use test keys for development
   - Test cards: https://paystack.com/docs/payments/test-payments/
   - Example test card: `4084084084084081` (success)
   - CVV: `408`, Expiry: Any future date, PIN: `0000`

4. **Production Keys:**
   - After business verification
   - Go to Settings → API Keys & Webhooks → "Activate Live Mode"
   - Copy your **Live Secret Key** (starts with `sk_live_`)

---

## Webhook Setup (IMPORTANT for production)

### Local Development (using ngrok)

1. **Install ngrok:**

   ```bash
   # macOS
   brew install ngrok

   # Or download from: https://ngrok.com/download
   ```

2. **Start your API server:**

   ```bash
   cd apps/raverpay-api
   pnpm run start:dev
   ```

3. **Expose local server:**

   ```bash
   ngrok http 3001
   ```

4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

5. **Configure Paystack webhook:**
   - Go to Paystack Dashboard → Settings → API Keys & Webhooks
   - Click "Add Webhook"
   - URL: `https://abc123.ngrok.io/api/payments/webhooks/paystack`
   - Events: Select all (or at minimum: `charge.success`, `transfer.success`, `transfer.failed`)
   - Save

### Production Deployment

1. **Update webhook URL in Paystack:**
   - URL: `https://your-production-domain.com/api/payments/webhooks/paystack`
   - Example: `https://raverpayraverpay-api-production.up.railway.app/api/payments/webhooks/paystack`

2. **Test webhook:**
   - Paystack will send a test event
   - Check your server logs to confirm receipt

---

## Testing Checklist

- [ ] Add `PAYSTACK_SECRET_KEY` to `.env`
- [ ] Add `PAYSTACK_PUBLIC_KEY` to `.env` (optional)
- [ ] Restart server
- [ ] Test card payment initialization
- [ ] Test payment verification
- [ ] Test virtual account retrieval
- [ ] Test bank list
- [ ] Test account resolution
- [ ] Test withdrawal (requires Paystack balance in test mode)
- [ ] Set up ngrok for webhook testing
- [ ] Configure webhook in Paystack dashboard
- [ ] Test webhook with actual payment

---

## Important Notes

### Virtual Accounts

- Automatically created when user registers
- Uses Wema Bank by default
- Users can transfer to this account to fund wallet
- Instant credit via webhooks

### Transaction Fees

- **Card funding:** 2% (₦50 min, ₦2,000 max)
- **Bank transfer:** Free
- **Withdrawal < ₦5,000:** ₦10
- **Withdrawal ₦5,000-₦50,000:** ₦25
- **Withdrawal > ₦50,000:** ₦50

### Paystack Transfer Balance

- Withdrawals require sufficient balance in your Paystack account
- Test mode: Limited test balance
- Production: Fund your Paystack account from your bank

### Rate Limits

- Paystack API has rate limits
- Test mode: 100 requests/second
- Production: 150 requests/second
- Consider implementing caching for bank list

---

## Troubleshooting

### "Failed to initialize payment"

- Check if `PAYSTACK_SECRET_KEY` is set
- Verify key is correct (starts with `sk_test_` or `sk_live_`)
- Check Paystack dashboard for errors

### "Virtual account not found"

- Virtual account creation happens async on registration
- Check server logs for creation errors
- Manually trigger: Login as user, call GET `/api/transactions/virtual-account`

### "Withdrawal failed. Amount refunded to wallet."

- Check Paystack balance (insufficient funds)
- Verify bank code is correct
- Check account number (must be 10 digits)
- Ensure account name matches exactly

### Webhooks not received

- Check ngrok is running
- Verify webhook URL in Paystack dashboard
- Check server logs for webhook signature verification
- Test webhook manually from Paystack dashboard

---

## Next Steps

After setting up environment variables:

1. **Test locally** with Paystack test keys
2. **Deploy to production** (Railway/Heroku)
3. **Add production keys** to environment variables
4. **Configure production webhooks**
5. **Test with real (small) transactions**
6. **Monitor transactions** in Paystack dashboard

---

**Last Updated:** November 9, 2025  
**Paystack Documentation:** https://paystack.com/docs  
**Support:** support@paystack.com
