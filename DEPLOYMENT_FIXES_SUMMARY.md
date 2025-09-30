# Deployment Fixes Summary

This document summarizes the fixes applied to resolve the deployment issues encountered when deploying to Coolify.

## Issues Identified

1. **Missing startup.sh file in Docker build**: The Docker build was failing with "failed to calculate checksum of ref ... "/app/startup.sh": not found"

2. **Prisma OpenSSL compatibility issues**: Multiple warnings about "Prisma failed to detect the libssl/openssl version" and errors about "Error loading shared library libssl.so.1.1: No such file or directory"

3. **npm ci failure during Docker build**: The deployment was failing during the `npm ci` step in the Docker build process with the error "Oops something is not okay, are you okay? 😢"

4. **Missing devDependencies during build**: The NODE_ENV was set to 'production' during the build process, which caused npm to skip installing devDependencies. However, the application needs devDependencies to build properly.

5. **OpenSSL library compatibility**: The Dockerfile was trying to install `libssl1.1` which is not available in Alpine Linux package repository.

## Fixes Applied

### 1. Fixed .dockerignore to Include startup.sh

The .dockerignore file was excluding all shell scripts with the pattern `*.sh`, which prevented the startup.sh file from being included in the Docker build context.

**Change made:**
```diff
# Scripts
*.sh
+ !startup.sh
```

This allows the startup.sh file to be included in the Docker build while still excluding other shell scripts.

### 2. Updated Dockerfile for OpenSSL Compatibility

The Dockerfile was trying to install `libssl1.1` which is not available in Alpine Linux. We updated the Dockerfile to use the correct OpenSSL libraries.

**Changes made:**
```diff
# In both deps and runner stages
- RUN apk add --no-cache libc6-compat openssl libssl1.1
+ RUN apk add --no-cache libc6-compat openssl libssl3
```

This ensures that the required OpenSSL libraries are available during both build and runtime stages.

### 3. Fixed NODE_ENV Issue in Dockerfile

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

### 4. Verified Prisma Configuration

Confirmed that the correct binary targets are configured in both `package.json` and `prisma/schema.prisma`:

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

## Files Modified

1. `.dockerignore` - Added exception for startup.sh
2. `Dockerfile` - Updated OpenSSL library installation and NODE_ENV configuration

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
1. Successfully build the Docker image without the "startup.sh not found" error
2. Resolve all Prisma OpenSSL compatibility issues
3. Automatically run database migrations and seeding
4. Start the application successfully

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
