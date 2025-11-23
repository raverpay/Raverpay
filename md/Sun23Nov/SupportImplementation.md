The hooks are already complete. Now let me provide you with the commit message and
testing guide:

---

Commit Message

feat: implement comprehensive customer support system

Add complete support system across backend API, mobile app, and admin panel:

Backend API (NestJS):

- Database schema: Conversation, Message, Ticket, HelpCollection, HelpArticle,
  CannedResponse models
- Support module with WebSocket gateway for real-time chat
- Bot service with category selection, quick replies, and transaction context handling
- Help service with CRUD operations for knowledge base
- REST endpoints for user support operations and admin/agent management
- Role-based access control for SUPPORT, ADMIN, SUPER_ADMIN roles

Mobile App (React Native/Expo):

- Support hub screen with messages, tickets, and help center sections
- Live chat screen with message bubbles and rating modal
- Messages list and tickets list screens
- Help center with collections and article views
- Transaction context support for contextual help
- React Query hooks for data fetching

Admin Panel (Next.js):

- Support dashboard with stats (open tickets, response time, CSAT)
- Ticket queue with filters and assignment
- Live chat interface for agents with canned responses
- Ticket detail page with resolution workflow
- Conversations list with join/transfer capabilities
- Canned responses management (CRUD)
- Help center management (collections and articles)
- Navigation updated with Support section

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

---

Testing Guide

Prerequisites

1. Ensure the database migration has been applied (was done earlier in this session)
2. Start all three applications:
   - Backend API: cd /Users/joseph/Desktop/mularpay && pnpm dev (or however you start

it) - Mobile App: cd /Users/joseph/Desktop/raverpay && npm start (then press i for iOS
or a for Android) - Admin Panel: cd /Users/joseph/Desktop/mularpay/apps/mularpay-admin && pnpm dev

---

Test Scenario 1: User Opens Support from Profile

Mobile App (as regular USER):

1. Open the mobile app and log in as a regular user
2. Go to Profile tab (usually bottom navigation)
3. Look for a "Help" or "Support" button/link (you may need to add this - see note
   below)
4. Alternatively, navigate directly to /support route
5. You should see the Support Hub screen with:
   - Greeting: "Hi [Your Name]! How can we help you today?"
   - Two quick action cards: Messages and Tickets
   - Help Center link
   - "Send us a message" button
   - Search bar for help articles
   - Popular articles section (will be empty until seeded)

6. Tap "Send us a message"
7. You'll be taken to the chat screen
8. The bot should greet you and show category quick reply buttons // NOT SEEN
9. Select a category (e.g., "Airtime & Data Issues") // NOT SEEN
10. Bot will ask follow-up questions // NOT SEEN
11. Type a message and send it
12. The conversation should appear in your Messages list

---

Test Scenario 2: User Opens Support from Transaction (Context-Aware)

Mobile App:

1. Go to Transactions or Home screen
2. Find a transaction (especially a failed one)
3. Tap on the transaction to view details
4. Look for "Get Help" or "Report Issue" button

Note: You may need to add this button to your transaction detail screen. Add this code
to your transaction detail screen:

<TouchableOpacity
onPress={() => router.push({
pathname: '/support',
params: {
context: JSON.stringify({
transactionId: transaction.id,
transactionType: transaction.type,
amount: transaction.amount,
status: transaction.status,
reference: transaction.reference,
})
}
})}
className="bg-[#5B55F6] rounded-xl py-3 px-6"

>

    <Text className="text-white font-semibold">Get Help</Text>

  </TouchableOpacity>

5. When you open support from a transaction, the bot should:
   - Acknowledge the specific transaction
   - Display transaction details
   - Offer context-aware options (Refund, Retry, Speak to Agent)

---

Test Scenario 3: View Help Center

Mobile App:

1. From Support Hub, tap Help Center
2. You'll see a list of help collections (empty until seeded)
3. Tap a collection to see articles
4. Tap an article to read it
5. At the bottom, you can mark if it was helpful or not

---

Test Scenario 4: Agent Handles Support (Admin Panel)

Admin Panel (log in as SUPPORT, ADMIN, or SUPER_ADMIN user):

1. Open the admin panel at http://localhost:3000 (or your admin URL)
2. Log in with a user who has SUPPORT, ADMIN, or SUPER_ADMIN role
3. In the sidebar, click Support
4. You'll see the Support Dashboard with:
   - Stats cards (Open Tickets, Waiting for Agent, Avg Response Time, CSAT)
   - Tabs: Overview, Recent Tickets, Live Chats

5. Click Live Chat button or go to Conversations tab
6. Find a conversation that's "Waiting for Agent"
7. Click Join to assign yourself
8. You'll be taken to the chat interface:
   - Left: User info (name, email)
   - Center: Chat messages with input
   - Right: Ticket info (if created)

9. Type a message and send
10. The user's mobile app should receive the message (via REST polling - WebSocket
    would need socket.io-client installed)
11. Use the Canned Responses button (file icon) to insert pre-written responses
12. Click End Conversation when done
13. User will see rating modal on their end

---

Test Scenario 5: Manage Tickets

Admin Panel:

1. Go to Support → Ticket Queue button
2. You'll see all tickets with filters:
   - Status: Open, In Progress, Resolved, Closed
   - Priority: Urgent, High, Medium, Low

3. Click on a ticket to view details
4. On the ticket detail page:
   - Change status/priority via dropdowns
   - Click Assign to Me if unassigned
   - Click Resolve to close with resolution note

