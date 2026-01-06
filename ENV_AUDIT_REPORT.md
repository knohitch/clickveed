# Environment Variables Audit & Security Report

**Status:** ⚠️ CRITICAL SECURITY ISSUES FOUND

---

## 🚨 CRITICAL SECURITY VULNERABILITIES

### 1. STRIPE KEYS EXPOSED IN .ENV ⚠️⚠️⚠️

**Your Variables:**
```bash
STRIPE_SECRET_KEY=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
STRIPE_PUBLISHABLE_KEY=pk_live_51S09PdE33L3kG055XJhi0kUmhvXK2zKAtHyegNigCBcQinhl94VTM01QH5xXH9auHuwPZgq86sdnKTEg1ZMcCdI00KavmaQgv
```

**CRITICAL ISSUES:**
1. ✅ **Secret key starts with `sk_live_`** - This is CORRECT for production
2. ✅ **Publishable key starts with `pk_live_`** - This is CORRECT for production
3. ⚠️ **Keys exposed in .env file** - If this file is committed to Git, they're PUBLIC

**IMMEDIATE ACTION REQUIRED:**

1. **Regenerate Stripe keys:**
   ```bash
   # Log into Stripe Dashboard
   # Delete existing live keys
   # Create new live keys
   ```

2. **Verify .env is in .gitignore:**
   ```bash
   cat .gitignore
   # Should contain:
   .env
   .env.local
   .env.production
   ```

3. **If keys were committed, rotate them NOW:**
   ```bash
   # Stripe Dashboard → Developers → API keys
   # Revoke compromised keys
   # Generate new keys
   # Update environment variables
   ```

---

## ✅ CORRECT VARIABLES

### NextAuth Configuration

```bash
✅ NEXTAUTH_TRUST_HOST=true        # CORRECT - allows your domain
✅ NEXTAUTH_URL=https://app.vyydecourt.site  # CORRECT - production URL
✅ AUTH_URL=https://app.vyydecourt.site           # CORRECT - matches NEXTAUTH_URL
✅ NEXTAUTH_SECRET=799f7f4b5...         # OK (should be long random string)
✅ NODE_ENV=production                            # CORRECT
```

**Status:** ✅ All NextAuth settings are correct!

---

## ⚠️ VARIABLES TO FIX

### 1. Database URL Format (Non-Critical)

**Current:**
```bash
DATABASE_URL=postgres://postgres:b92649c46ee06b70@srv-captain--postgres:5432/postgres
```

**Issue:**
- Uses `postgres://` instead of `postgresql://`
- Most ORMs (including Prisma) expect `postgresql://` or `postgres://` (both work)
- The format you have is actually valid for some drivers

**Fix (Optional - for consistency):**
```bash
DATABASE_URL=postgresql://postgres:b92649c46ee06b70@srv-captain--postgres:5432/postgres
```

**Status:** ⚠️ Works now, but should use `postgresql://` for best practices

---

### 2. Redis URL (Potential Issue)

**Current:**
```bash
REDIS_URL=redis://default:J9OMd5X2d1RQ721gaFscyrOIoy8Rl@srv-captain--redis:6379
```

**Issue:**
- Username is `default:J9OMd5X2d1RQ721gaFscyrOIoy8Rl`
- This looks like a default/placeholder username from CapRover
- If Redis requires authentication, this might fail
- If no auth required, this might be a weird default

**Fix (if using Upstash/Redis with auth):**
```bash
# Check your Redis provider for actual connection string
# For CapRover with password:
REDIS_URL=redis://default:password@srv-captain--redis:6379

# For Upstash without auth:
REDIS_URL=redis://default@srv-captain--redis:6379
```

**Action Required:**
- Verify Redis connection works in production
- Check provider docs for correct connection string format
- Update if auth is failing

---

### 3. Email Configuration (Potential Issue)

**Current:**
```bash
ADMIN_EMAILS=tmoretvid@gmail.com,admin@vyydecourt.site
```

**Issues:**
1. Variable name is `ADMIN_EMAILS` (plural) but should likely be `ADMIN_EMAIL`
2. Multiple emails comma-separated - this might not work with your email service
3. Resend/Coolify typically expect single email

**Fix:**
```bash
# If you need admin email for notifications:
ADMIN_EMAIL=tmoretvid@gmail.com

# If you need sender addresses:
RESEND_FROM_EMAIL=tmoretvid@gmail.com
RESEND_ADMIN_EMAIL=admin@vyydecourt.site
```

**Action Required:**
- Update email service integration to use correct variable name
- Verify emails are actually sending from this address

---

### 4. Encryption Key (Weak?)

