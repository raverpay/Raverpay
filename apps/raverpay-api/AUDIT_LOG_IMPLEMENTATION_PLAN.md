# Audit Log Implementation Plan

## RaverPay API - Comprehensive Audit Logging Enhancement

**Created:** January 5, 2026  
**Priority:** High (Security & Compliance)  
**Estimated Timeline:** 2-3 weeks

---

## 🎯 Executive Summary

This plan addresses critical gaps in the current audit logging system by:

1. Adding audit logs to 50+ missing operations
2. Enhancing the audit log schema for better tracking
3. Implementing a standardized audit logging service
4. Capturing real client metadata (IP, User-Agent, Device Info)
5. Adding security event monitoring

---

## 📊 Current State Analysis

### ✅ What's Working

- Basic audit log infrastructure exists
- Admin operations are well-logged
- User profile changes are tracked
- Wallet lock/unlock operations logged

### ❌ Critical Gaps

- **0%** Authentication events logged
- **0%** P2P transfers logged
- **0%** VTU operations logged
- **0%** Crypto operations logged
- **0%** Circle/USDC operations logged
- **0%** Support ticket operations logged
- **0%** Security events logged
- Hardcoded IP addresses (`'0.0.0.0'`, `'API'`)
- No device fingerprinting
- No actor type differentiation
- No severity levels

---

## 🏗️ Phase 1: Infrastructure Enhancement (Week 1)

### 1.1 Enhance Prisma Schema

**File:** `apps/raverpay-api/prisma/schema.prisma`

**Changes:**

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  userId        String
  action        String
  resource      String
  resourceId    String?
  ipAddress     String?
  userAgent     String?
  metadata      Json?

  // NEW FIELDS
  actorType     String?  @default("USER")  // USER, ADMIN, SYSTEM, WEBHOOK, API
  severity      String?  @default("LOW")   // LOW, MEDIUM, HIGH, CRITICAL
  status        String?  @default("SUCCESS") // SUCCESS, FAILURE, PENDING
  errorMessage  String?  @db.Text
  executionTime Int?     // milliseconds
  deviceId      String?
  location      String?  // City, Country from IP
  oldValue      Json?    // For update operations
  newValue      Json?    // For update operations

  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([createdAt])
  @@index([actorType])
  @@index([severity])
  @@index([status])
  @@map("audit_logs")
}
```

**Migration Command:**

```bash
npx prisma migrate dev --name enhance_audit_logs
```

---

### 1.2 Create Centralized Audit Service

**File:** `apps/raverpay-api/src/common/services/audit.service.ts` (NEW)

**Purpose:** Standardized, reusable audit logging with automatic metadata capture

**Features:**

- Automatic IP/User-Agent extraction
- Device fingerprinting
- Geo-location lookup
- Performance timing
- Error handling
- Severity classification

**Key Methods:**

```typescript
// Core logging methods
logAuth(action, userId, metadata, request);
logTransaction(action, userId, metadata, request);
logSecurity(action, userId, metadata, request);
logAdmin(action, userId, metadata, request);
logSystem(action, metadata);

// Specialized methods
logFailedLogin(userId, reason, request);
logSuspiciousActivity(userId, reason, request);
logDataChange(resource, resourceId, oldValue, newValue, userId, request);
```

---

### 1.3 Create Request Metadata Interceptor

**File:** `apps/raverpay-api/src/common/interceptors/request-metadata.interceptor.ts` (NEW)

**Purpose:** Automatically capture and attach client metadata to all requests

**Captures:**

- Real IP address (behind proxies)
- User-Agent string
- Device fingerprint
- Request timestamp
- Request ID for correlation

---

### 1.4 Create Audit Log Types

**File:** `apps/raverpay-api/src/common/types/audit-log.types.ts` (NEW)

**Define standardized action types:**

```typescript
export enum AuditAction {
  // Authentication
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',

  // Transactions
  P2P_TRANSFER_INITIATED = 'P2P_TRANSFER_INITIATED',
  P2P_TRANSFER_COMPLETED = 'P2P_TRANSFER_COMPLETED',
  WITHDRAWAL_INITIATED = 'WITHDRAWAL_INITIATED',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  DEPOSIT_RECEIVED = 'DEPOSIT_RECEIVED',

