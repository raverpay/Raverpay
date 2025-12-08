-- Add performance indexes for transactions
-- These indexes will significantly speed up common queries

-- Transaction queries by user and created date (most common query)
CREATE INDEX IF NOT EXISTS "idx_transactions_user_created" ON "transactions"("userId", "createdAt" DESC);

-- Transaction queries by user and type (for filtering)
CREATE INDEX IF NOT EXISTS "idx_transactions_user_type" ON "transactions"("userId", "type");

-- Transaction queries by user and status (for filtering)
CREATE INDEX IF NOT EXISTS "idx_transactions_user_status" ON "transactions"("userId", "status");

-- Transaction lookup by reference (for payment verification)
CREATE INDEX IF NOT EXISTS "idx_transactions_reference" ON "transactions"("reference");

-- VTU orders queries by user and created date
CREATE INDEX IF NOT EXISTS "idx_vtu_orders_user_created" ON "vtu_orders"("userId", "createdAt" DESC);

-- VTU orders queries by status (for admin/monitoring)
CREATE INDEX IF NOT EXISTS "idx_vtu_orders_status" ON "vtu_orders"("status");

-- User lookup by email (for login)
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");

-- User lookup by phone (for registration/login)
CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users"("phone");

-- User queries by status (for admin filtering)
CREATE INDEX IF NOT EXISTS "idx_users_status" ON "users"("status");

-- Audit log queries by user
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "audit_logs"("userId", "createdAt" DESC);