5. If ticket has a linked conversation, click View Conversation

---

Test Scenario 6: Manage Canned Responses

Admin Panel:

1. Go to Support → Canned Responses (from dashboard quick actions)
2. Click Add Response
3. Fill in:
   - Title: "Greeting"
   - Category: "General"
   - Shortcut: "hi"
   - Content: "Hello! Thank you for contacting us. How can I help you today?"

4. Click Create
5. The response will appear grouped by category
6. Edit or delete responses as needed

---

Test Scenario 7: Manage Help Center

Admin Panel:

1. Go to Support → Help Center (from dashboard quick actions)
2. Collections tab:
   - Click Add Collection
   - Create: "Getting Started" with description
   - Edit/delete collections

3. Articles tab:
   - Click Add Article
   - Select collection, add title/content
   - Save as Draft or Published
   - Use Publish/Unpublish buttons to control visibility

4. Published articles will appear in the mobile app's Help Center

---

What's NOT Fully Implemented (Future Work):

1. Email Notifications: Backend has placeholder but needs email service integration
1. Push Notifications: Not implemented - needs Firebase/Expo Push integration
1. Analytics Dashboard: Admin panel page exists in navigation but page not created
1. Help Center Seed Data: No initial articles - need to create via admin panel
1. "Get Help" button on transaction screens: Needs to be manually added to your
   existing transaction detail screens

---

Quick Test Commands:

# Start Backend API

cd /Users/joseph/Desktop/mularpay && pnpm dev

# Start Mobile App (in new terminal)

cd /Users/joseph/Desktop/raverpay && npm start

# Start Admin Panel (in new terminal)

cd /Users/joseph/Desktop/mularpay/apps/mularpay-admin && pnpm dev

Done! I've implemented real-time WebSocket for the mobile app. Here's what was added:

WebSocket Implementation Summary

1. Installed socket.io-client

npm install socket.io-client

2. Created Socket Service (/src/services/socket.service.ts)

A singleton service that handles:

- WebSocket connection with auth token
- Joining/leaving conversation rooms
- Sending messages via WebSocket
- Typing indicators (start/stop)
- Event listeners for incoming messages
- Automatic reconnection handling
- Cleanup on disconnect

3. Updated Chat Screen (/app/support/chat/[id].tsx)

Enhanced with:

- WebSocket connection on mount, disconnection on unmount
- Real-time message receiving - new messages appear instantly without polling
- Typing indicators - shows "Agent is typing..." when agent types
- Dual delivery - sends via both WebSocket (for real-time) and REST (for reliability)
- Local message state - merges socket messages with server messages to avoid
  duplicates
- Visual typing indicator with animated dots

How it works:

1. When user opens chat screen, it connects to WebSocket server
2. Joins the conversation room to receive messages for that conversation
3. When user types, sends typing indicator via WebSocket
4. When user sends message, it goes via both WebSocket (instant) and REST API
   (reliable)
5. When agent sends message, it arrives via WebSocket and appears immediately
6. When leaving the chat, disconnects from room and cleans up listeners

The WebSocket URL is derived from your API_BASE_URL (removes /api suffix and connects
to the root for Socket.IO).

────────────────────────────────────────────────────────────────────────────────────────────

>  
> ────────────────────────────────────────────────────────────────────────────────────────────
> ⏵⏵ accept edits on (shift+tab ✗ Auto-update failed · Try claude doctor or npm i -g
> to cycle) @anthropic-ai/claude-code

────────────────────────────────────────────────────────────────────────────────────────────

>  
> ────────────────────────────────────────────────────────────────────────────────────────────
> ⏵⏵ accept edits on (shift+tab ✗ Auto-update failed · Try claude doctor or npm i -g
> to cycle) @anthropic-ai/claude-code

[Nest] 4833 - 11/23/2025, 9:45:20 AM LOG [Bootstrap] 📚 API endpoints available at http://localhost:3001/api
❌ Redis connection failed after 3 retries
[Nest] 4833 - 11/23/2025, 9:48:13 AM WARN [PrismaService] Slow query detected: BEGIN (1333ms)
[Nest] 4833 - 11/23/2025, 9:51:24 AM WARN [PrismaService] Slow query detected: BEGIN (1249ms)
[Nest] 4833 - 11/23/2025, 9:51:25 AM WARN [PrismaService] Slow query detected: DEALLOCATE ALL (1536ms)
[Nest] 4833 - 11/23/2025, 9:51:29 AM WARN [PrismaService] Slow query detected:
SELECT _ FROM "notification_queue"
WHERE channel = $1
AND status = 'QUEUED'
AND (("scheduledFor" IS NULL) OR ("scheduledFor" <= $2))
AND (("nextRetryAt" IS NULL) OR ("nextRetryAt" <= $3))
ORDER BY priority DESC, "createdAt" ASC
LIMIT $4
(1738ms)
[Nest] 4833 - 11/23/2025, 9:51:45 AM WARN [PrismaService] Slow query detected:
SELECT _ FROM "notification_queue"
WHERE channel = $1
AND status = 'QUEUED'
AND (("scheduledFor" IS NULL) OR ("scheduledFor" <= $2))
AND (("nextRetryAt" IS NULL) OR ("nextRetryAt" <= $3))
ORDER BY priority DESC, "createdAt" ASC
LIMIT $4
(1148ms)