  // ... 50+ more actions
}

export enum AuditResource {
  AUTH = 'AUTH',
  USER = 'USER',
  WALLET = 'WALLET',
  TRANSACTION = 'TRANSACTION',
  P2P_TRANSFER = 'P2P_TRANSFER',
  VTU = 'VTU',
  CRYPTO = 'CRYPTO',
  CIRCLE = 'CIRCLE',
  GIFT_CARD = 'GIFT_CARD',
  // ... more resources
}

export enum AuditSeverity {
  LOW = 'LOW', // Normal operations
  MEDIUM = 'MEDIUM', // Important changes
  HIGH = 'HIGH', // Security-sensitive
  CRITICAL = 'CRITICAL', // Requires immediate attention
}

export enum ActorType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
  WEBHOOK = 'WEBHOOK',
  API = 'API',
}
```

---

## 🔐 Phase 2: Authentication & Security (Week 1-2)

### Priority: CRITICAL

### 2.1 Authentication Service

**File:** `apps/raverpay-api/src/auth/auth.service.ts`

**Add Audit Logs:**

- ✅ User registration
- ✅ Successful login
- ✅ Failed login attempts (with reason)
- ✅ Account lockout
- ✅ Password reset requested
- ✅ Password reset completed
- ✅ Email verification
- ✅ Device verification
- ✅ Token refresh
- ✅ Logout

**Example Implementation:**

```typescript
// In register method
await this.auditService.logAuth(
  AuditAction.USER_REGISTERED,
  newUser.id,
  {
    email: newUser.email,
    phoneNumber: newUser.phoneNumber,
    registrationMethod: 'EMAIL',
  },
  request,
);

// In login method
await this.auditService.logAuth(
  AuditAction.USER_LOGIN,
  user.id,
  {
    loginMethod: '2FA',
    deviceFingerprint: request.deviceId,
  },
  request,
);

