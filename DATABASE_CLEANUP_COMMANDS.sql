-- =====================================================
-- DATABASE CLEANUP COMMANDS - RUN THESE IN ORDER
-- Copy and paste into your PostgreSQL client
-- =====================================================

-- STEP 1: Check Current State (Safe - just viewing data)
-- =====================================================

SELECT 
    COUNT(*) as total_tokens,
    COUNT(CASE WHEN expires < NOW() THEN 1 END) as expired_tokens,
    COUNT(CASE WHEN expires >= NOW() THEN 1 END) as active_tokens
FROM "VerificationToken";

SELECT 
    COUNT(*) as users_without_plan
FROM "User" 
WHERE "planId" IS NULL;

SELECT COUNT(*) as status_mismatches
FROM "User"
WHERE (status = 'Pending' AND "emailVerified" = true)
   OR (status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN');


-- STEP 2: Clear Expired Verification Tokens
-- =====================================================

DELETE FROM "VerificationToken" 
WHERE expires < NOW();

-- Verify deletion
SELECT COUNT(*) as remaining_tokens FROM "VerificationToken";


-- STEP 3: Assign Free Plan to Users Without Plans
-- =====================================================

-- First verify Free plan exists
SELECT id, name, "featureTier" 
FROM "Plan" 
WHERE id = 'plan_free';

-- Assign Free plan to users without one
UPDATE "User" 
SET "planId" = 'plan_free' 
WHERE "planId" IS NULL;

-- Verify all users now have plans
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN "planId" IS NOT NULL THEN 1 END) as users_with_plan,
    COUNT(CASE WHEN "planId" IS NULL THEN 1 END) as users_without_plan
FROM "User";


-- STEP 4: Fix Status Mismatches
-- =====================================================

-- Set verified users to Active
UPDATE "User"
SET status = 'Active'
WHERE status = 'Pending' AND "emailVerified" = true;

-- Set unverified users to Pending (except super admins)
UPDATE "User"
SET status = 'Pending'
WHERE status = 'Active' 
  AND "emailVerified" = false 
  AND role != 'SUPER_ADMIN';

-- Verify no mismatches remain
SELECT COUNT(*) as remaining_mismatches
FROM "User"
WHERE (status = 'Pending' AND "emailVerified" = true)
   OR (status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN');


-- STEP 5: Final Verification
-- =====================================================

-- Check overall system health
SELECT 
  'Total Users' as metric, COUNT(*)::text as value FROM "User"
UNION ALL
SELECT 
  'Users with Plan', COUNT(*)::text FROM "User" WHERE "planId" IS NOT NULL
UNION ALL
SELECT 
  'Active Users', COUNT(*)::text FROM "User" WHERE status = 'Active'
UNION ALL
SELECT 
  'Pending Users', COUNT(*)::text FROM "User" WHERE status = 'Pending'
UNION ALL
SELECT 
  'Verification Tokens', COUNT(*)::text FROM "VerificationToken"
UNION ALL
SELECT 
  'Total Plans', COUNT(*)::text FROM "Plan";


-- =====================================================
-- EXPECTED RESULTS AFTER CLEANUP:
-- =====================================================
-- ✅ All users have planId = 'plan_free' (or their existing plan)
-- ✅ No expired verification tokens
-- ✅ All verified users have status = 'Active'
-- ✅ All unverified users have status = 'Pending'
-- ✅ 4 plans in database (Free, Creator, Pro, Agency)
-- =====================================================
