# Production deployment to VPS
# This guide shows how to deploy WITHOUT Docker building

## Option 1: Direct VPS Deployment (Fastest - skips Docker build)

### Steps:

1. **SSH into your VPS**
   ```bash
   ssh user@your-vps-ip
   ```

2. **Clone or pull the repository**
   ```bash
   cd /var/www
   git clone https://github.com/knohitch/clickveed.git
   cd clickveed
   ```

3. **Install Node.js 18**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install dependencies and build**
   ```bash
   npm install
   npx prisma generate
   NODE_OPTIONS="--max-old-space-size=1536" npm run build
   ```

5. **Install PM2 for process management**
   ```bash
   npm install -g pm2
   pm2 start npm --name "clickveed" -- start
   pm2 save
   pm2 startup
   ```

6. **Set up reverse proxy with Nginx**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/clickveed
   ```
   
   Add this config:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   sudo ln -s /etc/nginx/sites-available/clickveed /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Option 2: Docker Runtime Image (Lightweight)

If you prefer Docker, use the `Dockerfile.runtime` which skips the build step:

### Steps:

1. **Build on your local machine** (where you have more memory)
   ```bash
   npm run build
   ```

2. **Copy only the built files to VPS**
   ```bash
   scp -r .next public prisma package*.json user@your-vps:/app/
   ```

3. **On VPS, run with the runtime Dockerfile**
   ```bash
   cd /app
   docker build -f Dockerfile.runtime -t clickveed .
   docker run -d -p 3000:3000 --name clickveed clickveed
   ```

## Option 3: GitHub Actions + Runtime Image

1. **Use GitHub Actions to build** (push the Dockerfile.runtime)
2. **Pull the pre-built image on VPS**
   ```bash
   docker pull ghcr.io/knohitch/clickveed:latest
   docker run -d -p 3000:3000 --name clickveed ghcr.io/knohitch/clickveed:latest
   ```

## Environment Variables

Set these on your VPS or in Docker:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Auth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret"
AUTH_SECRET="your-secret"

# AI Provider (at least one)
GOOGLE_AI_API_KEY="your-key"
OPENAI_API_KEY="your-key"
```

## Memory Optimization Tips

1. **Clear npm cache before build:**
   ```bash
   npm cache clean --force
   ```

2. **Use swap file on VPS:**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. **Limit Node.js memory:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=1536"
   ```

## Deployment Script

Use the included `deploy-vps.sh` script:

```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

This script:
- Installs dependencies
- Generates Prisma client
- Builds the app
- Starts with PM2

## Monitoring

- **Check status:** `pm2 status`
- **View logs:** `pm2 logs`
- **Restart:** `pm2 restart clickveed`
- **Stop:** `pm2 stop clickveed`

## Updates

To deploy updates:

```bash
git pull
npm install
npm run build
pm2 restart clickveed
```
