# Logtail Diagnostic Testing

## 🔧 I've Added Diagnostic Endpoints

I've created two diagnostic endpoints to help us test if Logtail is working:

### 1. Check Logtail Status

```bash
GET /api/diagnostic/logtail-status
```

This will tell us if Logtail is enabled or not.

### 2. Send Test Log

```bash
GET /api/diagnostic/logtail-test
```

This will send a test log to Better Stack and flush it immediately.

---

## 🚀 Next Steps

### Step 1: Restart Your Server

**IMPORTANT:** You must restart your server for the new diagnostic module to load.

```bash
# Stop your server (Ctrl+C)
# Then start it again
cd apps/raverpay-api
pnpm run start:dev
```

### Step 2: Check Server Logs

Look for this message in your server startup logs:

```
✅ Logtail initialized with Better Stack endpoint (s1641618)
```

If you see:

- ❌ `LOGTAIL_SOURCE_TOKEN not configured` - The token is missing from .env
- ❌ `Failed to initialize Logtail` - There's an error with initialization

### Step 3: Test Logtail Status

Once the server is running, run this command:

```bash
curl -X GET https://5433cebdbae6.ngrok-free.app/api/diagnostic/logtail-status \
  -H "User-Agent: Mozilla/5.0"
```

**Expected response:**

```json
{
  "enabled": true,
  "message": "Logtail is enabled and ready"
}
```

### Step 4: Send Test Log

If status shows `enabled: true`, send a test log:

```bash
curl -X GET https://5433cebdbae6.ngrok-free.app/api/diagnostic/logtail-test \
  -H "User-Agent: Mozilla/5.0"
```

**Expected response:**

```json
{
  "success": true,
  "message": "Test log sent to Better Stack successfully!",
  "timestamp": "2025-12-21T12:15:00.000Z",
  "instructions": [
    "Check Better Stack dashboard:",
    "https://telemetry.betterstack.com/team/t486268/tail?s=1641618",
    "Look for message: 'Diagnostic test log from API endpoint'"
  ]
}
```

### Step 5: Check Better Stack Dashboard

Go to: https://telemetry.betterstack.com/team/t486268/tail?s=1641618

Look for a log with message: **"Diagnostic test log from API endpoint"**

---

## 🐛 Troubleshooting

### If `enabled: false`

- Check that `LOGTAIL_SOURCE_TOKEN=8q3WwqFjeC1ghtTFJcgjhefz` is in your `.env` file
- Restart the server
- Check server logs for initialization errors

### If test log fails

- Check the error message in the response
- Look at server console for any Logtail errors
- Verify the endpoint is correct: `https://s1641618.eu-nbg-2.betterstackdata.com`

### If logs don't appear in Better Stack

- Wait 10-15 seconds and refresh
- Check if the token is correct
- Verify network connectivity to Better Stack

---

**Please restart your server now and let me know what you see!**
