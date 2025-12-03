# Deployment Guide

## Important: Database Migrations

Before deploying the application, ensure that database migrations are run to create the required tables.

### Prerequisites
- PostgreSQL database
- Properly configured `DATABASE_URL` environment variable

### Deployment Steps

1. **Build the Docker image**
   ```bash
   docker build -t clickvid-app .
   ```

2. **Run database migrations**
   ```bash
   # Using the Docker image to run migrations
   docker run --rm -v $(pwd):/app -w /app clickvid-app npx prisma migrate deploy
   
   # Or if you have Prisma CLI installed locally
   npx prisma migrate deploy
   ```

3. **Start the application**
   ```bash
   docker run -d -p 3000:3000 clickvid-app
   ```

### For Coolify Deployment

Refer to the detailed [Coolify Deployment Guide](COOLIFY_DEPLOYMENT_GUIDE.md) for step-by-step instructions.

With the updated Dockerfile, database migrations and seeding will run automatically when the container starts, so you no longer need to add pre-deployment commands for this.

The Dockerfile has been updated to:
1. Install devDependencies (including `tsx` needed for seeding)
2. Run migrations and seeding automatically at startup via `startup.sh`

### Verification

After deployment, verify that all required tables were created:
```bash
psql -d your-database-name -c "\dt"
```

This should show tables including `User`, `Account`, `Session`, `Plan`, etc.

### Troubleshooting

If you encounter the error "The table `public.User` does not exist in the current database":
1. Verify that the `DATABASE_URL` environment variable is correctly set
2. Ensure that the migrations have been run successfully
3. Check that the database is accessible from the deployment environment
