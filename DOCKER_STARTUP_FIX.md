# Docker Startup Script Fix

## Problems Resolved

### 1. Startup Script Not Found
The Docker container was failing to start with the error:
```
/usr/local/bin/docker-entrypoint.sh: exec: line 11: ./startup.sh: not found
```

### 2. Database Seeding Failure
After fixing the startup script, users encountered:
```
Sign Up Failed
An unexpected error occurred: Default 'Free' plan not found. Please seed the database.
```

## Root Causes

1. **Incorrect CMD instruction**: The Dockerfile was using a CMD command that directly executed the commands instead of using the startup.sh script.
2. **Incompatible shell**: The startup.sh script was using `#!/bin/bash` shebang which may not be available in Alpine Linux (which uses BusyBox and has `/bin/sh` instead).
3. **Missing production dependency**: The `tsx` package needed for running the seed script was only in `devDependencies`, making it unavailable in the production container.

## Changes Made

### 1. Updated Dockerfile

Changed the CMD instruction to use the startup.sh script:

```dockerfile
# Before
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node server.js"]

# After
CMD ["./startup.sh"]
```

### 2. Updated startup.sh

Modified the startup script to be compatible with Alpine Linux:

```sh
#!/bin/sh  # Changed from #!/bin/bash

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Run database seeding
echo "Running database seeding..."
npx prisma db seed

# Start the application
echo "Starting application..."
node server.js
```

### 3. Fixed package.json Dependencies

Moved `tsx` from `devDependencies` to `dependencies` to ensure it's available in the production container:

```json
{
  "dependencies": {
    // ... other dependencies
    "tsx": "^4.19.0"
  }
}
```

## Verification

After these changes, the Docker container should:
1. Start without the startup script error
2. Successfully run Prisma migrations
3. Successfully seed the database with default plans and settings
4. Start the Next.js application correctly
5. Allow user registration without "Default 'Free' plan not found" errors

## Deployment Instructions

For Coolify or similar platforms:
1. **Build Pack**: Dockerfile
2. **Pre-deployment Commands**: Leave empty (no commands needed)
3. **Post-deployment Commands**: Leave empty (no commands needed)
4. **Environment Variables**: Set all required variables:
   - `DATABASE_URL`
   - `REDIS_URL` 
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - Plus any API keys (OpenAI, Stripe, etc.)

## Additional Notes

- The Alpine Linux image uses BusyBox which provides a minimal `/bin/sh` shell
- Executable permissions for the startup.sh script are set in the Dockerfile with `RUN chmod +x ./startup.sh`
- All commands are run under the non-root `nextjs` user as set in the Dockerfile
- The startup script automatically handles database setup on every container start
- No manual database seeding or migration commands are needed
