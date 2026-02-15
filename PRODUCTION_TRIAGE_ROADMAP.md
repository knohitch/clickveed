# 🚨 PRODUCTION TRIAGE ROADMAP

**Created:** January 15, 2026  
**Platform:** Next.js 14 + CapRover/Docker + PostgreSQL  
**Status:** Feature config deployed, database cleanup pending

---

## 🔴 CATEGORY 1: LAUNCH BLOCKERS (Fix NOW - 0.5 hours)

**Definition:** Bugs preventing ANY user from using basic app functionality

### BLOCKER #1: Database Has Stale Data (15 minutes)

**Impact:** Some users may not have planId, causing feature access to fail  
**Likelihood:** Medium (auto-fix exists, but pre-existing users may be affected)

**Files to Check:**
- Database: `User` table (`planId` column)
- Database: `VerificationToken` table
- `src/server/actions/user-actions.ts` (getUserById - has auto-fix)

**Root Cause:**
- Old users created before plan assignment was fixed
- Old verification tokens with wrong URLs

**Fix Steps:**
```sql
-- Step 1: Check for affected users
SELECT COUNT(*) FROM "User" WHERE "planId" IS NULL;

-- Step 2: Assign Free plan
UPDATE "User" SET "planId" = 'plan_free' WHERE "planId" IS NULL;

-- Step 3: Clear old tokens
DELETE FROM "VerificationToken" WHERE expires < NOW();

-- Step 4: Fix verification status mismatches
UPDATE "User" SET status = 'Active' 
WHERE status = 'Pending' AND "emailVerified" = true;
```

**Testing:**
1. Query database for users without plans
2. Test free user login and feature access
3. Test new user signup and verification

**Priority:** 🔴 CRITICAL - Do first

---

### ✅ NO OTHER LAUNCH BLOCKERS FOUND

**Confirmed Working:**
- ✅ Authentication (login/signup)
- ✅ Database connections
- ✅ Route handlers
- ✅ Middleware
- ✅ Feature config (after deployment)
- ✅ Plan assignment on signup

---

## 💰 CATEGORY 2: REVENUE BLOCKERS (Fix TODAY - 2-4 hours)

**Definition:** Bugs preventing users from upgrading/paying

### REVENUE BLOCKER #1: Unknown Billing Error Codes (2-4 hours)

**Impact:** Users cannot upgrade to paid plans  
**Likelihood:** Unknown (need to test)

**Files to Check:**
1. `src/app/(app)/dashboard/settings/billing/page.tsx`
2. `src/app/api/stripe/create-checkout-session/route.ts`
3. `src/app/api/stripe/create-portal-session/route.ts`
4. `src/app/api/stripe/webhook/route.ts`

**Likely Root Causes:**

**A. Missing Stripe Environment Variables (30 min)**
```bash
# Check these are set in CapRover:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**B. Plans Not Seeded with Stripe IDs (15 min)**
```sql
-- Check if plans have Stripe product IDs
SELECT id, name, "stripeProductId", "stripePriceIdMonthly" 
FROM "Plan";

-- If NULL, run seed:
npm run db:seed
```

**C. Stripe.js Not Loading (30 min)**
```typescript
// In billing/page.tsx, check:
const stripe = await getStripe();
if (!stripe) {
  throw new Error("Stripe.js failed to load.");
}
```

**D. Checkout Session Creation Failing (1 hour)**
```typescript
// File: src/app/api/stripe/create-checkout-session/route.ts
// Add logging:
console.log('[Checkout] Creating session for plan:', planId);
console.log('[Checkout] User:', userId);
console.log('[Checkout] Customer ID:', stripeCustomerId);

// Check for errors creating customer or session
```

**E. Webhook Not Configured (30 min)**
```bash
# In Stripe Dashboard:
# 1. Go to Developers > Webhooks
# 2. Add endpoint: https://app.vyydecourt.site/api/stripe/webhook
# 3. Events to send:
#    - checkout.session.completed
#    - customer.subscription.updated
#    - customer.subscription.deleted
# 4. Copy webhook secret to STRIPE_WEBHOOK_SECRET
```

**Testing Steps:**
```bash
# 1. Test in browser
# - Log in as free user
# - Go to /dashboard/settings/billing
# - Click "Choose Plan" on Creator plan
# - Check browser console for errors
# - Check network tab for failed requests

