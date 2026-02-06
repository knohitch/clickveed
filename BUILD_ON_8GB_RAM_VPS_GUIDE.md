# Building on 8GB RAM VPS - Solutions

## Problem
Your VPS has 8GB RAM, but the Docker build needs 16GB for TypeScript compilation. This will cause the build to fail with OOM (Out Of Memory) errors.

## Solutions (Choose One)

---

## Solution 1: Build Locally, Deploy to VPS (RECOMMENDED)

**Best for:** Most users, fastest deployment, no VPS memory issues

### Steps:

1. **Build the Docker image locally:**
```bash
# On your local machine
cd /path/to/clickveed-main
docker build -t clickveed:latest .
```

2. **Push to Docker Registry (Docker Hub or private registry):**
```bash
# Tag the image
docker tag clickveed:latest your-username/clickveed:latest

# Push to Docker Hub
docker push your-username/clickveed:latest
```

3. **Pull and run on VPS:**
```bash
# On your VPS
docker pull your-username/clickveed:latest
docker run -d -p 3000:3000 --name clickveed your-username/clickveed:latest
```

### Using Docker Hub:
- Create free account at https://hub.docker.com
- Push your image there
- Pull from VPS

### Using GitHub Container Registry (Free):
```bash
# Tag for GitHub
docker tag clickveed:latest ghcr.io/your-username/clickveed:latest

# Login to GitHub
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin

# Push
docker push ghcr.io/your-username/clickveed:latest

# On VPS
docker pull ghcr.io/your-username/clickveed:latest
```

---

## Solution 2: Add Swap Space to Extend Memory

**Best for:** When you must build on VPS, temporary solution

### Steps:

1. **Check current swap:**
```bash
sudo swapon --show
free -h
```

2. **Create 8GB swap file:**
```bash
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

3. **Make swap permanent:**
```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

4. **Configure swappiness (use swap less aggressively):**
```bash
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

5. **Verify:**
```bash
free -h
# You should now see ~16GB total (8GB RAM + 8GB swap)
```

6. **Now build:**
```bash
docker build -t clickveed:latest .
```

**Warning:** Build will be slower (swap is slower than RAM)

---

## Solution 3: Disable Strict Type Checking (Quickest Fix)

**Best for:** When you need to build on VPS immediately

Modify `next.config.mjs`:

```javascript
// Disable type checking during build
typescript: {
  ignoreBuildErrors: true  // Set to true
},
```

### Steps:

1. **Edit next.config.mjs:**
```bash
nano next.config.mjs
```

2. **Change:**
```javascript
typescript: {
  ignoreBuildErrors: true  // Skip type checking
},
```

3. **Build:**
```bash
docker build -t clickveed:latest .
```

**Warning:** You won't catch TypeScript errors during build

---

## Solution 4: Build in Stages with Reduced Memory

**Best for:** When you want type checking but can't upgrade RAM

Modify `next.config.mjs`:

```javascript
typescript: {
  ignoreBuildErrors: false,
  // Add these settings to reduce memory
  build: {
    transpileOnly: true  // Skip full type check
  }
}
```

Or modify `package.json` build script:

```json
{
  "scripts": {
    "build": "prisma generate && cross-env NODE_OPTIONS='--max-old-space-size=6144' next build --no-lint"
  }
}
```

---

## Solution 5: Use Next.js Standalone Output (Smaller Build)

Already enabled in your Dockerfile. This helps but doesn't solve memory issue.

---

## Solution 6: Upgrade VPS RAM

**Best for:** Long-term solution, recommended for production

Cost considerations:
- 8GB RAM: $X/month
- 16GB RAM: $Y/month (typically 2-3x more)

Popular providers:
- DigitalOcean: $40/month for 16GB
- AWS: ~$50-100/month for 16GB
- Vultr: $40/month for 16GB
- Hetzner: ~$25/month for 16GB (cheapest option)

---

## Recommended Approach for You

Given your 8GB RAM constraint, I recommend **Solution 1: Build Locally, Deploy to VPS**

### Why?
✅ Fastest deployment (build on your powerful machine)
✅ No VPS memory issues
✅ No cost increase
✅ Better for development (quick iterations)
✅ Can use GitHub Actions for CI/CD

### Complete Workflow:

#### On Local Machine:
```bash
# 1. Build Docker image
docker build -t clickveed:latest .

# 2. Push to registry (choose one)
# Option A: Docker Hub
docker tag clickveed:latest yourusername/clickveed:latest
docker push yourusername/clickveed:latest

# Option B: GitHub Container Registry (free)
docker tag clickveed:latest ghcr.io/yourusername/clickveed:latest
docker login ghcr.io -u yourusername --password-stdin
docker push ghcr.io/yourusername/clickveed:latest
```

#### On VPS:
```bash
# 3. Pull image
docker pull yourusername/clickveed:latest
# OR
docker pull ghcr.io/yourusername/clickveed:latest

# 4. Stop old container
docker stop clickveed
docker rm clickveed

# 5. Run new container
docker run -d \
  --name clickveed \
  -p 3000:3000 \
  --env-file .env \
  yourusername/clickveed:latest
```

---

## Alternative: GitHub Actions (Free CI/CD)

Automate building and pushing to your VPS:

### Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.actor }}/clickveed:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            docker pull ghcr.io/${{ github.actor }}/clickveed:latest
            docker stop clickveed || true
            docker rm clickveed || true
            docker run -d --name clickveed -p 3000:3000 --env-file .env ghcr.io/${{ github.actor }}/clickveed:latest
```

### Setup:
1. Add secrets to GitHub repo settings:
   - `VPS_HOST`: your VPS IP
   - `VPS_USERNAME`: your SSH username
   - `VPS_SSH_KEY`: your SSH private key

2. Push to GitHub and it auto-deploys!

---

## Quick Reference Table

| Solution | RAM Needed | Time | Cost | Difficulty |
|----------|-----------|------|------|------------|
| Build Locally | Your machine | 5-10 min | Free | Easy |
| Add Swap | 8GB + 8GB swap | 20-30 min | Free | Medium |
| Disable Type Check | 8GB | 5-10 min | Free | Very Easy |
| Reduce Type Check | 8GB | 10-15 min | Free | Medium |
| Upgrade VPS | 16GB | N/A | $20-80/mo | Easy |
| GitHub Actions | Build on GitHub | 10-15 min | Free | Medium |

---

## My Recommendation

**For immediate deployment:**
1. Build locally (5-10 minutes)
2. Push to Docker Hub or GitHub Container Registry
3. Pull and run on VPS

**For long-term:**
- Set up GitHub Actions for automated deployment
- Consider upgrading VPS if you need to build on it frequently

---

## Troubleshooting

### If swap doesn't work:
```bash
# Check if swap is being used
cat /proc/swaps
free -h

# If swap is 0, try:
sudo swapoff /swapfile
sudo swapon /swapfile
```

### If build still fails with 8GB RAM:
- Use Solution 3 (disable type checking)
- Or use Solution 1 (build locally)

### If VPS is slow after adding swap:
- Reduce swap size
- Close other applications
- Consider upgrading VPS

---

## Summary

You have an 8GB RAM VPS, but the build needs 16GB. The best solution is to **build locally and deploy to VPS**. This is:
- Fastest (build on your powerful machine)
- Free (no VPS upgrade needed)
- Reliable (no memory issues)
- Professional (standard DevOps practice)

See detailed steps above for implementation.