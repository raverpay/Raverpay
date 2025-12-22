# Idempotency Key Implementation

## Overview

Idempotency keys have been implemented for admin wallet adjustments to prevent duplicate transactions when requests are retried.

## How It Works

### Automatic Key Generation

- The API client automatically generates and adds an `Idempotency-Key` header to POST requests to wallet adjustment endpoints
- Keys are generated using browser's `crypto.randomUUID()` for uniqueness
- Each request attempt gets a new key, but retries preserve the same key

### Supported Endpoints

- `/admin/wallets/:userId/adjust` - Wallet balance adjustments

### Implementation Details

**File: `lib/utils/idempotency.ts`**

- `generateIdempotencyKey()` - Generates unique UUID v4
- `requiresIdempotencyKey()` - Checks if endpoint needs idempotency
- `IDEMPOTENT_ENDPOINTS` - List of endpoints that support idempotency

**File: `lib/api-client.ts`**

- Request interceptor automatically adds `Idempotency-Key` header
- Only adds key if not already present (preserves keys for retries)
- Fails gracefully if key generation fails (fail-open approach)

## Benefits

1. **Prevents Duplicate Adjustments**: If a request fails and is retried, the server returns the cached response instead of processing again
2. **Automatic**: No code changes needed in API functions - it's handled at the API client level
3. **Backward Compatible**: If key generation fails, requests proceed normally
4. **Network Resilience**: Admins can safely retry failed requests without worrying about double-adjustments

## Testing

To test idempotency:

1. Make a wallet adjustment request
2. If it fails due to network error, retry with the same request
3. The server should return the same transaction reference (cached response)
4. Check server logs for `[Idempotency]` messages

## Notes

- Idempotency keys are only added for POST requests to adjustment endpoints
- Keys are unique per request attempt
- Retries preserve the same key (handled by axios)
- Keys expire after 24 hours on the server
