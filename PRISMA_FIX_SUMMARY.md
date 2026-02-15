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
The issue had three components:
1. The Prisma client was not being generated with the correct binary target for Alpine Linux. While the main `prisma/schema.prisma` file had the `linux-musl` binary target configured, the `src/prisma/schema.prisma` file was missing this configuration.
2. The Alpine Linux container was missing the required SSL library (`libssl.so.1.1`) needed by the Prisma client.
3. The specific runtime environment required `linux-musl-openssl-3.0.x` binary target, which was not included in the configuration.

## Solution Implemented

1. **Updated Prisma Schema Configuration**
   - Added `binaryTargets = ["native", "linux-musl", "linux-musl-openssl-3.0.x"]` to the generator block in both `src/prisma/schema.prisma` and `prisma/schema.prisma`
   - Updated the `package.json` file to include the same binary targets in the prisma configuration
   - This ensures that the Prisma client is generated with support for the native development environment, Alpine Linux, and the specific OpenSSL 3.0.x variant

2. **Ran the Fix Script**
   - Executed `./fix-prisma-alpine.sh` which:
     - Cleans up existing Prisma client files
     - Regenerates the Prisma client with all required binary targets
     - The script uses `npx prisma generate` which reads the updated schema and generates the appropriate binaries

3. **Updated Dockerfile to Install Required Libraries**
   - Added installation of SSL libraries in the runner stage of the Dockerfile:
     ```dockerfile
     RUN apk add --no-cache openssl libssl3
     ```
   - This ensures that the required SSL libraries are available in the final container image (using libssl3 for Alpine 3.21+ compatibility)

4. **Verification**
   - Confirmed that the required binary engines are now present in `node_modules/.prisma/client/`
   - This ensures compatibility with the Alpine Linux environment with OpenSSL 3.0.x

## Files Modified

1. `src/prisma/schema.prisma` - Added linux-musl and linux-musl-openssl-3.0.x binary targets to the generator configuration
2. `prisma/schema.prisma` - Added linux-musl and linux-musl-openssl-3.0.x binary targets to the generator configuration
3. `package.json` - Added linux-musl and linux-musl-openssl-3.0.x binary targets to the prisma configuration
4. `Dockerfile` - Added installation of required SSL libraries in the runner stage

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
