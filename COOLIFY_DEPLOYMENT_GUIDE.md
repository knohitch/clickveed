# Coolify Deployment Guide

## Prerequisites
Before deploying, ensure you have:
1. A PostgreSQL database set up and accessible
2. The following environment variables configured in Coolify:
   - `DATABASE_URL` - Connection string to your PostgreSQL database
   - `NEXTAUTH_URL` - The canonical URL of your site
   - `NEXTAUTH_SECRET` - A strong secret for NextAuth.js

## Recent Fixes Applied

Important fixes have been applied to resolve previous deployment issues:

1. **Dockerfile SSL Library Installation**: Updated to install `libssl3` in both build and runtime stages to resolve OpenSSL compatibility issues
2. **Prisma Binary Targets**: Verified correct configuration for Alpine Linux compatibility
3. **Startup Script**: Confirmed `startup.sh` exists and has proper permissions

## Deployment Steps

### 1. Configure Environment Variables in Coolify
1. Go to your Coolify application
2. Navigate to the "Environment Variables" section
3. Add the following variables:
   ```
   DATABASE_URL=your-postgresql-connection-string
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=your-super-strong-secret
   ```

### 2. Pre/Post Deployment Commands
**No pre-deployment commands are needed** because:
- Database migrations and seeding are handled automatically by the `startup.sh` script
- The script runs when the container starts, executing:
  1. `npx prisma migrate deploy` (migrations)
  2. `npx prisma db seed` (seeding)
  3. `node server.js` (application start)

**No post-deployment commands are needed** because:
- The application starts automatically after migrations and seeding
- All necessary setup is handled within the container

### 3. Configure the Main Deployment
1. Make sure your source is correctly set (GitHub repository)
2. Ensure the build pack is set to "Dockerfile"
3. Set the port to 3000 (or whatever port your application uses)

### 4. Deploy the Application
1. Click "Deploy" in Coolify
2. The deployment process will:
   - Build your Docker image with all required dependencies
   - Run database migrations and seeding automatically via startup script
   - Start your application

## Troubleshooting

### If you encounter build errors:
1. Check that the build logs don't show "startup.sh not found" errors
2. Verify that SSL library installation is working correctly

### If you still get the "User table does not exist" error:
1. Verify that your `DATABASE_URL` environment variable is correctly set in Coolify
2. Check that your database is accessible from the Coolify environment
3. Monitor the application logs to ensure the startup script runs successfully

### To manually verify database tables:
If you have direct access to your database, you can check if the tables were created:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

This should show all the required tables including `User`, `Account`, `Session`, etc.

## Additional Notes
- The initial deployment may take some time (up to 20+ minutes) due to the size of the application
- Monitor the deployment logs in Coolify for any additional errors
- If you make changes to your Prisma schema in the future, new migrations will be automatically applied during deployment
- These fixes maintain compatibility with both local development and Coolify deployment
