I need to implement the SQLite offline-first feature for RaverPay mobile app and admin dashboard.

## Context

We have two comprehensive implementation plans:

1. **Mobile App Implementation Plan:**
   Location: [apps/raverpay-api/docs/TODO/SQLITE_IMPLEMENTATION_PLAN.md](cci:7://file:///Users/joseph/Desktop/raverpay/apps/raverpay-api/docs/TODO/SQLITE_IMPLEMENTATION_PLAN.md:0:0-0:0)
   - Complete SQLite schema design
   - Offline-first transaction handling
   - Double-spending prevention
   - Multi-device sync handling
   - Data cleanup & storage management
   - Schema migrations
   - Partial sync recovery
   - Security & abuse prevention
   - Sentry monitoring integration

2. **Admin Dashboard & Backend Plan:**
   Location: [apps/raverpay-api/docs/TODO/ADMIN_BACKEND_SQLITE_SUPPORT.md](cci:7://file:///Users/joseph/Desktop/raverpay/apps/raverpay-api/docs/TODO/ADMIN_BACKEND_SQLITE_SUPPORT.md:0:0-0:0)
   - Database schema changes (extend Device table + 4 new tables)
   - Backend controllers (4 new controllers)
   - Admin dashboard (1 new page with 5 tabs)
   - Leverages existing infrastructure

## Your Task

Please help me implement this feature following these guidelines:

### 1. **Study Existing Patterns First**

Before writing any code, please:

- Review existing mobile app patterns in `apps/raverpay-mobile/src/`:
  - How we structure hooks (check `hooks/` directory)
  - How we use React Query (check `lib/api/` directory)
  - How we handle API calls (check `lib/api/client.ts`)
  - How we structure screens (check `app/` directory)
  - Our component patterns (check existing screens)

- Review existing backend patterns in `apps/raverpay-api/src/`:
  - How we structure controllers (check `admin/` directory)
  - How we structure services (check existing services)
  - How we write Prisma migrations (check `prisma/migrations/`)
  - Our DTO patterns (check `admin/dto/` directory)
  - Our error handling patterns

- Review existing admin dashboard patterns in `apps/raverpay-admin/`:
  - How we structure pages (check `app/dashboard/` directory)
  - Our component patterns (check `components/` directory)
  - How we use shadcn/ui components
  - Our API integration patterns (check `lib/api/` directory)
  - Our table/list patterns (check existing dashboard pages)

### 2. **Implementation Approach**

Follow this order:

**Phase 1: Backend Foundation (Week 1)**

- Extend Device table with SQLite tracking fields
- Create 4 new tables (SyncEvent, PendingMutationLog, DeviceConflict, DatabaseCleanup)
- Write and test Prisma migrations
- Update Prisma schema

**Phase 2: Backend Services & Controllers (Week 2)**

- Create AdminDevicesService
- Create AdminPendingMutationsService
- Create AdminDatabaseHealthService
- Create AdminConflictsService
- Create corresponding controllers
- Follow existing controller/service patterns

**Phase 3: Mobile App - Database Setup (Week 3)**

- Set up expo-sqlite
- Create database initialization
- Create schema (10 core tables + 2 metadata tables)
- Create database helper functions
- Follow existing mobile app patterns

**Phase 4: Mobile App - Offline Features (Week 4)**

- Implement offline-first hooks
- Implement mutation queue
- Implement sync service
- Implement optimistic updates
- Follow existing React Query patterns

**Phase 5: Admin Dashboard (Week 5)**

- Create single "Offline Sync Management" page with 5 tabs
- Add sync status card to user detail page
- Follow existing dashboard patterns
- Use existing shadcn/ui components

### 3. **Key Requirements**

- **Reuse existing components** - Don't recreate what exists
- **Follow existing patterns** - Match the codebase style
- **Use existing utilities** - Check for existing helper functions
- **Follow TypeScript best practices** - Use proper typing
- **Add proper error handling** - Follow existing error patterns
- **Add Sentry tracking** - Follow existing Sentry integration
- **Write tests** - Follow existing test patterns

### 4. **Important Notes**

- The backend already has Device, SavedRecipient, and AuditLog models - we're extending, not replacing
- The admin dashboard already has comprehensive user management - we're adding to it
- The mobile app already uses React Query and axios - we're integrating with them
- We already have Sentry integrated - we're adding new tracking

### 5. **What I Need From You**

When implementing, please:

1. **Ask questions** if existing patterns are unclear
2. **Show me the code** you plan to write before implementing
3. **Explain your decisions** when deviating from the plan
4. **Point out potential issues** you see in the implementation plans
5. **Suggest improvements** based on the existing codebase

### 6. **Start Here**

Please start by:

1. Reading both implementation plan documents thoroughly
2. Exploring the existing codebase patterns mentioned above
3. Asking me which phase you should start with (I'll tell you)
4. Showing me your understanding of the existing patterns
5. Proposing the first set of changes

Let's build this feature properly! 🚀

# Admin Dashboard & Backend Changes for SQLite Offline-First

## Overview

This document outlines the admin dashboard features and backend changes needed to support the SQLite offline-first implementation in the RaverPay mobile app.

**Status:** Leverages existing infrastructure (Device, SavedRecipient, AuditLog models) and adds minimal new tables/endpoints.

---

## Table of Contents

1. [Existing Infrastructure](#existing-infrastructure)
2. [New Database Tables](#new-database-tables)
3. [New Backend Endpoints](#new-backend-endpoints)
4. [Admin Dashboard Features](#admin-dashboard-features)
5. [Implementation Plan](#implementation-plan)

---

## Existing Infrastructure

### **Already Available (No Changes Needed)**

#### **1. Device Tracking** ✅

**Existing Model:** `Device` (apps/raverpay-api/prisma/schema.prisma:131)

```prisma
model Device {
  id             String    @id @default(uuid())
  userId         String
  deviceId       String    @unique
  deviceName     String
  deviceType     String
  deviceModel    String?
  osVersion      String?
  appVersion     String?
  ipAddress      String
  lastIpAddress  String?
  location       String?
  userAgent      String?
  isActive       Boolean   @default(true)
  isVerified     Boolean   @default(false)
  isTrusted      Boolean   @default(false)
  firstLoginAt   DateTime  @default(now())
  lastLoginAt    DateTime  @default(now())
  lastActivityAt DateTime  @default(now())
  verifiedAt     DateTime?
  deactivatedAt  DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

**What We Need to Add:**

- `databaseSize` - BIGINT (track SQLite database size)
- `databaseVersion` - INTEGER (track schema version)
- `lastSyncAt` - TIMESTAMP (last successful sync)
- `pendingMutationsCount` - INTEGER (number of pending operations)

---

#### **2. Saved Recipients** ✅

**Existing Model:** `SavedRecipient` (apps/raverpay-api/prisma/schema.prisma:578)

```prisma
model SavedRecipient {
  id            String         @id @default(uuid())
  userId        String
  serviceType   VTUServiceType
  provider      String
  recipient     String
  recipientName String?
  lastUsedAt    DateTime       @default(now())
  usageCount    Int            @default(1)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}
```

**Status:** ✅ Already perfect for offline sync - no changes needed!

---

#### **3. Audit Logging** ✅

**Existing Model:** `AuditLog` (apps/raverpay-api/prisma/schema.prisma:539)

```prisma
model AuditLog {
  id            String         @id @default(uuid())
  userId        String?
  action        String
  resource      String
  resourceId    String?
  ipAddress     String?
  userAgent     String?
  metadata      Json?
  createdAt     DateTime       @default(now())
  actorType     ActorType?     @default(USER)
  severity      AuditSeverity? @default(LOW)
  status        AuditStatus?   @default(SUCCESS)
  errorMessage  String?
  executionTime Int?
  deviceId      String?
  location      String?
  oldValue      Json?
  newValue      Json?
}
```

**Status:** ✅ Already perfect - includes deviceId for tracking!

---

#### **4. Admin User Management** ✅

**Existing Controller:** `AdminUsersController` (apps/raverpay-api/src/admin/users/admin-users.controller.ts)

**Existing Endpoints:**

- `GET /admin/users` - List users
- `GET /admin/users/:userId` - Get user details
- `PATCH /admin/users/:userId/status` - Update status
- `PATCH /admin/users/:userId/role` - Update role
- `PATCH /admin/users/:userId/kyc-tier` - Update KYC
- `PATCH /admin/users/:userId/lock-account` - Lock account
- `PATCH /admin/users/:userId/unlock-account` - Unlock account
- `GET /admin/users/:userId/audit-logs` - Get audit logs

**Status:** ✅ Already comprehensive!

---

## New Database Tables

### **1. Extend Device Table** (Migration Required)

**Add these columns to existing `Device` table:**

```sql
-- Migration: Add SQLite tracking to devices table
ALTER TABLE devices ADD COLUMN database_size BIGINT DEFAULT 0;
ALTER TABLE devices ADD COLUMN database_version INTEGER DEFAULT 1;
ALTER TABLE devices ADD COLUMN last_sync_at TIMESTAMP;
ALTER TABLE devices ADD COLUMN pending_mutations_count INTEGER DEFAULT 0;
ALTER TABLE devices ADD COLUMN sync_status TEXT DEFAULT 'success'; -- 'success', 'failed', 'in_progress'
ALTER TABLE devices ADD COLUMN last_sync_error TEXT;

-- Add indexes
CREATE INDEX idx_devices_last_sync_at ON devices(last_sync_at);
CREATE INDEX idx_devices_sync_status ON devices(sync_status);
CREATE INDEX idx_devices_database_size ON devices(database_size);
```

**Updated Prisma Model:**

```prisma
model Device {
  // ... existing fields ...

  // SQLite tracking (NEW)
  databaseSize           BigInt?   @default(0) @map("database_size")
  databaseVersion        Int?      @default(1) @map("database_version")
  lastSyncAt             DateTime? @map("last_sync_at")
  pendingMutationsCount  Int?      @default(0) @map("pending_mutations_count")
  syncStatus             String?   @default("success") @map("sync_status")
  lastSyncError          String?   @map("last_sync_error")

  @@index([lastSyncAt], map: "idx_devices_last_sync_at")
  @@index([syncStatus], map: "idx_devices_sync_status")
  @@index([databaseSize], map: "idx_devices_database_size")
}
```

---

### **2. New Table: SyncEvent** (Track Sync History)

```prisma
model SyncEvent {
  id                String    @id @default(uuid())
  userId            String
  deviceId          String
  syncType          String    // 'PULL', 'PUSH', 'FULL'
  status            String    // 'success', 'failed', 'in_progress'
  recordsProcessed  Int?
  duration          Int?      // milliseconds
  errorMessage      String?   @db.Text
  metadata          Json?     // Additional sync details
  createdAt         DateTime  @default(now())

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([deviceId])
  @@index([syncType])
  @@index([status])
  @@index([createdAt])
  @@map("sync_events")
}
```

**Add to User model:**

```prisma
model User {
  // ... existing relations ...
  syncEvents         SyncEvent[]
}
```

---

### **3. New Table: PendingMutationLog** (Track Offline Operations)

```prisma
model PendingMutationLog {
  id            String    @id @default(uuid())
  userId        String
  deviceId      String
  endpoint      String
  method        String
  payload       Json
  status        String    @default("pending") // 'pending', 'processing', 'success', 'failed'
  retryCount    Int       @default(0)
  lastError     String?   @db.Text
  createdAt     DateTime  @default(now())
  processedAt   DateTime?

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([deviceId])
  @@index([status])
  @@index([createdAt])
  @@map("pending_mutation_logs")
}
```

**Add to User model:**

```prisma
model User {
  // ... existing relations ...
  pendingMutationLogs  PendingMutationLog[]
}
```

---

### **4. New Table: DeviceConflict** (Track Multi-Device Issues)

```prisma
model DeviceConflict {
  id            String    @id @default(uuid())
  userId        String
  conflictType  String    // 'insufficient_balance', 'stale_data', 'duplicate_transaction'
  deviceA       String    // Device ID
  deviceB       String?   // Device ID (optional, for multi-device conflicts)
  details       Json      // Conflict details
  resolved      Boolean   @default(false)
  resolvedAt    DateTime?
  resolvedBy    String?   // Admin user ID
  createdAt     DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([conflictType])
  @@index([resolved])
  @@index([createdAt])
  @@map("device_conflicts")
}
```

**Add to User model:**

```prisma
model User {
  // ... existing relations ...
  deviceConflicts    DeviceConflict[]
}
```

---

### **5. New Table: DatabaseCleanup** (Track Cleanup Operations)

```prisma
model DatabaseCleanup {
  id              String    @id @default(uuid())
  userId          String
  deviceId        String?
  cleanupType     String    // 'auto', 'manual', 'forced'
  recordsDeleted  Int
  spaceFreed      BigInt    // bytes
  duration        Int?      // milliseconds
  triggeredBy     String?   // Admin user ID (if manual)
  createdAt       DateTime  @default(now())

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([cleanupType])
  @@index([createdAt])
  @@map("database_cleanups")
}
```

**Add to User model:**

```prisma
model User {
  // ... existing relations ...
  databaseCleanups   DatabaseCleanup[]
}
```

---

## New Backend Endpoints

### **1. Device Sync Management**

**Controller:** `apps/raverpay-api/src/admin/devices/admin-devices.controller.ts` (NEW)

```typescript
@Controller('admin/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminDevicesController {
  // Get user's devices with sync status
  @Get('user/:userId')
  async getUserDevices(@Param('userId') userId: string) {
    // Returns list of devices with sync status
  }

  // Get device sync history
  @Get(':deviceId/sync-history')
  async getDeviceSyncHistory(
    @Param('deviceId') deviceId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Returns SyncEvent records for device
  }

  // Force sync for device
  @Post(':deviceId/force-sync')
  async forceSyncDevice(@Param('deviceId') deviceId: string) {
    // Send push notification to device to trigger sync
  }

  // Reset device database
  @Post(':deviceId/reset-database')
  async resetDeviceDatabase(@Param('deviceId') deviceId: string) {
    // Send command to device to clear SQLite
  }
}
```

---

### **2. Pending Mutations Management**

**Controller:** `apps/raverpay-api/src/admin/pending-mutations/admin-pending-mutations.controller.ts` (NEW)

```typescript
@Controller('admin/pending-mutations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminPendingMutationsController {
  // Get all pending mutations (filterable)
  @Get()
  async getPendingMutations(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Returns PendingMutationLog records
  }

  // Get pending mutations for specific user
  @Get('user/:userId')
  async getUserPendingMutations(@Param('userId') userId: string) {
    // Returns user's pending mutations
  }

  // Retry failed mutation
  @Post(':mutationId/retry')
  async retryMutation(@Param('mutationId') mutationId: string) {
    // Manually retry failed mutation
  }

  // Cancel mutation
  @Delete(':mutationId')
  async cancelMutation(@Param('mutationId') mutationId: string) {
    // Cancel pending mutation
  }

  // Bulk retry
  @Post('bulk-retry')
  async bulkRetry(@Body() body: { mutationIds: string[] }) {
    // Retry multiple mutations
  }
}
```

---

### **3. Database Health Monitoring**

**Controller:** `apps/raverpay-api/src/admin/database-health/admin-database-health.controller.ts` (NEW)

```typescript
@Controller('admin/database-health')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminDatabaseHealthController {
  // Get database health overview
  @Get('overview')
  async getHealthOverview() {
    // Returns aggregated stats
  }

  // Get users with large databases
  @Get('large-databases')
  async getLargeDatabases(
    @Query('minSize') minSize?: number, // in MB
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Returns users with DB > minSize
  }

  // Force cleanup for user
  @Post('user/:userId/force-cleanup')
  async forceCleanup(
    @GetUser('id') adminId: string,
    @Param('userId') userId: string,
  ) {
    // Trigger cleanup for specific user
  }

  // Bulk cleanup
  @Post('bulk-cleanup')
  async bulkCleanup(
    @GetUser('id') adminId: string,
    @Body() body: { minSize: number }, // cleanup users > minSize MB
  ) {
    // Trigger cleanup for multiple users
  }

  // Get cleanup history
  @Get('cleanup-history')
  async getCleanupHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Returns DatabaseCleanup records
  }
}
```

---

### **4. Device Conflicts Management**

**Controller:** `apps/raverpay-api/src/admin/conflicts/admin-conflicts.controller.ts` (NEW)

```typescript
@Controller('admin/conflicts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminConflictsController {
  // Get all device conflicts
  @Get()
  async getConflicts(
    @Query('resolved') resolved?: boolean,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Returns DeviceConflict records
  }

  // Get conflicts for specific user
  @Get('user/:userId')
  async getUserConflicts(@Param('userId') userId: string) {
    // Returns user's conflicts
  }

  // Mark conflict as resolved
  @Patch(':conflictId/resolve')
  async resolveConflict(
    @GetUser('id') adminId: string,
    @Param('conflictId') conflictId: string,
  ) {
    // Mark conflict as resolved
  }
}
```

---

### **5. Extend Existing Admin Users Endpoint**

**Add to:** `apps/raverpay-api/src/admin/users/admin-users.controller.ts`

```typescript
// Add new endpoint to existing controller

@ApiOperation({ summary: 'Get user sync overview' })
@Get(':userId/sync-overview')
async getUserSyncOverview(@Param('userId') userId: string) {
  return this.adminUsersService.getUserSyncOverview(userId);
}
```

**Response:**

```typescript
{
  userId: "user-123",
  devices: [
    {
      deviceId: "device-abc",
      deviceName: "iPhone 14",
      deviceType: "iOS",
      lastSyncAt: "2026-01-07T10:00:00Z",
      syncStatus: "success",
      databaseSize: 15200000, // 15.2 MB
      databaseVersion: 4,
      pendingMutationsCount: 2
    }
  ],
  totalDatabaseSize: 15200000,
  pendingMutations: 2,
  failedSyncs24h: 3,
  lastConflict: {
    type: "insufficient_balance",
    createdAt: "2026-01-07T09:30:00Z",
    resolved: true
  }
}
```

---

## Admin Dashboard Features

### **Consolidated Approach: Single Page with Tabs** ✅

Instead of creating 4-5 new pages, we'll create **ONE new page** called "Offline Sync Management" with tabs.

**Location:** `apps/raverpay-admin/app/dashboard/offline-sync/page.tsx` (NEW - Single Page!)

---

### **Page Structure: Tabbed Interface**

```tsx
┌─────────────────────────────────────────────────────┐
│  Offline Sync Management                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Overview] [Pending Queue] [Database Health]      │
│  [Conflicts] [Sync History]                        │
│                                                     │
│  {Active Tab Content Here}                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### **Tab 1: Overview** (Default Tab)

```
┌─────────────────────────────────────────────────────┐
│  📊 Overview (Last 24 hours)                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Sync Stats:                                       │
│  ├─ Total syncs: 15,234                            │
│  ├─ Successful: 14,892 (97.8%) ✅                  │
│  ├─ Failed: 342 (2.2%) ⚠️                          │
│  └─ Average duration: 3.2s                         │
│                                                     │
│  Active Issues:                                    │
│  ├─ Users with failed syncs: 45                    │
│  ├─ Pending mutations: 156                         │
│  ├─ Device conflicts: 12                           │
│  └─ Large databases (>40MB): 8                     │
│                                                     │
│  Quick Actions:                                    │
│  [View Failed Syncs] [View Pending Queue]          │
│  [Database Health] [Conflicts]                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**API:** `GET /admin/offline-sync/overview`

---

### **Tab 2: Pending Queue**

```
┌─────────────────────────────────────────────────────┐
│  ⏳ Pending Mutations Queue                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Filters: [All ▼] [Failed Only ▼] [Search...]      │
│                                                     │
│  Total: 156 | Failed: 23 | Retrying: 45 | New: 88  │
│                                                     │
│  User          | Operation     | Status  | Age     │
│  ──────────────────────────────────────────────────│
│  John Doe      | Transfer ₦500 | Failed  | 2h      │
│  Jane Smith    | Buy Airtime   | Retry 2 | 30m     │
│  Bob Johnson   | Transfer ₦200 | New     | 5m      │
│  ...                                               │
│                                                     │
│  [Retry All Failed] [Clear Old (>7d)] [Export]     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**API:** `GET /admin/pending-mutations?status=...&page=...`

---

### **Tab 3: Database Health**

```
┌─────────────────────────────────────────────────────┐
│  💾 Database Health                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Overview:                                         │
│  ├─ Total users: 10,000                            │
│  ├─ Average DB size: 8.5 MB                        │
│  ├─ Users > 40MB: 12 ⚠️                            │
│  └─ Users > 50MB: 3 🚨                             │
│                                                     │
│  Cleanup Stats (30 days):                          │
│  ├─ Auto cleanups: 1,234                           │
│  ├─ Manual cleanups: 45                            │
│  ├─ Space freed: 2.3 GB                            │
│  └─ Failed: 5                                      │
│                                                     │
│  Largest Databases:                                │
│  1. John Doe - 52.3 MB 🚨 [Cleanup] [Details]      │
│  2. Jane Smith - 48.1 MB ⚠️ [Cleanup] [Details]    │
│  3. Bob Johnson - 45.7 MB ⚠️ [Cleanup] [Details]   │
│                                                     │
│  [Bulk Cleanup (>40MB)] [Export Report]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**API:** `GET /admin/database-health/overview`

---

### **Tab 4: Conflicts**

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Multi-Device Conflicts                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Recent (7 days): 45 | Unresolved: 12 | Resolved: 33│
│                                                     │
│  Filters: [Unresolved ▼] [Type ▼] [Search...]      │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ User: John Doe                                │ │
│  │ Type: Insufficient Balance                    │ │
│  │ Time: 30 minutes ago                          │ │
│  │                                               │ │
│  │ Device A (iPhone):                            │ │
│  │ • Queued ₦800 transfer (offline)              │ │
│  │                                               │ │
│  │ Device B (Android):                           │ │
│  │ • Completed ₦1,000 transfer (online)          │ │
│  │                                               │ │
│  │ Result: Backend balance ₦0                    │ │
│  │ Status: ✅ Auto-resolved                      │ │
│  │                                               │ │
│  │ [View Details] [Contact User] [Mark Resolved] │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**API:** `GET /admin/conflicts?resolved=false&page=...`

---

### **Tab 5: Sync History**

```
┌─────────────────────────────────────────────────────┐
│  📜 Sync History                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Filters: [All Users ▼] [Failed Only ▼] [24h ▼]    │
│                                                     │
│  User       | Device    | Type | Status | Duration │
│  ──────────────────────────────────────────────────│
│  John Doe   | iPhone 14 | PULL | ✅     | 2.3s     │
│  Jane Smith | Galaxy S  | PUSH | ❌     | 5.1s     │
│  Bob J.     | Pixel 7   | FULL | ✅     | 8.7s     │
│  ...                                               │
│                                                     │
│  [Export] [Refresh]                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**API:** `GET /admin/sync-events?page=...&status=...`

---

### **PLUS: Add to Existing User Detail Page**

**Location:** `apps/raverpay-admin/app/dashboard/users/[userId]/page.tsx`

**Add new card (compact version):**

```
┌─────────────────────────────────────────────────────┐
│  Device & Sync Status                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Devices: 2 active                                 │
│                                                     │
│  📱 iPhone 14                                       │
│  Last sync: 2 min ago ✅ | DB: 15.2 MB | Pending: 2│
│                                                     │
│  📱 Samsung Galaxy                                  │
│  Last sync: 5h ago ⚠️ | DB: 8.3 MB | Pending: 0    │
│                                                     │
│  [Force Sync All] [View in Offline Sync Manager]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Summary: Admin Dashboard Changes

### **What We're Creating:**

**1 New Page (with 5 tabs):**

- `apps/raverpay-admin/app/dashboard/offline-sync/page.tsx`
  - Tab 1: Overview
  - Tab 2: Pending Queue
  - Tab 3: Database Health
  - Tab 4: Conflicts
  - Tab 5: Sync History

**1 New Card (on existing page):**

- Add "Device & Sync Status" card to user detail page

---

### **Benefits of Single Page Approach:**

✅ **Simpler Navigation** - One place for all offline sync management  
✅ **Faster Development** - One page instead of 5  
✅ **Better UX** - Tabs allow quick switching between views  
✅ **Consistent Layout** - Shared header, filters, actions  
✅ **Easier Maintenance** - One file to update

---

### **Implementation:**

```tsx
// apps/raverpay-admin/app/dashboard/offline-sync/page.tsx

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OfflineSyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Offline Sync Management</h2>
        <p className="text-muted-foreground">
          Monitor and manage offline sync, pending operations, and database
          health
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending">Pending Queue</TabsTrigger>
          <TabsTrigger value="health">Database Health</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{/* Overview content */}</TabsContent>

        <TabsContent value="pending">{/* Pending queue content */}</TabsContent>

        <TabsContent value="health">
          {/* Database health content */}
        </TabsContent>

        <TabsContent value="conflicts">{/* Conflicts content */}</TabsContent>

        <TabsContent value="history">{/* Sync history content */}</TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Implementation Plan

### **Phase 1: Database Schema (Week 1)**

1. ✅ Extend `Device` table with sync tracking fields
2. ✅ Create `SyncEvent` table
3. ✅ Create `PendingMutationLog` table
4. ✅ Create `DeviceConflict` table
5. ✅ Create `DatabaseCleanup` table
6. ✅ Run migrations
7. ✅ Update Prisma schema

---

### **Phase 2: Backend Services (Week 2)**

1. ✅ Create `AdminDevicesService`
2. ✅ Create `AdminPendingMutationsService`
3. ✅ Create `AdminDatabaseHealthService`
4. ✅ Create `AdminConflictsService`
5. ✅ Extend `AdminUsersService` with sync overview

---

### **Phase 3: Backend Controllers (Week 3)**

1. ✅ Create `AdminDevicesController`
2. ✅ Create `AdminPendingMutationsController`
3. ✅ Create `AdminDatabaseHealthController`
4. ✅ Create `AdminConflictsController`
5. ✅ Add sync endpoint to `AdminUsersController`

---

### **Phase 4: Admin Dashboard UI (Week 4)**

1. ✅ Create single "Offline Sync Management" page with tabs
2. ✅ Implement Overview tab
3. ✅ Implement Pending Queue tab
4. ✅ Implement Database Health tab
5. ✅ Implement Conflicts tab
6. ✅ Implement Sync History tab
7. ✅ Add sync status card to user detail page

---

### **Phase 5: Testing & Deployment (Week 5)**

1. ✅ Test all admin endpoints
2. ✅ Test admin dashboard UI
3. ✅ Test with real mobile app
4. ✅ Monitor Sentry for errors
5. ✅ Deploy to production

---

## Summary

### **What Already Exists:**

✅ **Device tracking** - Device model with comprehensive fields  
✅ **Saved recipients** - SavedRecipient model  
✅ **Audit logging** - AuditLog model with deviceId  
✅ **Admin user management** - Complete CRUD endpoints  
✅ **Admin dashboard** - User detail page with actions

### **What We Need to Add:**

**Database (5 changes):**

1. Extend Device table (6 new columns)
2. Create SyncEvent table
3. Create PendingMutationLog table
4. Create DeviceConflict table
5. Create DatabaseCleanup table

**Backend (4 new controllers):**

1. AdminDevicesController
2. AdminPendingMutationsController
3. AdminDatabaseHealthController
4. AdminConflictsController

**Admin Dashboard (2 new features):**

1. Single "Offline Sync Management" page with 5 tabs (new page)
2. Sync status card (add to existing user page)

### **Estimated Effort:**

- **Database changes:** 1 week
- **Backend services:** 1 week
- **Backend controllers:** 1 week
- **Admin dashboard UI:** 1 week
- **Testing & deployment:** 1 week

**Total:** 5 weeks

---

**Document Version:** 1.0  
**Last Updated:** January 7, 2026  
**Status:** Ready for Implementation
