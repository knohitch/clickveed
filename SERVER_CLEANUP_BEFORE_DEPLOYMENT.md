# Server Cleanup Guide Before Deployment

This guide shows you how to clear cache, remove unwanted logs, and free up disk space on your server before deploying the updated application.

## Prerequisites
Run these commands from your server terminal (not your local machine). SSH into your server first:
```bash
ssh user@your-server-ip
```

## Step 1: Check Current Disk Space

First, check how much space you have available:

```bash
# Check overall disk space
df -h

# Check disk usage by directory
du -sh /var/lib/docker
du -sh /var/log
du -sh ~/.docker
```

## Step 2: Docker Cleanup

### Remove Unused Docker Resources

```bash
# Remove all stopped containers
docker container prune -f

# Remove all unused images (not just dangling)
docker image prune -a -f

# Remove all unused volumes (BE CAREFUL - this deletes database data!)
# docker volume prune -f  # ⚠️ UNCOMMENT ONLY IF YOU HAVE BACKUPS

# Remove all unused networks
docker network prune -f

# Remove all unused Docker resources in one command
docker system prune -a --volumes -f
```

### Clean Up Build Cache

```bash
# Remove Docker build cache
docker builder prune -a -f
```

### Remove Specific Docker Images

```bash
# List all Docker images
docker images

# Remove specific images by ID
docker rmi <IMAGE_ID> <IMAGE_ID>

# Remove images older than 24 hours
docker image prune -a --filter "until=24h"
```

## Step 3: System Log Cleanup

### Clean System Logs

```bash
# Clear journal logs (keep only last 7 days)
sudo journalctl --vacuum-time=7d

# Clear journal logs to specific size (500MB)
sudo journalctl --vacuum-size=500M

# Completely clear journal logs (not recommended)
sudo journalctl --rotate
sudo journalctl --vacuum-time=1s
```

### Clean Application Logs

```bash
# Clear nginx logs
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log

# Clear systemd logs
sudo truncate -s 0 /var/log/syslog
sudo truncate -s 0 /var/log/kern.log

# Clear auth logs
sudo truncate -s 0 /var/log/auth.log
```

### Clean Docker Container Logs

```bash
# Find and truncate Docker container logs
sudo find /var/lib/docker/containers -name "*-json.log" -exec truncate -s 0 {} \;

# Or find and remove old log files
sudo find /var/lib/docker/containers -name "*.log" -mtime +7 -delete
```

## Step 4: Package Manager Cleanup

### For Ubuntu/Debian:

```bash
# Update package lists
sudo apt-get update

# Remove unused packages
sudo apt-get autoremove -y

# Clean package cache
sudo apt-get autoclean
sudo apt-get clean

# Remove old kernel versions
sudo apt-get autoremove --purge -y
```

### For Alpine Linux (if using Alpine container):

```bash
# Remove cache
rm -rf /var/cache/apk/*
```

## Step 5: Node.js and npm Cleanup

```bash
# Clear npm cache
npm cache clean --force

# Clear yarn cache (if using yarn)
yarn cache clean

# Remove .next build directories (local only)
# rm -rf .next
```

## Step 6: Find and Remove Large Files

```bash
# Find files larger than 100MB
sudo find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null | awk '{print $9, $5}'

# Find files larger than 1GB
sudo find / -type f -size +1G -exec ls -lh {} \; 2>/dev/null | awk '{print $9, $5}'

# Find and remove old backup files
sudo find /home -name "*.backup" -mtime +30 -delete
sudo find /home -name "*.old" -mtime +30 -delete
```

## Step 7: Clean Up Specific Directories

```bash
# Clean temp directory
sudo rm -rf /tmp/*

# Clean user temp directory
rm -rf ~/tmp/*

# Clean browser cache (if any)
rm -rf ~/.cache/*

# Clean npm cache
rm -rf ~/.npm/_cacache/*
```

## Step 8: Database Cleanup (Optional)

### PostgreSQL Cleanup

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Run vacuum to reclaim space
VACUUM FULL;

# Vacuum specific database
VACUUM FULL your_database_name;

# Exit
\q
```

### MongoDB Cleanup

```bash
# Connect to MongoDB
mongo

# Repair database to reclaim space
db.repairDatabase()

# Exit
exit
```

## Step 9: Verify Space After Cleanup

```bash
# Check disk space again
df -h

# Check Docker space usage
docker system df