# 2. Test Stripe products
stripe products list --api-key sk_test_...

# 3. Test checkout session creation
curl -X POST https://app.vyydecourt.site/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"planId":"plan_creator","cycle":"monthly"}'

# 4. Check CapRover logs
docker logs -f <app-container-id> | grep -i stripe
```

**Fix Order:**
1. Verify Stripe env vars (5 min)
2. Test that plans have Stripe IDs (5 min)
3. Test billing page loads (5 min)
4. Attempt upgrade flow (10 min)
5. If errors, check specific error messages
6. Fix based on error (30-60 min)

**Priority:** 🔴 HIGH - Blocking revenue

---

## ⚡ CATEGORY 3: FEATURE BUGS (Fix TODAY - 3-5 hours)

**Definition:** Bugs in core features users expect to work

### FEATURE BUG #1: Free Users See Limited Features (EXPECTED BEHAVIOR)

**Status:** ✅ NOT A BUG - This is by design after fix

**What Users See:**
- AI Assistant ✅
- Creative Assistant ✅
- Social Integrations ✅
- Media Library ✅
- Settings ✅

**What They Don't See:**
- Video Suite (requires Starter+)
- Image Editing (requires Starter+)
- Social Analytics (requires Starter+)

**No Fix Needed** - Feature config working as intended

---

### FEATURE BUG #2: Email Verification May Fail (30 min)

**Impact:** New users can't verify, can't login  
**Likelihood:** Low (code is correct, just old tokens)

**Files to Check:**
1. `src/app/api/auth/verify-email/route.ts`
2. `src/server/actions/auth-actions.ts` (token generation)
3. `src/server/services/email-service.ts`

**Root Causes:**

**A. SMTP Not Configured (15 min)**
```sql
-- Check email settings
SELECT * FROM "EmailSettings" WHERE id = 1;

-- Should have:
-- smtpHost, smtpPort, smtpUser, smtpPass filled in
```

**B. Old Tokens with Wrong URLs (5 min)**
```sql
-- Already covered in BLOCKER #1
DELETE FROM "VerificationToken" WHERE expires < NOW();
```

**C. Email Template Missing (10 min)**
```sql
-- Check email template exists
SELECT * FROM "EmailTemplate" WHERE key = 'emailVerification';

-- Should return a template with {{verificationLink}} placeholder
```

**Testing:**
```bash
# 1. Sign up new test user
# 2. Check email arrives (check spam)
# 3. Verify link format: https://app.vyydecourt.site/api/auth/verify-email?token=...
# 4. Click link
# 5. Should redirect to: https://app.vyydecourt.site/login?verified=true
# 6. Login should work

# If email doesn't send:
# - Check CapRover logs for SMTP errors
# - Test SMTP credentials manually
# - Check EmailSettings table
```

**Priority:** 🟡 MEDIUM - Affects new signups

---

### FEATURE BUG #3: AI Features May Not Work (1-2 hours)

**Impact:** Core AI features fail  
**Likelihood:** Medium (many placeholder implementations)

**Files to Check:**
1. `src/lib/ai/provider-clients.ts` (all AI providers)
2. `src/lib/ai/api-service-manager.ts`
3. `src/app/api/ai/**/*` (API routes)

**Features to Test:**

**A. AI Assistant Chat (30 min)**
```bash
# File: src/app/(app)/dashboard/ai-assistant/chat/page.tsx
# Test:
# 1. Go to /dashboard/ai-assistant/chat
# 2. Send message
# 3. Check response

# If fails:
# - Check OPENAI_API_KEY is set
# - Check ApiKey table has 'openai' entry
# - Check CapRover logs for API errors
```

**B. Image Generation (30 min)**
```bash
# File: src/app/(app)/dashboard/image-editing/ai-image-generator/page.tsx
# Test:
# 1. Go to /dashboard/image-editing/ai-image-generator
# 2. Enter prompt
# 3. Generate image

# If fails:
# - Check if using Stability AI, DALL-E, or Flux
# - Verify API keys in database or env vars
# - Check provider implementations
```

**C. Voice Over Generation (30 min)**
```bash
# File: src/lib/elevenlabs-client.ts
# Test:
# 1. Try to generate voice over
# 2. Check if ElevenLabs API key is set

