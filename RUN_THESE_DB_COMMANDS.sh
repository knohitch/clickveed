#!/bin/bash
# =====================================================
# DATABASE CLEANUP - RUN THESE ON YOUR CAPROVER SERVER
# =====================================================

# OPTION 1: Connect to PostgreSQL container directly
# =====================================================
docker exec -it srv-captain--postgres.1.y9wzxrhpjcy7iia4ynt8q517s psql -U postgres -d postgres

# Then paste these SQL commands:
# =====================================================

-- Step 1: Check current state
SELECT COUNT(*) as expired_tokens FROM "VerificationToken" WHERE expires < NOW();
SELECT COUNT(*) as users_without_plan FROM "User" WHERE "planId" IS NULL;
SELECT COUNT(*) as status_mismatches FROM "User" WHERE (status = 'Pending' AND "emailVerified" = true) OR (status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN');

-- Step 2: Clean expired tokens
DELETE FROM "VerificationToken" WHERE expires < NOW();

-- Step 3: Assign Free plan to users
UPDATE "User" SET "planId" = 'plan_free' WHERE "planId" IS NULL;

-- Step 4: Fix status mismatches
UPDATE "User" SET status = 'Active' WHERE status = 'Pending' AND "emailVerified" = true;
UPDATE "User" SET status = 'Pending' WHERE status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN';

-- Step 5: Verify cleanup
SELECT COUNT(*) as total_users FROM "User";
SELECT COUNT(*) as users_with_plan FROM "User" WHERE "planId" IS NOT NULL;
SELECT COUNT(*) as active_users FROM "User" WHERE status = 'Active';
SELECT COUNT(*) as remaining_tokens FROM "VerificationToken";

-- Exit psql
\q


# =====================================================
# OPTION 2: One-liner for each command (easier)
# =====================================================

# Delete expired tokens
docker exec -it srv-captain--postgres.1.y9wzxrhpjcy7iia4ynt8q517s psql -U postgres -d postgres -c "DELETE FROM \"VerificationToken\" WHERE expires < NOW();"

# Assign Free plan
docker exec -it srv-captain--postgres.1.y9wzxrhpjcy7iia4ynt8q517s psql -U postgres -d postgres -c "UPDATE \"User\" SET \"planId\" = 'plan_free' WHERE \"planId\" IS NULL;"

# Fix verified users status
docker exec -it srv-captain--postgres.1.y9wzxrhpjcy7iia4ynt8q517s psql -U postgres -d postgres -c "UPDATE \"User\" SET status = 'Active' WHERE status = 'Pending' AND \"emailVerified\" = true;"

# Fix unverified users status
docker exec -it srv-captain--postgres.1.y9wzxrhpjcy7iia4ynt8q517s psql -U postgres -d postgres -c "UPDATE \"User\" SET status = 'Pending' WHERE status = 'Active' AND \"emailVerified\" = false AND role != 'SUPER_ADMIN';"

# Verify cleanup
docker exec -it srv-captain--postgres.1.y9wzxrhpjcy7iia4ynt8q517s psql -U postgres -d postgres -c "SELECT COUNT(*) as users_without_plan FROM \"User\" WHERE \"planId\" IS NULL;"


# =====================================================
# EASIER: All-in-one cleanup script
# =====================================================

docker exec srv-captain--postgres.1.y9wzxrhpjcy7iia4ynt8q517s psql -U postgres -d postgres << 'EOF'
-- Clean database
DELETE FROM "VerificationToken" WHERE expires < NOW();
UPDATE "User" SET "planId" = 'plan_free' WHERE "planId" IS NULL;
UPDATE "User" SET status = 'Active' WHERE status = 'Pending' AND "emailVerified" = true;
UPDATE "User" SET status = 'Pending' WHERE status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN';

-- Show results
SELECT 'Cleanup Complete!' as status;
SELECT COUNT(*) as total_users FROM "User";
SELECT COUNT(*) as users_with_plan FROM "User" WHERE "planId" IS NOT NULL;
SELECT COUNT(*) as users_without_plan FROM "User" WHERE "planId" IS NULL;
EOF
