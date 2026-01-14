-- ============================================
-- Debug IP Whitelist for Admin User
-- ============================================

-- Step 1: Find the user by email
SELECT 
  id,
  email,
  "firstName",
  "lastName",
  role,
  "createdAt"
FROM "User"
WHERE email = 'joestacks@raverpay.com';

-- Step 2: Check ALL IP whitelist entries for this user
-- Replace 'USER_ID_FROM_STEP_1' with the actual user ID
SELECT 
  id,
  "ipAddress",
  description,
  "userId",
  "isActive",
  "createdBy",
  "createdAt",
  "lastUsedAt",
  "usageCount",
  CASE 
    WHEN "userId" IS NULL THEN 'GLOBAL'
    WHEN "userId" = 'USER_ID_FROM_STEP_1' THEN 'USER_SPECIFIC'
    ELSE 'OTHER_USER'
  END as entry_type
FROM admin_ip_whitelist
WHERE "isActive" = true
  AND ("userId" = 'USER_ID_FROM_STEP_1' OR "userId" IS NULL)
ORDER BY "createdAt" DESC;

-- Step 3: Check if the exact IP exists (the one trying to login: 102.89.68.239)
SELECT 
  id,
  "ipAddress",
  description,
  "userId",
  "isActive",
  "createdAt"
FROM admin_ip_whitelist
WHERE "ipAddress" = '102.89.68.239'
  AND "isActive" = true;

-- Step 4: Check if the IP you whitelisted exists (102.89.69.201)
SELECT 
  id,
  "ipAddress",
  description,
  "userId",
  "isActive",
  "createdAt"
FROM admin_ip_whitelist
WHERE "ipAddress" = '102.89.69.201'
  AND "isActive" = true;

-- Step 5: Check ALL active IP whitelist entries (to see what's actually whitelisted)
SELECT 
  id,
  "ipAddress",
  description,
  "userId",
  "isActive",
  "createdAt",
  "lastUsedAt"
FROM admin_ip_whitelist
WHERE "isActive" = true
ORDER BY "createdAt" DESC;

-- Step 6: Check for CIDR ranges that might include the IP
-- Note: This requires manual checking as PostgreSQL doesn't have built-in CIDR matching
-- The IP 102.89.68.239 would need to be checked against ranges like:
-- - 102.89.68.0/24 (would include 102.89.68.239)
-- - 102.89.0.0/16 (would include 102.89.68.239)
SELECT 
  id,
  "ipAddress",
  description,
  "userId",
  "isActive"
FROM admin_ip_whitelist
WHERE "ipAddress" LIKE '%/%'
  AND "isActive" = true;

-- ============================================
-- ISSUE IDENTIFIED:
-- ============================================
-- You whitelisted: 102.89.69.201
-- But trying to login from: 102.89.68.239
-- These are DIFFERENT IPs!
--
-- Solutions:
-- 1. Whitelist the actual IP: 102.89.68.239
-- 2. Whitelist a CIDR range: 102.89.68.0/24 (covers 102.89.68.x)
-- 3. Whitelist a larger range: 102.89.0.0/16 (covers 102.89.x.x)
-- ============================================

