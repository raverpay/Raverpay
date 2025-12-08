-- Update default values for SMS preferences to false (disabled by default)
-- SMS notifications will incur charges, so they should be opt-in

-- Update all existing users' SMS preferences to false (disabled)
UPDATE notification_preferences
SET
  "smsEnabled" = false,
  "transactionSms" = false,
  "securitySms" = false,
  "kycSms" = false,
  "promotionalSms" = false
WHERE
  "smsEnabled" = true OR
  "transactionSms" = true OR
  "securitySms" = true OR
  "kycSms" = true OR
  "promotionalSms" = true;

-- Verify the update
SELECT
  COUNT(*) as total_users,
  SUM(CASE WHEN "smsEnabled" = false THEN 1 ELSE 0 END) as sms_disabled,
  SUM(CASE WHEN "transactionSms" = false THEN 1 ELSE 0 END) as transaction_sms_disabled,
  SUM(CASE WHEN "securitySms" = false THEN 1 ELSE 0 END) as security_sms_disabled,
  SUM(CASE WHEN "kycSms" = false THEN 1 ELSE 0 END) as kyc_sms_disabled
FROM notification_preferences;
