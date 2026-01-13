# 📍 WHERE TO RUN COMMANDS - Simple Guide

## Part 1: Deploy Your Fixes (Run on YOUR COMPUTER)

Open **Git Bash** or **Command Prompt** on your Windows machine in the `clickveed` folder:

```bash
# These run on YOUR LOCAL MACHINE (Windows)
git add .
git commit -m "Fix: Add Notification table migration and improve seed data"
git push origin main
```

**What happens next:** CapRover automatically detects the push and rebuilds your app

---

## Part 2: Monitor Deployment (Use CapRover Web Interface)

1. Open your browser
2. Go to your CapRover dashboard (e.g., `https://captain.your-server.com`)
3. Click on your app (`clickveed`)
4. Click **"Deployment"** tab
5. Watch the logs in real-time

**What to look for:**
```
✅ Running database migrations...
✅ The following migration(s) have been applied:
✅   20250113000000_add_notification_table
✅ Running database seeding...
✅ Seeded plans...
✅ Starting application...
```

---

## Part 3: Verify (OPTIONAL - Use PuTTY)

**Skip this if deployment logs look good!** Only needed if you want to double-check.

### Option A: Use CapRover Web Terminal (EASIEST)

1. In CapRover dashboard, go to your app
2. Click **"App Configs"** tab
3. Scroll down to **"Execute a Command"**
4. Enter these commands one at a time:

```bash
npx prisma migrate status
```

```bash
psql $DATABASE_URL -c "SELECT id, name FROM \"Plan\";"
```

### Option B: Use PuTTY (If you prefer SSH)

1. Open **PuTTY**
2. Connect to your CapRover server
3. Login with your SSH credentials
4. Run these commands:

```bash
# Connect to your app container
docker exec -it $(docker ps | grep srv-captain--clickveed | awk '{print $1}') sh

# Inside container, check migration status
npx prisma migrate status

# Check if all 4 plans exist
psql $DATABASE_URL -c "SELECT id, name FROM \"Plan\";"

# Exit container
exit
```

---

## 🎯 SIMPLE 3-STEP PROCESS

### Step 1: On Your Windows Computer
```bash
git add .
git commit -m "Fix: Add Notification table migration and improve seed data"
git push origin main
```

### Step 2: In CapRover Dashboard (Web Browser)
- Open CapRover
- Go to your app → Deployment tab
- Watch the logs
- Wait for "Starting application..."

### Step 3: Test Your App (Web Browser)
- Go to https://app.vyydecourt.site/signup
- Try creating a test account
- If it works without errors, you're done! ✅

---

## ❓ FAQ

**Q: Do I NEED to run the verification commands?**  
A: No! They're optional. If deployment logs show success and your app works, you're good.

**Q: Where is PuTTY needed?**  
A: Only for verification commands (Part 3). You can also use CapRover's web terminal instead.

**Q: What if I don't have PuTTY?**  
A: Use CapRover's built-in web terminal (Option A in Part 3) or just test the app directly.

**Q: Can I just deploy and test?**  
A: Yes! That's the recommended approach:
1. Push to git (on your computer)
2. Wait for CapRover to deploy
3. Test signup at https://app.vyydecourt.site/signup
4. If it works, you're done!

---

## 🚨 What If Something Goes Wrong?

If deployment fails:

1. Check CapRover logs for error messages
2. Use PuTTY to SSH into server
3. Manually run migration:
```bash
docker exec -it $(docker ps | grep srv-captain--clickveed | awk '{print $1}') npx prisma migrate deploy
```

**Need more help?** Check `DEPLOYMENT_FIX_GUIDE.md` for detailed troubleshooting.

---

## ✅ RECOMMENDED WORKFLOW (Simplest)

1. **On Windows:** Push your code with git commands above
2. **In Browser:** Watch CapRover logs
3. **In Browser:** Test https://app.vyydecourt.site/signup
4. **Done!** 🎉

You only need PuTTY if something goes wrong or you want to manually verify the database.
