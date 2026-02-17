# Low Memory Build Solutions for Clickveed

This guide provides solutions for building Clickveed in memory-constrained environments.

## Problem
The Next.js build process is running out of memory (heap out of memory error) during Docker builds.

## Solutions Applied

### 1. Increased Memory Limit (Recommended)
**File: `Dockerfile`**
- Increased Node.js heap size from 1.5GB to 2GB
- Added garbage collection interval optimization
- `NODE_OPTIONS="--max-old-space-size=2048 --gc-interval=100"`

### 2. Webpack Build Optimizations
**File: `next.config.mjs`**
- Added aggressive code splitting to reduce chunk sizes
- Configured `splitChunks` with smaller `maxSize` (244kb)
- Set deterministic module IDs for better caching
- Disabled performance hints to reduce overhead

### 3. Alternative Ultra-Low Memory Dockerfile
**File: `Dockerfile.lowmem`**
- Uses 3GB memory limit with fallback to 2.5GB
- Includes retry logic if build fails
- Use this if the standard Dockerfile still fails

## Deployment Options

### Option A: Standard Dockerfile (2GB Memory)
```bash
docker build -t clickveed .
```
**Requirements:** At least 3-4GB RAM available during build

### Option B: Low Memory Dockerfile (3GB Memory with Fallback)
```bash
docker build -f Dockerfile.lowmem -t clickveed .
```
**Requirements:** At least 4-5GB RAM available during build

### Option C: Build Locally, Deploy Image
If your deployment platform has limited build resources:

1. Build on a local machine or CI/CD with sufficient RAM:
   ```bash
   docker build -t your-registry/clickveed:latest .
   docker push your-registry/clickveed:latest
   ```

2. Deploy the pre-built image on your platform

### Option D: Platform-Specific Solutions

#### Coolify
- Ensure your server has at least 4GB RAM
- Increase build memory limits in Coolify settings
- Consider using a separate build server

#### CapRover
- Increase captain-definition memory limits
- Use a CapRover instance with at least 4GB RAM
- Enable swap if needed

#### Railway/Render/Vercel
- These platforms typically handle memory automatically
- Railway: Increase build resources in project settings
- Vercel: Usually works out of the box (uses their build servers)

## Memory Requirements Summary

| Environment | Minimum RAM | Recommended RAM |
|-------------|-------------|-----------------|
| Build Process | 2.5GB | 4GB |
| Runtime | 512MB | 1GB |
| Development | 2GB | 4GB |

## If Builds Still Fail

### 1. Add Swap Space (Linux/Docker)
Create swap file on your build server:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 2. Use Multi-Stage CI/CD
Split builds across multiple jobs to avoid memory spikes

### 3. Reduce Build Complexity
Comment out unused features in your codebase temporarily

### 4. Use Cloud Build Services
- GitHub Actions (7GB RAM available)
- GitLab CI (configurable)
- CircleCI (4GB+ RAM available)

## Monitoring Build Memory

Add this to your Dockerfile to see memory usage:
```dockerfile
RUN free -m && df -h
RUN npm run build -- --no-lint
RUN free -m
```

## Quick Fixes

### If you see "JavaScript heap out of memory":
1. Increase `max-old-space-size` in Dockerfile (line 17)
2. Try `Dockerfile.lowmem` instead
3. Build on a machine with more RAM
4. Enable swap space

### If you see "Cannot allocate memory":
1. Free up system memory
2. Close other Docker containers
3. Increase Docker memory limits
4. Add swap space

## Platform-Specific Build Commands

### Coolify
```bash
# In Coolify, ensure server has 4GB+ RAM
# Build will use the standard Dockerfile automatically
```

### CapRover
```json
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile"
}
```

### Docker Compose
```yaml
version: '3.8'
services:
  clickveed:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NODE_OPTIONS=--max-old-space-size=2048
    deploy:
      resources:
        limits:
          memory: 4G
```

## Next Steps

1. Try rebuilding with the updated Dockerfile (2GB memory)
2. If it fails, use `Dockerfile.lowmem` (3GB memory)
3. If still failing, build locally and push the image
4. Consider upgrading server RAM or using a build service

## Support

For more help:
- Check build logs for specific error messages
- Monitor memory usage during build: `docker stats`
- Ensure no other heavy processes are running during build
