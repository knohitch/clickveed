# 🚨 EMERGENCY FIX IMPLEMENTATION GUIDE

**Status:** Ready to Deploy  
**Time Required:** 15-30 minutes  
**Risk Level:** LOW (fixes are minimal and targeted)

---

## 📋 PRE-FLIGHT CHECKLIST

Before starting, ensure you have:

- [ ] SSH access to your production server
- [ ] Database credentials for PostgreSQL
- [ ] Backup of current database (RECOMMENDED)
- [ ] Git access to push code changes
- [ ] CapRover dashboard access

---

## 🔧 STEP-BY-STEP IMPLEMENTATION

### STEP 1: Deploy Code Fix (5 minutes)

**What:** Update the feature configuration file to remove contradictions

**File Modified:** `src/lib/feature-config.ts` ✅ ALREADY DONE

**Changes Made:**
- Reduced `DEFAULT_FREE_PLAN_FEATURES` to only include truly free features
- Moved paid features to `DEFAULT_STARTER_PLAN_FEATURES`
- Added clarifying comments to prevent future confusion

**Action Required:**

```bash
# 1. Verify the changes
git status
git diff src/lib/feature-config.ts

# 2. Commit the fix
git add src/lib/feature-config.ts
git commit -m "🔥 CRITICAL FIX: Resolve feature tier contradictions - align free vs paid features"

# 3. Push to production branch
git push origin main
# (or whatever branch triggers your CapRover deployment)
```

**Expected Result:** 
- CapRover will auto-deploy the updated code
- Free tier users will now see only 5 menu items (AI Assistant, Creative Assistant, Social Integrations, Media Library, Settings)
- Paid features will show upgrade prompts for free users

---

### STEP 2: Database Cleanup - Verification Tokens (3 minutes)

**What:** Remove old/expired verification tokens that may have wrong URLs

**Why:** Old tokens might have been generated before URL fixes and could cause "0.0.0.0:3000" redirects

**Action Required:**

```bash
# SSH into your server
ssh your-server

# Connect to PostgreSQL database
# Option A: Using CapRover's database service name
docker exec -it $(docker ps | grep postgres | awk '{print $1}') psql -U your_db_user -d your_db_name

# Option B: Using psql directly if accessible
psql -h localhost -U your_db_user -d your_db_name
```

**Run these SQL commands:**

```sql
-- First, check what will be deleted
SELECT 
    COUNT(*) as total_tokens,
    COUNT(CASE WHEN expires < NOW() THEN 1 END) as expired_tokens,
    COUNT(CASE WHEN expires >= NOW() THEN 1 END) as active_tokens
FROM "VerificationToken";

-- Delete expired tokens
DELETE FROM "VerificationToken" 
WHERE expires < NOW();

-- Check result
SELECT COUNT(*) FROM "VerificationToken";
```

**Expected Result:**
- Expired tokens removed
- Active tokens (if any) remain
- Users will need to request new verification emails

---

### STEP 3: Database Cleanup - User Plans (5 minutes)

**What:** Ensure all users have a plan assigned

**Why:** Users without plans can't access any features

**Action Required:**

```sql
-- 1. Check if any users are missing plans
SELECT 
    id, 
    email, 
    "displayName",
    "planId", 
    "emailVerified", 
    status
FROM "User" 
WHERE "planId" IS NULL;

-- 2. Verify Free plan exists
SELECT id, name, "featureTier" 
FROM "Plan" 
WHERE id = 'plan_free';

-- 3. Assign Free plan to users without one
UPDATE "User" 
SET "planId" = 'plan_free' 
WHERE "planId" IS NULL;

-- 4. Verify the fix
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN "planId" IS NOT NULL THEN 1 END) as users_with_plan,
    COUNT(CASE WHEN "planId" IS NULL THEN 1 END) as users_without_plan
FROM "User";
```

**Expected Result:**
- All users have `planId = 'plan_free'` (or their existing plan)
- `users_without_plan` = 0

---

### STEP 4: Database Cleanup - Verification Status (5 minutes)

