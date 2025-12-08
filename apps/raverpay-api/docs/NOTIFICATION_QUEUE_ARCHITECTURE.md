# Notification Queue Architecture

## Current Implementation (Synchronous)

The current broadcast notification system works synchronously:

1. Admin triggers broadcast → API processes all notifications inline
2. Rate limiting adds 600ms delay per email user
3. Response returned only after ALL notifications sent
4. Frontend waits for entire operation to complete

**Problems:**

- Request timeout with many users (100 users = 60+ seconds)
- No progress tracking
- No retry mechanism for failed deliveries
- Poor user experience (admin sees spinning loader)

## Industry Standard: Queue-Based Architecture

### Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Admin       │────▶│ API          │────▶│ notification_   │────▶│ Background   │
│ Dashboard   │     │ (immediate)  │     │ queue table     │     │ Worker       │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
      │                    │                                           │
      │                    ▼                                           ▼
      │              Returns broadcastId                         Processes queue
      │              immediately                                 with rate limits
      │                                                               │
      └────────────────────────────────────────────────────────────────┘
                     Polls for status updates
```

### Database Tables (Already Exist!)

#### `notification_queue`

```sql
id           TEXT PRIMARY KEY
userId       TEXT NOT NULL      -- Target user
channel      TEXT NOT NULL      -- EMAIL, SMS, PUSH, IN_APP
eventType    TEXT NOT NULL      -- admin_broadcast, transaction, etc.
templateId   TEXT               -- Optional template reference
variables    JSONB              -- Template variables (title, message, etc.)
status       TEXT DEFAULT 'QUEUED'  -- QUEUED, PROCESSING, SENT, FAILED
priority     INTEGER DEFAULT 0  -- Higher = processed first
retryCount   INTEGER DEFAULT 0  -- Current retry attempt
maxRetries   INTEGER DEFAULT 3  -- Max retry attempts
nextRetryAt  TIMESTAMP          -- When to retry failed item
lastError    TEXT               -- Last error message
scheduledFor TIMESTAMP          -- For scheduled notifications
sentAt       TIMESTAMP          -- When successfully sent
createdAt    TIMESTAMP
updatedAt    TIMESTAMP
```

### Proposed Implementation

#### 1. Broadcast Endpoint (Returns Immediately)

```typescript
// admin-notifications.service.ts
async createBroadcast(adminUserId: string, dto: CreateBroadcastDto) {
  const broadcastId = `BROADCAST_${Date.now()}`;

  // Get eligible users (same logic as now)
  const eligibleUsers = await this.getEligibleUsers(dto);

  if (eligibleUsers.length === 0) {
    throw new BadRequestException({ /* ... */ });
  }

  // Queue notifications instead of sending immediately
  const queueItems = eligibleUsers.flatMap(userId =>
    dto.channels.map(channel => ({
      id: uuidv4(),
      userId,
      channel,
      eventType: 'admin_broadcast',
      variables: {
        broadcastId,
        title: dto.title,
        message: dto.message,
        type: dto.type,
      },
      status: 'QUEUED',
      priority: channel === 'EMAIL' ? 0 : 1, // Push/In-App first
    }))
  );

  await this.prisma.notificationQueue.createMany({ data: queueItems });

  // Create broadcast record for tracking
  await this.prisma.auditLog.create({
    data: {
      action: 'BROADCAST_QUEUED',
      resourceId: broadcastId,
      metadata: { totalQueued: queueItems.length, eligibleUsers: eligibleUsers.length },
    },
  });

  // Return immediately - no waiting for actual delivery
  return {
    success: true,
    broadcastId,
    status: 'QUEUED',
    totalQueued: queueItems.length,
    message: `${eligibleUsers.length} notifications queued for delivery`,
  };
}
```

#### 2. Background Worker (Cron Job)

```typescript
// notification-queue.processor.ts
@Injectable()
export class NotificationQueueProcessor {
  private readonly logger = new Logger(NotificationQueueProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushNotificationService,
    private smsService: SmsService,
  ) {}

