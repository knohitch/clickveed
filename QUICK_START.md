# Quick Start - Deploy Clickveed

Your 8GB VPS is perfect for this setup! ✅

## 🚀 Fastest Way to Deploy

### Step 1: Push to GitHub
```bash
git add .
git commit -m "ready for deployment"
git push origin main
```

### Step 2A: Deploy with Coolify

1. Open Coolify at `http://your-vps-ip:8000`
2. New Resource → Public Repository
3. Enter your GitHub repo URL
4. Add environment variables (see below)
5. Click Deploy
6. Done! ✅

### Step 2B: Deploy with CapRover

1. Install CLI: `npm install -g caprover`
2. In project folder: `caprover deploy`
3. Follow prompts to connect
4. Add environment variables in dashboard
5. Done! ✅

---

## 📝 Required Environment Variables

Copy and paste these (update the values):

```env
# Database (create PostgreSQL in Coolify/CapRover first)
DATABASE_URL=postgresql://postgres:yourpassword@host:5432/clickveed
DIRECT_URL=postgresql://postgres:yourpassword@host:5432/clickveed

# Auth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-min-32-characters-here
NEXTAUTH_URL=https://yourdomain.com

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional: Redis
REDIS_URL=redis://host:6379
```

### For CapRover specifically:
```env
DATABASE_URL=postgresql://postgres:pass@srv-captain--postgres:5432/clickveed
DIRECT_URL=postgresql://postgres:pass@srv-captain--postgres:5432/clickveed
REDIS_URL=redis://srv-captain--redis:6379
```

---

## ⚙️ What Happens During Deployment

1. **Clone**: Platform clones your GitHub repo
2. **Build**: Docker builds using Dockerfile (uses 2GB RAM, takes 3-5 min)
3. **Migrate**: `startup.sh` runs Prisma migrations
4. **Start**: App starts on port 3000
5. **Ready**: Access at your domain! 🎉

---

## 🔄 Auto-Deploy on Git Push

### Coolify:
1. Copy webhook URL from app settings
2. Add to GitHub → Settings → Webhooks
3. Every `git push` = auto deploy ✅

### CapRover:
1. Enable GitHub integration in app settings
2. Or use `caprover deploy` command
3. Every push can trigger deploy ✅

---

## 📊 Your VPS Resources (8GB RAM)

- **Build**: Uses ~2-3GB (temporary)
- **Runtime**: Uses ~500MB-1GB
- **Database**: ~200-500MB
- **Platform**: ~500MB
- **Available**: Still 4-5GB free! ✅

You can run many more services comfortably!

---

## 🐛 If Build Fails

The Dockerfile is optimized for 8GB VPS, but if it fails:

```bash
# Check available memory
free -m

# If needed, try the ultra-low-memory version
# In Coolify/CapRover, set dockerfile path to:
./Dockerfile.lowmem
```

But with 8GB, standard Dockerfile should work perfectly!

---

## ✅ Quick Checklist

Before deploying:
- [ ] Code pushed to GitHub
- [ ] PostgreSQL created in Coolify/CapRover
- [ ] Environment variables added
- [ ] Domain configured (optional)
- [ ] Ready to deploy!

After deploying:
- [ ] Check logs for errors
- [ ] Visit your domain
- [ ] Test registration/login
- [ ] Verify database connection
- [ ] All working? 🎉

---

## 📚 Need More Details?

- Full guide: `docs/DEPLOYMENT_GUIDE.md`
- Memory issues: `docs/LOW_MEMORY_BUILD_GUIDE.md`
- VPS deployment: `docs/VPS_DEPLOYMENT.md`

---

## 🆘 Common Issues

### "Heap out of memory"
- Check if other services are using too much RAM
- Standard Dockerfile uses 2GB - should work on 8GB VPS
- Try `Dockerfile.lowmem` if needed

### "Database connection failed"
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check CapRover internal DNS format

### "Build takes forever"
- First build: 4-6 minutes (normal)
- Next builds: 2-3 minutes (cached)
- Check VPS CPU/network speed

---

## 🎯 That's It!

Your workflow:
1. Code locally
2. `git push`
3. Auto-deploy
4. Enjoy! ✨

Simple as that with your 8GB VPS setup!