// In failed login
await this.auditService.logSecurity(
  AuditAction.LOGIN_FAILED,
  email, // or null if user not found
  {
    email,
    reason: 'INVALID_PASSWORD',
    attemptCount: failedAttempts,
  },
  request,
);
```

---

### 2.2 Security Events

**File:** `apps/raverpay-api/src/common/guards/throttler.guard.ts`

**Add Audit Logs:**

- ✅ Rate limit exceeded
- ✅ Suspicious activity detected
- ✅ Multiple failed login attempts
- ✅ Account lockout
- ✅ Unusual device detected
- ✅ Geo-location change detected

---

## 💰 Phase 3: Financial Operations (Week 2)

### Priority: CRITICAL

### 3.1 P2P Transfers

**File:** `apps/raverpay-api/src/transactions/transactions.service.ts`

**Add Audit Logs:**

- ✅ P2P transfer initiated
- ✅ P2P transfer completed
- ✅ P2P transfer failed
- ✅ Ravertag created
- ✅ Ravertag updated
- ✅ Ravertag deleted

**Implementation:**

```typescript
async p2pTransfer(dto, userId, request) {
  // ... existing logic

  await this.auditService.logTransaction(
    AuditAction.P2P_TRANSFER_INITIATED,
    userId,
    {
      amount: dto.amount,
      recipientTag: dto.recipientTag,
      reference: transaction.reference,
      fee: calculatedFee,
    },
    request,
  );

  // After successful transfer
  await this.auditService.logTransaction(
    AuditAction.P2P_TRANSFER_COMPLETED,
    userId,
    {
      transactionId: transaction.id,
      recipientId: recipient.id,
      amount: dto.amount,
    },
    request,
  );
}
```

---

### 3.2 VTU Services

**File:** `apps/raverpay-api/src/vtu/vtu.service.ts`

**Add Audit Logs:**

- ✅ Airtime purchase initiated
- ✅ Airtime purchase completed
- ✅ Data purchase initiated
- ✅ Data purchase completed
- ✅ Cable TV payment
- ✅ Electricity payment
- ✅ International airtime
- ✅ VTU transaction failed

---

### 3.3 Transactions Service

**File:** `apps/raverpay-api/src/transactions/transactions.service.ts`

**Add Audit Logs:**

- ✅ Deposit initiated (webhook)
- ✅ Deposit completed
- ✅ Withdrawal initiated
- ✅ Withdrawal completed
- ✅ Withdrawal failed
- ✅ Transaction reversed
- ✅ Transaction disputed

---

## 🪙 Phase 4: Crypto & Circle Operations (Week 2)

### Priority: HIGH

### 4.1 Crypto Service

**File:** `apps/raverpay-api/src/crypto/crypto.service.ts`

**Add Audit Logs:**

- ✅ Crypto wallet created
- ✅ Crypto send initiated
- ✅ Crypto send completed
- ✅ Crypto receive detected
- ✅ Crypto conversion initiated
- ✅ Crypto conversion completed
- ✅ Crypto order placed
- ✅ Crypto order completed

---

### 4.2 Circle Service

**File:** `apps/raverpay-api/src/circle/circle.service.ts`

**Add Audit Logs:**

- ✅ Circle wallet created
- ✅ USDC transfer initiated
- ✅ USDC transfer completed
- ✅ CCTP cross-chain transfer
- ✅ Paymaster operation
- ✅ Modular wallet created
- ✅ Developer wallet operation

---

## 🎁 Phase 5: Gift Cards & Cashback (Week 2-3)

### Priority: MEDIUM

### 5.1 Gift Cards

**File:** `apps/raverpay-api/src/gift-cards/gift-cards.service.ts`

**Add Audit Logs:**

- ✅ Gift card order created
- ✅ Gift card order completed
- ✅ Gift card redeemed
- ✅ Gift card refunded

---

### 5.2 Cashback

**File:** `apps/raverpay-api/src/cashback/cashback.service.ts`

**Add Audit Logs:**

- ✅ Cashback earned
- ✅ Cashback redeemed
- ✅ Cashback expired

---

## 🎫 Phase 6: Support & Notifications (Week 3)

### Priority: MEDIUM

### 6.1 Support Tickets

**File:** `apps/raverpay-api/src/support/support.service.ts`

**Add Audit Logs:**

- ✅ Ticket created
- ✅ Ticket updated
- ✅ Ticket assigned
- ✅ Ticket resolved
- ✅ Ticket closed
- ✅ Ticket reopened

---

### 6.2 Notifications

**File:** `apps/raverpay-api/src/notifications/notifications.service.ts`

**Add Audit Logs:**

- ✅ Broadcast notification sent
- ✅ Email notification sent
- ✅ SMS notification sent
- ✅ Push notification sent

---

## 🔧 Phase 7: System Operations (Week 3)

### Priority: LOW

### 7.1 Webhooks

**File:** `apps/raverpay-api/src/webhooks/*.controller.ts`

**Add Audit Logs:**

- ✅ Webhook received (all types)
- ✅ Webhook processed
- ✅ Webhook failed

---

### 7.2 Scheduled Jobs

**File:** `apps/raverpay-api/src/jobs/*.service.ts`

**Add Audit Logs:**

- ✅ Job started
- ✅ Job completed
- ✅ Job failed

---

## 📊 Phase 8: Monitoring & Reporting (Week 3)

### 8.1 Audit Log Dashboard

**Create Admin Endpoints:**

- GET `/admin/audit-logs` - List with filters
- GET `/admin/audit-logs/:id` - View details
- GET `/admin/audit-logs/export` - Export CSV/JSON
- GET `/admin/audit-logs/stats` - Statistics

**Filters:**

- By user
- By action type
- By resource
- By severity
- By date range
- By IP address
- By status (success/failure)

---

### 8.2 Real-time Alerts

**File:** `apps/raverpay-api/src/common/services/alert.service.ts` (NEW)

**Alert Conditions:**

- Multiple failed login attempts
- Large transaction amounts
- Unusual activity patterns
- Critical security events
- System errors

**Alert Channels:**

- Email to admins
- Slack webhook
- SMS for critical events

---

### 8.3 Retention Policy

**Implement data retention:**

- Keep all audit logs for 90 days
- Archive logs older than 90 days to cold storage
- Delete archived logs after 7 years (compliance)

---

## 🧪 Phase 9: Testing (Throughout)

### 9.1 Unit Tests

**Create tests for:**

- AuditService methods
- Request metadata extraction
- Severity classification
- Actor type determination

**File:** `apps/raverpay-api/src/common/services/__tests__/audit.service.spec.ts`

---

### 9.2 Integration Tests

**Test scenarios:**

- Audit logs created on user registration
- Audit logs created on login
- Audit logs created on transactions
- Failed operations logged correctly
- Metadata captured correctly

---

### 9.3 Performance Tests

**Ensure audit logging doesn't impact performance:**

- Async logging (non-blocking)
- Batch inserts for high-volume operations
- Database index optimization
- Query performance testing

---

## 📋 Implementation Checklist

### Week 1: Infrastructure

- [ ] Update Prisma schema
- [ ] Run migration
- [ ] Create AuditService
- [ ] Create RequestMetadataInterceptor
- [ ] Create audit log types
- [ ] Create unit tests for AuditService

### Week 1-2: Critical Operations

- [ ] Add auth logs (register, login, logout)
- [ ] Add security event logs
- [ ] Add P2P transfer logs
- [ ] Add VTU operation logs
- [ ] Add transaction logs
- [ ] Test critical flows

### Week 2: Crypto & Circle

- [ ] Add crypto operation logs
- [ ] Add Circle/USDC logs
- [ ] Add Venly wallet logs
- [ ] Test crypto flows

### Week 2-3: Additional Services

- [ ] Add gift card logs
- [ ] Add cashback logs
- [ ] Add support ticket logs
- [ ] Add notification logs
- [ ] Add webhook logs

### Week 3: Monitoring, Dashboard & Cleanup

#### Backend (API)

- [ ] Create admin dashboard endpoints
- [ ] Implement alerts service
- [ ] Set up retention policy
- [ ] Replace hardcoded IPs
- [ ] Add missing metadata captures
- [ ] Performance optimization

#### Frontend (Admin Dashboard)

- [ ] Update `AuditLog` TypeScript interface
- [ ] Add severity filter dropdown
- [ ] Add actor type filter dropdown
- [ ] Add status filter dropdown
- [ ] Update table with new columns (severity, actor, status, location)
- [ ] Add color coding for severity levels
- [ ] Add status icons (success/failure/pending)
- [ ] Enhance stats cards (critical count, failed count, success rate)
- [ ] Update detail page with new fields
- [ ] Add before/after comparison view
- [ ] Add error message display
- [ ] Implement export functionality (CSV/JSON)
- [ ] Update resource and action type lists
- [ ] Test all new filters
- [ ] Mobile responsiveness check

#### Final Steps

- [ ] Final integration testing (API + Dashboard)
- [ ] Documentation
- [ ] Security review
- [ ] User acceptance testing

---

## 🎯 Success Metrics

### Coverage

- ✅ 100% of authentication events logged
- ✅ 100% of financial transactions logged
- ✅ 100% of security events logged
- ✅ 100% of admin actions logged

### Quality

- ✅ Real IP addresses captured (no hardcoded values)
- ✅ Device fingerprinting implemented
- ✅ Geo-location data captured
- ✅ Performance impact < 5ms per request

### Compliance

- ✅ Audit logs meet financial compliance requirements
- ✅ Data retention policy implemented
- ✅ Tamper-proof logging (append-only)
- ✅ Audit trail for all sensitive operations

---

## 🔒 Security Considerations

1. **Data Protection:**
   - Don't log sensitive data (passwords, PINs, full card numbers)
   - Mask PII in logs (partial phone, email)
   - Encrypt audit logs at rest

2. **Access Control:**
   - Only admins can view audit logs
   - RBAC for audit log access
   - Log who accesses audit logs

3. **Integrity:**
   - Audit logs are append-only
   - Use database constraints to prevent updates
   - Consider blockchain anchoring for critical logs

---

## 📈 Performance Optimization

1. **Async Logging:**
   - Use queues (BullMQ) for non-critical logs
   - Batch inserts for high-volume operations

2. **Database Optimization:**
   - Proper indexing on frequently queried fields
   - Partitioning by date for large tables
   - Archive old logs to separate table

3. **Monitoring:**
   - Track audit log insertion time
   - Monitor database size growth
   - Alert on logging failures

---

## 🚀 Deployment Strategy

### Stage 1: Development

- Implement and test in dev environment
- Code review
- Unit and integration tests

### Stage 2: Staging

- Deploy to staging
- Run smoke tests
- Performance testing
- Security review

### Stage 3: Production

- Feature flag for gradual rollout
- Monitor error rates
- Monitor performance impact
- Full rollout after 48 hours

---

## 📚 Documentation Deliverables

1. **Developer Guide:**
   - How to use AuditService
   - When to log what
   - Best practices

2. **Admin Guide:**
   - How to access audit logs
   - How to interpret logs
   - Common queries

3. **API Documentation:**
   - Update OpenAPI spec
   - Add audit log endpoints

4. **Compliance Documentation:**
   - What we log and why
   - Retention policies
   - Access controls

---

## 🖥️ Phase 10: Admin Dashboard Updates (Week 3)

### Priority: MEDIUM

The admin dashboard at `apps/raverpay-admin/app/dashboard/audit` already has a good foundation but needs updates to support the enhanced audit log schema.

### 10.1 Update TypeScript Types

**File:** `apps/raverpay-admin/types/index.ts`

**Current Interface:**

```typescript
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: User;
}
```

**Enhanced Interface:**

```typescript
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: User;

  // NEW FIELDS
  actorType?: 'USER' | 'ADMIN' | 'SYSTEM' | 'WEBHOOK' | 'API';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: 'SUCCESS' | 'FAILURE' | 'PENDING';
  errorMessage?: string | null;
  executionTime?: number | null;
  deviceId?: string | null;
  location?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}
```

---

### 10.2 Enhance Audit Logs List Page

**File:** `apps/raverpay-admin/app/dashboard/audit/page.tsx`

**Add New Features:**

#### 10.2.1 Severity Filter

```typescript
// Add severity filter state
const [severityFilter, setSeverityFilter] = useState<string>('all');

// Add to filters section
<Select value={severityFilter} onValueChange={setSeverityFilter}>
  <SelectTrigger className="w-full md:w-[180px]">
    <SelectValue placeholder="Severity" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Severities</SelectItem>
    <SelectItem value="LOW">Low</SelectItem>
    <SelectItem value="MEDIUM">Medium</SelectItem>
    <SelectItem value="HIGH">High</SelectItem>
    <SelectItem value="CRITICAL">Critical</SelectItem>
  </SelectContent>
</Select>
```

#### 10.2.2 Actor Type Filter

```typescript
// Add actor type filter state
const [actorTypeFilter, setActorTypeFilter] = useState<string>('all');

// Add to filters section
<Select value={actorTypeFilter} onValueChange={setActorTypeFilter}>
  <SelectTrigger className="w-full md:w-[180px]">
    <SelectValue placeholder="Actor Type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Actors</SelectItem>
    <SelectItem value="USER">User</SelectItem>
    <SelectItem value="ADMIN">Admin</SelectItem>
    <SelectItem value="SYSTEM">System</SelectItem>
    <SelectItem value="WEBHOOK">Webhook</SelectItem>
    <SelectItem value="API">API</SelectItem>
  </SelectContent>
</Select>
```

#### 10.2.3 Status Filter

```typescript
// Add status filter state
const [statusFilter, setStatusFilter] = useState<string>('all');

// Add to filters section
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectTrigger className="w-full md:w-[180px]">
    <SelectValue placeholder="Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Status</SelectItem>
    <SelectItem value="SUCCESS">Success</SelectItem>
    <SelectItem value="FAILURE">Failure</SelectItem>
    <SelectItem value="PENDING">Pending</SelectItem>
  </SelectContent>
</Select>
```

#### 10.2.4 Enhanced Table Columns

```typescript
<TableHeader>
  <TableRow>
    <TableHead>Action</TableHead>
    <TableHead>Resource</TableHead>
    <TableHead>Actor</TableHead>  {/* NEW */}
    <TableHead>Severity</TableHead>  {/* NEW */}
    <TableHead>Status</TableHead>  {/* NEW */}
    <TableHead>User</TableHead>
    <TableHead>IP Address</TableHead>
    <TableHead>Location</TableHead>  {/* NEW */}
    <TableHead>Timestamp</TableHead>
    <TableHead className="text-right">Details</TableHead>
  </TableRow>
