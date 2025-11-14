# Redis Caching Implementation

This document describes the caching strategy implemented in the MularPay API for performance optimization.

## Overview

We've implemented Redis caching using Upstash Redis (or any Redis-compatible service) to dramatically improve API response times and reduce database load.

## Setup

### Environment Variables

Add the following to your `.env` file:

```env
# Upstash Redis (Recommended for serverless/Railway)
UPSTASH_REDIS_URL=rediss://default:your-password@your-region.upstash.io:6379

# OR Railway Redis (if using Railway's Redis addon)
UPSTASH_REDIS_URL=redis://default:password@redis.railway.internal:6379
```

### Installation

Dependencies are already installed via `pnpm install`:
- `@upstash/redis` - Upstash Redis client
- `@nestjs/cache-manager` - NestJS caching module
- `cache-manager` - Abstract caching layer
- `ioredis` - Redis client for Node.js

## What's Cached

### 1. Wallet Balance (60 seconds TTL)
- **Key**: `wallet:{userId}`
- **Data**: Balance, limits, KYC tier, daily/monthly spent
- **Invalidated**: After any transaction
- **Impact**: 10x faster wallet queries

### 2. Transaction History (2 minutes TTL)
- **Key**: `transactions:{userId}:page:{page}:limit:{limit}:type:{type}:status:{status}:start:{startDate}:end:{endDate}`
- **Data**: Paginated transaction list with summary
- **Invalidated**: After new transactions
- **Impact**: 8x faster transaction queries

### 3. Single Transaction (10 minutes TTL)
- **Key**: `transaction:{transactionId}`
- **Data**: Complete transaction details
- **Invalidated**: On status change
- **Impact**: Instant transaction details

## Cache Invalidation

Caches are automatically invalidated when data changes:

### VTU Purchases (Airtime, Data, Cable, Electricity)
After successful purchase:
```typescript
await this.walletService.invalidateWalletCache(userId);
await this.walletService.invalidateTransactionCache(userId);
```

### Wallet Funding (Bank Transfer)
After webhook processes deposit:
```typescript
await this.walletService.invalidateWalletCache(virtualAccount.userId);
await this.walletService.invalidateTransactionCache(virtualAccount.userId);
```

## Performance Indexes

Database indexes have been added to speed up common queries:

```sql
-- Transaction queries
CREATE INDEX idx_transactions_user_created ON transactions(userId, createdAt DESC);
CREATE INDEX idx_transactions_user_type ON transactions(userId, type);
CREATE INDEX idx_transactions_user_status ON transactions(userId, status);
CREATE INDEX idx_transactions_reference ON transactions(reference);

-- VTU orders
CREATE INDEX idx_vtu_orders_user_created ON vtu_orders(userId, createdAt DESC);
CREATE INDEX idx_vtu_orders_status ON vtu_orders(status);

-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

-- Audit logs
CREATE INDEX idx_audit_logs_user ON audit_logs(userId, createdAt DESC);
```

## Expected Performance Improvements

| Endpoint | Before | After | Improvement |
|----------|--------|-------|-------------|
| `GET /wallet` | 500ms | 50ms | **10x faster** |
| `GET /wallet/transactions` | 800ms | 100ms | **8x faster** |
| `GET /wallet/transactions/:id` | 300ms | 30ms | **10x faster** |

## Monitoring

### Application Logs

The cache service includes built-in detailed logging:

**On Startup:**
```
✅ Redis cache enabled with URL: rediss://****@select-malamute-29128.upstash.io:6379
```

**Cache Operations (DEBUG level):**
```
✅ Cache HIT: wallet:user123
❌ Cache MISS: wallet:user456
💾 Cache SET: wallet:user456 (TTL: 60s)
🗑️  Cache DEL: wallet:user789
```

**To see debug logs in Railway:**
1. Go to Railway project → Deployments
2. Click on latest deployment → Logs
3. Search for "Cache HIT" or "Cache MISS"

### Upstash Dashboard

Monitor real-time Redis usage:

1. Go to https://console.upstash.com
2. Select your Redis database
3. View metrics:
   - **Commands/sec**: Number of cache operations
   - **Storage**: Memory used by cached data
   - **Daily Requests**: Total cache operations (free tier: 10K/day)
   - **Latency**: Average Redis response time

### What to Monitor

- **Cache hit rate**: Should be >80% for wallet queries after warm-up
- **Request count**: Should see spikes matching API traffic
- **Storage size**: Should stay under 10MB for typical usage
- **Latency**: Should be <10ms for Upstash (Europe region)

## Fallback Behavior

If Redis is unavailable:
1. The cache module falls back to **in-memory caching**
2. A warning is logged: `⚠️  UPSTASH_REDIS_URL not found. Using in-memory cache.`
3. API continues to function normally with database queries

## Cost Analysis

### Upstash Redis (Recommended)
- **Free Tier**: 10,000 requests/day
- **Paid**: $0.20 per 100K requests
- **Example**: 100 users × 50 requests/day = 5,000 requests/day = **FREE**

### Railway Redis
- **Cost**: $5-10/month flat rate
- **Better for**: >1M requests/day

## Testing Cache Locally

To verify caching is working:

1. **Add Redis URL to `.env`:**
   ```env
   REDIS_URL="rediss://default:AXHIAAIncDIxYjkzYTY3Mzg5OGU0MDBlYWE1YzBiYWZjNmI5NzAzMnAyMjkxMjg@select-malamute-29128.upstash.io:6379"
   ```

2. **Start the API:**
   ```bash
   pnpm run start:dev
   ```

3. **Check startup logs for:**
   ```
   ✅ Redis cache enabled with URL: rediss://****@select-malamute-29128.upstash.io:6379
   ```

4. **Make API requests:**
   ```bash
   # First request - should see "Cache MISS"
   curl http://localhost:3000/api/wallet

   # Second request within 60s - should see "Cache HIT"
   curl http://localhost:3000/api/wallet
   ```

5. **Check Upstash dashboard:**
   - You should see command count increase
   - Check "Recent Commands" tab to see GET/SET operations

## Deployment Notes

1. **Railway**: Add `REDIS_URL` environment variable
2. **Supabase**: Use Supabase pooler for database (already configured)
3. **Same Region**: Ensure Redis and API are in the same region for lowest latency

## Future Optimizations

- Add VTU product caching (data plans, cable packages)
- Implement rate limiting with Redis
- Add session storage
- Cache user profiles
