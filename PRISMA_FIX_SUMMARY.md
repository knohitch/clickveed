# Prisma Alpine Linux Compatibility Fix - Summary

## Problem
The application was encountering an error when trying to run in an Alpine Linux Docker container:

```
Invalid `prisma.user.findUnique()` invocation: 
Unable to require(`/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node`). 
The Prisma engines do not seem to be compatible with your system.
Details: Error loading shared library libssl.so.1.1: No such file or directory
```

## Root Cause
The issue had two components:
1. The Prisma client was not being generated with the correct binary target for Alpine Linux. While the main `prisma/schema.prisma` file had the `linux-musl` binary target configured, the `src/prisma/schema.prisma` file was missing this configuration.
2. The Alpine Linux container was missing the required SSL library (`libssl.so.1.1`) needed by the Prisma client.

## Solution Implemented

1. **Updated Prisma Schema Configuration**
   - Added `binaryTargets = ["native", "linux-musl"]` to the generator block in `src/prisma/schema.prisma`
   - This ensures that the Prisma client is generated with support for both the native development environment and Alpine Linux

2. **Ran the Fix Script**
   - Executed `./fix-prisma-alpine.sh` which:
     - Cleans up existing Prisma client files
     - Regenerates the Prisma client with Alpine Linux support
     - The script uses `npx prisma generate` which reads the updated schema and generates the appropriate binaries

3. **Updated Dockerfile to Install Required Libraries**
   - Added installation of SSL libraries in the runner stage of the Dockerfile:
     ```dockerfile
     RUN apk add --no-cache openssl libssl3
     ```
   - This ensures that the required SSL libraries are available in the final container image (using libssl3 for Alpine 3.21+ compatibility)

4. **Verification**
   - Confirmed that `libquery_engine-linux-musl.so.node` is now present in `node_modules/.prisma/client/`
   - This binary is specifically compiled for Alpine Linux (musl libc) and will resolve the compatibility issue with the added SSL libraries

## Files Modified

1. `src/prisma/schema.prisma` - Added linux-musl binary target to the generator configuration
2. `node_modules/.prisma/client/` - Regenerated with Alpine Linux support binaries
3. `Dockerfile` - Added installation of required SSL libraries in the runner stage

## How to Deploy the Fix

1. Rebuild your Docker image:
   ```bash
   docker build -t your-app-name .
   ```

2. Run your container:
   ```bash
   docker run -p 3000:3000 your-app-name
   ```

The Prisma client should now work correctly with Alpine Linux in your Docker container, and the signup error should be resolved.
