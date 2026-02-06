# 🔧 FIX: No Space Left on Device Error

## ⚠️ The Problem

Your deployment failed with:
```
no space left on device
```

This means your CapRover server's disk is full. Docker builds create lots of temporary files that need to be cleaned up.

---

## ✅ THE FIX (Use PuTTY)

### Step 1: Connect via PuTTY

1. Open **PuTTY**
2. Enter your server IP address
3. Login with your SSH credentials

### Step 2: Clean Up Docker

Run these commands **one at a time** in PuTTY:

```bash
# 1. Clean up stopped containers
docker container prune -f

# 2. Clean up unused images
docker image prune -a -f

# 3. Clean up build cache (THIS IS THE BIG ONE)
docker builder prune -a -f

# 4. Clean up volumes (be careful, only if you're sure)
docker volume prune -f

# 5. Check how much space you freed
df -h
```

**Expected result:** You should see several GB freed up.

### Step 3: Trigger Rebuild

After cleaning up, force CapRover to rebuild:

**Option A - In CapRover Dashboard:**
1. Go to your app
2. Click "Deployment" tab
3. Click "Force Rebuild" or "Re-deploy"

**Option B - Push empty commit:**
On your Windows computer, run:
```bash
git commit --allow-empty -m "Trigger rebuild after disk cleanup"
git push origin main
```

---

## 🔍 Check Disk Space Before Cleaning

If you want to see current disk usage first:

```bash
# Check disk space
df -h

# Check Docker disk usage
docker system df
```

---

## 📊 What Each Command Does

| Command | What it removes | Safe? |
|---------|----------------|-------|
| `docker container prune -f` | Stopped containers | ✅ Yes |
| `docker image prune -a -f` | Unused images | ✅ Yes |
| `docker builder prune -a -f` | Build cache | ✅ Yes |
| `docker volume prune -f` | Unused volumes | ⚠️ Usually safe |

---

## 🎯 QUICK COPY-PASTE VERSION

Open PuTTY, connect to your server, then paste this entire block:

```bash
echo "Cleaning Docker to free disk space..."
docker container prune -f
docker image prune -a -f
docker builder prune -a -f
docker volume prune -f
echo "Cleanup complete! Checking disk space..."
df -h
echo "Docker disk usage:"
docker system df
```

---

## 🔄 After Cleanup

Once you've freed up space, your deployment will automatically retry (if you used CapRover's Force Rebuild), or push again:

```bash
git commit --allow-empty -m "Retry deployment"
git push origin main
```

---

## 💡 Prevent This in the Future

Run this cleanup command monthly on your server:

```bash
docker system prune -a -f --volumes
```

Or set up a cron job:
```bash
# Edit crontab
crontab -e

# Add this line to run cleanup every Sunday at 2 AM
0 2 * * 0 docker system prune -a -f
```

---

## 🆘 If You're Still Out of Space

If cleaning Docker doesn't help, you may need to:

1. **Upgrade your server's disk size** (in your hosting provider)
2. **Delete old logs:**
   ```bash
   journalctl --vacuum-time=7d
   ```
3. **Check what's using space:**
   ```bash
   du -sh /* | sort -h
   ```

---

## ✅ Expected Outcome

After running the cleanup:
- Docker should free 5-20 GB of space
- Your deployment will succeed
- The Notification migration will apply
- Seed data will insert properly

Ready to deploy! 🚀
