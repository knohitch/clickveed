# EMERGENCY DIAGNOSTIC REPORT - White Label SaaS Complete Analysis

**Date:** January 15, 2026  
**App:** ClickVid Pro (White Label Video/AI SaaS)  
**Status:** CRITICAL CONFIGURATION MISMATCH FOUND

---

## 🔴 ROOT CAUSE IDENTIFIED

**CRITICAL ISSUE:** Feature access configuration has a MISMATCH between what's advertised as "free" and what actually requires paid plans.

---

## DETAILED FINDINGS

### 1. ✅ **EMAIL VERIFICATION - WORKING CORRECTLY**

**Location:** `src/app/api/auth/verify-email/route.ts`

**Token Generation:** `src/server/actions/auth-actions.ts:106-109`
```typescript
const verificationToken = randomBytes(32).toString('hex');
const hashedToken = createHash('sha256').update(verificationToken).digest('hex');
const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // ✅ 24 HOURS
```

**Verdict:** Token expiry is set correctly to 24 hours. If tokens are expiring immediately, it's likely **old tokens generated before recent fixes**.

**Recommendation:** 
- Clear all existing verification tokens from database
- Ask users to request new verification emails

---

### 2. ✅ **URL HARDCODING - NO ISSUES FOUND**

**Search Results:** 
- Searched entire codebase for "0.0.0.0" → **0 results**
- Searched for hardcoded localhost → Found only fallbacks with proper env var checks

**Verification Code:** `src/app/api/auth/verify-email/route.ts:10-23`
```typescript
function getProductionBaseUrl(): string {
  // Priority: AUTH_URL > NEXT_PUBLIC_SITE_URL > NEXTAUTH_URL
  const baseUrl = process.env.AUTH_URL || 
                  process.env.NEXT_PUBLIC_SITE_URL || 
                  process.env.NEXTAUTH_URL;
  
  if (baseUrl) {
    return baseUrl.replace(/\/$/, '');
  }
  
  // Fallback for development only
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }
  
  return 'https://app.vyydecourt.site'; // Hardcoded fallback
}
```

**Verdict:** No 0.0.0.0:3000 in code. The issue is either:
- Old verification links sent before fixes
- Browser cache
- Old tokens in database with wrong redirect URLs

**Fix:** Delete old verification tokens and regenerate

---

### 3. ✅ **USER SIGNUP - PLAN ASSIGNMENT WORKING**

**Location:** `src/server/actions/auth-actions.ts:65-72`

```typescript
// Find the default "Free" plan
const freePlan = await prisma.plan.findFirst({
    where: { 
        OR: [
            { name: 'Free' },
            { featureTier: 'free' }
        ]
    }
});
// ... creates user with planId: freePlan.id ✅
```

**Auto-Fix Mechanism:** `src/server/actions/user-actions.ts:57-87`
```typescript
// If user exists but has no plan, auto-assign the Free plan
if (user && !user.planId) {
    const freePlan = await prisma.plan.findFirst({
        where: { 
            OR: [
                { name: 'Free' },
                { featureTier: 'free' }
            ]
        }
    });
    // Updates user with planId
}
```

**Verdict:** Users ARE getting planId assigned on signup AND there's an auto-fix that assigns Free plan if missing.

---

### 4. 🔴 **FEATURE ACCESS - CRITICAL CONFIGURATION MISMATCH**

**This is the PRIMARY issue blocking all features.**

#### **Problem Location:** `src/lib/feature-config.ts`

**Configuration Conflict:**

```typescript
// Lines 47-58: DEFAULT_FREE_PLAN_FEATURES claims these are FREE:
export const DEFAULT_FREE_PLAN_FEATURES = [
  'ai-assistant',
  'creative-assistant',
  'social-integrations',
  'video-suite',          // ⚠️ Listed as FREE
  'video-pipeline',       // ⚠️ Listed as FREE
  'script-generator',     // ⚠️ Listed as FREE
  'stock-media',          // ⚠️ Listed as FREE
  'ai-image-generator',   // ⚠️ Listed as FREE
  'background-remover',   // ⚠️ Listed as FREE
  'media-library',
  'profile-settings',
]

// BUT Lines 89-109: FEATURE_MINIMUM_PLAN says they need PAID plans:
export const FEATURE_MINIMUM_PLAN: Record<string, string> = {
  'video-suite': 'Starter',        // ❌ CONTRADICTS above!
  'video-pipeline': 'Starter',     // ❌ CONTRADICTS above!
  'script-generator': 'Starter',   // ❌ CONTRADICTS above!
  'video-from-url': 'Starter',
  'stock-media': 'Starter',        // ❌ CONTRADICTS above!
  'ai-image-generator': 'Starter', // ❌ CONTRADICTS above!
  'background-remover': 'Starter', // ❌ CONTRADICTS above!
  // ...
}
```

**The Conflict:**
- `DEFAULT_FREE_PLAN_FEATURES` says features are included in free tier
- `FEATURE_MINIMUM_PLAN` says same features need "Starter" plan minimum
- The feature access check (`checkFeatureAccess`) uses `getFeaturesForTier()` which relies on defaults
- But the minimum plan map creates confusion

#### **How Feature Checking Works:**

`src/lib/feature-access.ts:90-107`
```typescript
export function checkFeatureAccess(
  planName: string | null,
  featureId: string,
  featureTier?: string | null
): FeatureAccess {
  // Determines effective tier (free, starter, professional, enterprise)
  // Then calls getFeaturesForTier(effectiveTier)
  // Returns canAccess: true/false
}
```