**What:** Fix any users stuck in wrong verification states

**Why:** Some users might be marked as verified but still have Pending status, or vice versa

**Action Required:**

```sql
-- 1. Find users with status mismatches
SELECT 
    id, email, "emailVerified", status, role
FROM "User"
WHERE (status = 'Pending' AND "emailVerified" = true)
   OR (status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN');

-- 2. Fix Pending users who are verified
UPDATE "User"
SET status = 'Active'
WHERE status = 'Pending' AND "emailVerified" = true;

-- 3. Fix Active users who aren't verified (except SUPER_ADMIN)
UPDATE "User"
SET status = 'Pending'
WHERE status = 'Active' 
  AND "emailVerified" = false 
  AND role != 'SUPER_ADMIN';

-- 4. Verify no mismatches remain
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN status = 'Active' AND "emailVerified" = true THEN 1 END) as proper_active,
    COUNT(CASE WHEN status = 'Pending' AND "emailVerified" = false THEN 1 END) as proper_pending
FROM "User";
```

**Expected Result:**
- Verified users have `status = 'Active'`
- Unverified users have `status = 'Pending'`
- No contradictions

---

### STEP 5: Verify Production Deployment (5 minutes)

**What:** Confirm the code changes are live

**Action Required:**

```bash
# Check CapRover deployment status
# 1. Go to CapRover dashboard
# 2. Navigate to your app
# 3. Check "App Logs" for successful deployment
# 4. Look for: "✓ Ready in X ms"

# Or check via curl
curl https://app.vyydecourt.site/api/health
```

**Expected Result:**
- App is running with latest code
- No errors in deployment logs

---

### STEP 6: Test Free User Experience (10 minutes)

**What:** Verify free users see correct features

**Test Scenario 1: New User Signup**

1. Open incognito browser
2. Go to: `https://app.vyydecourt.site/signup`
3. Sign up with a test email
4. Check email for verification link
5. Click verification link
6. Confirm redirect to: `https://app.vyydecourt.site/login?verified=true`
7. Log in
8. Check dashboard menu

**Expected Free User Menu:**
- ✅ Dashboard
- ✅ Projects
- ✅ AI Assistant
  - Creative Assistant
- ✅ Social Suite
  - Integrations
- ✅ Media Management
  - Media Library
- ✅ Settings
  - Profile & Plan
  - Brand Kit (may be locked with upgrade prompt)

**Should NOT see (without upgrade prompt):**
- ❌ Video Suite
- ❌ Image Editing
- ❌ AI Agents
- ❌ Other paid features

**Test Scenario 2: Clicking Free Features**

1. Click "AI Assistant" → Should load page ✅
2. Click "Creative Assistant" → Should load page ✅
3. Click "Media Library" → Should load page ✅
4. Click "Social Integrations" → Should load page ✅

**Test Scenario 3: Paid Feature Prompt**

If you see Video Suite or other paid features:
1. Click on them
2. Should see upgrade/lock prompt ✅

---

### STEP 7: Test Existing Users (5 minutes)

**What:** Verify existing users can still access their features

**Action Required:**

1. Log in with an existing free user account
2. Verify they see the limited menu (5 free features)
3. Log in with a paid user account (if available)
4. Verify they see all their plan's features

**Expected Result:**
- Free users: Limited access ✅
- Paid users: Full access based on plan ✅

---

### STEP 8: Monitor and Validate (Ongoing)

**What:** Watch for errors and user reports

**Action Required:**

```bash
# Monitor application logs
# In CapRover or via Docker
docker logs -f $(docker ps | grep clickveed | awk '{print $1}')

# Watch for these log patterns:
# ✅ Good: "[AuthContext] Set subscription plan: Free"
# ✅ Good: "[DashboardNav] Feature tier: free"
# ❌ Bad: "Error loading user"
# ❌ Bad: "Plan not found"
```

**What to Watch For:**
- No errors about missing plans
- No infinite loading states
- Users can access their free features
- Upgrade prompts appear for paid features

