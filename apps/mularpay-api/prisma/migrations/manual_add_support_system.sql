-- ==============================================
-- SUPPORT SYSTEM MIGRATION
-- Manual SQL Migration Script
-- Date: 2025-11-23
-- Description: Adds support system tables for live chat, tickets, and help center
-- ==============================================

-- Create conversation status enum
DO $$ BEGIN
    CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'BOT_HANDLING', 'AWAITING_AGENT', 'AGENT_ASSIGNED', 'AWAITING_RATING', 'ENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create sender type enum
DO $$ BEGIN
    CREATE TYPE "SenderType" AS ENUM ('USER', 'BOT', 'AGENT', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ticket status enum
DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ticket priority enum
DO $$ BEGIN
    CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================
-- CONVERSATIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    status "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    category TEXT,
    "lastMessagePreview" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "transactionId" TEXT,
    "transactionType" TEXT,
    "transactionContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT conversations_pkey PRIMARY KEY (id)
);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS conversations_userId_idx ON conversations("userId");
CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations(status);
CREATE INDEX IF NOT EXISTS conversations_createdAt_idx ON conversations("createdAt");
CREATE INDEX IF NOT EXISTS conversations_userId_status_idx ON conversations("userId", status);

-- Conversations foreign key
DO $$ BEGIN
    ALTER TABLE conversations
        ADD CONSTRAINT conversations_userId_fkey
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================
-- MESSAGES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS messages (
    id TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "senderId" TEXT,
    content TEXT NOT NULL,
    attachments JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT messages_pkey PRIMARY KEY (id)
);

-- Messages indexes
CREATE INDEX IF NOT EXISTS messages_conversationId_idx ON messages("conversationId");
CREATE INDEX IF NOT EXISTS messages_createdAt_idx ON messages("createdAt");
CREATE INDEX IF NOT EXISTS messages_conversationId_createdAt_idx ON messages("conversationId", "createdAt");

-- Messages foreign key
DO $$ BEGIN
    ALTER TABLE messages
        ADD CONSTRAINT messages_conversationId_fkey
        FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================
-- TICKETS TABLE
-- ==============================================

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS tickets_ticketNumber_seq;

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL DEFAULT nextval('tickets_ticketNumber_seq'),
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    status "TicketStatus" NOT NULL DEFAULT 'OPEN',
    priority "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedAgentId" TEXT,
    rating INTEGER,
    "ratingComment" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT tickets_pkey PRIMARY KEY (id),
    CONSTRAINT tickets_ticketNumber_key UNIQUE ("ticketNumber"),
    CONSTRAINT tickets_conversationId_key UNIQUE ("conversationId")
);

-- Tickets indexes
CREATE INDEX IF NOT EXISTS tickets_userId_idx ON tickets("userId");
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets(priority);
CREATE INDEX IF NOT EXISTS tickets_assignedAgentId_idx ON tickets("assignedAgentId");
CREATE INDEX IF NOT EXISTS tickets_ticketNumber_idx ON tickets("ticketNumber");
CREATE INDEX IF NOT EXISTS tickets_createdAt_idx ON tickets("createdAt");
CREATE INDEX IF NOT EXISTS tickets_status_priority_idx ON tickets(status, priority);
CREATE INDEX IF NOT EXISTS tickets_status_createdAt_idx ON tickets(status, "createdAt");

-- Tickets foreign keys
DO $$ BEGIN
    ALTER TABLE tickets
        ADD CONSTRAINT tickets_conversationId_fkey
        FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE tickets
        ADD CONSTRAINT tickets_userId_fkey
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE tickets
        ADD CONSTRAINT tickets_assignedAgentId_fkey
        FOREIGN KEY ("assignedAgentId") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================
-- HELP COLLECTIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS help_collections (
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT help_collections_pkey PRIMARY KEY (id)
);

-- Help collections indexes
CREATE INDEX IF NOT EXISTS help_collections_order_idx ON help_collections("order");
CREATE INDEX IF NOT EXISTS help_collections_isActive_idx ON help_collections("isActive");

-- ==============================================
-- HELP ARTICLES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS help_articles (
    id TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    slug TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "unhelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT help_articles_pkey PRIMARY KEY (id),
    CONSTRAINT help_articles_slug_key UNIQUE (slug)
);

-- Help articles indexes
CREATE INDEX IF NOT EXISTS help_articles_collectionId_idx ON help_articles("collectionId");
CREATE INDEX IF NOT EXISTS help_articles_order_idx ON help_articles("order");
CREATE INDEX IF NOT EXISTS help_articles_isActive_idx ON help_articles("isActive");
CREATE INDEX IF NOT EXISTS help_articles_slug_idx ON help_articles(slug);

-- Help articles foreign key
DO $$ BEGIN
    ALTER TABLE help_articles
        ADD CONSTRAINT help_articles_collectionId_fkey
        FOREIGN KEY ("collectionId") REFERENCES help_collections(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================
-- CANNED RESPONSES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS canned_responses (
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    shortcut TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT canned_responses_pkey PRIMARY KEY (id)
);

-- Canned responses indexes
CREATE INDEX IF NOT EXISTS canned_responses_category_idx ON canned_responses(category);
CREATE INDEX IF NOT EXISTS canned_responses_isActive_idx ON canned_responses("isActive");
CREATE INDEX IF NOT EXISTS canned_responses_shortcut_idx ON canned_responses(shortcut);

-- Canned responses foreign key
DO $$ BEGIN
    ALTER TABLE canned_responses
        ADD CONSTRAINT canned_responses_createdById_fkey
        FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================
-- VERIFICATION QUERIES (Run after migration)
-- ==============================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages', 'tickets', 'help_collections', 'help_articles', 'canned_responses');
-- SELECT * FROM pg_type WHERE typname IN ('ConversationStatus', 'SenderType', 'TicketStatus', 'TicketPriority');
