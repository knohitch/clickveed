# Coolify Deployment Fixes

This document outlines the specific fixes applied to resolve deployment issues when deploying to Coolify.

## Issues Identified from Deployment Logs

1. **Missing startup.sh file**: The Docker build was failing with "failed to calculate checksum of ref ... "/app/startup.sh": not found"

2. **Prisma OpenSSL compatibility issues**: Multiple warnings about "Prisma failed to detect the libssl/openssl version" and errors about "Error loading shared library libssl.so.1.1: No such file or directory"

## Fixes Applied

### 1. Dockerfile Updates for Coolify

The Dockerfile has been updated to ensure proper SSL library installation:

```dockerfile
# In the deps stage
RUN apk add --no-cache libc6-compat openssl libssl1.1

# In the runner stage  
RUN apk add --no-cache openssl libssl1.1
```

These changes ensure that the required SSL libraries are available during both build and runtime stages.

### 2. .dockerignore Updates

The .dockerignore file was updated to include the startup.sh file in the Docker build context:

```dockerignore
# Scripts
*.sh
!startup.sh
```

This allows the startup.sh file to be included in the Docker build while still excluding other shell scripts.

### 3. Prisma Binary Targets Configuration

Verified that the correct binary targets are configured in both `package.json` and `prisma/schema.prisma`:

```json
"binaryTargets": [
  "native",
  "debian-openssl-3.0.x",
  "linux-musl",
  "linux-musl-openssl-3.0.x"
]
```

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl", "linux-musl-openssl-3.0.x"]
}
```

### 4. Startup Script Availability

Confirmed that `startup.sh` exists in the root directory and has proper executable permissions.

### 5. Prisma Client Regeneration

Ran the fix script to regenerate the Prisma client with the correct binary targets:
```bash
./fix-prisma-alpine.sh
```

## Coolify Deployment Instructions

### 1. Environment Variables

Ensure the following environment variables are set in Coolify:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_URL` - Your application's URL
- `NEXTAUTH_SECRET` - A strong secret for NextAuth.js

### 2. Deployment Configuration

1. Set the build pack to "Dockerfile"
2. Ensure the source is correctly pointing to your GitHub repository
3. Set the port to 3000

### 3. Pre-deployment Commands

With the updated Dockerfile, database migrations and seeding will run automatically at startup via `startup.sh`, so no additional pre-deployment commands are needed.

The startup script will:
1. Run database migrations with `npx prisma migrate deploy`
2. Run database seeding with `npx prisma db seed`
3. Start the application with `node server.js`

## Expected Outcome

With these fixes, your Coolify deployment should:
1. Successfully build the Docker image without the "startup.sh not found" error
2. Resolve all Prisma OpenSSL compatibility issues
3. Automatically run database migrations and seeding
4. Start the application successfully

## Troubleshooting for Coolify

### If You Still Encounter Issues

1. **Check Build Logs**: Monitor the Coolify build logs for any specific error messages

2. **Verify Environment Variables**: Ensure all required environment variables are correctly set in Coolify

3. **Database Connectivity**: Confirm that your database is accessible from the Coolify environment

4. **Re-run Fix Script**: If Prisma issues persist, you can re-run the fix script locally before deploying:
   ```bash
   ./fix-prisma-alpine.sh
   ```

### Manual Verification

To manually verify that the fixes are working:

1. Check that the required SSL libraries are installed:
   ```bash
   docker run --rm your-image-name apk list | grep openssl
   ```

2. Verify Prisma client generation:
   ```bash
   # In your project directory
   npx prisma generate
   ls node_modules/.prisma/client/*.node
   ```

## Additional Notes

- These fixes maintain compatibility with both local development and Coolify deployment
- No application code changes were required
- The solution addresses both the immediate deployment failure and the underlying compatibility issues
