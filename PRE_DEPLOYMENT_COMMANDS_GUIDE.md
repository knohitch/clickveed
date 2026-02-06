# ClickVid Application Pre-Deployment Commands Guide

## Overview

This guide explains whether pre-deployment commands are needed for ClickVid in Coolify and provides recommendations for the deployment process.

## Pre-Deployment Commands Analysis

### Current Dockerfile Build Process

The ClickVid Dockerfile already includes all necessary build steps:

1. **Dependency Installation** (Lines 12-14):
   ```dockerfile
   COPY package.json package-lock.json* ./
   RUN npm ci
   ```

2. **Prisma Client Generation** (Line 23):
   ```dockerfile
   RUN npx prisma generate
   ```

3. **Application Build** (Line 26):
   ```dockerfile
   RUN npm run build
   ```

4. **Startup Script Preparation** (Lines 60-61):
   ```dockerfile
   COPY --from=builder /app/startup.sh ./startup.sh
   RUN chmod +x ./startup.sh
   ```

### Runtime Process

The `startup.sh` script handles all runtime initialization:

1. **Database Migrations** (Line 5):
   ```bash
   npx prisma migrate deploy
   ```

2. **Database Seeding** (Line 13):
   ```bash
   npx prisma db seed
   ```

3. **Application Start** (Line 17):
   ```bash
   node server.js
   ```

## Recommendation: No Pre-Deployment Commands Needed

**Do not add any pre-deployment commands in Coolify**.

### Why No Pre-Deployment Commands Are Needed

1. **Complete Build Process in Dockerfile**:
   - All build steps are already included in the Dockerfile
   - Prisma client generation happens during the build
   - Application build is handled by the Dockerfile

2. **Runtime Initialization in startup.sh**:
   - Database migrations are handled at runtime
   - Database seeding is performed at startup
   - This ensures the database is up-to-date every time the container starts

3. **Potential Issues with Pre-Deployment Commands**:
   - Could conflict with the Dockerfile's build process
   - Might cause permission issues
   - Could lead to inconsistent build environments

## What Happens Without Pre-Deployment Commands

1. **Build Process**:
   - Coolify uses the Dockerfile to build the image
   - All dependencies are installed
   - Prisma client is generated with correct binary targets
   - Application is built
   - Startup script is copied and made executable

2. **Deployment Process**:
   - Image is deployed to Coolify
   - Container starts with the startup script
   - Database migrations are applied
   - Database is seeded
   - Application starts successfully

## If You Insist on Adding Pre-Deployment Commands

If you still want to add pre-deployment commands (not recommended), here's what you might consider:

### Option 1: Build Commands (Not Recommended)
```bash
# These would run before the Docker build
npm install
npx prisma generate
npm run build
```

**Issues with this approach**:
- Duplicates what's already in the Dockerfile
- Could cause version mismatches
- Wastes build time

### Option 2: Database Commands (Not Recommended)
```bash
# These would run after the build but before container start
npx prisma migrate deploy
npx prisma db seed
```

**Issues with this approach**:
- Database might not be accessible during build
- Should be done at runtime, not build time
- startup.sh already handles this

## Best Practice for ClickVid

### Recommended Coolify Configuration

1. **Build Pack**: Dockerfile
   - Dockerfile location: `Dockerfile`
   - Build context: `.`

2. **Pre-Deployment Commands**: Leave empty
   - No commands needed
   - Dockerfile handles everything

3. **Environment Variables**: Set all required variables
   - See `ENVIRONMENT_VARIABLES_GUIDE.md` for complete list

4. **Health Check Path**: `/api/health` (if available)
   - Helps Coolify monitor application health

## Troubleshooting Deployment Issues

If you encounter deployment issues:

1. **Check Build Logs**:
   - Look for errors during the Docker build process
   - Verify all stages complete successfully

2. **Check Runtime Logs**:
   - Look for startup.sh execution
   - Verify database migrations complete
   - Check for application start errors

3. **Verify Environment Variables**:
   - Ensure all required variables are set
   - Check for typos in variable names or values

4. **Test Locally**:
   ```bash
   # Build the image
   docker build -t clickvid-test .
   
   # Run the container
   docker run -p 3000:3000 \
     -e DATABASE_URL="your-database-url" \
     -e REDIS_URL="your-redis-url" \
     -e NEXTAUTH_SECRET="your-secret" \
     clickvid-test
   ```

## Conclusion

For ClickVid, **no pre-deployment commands are needed** in Coolify. The Dockerfile and startup.sh script handle all necessary build and runtime processes. Adding pre-deployment commands would be redundant and could potentially cause issues.

The deployment process should be:
1. Set up the application in Coolify with Dockerfile build pack
2. Configure all required environment variables
3. Deploy without any pre-deployment commands
4. Monitor the build and runtime logs for successful deployment