-- Add App Rating Configuration Table
-- This table stores the configuration for in-app rating prompts

CREATE TABLE IF NOT EXISTS "app_rating_config" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "promptFrequencyDays" INTEGER NOT NULL DEFAULT 30,
    "minTransactionsRequired" INTEGER NOT NULL DEFAULT 3,
    "minUsageDaysRequired" INTEGER NOT NULL DEFAULT 7,
    "promptTitle" TEXT NOT NULL DEFAULT 'Enjoying RaverPay?',
    "promptMessage" TEXT NOT NULL DEFAULT 'Rate us on the app store! Your feedback helps us improve.',
    "iosAppStoreUrl" TEXT NOT NULL,
    "androidPlayStoreUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO "app_rating_config" (
    "id",
    "enabled",
    "promptFrequencyDays",
    "minTransactionsRequired",
    "minUsageDaysRequired",
    "promptTitle",
    "promptMessage",
    "iosAppStoreUrl",
    "androidPlayStoreUrl"
) VALUES (
    gen_random_uuid()::text,
    true,
    30,
    3,
    7,
    'Enjoying RaverPay?',
    'Rate us on the app store! Your feedback helps us improve.',
    'https://apps.apple.com/ng/app/expertpay-bill-payments/id6755424543',
    'https://apps.apple.com/ng/app/expertpay-bill-payments/id6755424543'
);

-- Verify the table was created
SELECT * FROM "app_rating_config";
