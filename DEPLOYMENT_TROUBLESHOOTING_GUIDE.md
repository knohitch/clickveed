# Production Deployment Troubleshooting Guide

## Critical Login Error: "An unexpected error occurred during login"

### Root Cause
Your environment variables have incorrect values that prevent NextAuth from working properly in production.

### The Problem

In your environment, you have:
```bash
NEXTAUTH_TRUST_HOST=1
```

But the code in `src/auth.ts` checks for:
```typescript
trustHost: process.env.AUTH_TRUST_HOST === 'true',
```

This causes a mismatch where:
1. Code expects `AUTH_TRUST_HOST` (not `NEXTAUTH_TRUST_HOST`)
2. Code expects the string value `"true"` (not the number `1`)
3. The boolean check fails, causing authentication to fail

### Solution

Update your environment variables to use the correct format:

```bash
# Remove or comment out this line:
# NEXTAUTH_TRUST_HOST=1

# Add this line instead:
AUTH_TRUST_HOST=true
```

If you're using Docker or a deployment platform, update your environment variables there.

### Complete Working Environment Variables for Production

Based on your deployment at `https://app.vyydecourt.site`, here are the correct environment variables:

```bash
# ============================================
# CRITICAL: Authentication Configuration
# ============================================
NEXTAUTH_URL=https://app.vyydecourt.site
AUTH_URL=https://app.vyydecourt.site
NEXTAUTH_SECRET=3jiaKO53fZFRJcj0vSyly3iJMCESV/4R9c/g4SC+jWA=
AUTH_SECRET=3jiaKO53fZFRJcj0vSyly3iJMCESV/4R9c/g4SC+jWA=
AUTH_TRUST_HOST=true  # <-- CRITICAL: Must be "true" not "1"

# ============================================
# Database & Redis
# ============================================
DATABASE_URL=postgresql://postgres:4cb45a6cdd4cc01c@srv-captain--postgres:5432/postgres
REDIS_URL=redis://:wy4y4y47y4uy44y477tkkty@srv-captain--redis:6379

# ============================================
# Security
# ============================================
ENCRYPTION_KEY=4a3496814e9593a3c8d94aefc0e713356f17862855e81390baee7a4cda99d8d9
ADMIN_EMAILS=tmoretvid@gmail.com,admin@vyydecourt.site

# ============================================
# Payment (Stripe)
# ============================================
STRIPE_SECRET_KEY=bug
STRIPE_PUBLISHABLE_KEY=pbuyg
STRIPE_WEBHOOK_SECRET=bug

# ============================================
# Application
# ============================================
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://app.vyydecourt.site
CRON_SECRET=ccd51c93fbf65282fbae87ab5bdd3b6bf38f40f8e6676c026828a2a3842e41f0

# ============================================
# Email (Configure these for email functionality)
# ============================================
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_USER=noreply@vyydecourt.site
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@vyydecourt.site
FROM_NAME="Vyyde Court"

# ============================================
# Storage & CDN (Configure these for file uploads)
# ============================================
WASABI_ENDPOINT=s3.us-west-1.wasabisys.com
WASABI_REGION=us-west-1
WASABI_ACCESS_KEY_ID=your-wasabi-key
WASABI_SECRET_ACCESS_KEY=your-wasabi-secret
WASABI_BUCKET=your-bucket
BUNNY_CDN_URL=https://your-zone.b-cdn.net
BUNNY_API_KEY=your-bunny-key

# ============================================
# AI Providers (Configure based on your needs)
# ============================================
OPENAI_API_KEY=your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
# ... other AI provider keys
```

### Quick Fix

If you're using Docker/Caprover/Coolify, update your environment variables in your deployment platform:

1. **Remove:** `NEXTAUTH_TRUST_HOST=1`
2. **Add:** `AUTH_TRUST_HOST=true`
3. **Restart** your application

### Updating Environment Variables by Platform

#### CapRover
```bash
cd /captain/data/apps/your-app-name
echo 'AUTH_TRUST_HOST=true' >> .env
caporver restart --app your-app-name
```

#### Coolify
1. Go to your project in Coolify
2. Click on your deployed application
3. Scroll to "Environment Variables"
4. Remove `NEXTAUTH_TRUST_HOST`
5. Add `AUTH_TRUST_HOST` with value `true`
6. Click "Save" and redeploy

#### Docker Compose
Edit your `docker-compose.yml`:
```yaml
environment:
  # ... other variables
  - AUTH_TRUST_HOST=true  # Change from NEXTAUTH_TRUST_HOST=1
```

Then restart:
```bash
docker-compose down && docker-compose up -d
```

#### Direct Environment
If you're setting environment variables directly on your server:
```bash
export AUTH_TRUST_HOST=true
export NEXTAUTH_TRUST_HOST=  # (leave empty or remove)
```

### Verification

After updating the environment variable:

1. Restart your application
2. Navigate to `https://app.vyydecourt.site/login`
3. Try logging in with your super admin credentials
4. You should be redirected to `/chin/dashboard` successfully

If you still get the "unexpected error" message, check your logs:
```bash
docker logs your-app-container-id
# or
cd /captain/data/logs/your-app-name && tail -f *.log
```

### Additional Troubleshooting

#### Check Database Connection
Ensure your database is accessible from your application container:
```bash
# Test from inside the container
docker exec -it your-app-container-id bash
psql $DATABASE_URL
```

#### Check Redis Connection
```bash
docker exec -it your-app-container-id bash
redis-cli -u $REDIS_URL ping
```

#### Verify Environment Variables
```bash
# Check loaded environment variables
docker exec your-app-container-id env | grep -E "(AUTH|NEXTAUTH)"
```

### Reference Files

- `.env.production.example` - Complete production environment template
- `TEST_LOGIN_FIX.md` - Previous login loop fix (different issue)
- `src/auth.ts` line 68-69 - Where AUTH_TRUST_HOST is checked
