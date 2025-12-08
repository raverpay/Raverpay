-- Add rate limit violation tracking tables

CREATE TABLE "rate_limit_violations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "ip" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "userAgent" TEXT,
    "country" TEXT,
    "city" TEXT,
    "limit" INTEGER NOT NULL,
    "hitCount" INTEGER NOT NULL,
    "violatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rate_limit_violations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "rate_limit_violations_userId_idx" ON "rate_limit_violations"("userId");
CREATE INDEX "rate_limit_violations_ip_idx" ON "rate_limit_violations"("ip");
CREATE INDEX "rate_limit_violations_endpoint_idx" ON "rate_limit_violations"("endpoint");
CREATE INDEX "rate_limit_violations_violatedAt_idx" ON "rate_limit_violations"("violatedAt");

-- Add rate limit metrics for dashboard
CREATE TABLE "rate_limit_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TIMESTAMP(3) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "totalHits" INTEGER NOT NULL DEFAULT 0,
    "violations" INTEGER NOT NULL DEFAULT 0,
    "uniqueIPs" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "rate_limit_metrics_date_endpoint_key" ON "rate_limit_metrics"("date", "endpoint");
CREATE INDEX "rate_limit_metrics_date_idx" ON "rate_limit_metrics"("date");
CREATE INDEX "rate_limit_metrics_endpoint_idx" ON "rate_limit_metrics"("endpoint");
