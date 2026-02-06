# GitHub Deployment on 8GB RAM VPS - Complete Guide

## Problem
You deploy from GitHub to your VPS, but your VPS has 8GB RAM while the build needs 16GB RAM. This causes build failures during deployment.

## Solution: Build on GitHub Actions, Deploy to VPS

Since you're deploying from GitHub, use GitHub Actions to build the Docker image on GitHub's infrastructure (which has much more RAM), then deploy to your VPS.

---

## Option 1: GitHub Actions + Coolify/CapRover (Recommended)

### Step 1: Create GitHub Actions Workflow

Create `.github/workflows/build-and-push.yml`:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]
  workflow_dispatch:  # Allow manual trigger

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64
      
      - name: Image digest
        run: echo "Image pushed with digest ${{ steps.build.outputs.digest }}"
```

### Step 2: Configure Your Deployment Platform

#### For Coolify:

1. In your Coolify dashboard, go to your project
2. Click "Build Configuration"
3. Change "Build Type" from "Dockerfile" to "Docker Image"
4. Set "Image Name" to: `ghcr.io/yourusername/yourrepo:latest`
5. Add environment variables for GitHub Container Registry:
   - `DOCKER_REGISTRY_USERNAME`: your GitHub username
   - `DOCKER_REGISTRY_PASSWORD`: Your GitHub Personal Access Token

**How to create GitHub Personal Access Token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Select scopes: `read:packages`, `write:packages`
4. Generate and copy the token

#### For CapRover:

1. In CapRover dashboard, click "Apps" → your app
2. Click "Edit"
3. Go to "Deployment" section
4. Change "Deployment Type" from "GitHub Repository" to "Docker Image"
5. Set "Image Name" to: `ghcr.io/yourusername/yourrepo:latest`
6. Add registry credentials in "Registry Configuration"

### Step 3: Trigger Build

**Automatic (on push):**
```bash
git add .
git commit -m "Fix build memory issue"
git push origin main
```

**Manual:**
1. Go to GitHub repo → Actions tab
2. Select "Build and Push Docker Image"
3. Click "Run workflow"

### Step 4: Deploy on Your Platform

The platform will automatically pull the pre-built image from GitHub Container Registry and deploy it to your VPS. **No build happens on your VPS!**

---

## Option 2: Direct GitHub Actions Deploy to VPS

If you want to deploy directly without Coolify/CapRover:

### Step 1: Create GitHub Actions Workflow

Create `.github/workflows/deploy-to-vps.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build Docker image
        run: |
          docker build -t clickveed:latest .
      
      - name: Save image as tar
        run: |
          docker save clickveed:latest | gzip > image.tar.gz
      
      - name: Copy image to VPS
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "image.tar.gz"
          target: "/tmp/"
      
      - name: Load and run on VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            docker load < /tmp/image.tar.gz
            docker stop clickveed || true
            docker rm clickveed || true
            docker run -d \
              --name clickveed \
              -p 3000:3000 \
              --restart unless-stopped \
              --env-file /path/to/.env \
              clickveed:latest
            rm /tmp/image.tar.gz
