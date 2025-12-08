# RaverPay API Performance Optimization Plan

## Current Setup & Issues

### Infrastructure
- **API Hosting**: Railway (Europe)
- **Database**: Supabase PostgreSQL (Europe)
- **Issue**: Slow API responses
- **Same Region**: ✅ Good (low latency between API and DB)

### Current Performance Bottlenecks
1. **Database queries on every request** - No caching
2. **N+1 query problems** - Multiple database calls per request
3. **Heavy computations** - Calculating limits, balances repeatedly
4. **External API calls** - VTPass, Paystack (synchronous)
5. **No query optimization** - Missing database indexes

---

## Redis vs Upstash vs Railway

### What is Redis?
- **In-memory data store** - Extremely fast (sub-millisecond)
- **Cache layer** - Sits between your API and database
- **Session storage** - Store user sessions, JWT tokens
- **Rate limiting** - Track API usage per user

### Upstash Redis
- **Serverless Redis** - Pay per request, no servers to manage
- **HTTP/REST API** - Works anywhere, no connection pooling needed
- **Global replication** - Can replicate to multiple regions
- **Pricing**: ~$0.20 per 100K requests (free tier: 10K requests/day)
- **Best for**: Serverless, edge computing, low usage apps

**Pros**:
- ✅ No infrastructure management
- ✅ Automatic scaling
- ✅ Free tier available
- ✅ Works great with Railway
- ✅ Built-in analytics

**Cons**:
- ❌ Slightly higher latency than self-hosted (~10-20ms)
- ❌ Can get expensive at high scale
- ❌ HTTP overhead vs native Redis protocol

### Railway Redis
- **Self-hosted Redis** - You manage the instance
- **Native Redis protocol** - Faster than HTTP
- **Same datacenter** - Ultra-low latency with your API
- **Pricing**: ~$5-10/month flat rate

**Pros**:
- ✅ Lowest latency (same datacenter)
- ✅ Predictable pricing
- ✅ Full Redis features
- ✅ Better for high traffic

**Cons**:
- ❌ Need to manage/monitor
- ❌ Fixed cost even if unused
- ❌ Need to handle scaling manually

---

## Recommendation: Start with Upstash, Scale to Railway Redis

### Phase 1: Upstash Redis (Quick Win)
**When**: Right now
**Why**:
- Fast to implement (no infrastructure)
- Free tier covers development/testing
- Immediate performance boost
- Easy to migrate later

**Expected improvements**:
- Wallet balance: 500ms → 50ms (10x faster)
- Transaction list: 800ms → 100ms (8x faster)
- User profile: 300ms → 30ms (10x faster)

### Phase 2: Railway Redis (When scaling)
**When**: When you exceed 10K requests/day or need <5ms cache latency
**Why**:
- Lower latency (native protocol)
- Better for high traffic
- More cost-effective at scale

---

## What to Cache & TTL Strategy

### 1. User & Wallet Data (High Priority)

#### Wallet Balance
```typescript
Key: `wallet:${userId}`
TTL: 60 seconds
Invalidate: On any transaction

Data: {
  balance, dailySpent, monthlySpent,
  limits, tier, etc.
}

Impact: 10x faster wallet queries
```

#### User Profile
```typescript
Key: `user:${userId}`
TTL: 300 seconds (5 minutes)
Invalidate: On profile update

Data: {
  id, email, phone, firstName,
  kycTier, status, etc.
}

Impact: Reduce 90% of user queries
```

#### User Session
```typescript
Key: `session:${userId}`
TTL: 3600 seconds (1 hour)
Invalidate: On logout

Data: {
  userId, role, permissions,
  lastActivity, etc.
}

Impact: No DB query for auth checks
```

---

### 2. Transaction Data (Medium Priority)

#### Transaction History (Paginated)
```typescript
Key: `transactions:${userId}:page:${page}:type:${type}:status:${status}`
TTL: 120 seconds (2 minutes)
Invalidate: On new transaction

Data: Paginated transaction list

Impact: 8x faster transaction queries
```

#### Transaction Details
```typescript
Key: `transaction:${transactionId}`
TTL: 600 seconds (10 minutes)
Invalidate: On status change

Data: Full transaction details

Impact: Instant transaction details
```

---

### 3. VTU Product Data (High Priority)

#### Data Plans
```typescript
Key: `vtu:data:${network}`
TTL: 3600 seconds (1 hour)
Invalidate: Manual/webhook from VTPass

Data: All data plans for network

Impact: 20x faster (no VTPass call)
```

#### Cable TV Plans
```typescript
Key: `vtu:cable:${provider}`
TTL: 3600 seconds (1 hour)
Invalidate: Manual

Data: All cable plans

Impact: 20x faster
```

#### Electricity Providers
```typescript
Key: `vtu:electricity:providers`
TTL: 86400 seconds (24 hours)
Invalidate: Rarely changes

Data: List of DISCOs

Impact: Instant response
```

---

### 4. Rate Limiting (Critical)

#### API Rate Limit
```typescript
Key: `ratelimit:${userId}:${endpoint}`
TTL: 60 seconds
Increment: On each request

Limit: 100 requests/minute per user

Impact: Prevent abuse, reduce costs
```

#### Failed Login Attempts
```typescript
Key: `login:failed:${email}`
TTL: 900 seconds (15 minutes)
Increment: On failed login

Limit: 5 attempts before temporary ban

Impact: Security + prevent brute force
```

---

## Database Query Optimization

### Missing Indexes (Add These)

