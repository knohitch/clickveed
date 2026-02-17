# Deployment Guide - Clickveed on 8GB VPS

Your VPS has 8GB RAM which is excellent for building and running Clickveed. The memory optimizations in the Dockerfile (2GB build limit) will work smoothly.

## Deployment Workflow

```
Local Dev → GitHub Push → VPS (Coolify/CapRover) → Auto Build & Deploy
```

---

## Option 1: Coolify Deployment

### Initial Setup

1. **Install Coolify on your VPS** (if not already done):
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

2. **Access Coolify**:
   - Open `http://your-vps-ip:8000`
   - Complete initial setup

### Deploy from GitHub

1. **Create New Resource** in Coolify:
   - Click "+ New Resource"
   - Select "Public Repository"

2. **Configure Repository**:
   ```
   Repository URL: https://github.com/your-username/clickveed
   Branch: main
   Build Pack: Dockerfile
   ```

3. **Environment Variables** (add these in Coolify):
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:5432/clickveed
   DIRECT_URL=postgresql://user:password@host:5432/clickveed

   # NextAuth
   NEXTAUTH_SECRET=your-secret-here-min-32-chars
   NEXTAUTH_URL=https://yourdomain.com

   # Redis (if using)
   REDIS_URL=redis://localhost:6379

   # App Settings
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

4. **Deploy Settings**:
   - Port: `3000`
   - Health Check Path: `/api/health` (if you have one) or `/`
   - Dockerfile path: `./Dockerfile`

5. **Deploy**:
   - Click "Deploy"
   - Coolify will:
     - Clone from GitHub
     - Build using your Dockerfile
     - Run migrations via startup.sh
     - Start the application

### Auto-Deploy on Push

Enable webhook in Coolify:
1. Go to your application settings
2. Copy the webhook URL
3. Add to GitHub:
   - Go to your repo → Settings → Webhooks
   - Add webhook with Coolify's URL
   - Select "Just the push event"

Now every `git push` to main will trigger auto-deployment!

---

## Option 2: CapRover Deployment

### Initial Setup

1. **Install CapRover** (if not already done):
   ```bash
   docker run -p 80:80 -p 443:443 -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v /captain:/captain caprover/caprover
   ```

2. **Setup CapRover**:
   ```bash
   npm install -g caprover
   caprover serversetup
   ```

### Create App

1. **Create new app** in CapRover dashboard:
   - App Name: `clickveed`
   - Check "Has Persistent Data" if using volumes

2. **Enable HTTPS** (recommended):
   - Enable HTTPS
   - Force HTTPS
   - Add your domain

### Deploy from GitHub

#### Method A: Using CapRover CLI (Recommended)

1. **Install CapRover CLI locally**:
   ```bash
   npm install -g caprover
   ```

2. **In your project directory**, create `captain-definition` file (already exists):
   ```json
   {
     "schemaVersion": 2,
     "dockerfilePath": "./Dockerfile"
   }
   ```

3. **Deploy**:
   ```bash
   # First time - link your app
   caprover deploy

   # Follow prompts to connect to your CapRover server
   # Select your app: clickveed
   ```

#### Method B: Using GitHub Integration

1. **In CapRover Dashboard**:
   - Go to your app
   - Click "Deployment" tab
   - Select "Method 3: Deploy from Github/Bitbucket/Gitlab"

2. **Configure**:
   ```
   Repository: https://github.com/your-username/clickveed
   Branch: main
   Username: your-github-username
   Password/Token: your-github-token
   ```

3. **Click "Save & Update"**

### Environment Variables in CapRover

1. Go to App Configs → Environment Variables
2. Add (in bulk edit mode):

```env
DATABASE_URL=postgresql://user:password@srv-captain--postgres:5432/clickveed
DIRECT_URL=postgresql://user:password@srv-captain--postgres:5432/clickveed
NEXTAUTH_SECRET=your-secret-here-min-32-chars
NEXTAUTH_URL=https://clickveed.yourdomain.com
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://clickveed.yourdomain.com
REDIS_URL=redis://srv-captain--redis:6379
PORT=3000
```

### Setup PostgreSQL in CapRover

1. **Create PostgreSQL app**:
   - One-Click Apps → PostgreSQL
   - App Name: `postgres`
   - Set password

