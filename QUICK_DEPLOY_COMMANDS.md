# 🚀 QUICK DEPLOYMENT COMMANDS

## Copy-Paste These Commands (In Order)

### 1️⃣ Commit Changes
```bash
git add .
git commit -m "Fix: Add Notification table migration and improve seed data"
git push origin main
```

### 2️⃣ Wait for CapRover Auto-Deploy
- CapRover will automatically rebuild when it detects the push
- Monitor logs in CapRover dashboard

### 3️⃣ Verify Deployment (Optional)
After deployment completes, verify:

```bash
# Connect to your app container (replace clickveed with your app name)
docker exec -it $(docker ps | grep srv-captain--clickveed | awk '{print $1}') sh

# Check migration status
npx prisma migrate status

# Check if Notification table exists
psql $DATABASE_URL -c "\dt" | grep Notification

# Check if all 4 plans exist
psql $DATABASE_URL -c "SELECT id, name FROM \"Plan\";"

# Exit container
exit
```

---

## What Was Fixed?

✅ **Notification Table** - Created missing migration
✅ **Seed Data** - All 4 plans now insert properly  
✅ **Email Links** - Already working correctly

---

## Expected Log Output

When deployment succeeds, you should see:

```
Running database migrations...
The following migration(s) have been applied:

  20250113000000_add_notification_table

Running database seeding...
Seeded plans...
Database setup completed
Starting application...
```

---

## If Something Goes Wrong

### Migration Failed?
```bash
docker exec -it $(docker ps | grep srv-captain--clickveed | awk '{print $1}') sh
npx prisma migrate deploy
```

### Seed Failed?
```bash
psql $DATABASE_URL -f seed-fallback.sql
```

### Force Rebuild?
```bash
git commit --allow-empty -m "Trigger rebuild"
git push origin main
```

---

## Test After Deployment

1. Go to https://app.vyydecourt.site/signup
2. Create a test account
3. Check email for verification link
4. Link should be: `https://app.vyydecourt.site/api/auth/verify-email?token=...`
5. Verify you can access Free plan features

---

**That's it!** Just run the commands above and your fixes will deploy. 🎉
