-- Add user-controlled wallet support
-- Migration: add_user_controlled_wallets

-- Step 1: Add custody type tracking to circle_wallets
ALTER TABLE circle_wallets 
ADD COLUMN IF NOT EXISTS custody_type TEXT DEFAULT 'DEVELOPER',
ADD COLUMN IF NOT EXISTS circle_user_id TEXT,
ADD COLUMN IF NOT EXISTS wallet_set_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_circle_wallets_custody_type ON circle_wallets(custody_type);
CREATE INDEX IF NOT EXISTS idx_circle_wallets_circle_user_id ON circle_wallets(circle_user_id);

-- Step 2: Create circle_users table for user-controlled wallet users
CREATE TABLE IF NOT EXISTS circle_users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  circle_user_id TEXT NOT NULL UNIQUE,
  auth_method TEXT NOT NULL, -- 'EMAIL' | 'PIN' | 'SOCIAL'
  email TEXT,
  status TEXT NOT NULL DEFAULT 'ENABLED', -- 'ENABLED' | 'DISABLED'
  pin_status TEXT, -- 'ENABLED' | 'DISABLED' | NULL
  security_question_status TEXT, -- 'ENABLED' | 'DISABLED' | NULL
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT circle_users_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for circle_users
CREATE INDEX IF NOT EXISTS idx_circle_users_user_id ON circle_users(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_users_circle_user_id ON circle_users(circle_user_id);
CREATE INDEX IF NOT EXISTS idx_circle_users_email ON circle_users(email);

-- Add comments for documentation
COMMENT ON TABLE circle_users IS 'Stores Circle user-controlled wallet user information';
COMMENT ON COLUMN circle_wallets.custody_type IS 'DEVELOPER = custodial, USER = non-custodial';
COMMENT ON COLUMN circle_wallets.circle_user_id IS 'Circle user ID for user-controlled wallets (null for developer-controlled)';
