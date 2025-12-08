-- Update existing users' notification preferences to enable promotional emails/push by default
-- This aligns existing users with the new schema defaults (opt-out model for marketing)
-- Run this migration manually if you want to update existing users

-- Enable promotional emails for users who haven't explicitly opted out
UPDATE notification_preferences
SET "promotionalEmails" = true
WHERE "promotionalEmails" = false;

-- Enable promotional push for users who haven't explicitly opted out
UPDATE notification_preferences
SET "promotionalPush" = true
WHERE "promotionalPush" = false;

-- Note: We don't enable promotional SMS as it costs money (opt-in only)
