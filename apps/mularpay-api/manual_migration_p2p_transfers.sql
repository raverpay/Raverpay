-- Manual Migration: Add P2P Transfers
-- Date: December 1, 2024
-- Description: Adds user tags and P2P transfer functionality

-- Step 1: Add P2P tag fields to users table
ALTER TABLE "users" 
ADD COLUMN "tag" VARCHAR(255) UNIQUE,
ADD COLUMN "tagSetAt" TIMESTAMP(3),
ADD COLUMN "tagChangedCount" INTEGER NOT NULL DEFAULT 0;

-- Step 2: Create index on tag field for fast lookups
CREATE INDEX "users_tag_idx" ON "users"("tag");

-- Step 3: Create p2p_transfers table
CREATE TABLE "p2p_transfers" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "fee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "message" VARCHAR(200),
    "senderTransactionId" TEXT NOT NULL,
    "receiverTransactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "p2p_transfers_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create unique constraint on reference
CREATE UNIQUE INDEX "p2p_transfers_reference_key" ON "p2p_transfers"("reference");

-- Step 5: Create indexes for performance
CREATE INDEX "p2p_transfers_senderId_idx" ON "p2p_transfers"("senderId");
CREATE INDEX "p2p_transfers_receiverId_idx" ON "p2p_transfers"("receiverId");
CREATE INDEX "p2p_transfers_createdAt_idx" ON "p2p_transfers"("createdAt");
CREATE INDEX "p2p_transfers_senderId_createdAt_idx" ON "p2p_transfers"("senderId", "createdAt");
CREATE INDEX "p2p_transfers_receiverId_createdAt_idx" ON "p2p_transfers"("receiverId", "createdAt");

-- Step 6: Add foreign key constraints
ALTER TABLE "p2p_transfers" ADD CONSTRAINT "p2p_transfers_senderId_fkey" 
    FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "p2p_transfers" ADD CONSTRAINT "p2p_transfers_receiverId_fkey" 
    FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Create reserved tags table (optional - for validation)
CREATE TABLE IF NOT EXISTS "reserved_tags" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL UNIQUE,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "reserved_tags_pkey" PRIMARY KEY ("id")
);

-- Step 8: Insert reserved tags
INSERT INTO "reserved_tags" ("id", "tag", "reason") VALUES
    (gen_random_uuid(), 'admin', 'System reserved'),
    (gen_random_uuid(), 'support', 'System reserved'),
    (gen_random_uuid(), 'official', 'System reserved'),
    (gen_random_uuid(), 'mularpay', 'Brand reserved'),
    (gen_random_uuid(), 'raverpay', 'Brand reserved'),
    (gen_random_uuid(), 'mular', 'Brand reserved'),
    (gen_random_uuid(), 'raver', 'Brand reserved'),
    (gen_random_uuid(), 'system', 'System reserved'),
    (gen_random_uuid(), 'help', 'System reserved'),
    (gen_random_uuid(), 'security', 'System reserved'),
    (gen_random_uuid(), 'payment', 'System reserved'),
    (gen_random_uuid(), 'payments', 'System reserved'),
    (gen_random_uuid(), 'wallet', 'System reserved'),
    (gen_random_uuid(), 'bank', 'System reserved'),
    (gen_random_uuid(), 'transaction', 'System reserved'),
    (gen_random_uuid(), 'transactions', 'System reserved'),
    (gen_random_uuid(), 'api', 'System reserved'),
    (gen_random_uuid(), 'bot', 'System reserved'),
    (gen_random_uuid(), 'root', 'System reserved'),
    (gen_random_uuid(), 'superadmin', 'System reserved')
ON CONFLICT (tag) DO NOTHING;

-- Verification queries
-- Check that columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('tag', 'tagSetAt', 'tagChangedCount');

-- Check that p2p_transfers table was created
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'p2p_transfers'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('users', 'p2p_transfers') 
AND indexname LIKE '%tag%' OR indexname LIKE '%p2p%'
ORDER BY tablename, indexname;
