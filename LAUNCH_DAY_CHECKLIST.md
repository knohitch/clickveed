# 🚀 LAUNCH DAY CHECKLIST

**Date:** January 15, 2026  
**Target:** Production Launch TODAY  
**Status:** Ready with database cleanup needed

---

## ✅ CODE FIXES - ALREADY COMPLETE

### 1. Feature Configuration ✅ FIXED
**File:** `src/lib/feature-config.ts`
- ✅ Removed contradictions between free/paid features
- ✅ Free tier properly limited to 5 features
- ✅ Starter/Pro/Enterprise tiers properly defined

**Action:** Already deployed (code is ready)

---

### 2. ElevenLabs Timeout ✅ ALREADY FIXED
**File:** `src/lib/elevenlabs-client.ts`
- ✅ Line 224: Timeout added to generateSpeech()
- ✅ Retry logic implemented
- ✅ Error handling improved

**Action:** None needed (already in code)

---

### 3. Email Verification ✅ CODE CORRECT
**File:** `src/app/api/auth/verify-email/route.ts`
- ✅ Uses production URL (AUTH_URL/NEXT_PUBLIC_SITE_URL)
- ✅ Token expiry set to 24 hours
- ✅ Proper redirect handling

**Action:** None needed (code is correct)

---

### 4. Plan Assignment ✅ AUTO-FIX EXISTS
**File:** `src/server/actions/user-actions.ts`
- ✅ getUserById() auto-assigns Free plan if missing
- ✅ Signup assigns plan on user creation

**Action:** None needed (auto-fix in place)

---

## 🟡 DATABASE CLEANUP - REQUIRED BEFORE LAUNCH

### Task 1: Clear Expired Tokens (2 minutes)

```bash
# SSH into production server
ssh your-production-server

# Connect to PostgreSQL
docker exec -it $(docker ps | grep postgres | awk '{print $1}') psql -U your_user -d your_db

# Or use CapRover database tool
```

```sql
-- Check current state
SELECT 
    COUNT(*) as total_tokens,
    COUNT(CASE WHEN expires < NOW() THEN 1 END) as expired,
    COUNT(CASE WHEN expires >= NOW() THEN 1 END) as active
FROM "VerificationToken";

-- Delete expired tokens
DELETE FROM "VerificationToken" WHERE expires < NOW();

-- Verify
SELECT COUNT(*) as remaining_tokens FROM "VerificationToken";
```

**Expected Result:** Only active tokens remain (or 0 if all were expired)

---

### Task 2: Assign Missing Plans (3 minutes)

```sql
-- Check for users without plans
SELECT 
    COUNT(*) as users_without_plan,
    STRING_AGG(email, ', ') as affected_users
FROM "User" 
WHERE "planId" IS NULL;

-- If count > 0, assign Free plan
UPDATE "User" 
SET "planId" = 'plan_free' 
WHERE "planId" IS NULL;

-- Verify all users have plans
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN "planId" IS NOT NULL THEN 1 END) as users_with_plan,
    COUNT(CASE WHEN "planId" IS NULL THEN 1 END) as users_without_plan
FROM "User";
```

**Expected Result:** users_without_plan = 0

---

### Task 3: Fix Status Mismatches (3 minutes)

```sql
-- Check for mismatches
SELECT COUNT(*) as mismatches
FROM "User"
WHERE (status = 'Pending' AND "emailVerified" = true)
   OR (status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN');

-- Fix Pending users who are verified
UPDATE "User"
SET status = 'Active'
WHERE status = 'Pending' AND "emailVerified" = true;

-- Fix Active users who aren't verified (except SUPER_ADMIN)
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
```

**Expected Result:** remaining_mismatches = 0

---

### Task 4: Verify Plans Exist (2 minutes)

```sql
-- Check plans are seeded
SELECT id, name, "featureTier", "priceMonthly",
       "stripeProductId", "stripePriceIdMonthly"
FROM "Plan"
ORDER BY "priceMonthly";

-- Should show:
-- plan_free (Free, featureTier='free', price=0)
-- plan_creator (Creator, featureTier='starter', price=49)
-- plan_pro (Pro, featureTier='professional', price=99)
-- plan_agency (Agency, featureTier='enterprise', price=249)
```

