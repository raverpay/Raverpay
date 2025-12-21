# BullMQ Enable/Disable Guide

## Overview

BullMQ is conditionally loaded based on the `USE_BULLMQ_QUEUE` environment variable. This allows you to easily enable or disable the queue system without code changes.

## How It Works

The `QueueModule` is conditionally imported in `app.module.ts`:

```typescript
...(process.env.USE_BULLMQ_QUEUE === 'true' ? [QueueModule] : []),
```

- When `USE_BULLMQ_QUEUE=true`: QueueModule is loaded and BullMQ is active
- When `USE_BULLMQ_QUEUE=false` or unset: QueueModule is not loaded, app uses database-backed queue

## Enabling BullMQ

1. **Set the environment variable:**

   ```env
   USE_BULLMQ_QUEUE=true
   ```

2. **Ensure Redis is configured:**

   ```env
   REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:xxxxx
   # OR
   UPSTASH_REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:xxxxx
   ```

3. **Restart the application**

4. **Verify it's working:**
   - Check logs for "QueueModule" initialization
   - Check that notifications are processed via BullMQ
   - Monitor Redis for queue jobs

## Disabling BullMQ

1. **Set the environment variable:**

   ```env
   USE_BULLMQ_QUEUE=false
   ```

   Or simply remove/unset the variable.

2. **Restart the application**

3. **Fallback behavior:**
   - The app will automatically fall back to the database-backed notification queue
   - All existing functionality continues to work
   - No code changes required

## Migration Strategy

### Gradual Migration (Recommended)

1. **Phase 1: Deploy with BullMQ disabled**
   - Set `USE_BULLMQ_QUEUE=false`
   - Verify app works with database queue

2. **Phase 2: Enable BullMQ in staging**
   - Set `USE_BULLMQ_QUEUE=true` in staging
   - Test thoroughly
   - Monitor queue processing

3. **Phase 3: Enable in production**
   - Set `USE_BULLMQ_QUEUE=true` in production
   - Monitor closely for 24-48 hours
   - Keep database queue processor running as backup

4. **Phase 4: Remove database queue (after 7 days)**
   - Once confident BullMQ is stable
   - Remove old database queue processor code
   - Keep `NotificationQueue` table for audit trail

### Quick Toggle

If you need to quickly disable BullMQ due to issues:

1. Set `USE_BULLMQ_QUEUE=false`
2. Restart the application
3. App immediately falls back to database queue
4. No data loss or downtime

## Monitoring

When BullMQ is enabled, monitor:

- **Redis connection status**
- **Queue job processing rates**
- **Failed job counts**
- **Queue backlog size**

Use Redis monitoring tools or BullMQ dashboard to track queue health.

## Troubleshooting

### BullMQ not starting

- Check `USE_BULLMQ_QUEUE=true` is set
- Verify Redis connection string is correct
- Check Redis is accessible from your environment
- Review application logs for connection errors

### Jobs not processing

- Verify QueueModule is loaded (check startup logs)
- Check Redis connection
- Verify processors are registered
- Check for error logs in queue processors

### Fallback to database queue

- If BullMQ fails, the notification dispatcher automatically falls back
- Check `USE_BULLMQ_QUEUE` setting
- Review notification dispatcher logs

## Environment Variables Summary

```env
# Required for BullMQ
USE_BULLMQ_QUEUE=true                    # Enable/disable BullMQ
REDIS_URL=redis://...                    # Redis connection URL
# OR
UPSTASH_REDIS_URL=redis://...            # Upstash Redis URL
```

## Notes

- The notification dispatcher checks `USE_BULLMQ_QUEUE` and automatically uses the appropriate queue system
- No code changes needed to toggle between systems
- Both systems can coexist during migration period
- Database queue remains as fallback for reliability
