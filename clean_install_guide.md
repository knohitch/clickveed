# Clean Installation Guide for ClickVid Application

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git installed
- Docker (for Coolify deployments)

## Step-by-Step Clean Installation Process

### 1. Backup Your Data
Before proceeding, backup any important data:
```bash
# Backup database if applicable
# Backup any custom configurations
```

### 2. Remove Existing Installation
```bash
# Navigate to your project directory
cd /path/to/finalclickvid-main

# Remove node_modules and build artifacts
rm -rf node_modules .next dist

# Remove lock files
rm package-lock.json yarn.lock

# Remove any cached files
rm -rf .cache
```

### 3. Clean Git Repository
```bash
# Reset to clean state
git reset --hard
git clean -fdx

# Fetch latest changes
git fetch origin
```

### 4. Reinstall Dependencies
```bash
# Install fresh dependencies
npm install

# Or if using yarn
yarn install
```

### 5. Verify Configuration
Ensure your `.env` file is properly configured with all required environment variables:
```bash
# Check that all required environment variables are present
cat .env
```

### 6. Build the Application
```bash
# Run a clean build
npm run build

# Or if using yarn
yarn build
```

### 7. Test Locally
```bash
# Start the development server to test locally
npm run dev

# Or if using yarn
yarn dev
```

### 8. Deploy to Coolify
Once the local build works, redeploy to Coolify:
1. Go to Coolify dashboard
2. Trigger a new deployment
3. Ensure all environment variables are properly set in Coolify

## Additional Troubleshooting Steps

### Check for Environment Variable Issues
Make sure all required environment variables are properly configured in Coolify:
- DATABASE_URL
- AUTH_SECRET
- GOOGLE_CLIENT_SECRET
- CRON_SECRET
- And any other service-specific keys

### Validate Package Dependencies
```bash
# Check for dependency conflicts
npm ls

# Update package.json if needed
npm outdated
```

### Clear Docker Cache (if using Docker)
If deploying via Docker:
```bash
# Clear Docker build cache
docker builder prune -a

# Or restart Docker daemon
sudo systemctl restart docker
```

## Common Issues and Solutions

### 1. TypeScript Compilation Errors
If you're still seeing TypeScript errors:
```bash
# Clean TypeScript cache
rm -rf .next/cache

# Reinstall TypeScript dependencies
npm install --save-dev typescript @types/node
```

### 2. Nixpacks Build Issues
If the build is failing during Nixpacks phase:
```bash
# Try building with different Nixpacks settings
nixpacks build --build-cmd "npm run build" --start-cmd "npm start"
```

### 3. Memory Issues
If the build is failing due to memory constraints:
```bash
# Increase memory limits in Docker settings
# Or split the build process into smaller steps
```

## Final Deployment Steps

1. Commit all changes to git
2. Push to your repository
3. Trigger a new deployment in Coolify
4. Monitor the build logs for any remaining errors

This clean installation approach should resolve any corrupted or cached files that might be causing persistent deployment issues.