# Known Issue: Missing timeout on generateSpeech()
# Quick Fix (add to line ~80):
timeout: 30000,
```

**Priority:** 🟡 MEDIUM - Core value proposition

---

### FEATURE BUG #4: Google Cloud APIs Wrong Endpoints (2 hours)

**Impact:** Google Veo video and Imagen image generation fail  
**Likelihood:** HIGH (documented in REMAINING_BUGS)

**Files to Fix:**
1. `src/lib/ai/provider-clients.ts`
   - GoogleVeoClient class
   - ImagenClient class

**Current Issues:**
```typescript
// WRONG (current code):
const baseUrl = 'https://us-central1-aiplatform.googleapis.com';
await axios.post(
  `${baseUrl}/v1/projects/-/locations/us-central1/publishers/google/models/${model}:predict`,
  // Uses "-" instead of project ID ❌
  // Uses API key instead of OAuth ❌
  // No job polling ❌
);
```

**Fix Required:**
```typescript
// CORRECT:
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const baseUrl = 'https://us-central1-aiplatform.googleapis.com';

// 1. Get OAuth token
const accessToken = await getGoogleAccessToken();

// 2. Start async generation
const startResponse = await axios.post(
  `${baseUrl}/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${model}:predictLongRunning`,
  { instances: [{ prompt }] },
  {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    timeout: 10000
  }
);