</TableHeader>
```

#### 10.2.5 Enhanced Table Rows with Status Indicators

```typescript
<TableBody>
  {logsData.data.map((log) => (
    <TableRow key={log.id} className={log.status === 'FAILURE' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
      <TableCell>
        <Badge className={actionColors[log.action] || 'bg-gray-500'}>
          {log.action}
        </Badge>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{log.resource}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {log.resourceId?.slice(0, 8)}...
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={getActorTypeColor(log.actorType)}>
          {log.actorType || 'USER'}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={getSeverityColor(log.severity)}>
          {log.severity || 'LOW'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {log.status === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {log.status === 'FAILURE' && <XCircle className="h-4 w-4 text-red-600" />}
          {log.status === 'PENDING' && <Clock className="h-4 w-4 text-yellow-600" />}
          <span className="text-sm">{log.status || 'SUCCESS'}</span>
        </div>
      </TableCell>
      <TableCell>
        {log.user ? (
          <div>
            <p className="text-sm">{log.user.firstName} {log.user.lastName}</p>
            <p className="text-xs text-muted-foreground">{log.user.email}</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">System</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm font-mono">{log.ipAddress || '-'}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm">{log.location || '-'}</span>
      </TableCell>
      <TableCell>{formatDate(log.createdAt)}</TableCell>
      <TableCell className="text-right">
        <Link href={`/dashboard/audit/${log.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

#### 10.2.6 Add Color Helper Functions

```typescript
const getSeverityColor = (severity?: string): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'HIGH':
      return 'bg-orange-500 text-white hover:bg-orange-600';
    case 'MEDIUM':
      return 'bg-yellow-500 text-white hover:bg-yellow-600';
    case 'LOW':
      return 'bg-blue-500 text-white hover:bg-blue-600';
    default:
      return 'bg-gray-500 text-white hover:bg-gray-600';
  }
};

const getActorTypeColor = (actorType?: string): string => {
  switch (actorType) {
    case 'ADMIN':
      return 'border-purple-500 text-purple-700 dark:text-purple-300';
    case 'SYSTEM':
      return 'border-blue-500 text-blue-700 dark:text-blue-300';
    case 'WEBHOOK':
      return 'border-green-500 text-green-700 dark:text-green-300';
    case 'API':
      return 'border-orange-500 text-orange-700 dark:text-orange-300';
    case 'USER':
    default:
      return 'border-gray-500 text-gray-700 dark:text-gray-300';
  }
};
```

#### 10.2.7 Enhanced Stats Cards

```typescript
<div className="grid gap-4 md:grid-cols-5">
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Total Logs
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {stats?.totalCount?.toLocaleString() || 0}
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Today's Activity
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-blue-600">
        {stats?.today?.toLocaleString() || 0}
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Critical Events
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-red-600">
        {stats?.criticalCount?.toLocaleString() || 0}
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Failed Actions
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-orange-600">
        {stats?.failedCount?.toLocaleString() || 0}
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Success Rate
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-green-600">
        {stats?.successRate ? `${stats.successRate.toFixed(1)}%` : 'N/A'}
      </div>
    </CardContent>
  </Card>
</div>
```

#### 10.2.8 Update Resource and Action Type Lists

```typescript
// Expand resource types to match backend implementation
const resourceTypes = [
  'USER',
  'AUTH', // NEW
  'TRANSACTION',
  'WALLET',
  'P2P_TRANSFER', // NEW
  'VTU', // NEW
  'CRYPTO', // NEW
  'CIRCLE', // NEW
  'KYC',
  'VTU_ORDER',
  'GIFTCARD_ORDER',
  'GIFT_CARD', // NEW
  'CRYPTO_ORDER',
  'VIRTUAL_ACCOUNT',
  'NOTIFICATION',
  'SUPPORT_TICKET', // NEW
  'DELETION_REQUEST',
];

// Expand action types to match backend implementation
const actionTypes = [
  // Authentication
  'USER_REGISTERED',
  'USER_LOGIN',
  'USER_LOGOUT',
  'LOGIN_FAILED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'TWO_FA_ENABLED',
  'TWO_FA_DISABLED',

  // CRUD
  'CREATE',
  'UPDATE',
  'DELETE',

  // Transactions
  'P2P_TRANSFER_INITIATED',
  'P2P_TRANSFER_COMPLETED',
  'WITHDRAWAL_INITIATED',
  'WITHDRAWAL_COMPLETED',
  'DEPOSIT_RECEIVED',

  // Admin
  'APPROVE',
  'REJECT',
  'REFUND',
  'REVERSE',
  'LOCK',
  'UNLOCK',

  // VTU
  'AIRTIME_PURCHASE',
  'DATA_PURCHASE',
  'CABLE_TV_PAYMENT',
  'ELECTRICITY_PAYMENT',

  // Crypto
  'CRYPTO_SEND',
  'CRYPTO_RECEIVE',
  'CRYPTO_CONVERSION',
];
```

---

### 10.3 Enhance Audit Log Detail Page

**File:** `apps/raverpay-admin/app/dashboard/audit/[logId]/page.tsx`

**Add New Sections:**

#### 10.3.1 Status & Severity Indicators

```typescript
// Update header to show severity
<div className="flex items-center gap-2">
  <Badge className={actionColors[log.action] || 'bg-gray-100'}>
    {log.action}
  </Badge>
  {log.severity && (
    <Badge className={getSeverityColor(log.severity)}>
      {log.severity}
    </Badge>
  )}
  {log.status && log.status !== 'SUCCESS' && (
    <Badge variant={log.status === 'FAILURE' ? 'destructive' : 'secondary'}>
      {log.status}
    </Badge>
  )}
</div>
```

#### 10.3.2 Actor Type Card

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Shield className="h-5 w-5" />
      Actor Information
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <p className="text-sm font-medium text-muted-foreground">Actor Type</p>
      <Badge variant="outline" className={getActorTypeColor(log.actorType)}>
        {log.actorType || 'USER'}
      </Badge>
    </div>
    <div>
      <p className="text-sm font-medium text-muted-foreground">Severity Level</p>
      <Badge className={getSeverityColor(log.severity)}>
        {log.severity || 'LOW'}
      </Badge>
    </div>
    <div>
      <p className="text-sm font-medium text-muted-foreground">Status</p>
      <div className="flex items-center gap-2">
        {log.status === 'SUCCESS' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
        {log.status === 'FAILURE' && <XCircle className="h-5 w-5 text-red-600" />}
        {log.status === 'PENDING' && <Clock className="h-5 w-5 text-yellow-600" />}
        <span className="text-lg">{log.status || 'SUCCESS'}</span>
      </div>
    </div>
  </CardContent>
</Card>
```

#### 10.3.3 Enhanced Request Information

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Globe className="h-5 w-5" />
      Request Information
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <p className="text-sm font-medium text-muted-foreground">IP Address</p>
      <p className="text-lg font-mono">{log.ipAddress || 'N/A'}</p>
    </div>
    {log.location && (
      <div>
        <p className="text-sm font-medium text-muted-foreground">Location</p>
        <p className="text-lg">{log.location}</p>
      </div>
    )}
    {log.deviceId && (
      <div>
        <p className="text-sm font-medium text-muted-foreground">Device ID</p>
        <p className="text-sm font-mono text-muted-foreground">{log.deviceId}</p>
      </div>
    )}
    <div>
      <p className="text-sm font-medium text-muted-foreground">User Agent</p>
      <p className="text-sm text-muted-foreground break-all">
        {log.userAgent || 'N/A'}
      </p>
    </div>
    {log.executionTime && (
      <div>
        <p className="text-sm font-medium text-muted-foreground">Execution Time</p>
        <p className="text-lg">{log.executionTime}ms</p>
      </div>
    )}
  </CardContent>
</Card>
```

#### 10.3.4 Error Message Card (if failure)

```typescript
{log.status === 'FAILURE' && log.errorMessage && (
  <Card className="md:col-span-2 border-red-200 dark:border-red-800">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        Error Details
      </CardTitle>
    </CardHeader>
    <CardContent>
      <pre className="text-sm bg-red-50 dark:bg-red-950/20 p-4 rounded-lg overflow-auto max-h-32 text-red-600">
        {log.errorMessage}
      </pre>
    </CardContent>
  </Card>
)}
```

#### 10.3.5 Before/After Comparison (for updates)

```typescript
{(log.oldValue || log.newValue) && (
  <Card className="md:col-span-2">
    <CardHeader>
      <CardTitle>Value Changes</CardTitle>
    </CardHeader>
    <CardContent className="grid md:grid-cols-2 gap-4">
      {log.oldValue && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Before</p>
          <pre className="text-sm bg-red-50 dark:bg-red-950/20 p-4 rounded-lg overflow-auto max-h-64">
            {JSON.stringify(log.oldValue, null, 2)}
          </pre>
        </div>
      )}
      {log.newValue && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">After</p>
          <pre className="text-sm bg-green-50 dark:bg-green-950/20 p-4 rounded-lg overflow-auto max-h-64">
            {JSON.stringify(log.newValue, null, 2)}
          </pre>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

---

### 10.4 Update API Statistics Response

**File:** `apps/raverpay-admin/lib/api/audit-logs.ts`

**Update Statistics Interface:**

```typescript
export interface AuditLogStatistics {
  totalCount: number;
  today: number;
  byAction: Array<{
    action: string;
    count: number;
  }>;
  byResource: Array<{
    resource: string;
    count: number;
  }>;
  topActions?: Array<{
    action: string;
    count: number;
  }>;

  // NEW FIELDS
  criticalCount?: number;
  failedCount?: number;
  successRate?: number;
  bySeverity?: Array<{
    severity: string;
    count: number;
  }>;
  byActorType?: Array<{
    actorType: string;
    count: number;
  }>;
  byStatus?: Array<{
    status: string;
    count: number;
  }>;
}
```

---

### 10.5 Add Export Functionality

**Create New Component:** `apps/raverpay-admin/components/audit/export-audit-logs.tsx`

**Features:**

- Export to CSV
- Export to JSON
- Date range selection
- Filter-based export
- Download button with loading state

```typescript
'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { auditLogsApi } from '@/lib/api/audit-logs';

export function ExportAuditLogs() {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Implementation for export
      const data = await auditLogsApi.export({ format });
      // Download logic
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Audit Logs</DialogTitle>
          <DialogDescription>
            Download audit logs in CSV or JSON format
          </DialogDescription>
        </DialogHeader>
        {/* Export form content */}
      </DialogContent>
    </Dialog>
  );
}
```

---

### 10.6 Add Real-time Updates (Optional)

**Use WebSocket or Polling for Live Updates:**

```typescript
// Add to page.tsx
const { data: recentLogs } = useQuery({
  queryKey: ['audit-logs-recent'],
  queryFn: () => auditLogsApi.getRecent(5),
  refetchInterval: 10000, // Poll every 10 seconds
});

// Display recent activity indicator
{recentLogs && recentLogs.length > 0 && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
    <span>Live - {recentLogs.length} new logs in last 10s</span>
  </div>
)}
```

---

### 10.7 Admin Dashboard Checklist

- [ ] Update `AuditLog` interface in `types/index.ts`
- [ ] Add new filter dropdowns (severity, actorType, status)
- [ ] Update table columns with new fields
- [ ] Add color coding for severity levels
- [ ] Add status indicators (success/failure/pending icons)
- [ ] Enhance stats cards with new metrics
- [ ] Update detail page with new fields
- [ ] Add before/after comparison view
- [ ] Add error message display for failures
- [ ] Add export functionality
- [ ] Update resource and action type lists
- [ ] Add real-time updates (optional)
- [ ] Test all filters and sorting
- [ ] Mobile responsiveness check
- [ ] Accessibility audit

---

## 💡 Future Enhancements

### Phase 10: Advanced Features (Future)

- [ ] Machine learning for anomaly detection
- [ ] Real-time security dashboard
- [ ] Automated compliance reports
- [ ] Audit log analytics (trends, patterns)
- [ ] Integration with SIEM tools
- [ ] Blockchain anchoring for audit trails
- [ ] User-facing activity logs

---

## 📞 Support & Questions

For questions or clarification during implementation:

- Review existing audit log implementations in admin services
- Refer to Prisma documentation for schema changes
- Check NestJS docs for interceptors and decorators

---

## ✅ Sign-off

**Prepared by:** GitHub Copilot  
**Review required by:** Tech Lead, Security Team  
**Approval required by:** CTO  
**Implementation start:** Upon approval  
**Target completion:** 3 weeks from start

---

_This plan is a living document and should be updated as implementation progresses._