---

## 🎯 SUCCESS CRITERIA

Your fix is successful when:

- [x] Code deployed to production
- [ ] All users have a planId assigned
- [ ] Old verification tokens cleared
- [ ] No status/verification mismatches
- [ ] Free users see 5 menu sections
- [ ] Free users can access all 5 free features
- [ ] Paid features show upgrade prompt for free users
- [ ] No errors in logs about plans or features
- [ ] New signups work correctly
- [ ] Email verification uses correct URL

---

## 🚨 ROLLBACK PLAN

If something goes wrong:

### Code Rollback:

```bash
# Revert the feature-config.ts change
git revert HEAD
git push origin main

# Or manually restore old config
# (Keep backup of current version first)
```

### Database Rollback:

```sql
-- If you need to restore verification tokens, users can re-request them
-- No manual rollback needed - just have users click "Resend verification email"

-- If plan assignments were wrong, you can manually update:
UPDATE "User" 
SET "planId" = 'desired_plan_id' 
WHERE email = 'user@example.com';
```

---

## 📊 POST-DEPLOYMENT METRICS

Track these metrics after deployment:

1. **User Logins:** Should remain stable or increase
2. **Feature Access Errors:** Should drop to zero
3. **Support Tickets:** Should decrease (about broken features)
4. **Upgrade Conversions:** May increase (paid features now clear)

---

## 💬 USER COMMUNICATION (Optional)

If you want to notify existing users:

**Email Template:**

```
Subject: Platform Update - Feature Access Clarified

Hi [Name],

We've updated our platform to better clarify which features are included in each plan.

If you're on our Free plan, you now have access to:
- AI Assistant & Creative Chat
- Social Media Integrations  
- Media Library
- Profile & Settings

To unlock our full suite of video creation tools, AI image generation, and advanced features, consider upgrading to our Creator ($49/mo) or Pro ($99/mo) plans.

[Upgrade Now Button]

Questions? Our support team is here to help!

Best regards,
The [App Name] Team
```

---

## 🔍 TROUBLESHOOTING

### Issue: Users still seeing "all features blocked"

**Solution:**
1. Check if user has a planId: Run STEP 3 SQL query
2. Clear browser cache
3. Have user log out and log back in
4. Check CapRover deployment completed successfully

### Issue: Verification links still going to 0.0.0.0:3000

**Solution:**
1. Clear all verification tokens: Run STEP 2 SQL (uncomment DELETE ALL)
2. Verify ENV vars are set: `NEXT_PUBLIC_SITE_URL=https://app.vyydecourt.site`
3. Have user request new verification email

### Issue: Free users seeing paid features

**Solution:**
1. Verify code deployed: Check git commit hash in CapRover
2. Check feature-config.ts changes are live
3. Clear application cache/restart

### Issue: Paid users not seeing their features

**Solution:**
1. Check their planId in database
2. Verify plan's featureTier is correct (starter/professional/enterprise)
3. Check feature-access.ts logic for their tier

---

## ✅ COMPLETION CHECKLIST

Before marking this emergency fix as complete:

- [ ] Code changes committed and pushed
- [ ] CapRover deployment successful
- [ ] Database scripts executed successfully
- [ ] All users have planId assigned
- [ ] Verification tokens cleaned
- [ ] Free user experience tested
- [ ] Existing user experience tested  
- [ ] No errors in production logs
- [ ] Support team notified of changes
- [ ] Documentation updated

---

## 📞 NEED HELP?

If you encounter issues during implementation:

1. **Check logs first:** Most issues are visible in CapRover logs
2. **Review diagnostic report:** `EMERGENCY_DIAGNOSTIC_REPORT.md`
3. **Use SQL scripts:** `EMERGENCY_FIX_SCRIPTS.sql` for database queries
4. **Verify environment variables:** Ensure `NEXT_PUBLIC_SITE_URL` and `AUTH_URL` are set correctly

---

**END OF IMPLEMENTATION GUIDE**

Good luck! 🚀