  // Run every 10 seconds
  @Cron('*/10 * * * * *')
  async processQueue() {
    // Get next batch of items to process
    const items = await this.prisma.notificationQueue.findMany({
      where: {
        status: 'QUEUED',
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 10, // Process 10 at a time
    });

    for (const item of items) {
      await this.processItem(item);

      // Rate limit for emails (600ms)
      if (item.channel === 'EMAIL') {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  private async processItem(item: NotificationQueueItem) {
    try {
      // Mark as processing
      await this.prisma.notificationQueue.update({
        where: { id: item.id },
        data: { status: 'PROCESSING' },
      });

      // Send based on channel
      let success = false;
      switch (item.channel) {
        case 'EMAIL':
          success = await this.sendEmail(item);
          break;
        case 'PUSH':
          success = await this.sendPush(item);
          break;
        case 'SMS':
          success = await this.sendSms(item);
          break;
        case 'IN_APP':
          success = await this.createInAppNotification(item);
          break;
      }

      if (success) {
        await this.prisma.notificationQueue.update({
          where: { id: item.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } else {
        throw new Error('Delivery failed');
      }
    } catch (error) {
      await this.handleFailure(item, error);
    }
  }

  private async handleFailure(item: NotificationQueueItem, error: Error) {
    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= item.maxRetries) {
      // Max retries reached - mark as failed
      await this.prisma.notificationQueue.update({
        where: { id: item.id },
        data: {
          status: 'FAILED',
          lastError: error.message,
          retryCount: newRetryCount,
        },
      });
    } else {
      // Schedule retry with exponential backoff
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + Math.pow(2, newRetryCount));

      await this.prisma.notificationQueue.update({
        where: { id: item.id },
        data: {
          status: 'QUEUED',
          lastError: error.message,
          retryCount: newRetryCount,
          nextRetryAt: nextRetry,
        },
      });
    }
  }
}
```

#### 3. Broadcast Status Endpoint

```typescript
// admin-notifications.controller.ts
@Get('broadcast/:broadcastId/status')
async getBroadcastStatus(@Param('broadcastId') broadcastId: string) {
  const stats = await this.prisma.notificationQueue.groupBy({
    by: ['status'],
    where: {
      variables: { path: ['broadcastId'], equals: broadcastId }
    },
    _count: true,
  });

  const total = stats.reduce((sum, s) => sum + s._count, 0);
  const sent = stats.find(s => s.status === 'SENT')?._count || 0;
  const failed = stats.find(s => s.status === 'FAILED')?._count || 0;
  const queued = stats.find(s => s.status === 'QUEUED')?._count || 0;
  const processing = stats.find(s => s.status === 'PROCESSING')?._count || 0;

  return {
    broadcastId,
    total,
    sent,
    failed,
    queued,
    processing,
    progress: Math.round((sent / total) * 100),
    status: queued + processing === 0 ? 'COMPLETED' : 'IN_PROGRESS',
  };
}
```

#### 4. Frontend Updates

```typescript
// notifications/page.tsx
const broadcastMutation = useMutation({
  mutationFn: (data) => notificationsApi.broadcast(data),
  onSuccess: (response) => {
    // Start polling for status
    setBroadcastId(response.broadcastId);
    setIsPolling(true);
  },
});

// Poll for status
useEffect(() => {
  if (!isPolling || !broadcastId) return;

  const interval = setInterval(async () => {
    const status = await notificationsApi.getBroadcastStatus(broadcastId);
    setBroadcastStatus(status);

    if (status.status === 'COMPLETED') {
      setIsPolling(false);
      setBroadcastResult({
        success: true,
        message: `Sent to ${status.sent} users (${status.failed} failed)`,
      });
    }
  }, 2000); // Poll every 2 seconds

  return () => clearInterval(interval);
}, [isPolling, broadcastId]);
```

### Benefits of Queue Architecture

| Feature           | Current           | Queue-Based       |
| ----------------- | ----------------- | ----------------- |
| Response Time     | Minutes (blocks)  | Instant           |
| Progress Tracking | None              | Real-time         |
| Retry on Failure  | None              | Automatic (3x)    |
| Rate Limiting     | In-request delays | Background        |
| Scalability       | Single request    | Workers can scale |
| User Experience   | Spinning loader   | Progress bar      |

### Migration Path

1. **Phase 1 (Current)**: Synchronous with extended timeout (2 min)
2. **Phase 2**: Add queue service + cron processor
3. **Phase 3**: Update frontend for status polling
4. **Phase 4**: Remove synchronous broadcast, use queue only

### NestJS Schedule Module Setup

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... other imports
  ],
})
export class AppModule {}

// Install dependency
// pnpm add @nestjs/schedule
```

### Priority System

| Priority | Use Case                            |
| -------- | ----------------------------------- |
| 0        | Bulk emails (slowest, rate limited) |
| 1        | Push notifications                  |
| 2        | In-app notifications                |
| 3        | Security alerts (always first)      |

### Cleanup Job

```typescript
// Clean up old sent/failed items (run daily)
@Cron('0 0 * * *')
async cleanupOldItems() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await this.prisma.notificationQueue.deleteMany({
    where: {
      status: { in: ['SENT', 'FAILED'] },
      updatedAt: { lt: thirtyDaysAgo },
    },
  });
}
```

## Summary

The `notification_queue` table already exists in your database. Implementing this architecture would:

1. Make broadcasts instant (no timeout issues)
2. Provide real-time progress tracking
3. Add automatic retry for failures
4. Improve admin UX significantly
5. Scale better with user growth

The immediate fix (2-minute timeout) works for now with 6 users, but consider implementing the queue system when you have more users.

Next Steps (When Ready)

1. Install @nestjs/schedule for cron jobs
2. Create NotificationQueueProcessor service
3. Add broadcast status endpoint
4. Update frontend to poll for status instead of waiting

For now, the 2-minute timeout fix should work fine for your 6 users.
Implement the queue system when you scale up.