```sql
-- Transactions queries are slow without these
CREATE INDEX idx_transactions_user_created ON transactions(userId, createdAt DESC);
CREATE INDEX idx_transactions_user_type ON transactions(userId, type);
CREATE INDEX idx_transactions_user_status ON transactions(userId, status);
CREATE INDEX idx_transactions_reference ON transactions(reference);

-- VTU orders need indexing
CREATE INDEX idx_vtu_orders_user_created ON vtu_orders(userId, createdAt DESC);
CREATE INDEX idx_vtu_orders_status ON vtu_orders(status);

-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

-- Audit logs (if queried often)
CREATE INDEX idx_audit_logs_user ON audit_logs(userId, createdAt DESC);
```

**Expected improvement**: 3-5x faster queries

---

## Additional Optimizations

### 1. Enable Supabase Connection Pooling
```env
# Use Supabase's connection pooler (port 6543)
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres
```

**Impact**: Better connection handling, faster queries

---

### 2. Implement Response Compression
```typescript
// Enable gzip compression in NestJS
app.use(compression());
```

**Impact**: 60-80% smaller responses, faster over network

---

### 3. Lazy Load Heavy Computations
```typescript
// Don't calculate transaction summary unless needed
// Only fetch when user explicitly requests it

GET /wallet - Fast, no summary
GET /wallet?include=summary - Slower, with summary
```

**Impact**: Faster default responses

---

### 4. Background Jobs for Heavy Tasks
```typescript
// Don't block API response for:
- Sending emails
- SMS notifications
- Webhook calls to external services
- Audit log writes

// Use Bull Queue with Redis
```

**Impact**: API responds instantly, jobs run async

---

## Implementation Priority

### Week 1: Quick Wins (Biggest Impact)
1. ✅ **Add Upstash Redis** - 30 minutes setup
2. ✅ **Cache wallet balance** - 1 hour
3. ✅ **Cache VTU products** - 2 hours
4. ✅ **Add database indexes** - 30 minutes
5. ✅ **Enable compression** - 15 minutes

**Expected result**: 5-10x faster API

---

### Week 2: Advanced Caching
1. ✅ **Cache user profiles** - 1 hour
2. ✅ **Cache transaction lists** - 2 hours
3. ✅ **Implement rate limiting** - 2 hours
4. ✅ **Background job queue** - 3 hours

**Expected result**: 10-15x faster, more stable

---

### Week 3: Optimization
1. ✅ **Query optimization audit** - 2 hours
2. ✅ **Implement lazy loading** - 2 hours
3. ✅ **Add cache warming** - 1 hour
4. ✅ **Performance monitoring** - 2 hours

**Expected result**: Consistent sub-100ms responses

---

## Cost Analysis

### Upstash Redis (Recommended to Start)

**Free Tier**:
- 10,000 requests/day
- 256 MB storage
- Perfect for development + small production

**Pay-as-you-go** (after free tier):
- $0.20 per 100K requests
- ~$6/month for 1M requests/day
- ~$30/month for 5M requests/day

**Example**:
- 100 users × 50 requests/day = 5,000 requests/day
- Cost: **FREE** ✅

---

### Railway Redis (When You Scale)

**Pricing**:
- $5-10/month flat rate
- Unlimited requests
- Better value at >1M requests/day

**Break-even point**: ~500K requests/day

---

## Monitoring & Metrics

### What to Track

```typescript
// Cache performance
- Cache hit rate (target: >80%)
- Cache miss rate (target: <20%)
- Average response time (target: <100ms)

// Database performance
- Query execution time (target: <50ms)
- Connection pool usage (target: <70%)
- Slow query count (target: 0)

// API performance
- P50 latency (target: <100ms)
- P95 latency (target: <500ms)
- P99 latency (target: <1000ms)
- Error rate (target: <0.1%)
```

---

## Migration Path

### Option A: Upstash Only (Recommended)
```
Current → Upstash Redis → Monitor → Stay or migrate
```

**Best for**:
- Getting started quickly
- Unpredictable traffic
- Budget conscious
- <1M requests/day

---

### Option B: Railway Redis (Future)
```
Current → Upstash → Monitor → Railway Redis (when needed)
```

**Best for**:
- High traffic (>1M requests/day)
- Need lowest latency (<5ms)
- Predictable costs
- Mature product

---

## Decision Matrix

| Factor | Upstash | Railway Redis |
|--------|---------|---------------|
| **Setup Time** | 30 min ✅ | 2 hours |
| **Initial Cost** | $0 ✅ | $5-10/month |
| **Latency** | ~10-20ms | ~2-5ms ✅ |
| **Scaling** | Auto ✅ | Manual |
| **Maintenance** | Zero ✅ | Some required |
| **Best for** | <1M req/day | >1M req/day |

---

## Recommendation

### Start Here:
1. **Upstash Redis** - Free tier, immediate improvements
2. **Add database indexes** - Free, huge performance boost
3. **Enable compression** - Free, 60% smaller responses

### Expected Results:
- **Before**: 500-1000ms average response time
- **After**: 50-150ms average response time
- **Improvement**: **5-10x faster** ⚡

### Cost:
- **Month 1-6**: $0 (free tier)
- **After scaling**: $6-30/month
- **ROI**: Better UX = more users = worth it

---

## Next Steps

### Ready to Implement?

**Option 1**: Start with Upstash (Recommended)
- Create Upstash account
- Get Redis URL
- Implement caching layer
- Add indexes
- Deploy

**Option 2**: Start with Railway Redis
- Add Redis to Railway project
- Get connection URL
- Implement caching layer
- Add indexes
- Deploy

**Which would you prefer?**

---

## Questions to Answer

1. What's your current daily request volume?
2. What's your budget for infrastructure?
3. Do you need <5ms cache latency or is 10-20ms OK?
4. Are you planning to scale to 100K+ users soon?

Let me know and I'll create the implementation code! 🚀
