# Coolify Deployment Guide

## Prerequisites
Before deploying, ensure you have:
1. A PostgreSQL database set up and accessible
2. The following environment variables configured in Coolify:
   - `DATABASE_URL` - Connection string to your PostgreSQL database
   - `NEXTAUTH_URL` - The canonical URL of your site
   - `NEXTAUTH_SECRET` - A strong secret for NextAuth.js

## Deployment Steps

### 1. Configure Environment Variables in Coolify
1. Go to your Coolify application
2. Navigate to the "Environment Variables" section
3. Add the following variables:
   ```
   DATABASE_URL=your-postgresql-connection-string
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=your-super-strong-secret
   ```

### 2. Add Pre-Deployment Command for Database Migrations
This is the critical step to fix the "User table does not exist" error:

1. In your Coolify application, go to the "Deployment" settings
2. Find the "Pre-deployment" or "Command" section
3. Add the following command to run database migrations:
   ```
   npx prisma migrate deploy
   ```

This command will ensure that all database migrations are applied before your application starts, creating all the necessary tables including `User`.

### 3. Configure the Main Deployment
1. Make sure your source is correctly set (GitHub repository)
2. Ensure the build pack is set to "Dockerfile"
3. Set the port to 3000 (or whatever port your application uses)

### 4. Deploy the Application
1. Click "Deploy" in Coolify
2. The deployment process will:
   - Run the pre-deployment command (`npx prisma migrate deploy`) to create database tables
   - Build your Docker image
   - Start your application

## Troubleshooting

### If you still get the "User table does not exist" error:
1. Verify that your `DATABASE_URL` environment variable is correctly set in Coolify
2. Check that your database is accessible from the Coolify environment
3. Ensure the pre-deployment command is correctly configured

### To manually verify database tables:
If you have direct access to your database, you can check if the tables were created:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

This should show all the required tables including `User`, `Account`, `Session`, etc.

## Additional Notes
- The initial deployment may take some time (up to 20+ minutes) due to the size of the application
- Monitor the deployment logs in Coolify for any additional errors
- If you make changes to your Prisma schema in the future, new migrations will be automatically applied during deployment
