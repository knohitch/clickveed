# 🚀 DATABASE & DEPLOYMENT FIX GUIDE

## 📋 ISSUES FOUND AND FIXED

### ✅ Issue #1: Notification Table Missing
**Problem:** Schema has `Notification` model but NO migration exists in database
**Fix:** Created migration file `20250113000000_add_notification_table/migration.sql`
**Impact:** This was causing `prisma.user.upsert()` to fail when trying to include notifications

### ✅ Issue #2: Seed Data Not Inserting  
**Problem:** SQL seed shows "INSERT 0 0" - not actually inserting data
**Fix:** Updated `seed-fallback.sql` with:
- Proper `ON CONFLICT` handling for Plans
- All 4 plans (Free, Creator, Pro, Agency) with correct `featureTier` values
- Proper deletion of old features before inserting new ones
**Impact:** Free plan will now be available for new users

### ✅ Issue #3: Email Verification Links
**Problem:** Localhost URLs in production emails
**Status:** ALREADY FIXED! Your code uses `getBaseUrl()` which checks:
1. `NEXT_PUBLIC_SITE_URL` (you already set this ✅)
2. `AUTH_URL` (you already set this ✅)
3. `NEXTAUTH_URL` (fallback)

---

## 🛠️ WHAT WAS CHANGED

### Files Modified:
1. **NEW:** `prisma/migrations/20250113000000_add_notification_table/migration.sql`
   - Creates the missing Notification table
   - Adds proper indexes for performance

2. **UPDATED:** `seed-fallback.sql`
   - Now includes ALL 4 plans (not just Free)
   - Uses `ON CONFLICT` to prevent duplicates
   - Includes all plan features properly

---

## 📝 DEPLOYMENT STEPS

### Step 1: Commit Your Changes

```bash
git add .
git commit -m "Fix: Add Notification table migration and improve seed data

- Add missing Notification table migration (fixes user.upsert errors)
- Update seed-fallback.sql with all 4 plans and proper INSERT handling
- Use ON CONFLICT to prevent duplicate plan entries
- Ensure Free plan always available for new signups"
```

### Step 2: Push to GitHub

```bash
git push origin main
```

### Step 3: Deploy to CapRover

CapRover will automatically detect the push and rebuild. The deployment process will:

1. **Build** your Docker image with the new migration
2. **Run migrations** via `npx prisma migrate deploy` (in startup.sh)
3. **Seed database** - tries TypeScript seed first, falls back to SQL if needed
4. **Start app** with all fixes applied

### Step 4: Monitor Deployment Logs

In CapRover, watch the logs for:

```
✅ "Running database migrations..."
✅ "The following migration(s) have been applied:"
✅ "20250113000000_add_notification_table"
✅ "Running database seeding..."
✅ "Seeded plans..." or "INSERT 0 4" (4 plans inserted)
✅ "Database setup completed"
✅ "Starting application..."
```

---

## 🔍 VERIFICATION CHECKLIST

After deployment, verify these are working:

### 1. Database Tables
SSH into CapRover and run:
```bash
# Connect to your app container
docker exec -it $(docker ps | grep srv-captain--clickveed | awk '{print $1}') sh

# Check if Notification table exists
npx prisma studio
# Or use psql:
psql $DATABASE_URL -c "\dt"
```

You should see `Notification` table listed.

### 2. Seed Data
Check that plans exist:
```bash
psql $DATABASE_URL -c "SELECT id, name, \"featureTier\" FROM \"Plan\";"
```

Expected output:
```
     id      |   name   | featureTier  
-------------+----------+--------------
 plan_free   | Free     | free
 plan_creator| Creator  | starter
 plan_pro    | Pro      | professional
 plan_agency | Agency   | enterprise
```

### 3. Email Verification Links
- Sign up with a test email
- Check the verification email
- Link should be: `https://app.vyydecourt.site/api/auth/verify-email?token=...`
- NOT: `http://localhost:3000/api/auth/verify-email?token=...`