**If plans are missing Stripe IDs:**
```bash
npm run db:seed
```

**Expected Result:** All 4 plans exist with Stripe IDs

---

## 🔍 PRE-LAUNCH TESTING (30 minutes)

### Test 1: Free User Signup & Login (10 min)

```bash
# 1. Open incognito browser
# 2. Go to: https://app.vyydecourt.site/signup
# 3. Sign up: test-launch-{timestamp}@gmail.com
# 4. Check email verification arrives
# 5. Click verification link
# 6. Verify redirects to: https://app.vyydecourt.site/login?verified=true
# 7. Log in
# 8. Check dashboard shows 5 menu items:
#    - Dashboard
#    - Projects
#    - AI Assistant (with Creative Assistant submenu)
#    - Social Suite (with Integrations submenu)
#    - Media Management (with Library submenu)
#    - Settings
```

**✅ Pass Criteria:**
- Email arrives within 1 minute
- Verification link has correct URL (not 0.0.0.0)
- Login succeeds
- Dashboard shows exactly 5 main sections
- No errors in console

**❌ Fail Actions:**
- Email doesn't arrive → Check SMTP settings in database
- Wrong URL in email → Re-run database cleanup (Task 1)
- Login fails → Check user status in database
- Wrong menu → Verify feature-config.ts deployed

---

### Test 2: Free User Feature Access (10 min)

```bash
# As logged-in free user:
# 1. Click "AI Assistant" → Should load /dashboard/ai-assistant
# 2. Click "Creative Assistant" → Should load chat page
# 3. Click "Social Suite" → Should load
# 4. Click "Integrations" → Should load
# 5. Click "Media Library" → Should load
# 6. Click "Settings" → Should load
```

**✅ Pass Criteria:**
- All 5 free features load without errors
- No "feature locked" messages for free features
- No redirect to upgrade page

**❌ Fail Actions:**
- Feature locked → Check user's planId in database
- Feature doesn't load → Check route exists
- Console errors → Check browser console and logs

---

### Test 3: Billing Page (10 min)

```bash
# As logged-in free user:
# 1. Go to /dashboard/settings/billing
# 2. Verify page loads
# 3. Verify 4 plans shown (Free, Creator, Pro, Agency)
# 4. Verify pricing displays correctly
# 5. Click "Choose Plan" on Creator
# 6. Check if payment dialog appears OR redirects to Stripe
```

**✅ Pass Criteria:**
- Billing page loads
- All plans display
- "Choose Plan" button works
- Either payment provider dialog OR Stripe redirect

**❌ Fail Actions:**
- Page doesn't load → Check console for errors
- Plans missing → Run `npm run db:seed`
- Stripe error → Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- Click does nothing → Check browser console

**Note:** Full payment testing requires Stripe test mode

---

## 🔧 ENVIRONMENT VARIABLES CHECK

### Required For Launch:

```bash
# In CapRover, verify these are set:

# Core
✅ DATABASE_URL=postgresql://...
✅ AUTH_SECRET=... (or NEXTAUTH_SECRET)
✅ AUTH_URL=https://app.vyydecourt.site
✅ NEXT_PUBLIC_SITE_URL=https://app.vyydecourt.site

# Stripe (for billing)
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
✅ STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
✅ STRIPE_WEBHOOK_SECRET=whsec_...

# Email (for verification)
Check in database EmailSettings table - not env vars
```

**How to check in CapRover:**
1. Go to Apps → Your App
2. Click "App Configs"
3. Scroll to "Environment Variables"
4. Verify all above are set

---

## 🚀 DEPLOYMENT VERIFICATION

### Step 1: Verify Code Deployed

```bash
# Check CapRover deployment logs
# Should see: "✓ Ready in X ms"

# Or check via browser
curl https://app.vyydecourt.site
# Should return HTML (not error)
```

---

### Step 2: Check Application Logs

