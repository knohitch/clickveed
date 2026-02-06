# ClickVid Application Clean Installation Guide

## Overview
This guide provides a step-by-step process to perform a clean installation of the ClickVid application in Coolify, addressing the persistent "Degraded (unhealthy)" status. This approach eliminates any cached state or configuration issues that may be causing the startup script problems.

## Prerequisites
- SSH access to the server
- Coolify dashboard access
- GitHub repository access (`https://github.com/nohitchweb/clickvidev.git`)
- Database credentials and connection details
- Domain configuration details (`dev.clickvid.site`)

## Phase 1: Preparation

### Step 1: Document Current Configuration
Before starting, document the following from Coolify:
1. Application environment variables
2. Domain settings
3. Resource allocations (CPU, memory, disk)
4. Database connection details
5. Any custom configurations

### Step 2: Backup Current Deployment
1. In Coolify, go to Applications > ClickVid Develops > Advanced
2. Click "Export Configuration" to save current settings
3. SSH into server and backup any important data:
   ```bash
   # Backup database if self-hosted
   pg_dump -h [host] -U [user] -d [database] > clickvid_backup_$(date +%F).sql
   
   # Backup any persistent volumes
   docker volume ls  # List volumes
   # If using named volumes for app data, backup accordingly
   ```

### Step 3: Prepare Clean Environment
1. In Coolify, stop the current application:
   - Applications > ClickVid Develops > Advanced > Stop
   
2. Clear Docker cache on server:
   ```bash
   # SSH into server
   docker system prune -a --volumes
   # Confirm with 'y' when prompted
   ```

## Phase 2: Clean Installation

### Step 4: Remove Existing Application
1. In Coolify:
   - Applications > ClickVid Develops > Advanced
   - Click "Delete Application"
   - Confirm deletion

### Step 5: Create New Application
1. In Coolify dashboard, click "Create New Application"
2. Select your server
3. Configure source:
   - Source: GitHub
   - Repository: `nohitchweb/clickvidev`
   - Branch: `main`
4. Build settings:
   - Build pack: Dockerfile
   - Dockerfile location: `Dockerfile` (default)
   - Build context: `.` (default)

### Step 6: Configure Application Settings
1. **Basic Information**:
   - Name: ClickVid Develops
   - Project: (select existing or create new)

2. **Environment Variables**:
   - Re-add all documented environment variables from Step 1
   - Pay special attention to:
     - `DATABASE_URL`
     - `NEXT_PUBLIC_SITE_URL`
     - `NEXTAUTH_SECRET`
     - Any API keys or service credentials

3. **Resource Limits**:
   - Set CPU: 1 core (minimum)
   - Set Memory: 1GB (minimum for Next.js app)
   - Disk: 10GB (adjust as needed)

4. **Domains**:
   - Add domain: `dev.clickvid.site`
   - Enable SSL certificate

### Step 7: Deploy Application
1. Click "Deploy" to start the build process
2. Monitor build logs for:
   - Successful Docker build completion
   - No cache hits (confirming fresh build)
   - All stages complete without errors

3. After build completes, monitor runtime logs for:
   - `Running database migrations...`
   - `Running database seeding...`
   - `Starting application...`
   - No `startup.sh: not found` errors

## Phase 3: Verification

### Step 8: Verify Application Health
1. In Coolify, check application status shows "Healthy"
2. Visit `https://dev.clickvid.site` in browser
3. Verify core functionality:
   - Login page loads
   - Dashboard accessible
   - API endpoints respond

### Step 9: Test Critical Features
1. Database connectivity:
   - Login with test account
   - Create/view sample data
2. File uploads (if applicable):
   - Test media upload functionality
3. API integrations:
   - Verify third-party service connections

## Phase 4: Post-Installation

### Step 10: Monitor and Optimize
1. Set up monitoring in Coolify:
   - Enable health checks
   - Configure alerts for downtime
2. Review resource usage:
   - Adjust CPU/memory if needed
   - Set up auto-scaling if required
3. Configure backups:
   - Set up automated database backups
   - Configure application data snapshots

## Troubleshooting Common Issues

### If Build Fails
1. Check Dockerfile syntax:
   ```bash
   # Locally validate Dockerfile
   docker build -t clickvid-test .
   ```
2. Verify all required files are in repository
3. Check GitHub Actions (if any) for build errors

### If Application Unhealthy
1. Check runtime logs for specific errors
2. Verify environment variables are correctly set
3. Confirm database connectivity:
   ```bash
   # In application terminal (Coolify)
   echo $DATABASE_URL
   # Test connection manually if possible
   ```

### If startup.sh Issues Persist
1. Verify file exists in repository:
   ```bash
   # In repository root
   ls -la startup.sh
   ```
2. Check file permissions:
   ```bash
   # Should show execute permissions
   ls -la startup.sh
   # If needed, fix locally and commit:
   chmod +x startup.sh
   git add startup.sh
   git commit -m "Fix startup.sh permissions"
   git push
   ```

## Rollback Procedure

If clean installation fails:

1. **Restore Previous Application**:
   - In Coolify, delete the new application
   - Restore the exported configuration from Step 2
   - Redeploy with previous settings

2. **Database Rollback** (if needed):
   ```bash
   # Restore from backup created in Step 2
   psql -h [host] -U [user] -d [database] < clickvid_backup_YYYY-MM-DD.sql
   ```

3. **Revert Repository** (if new commits caused issues):
   ```bash
   # Revert to last known good commit
   git reset --hard [commit-hash]
   git push --force
   ```

## Expected Outcomes

### Success Indicators
- ✅ Application status shows "Healthy" in Coolify
- ✅ `https://dev.clickvid.site` loads without errors
- ✅ Runtime logs show successful startup sequence
- ✅ Database migrations and seeding complete
- ✅ Core application features function normally

### Timeline
- Preparation: 15-30 minutes
- Clean installation: 30-60 minutes (depending on build time)
- Verification: 15-30 minutes
- Total estimated time: 1-2 hours

## Support Resources
- Coolify Documentation: https://coolify.io/docs
- Docker Documentation: https://docs.docker.com
- Next.js Documentation: https://nextjs.org/docs
- Repository Issues: https://github.com/nohitchweb/clickvidev/issues

---
**Note**: This clean installation approach completely removes any existing application state and rebuilds from scratch, which should resolve any persistent caching or configuration issues that were preventing the `startup.sh` script from being found.