**Current:**
```bash
ENCRYPTION_KEY=e3886d38650a5680518e7ab178f1d2344f878480174a74c302bdd84630b0b344
```

**Analysis:**
- Length: 96 characters (hex) ✅ Good length
- Format: Looks like hex string ✅ Good
- Should be at least 32 bytes (64 hex chars) for AES-256 ✅ You're using 96 chars

**Status:** ✅ Appears correct for AES-256 encryption

---

### 5. CRON Secret (Short?)

**Current:**
```bash
CRON_SECRET=0118a51663dffb768c163f2a53340604
```

**Analysis:**
- Length: 32 hex characters = 16 bytes
- This is too short for modern security (should be 32+ bytes/64+ hex chars)
- Vercel Cron Jobs recommend 32+ character secrets

**Fix:**
```bash
# Generate a new secure secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use:
CRON_SECRET=<your-64-character-random-string-here>
```

**Action Required:**
- Regenerate CRON secret with longer string
- Update Vercel environment variable
- Test that cron jobs work after update

---

## 🔍 MISSING ENVIRONMENT VARIABLES

### Variables That Should Be Set:

#### 1. Site URL (CRITICAL - Already Causing Bugs)

```bash
# REQUIRED for email links to work correctly:
NEXT_PUBLIC_SITE_URL=https://app.vyydecourt.site
```

**Why You Need This:**
- Email verification links use `NEXT_PUBLIC_SITE_URL`
- Without this, links default to `localhost:3000`
- Users see `http://localhost:3000/auth/verify-email?token=...` instead of your domain

**Current Status:**
- ⚠️ **NOT SET** - This is causing your localhost bug!

#### 2. App URL (Optional, For Consistency)

```bash
# Next.js app URL (may duplicate NEXTAUTH_URL):
NEXT_PUBLIC_APP_URL=https://app.vyydecourt.site
```

#### 3. Additional Next.js Public Variables

```bash
# For production builds:
NEXT_PUBLIC_ANALYTICS_ID=your-google-analytics-id
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-if-using
```

#### 4. CORS Configuration (If Needed)

```bash
# If you have external integrations:
NEXT_PUBLIC_ALLOWED_ORIGINS=https://app.vyydecourt.site,https://www.vyydecourt.site
```

---

## ✅ CORRECT VARIABLES (Keep These!)

### CapRover (Your Database & Redis Provider)

```bash
✅ DATABASE_URL=postgres://postgres:b92649c46ee06b70@srv-captain--postgres:5432/postgres
✅ REDIS_URL=redis://default:J9OMd5X2d1RQ721gaFscyrOIoy8Rl@srv-captain--redis:6379
```

### Stripe (Payment Processing)

```bash
✅ STRIPE_SECRET_KEY=sk_live_...    # CORRECT - live mode
✅ STRIPE_PUBLISHABLE_KEY=pk_live_... # CORRECT - live mode
✅ STRIPE_WEBHOOK_SECRET=whsec_...  # CORRECT format
```

### NextAuth (Authentication)

```bash
✅ NEXTAUTH_URL=https://app.vyydecourt.site    # CORRECT
✅ AUTH_URL=https://app.vyydecourt.site          # CORRECT (same as above)
✅ NEXTAUTH_SECRET=799f7f4b5...           # OK (long random string)
✅ NEXTAUTH_TRUST_HOST=true                # CORRECT
```

### Production Mode

```bash
✅ NODE_ENV=production
```

### Security

```bash
✅ ENCRYPTION_KEY=e3886d38650a568...  # OK for AES-256
```

---

## 🎯 IMMEDIATE ACTION ITEMS (Priority Order)

### CRITICAL (Do Now)

1. ⚠️⚠️⚠️ **Set NEXT_PUBLIC_SITE_URL:**
   ```bash
   # Add to .env.production:
   NEXT_PUBLIC_SITE_URL=https://app.vyydecourt.site
   ```
   **Why:** This fixes the localhost bug in email verification links!

2. ⚠️⚠️⚠️ **Secure Your Stripe Keys:**
   ```bash
   # If .env was committed to Git:
   # 1. Regenerate all Stripe keys
   # 2. Update .env with new keys
   # 3. Rotate old keys in Stripe Dashboard
   ```

3. ⚠️⚠️⚠️ **Verify .gitignore:**
   ```bash
   # Add these lines to .gitignore:
   .env
   .env.local
   .env.production
   .env.development
   .env.staging
   ```

### HIGH (Do Today)

4. ⚠️ **Regenerate CRON_SECRET:**
   ```bash
   # Generate 64+ character random string
   # Update in Vercel environment variables
   ```