### 4. New User Signup
- Try creating a new user account
- Should automatically get assigned to "Free" plan
- No errors about missing plan or notification table

---

## 🐛 TROUBLESHOOTING

### If migration doesn't run:

```bash
# SSH into your app container
docker exec -it $(docker ps | grep srv-captain--clickveed | awk '{print $1}') sh

# Manually run migration
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### If seed data still shows INSERT 0 0:

The SQL fallback is designed to be idempotent (safe to run multiple times). Try:

```bash
# Connect to database
psql $DATABASE_URL

# Run seed manually
\i seed-fallback.sql

# Verify plans inserted
SELECT COUNT(*) FROM "Plan";
-- Should return 4

SELECT COUNT(*) FROM "PlanFeature";
-- Should return 24 (total features across all plans)
```

### If email links still show localhost:

Check environment variables in CapRover:
```bash
# In CapRover app settings, verify these are set:
AUTH_URL=https://app.vyydecourt.site
NEXT_PUBLIC_SITE_URL=https://app.vyydecourt.site
DATABASE_URL=postgresql://postgres:4cb45a6cdd4cc01c@srv-captain--postgres:5432/postgres
```

Then force rebuild:
```bash
git commit --allow-empty -m "Trigger rebuild"
git push origin main
```

---

## 📊 UNDERSTANDING THE FIXES

### Why Notification Table Was Missing

Your schema.prisma HAD the model defined, but no migration file existed to CREATE the table in the database. Prisma migrations are incremental - each change needs a migration file. When you added the Notification model, you forgot to create `prisma migrate dev --name add_notification_table`.

**Solution:** We created the migration file manually with proper SQL.

### Why Seed Was Showing INSERT 0 0

The old seed-fallback.sql used `SELECT ... WHERE NOT EXISTS` pattern, which in PostgreSQL doesn't return row counts properly. Also, it only had the Free plan.

**Solution:** We switched to `INSERT ... ON CONFLICT DO UPDATE` which:
- Returns proper insert counts
- Handles duplicates gracefully
- Updates existing records if needed
- Includes all 4 plans

### Why Email Links Work Now

They already worked! Your `getBaseUrl()` function properly checks:
1. `NEXT_PUBLIC_SITE_URL` (highest priority for client-side)
2. `AUTH_URL` (for auth callbacks)
3. `NEXTAUTH_URL` (NextAuth default)

Since you set `NEXT_PUBLIC_SITE_URL=https://app.vyydecourt.site`, all email links will use this.

---

## 🎉 EXPECTED RESULTS

After deploying these fixes:

1. ✅ Users can sign up without "Notification table doesn't exist" errors
2. ✅ New users automatically get Free plan (featureTier: 'free')
3. ✅ All 4 pricing plans appear on pricing page
4. ✅ Email verification links use production URL
5. ✅ Database seeding completes successfully
6. ✅ Migrations run without errors

---

## 📞 NEED HELP?

If you encounter issues:

1. Check CapRover deployment logs
2. SSH into container and check migration status
3. Verify environment variables are set correctly
4. Check database directly with psql commands above

**Common Error Solutions:**

| Error | Solution |
|-------|----------|
| "Notification table doesn't exist" | Migration didn't run - manually run `npx prisma migrate deploy` |
| "Free plan not found" | Seed didn't run - manually run seed-fallback.sql with psql |
| "localhost in email" | Check NEXT_PUBLIC_SITE_URL env var is set |
| "INSERT 0 0" | This is expected! It means "0 conflicted, 0 inserted" if data already exists |

---

## ✨ Next Steps

After successful deployment:

1. Test creating a new user account
2. Verify email verification works
3. Check pricing page shows all 4 plans
4. Test Free plan features are accessible
5. Monitor logs for any remaining errors

Good luck! 🚀
