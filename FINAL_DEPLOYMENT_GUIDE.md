# Final Deployment Guide

This guide provides step-by-step instructions for deploying the application with all the fixes applied.

## Prerequisites

- Docker installed on your system
- Node.js 18+ installed locally (for development)
- Access to a PostgreSQL database

## Deployment Steps

### 1. Prepare the Environment

1. Ensure all files are in place:
   - `Dockerfile` (updated with SSL library installations)
   - `startup.sh` (with executable permissions)
   - `package.json` (with correct Prisma binary targets)
   - `prisma/schema.prisma` (with correct Prisma binary targets)

2. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Edit .env to add your database connection string and other variables
   ```

### 2. Generate Prisma Client

Run the fix script to ensure Prisma client is generated with the correct binary targets:
```bash
./fix-prisma-alpine.sh
```

### 3. Test File Permissions

Ensure the startup script is executable:
```bash
chmod +x startup.sh
```

### 4. Build the Docker Image

```bash
docker build -t clickvidev-app .
```

### 5. Run the Application

```bash
docker run -p 3000:3000 --env-file .env clickvidev-app
```

## What Happens During Deployment

1. **Build Stage**:
   - Dependencies are installed with SSL libraries
   - Prisma client is generated with Alpine-compatible binaries
   - Application is built using Next.js

2. **Runtime Stage**:
   - Required SSL libraries are installed
   - Prisma client binaries are copied
   - `startup.sh` script is executed which:
     - Runs database migrations
     - Seeds the database
     - Starts the application

## Troubleshooting

### If You Encounter OpenSSL Errors

The fixes should resolve OpenSSL errors, but if you still encounter issues:

1. Verify that `libssl3` is installed in both `deps` and `runner` stages of the Dockerfile
2. Ensure Prisma binary targets include `linux-musl-openssl-3.0.x`
3. Re-run the fix script: `./fix-prisma-alpine.sh`

### If Database Migrations Fail

1. Check your database connection string in the environment variables
2. Ensure the database is accessible from the container
3. Verify that the database user has the necessary permissions

### If the Application Doesn't Start

1. Check that `startup.sh` exists and is executable
2. Verify that all required files are being copied in the Dockerfile
3. Check the container logs: `docker logs <container-id>`

## Rollback Plan

If issues occur in production:

1. Revert to the previous working image:
   ```bash
   docker tag clickvidev-app:previous clickvidev-app:latest
   ```

2. Restart the container with the previous image

## Monitoring

After deployment, monitor:

1. Application logs for any errors
2. Database connectivity
3. Response times and resource usage
4. Successful execution of database migrations

## Additional Notes

- The fixes maintain compatibility with both development and production environments
- No application code changes were required
- The solution addresses both the immediate deployment issue and the underlying OpenSSL compatibility problem
