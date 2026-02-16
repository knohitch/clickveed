# CapRover Deployment Guide

This guide explains how to deploy ClickVeed on CapRover using the optimized Dockerfile.

## Quick Setup

1. **Login to CapRover**
   - Access your CapRover dashboard (e.g., https://captain.your-domain.com)
   - Login with your credentials

2. **Create New App**
   - Click "Create New App"
   - Name it `clickveed`
   - Click "Create"

3. **Connect to GitHub Repository**
   - In your app settings, go to "Source"
   - Click "Connect to GitHub"
   - Select `knohitch/clickveed` repository
   - Select `main` branch

4. **Configure Deployment**

   **Docker Settings:**
   - **Dockerfile Path:** `Dockerfile.caprover`
   - **Docker Context:** `/`

   **Port Configuration:**
   - **Container Port:** 3000 (this is what the app runs on)
   - **Public Port:** 80 (CapRover will handle SSL/HTTPS)

5. **Set Environment Variables**

   Go to "App Configs" → "Environment Variables" and add:

   ```bash
   # Database
   DATABASE_URL=postgresql://user:password@host:5432/dbname

   # Auth
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=your-secret-key
   AUTH_SECRET=your-secret-key
   AUTH_TRUST_HOST=true

   # AI Provider (at least one required)
   GOOGLE_AI_API_KEY=your-gemini-key
   OPENAI_API_KEY=sk-your-openai-key
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

   # Storage (Wasabi S3)
   WASABI_ENDPOINT=s3.wasabisys.com
   WASABI_REGION=us-east-1
   WASABI_ACCESS_KEY_ID=your-access-key
   WASABI_SECRET_ACCESS_KEY=your-secret-key
   WASABI_BUCKET=your-bucket-name

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@yourdomain.com

   # NextAuth
   NEXTAUTH_URL=https://clickveed.your-domain.com
   NEXTAUTH_SECRET=your-32-character-secret
   ```

6. **Configure Resources** (Important for 8GB VPS)

   In CapRover, go to "Resource Limits":
   - **CPU Limit:** 2.0 (2 cores)
   - **Memory Limit:** 4096 (4GB in MB)
   - **Swap Memory:** 2048 (2GB swap)

   This ensures the build has enough memory without OOM errors.

7. **Deploy!**
   - Click "Deploy" button
   - CapRover will build the Docker image
   - Wait for deployment to complete (5-10 minutes)

## Custom Domain & SSL

1. **Add Custom Domain**
   - Go to your app in CapRover
   - Click "Domains"
   - Add your domain (e.g., `clickveed.your-domain.com`)
   - Enable "Force HTTPS"

2. **Configure DNS**
   - Add CNAME record pointing to your CapRover domain
   - Or add A record pointing to your VPS IP

3. **SSL Certificate**
   - CapRover will automatically provision Let's Encrypt SSL
   - Wait for certificate to be issued
   - Your app will be accessible over HTTPS

## Troubleshooting

### Build Fails with "Exit Code 1"

**Check Build Logs:**
1. Go to your app in CapRover
2. Click "Logs" tab
3. Look for error messages
4. Common errors:
   - "JavaScript heap out of memory" → Increase memory limit
   - "Prisma generate failed" → Check Prisma schema
   - "Cannot find module" → Check dependencies

**Solution: Increase Memory**
```yaml
# In Resource Limits
Memory Limit: 5120  # 5GB
Swap: 2048         # 2GB
```

### Container Keeps Restarting

**Check Application Logs:**
1. Go to "Logs" tab
2. Look for startup errors
3. Common issues:
   - Database connection failed → Check DATABASE_URL
   - Missing environment variable → Verify all vars are set
   - Port already in use → Check if port 3000 is available

**Solution: Fix Environment Variables**
- Verify DATABASE_URL format: `postgresql://user:pass@host:5432/db`
- Check for special characters (URL encode if needed)
- Ensure all required variables are set

### Health Check Failing

The Dockerfile includes a health check. If it fails:

1. **Check Logs:** Look for application errors
2. **Verify Database:** Test DATABASE_URL connectivity
3. **Wait Longer:** Health check has 40s startup period
4. **Disable Temporarily:** In CapRover, disable health check to test

### 502 Bad Gateway

**Solution:**
1. Check if container is running (App dashboard)
2. Verify container is listening on port 3000
3. Check application logs for errors
4. Ensure DATABASE_URL is correct

## Monitoring

CapRover provides built-in monitoring:

1. **Logs:** View real-time logs in CapRover dashboard
2. **Resources:** Monitor CPU, memory, and disk usage
3. **Container Status:** See if container is running/restarting
4. **Deployment History:** View past deployments

## Updates

To deploy updates:

**Option 1: Auto-Deploy on Push**
1. Enable "Auto Deploy" in app settings
2. Push changes to GitHub
3. CapRover will automatically redeploy

**Option 2: Manual Deploy**
1. Push changes to GitHub
2. Go to app in CapRover
3. Click "Deploy" button

## Scaling

To handle more traffic:

**Horizontal Scaling (Multiple Instances):**
1. Go to "Resource Limits"
2. Set "Instance Count" to 2 or more
3. CapRover will load balance between instances

**Vertical Scaling (More Resources):**
1. Increase CPU and Memory limits
2. Recommended for production: 4 cores, 6GB memory

## Database Setup

### Option 1: CapRover One-Click PostgreSQL
1. Go to "One-Click Apps"
2. Install PostgreSQL
3. Copy connection URL to DATABASE_URL

### Option 2: External Database
1. Use any PostgreSQL database (Neon, Supabase, etc.)
2. Add connection URL to DATABASE_URL environment variable
3. Ensure database is accessible from CapRover server

### Database Migrations
After deployment, run migrations:
```bash
# SSH into CapRover server
ssh user@your-vps-ip

# Find your app container
docker ps | grep clickveed

# Run migrations
docker exec -it <container-id> npx prisma migrate deploy
```

## Backup Strategy

### Database Backup
1. Configure automated backups in your PostgreSQL setup
2. Or use CapRover's backup feature (if available)
3. Export regularly: `pg_dump` command

### Application Backup
1. CapRover saves previous deployment versions
2. You can rollback if needed
3. Keep important data in database, not container

## Performance Optimization

1. **Enable Redis Caching**
   - Install Redis One-Click App in CapRover
   - Set REDIS_URL environment variable
   - Improves response times

2. **Configure CDN**
   - Use Bunny.net CDN for static assets
   - Set BUNNY_CDN_URL environment variable
   - Reduces load on your server

3. **Database Optimization**
   - Use connection pooling in DATABASE_URL
   - Add `connection_limit=10` parameter
   - Consider read replicas for high traffic

## Security

1. **Enable SSL/HTTPS**
   - Already enabled by default in CapRover
   - Use custom domain for professional look

2. **Secure Environment Variables**
   - Never commit secrets to GitHub
   - Use CapRover's encrypted environment variables
   - Rotate API keys regularly

3. **Regular Updates**
   - Keep CapRover updated
   - Monitor for security alerts
   - Update dependencies regularly

## Cost Optimization

1. **Resource Limits**
   - Start with 2 cores, 4GB RAM
   - Monitor usage and adjust as needed
   - Use swap to prevent OOM errors

2. **Storage**
   - Clean up old Docker images
   - Use external storage (Wasabi S3) for media
   - Keep container size minimal

3. **Database**
   - Use managed PostgreSQL (Neon, Supabase)
   - Pay for what you use
   - Automated backups included

## Support

For issues:
1. Check CapRover logs first
2. Review application logs
3. Test environment variables
4. Verify database connectivity
5. Check CapRover documentation: https://caprover.com/docs
6. Search CapRover GitHub issues

## Useful Commands

```bash
# SSH into CapRover server
ssh user@your-vps-ip

# View container logs
docker logs -f <container-id>

# Restart container
docker restart <container-id>

# Execute command in container
docker exec -it <container-id> sh

# Run Prisma commands
docker exec -it <container-id> npx prisma studio
docker exec -it <container-id> npx prisma migrate deploy

# Check resource usage
docker stats <container-id>
```
