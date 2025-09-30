# Coolify Deployment Fixes

This document summarizes the fixes applied to resolve the deployment issues encountered when deploying to Coolify.

## Issues Identified

1. **npm ci failure during Docker build**: The deployment was failing during the `npm ci` step in the Docker build process with the error "Oops something is not okay, are you okay? 😢"

2. **Missing devDependencies during build**: The NODE_ENV was set to 'production' during the build process, which caused npm to skip installing devDependencies. However, the application needs devDependencies to build properly.

3. **OpenSSL library compatibility**: Attempted to install `libssl1.1` which is not available in Alpine Linux package repository.

## Fixes Applied

### 1. Fixed NODE_ENV Issue in Dockerfile

The main issue was that NODE_ENV was set to 'production' during the build process, which caused npm to skip installing devDependencies. The application needs devDependencies to build properly.

**Changes made:**
```diff
# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
# Install all dependencies including devDependencies for build process
# Use npm install instead of npm ci to ensure devDependencies are installed
+ RUN npm install
```

This ensures that devDependencies are installed during the build process.

### 2. Updated OpenSSL Libraries

Updated the Dockerfile to use the correct OpenSSL libraries that are available in Alpine Linux.

**Changes made:**
```diff
# In both deps and runner stages
- RUN apk add --no-cache libc6-compat openssl libssl1.1
+ RUN apk add --no-cache libc6-compat openssl libssl3
```

This ensures that the required OpenSSL libraries are available during both build and runtime stages. The Prisma configuration has been verified to use the correct binary targets for OpenSSL 3.0.x.

## Files Modified

1. `Dockerfile` - Fixed NODE_ENV issue and updated OpenSSL library installation

## Deployment Instructions for Coolify

1. Ensure the following environment variables are set in Coolify:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `NEXTAUTH_URL` - Your application's URL
   - `NEXTAUTH_SECRET` - A strong secret for NextAuth.js

2. Set the build pack to "Dockerfile"
3. Ensure the source is correctly pointing to your GitHub repository
4. Set the port to 3000

## Expected Outcome

With these fixes, your Coolify deployment should:
1. Successfully build the Docker image without the npm ci failure
2. Install all required dependencies including devDependencies during build
3. Resolve all Prisma OpenSSL compatibility issues
4. Automatically run database migrations and seeding
5. Start the application successfully

## Troubleshooting

If you still encounter issues:

1. Check that the required SSL libraries are installed in the container:
   ```bash
   docker run --rm your-image-name apk list | grep openssl
   ```

2. Verify Prisma client generation:
   ```bash
   # In your project directory
   npx prisma generate
   ls node_modules/.prisma/client/*.node
   ```

3. Check the build logs for any specific error messages during the npm ci step