5. ⚠️ **Fix ADMIN_EMAILS:**
   ```bash
   # Change to singular and verify with your email service:
   ADMIN_EMAIL=tmoretvid@gmail.com
   ```

### MEDIUM (Do This Week)

6. ⚠️ **Update DATABASE_URL format:**
   ```bash
   # Change postgres:// to postgresql:// for consistency:
   DATABASE_URL=postgresql://postgres:...@srv-captain--postgres:5432/postgres
   ```

7. ⚠️ **Verify Redis Connection:**
   ```bash
   # Check if Redis is connecting correctly
   # Verify connection string format with CapRover
   ```

---

## 📋 ENVIRONMENT VARIABLES TEMPLATE

### Production (.env.production):

```bash
# ============ SECURITY ============
# Regenerate these if exposed in Git!
NEXTAUTH_SECRET=<your-new-64-char-random-string>
CRON_SECRET=<your-new-64-char-random-string>
ENCRYPTION_KEY=<your-encryption-key>

# ============ DATABASE ============
DATABASE_URL=postgresql://postgres:b92649c46ee06b70@srv-captain--postgres:5432/postgres

# ============ REDIS ============
REDIS_URL=<your-actual-redis-connection-string>

# ============ AUTH ============
NEXTAUTH_URL=https://app.vyydecourt.site
AUTH_URL=https://app.vyydecourt.site
NEXTAUTH_TRUST_HOST=true

# ============ EMAIL ============
ADMIN_EMAIL=tmoretvid@gmail.com
# For Resend/Coolify:
RESEND_API_KEY=<your-resend-api-key>

# ============ STRIPE ============
STRIPE_SECRET_KEY=sk_live_<new-regenerated-key>
STRIPE_PUBLISHABLE_KEY=pk_live_<new-regenerated-key>
STRIPE_WEBHOOK_SECRET=whsec_<new-webhook-secret>

# ============ APP ============
NEXT_PUBLIC_SITE_URL=https://app.vyydecourt.site
NODE_ENV=production

# ============ OPTIONAL ============
NEXT_PUBLIC_APP_URL=https://app.vyydecourt.site
NEXT_PUBLIC_ANALYTICS_ID=<if-using-analytics>
```

### Development (.env.local):

```bash
# ============ DATABASE ============
DATABASE_URL=postgresql://postgres:...@localhost:5432/postgres

# ============ REDIS ============
REDIS_URL=redis://localhost:6379

# ============ AUTH ============
NEXTAUTH_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
NEXTAUTH_TRUST_HOST=true
NEXTAUTH_SECRET=<dev-secret-should-be-different>

# ============ APP ============
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development

# ============ EMAIL ============
# Use Resend test key or email mock for dev
ADMIN_EMAIL=dev@example.com
```

---

## ✅ SUMMARY

### Your Configuration Status:

| Category | Status | Notes |
|----------|--------|--------|
| **Stripe** | ✅ LIVE keys correct format | ⚠️ Regenerate if exposed in Git |
| **NextAuth** | ✅ All correct | Domain properly set |
| **Database** | ⚠️ Works but should use `postgresql://` | CapRover connection OK |
| **Redis** | ⚠️ Check connection string | Username looks like placeholder |
| **Email** | ⚠️ Fix variable name | `ADMIN_EMAILS` → `ADMIN_EMAIL` |
| **CRON** | ⚠️ Too short (16 bytes) | Regenerate with 64+ chars |
| **NEXT_PUBLIC_SITE_URL** | ❌ MISSING | **CRITICAL - causing localhost bug** |

### Critical Issues:

1. ⚠️⚠️⚠️ **NEXT_PUBLIC_SITE_URL not set** - This causes email verification links to show `localhost:3000` instead of your production domain
2. ⚠️⚠️⚠️ **Stripe keys security** - Regenerate if exposed in Git
3. ⚠️ **CRON_SECRET too short** - Should be 64+ characters

### What You Need To Do RIGHT NOW:

```bash
# 1. Add this CRITICAL variable to your production environment:
NEXT_PUBLIC_SITE_URL=https://app.vyydecourt.site

# 2. Redeploy after adding it:
vercel --prod
# Or push to GitHub if using Vercel Git integration
```

---

## 🔐 Security Checklist

- [ ] **.gitignore contains .env and all .env.* files**
- [ ] **Stripe keys regenerated if .env was ever committed**
- [ ] **NEXT_PUBLIC_SITE_URL is set in production environment**
- [ ] **CRON_SECRET is 64+ characters**
- [ ] **ADMIN_EMAILS changed to ADMIN_EMAIL (singular)**
- [ ] **DATABASE_URL format changed to postgresql:// (optional)**
- [ ] **Redis connection string verified**
- [ ] **Email service tested with new admin email variable**
