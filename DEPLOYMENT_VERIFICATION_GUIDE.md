# Deployment Verification Guide - Caprover & Coolify

This guide provides step-by-step verification procedures for deploying the bug-fixed application to Caprover and Coolify platforms.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Caprover Deployment](#caprover-deployment)
3. [Coolify Deployment](#coolify-deployment)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Common Issues & Solutions](#common-issues--solutions)

---

## Pre-Deployment Checklist

Before deploying to either platform, ensure:

### 1. Code Preparation

- [ ] All bug fixes have been committed to git
- [ ] Code is pushed to the `claude/fix-email-verification-link-Xq22E` branch
- [ ] Database migrations are ready
- [ ] Environment variables are documented

### 2. Required Environment Variables

Create a `.env.production` file or prepare to enter these in the platform UI:

```bash
# Application URL (CRITICAL - must be set correctly)
NEXTAUTH_URL="https://yourdomain.com"

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication
AUTH_SECRET="your-256-bit-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
AUTH_TRUST_HOST="true"

# Email
SMTP_HOST="your-smtp-host"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
FROM_EMAIL="noreply@yourdomain.com"

# Storage
WASABI_ENDPOINT="s3.us-west-1.wasabisys.com"
WASABI_REGION="us-west-1"
WASABI_ACCESS_KEY_ID="your-key"
WASABI_SECRET_ACCESS_KEY="your-secret"
WASABI_BUCKET="your-bucket"

# Optional: Stripe (can be configured via admin panel after deployment)
# STRIPE_SECRET_KEY="sk_live_..."
# STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

### 3. Database Setup

- [ ] PostgreSQL database is running
- [ ] Database credentials are correct
- [ ] Database is accessible from the deployment platform
- [ ] Sufficient storage space available

---

## Caprover Deployment

### Step 1: Caprover Configuration

1. **Log in to Caprover dashboard:**
   ```
   https://captain.yourdomain.com
   ```

2. **Create a new app:**
   - Click "Apps"
   - Click "Create New App"
   - App name: `clickveed` (or your preferred name)
   - Select "Has persistent data" if using local storage

3. **Configure the app:**
   - Navigate to your app settings
   - Enable HTTPS
   - Set up your domain (e.g., `app.yourdomain.com`)
   - Enable "Force HTTPS"

### Step 2: Environment Variables

In the Caprover app settings, add all environment variables:

**Critical Variables:**
```
NEXTAUTH_URL = https://app.yourdomain.com
DATABASE_URL = postgresql://...
AUTH_SECRET = your-secret
NEXTAUTH_SECRET = your-secret
AUTH_TRUST_HOST = true
NODE_ENV = production
PORT = 3000
```

**Email Variables:**
```
SMTP_HOST = smtp.example.com
SMTP_PORT = 587
SMTP_USER = user@example.com
SMTP_PASS = password
FROM_EMAIL = noreply@yourdomain.com
```

**Storage Variables:**
```
WASABI_ENDPOINT = s3.us-west-1.wasabisys.com
WASABI_REGION = us-west-1
WASABI_ACCESS_KEY_ID = your-key
WASABI_SECRET_ACCESS_KEY = your-secret
WASABI_BUCKET = your-bucket
```

### Step 3: Deploy the Application

**Option A: Deploy from GitHub**

1. **Connect GitHub repository:**
   - In app settings, go to "Deployment" tab
   - Select "Method 3: Deploy from Github/Bitbucket/Gitlab"
   - Enter repository details:
     - Repository: `https://github.com/yourusername/clickveed`
     - Branch: `claude/fix-email-verification-link-Xq22E`
   - Add deploy key if private repo

2. **Configure build settings:**
   - Caprover will automatically detect the Dockerfile
   - No additional configuration needed

3. **Trigger deployment:**
   - Click "Force Build"
   - Monitor build logs

**Option B: Deploy via CLI**

```bash
# Install Caprover CLI
npm install -g caprover

# Login to your Caprover instance
caprover login

# Deploy the app
caprover deploy -a clickveed -b claude/fix-email-verification-link-Xq22E
```

### Step 4: Database Migration

Once the app is deployed but before it starts serving traffic:

1. **Access app container:**
   ```bash
   # SSH into Caprover host
   ssh user@your-caprover-host

   # Find the container
   docker ps | grep clickveed

   # Access the container
   docker exec -it <container-id> sh
   ```

2. **Run migrations:**
   ```bash
   # Inside container
   npx prisma migrate deploy
   npx prisma db seed
   ```

3. **Exit container:**
   ```bash
   exit
   ```

### Step 5: Verification

- [ ] App is running (check Caprover logs)
- [ ] HTTPS is working
- [ ] Domain resolves correctly
- [ ] Database connection is successful
- [ ] Navigate to `https://app.yourdomain.com`
- [ ] Sign up page loads
- [ ] Proceed with Bug Fixes Testing Guide

---

## Coolify Deployment

### Step 1: Coolify Project Setup

1. **Log in to Coolify:**
   ```
   https://coolify.yourdomain.com
   ```

2. **Create a new project:**
   - Click "New Project"
   - Project name: `ClickVeed Production`

3. **Add a new resource:**
   - Click "New Resource"
   - Select "Application"
   - Choose "Public Repository" or "Private Repository"

### Step 2: Repository Configuration

1. **Connect repository:**
   - Repository URL: `https://github.com/yourusername/clickveed`
   - Branch: `claude/fix-email-verification-link-Xq22E`
   - If private, add SSH key or access token

2. **Build configuration:**
   - Build method: `Dockerfile`
   - Dockerfile path: `./Dockerfile`
   - Docker Compose: Not needed (using standalone Dockerfile)

3. **Set build arguments:**
   ```
   CACHE_BUST=1
   ```

### Step 3: Environment Variables

In Coolify application settings, add environment variables:

**Critical Variables:**
```bash
NEXTAUTH_URL=https://app.yourdomain.com
DATABASE_URL=postgresql://user:password@postgres-host:5432/clickveed
AUTH_SECRET=your-256-bit-secret
NEXTAUTH_SECRET=your-256-bit-secret
AUTH_TRUST_HOST=true
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

**Important Note for Coolify:**
- Set `AUTH_TRUST_HOST=true` (required for reverse proxy)
- If NEXTAUTH_URL is not set, app will use request headers automatically

**All other variables:** (Add as per Caprover section)

### Step 4: Network Configuration

1. **Domain setup:**
   - In application settings → "Domains"
   - Add domain: `app.yourdomain.com`
   - Enable "Force HTTPS"
   - Enable "Auto SSL" (Let's Encrypt)

2. **Port configuration:**
   - Internal port: `3000`
   - Public port: `443` (HTTPS) / `80` (HTTP)

### Step 5: Database Setup

**Option A: Use Coolify PostgreSQL**

1. **Create PostgreSQL database:**
   - In same project, click "New Resource"
   - Select "Database" → "PostgreSQL"
   - Database name: `clickveed-db`
   - Username: `clickveed`
   - Password: (auto-generated or set custom)

2. **Get connection details:**
   - Coolify will provide DATABASE_URL
   - Copy and paste into app environment variables

**Option B: Use External Database**

- Enter external DATABASE_URL in environment variables
- Ensure database is accessible from Coolify network

### Step 6: Deploy

1. **Trigger deployment:**
   - Click "Deploy" button
   - Monitor build logs in real-time

2. **Build process:**
   - Coolify will:
     - Clone repository
     - Build Docker image using Dockerfile
     - Run database migrations (via startup.sh)
     - Start the application

3. **Monitor logs:**
   - Check for any errors
   - Verify migrations ran successfully
   - Confirm app is listening on port 3000

### Step 7: Post-Deployment Database Setup

If database migrations didn't run automatically:

1. **Access application shell:**
   - In Coolify, go to application → "Shell"
   - Or SSH to Coolify host and docker exec

2. **Run migrations manually:**
   ```bash
   # Using Coolify shell
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Step 8: Verification

- [ ] Application is "Running" in Coolify
- [ ] HTTPS certificate is active
- [ ] Domain resolves correctly
- [ ] No errors in logs
- [ ] Navigate to `https://app.yourdomain.com`
- [ ] Proceed with Bug Fixes Testing Guide

---

## Post-Deployment Verification

After deploying to either platform, verify all bug fixes:

### 1. Quick Smoke Test

```bash
# Test homepage loads
curl -I https://app.yourdomain.com
# Should return 200 OK

# Test signup page
curl https://app.yourdomain.com/signup
# Should return HTML

# Test API health (if you have health endpoint)
curl https://app.yourdomain.com/api/health
```

### 2. Application Health Checks

- [ ] Homepage loads without errors
- [ ] Signup page accessible
- [ ] Login page accessible
- [ ] Database connection working
- [ ] No critical errors in logs

### 3. Bug Fix Verification

Follow the **BUG_FIXES_TESTING_GUIDE.md** to verify each bug is fixed:

1. **Email Verification (Bug #1)**
   - Sign up new user
   - Check email verification link
   - Verify link format: `https://app.yourdomain.com/api/auth/verify-email?token=...`

2. **Admin Approval (Bug #2)**
   - Admin approves user
   - Check approval email
   - Verify login link: `https://app.yourdomain.com/login`

3. **Stripe Payment (Bug #3, #4, #6)**
   - Add Stripe keys via admin panel
   - Test upgrade flow
   - Verify checkout redirect URLs

4. **Navigation (Bug #5, #7)**
   - Test all menu items
   - Verify video creation tools
   - Check API functionality pages

### 4. Environment-Specific Checks

**For Caprover:**
- [ ] Check reverse proxy headers are passed correctly
- [ ] Verify `x-forwarded-proto` is set to `https`
- [ ] Confirm `host` header contains correct domain

**For Coolify:**
- [ ] Verify auto-SSL certificate is installed
- [ ] Check reverse proxy configuration
- [ ] Confirm environment variables are loaded

---

## Common Issues & Solutions

### Issue 1: "NEXTAUTH_URL is not set" Error

**Symptoms:**
- Email links still show "undefined"
- Login redirects fail

**Solution:**
```bash
# Verify environment variable is set
# In container:
echo $NEXTAUTH_URL
# Should output: https://app.yourdomain.com

# If not set, add it in platform UI and redeploy
```

**Fallback:**
Even if not set, the app now uses request headers. Check logs for:
```
NEXTAUTH_URL not configured, using localhost fallback
```

### Issue 2: Stripe Keys Not Working

**Symptoms:**
- Payment upgrade fails
- "Stripe is not configured" error

**Solution:**
1. Navigate to `/chin/dashboard/api-integrations` (as Super Admin)
2. Enter Stripe keys
3. Save settings
4. **New:** Cache is now automatically invalidated
5. Test immediately (no restart needed)

Check logs for:
```
Stripe key changed, invalidating cached instance
Creating new Stripe instance
```

### Issue 3: Menu Items Not Clickable

**Symptoms:**
- Clicking menu items does nothing
- No navigation occurs

**Solution:**
This should be fixed with the navigation updates. If still occurring:

1. Check browser console for JavaScript errors
2. Verify app was built with latest code
3. Clear browser cache
4. Hard refresh (Ctrl+Shift+R)

### Issue 4: Database Connection Fails

**Symptoms:**
- "P1001: Can't reach database server" error
- App crashes on startup

**Solution:**
```bash
# Verify DATABASE_URL format
# Should be:
postgresql://user:password@host:5432/database

# For Coolify internal database:
postgresql://clickveed:password@clickveed-db:5432/clickveed

# Test connection from container
# In app shell:
npx prisma db execute --stdin <<< "SELECT 1"
```

### Issue 5: Email Sending Fails

**Symptoms:**
- Verification emails not received
- SMTP errors in logs

**Solution:**
1. Verify SMTP credentials are correct
2. Check SMTP_PORT (587 for TLS, 465 for SSL)
3. Test SMTP connection:
   ```bash
   # Use test script or check logs
   # Look for: "Email sent successfully" or SMTP errors
   ```

### Issue 6: Build Fails

**Symptoms:**
- Deployment fails during build
- Out of memory errors

**Solution:**
```dockerfile
# Already configured in Dockerfile:
ENV NODE_OPTIONS="--max-old-space-size=6144"

# If still failing, increase in platform settings:
# Caprover: Increase container memory limit
# Coolify: Increase build memory
```

### Issue 7: Prisma Generate Fails

**Symptoms:**
- "Prisma Client not generated" error
- Build fails at Prisma generation step

**Solution:**
```bash
# This is handled in Dockerfile:
RUN npx prisma generate

# If fails, check OpenSSL installation in logs:
# Should see: OpenSSL 1.1.x

# Manually run in container if needed:
docker exec -it <container> npx prisma generate
```

---

## Deployment Rollback Procedures

### Caprover Rollback

1. **Via UI:**
   - Go to app settings
   - Navigate to "Deployment" tab
   - Find previous successful build
   - Click "Deploy this version"

2. **Via CLI:**
   ```bash
   caprover deploy -a clickveed -i previous-image-name
   ```

### Coolify Rollback

1. **Redeploy previous commit:**
   - Change branch to previous working commit
   - Or use git tag of previous version
   - Click "Deploy"

2. **Manual rollback:**
   ```bash
   # SSH to Coolify host
   docker ps  # Find container ID
   docker stop <container-id>
   docker start <previous-container-id>
   ```

---

## Performance Optimization

After successful deployment, consider:

### 1. Caching

- [ ] Enable Redis for session storage (future enhancement)
- [ ] Configure CDN for static assets
- [ ] Enable Next.js image optimization

### 2. Monitoring

- [ ] Set up application monitoring (Sentry, New Relic)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring

### 3. Scaling

**Caprover:**
- Increase instances count in app settings
- Configure load balancing

**Coolify:**
- Enable horizontal scaling
- Configure replica count

---

## Success Checklist

Deployment is successful when:

- [ ] Application is accessible via HTTPS
- [ ] All 7 bugs are verified as fixed
- [ ] Email sending works (verification emails)
- [ ] Stripe payment flow works (if configured)
- [ ] All menu navigation works
- [ ] Database connection stable
- [ ] No critical errors in logs
- [ ] Super admin can log in
- [ ] Regular users can sign up and verify
- [ ] Performance is acceptable (< 2s page load)

---

## Next Steps After Deployment

1. **User Acceptance Testing:**
   - Follow BUG_FIXES_TESTING_GUIDE.md completely
   - Test all user roles (User, Admin, Super Admin)
   - Verify all features work as expected

2. **Monitoring Setup:**
   - Configure error tracking
   - Set up performance monitoring
   - Enable uptime monitoring

3. **Documentation:**
   - Update internal documentation with production URLs
   - Document any environment-specific configurations
   - Create runbook for common issues

4. **Communication:**
   - Notify users of updates (if applicable)
   - Update status page
   - Announce new features/fixes

---

## Support & Troubleshooting

For deployment issues:

1. **Check application logs first:**
   - Caprover: App settings → Logs tab
   - Coolify: Application → Logs

2. **Verify environment variables:**
   - All required variables are set
   - NEXTAUTH_URL matches actual domain
   - DATABASE_URL is correct

3. **Review deployment guides:**
   - DEPLOYMENT_GUIDE.md (main guide)
   - COOLIFY_DEPLOYMENT_GUIDE.md (Coolify-specific)
   - CAPROVER_STEPS.txt (Caprover-specific)

4. **Test locally first:**
   ```bash
   # Run in production mode locally
   NODE_ENV=production npm run build
   NODE_ENV=production npm run start
   ```

---

## Conclusion

This deployment verification guide ensures:
- ✅ All bug fixes are properly deployed
- ✅ Applications work correctly on Caprover and Coolify
- ✅ Environment configurations are correct
- ✅ Common issues are addressed
- ✅ Rollback procedures are documented

For any issues not covered here, refer to the comprehensive DEPLOYMENT_GUIDE.md or open a support ticket.
