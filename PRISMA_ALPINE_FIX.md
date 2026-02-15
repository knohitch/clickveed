# Prisma Alpine Linux Fix

This document explains how to fix the Prisma client compatibility issue with Alpine Linux in Docker.

## Problem

The error occurred because the Prisma client was trying to load a Linux-specific engine binary (`libquery_engine-linux-musl.so.node`) but couldn't find the required shared library `libssl.so.1.1`. This is a common issue when using Prisma with Alpine Linux in Docker containers.

## Solution

The fix involves configuring Prisma to use the correct binary target for Alpine Linux:

1. Updated `package.json` to include `linux-musl` in the Prisma binary targets
2. Updated `prisma/schema.prisma` to include `linux-musl` in the generator binary targets
3. Updated the Dockerfile to properly generate the Prisma client with the correct binary target

## Files Modified

- `package.json`: Added `linux-musl` to the Prisma binary targets
- `prisma/schema.prisma`: Added `linux-musl` to the generator binary targets
- `Dockerfile`: Updated the Prisma client generation command

## How to Rebuild

1. Run the fix script:
   ```bash
   ./fix-prisma-alpine.sh
   ```

2. Rebuild your Docker image:
   ```bash
   docker build -t your-app-name .
   ```

3. Run your container:
   ```bash
   docker run -p 3000:3000 your-app-name
   ```

The Prisma client should now work correctly with Alpine Linux in your Docker container.