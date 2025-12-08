-- Add SUPER_ADMIN to UserRole enum
-- This migration adds SUPER_ADMIN role to the existing UserRole enum

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
