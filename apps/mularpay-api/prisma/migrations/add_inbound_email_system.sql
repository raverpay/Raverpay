-- ==============================================
-- INBOUND EMAIL SYSTEM MIGRATION
-- Manual SQL Migration Script
-- Date: 2025-11-29
-- Description: Adds inbound email system tables for receiving emails via Resend webhooks
-- ==============================================

-- ============================================
-- INBOUND EMAILS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS inbound_emails (
    id TEXT NOT NULL,
    "emailId" TEXT NOT NULL UNIQUE,
    "messageId" TEXT,
    
    -- Email metadata
    "from" TEXT NOT NULL,
    "fromName" TEXT,
    "to" TEXT NOT NULL,
    cc TEXT[] DEFAULT '{}',
    bcc TEXT[] DEFAULT '{}',
    subject TEXT NOT NULL,
    "textBody" TEXT,
    "htmlBody" TEXT,
    
    -- Routing
    "targetRole" "UserRole",
    "targetEmail" TEXT NOT NULL,
    
    -- Integration with support system
    "ticketId" TEXT UNIQUE,
    "conversationId" TEXT UNIQUE,
    
    -- User matching
    "userId" TEXT,
    
    -- Attachments
    attachments JSONB,
    
    -- Status
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    
    -- Timestamps
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT inbound_emails_pkey PRIMARY KEY (id)
);

-- Inbound emails indexes
CREATE INDEX IF NOT EXISTS inbound_emails_targetRole_idx ON inbound_emails("targetRole");
CREATE INDEX IF NOT EXISTS inbound_emails_targetEmail_idx ON inbound_emails("targetEmail");
CREATE INDEX IF NOT EXISTS inbound_emails_userId_idx ON inbound_emails("userId");
CREATE INDEX IF NOT EXISTS inbound_emails_ticketId_idx ON inbound_emails("ticketId");
CREATE INDEX IF NOT EXISTS inbound_emails_conversationId_idx ON inbound_emails("conversationId");
CREATE INDEX IF NOT EXISTS inbound_emails_isProcessed_idx ON inbound_emails("isProcessed");
CREATE INDEX IF NOT EXISTS inbound_emails_receivedAt_idx ON inbound_emails("receivedAt");

-- Inbound emails foreign keys
DO $$ BEGIN
    ALTER TABLE inbound_emails
        ADD CONSTRAINT inbound_emails_ticketId_fkey
        FOREIGN KEY ("ticketId") REFERENCES tickets(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE inbound_emails
        ADD CONSTRAINT inbound_emails_conversationId_fkey
        FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE inbound_emails
        ADD CONSTRAINT inbound_emails_userId_fkey
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- EMAIL ROUTING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS email_routing (
    id TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL UNIQUE,
    "targetRole" "UserRole" NOT NULL,
    "autoCreateTicket" BOOLEAN NOT NULL DEFAULT false,
    "defaultPriority" "TicketPriority",
    "defaultCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT email_routing_pkey PRIMARY KEY (id)
);

-- Email routing indexes
CREATE INDEX IF NOT EXISTS email_routing_targetRole_idx ON email_routing("targetRole");
CREATE INDEX IF NOT EXISTS email_routing_isActive_idx ON email_routing("isActive");

-- ============================================
-- SEED DEFAULT EMAIL ROUTING RULES
-- ============================================

-- Support email routing
INSERT INTO email_routing (id, "emailAddress", "targetRole", "autoCreateTicket", "defaultPriority", "defaultCategory", "isActive", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::TEXT,
    'support@raverpay.com',
    'SUPPORT',
    true,
    'MEDIUM',
    'General Inquiry',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("emailAddress") DO NOTHING;

-- Admin email routing
INSERT INTO email_routing (id, "emailAddress", "targetRole", "autoCreateTicket", "defaultPriority", "defaultCategory", "isActive", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::TEXT,
    'admin@raverpay.com',
    'ADMIN',
    false,
    'MEDIUM',
    'Administrative',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("emailAddress") DO NOTHING;

-- Promotions email routing (for future use)
INSERT INTO email_routing (id, "emailAddress", "targetRole", "autoCreateTicket", "defaultPriority", "defaultCategory", "isActive", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::TEXT,
    'promotions@raverpay.com',
    'ADMIN',
    false,
    'LOW',
    'Marketing',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("emailAddress") DO NOTHING;

-- Security email routing (for future use)
INSERT INTO email_routing (id, "emailAddress", "targetRole", "autoCreateTicket", "defaultPriority", "defaultCategory", "isActive", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::TEXT,
    'security@raverpay.com',
    'ADMIN',
    true,
    'HIGH',
    'Security',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("emailAddress") DO NOTHING;

-- Compliance email routing (for future use)
INSERT INTO email_routing (id, "emailAddress", "targetRole", "autoCreateTicket", "defaultPriority", "defaultCategory", "isActive", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::TEXT,
    'compliance@raverpay.com',
    'ADMIN',
    false,
    'HIGH',
    'Compliance',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("emailAddress") DO NOTHING;

-- Partnerships email routing (for future use)
INSERT INTO email_routing (id, "emailAddress", "targetRole", "autoCreateTicket", "defaultPriority", "defaultCategory", "isActive", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::TEXT,
    'partnerships@raverpay.com',
    'ADMIN',
    false,
    'MEDIUM',
    'Partnerships',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("emailAddress") DO NOTHING;