# Check top directories using space
sudo du -sh /* 2>/dev/null | sort -rh | head -20
```

## Step 10: Automated Cleanup Script

Save this as `cleanup-server.sh` and run it:

```bash
#!/bin/bash

echo "Starting server cleanup..."

# Docker cleanup
echo "Cleaning Docker..."
docker container prune -f
docker image prune -a -f
docker network prune -f
docker builder prune -a -f

# System logs
echo "Cleaning system logs..."
sudo journalctl --vacuum-time=7d

# Application logs
echo "Cleaning application logs..."
sudo truncate -s 0 /var/log/nginx/access.log 2>/dev/null
sudo truncate -s 0 /var/log/nginx/error.log 2>/dev/null
sudo find /var/lib/docker/containers -name "*-json.log" -exec truncate -s 0 {} \;

# Package manager
echo "Cleaning package cache..."
sudo apt-get autoremove -y
sudo apt-get autoclean
sudo apt-get clean

# Node.js cache
echo "Cleaning Node.js cache..."
npm cache clean --force

echo "Cleanup complete!"
df -h
```

Make it executable and run:
```bash
chmod +x cleanup-server.sh
sudo ./cleanup-server.sh
```

## Step 11: Verify You Have Enough Space for Build

Check if you have at least 20GB free for the build:

```bash
# Check free space
df -h | grep -E '^/dev/'

# If less than 20GB free, consider:
# 1. Removing more Docker images
# 2. Moving data to external storage
# 3. Expanding disk size
```

## Minimum Space Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Build Cache | 8 GB | 12 GB |
| Docker Images | 5 GB | 10 GB |
| Application | 2 GB | 5 GB |
| Logs | 1 GB | 2 GB |
| **Total** | **16 GB** | **29 GB** |

## Important Warnings

⚠️ **BEFORE RUNNING ANY DELETION COMMANDS:**

1. **Backup Important Data**
   ```bash
   # Backup database
   pg_dump -U username database_name > backup.sql
   
   # Backup important files
   tar -czf backup.tar.gz /path/to/important/files
   ```

2. **Don't Delete These:**
   - Database volumes (unless you have backups)
   - SSL certificates
   - Configuration files
   - Application data
   - Active Docker containers you need

3. **Test Changes Locally First**
   ```bash
   # Try commands locally before running on production
   docker system prune -a --dry-run
   ```

## Troubleshooting

### If Docker Build Still Fails

1. Check Docker daemon logs:
   ```bash
   sudo journalctl -u docker
   ```

2. Increase Docker storage limits:
   ```bash
   # Edit /etc/docker/daemon.json
   sudo nano /etc/docker/daemon.json
   
   # Add or modify:
   {
     "data-root": "/mnt/large-disk/docker",
     "storage-driver": "overlay2"
   }
   
   # Restart Docker
   sudo systemctl restart docker
   ```

3. Use a different disk with more space:
   ```bash
   # Move Docker data to larger disk
   sudo systemctl stop docker
   sudo mv /var/lib/docker /mnt/large-disk/
   sudo ln -s /mnt/large-disk/docker /var/lib/docker
   sudo systemctl start docker
   ```

### If System Becomes Slow After Cleanup

1. Restart services:
   ```bash
   sudo systemctl restart docker
   sudo systemctl restart nginx
   ```

2. Reboot server:
   ```bash
   sudo reboot
   ```

## Next Steps After Cleanup

Once you've cleaned up your server:

1. **Verify space is sufficient:**
   ```bash
   df -h
   ```

2. **Deploy the updated application:**
   ```bash
   # Pull latest code
   git pull origin main
   
   # Build new Docker image
   docker-compose build
   
   # Restart services
   docker-compose up -d
   ```

3. **Monitor deployment:**
   ```bash
   # Check logs
   docker-compose logs -f
   
   # Check container status
   docker-compose ps
   ```

## Summary Commands (Run in Sequence)

```bash
# 1. Check current space
df -h

# 2. Docker cleanup
docker system prune -a --volumes -f

# 3. Log cleanup
sudo journalctl --vacuum-time=7d
sudo find /var/lib/docker/containers -name "*-json.log" -exec truncate -s 0 {} \;

# 4. Package cleanup
sudo apt-get autoremove -y
sudo apt-get clean

# 5. Verify space
df -h

# 6. Deploy (if space is sufficient)
git pull origin main
docker-compose build
docker-compose up -d
```

## Support

If you encounter issues:
- Check Docker logs: `docker logs <container_name>`
- Check system logs: `sudo journalctl -xe`
- Check disk space: `df -h`
- Check Docker disk usage: `docker system df`