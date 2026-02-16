# Coolify Deployment Guide

This guide explains how to deploy ClickVeed on Coolify using the optimized Dockerfile.

## Quick Setup

1. **Connect Coolify to your GitHub repository**
   - In Coolify dashboard, go to "New Service" → "From GitHub"
   - Select `knohitch/clickveed` repository
   - Select `main` branch

2. **Configure Coolify Service**

   **Basic Settings:**
   - Name: `clickveed`
   - Repository: `knohitch/clickveed`
   - Branch: `main`

   **Docker Settings:**
   - Dockerfile Path: `Dockerfile.coolify`
   - Context: `/`
   - Build Directory: `/`

   **Environment Variables:**
   Set these in Coolify dashboard:
   ```bash
   # Database
   DATABASE_URL=postgresql://user:password@host:5432/dbname

   # Auth
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=your-secret
   AUTH_SECRET=your-secret
   AUTH_TRUST_HOST=true

   # AI Provider (at least one required)
   GOOGLE_AI_API_KEY=your-key
   OPENAI_API_KEY=your-key
   ANTHROPIC_API_KEY=your-key

   # Storage
   WASABI_ENDPOINT=s3.wasabisys.com
   WASABI_REGION=us-east-1
   WASABI_ACCESS_KEY_ID=your-key
   WASABI_SECRET_ACCESS_KEY=your-secret
   WASABI_BUCKET=your-bucket

   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@yourdomain.com
   ```

3. **Resource Limits** (Important for 8GB VPS)

   In Coolify service settings:
   - **CPU Limit:** 2 cores
   - **Memory Limit:** 4GB (or 5120MB)
   - **Swap:** 2GB

   These settings ensure the build has enough memory without OOM errors.

4. **Network Settings**
   - Port: 3000
   - Expose Port: 3000
   - Domain: Your Coolify managed domain

5. **Deploy!**
   Click "Deploy" button in Coolify

## Troubleshooting

### Build Fails with Memory Error

**Solution 1: Increase Memory Limit**
```bash
# In Coolify service settings
Memory Limit: 5120MB  # 5GB
Swap: 2GB
```

**Solution 2: Check Build Logs**
```bash
# In Coolify dashboard, view logs
# Look for "JavaScript heap out of memory" errors
```

### Application Won't Start

**Check Database Connection:**
```bash
# In Coolify logs, look for:
# "Can't reach database server" or "Connection refused"

# Verify DATABASE_URL is correct
```

**Check Environment Variables:**
```bash
# Ensure all required env vars are set
# Check for typos in variable names
```

### Health Check Failing

The Dockerfile includes a health check that verifies the `/api/health` endpoint. If it fails:

1. Wait 60 seconds (startup period)
2. Check application logs
3. Verify DATABASE_URL is correct
4. Check if database is accessible

## Monitoring

Coolify provides built-in monitoring:
- **Logs:** View real-time logs in Coolify dashboard
- **Resources:** Monitor CPU, memory, and disk usage
- **Status:** See if container is running

## Updates

To deploy updates:

1. **Push changes to GitHub**
   ```bash
   git push origin main
   ```

2. **Trigger redeploy in Coolify**
   - Go to your service in Coolify
   - Click "Redeploy" button
   - Or enable "Auto-deploy on push"

## Scaling

To handle more traffic:

1. **Horizontal Scaling** (Multiple instances)
   - In Coolify, set "Instances" to 2 or more
   - Coolify will load balance between instances

2. **Vertical Scaling** (More resources)
   - Increase CPU and Memory limits
   - Recommended: 4 cores, 6GB memory

## Backup and Restore

Coolify supports backups:

1. **Database Backup**
   - Configure PostgreSQL backup in Coolify
   - Set up automated daily backups

2. **Application Backup**
   - Coolify saves container images
   - Rollback to previous versions if needed

## Domain Configuration

Coolify provides automatic SSL certificates:

1. **Add Custom Domain**
   - Go to service → Domains
   - Add your custom domain
   - Coolify will provision SSL certificate

2. **DNS Configuration**
   - Point A record to Coolify server IP
   - Or use CNAME to Coolify domain

## Performance Tips

1. **Enable Redis Caching** (if using)
   - Add Redis service in Coolify
   - Set REDIS_URL environment variable

2. **Configure CDN**
   - Use Bunny.net CDN for static assets
   - Set BUNNY_CDN_URL environment variable

3. **Optimize Database**
   - Use connection pooling
   - Configure read replicas if needed

## Cost Optimization

1. **Use Smaller Instance**
   - 2 cores, 4GB RAM for production
   - Monitor and scale up if needed

2. **Enable Auto-Scale**
   - Coolify can scale based on load
   - Set minimum and maximum instances

3. **Use Swap**
   - Enable 2GB swap for extra memory headroom
   - Prevents OOM errors during spikes

## Support

For issues:
1. Check Coolify logs
2. Review application logs
3. Test environment variables
4. Verify database connectivity
5. Check Coolify documentation: https://coolify.io/docs
