-- =====================================================
-- CLICKVEED PRODUCTION DIAGNOSTIC QUERIES
-- Run these on your PostgreSQL database to identify issues
-- =====================================================

-- =====================================================
-- 1. CHECK EMAIL SETTINGS
-- =====================================================
SELECT '=== EMAIL SETTINGS ===' AS section;

SELECT 
    id,
    "smtpHost",
    "smtpPort",
    "smtpSecure",
    CASE WHEN "smtpUser" != '' THEN 'SET' ELSE 'EMPTY' END AS "smtpUser_status",
    CASE WHEN "smtpPass" != '' THEN 'SET' ELSE 'EMPTY' END AS "smtpPass_status",
    "fromAdminEmail",
    "fromSupportEmail",
    "fromName"
FROM "EmailSettings"
WHERE id = 1;

-- =====================================================
-- 2. CHECK STORAGE/API KEYS  
-- =====================================================
SELECT '=== API KEYS (Storage) ===' AS section;

SELECT 
    name,
    CASE 
        WHEN name LIKE '%Secret%' OR name LIKE '%Key%' OR name LIKE '%Pass%' 
        THEN CASE WHEN value != '' THEN 'SET' ELSE 'EMPTY' END
        ELSE value 
    END AS value_status
FROM "ApiKey"
WHERE name LIKE 'wasabi%' OR name LIKE 'bunny%';

-- =====================================================
-- 3. CHECK STORAGE SETTINGS IN SETTINGS TABLE
-- =====================================================
SELECT '=== SETTINGS TABLE (Storage) ===' AS section;

SELECT key, value FROM "Setting" WHERE key = 'storageSettings';

-- =====================================================
-- 4. CHECK PLANS EXIST
-- =====================================================
SELECT '=== PLANS ===' AS section;

SELECT id, name, "featureTier", "priceMonthly" FROM "Plan";

-- =====================================================
-- 5. CHECK USERS WITHOUT PLAN
-- =====================================================
SELECT '=== USERS WITHOUT PLAN ===' AS section;

SELECT COUNT(*) as users_without_plan FROM "User" WHERE "planId" IS NULL;

-- List first 5 affected users
SELECT id, email, status, "emailVerified", role 
FROM "User" 
WHERE "planId" IS NULL 
LIMIT 5;

-- =====================================================
-- 6. CHECK VERIFICATION TOKENS
-- =====================================================
SELECT '=== VERIFICATION TOKENS ===' AS section;

-- Count expired tokens
SELECT COUNT(*) as expired_tokens FROM "VerificationToken" WHERE expires < NOW();

-- Count valid tokens
SELECT COUNT(*) as valid_tokens FROM "VerificationToken" WHERE expires >= NOW();

-- =====================================================
-- 7. CHECK EMAIL TEMPLATES
-- =====================================================
SELECT '=== EMAIL TEMPLATES ===' AS section;

SELECT key, 
       LEFT(subject, 50) as subject_preview,
       CASE WHEN LENGTH(body) > 0 THEN 'HAS_CONTENT' ELSE 'EMPTY' END as body_status
FROM "EmailTemplate";

-- =====================================================
-- 8. USER STATUS SUMMARY
-- =====================================================
SELECT '=== USER STATUS SUMMARY ===' AS section;

SELECT 
    status,
    "emailVerified",
    COUNT(*) as count
FROM "User"
GROUP BY status, "emailVerified"
ORDER BY count DESC;
