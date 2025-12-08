-- Add missing updatedAt column to notifications table
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name = 'updatedAt';
