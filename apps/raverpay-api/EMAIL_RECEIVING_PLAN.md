# Email Receiving System - Implementation Plan

## Overview

Set up email receiving using Resend webhooks to receive emails at various team addresses (support@, admin@, etc.) and route them based on roles and email addresses.

## Current System Context

### Existing Roles

- `USER` - Regular users
- `SUPPORT` - Support team members
- `ADMIN` - Administrators
- `SUPER_ADMIN` - Super administrators

### Existing Support System

- **Conversations** - Chat conversations between users and support
- **Tickets** - Support tickets with status, priority, assignment
- **Messages** - Individual messages in conversations
- Admin dashboard already has support/tickets pages

## Email Address to Role/Team Mapping

### Proposed Email Addresses

| Email Address               | Target Team/Role     | Purpose                    | Access Control                                 |
| --------------------------- | -------------------- | -------------------------- | ---------------------------------------------- |
| `support@raverpay.com`      | SUPPORT team         | Customer support inquiries | SUPPORT, ADMIN, SUPER_ADMIN                    |
| `admin@raverpay.com`        | ADMIN team           | Administrative inquiries   | ADMIN, SUPER_ADMIN                             |
| `promotions@raverpay.com`   | Marketing/Promotions | Marketing inquiries        | ADMIN, SUPER_ADMIN (future: MARKETING role)    |
| `security@raverpay.com`     | Security team        | Security-related issues    | ADMIN, SUPER_ADMIN (future: SECURITY role)     |
| `compliance@raverpay.com`   | Compliance team      | Compliance inquiries       | ADMIN, SUPER_ADMIN (future: COMPLIANCE role)   |
| `partnerships@raverpay.com` | Business development | Partnership inquiries      | ADMIN, SUPER_ADMIN (future: PARTNERSHIPS role) |

### Extensibility for Future Roles

**Configuration-Based Approach:**

- Store email-to-role mapping in database (configurable)
- Add new roles without code changes
- Allow multiple email addresses per role
- Support catch-all routing rules

## Database Schema Design

### Option 1: Integrate with Existing Support System (Recommended)

**Use existing `Ticket` and `Conversation` models:**

- Inbound emails create Tickets automatically
- Link emails to existing support workflow
- Reuse existing ticket management UI

**New Model: `InboundEmail`**

```prisma
model InboundEmail {
  id              String   @id @default(uuid())
  emailId         String   @unique // Resend email ID
  messageId       String?  // Email message ID

  // Email metadata
  from            String   // Sender email
  fromName        String?  // Sender name
  to              String   // Recipient (support@, admin@, etc.)
  cc              String[] @default([])
  bcc             String[] @default([])
  subject         String
  textBody        String?  @db.Text
  htmlBody        String?  @db.Text

  // Routing
  targetRole      UserRole? // Which role/team this email is for
  targetEmail     String   // Which email address received it

  // Integration with support system
  ticketId        String?  @unique
  ticket          Ticket?  @relation("EmailTickets", fields: [ticketId], references: [id])
  conversationId  String?  @unique
  conversation    Conversation? @relation("EmailConversations", fields: [conversationId], references: [id])

  // User matching (if sender is a registered user)
  userId          String?
  user            User?    @relation(fields: [userId], references: [id])

  // Attachments
  attachments     Json?    // Array of attachment metadata

  // Status
  isProcessed     Boolean  @default(false)
  processedAt     DateTime?
  processingError String?  @db.Text

  // Timestamps
  receivedAt      DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([targetRole])
  @@index([targetEmail])
  @@index([userId])
  @@index([ticketId])
  @@index([isProcessed])
  @@index([receivedAt])
  @@map("inbound_emails")
}
```

**Update existing models:**

```prisma
model Ticket {
  // ... existing fields
  inboundEmail    InboundEmail? @relation("EmailTickets")
}

model Conversation {
  // ... existing fields
  inboundEmail    InboundEmail? @relation("EmailConversations")
}
```

### Option 2: Separate Email Inbox System

**New Models: `EmailInbox` and `EmailMessage`**

- Separate from support tickets
- Team-specific inboxes
- More flexible but requires new UI

**Recommendation: Option 1** - Integrate with existing support system for consistency.

## Email Processing Flow

### 1. Webhook Receives Email

```
Resend → POST /api/webhooks/resend/inbound
```

### 2. Email Processing Steps

1. **Verify webhook signature** (security)
2. **Parse email payload** (from, to, subject, body, attachments)
3. **Determine target team/role** from `to` address:
   - `support@raverpay.com` → SUPPORT
   - `admin@raverpay.com` → ADMIN
   - etc.
4. **Match sender to user** (if sender email exists in users table)
5. **Create InboundEmail record**
6. **Create Ticket** (if target is SUPPORT) OR **Store in inbox** (if target is ADMIN)
7. **Create Conversation** (if sender is registered user)
8. **Send notifications** to relevant team members
9. **Optional: Forward to Outlook** (if configured)

### 3. Ticket Creation Logic

**For `support@raverpay.com`:**

- Always create a Ticket
- If sender is registered user → Link to user, create Conversation
- If sender is not registered → Create ticket with email as contact
- Auto-assign based on rules (round-robin, load balancing, etc.)

**For `admin@raverpay.com`:**

- Create InboundEmail record
- Store in admin inbox (new UI section)
- Notify ADMIN and SUPER_ADMIN users
- Optionally create ticket if urgent

