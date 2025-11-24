-- Optimized indexes for notification_queue table
-- The main slow query pattern is:
-- SELECT * FROM "notification_queue"
-- WHERE channel = $1 AND status = 'QUEUED'
--   AND (("scheduledFor" IS NULL) OR ("scheduledFor" <= $2))
--   AND (("nextRetryAt" IS NULL) OR ("nextRetryAt" <= $3))
-- ORDER BY priority DESC, "createdAt" ASC

-- Drop the old composite index if it exists (was truncated)
DROP INDEX IF EXISTS notification_queue_channel_status_scheduledfor_nextretryat_prio;

-- Create a PARTIAL INDEX for queued items only
-- This is the most efficient approach because:
-- 1. It only indexes rows where status = 'QUEUED' (smaller index)
-- 2. Supports the ORDER BY clause directly
CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_queue_queued_channel_priority_idx
ON notification_queue(channel, priority DESC, "createdAt" ASC)
WHERE status = 'QUEUED';
