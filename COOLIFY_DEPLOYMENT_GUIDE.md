# Coolify Deployment Guide for ClickVid

## Overview
This guide will help you deploy your ClickVid application to Coolify using the Docker configuration we've set up.

## Files Created/Modified

### 1. Dockerfile
- **Location**: Project root (`/Dockerfile`)
- **Purpose**: Multi-stage Docker build optimized for Next.js production deployment
- **Features**:
  - Uses Node.js 18 Alpine base image
  - Multi-stage build for smaller final image size
  - Includes Prisma client generation
  - Configured for standalone Next.js output
  - Runs as non-root user for security
  - Exposes port 3000

### 2. .dockerignore
- **Location**: Project root (`/.dockerignore`)
- **Purpose**: Excludes unnecessary files from Docker build context
- **Benefits**: Faster build times and smaller image sizes

### 3. next.config.mjs
- **Modification**: Added `output: 'standalone'` configuration
- **Purpose**: Enables Next.js standalone output for Docker deployment

## Coolify Deployment Steps

### 1. Commit Your Changes
Make sure all the new files are committed to your Git repository:

```bash
git add Dockerfile .dockerignore next.config.mjs
git commit -m "Add Docker configuration for Coolify deployment"
git push origin main
```

### 2. Coolify Configuration
In your Coolify dashboard:

1. **Application Setup**:
   - Select your Git repository (`nohitchweb/clickvidev`)
   - Choose the `main` branch
   - Set the application name (e.g., "ClickVid Develops")

2. **Build Configuration**:
   - **Build Pack**: Select "Dockerfile"
   - **Dockerfile Path**: `Dockerfile` (default)
   - **Build Context**: `.` (default)

3. **Environment Variables**:
   Make sure to set these required environment variables:
   ```bash
   NODE_ENV=production
   DATABASE_URL=your_database_url
   NEXTAUTH_URL=your_app_url
   NEXTAUTH_SECRET=your_secret_key
   # Add any other required environment variables from your .env file
   ```

4. **Port Configuration**:
   - **Container Port**: 3000
   - **Public Port**: Any available port (Coolify will suggest one)

5. **Health Check** (Optional but recommended):
   - **Path**: `/api/health`
   - **Interval**: 30 seconds
   - **Timeout**: 10 seconds
   - **Retries**: 3

### 3. Deploy
Click the "Deploy" button in Coolify. The build process will:
1. Pull your code from the repository
2. Build the Docker image using the Dockerfile
3. Generate Prisma client
4. Build the Next.js application in standalone mode
5. Start the container

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check the build logs in Coolify for specific error messages
   - Ensure all dependencies are properly listed in package.json
   - Verify that your database URL is correct and accessible

2. **Runtime Errors**:
   - Check that all environment variables are set correctly
   - Verify database connectivity
   - Check the application logs in Coolify

3. **Prisma Issues**:
   - The Dockerfile automatically runs `prisma generate` during build
   - If you make schema changes, you may need to run migrations manually

### Useful Commands

If you need to debug locally (with Docker installed):

```bash
# Build the image
docker build -t clickvid .

# Run the container
docker run -p 3000:3000 --env-file .env clickvid

# View logs
docker logs <container_id>
```

## Post-Deployment

1. **Database Migrations**:
   - You may need to run database migrations after deployment
   - This can be done through Coolify's terminal or by connecting directly to your database

2. **Monitoring**:
   - Check the health endpoint: `https://your-app-url/api/health`
   - Monitor application logs in Coolify
   - Set up any external monitoring if needed

3. **Backups**:
   - Ensure your database backups are configured
   - Consider setting up automated backups through Coolify or your database provider

## Support

If you encounter any issues during deployment:
1. Check the Coolify documentation
2. Review the build and application logs
3. Verify all configuration settings
4. Ensure your Git repository has all the necessary files

The Docker configuration is optimized for production deployment and should work seamlessly with Coolify's deployment process.