```

### Step 2: Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

Add these secrets:
- `VPS_HOST`: Your VPS IP address
- `VPS_USERNAME`: Your SSH username on VPS
- `VPS_SSH_KEY`: Your SSH private key

**How to get SSH key:**
```bash
# On your local machine
cat ~/.ssh/id_rsa
# Copy the entire content including -----BEGIN and -----END lines
```

### Step 3: Deploy

Push to GitHub:
```bash
git add .
git commit -m "Deploy via GitHub Actions"
git push origin main
```

GitHub Actions will build the image and deploy it to your VPS automatically.

---

## Option 3: Use Vercel/Netlify (Easiest)

If you can use a different deployment platform:

### Vercel (Free tier):

1. Import your GitHub repo to Vercel
2. Vercel builds on their infrastructure (not your VPS)
3. No RAM issues
4. Automatic deployments on push

### Netlify (Free tier):

1. Connect GitHub repo to Netlify
2. Configure build settings
3. Netlify handles building
4. Deployed globally via CDN

---

## Comparison of GitHub Deployment Options

| Option | Build Location | VPS RAM Needed | Setup Time | Cost |
|--------|---------------|----------------|------------|------|
| GitHub Actions + Container Registry | GitHub Actions | 500 MB (run only) | 10-15 min | Free |
| GitHub Actions Direct Deploy | GitHub Actions | 500 MB (run only) | 15-20 min | Free |
| Coolify/CapRover (GitHub direct) | Your VPS | 16 GB | 5 min | Free |
| Vercel | Vercel | 0 MB (no VPS needed) | 5 min | Free |
| Netlify | Netlify | 0 MB (no VPS needed) | 5 min | Free |

---

## My Recommendation: Option 1 (GitHub Actions + Container Registry)

**Why?**
✅ **Builds on GitHub** - Uses GitHub's powerful infrastructure (16GB+ RAM)
✅ **Deploy to your VPS** - Keep your existing VPS setup
✅ **Works with Coolify/CapRover** - Just change image source
✅ **Fast deployment** - Pre-built image, just pull and run
✅ **Free** - GitHub Actions is free for public repos
✅ **Professional** - Standard DevOps practice

---

## Complete Setup Instructions (Option 1)

### 1. Create GitHub Actions Workflow

```bash
# Create workflow directory
mkdir -p .github/workflows

# Create workflow file
nano .github/workflows/build-and-push.yml

# Paste the workflow from Option 1 above
```

### 2. Commit and Push

```bash
git add .github/workflows/build-and-push.yml
git commit -m "Add GitHub Actions build workflow"
git push origin main
```

### 3. Verify Build

1. Go to GitHub repo
2. Click "Actions" tab
3. Watch the "Build and Push Docker Image" workflow
4. It should build successfully on GitHub Actions

### 4. Configure Your Deployment Platform

**For Coolify:**
```yaml
# In Coolify, change to Docker Image deployment:
Image: ghcr.io/yourusername/yourrepo:latest
Registry: ghcr.io
Username: your-username
Password: your-github-pat
```

**For CapRover:**
```yaml
# In CapRover, use Docker Image:
Image Name: ghcr.io/yourusername/yourrepo:latest
Registry: https://ghcr.io
Username: your-username
Password: your-github-pat
```

### 5. Deploy

Your platform will now pull the pre-built image from GitHub Container Registry instead of building on your VPS.

---

## Troubleshooting

### GitHub Actions Build Fails

**Check logs:**
```bash
# Go to GitHub → Actions → Click on workflow run → Check logs
```

**Common issues:**
- Permissions: Make sure `packages: write` is set in workflow
- Authentication: Check GitHub token has correct scopes
- Build timeout: Increase timeout in workflow

### Platform Can't Pull Image

**Check GitHub Container Registry permissions:**
1. Go to GitHub repo → Settings
2. "Actions" → "General"
3. Workflow permissions: "Read and write permissions"
4. Save

### Image Pull Fails

**Authenticate with GitHub Container Registry:**
```bash
# On VPS, test pull
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin
docker pull ghcr.io/yourusername/yourrepo:latest
```

---

## Summary

Since you deploy from GitHub and have an 8GB RAM VPS:

**Best Solution:** Use GitHub Actions to build Docker image, push to GitHub Container Registry, then deploy to your VPS.

**Steps:**
1. Create GitHub Actions workflow (builds on GitHub)
2. Push workflow to GitHub
3. Configure your deployment platform to pull from ghcr.io
4. Deploy (platform pulls pre-built image, no build on VPS)

**Result:** Your VPS only runs the container (500 MB RAM), no build needed (16 GB RAM).

This keeps your existing GitHub deployment workflow but moves the build to GitHub Actions instead of your VPS.