// 3. Poll for completion
const jobId = startResponse.data.name;
let result;
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const status = await axios.get(
    `${baseUrl}/v1/${jobId}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  if (status.data.done) {
    result = status.data.response;
    break;
  }
}
```

**Testing:**
```bash
# 1. Set environment variable
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# 2. Set service account
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# 3. Test image generation
# 4. Test video generation
# 5. Check logs for OAuth and polling
```

**Priority:** 🟡 MEDIUM - Only if using Google Cloud

---

## 🟢 CATEGORY 4: NICE-TO-HAVES (Fix THIS WEEK - 20+ hours)

### 1. Placeholder Video APIs (12 hours)
**Files:** `src/lib/ai/provider-clients.ts`
- WanClient - returns placeholder
- SeedanceClient - returns placeholder  
- HeyGenClient - returns placeholder

**Impact:** Low (can disable these providers)  
**Fix:** Implement actual API calls + job polling

---

### 2. Circuit Breaker Pattern (2 hours)
**File:** `src/lib/ai/api-service-manager.ts`

**Impact:** Low (providers fail gracefully now)  
**Fix:** Add circuit breaker to avoid hammering failed providers

---

### 3. Provider Validation (1 hour)
**File:** `src/lib/ai/api-service-manager.ts`

**Impact:** Low  
**Fix:** Validate API keys on startup

---

### 4. Stock Media Retry Logic (2 hours)
**Files:** 
- `src/server/ai/tools/pixabay-tool.ts`
- `src/server/ai/tools/unsplash-tool.ts`

**Impact:** Low  
**Fix:** Add retry logic like Pexels has

---

### 5. Email Queue System (4 hours)
**File:** Create `src/lib/email-queue.ts`

**Impact:** Low (emails send synchronously now)  
**Fix:** Use Bull queue or database-backed queue

---

### 6. Logging Improvements (3 hours)
**Files:** All API integrations

**Impact:** Low  
**Fix:** Add structured logging (Winston/Pino)

---

## 📋 FINAL PRIORITY ORDER

### DO RIGHT NOW (30 min):
1. Run database cleanup SQL scripts
2. Verify all users have planId
3. Clear old verification tokens

### DO TODAY - MORNING (2-4 hours):
4. Test billing flow
5. Document exact billing errors (if any)
6. Fix billing issues based on findings
7. Verify Stripe integration

### DO TODAY - AFTERNOON (3-4 hours):
8. Test email verification flow
9. Test AI Assistant chat
10. Test image generation
11. Fix any broken core features

### DO THIS WEEK (optional - 15-20 hours):
12. Fix Google Cloud endpoints (if using)
13. Implement placeholder video APIs
14. Add circuit breaker
15. Add retry logic to stock media
16. Email queue system

---

## 🎯 FOCUSED FIX PROMPTS

### PROMPT A: Fix All Launch Blockers

```
I need you to fix critical database issues blocking users from accessing our Next.js SaaS app.

CONTEXT:
- App: Next.js 14 on CapRover/Docker
- Database: PostgreSQL with Prisma
- Issue: Some users may not have planId assigned, blocking feature access

TASKS:
1. Connect to the production database via SSH/psql
2. Run these diagnostic queries:
   ```sql
   SELECT COUNT(*) as users_without_plan FROM "User" WHERE "planId" IS NULL;
   SELECT COUNT(*) as expired_tokens FROM "VerificationToken" WHERE expires < NOW();
   SELECT COUNT(*) as status_mismatches FROM "User" 
   WHERE (status = 'Pending' AND "emailVerified" = true) 
      OR (status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN');
   ```

3. If users_without_plan > 0, run:
   ```sql
   UPDATE "User" SET "planId" = 'plan_free' WHERE "planId" IS NULL;
   ```

4. If expired_tokens > 0, run:
   ```sql
   DELETE FROM "VerificationToken" WHERE expires < NOW();
   ```

5. If status_mismatches > 0, run:
   ```sql
   UPDATE "User" SET status = 'Active' 
   WHERE status = 'Pending' AND "emailVerified" = true;
   
   UPDATE "User" SET status = 'Pending'
   WHERE status = 'Active' AND "emailVerified" = false AND role != 'SUPER_ADMIN';
   ```

6. Verify fixes:
   ```sql
   SELECT 
     COUNT(*) as total_users,
     COUNT(CASE WHEN "planId" IS NOT NULL THEN 1 END) as users_with_plan,
     COUNT(CASE WHEN "planId" IS NULL THEN 1 END) as users_without_plan
   FROM "User";
   ```

7. Test:
   - Log in as free user
   - Verify dashboard shows 5 free features (AI Assistant, Creative Assistant, Social Suite, Media Library, Settings)
   - Click each feature to ensure they load
   - Verify no errors in console/logs

FILES TO CHECK:
- Database tables: User, Plan, VerificationToken
- src/server/actions/user-actions.ts (getUserById function has auto-fix)
- src/contexts/auth-context.tsx (loads user plan)
- src/components/dashboard-nav.tsx (filters features by plan)

SUCCESS CRITERIA:
- All users have a planId
- No expired verification tokens
- Status field matches emailVerified field
- Free users can access all 5 free features
- No errors in production logs

REPORT BACK:
- Number of users fixed
- Any errors encountered
- Test results for free user login
```

---

### PROMPT B: Fix All Revenue Blockers

```
I need you to diagnose and fix billing/payment issues in our Next.js SaaS app preventing users from upgrading.

CONTEXT:
- App: Next.js 14 on CapRover/Docker with Stripe integration
- Issue: Users report errors when trying to upgrade to paid plans
- Billing page: src/app/(app)/dashboard/settings/billing/page.tsx

DIAGNOSTIC STEPS:

1. Check Environment Variables (CapRover):
   ```bash
   # Verify these are set:
   echo $NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # Should start with pk_
   echo $STRIPE_SECRET_KEY                   # Should start with sk_
   echo $STRIPE_WEBHOOK_SECRET               # Should start with whsec_
   ```

2. Check Database Plans Have Stripe IDs:
   ```sql
   SELECT id, name, "stripeProductId", "stripePriceIdMonthly", "stripePriceIdYearly"
   FROM "Plan" 
   WHERE "priceMonthly" > 0;
   ```
   - If NULLs found, run: `npm run db:seed`

3. Test Stripe.js Loading:
   - Open browser to: https://app.vyydecourt.site/dashboard/settings/billing
   - Open DevTools Console
   - Check for error: "Stripe.js failed to load"
   - Check Network tab for failed Stripe script loads

4. Test Checkout Session Creation:
   ```bash
   # In dev environment, test the API:
   curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
     -H "Content-Type: application/json" \
     -d '{"planId":"plan_creator","cycle":"monthly"}' \
     -H "Cookie: <session-cookie>"
   ```

5. Check Stripe Dashboard:
   - Go to https://dashboard.stripe.com
   - Check Products exist (should match database plans)
   - Check Webhooks configured:
     - Endpoint: https://app.vyydecourt.site/api/stripe/webhook
     - Events: checkout.session.completed, customer.subscription.*

6. Monitor Live Testing:
   ```bash
   # Tail production logs during test upgrade
   docker logs -f <app-container> | grep -i stripe
   ```

FILES TO CHECK:
1. src/app/(app)/dashboard/settings/billing/page.tsx
   - Line ~120: getStripe() function
   - Line ~180: createCheckoutSession() call
   - Line ~220: Error handling

2. src/app/api/stripe/create-checkout-session/route.ts
   - Check Stripe.customers.create()
   - Check Stripe.checkout.sessions.create()
   - Verify success_url and cancel_url

3. src/app/api/stripe/webhook/route.ts
   - Verify webhook signature validation
   - Check event handlers

4. src/lib/stripe.ts or similar
   - Check Stripe initialization

COMMON ISSUES TO FIX:

Issue A: Missing ENV vars
```typescript
// Fix in CapRover:
// Add missing environment variables
```

Issue B: Stripe.js not loading
```typescript
// Check public key in src/lib/stripe-client.ts
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
```

Issue C: CORS issues with Stripe
```typescript
// Check next.config.mjs has proper headers
```

Issue D: Webhook secret mismatch
```typescript
// In webhook route, verify:
const sig = headers().get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
```

TEST PLAN:
1. Log in as free user
2. Navigate to /dashboard/settings/billing
3. Select "Creator" plan
4. Choose monthly billing
5. Click "Choose Plan"
6. Should redirect to Stripe Checkout
7. Use test card: 4242 4242 4242 4242
8. Complete payment
9. Should redirect back with success
10. Verify user's plan updated in database
11. Verify user sees Creator plan features

SUCCESS CRITERIA:
- Billing page loads without errors
- Stripe checkout redirects work
- Payment completes successfully
- User plan updates in database
- Webhook receives events
- No errors in logs

REPORT BACK:
- Exact error messages (if any)
- Which step failed
- Stripe Dashboard webhook events log
- Proposed fixes
```

---

### PROMPT C: Fix All Feature Bugs

```
I need you to test and fix core features in our Next.js AI SaaS app to ensure they work for free users.

CONTEXT:
- App: Next.js 14 white label video/AI creation SaaS
- Database: PostgreSQL with Prisma
- Free tier features: AI Assistant, Creative Assistant, Social Integrations, Media Library, Settings

TESTING CHECKLIST:

1. AI ASSISTANT CHAT (30 min)
   Location: src/app/(app)/dashboard/ai-assistant/chat/page.tsx
   
   Test Steps:
   - Navigate to /dashboard/ai-assistant/chat
   - Send message: "Help me create a video script about coffee"
   - Verify response appears
   
   If Fails - Check:
   ```sql
   -- Verify OpenAI key exists
   SELECT * FROM "ApiKey" WHERE name = 'openai';
   ```
   
   Files to Fix:
   - src/app/api/ai/chat/route.ts
   - src/lib/openai-client.ts (if exists)
   - Verify OPENAI_API_KEY env var set

2. IMAGE GENERATION (30 min)
   Location: src/app/(app)/dashboard/image-editing/ai-image-generator/page.tsx
   
   Test Steps:
   - Navigate to /dashboard/image-editing/ai-image-generator
   - Enter prompt: "A professional logo for a coffee shop"
   - Click generate
   - Verify image loads
   
   If Fails - Check:
   ```sql
   -- Check which provider is configured
   SELECT * FROM "ApiKey" WHERE name IN ('stability', 'openai', 'replicate');
   ```
   
   Files to Fix:
   - src/app/api/ai/generate-image/route.ts
   - src/lib/ai/provider-clients.ts (check which image provider is used)
   - Verify API keys are set

3. EMAIL VERIFICATION (15 min)
   Files: src/app/api/auth/verify-email/route.ts
   
   Test Steps:
   - Sign up new user: test+{timestamp}@example.com
   - Check email arrives (check spam folder)
   - Verify link format: https://app.vyydecourt.site/api/auth/verify-email?token=...
   - Click link
   - Should redirect to: https://app.vyydecourt.site/login?verified=true
   
   If Fails - Check:
   ```sql
   -- Verify SMTP configured
   SELECT * FROM "EmailSettings" WHERE id = 1;
   
   -- Verify template exists
   SELECT * FROM "EmailTemplate" WHERE key = 'emailVerification';
   ```
   
   Files to Fix:
   - src/server/services/email-service.ts
   - src/app/api/auth/verify-email/route.ts
   - Check SMTP credentials in database

4. MEDIA LIBRARY (15 min)
   Location: src/app/(app)/dashboard/media/library/page.tsx
   
   Test Steps:
   - Navigate to /dashboard/media/library
   - Verify page loads
   - Try uploading a test image
   - Verify storage works (Wasabi S3)
   
   If Fails - Check:
   ```bash
   # Verify Wasabi credentials
   echo $WASABI_ACCESS_KEY_ID
   echo $WASABI_SECRET_ACCESS_KEY
   echo $WASABI_BUCKET_NAME
   echo $WASABI_REGION
   ```
   
   Files to Fix:
   - src/lib/wasabi-client.ts
   - src/app/api/upload/route.ts

5. SOCIAL INTEGRATIONS (15 min)
   Location: src/app/(app)/dashboard/social-suite/integrations/page.tsx
   
   Test Steps:
   - Navigate to /dashboard/social-suite/integrations
   - Verify page loads
   - Check OAuth connect buttons appear
   
   If Fails - Check:
   - OAuth credentials configured for each platform
   - Callback URLs whitelisted

6. PROFILE SETTINGS (10 min)
   Location: src/app/(app)/dashboard/settings/page.tsx
   
   Test Steps:
   - Navigate to /dashboard/settings
   - Try updating profile name
   - Try changing password
   - Verify changes save
   
   If Fails - Check:
   - src/server/actions/user-actions.ts (updateUser function)
   - src/app/api/user/[userId]/route.ts

KNOWN ISSUES TO FIX:

Issue 1: ElevenLabs Voice Generation Timeout
File: src/lib/elevenlabs-client.ts
Line: ~80
```typescript
// CURRENT (missing timeout):
const response = await axios.post(url, data, {
  headers: { 'xi-api-key': apiKey },
  responseType: 'arraybuffer'
});

// FIX (add timeout):
const response = await axios.post(url, data, {
  headers: { 'xi-api-key': apiKey },
  responseType: 'arraybuffer',
  timeout: 30000  // ⬅️ ADD THIS
});
```

Issue 2: Google Cloud Wrong Endpoints (if used)
File: src/lib/ai/provider-clients.ts
```typescript
// Search for GoogleVeoClient and ImagenClient
// Replace "-" with actual PROJECT_ID
// Add OAuth token instead of API key
// Add job polling loop
```

MONITORING:
```bash
# Watch logs during testing
docker logs -f <container-id> | grep -E "(Error|error|failed|Failed)"

# Check for common errors:
# - "API key not found"
# - "Request timeout"
# - "Plan feature not accessible"
# - "SMTP connection failed"
```

SUCCESS CRITERIA:
- AI chat responds within 5 seconds
- Image generation completes successfully
- Email verification works end-to-end
- Media upload succeeds
- Social integrations page loads
- Profile updates save correctly
- No "feature locked" errors for free features
- No timeout errors in logs

REPORT BACK:
- Which features work ✅
- Which features fail ❌
- Exact error messages
- Log excerpts
- Proposed fixes for each failing feature
```

---

## 📊 TIME ESTIMATES

| Category | Total Time | When |
|----------|------------|------|
| Launch Blockers | 0.5 hours | NOW |
| Revenue Blockers | 2-4 hours | TODAY AM |
| Feature Bugs | 3-5 hours | TODAY PM |
| Nice-to-Haves | 20+ hours | THIS WEEK |

**Total Critical Path:** 6-10 hours to production-ready

---

## ✅ SUCCESS METRICS

After fixes, you should see:

1. **User Metrics:**
   - New signups complete successfully
   - Email verification works
   - Free users access 5 features
   - Upgrade flow completes

2. **Technical Metrics:**
   - Database: All users have planId
   - Database: No expired tokens
   - Logs: No critical errors
   - Monitoring: No failed payments

3. **Business Metrics:**
   - Free-to-paid conversion enabled
   - Payment webhooks working
   - Feature access correct per tier

---

**END OF TRIAGE ROADMAP**