```bash
# In CapRover, view logs
# Look for:
✅ No "Error" or "failed" messages
✅ "[AuthContext] Set subscription plan: Free"
✅ "[DashboardNav] Feature tier: free"

# Red flags:
❌ "Plan not found"
❌ "API key not configured"
❌ "ECONNREFUSED"
❌ "Timeout"
```

---

### Step 3: Monitor First Hour

```bash
# Watch logs for:
- New signups
- Email verifications
- Login attempts
- Feature access patterns
- Any errors

# In CapRover:
Apps → Your App → See Logs (enable Auto Scroll)
```

---

## 📊 LAUNCH SUCCESS CRITERIA

### ✅ Must Be True Before Launch:

- [x] Feature config deployed (code committed)
- [ ] Database cleanup completed (users have plans)
- [ ] Database cleanup completed (no expired tokens)
- [ ] Database cleanup completed (status matches verified)
- [ ] Plans exist in database
- [ ] Environment variables set
- [ ] Free user can sign up
- [ ] Free user can verify email
- [ ] Free user can log in
- [ ] Free user sees 5 features
- [ ] Free user can access all 5 features
- [ ] Billing page loads
- [ ] No critical errors in logs

---

## ⏰ TIME ESTIMATE

| Task | Time | When |
|------|------|------|
| Database cleanup | 10 min | NOW |
| Pre-launch testing | 30 min | NOW |
| Monitor first hour | 60 min | AFTER LAUNCH |

**Total:** 40 minutes before you can launch

---

## 🆘 EMERGENCY CONTACTS & ROLLBACK

### If Critical Issue Found:

**Rollback Code:**
```bash
git revert HEAD
git push origin main
# CapRover will auto-deploy previous version
```

**Rollback Database:**
```sql
-- Users were assigned wrong plan
UPDATE "User" 
SET "planId" = 'correct_plan_id' 
WHERE email = 'affected@user.com';
```

**Emergency Fixes:**
- Feature access broken → Check user's planId
- Verification broken → Clear tokens, user requests new email
- Billing broken → Disable billing page temporarily

---

## 📞 POST-LAUNCH MONITORING

### First 24 Hours - Watch For:

1. **User Signups:**
   - Are emails arriving?
   - Are verifications working?
   - Can users log in?

2. **Feature Access:**
   - Can free users access their 5 features?
   - Are paid features properly locked?
   - Any "feature locked" errors for free users?

3. **Billing:**
   - Do upgrade attempts work?
   - Are Stripe webhooks being received?
   - Any payment errors?

4. **Performance:**
   - Page load times acceptable?
   - API response times OK?
   - Any timeouts?

5. **Errors:**
   - Check CapRover logs every hour
   - Monitor error rates
   - Watch for unusual patterns

---

## ✅ FINAL PRE-LAUNCH COMMAND

```bash
# Run this to verify everything before launch:

# 1. Database health check
psql "$DATABASE_URL" -c "
SELECT 
  'Total Users' as metric, COUNT(*)::text as value FROM \"User\"
UNION ALL
SELECT 
  'Users with Plan', COUNT(*)::text FROM \"User\" WHERE \"planId\" IS NOT NULL
UNION ALL
SELECT 
  'Active Users', COUNT(*)::text FROM \"User\" WHERE status = 'Active'
UNION ALL
SELECT 
  'Expired Tokens', COUNT(*)::text FROM \"VerificationToken\" WHERE expires < NOW()
UNION ALL
SELECT 
  'Total Plans', COUNT(*)::text FROM \"Plan\";
"

# Expected:
# Total Users: X
# Users with Plan: X (same as total)
# Active Users: X (verified users)
# Expired Tokens: 0
# Total Plans: 4
```

---

## 🎯 YOU ARE READY TO LAUNCH WHEN:

✅ All code fixes deployed  
✅ Database cleanup completed  
✅ All 3 tests pass  
✅ Environment variables verified  
✅ No critical errors in logs  
✅ Free user can complete full flow  

**THEN: LAUNCH! 🚀**

---

**Good luck with your launch today!**
