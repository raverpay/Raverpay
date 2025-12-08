-- Manual Migration: Add Composite Indexes for Admin Dashboard Performance
-- Created: 2025-11-22
-- Purpose: Improve query performance for admin dashboard pages

-- Transaction table composite indexes
CREATE INDEX IF NOT EXISTS transactions_status_createdAt_idx ON transactions(status, "createdAt");
CREATE INDEX IF NOT EXISTS transactions_type_createdAt_idx ON transactions(type, "createdAt");
CREATE INDEX IF NOT EXISTS transactions_userId_createdAt_idx ON transactions("userId", "createdAt");

-- VTU Orders table indexes
CREATE INDEX IF NOT EXISTS vtu_orders_createdAt_idx ON vtu_orders("createdAt");
CREATE INDEX IF NOT EXISTS vtu_orders_status_createdAt_idx ON vtu_orders(status, "createdAt");
CREATE INDEX IF NOT EXISTS vtu_orders_userId_createdAt_idx ON vtu_orders("userId", "createdAt");

-- Gift Card Orders table indexes
CREATE INDEX IF NOT EXISTS giftcard_orders_createdAt_idx ON giftcard_orders("createdAt");
CREATE INDEX IF NOT EXISTS giftcard_orders_status_createdAt_idx ON giftcard_orders(status, "createdAt");
CREATE INDEX IF NOT EXISTS giftcard_orders_userId_createdAt_idx ON giftcard_orders("userId", "createdAt");

-- Crypto Orders table indexes
CREATE INDEX IF NOT EXISTS crypto_orders_createdAt_idx ON crypto_orders("createdAt");
CREATE INDEX IF NOT EXISTS crypto_orders_status_createdAt_idx ON crypto_orders(status, "createdAt");
CREATE INDEX IF NOT EXISTS crypto_orders_userId_createdAt_idx ON crypto_orders("userId", "createdAt");

-- Audit Logs table composite indexes
CREATE INDEX IF NOT EXISTS audit_logs_action_createdAt_idx ON audit_logs(action, "createdAt");
CREATE INDEX IF NOT EXISTS audit_logs_resource_resourceId_idx ON audit_logs(resource, "resourceId");
CREATE INDEX IF NOT EXISTS audit_logs_userId_createdAt_idx ON audit_logs("userId", "createdAt");

-- Notifications table composite indexes
CREATE INDEX IF NOT EXISTS notifications_userId_isRead_createdAt_idx ON notifications("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS notifications_userId_createdAt_idx ON notifications("userId", "createdAt");

-- Verify indexes were created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%createdAt%'
ORDER BY tablename, indexname;
