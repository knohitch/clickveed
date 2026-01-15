-- ============================================
-- EMERGENCY FIX SQL SCRIPTS
-- Run these on your production database
-- ============================================

-- ============================================
-- SCRIPT 1: Clear Old Verification Tokens
-- ============================================
-- Purpose: Remove expired and old verification tokens that may have wrong URLs
-- Safe to run: YES - only affects verification tokens

-- Check how many tokens will be deleted
SELECT 
    COUNT(*) as total_tokens,
    COUNT(CASE WHEN expires < NOW() THEN 1 END) as expired_tokens,
    COUNT(CASE WHEN expires >= NOW() THEN 1 END) as active_tokens
FROM "VerificationToken";

-- Delete expired verification tokens
DELETE FROM "VerificationToken" 
WHERE expires < NOW();

-- OPTIONAL: Delete ALL verification tokens to force clean state
-- Uncomment below if you want to force all users to get new verification emails
-- DELETE FROM "VerificationToken";


-- ============================================
-- SCRIPT 2: Check Users Without Plans
-- ============================================
-- Purpose: Find users who don't have a planId assigned

SELECT 
    id, 
    email, 
    "displayName",
    "planId", 
    "emailVerified", 
    status,
    "createdAt"
FROM "User" 
WHERE "planId" IS NULL
ORDER BY "createdAt" DESC;


-- ============================================
-- SCRIPT 3: Auto-Assign Free Plan to Users
-- ============================================
-- Purpose: Assign the Free plan to any users without a plan

-- First, verify the Free plan exists
SELECT id, name, "featureTier" 
FROM "Plan" 
WHERE id = 'plan_free' OR name = 'Free' OR "featureTier" = 'free';

-- Then assign it to users without plans
UPDATE "User" 
SET "planId" = 'plan_free' 
WHERE "planId" IS NULL;

-- Verify the update
SELECT 
    COUNT(*) as users_with_free_plan
FROM "User" 
WHERE "planId" = 'plan_free';


-- ============================================
-- SCRIPT 4: Diagnostic Query - User Status
-- ============================================
-- Purpose: Get overview of all users and their plans

SELECT 
    u.id,
    u.email,
    u."displayName",
    u."emailVerified",
    u.status,
    u."planId",
    p.name as plan_name,
    p."featureTier",
    u."createdAt"
FROM "User" u
LEFT JOIN "Plan" p ON u."planId" = p.id
ORDER BY u."createdAt" DESC
LIMIT 50;


-- ============================================
-- SCRIPT 5: Check Plan Distribution
-- ============================================
-- Purpose: See how many users are on each plan

SELECT 
    p.name as plan_name,
    p."featureTier",
    COUNT(u.id) as user_count
FROM "Plan" p
LEFT JOIN "User" u ON p.id = u."planId"
GROUP BY p.id, p.name, p."featureTier"
ORDER BY user_count DESC;


-- ============================================
-- SCRIPT 6: Find Users With Verification Issues
-- ============================================
-- Purpose: Identify users who may be stuck in verification

-- Users with Pending status but emailVerified = true (contradiction)
SELECT 
    id, 
    email, 
    "displayName",
    "emailVerified",
    status,
    "createdAt"
FROM "User"
WHERE status = 'Pending' AND "emailVerified" = true;

-- Users who are Active but not verified (also a contradiction)
SELECT 
    id, 
    email, 
    "displayName",
    "emailVerified",
    status,
    role,
    "createdAt"
FROM "User"
WHERE status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN';


-- ============================================
-- SCRIPT 7: Fix Verification Status Mismatches
-- ============================================
-- Purpose: Align emailVerified with status field

-- Set Pending users who are verified to Active
UPDATE "User"
SET status = 'Active'
WHERE status = 'Pending' AND "emailVerified" = true;

-- Set Active users who aren't verified to Pending (except SUPER_ADMIN)
UPDATE "User"
SET status = 'Pending'
WHERE status = 'Active' 
  AND "emailVerified" = false 
  AND role != 'SUPER_ADMIN';


-- ============================================
-- SCRIPT 8: Verify Plans Are Seeded Correctly
-- ============================================
-- Purpose: Check that all expected plans exist

SELECT 
    id,
    name,
    "featureTier",
    "priceMonthly",
    "videoExports",
    "aiCredits",
    "storageGB",
    (SELECT COUNT(*) FROM "PlanFeature" WHERE "planId" = "Plan".id) as feature_count
FROM "Plan"
ORDER BY "priceMonthly";


-- ============================================
-- SCRIPT 9: Count Active Verification Tokens
-- ============================================
-- Purpose: See how many active verification tokens exist

SELECT 
    COUNT(*) as active_tokens,
    MIN(expires) as earliest_expiry,
    MAX(expires) as latest_expiry
FROM "VerificationToken"
WHERE expires > NOW();


-- ============================================
-- NOTES FOR RUNNING THESE SCRIPTS
-- ============================================

-- HOW TO RUN:
-- 1. Connect to your PostgreSQL database
-- 2. Run queries one at a time (not all at once)
-- 3. Review SELECT query results before running UPDATE/DELETE queries
-- 4. Always backup your database before running UPDATE/DELETE queries

-- CONNECTION EXAMPLE (from your server):
-- psql -h localhost -U your_db_user -d your_db_name

-- For CapRover deployment:
-- 1. SSH into your server
-- 2. Connect to the database container or use captain's database UI
-- 3. Run these scripts via psql or database management tool

-- RECOMMENDED ORDER:
-- 1. Run SCRIPT 4 (Diagnostic) - see current state
-- 2. Run SCRIPT 1 (Clear tokens) - cleanup
-- 3. Run SCRIPT 2 (Check users) - identify issues
-- 4. Run SCRIPT 3 (Assign plans) - fix users without plans
-- 5. Run SCRIPT 6 (Verification issues) - check for contradictions
-- 6. Run SCRIPT 7 (Fix mismatches) - resolve contradictions
-- 7. Run SCRIPT 4 again - verify fixes worked
