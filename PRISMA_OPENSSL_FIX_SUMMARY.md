# Prisma OpenSSL Compatibility Fix

## Problem Solved
Fixed the Prisma OpenSSL compatibility issue where the application was trying to use `libquery_engine-debian-openssl-1.1.x.so.node` but couldn't find the required `libssl.so.1.1` library.

## Root Cause
The Prisma schema was configured with incorrect binary targets for Alpine Linux (`linux-musl`, `linux-musl-openssl-3.0.x`) instead of Debian targets, even though the Docker image uses a Debian-based Node image (`node:18-slim`).

## Solution Implemented

### 1. Updated Prisma Schema Binary Targets
**File: `prisma/schema.prisma`**

Changed from:
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl", "linux-musl-openssl-3.0.x"]
}
```

To:
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-1.1.x"]
}
```

### 2. Verified Dockerfile Configuration
The Dockerfile already has the correct OpenSSL 1.1 installation:
- Downloads and installs `libssl1.1_1.1.1w-0+deb11u1_amd64.deb` from Debian archives
- Installs in both the `deps` and `runner` stages
- Properly configured for Debian-based images

### 3. Regenerated Prisma Client
Successfully regenerated Prisma Client with the correct binary target for Debian OpenSSL 1.1.x.

## Deployment Steps

### For Fresh Deployment:
1. Commit the updated `prisma/schema.prisma` file
2. Push to your repository
3. Trigger a new deployment in Coolify
4. The Docker build will automatically:
   - Install OpenSSL 1.1 libraries
   - Generate Prisma Client with the correct binary target
   - Copy the correct engine binary to the production image

### For Existing Deployment:
1. Rebuild the Docker image to ensure the new Prisma schema is used
2. The startup script will handle database migrations automatically

## Verification

After deployment, verify the fix by:
1. Checking application logs for Prisma connection success
2. Testing database operations through the application
3. Confirming no OpenSSL-related errors in the logs

## Technical Details

### Binary Target Explanation:
- `native`: For local development (macOS/Linux/Windows)
- `debian-openssl-1.1.x`: For Debian-based Docker containers with OpenSSL 1.1

### Why Debian OpenSSL 1.1?
- Debian 11 (Bullseye) uses OpenSSL 1.1
- Debian 12 (Bookworm) uses OpenSSL 3.0 by default
- The Dockerfile explicitly installs OpenSSL 1.1 for maximum compatibility
- Prisma's Debian binary requires OpenSSL 1.1 specifically

## Files Modified
- `prisma/schema.prisma` - Updated binary targets to `debian-openssl-1.1.x`
- `package.json` - Removed conflicting Prisma binary targets
- `Dockerfile` - Added OpenSSL 1.1 verification step for debugging

## Expected Outcome
The application will now successfully load the Prisma query engine with the correct OpenSSL 1.1 libraries, eliminating the "libssl.so.1.1: cannot open shared object file" error.

## Additional Notes
- This fix maintains backward compatibility with local development
- The `native` target ensures developers can work on any platform
- The Docker build process is fully automated and requires no manual intervention
- If you encounter any issues, ensure the Docker cache is cleared for a clean build

## Troubleshooting

If issues persist:
1. Clear Docker build cache: `docker builder prune -af`
2. Rebuild from scratch in Coolify
3. Verify environment variables are properly set
4. Check Coolify logs for build/runtime errors
