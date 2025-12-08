# Support System Fixes Summary

This document summarizes all the fixes and improvements made to the RaverPay support system across the API, Admin Dashboard, and Mobile App.

---

## Table of Contents

1. [Mobile App Real-time Messaging](#1-mobile-app-real-time-messaging)
2. [Inline Rating on Conversation End](#2-inline-rating-on-conversation-end)
3. [Admin Dropdown Conditional Rendering](#3-admin-dropdown-conditional-rendering)
4. [Bot Greeting with Categories](#4-bot-greeting-with-categories)
5. [Bot Subcategories Flow with Restart](#5-bot-subcategories-flow-with-restart)
6. [Transaction ID Collection & Auto-Assignment](#6-transaction-id-collection--auto-assignment)
7. [Transaction Context for New Conversations](#7-transaction-context-for-new-conversations)
8. [Subcategories Filtering by Transaction Type](#8-subcategories-filtering-by-transaction-type)
9. [Auto-Share Transaction Details](#9-auto-share-transaction-details)
10. [Email/Push Notifications](#10-emailpush-notifications)
11. [Help Center Seed Data](#11-help-center-seed-data)

---

## 1. Mobile App Real-time Messaging

**Issue:** Mobile app wasn't receiving messages in real-time while in the chat screen. Users had to navigate away and come back to see new messages.

**Root Cause:**

- Socket service wasn't connecting to the `/support` namespace
- Message event handler expected different payload format than what gateway sends
- Typing events had mismatched names (`typing:update` vs `typing:start`/`typing:stop`)

**Files Changed:**

- `raverpay/src/services/socket.service.ts`

**Changes Made:**

```typescript
// Before: Connected to base URL
this.socket = io(wsUrl, { ... });

// After: Connected to /support namespace
this.socket = io(`${wsUrl}/support`, { ... });

// Before: Expected message directly
this.socket.on("message:receive", (message: Message) => { ... });

// After: Handle { message, conversationId } format
this.socket.on("message:receive", (data: { message: Message; conversationId: string }) => { ... });

// Added separate handlers for typing:start and typing:stop
// Added onConversationUpdate handler for real-time status changes
```

---