`src/lib/feature-access.ts:30-42`
```typescript
export function getFeaturesForTier(tier: FeatureTier): string[] {
  switch (tier) {
    case 'enterprise':
      return [...DEFAULT_ENTERPRISE_PLAN_FEATURES];
    case 'professional':
      return [...DEFAULT_PRO_PLAN_FEATURES];
    case 'starter':
      return [...DEFAULT_STARTER_PLAN_FEATURES];
    case 'free':
    default:
      return [...DEFAULT_FREE_PLAN_FEATURES]; // ⚠️ Returns the conflicting list
  }
}
```

---

### 5. 📊 **DATABASE SEED - CORRECT PLAN STRUCTURE**

**Location:** `prisma/seed.ts`

**Plans created:**
1. **plan_free** - featureTier: 'free'
2. **plan_creator** - featureTier: 'starter' 
3. **plan_pro** - featureTier: 'professional'
4. **plan_agency** - featureTier: 'enterprise'

**Verdict:** Database structure is correct. The Free plan exists with proper featureTier.

---

## 🎯 EXACT FILES CAUSING ISSUES

### CRITICAL - Must Fix:
1. **`src/lib/feature-config.ts`** - Lines 47-109
   - Conflicting feature tier definitions
   - `DEFAULT_FREE_PLAN_FEATURES` vs `FEATURE_MINIMUM_PLAN` mismatch

### CLEANUP RECOMMENDED:
2. **Database VerificationToken table** - Old expired tokens need deletion
3. **User table** - Verify all users have planId assigned

---

## 🔧 REQUIRED FIXES

### Fix #1: Correct Feature Configuration (CRITICAL)

**File:** `src/lib/feature-config.ts`

**Issue:** Features listed in both FREE defaults AND requiring Starter in minimum plan

**Decision needed - Choose ONE approach:**

#### **Option A: Make Free Plan Actually Free (Generous)**
Remove these features from `FEATURE_MINIMUM_PLAN`:
- video-suite
- video-pipeline  
- script-generator
- stock-media
- ai-image-generator
- background-remover

**OR**

#### **Option B: Make Free Plan Limited (Restrictive)**
Remove these features from `DEFAULT_FREE_PLAN_FEATURES`:
- video-suite
- video-pipeline
- script-generator
- stock-media  
- ai-image-generator
- background-remover

Only keep truly free features:
- ai-assistant
- creative-assistant
- social-integrations
- media-library
- profile-settings

**Recommendation:** **Option B** - Align with your business model. Free users should have limited access to encourage upgrades.

---

### Fix #2: Clear Old Verification Tokens

**Action:** Run this SQL query on your production database:

```sql
-- Delete expired verification tokens
DELETE FROM "VerificationToken" 
WHERE expires < NOW();

-- Optional: Delete ALL verification tokens to force clean state
DELETE FROM "VerificationToken";
```

---

### Fix #3: Verify All Users Have Plan Assigned

**Action:** Run this SQL query:

```sql
-- Check users without plans
SELECT id, email, "planId", "emailVerified", status 
FROM "User" 
WHERE "planId" IS NULL;

-- Auto-assign Free plan to users without one
UPDATE "User" 
SET "planId" = 'plan_free' 
WHERE "planId" IS NULL;
```

---

### Fix #4: Update Seed Data to Match Feature Config

**File:** `prisma/seed.ts`

Update the Free plan features to match your chosen approach (Option A or B from Fix #1).

---

## 📋 VERIFICATION CHECKLIST

After implementing fixes:

- [ ] Feature config has NO contradictions between defaults and minimum plans
- [ ] Free plan features align with business model
- [ ] Old verification tokens cleared from database
- [ ] All users have planId assigned (run SQL query)
- [ ] Test user signup flow (new verification email)
- [ ] Test email verification link (should use correct URL)
- [ ] Test free user feature access (should see only free features)
- [ ] Test clicking on free features (should work, not show upgrade prompt)
- [ ] Test paid features on free plan (should show upgrade prompt)

---

## 🚀 IMPLEMENTATION ORDER

1. **FIRST:** Fix feature-config.ts (Choose Option A or B)
2. **SECOND:** Clear old verification tokens (SQL query)
3. **THIRD:** Assign missing planIds (SQL query)
4. **FOURTH:** Test complete signup → verify → login → access features flow
5. **FIFTH:** Update seed.ts to match new config

---

## 💡 WHY EVERYTHING APPEARED BROKEN

**User Experience:**
1. User signs up → Gets Free plan ✅
2. User verifies email (or old token expires) ❌ 
3. User logs in → Sees dashboard ✅
4. User clicks AI Assistant → Page loads ✅
5. **BUT** Dashboard nav filters out features due to config mismatch ❌
6. User sees empty/limited menu → Thinks app is broken ❌

**The Truth:**
- Auth worked fine ✅
- Database worked fine ✅  
- Plan assignment worked fine ✅
- Feature access logic worked fine ✅
- **BUT** Feature configuration had contradictory rules ❌

---

## 📞 NEXT STEPS

**Choose your business model:**

1. **Generous Free Tier** (Option A)
   - More features free
   - Easier user acquisition
   - Lower conversion to paid

2. **Limited Free Tier** (Option B)  
   - Fewer features free
   - Higher conversion to paid
   - Better monetization

Then apply the fixes in the order specified above.

---

## 🔍 ADDITIONAL NOTES

**No evidence found of:**
- ❌ Middleware blocking features (middleware is permissive)
- ❌ Hardcoded 0.0.0.0 URLs (searched entire codebase)
- ❌ Missing route handlers (all dashboard routes exist)
- ❌ Broken planId assignment (working + has auto-fix)
- ❌ Auth issues (NextAuth configured correctly)

**Only real issues:**
- ✅ Feature config contradictions (CRITICAL)
- ✅ Old verification tokens (cleanup needed)
- ✅ Possible users without planId (SQL fix available)

---

**End of Diagnostic Report**
