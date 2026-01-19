# CRITICAL Environment Variables Setup Guide

## 🚨 Required for App to Work

Your app is not working because critical environment variables are missing or misconfigured. 
Follow this checklist to fix it:

---

## 1. DATABASE (CRITICAL - App Won't Start Without This)

```env
DATABASE_URL="postgresql://username:password@your-host:5432/your-database"
```

**How to verify:** Visit `/api/diagnostics` - database check should show "healthy"

---

## 2. AUTHENTICATION (CRITICAL - Login/Signup Won't Work)

```env
# Generate a secure secret (at least 32 characters)
# Run this in terminal: openssl rand -base64 32
AUTH_SECRET="your-generated-secret-here"
NEXTAUTH_SECRET="same-as-auth-secret"
AUTH_TRUST_HOST="true"
```

---

## 3. BASE URL (CRITICAL - Email Verification Links Fail Without This)

```env
# Your production URL - MUST be set correctly!
NEXTAUTH_URL="https://your-actual-domain.com"
AUTH_URL="https://your-actual-domain.com"
NEXT_PUBLIC_SITE_URL="https://your-actual-domain.com"
```

**Example:** If your domain is `app.vyydecourt.site`, use:
```env
NEXTAUTH_URL="https://app.vyydecourt.site"
AUTH_URL="https://app.vyydecourt.site"
NEXT_PUBLIC_SITE_URL="https://app.vyydecourt.site"
```

---

## 4. STORAGE (REQUIRED - File Uploads Won't Work)

### Option A: Via Environment Variables
```env
WASABI_ENDPOINT="s3.us-west-1.wasabisys.com"
WASABI_REGION="us-west-1"
WASABI_ACCESS_KEY_ID="your-wasabi-access-key"
WASABI_SECRET_ACCESS_KEY="your-wasabi-secret-key"
WASABI_BUCKET="your-bucket-name"

# Optional CDN
BUNNY_CDN_URL="https://your-pullzone.b-cdn.net"
```

### Option B: Via Admin Panel (Super Admin Dashboard > Settings > Storage)
After logging in as Super Admin, configure storage settings in the admin panel.

---

## 5. ENCRYPTION KEY (REQUIRED for Social Connections)

```env
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="your-64-character-hex-string"
```

---

## 6. SMTP EMAIL (REQUIRED - Verification Emails Won't Send)

Configure in Admin Panel (Super Admin Dashboard > Settings > Email) OR via environment:

```env
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_USER="your-email@domain.com"
SMTP_PASS="your-smtp-password"
FROM_EMAIL="noreply@your-domain.com"
```

---

## Diagnostic Steps

### Step 1: Check Environment Variables
Visit: `https://your-domain.com/api/diagnostics`

This will show you:
- Which environment variables are set
- Database connection status
- Email configuration status
- Storage configuration status

### Step 2: Check Database Health
Visit: `https://your-domain.com/api/admin/db-health`

### Step 3: Test Email (After SMTP Setup)
1. Login as Super Admin
2. Go to Settings > Email
3. Click "Send Test Email"

---

## Common Issues & Fixes

### "Verification Link Expired" Error
**Cause:** NEXTAUTH_URL/AUTH_URL not set or incorrect
**Fix:** Set the correct production URL in all three:
- `NEXTAUTH_URL`
- `AUTH_URL`
- `NEXT_PUBLIC_SITE_URL`

### "Database Connection Failed"
**Cause:** DATABASE_URL not set or incorrect
**Fix:** Verify your PostgreSQL connection string

### "File Upload Failed"
**Cause:** Wasabi storage not configured
**Fix:** Configure storage via environment variables OR admin panel

### "Email Not Sending"
**Cause:** SMTP not configured
**Fix:** Configure SMTP settings in admin panel

---

## Quick Verification Checklist

After deployment, verify these URLs work:

1. [ ] `https://your-domain.com/api/health` - Should return healthy
2. [ ] `https://your-domain.com/api/diagnostics` - Check all systems
3. [ ] `https://your-domain.com/api/admin/db-health` - Database health
4. [ ] `https://your-domain.com/login` - Login page loads
5. [ ] `https://your-domain.com/signup` - Signup page loads

---

## Support

If issues persist after setting all environment variables:
1. Check server logs for specific errors
2. Restart your container/server after updating environment variables
3. Clear any caching layers (if using CDN/reverse proxy)
