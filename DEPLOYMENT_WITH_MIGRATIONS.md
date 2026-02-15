# Deployment Guide with Database Migrations

## Problem
The application is failing with the error: "The table `public.User` does not exist in the current database."
This indicates that the database migrations have not been applied in the deployment environment.

## Solution
Ensure that database migrations are run during the deployment process.

## Deployment Steps

1. **Build the Docker image**
   ```bash
   docker build -t your-app-name .
   ```

2. **Run database migrations**
   Before starting the application, run the migrations to create the database schema:
   ```bash
   # If using the same Docker image
   docker run --rm -v $(pwd):/app -w /app your-app-name npx prisma migrate deploy
   
   # Or if you have Prisma CLI installed locally and proper DATABASE_URL configured
   npx prisma migrate deploy
   ```

3. **Start the application**
   ```bash
   docker run -p 3000:3000 your-app-name
   ```

## Alternative Approach: Modify Dockerfile

To automate migrations during deployment, you can modify the Dockerfile to include a migration step. However, this approach requires careful consideration as you don't want to run migrations every time the container starts.

A better approach is to have a separate deployment script:

```bash
#!/bin/bash
# deploy.sh

# Build the image
docker build -t your-app-name .

# Run migrations (using a temporary container)
docker run --rm -v $(pwd):/app -w /app your-app-name npx prisma migrate deploy

# Start the application
docker run -d -p 3000:3000 your-app-name
```

## For Coolify Deployment

In Coolify, you can add a "Command" deployment option that runs the migrations before starting the application:

1. In the Coolify deployment settings, add a "Command" step:
   ```
   npx prisma migrate deploy
   ```

2. Then proceed with the normal container deployment.

## Environment Variables

Ensure that the `DATABASE_URL` environment variable is properly set in your deployment environment to point to the correct database.

## Verification

After deployment, verify that the tables were created by checking the database:
```bash
psql -d your-database-name -c "\dt"
```

This should show all the required tables including `User`, `Account`, `Session`, etc.