2. **Use internal connection**:
   ```
   DATABASE_URL=postgresql://postgres:yourpassword@srv-captain--postgres:5432/clickveed
   ```

### Setup Redis in CapRover (Optional)

1. **Create Redis app**:
   - One-Click Apps → Redis
   - App Name: `redis`

2. **Use internal connection**:
   ```
   REDIS_URL=redis://srv-captain--redis:6379
   ```

---

## Recommended Setup: Coolify vs CapRover

### Choose Coolify if:
- ✅ You want simpler UI/UX
- ✅ You prefer modern interface
- ✅ You want built-in monitoring
- ✅ You need easier database management

### Choose CapRover if:
- ✅ You want more control
- ✅ You prefer CLI-based deployments
- ✅ You need one-click apps (Postgres, Redis, etc.)
- ✅ You want more flexibility

---

## Git Workflow

### Development to Production

```bash
# 1. Make changes locally
git add .
git commit -m "feat: your changes"

# 2. Push to GitHub
git push origin main

# 3. Auto-deploy triggers (if webhook configured)
# Or manually trigger in Coolify/CapRover

# 4. Monitor deployment logs in dashboard
```

### Environment-Specific Branches (Optional)

```bash
# Production
git push origin main → Auto-deploys to production

# Staging
git push origin staging → Auto-deploys to staging

# Development
git push origin dev → Local testing only
```

---

## Build Performance on Your 8GB VPS

With the optimizations:
- **Build time**: ~2-5 minutes
- **Memory usage**: ~2-3GB during build
- **Runtime memory**: ~500MB-1GB
- **Remaining RAM**: 5-7GB for other services

Your VPS can easily handle:
- Clickveed app
- PostgreSQL database
- Redis cache
- Coolify/CapRover platform
- Other services if needed

---

## Troubleshooting

### Build Fails with Memory Error
Even with 8GB, if other services are using RAM:
```bash
# Check memory usage
free -m

# Stop unnecessary services temporarily
docker stop $(docker ps -q | grep -v coolify)

# Retry deployment
```

### Slow Builds
First build is slower (npm install). Subsequent builds use cache:
- First build: 4-6 minutes
- Cached builds: 2-3 minutes

### Database Connection Issues
Make sure DATABASE_URL format is correct:
- **Coolify**: Use service names or IP
- **CapRover**: Use `srv-captain--servicename` format

---

## Post-Deployment Checklist

- [ ] App is accessible at your domain
- [ ] HTTPS is working
- [ ] Database migrations ran successfully
- [ ] Environment variables are set
- [ ] Health check is passing
- [ ] Logs show no errors
- [ ] Auto-deploy webhook is configured
- [ ] Backup strategy in place for database

---

## Monitoring & Maintenance

### Check Application Logs

**Coolify**:
- Dashboard → Your App → Logs tab

**CapRover**:
- Dashboard → Apps → clickveed → View Logs

### Database Backups

**Set up automated backups**:
```bash
# Coolify - built-in backup feature
# CapRover - use cron job or backup app

# Manual backup
docker exec srv-captain--postgres pg_dump -U postgres clickveed > backup.sql
```

### Updates

1. Update code locally
2. Test thoroughly
3. Commit and push to GitHub
4. Monitor deployment
5. Verify production works

---

## Quick Commands Reference

### Coolify
```bash
# View logs
coolify logs your-app-id

# Restart app
coolify restart your-app-id

# Redeploy
coolify deploy your-app-id
```

### CapRover
```bash
# Deploy
caprover deploy

# View logs
caprover logs -a clickveed

# Scale app
caprover scale -a clickveed -c 2
```

---

## Support & Resources

- **Coolify Docs**: https://coolify.io/docs
- **CapRover Docs**: https://caprover.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Prisma Production**: https://www.prisma.io/docs/guides/deployment

---

## Summary

Your setup is perfect:
- ✅ 8GB RAM is more than enough
- ✅ GitHub → VPS workflow is optimal
- ✅ Optimized Dockerfile (2GB build limit)
- ✅ Auto-deploy on push available
- ✅ Can run multiple services comfortably

Just push your code to GitHub and let Coolify/CapRover handle the rest!