**For other addresses:**

- Store in appropriate inbox
- Route based on configuration

## Role-Based Access Control

### Viewing Emails/Tickets

| Role        | Can View               | Can Respond            | Can Assign      |
| ----------- | ---------------------- | ---------------------- | --------------- |
| USER        | Own tickets only       | Own tickets only       | No              |
| SUPPORT     | Support emails/tickets | Support emails/tickets | Support tickets |
| ADMIN       | All emails/tickets     | All emails/tickets     | All tickets     |
| SUPER_ADMIN | All emails/tickets     | All emails/tickets     | All tickets     |

### Admin Dashboard Pages

**New Pages Needed:**

1. `/dashboard/support/emails` - Email inbox view
   - Filter by: target email (support@, admin@, etc.)
   - Filter by: status (unread, processed, etc.)
   - Filter by: date range
   - Show: subject, from, received date, linked ticket

2. `/dashboard/support/emails/[id]` - Email detail view
   - Show full email content
   - Show attachments
   - Show linked ticket/conversation
   - Reply functionality
   - Create ticket from email (if not already linked)

**Existing Pages (Enhanced):**

- `/dashboard/support/tickets` - Show tickets created from emails
- `/dashboard/support/tickets/[id]` - Show email source if ticket came from email

## Configuration System

### Email-to-Role Mapping Table

```prisma
model EmailRouting {
  id            String   @id @default(uuid())
  emailAddress  String   @unique // e.g., "support@raverpay.com"
  targetRole    UserRole // Which role can access this
  autoCreateTicket Boolean @default(false) // Auto-create ticket?
  defaultPriority TicketPriority? // Default priority for tickets
  defaultCategory String? // Default category
  isActive      Boolean  @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("email_routing")
}
```

**Benefits:**

- Add new email addresses without code changes
- Change routing rules dynamically
- Support multiple emails per role
- Easy to extend for future roles

## API Endpoints Needed

### Webhook Endpoint

- `POST /api/webhooks/resend/inbound` - Public, verify signature

### Admin Endpoints

- `GET /api/admin/support/emails` - List inbound emails (role-filtered)
- `GET /api/admin/support/emails/:id` - Get email details
- `POST /api/admin/support/emails/:id/reply` - Reply to email
- `POST /api/admin/support/emails/:id/create-ticket` - Create ticket from email
- `PATCH /api/admin/support/emails/:id/process` - Mark as processed
- `GET /api/admin/support/email-routing` - Get routing configuration
- `POST /api/admin/support/email-routing` - Add routing rule (ADMIN only)

## Implementation Phases

### Phase 1: Basic Email Receiving

1. Create `InboundEmail` model
2. Create webhook endpoint
3. Store emails in database
4. Basic email parsing

### Phase 2: Support Integration

1. Auto-create tickets from support@ emails
2. Link emails to conversations
3. Match senders to users

### Phase 3: Admin Dashboard

1. Email inbox page
2. Email detail page
3. Reply functionality
4. Link emails to tickets

### Phase 4: Advanced Features

1. Email routing configuration
2. Auto-assignment rules
3. Email forwarding to Outlook
4. Attachment handling
5. Email templates for replies

## Security Considerations

1. **Webhook Signature Verification** - Always verify Resend webhook signatures
2. **Rate Limiting** - Prevent webhook spam
3. **Role-Based Access** - Enforce RBAC on all email endpoints
4. **Email Validation** - Sanitize email content
5. **Attachment Security** - Scan/validate attachments
6. **IP Whitelisting** - Optional: whitelist Resend IPs

## Future Extensibility

### Adding New Roles

1. Add role to `UserRole` enum
2. Add email routing rule in `EmailRouting` table
3. Update RBAC guards (if needed)
4. Add UI section in admin dashboard (if needed)

### Adding New Email Addresses

1. Add MX record (if needed) - but catch-all works too
2. Add routing rule in `EmailRouting` table
3. No code changes needed!

## Questions to Decide

1. **Should emails auto-create tickets?**
   - Support emails: Yes
   - Admin emails: Maybe (configurable)
   - Other emails: No (just store)

2. **Should we forward to Outlook?**
   - Yes, for backup/notification
   - Or no, keep everything in system

3. **Reply functionality:**
   - Reply via Resend API (send from same address)
   - Or reply via support system (creates message in conversation)

4. **User matching:**
   - Match by email address only?
   - Or also by name/phone?

5. **Auto-assignment:**
   - Round-robin?
   - Load-based?
   - Manual only?

## Recommended Approach

1. **Start with support@ integration** - Auto-create tickets
2. **Use existing Ticket/Conversation models** - Reuse UI
3. **Add InboundEmail model** - Track all emails
4. **Add EmailRouting config** - Make it extensible
5. **Build email inbox UI** - Show emails, link to tickets
6. **Add reply functionality** - Send replies via Resend

This approach:

- ✅ Reuses existing support system
- ✅ Minimal new UI needed
- ✅ Extensible for future roles
- ✅ Consistent with current architecture

  cd apps/raverpay-api
  psql "postgresql://postgres.oeanyukxcphqjrsljhqq:raverpay2025@aws-1-eu-north-1.pooler.supabase.com:5432/postgres?connect_timeout=10" -f prisma/migrations/add_inbound_email_system.sql
