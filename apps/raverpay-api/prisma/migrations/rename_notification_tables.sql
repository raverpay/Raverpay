-- Rename notification tables to follow lowercase_underscore convention

-- Rename NotificationPreference to notification_preferences
ALTER TABLE "NotificationPreference" RENAME TO notification_preferences;

-- Rename NotificationLog to notification_logs
ALTER TABLE "NotificationLog" RENAME TO notification_logs;

-- Rename NotificationTemplate to notification_templates
ALTER TABLE "NotificationTemplate" RENAME TO notification_templates;

-- Rename NotificationQueue to notification_queue
ALTER TABLE "NotificationQueue" RENAME TO notification_queue;

-- Verify the renames
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'notification%'
ORDER BY tablename;
