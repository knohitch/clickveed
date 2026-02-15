# Database Connection Guide for Super Admin Login

## Current Issue
The application cannot connect to the PostgreSQL database at `srv-captain--postgres:5432`. This hostname is a **Docker service name** that only works within a Docker network.

## Quick Fix Options

### Option 1: Use Local Database (Recommended for Development)
1. **Install PostgreSQL locally** or use Docker Desktop
2. **Update your `.env` file**:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/clickvid"
   ```
3. **Run database setup**:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

### Option 2: Use Cloud Database (Production)
1. **Use a real hostname/IP address** instead of Docker service name:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@your-database-host:5432/clickvid"
   ```
2. **Ensure network connectivity** from your application server to the database host
3. **Check firewall rules** to allow port 5432

### Option 3: Use Docker Compose (If Running in Docker)
1. **Start the full stack** with Docker Compose:
   ```bash
   docker-compose up -d
   ```
2. **The application will automatically connect** to `db:5432` (as defined in docker-compose.yml)

## Step-by-Step Local Database Setup

### 1. Install PostgreSQL
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt install postgresql postgresql-contrib`

### 2. Create Database and User
```sql
CREATE DATABASE clickvid;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE clickvid TO postgres;
```

### 3. Update Environment Variables
Edit your `.env` file:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/clickvid"

# Keep other settings
NEXTAUTH_URL="https://app.vyydecourt.site"
AUTH_URL="https://app.vyydecourt.site"
ADMIN_EMAILS="admin@vyydecourt.site"
# ... rest of your config
```

### 4. Run Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database (creates plans, settings, etc.)
npx prisma db seed
```

### 5. Create Super Admin Account
The first user to sign up will automatically become SUPER_ADMIN. Alternatively, run:
```bash
node scripts/fix-super-admin.js
```

## Verification Steps

1. **Test database connection**:
   ```bash
   node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.$connect().then(() => { console.log('Connected!'); process.exit(0); }).catch(e => { console.error('Failed:', e.message); process.exit(1); })"
   ```

2. **Check if super admin exists**:
   ```bash
   node scripts/fix-super-admin.js
   ```

3. **Attempt login** at `https://app.vyydecourt.site/login`

## Troubleshooting

### Error: "Can't reach database server"
- **Check if PostgreSQL is running**: `ps aux | grep postgres` or check services
- **Verify connection details**: Host, port, username, password, database name
- **Test with psql**: `psql -h localhost -U postgres -d clickvid`

### Error: "Connection refused"
- **Firewall blocking port 5432**: Allow TCP port 5432
- **PostgreSQL not listening on all interfaces**: Check `pg_hba.conf` and `postgresql.conf`
- **Wrong port**: Default is 5432, verify with `netstat -tulpn | grep 5432`

### Error: "Authentication failed"
- **Wrong password**: Verify the password in DATABASE_URL
- **User doesn't exist**: Create the user in PostgreSQL

## CapRover Docker Deployment Specifics

If you're using CapRover with Docker containers:

### 1. **Verify Database Service is Running**
```bash
# From your CapRover server SSH
docker ps | grep postgres
docker logs srv-captain--postgres
```

### 2. **Check Network Connectivity Between Containers**
```bash
# Get app container ID
docker ps | grep clickveed

# Inspect network
docker network inspect captain-default
```

### 3. **Run Database Migrations Inside App Container**
```bash
# Enter the app container
docker exec -it [app-container-name] /bin/sh

# Inside container, run:
npx prisma migrate deploy
npx prisma db seed
node scripts/fix-super-admin.js
```

### 4. **Verify Database Credentials**
Ensure your `.env` file inside the container has:
```env
DATABASE_URL="postgresql://postgres:4cb45a6cdd4cc01c@srv-captain--postgres:5432/postgres"
```

### 5. **Common CapRover Issues**
- **Service name mismatch**: CapRover uses `srv-captain--[service-name]` format
- **Volume persistence**: Database data may be lost if not persisted
- **Network isolation**: Ensure containers are on the same network (`captain-default`)

### 6. **Quick Diagnostic Script**
Run inside app container:
```bash
node scripts/fix-super-admin.js
```
This will test connectivity and create a super admin if needed.

## Production Considerations

For production deployment on CapRover/Coolify:

1. **Use the CapRover Postgres service** (if available)
2. **Update DATABASE_URL** to use the internal service name provided by CapRover
3. **Run migrations on deployment**:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

## Next Steps

1. **Check if database container is running** in CapRover dashboard
2. **Run database migrations** inside the app container
3. **Create super admin** using the diagnostic script
4. **Test super admin login** with email `admin@vyydecourt.site`

Once the database connection is established, super admin login will work with the email `admin@vyydecourt.site` and the password created by the seed script.

## Password Reset for Existing Super Admin

If users exist but authentication fails, reset the password:

### Option A: Interactive Reset (Inside Docker Container)
```bash
# Enter your app container
docker exec -it [your-app-container-name] /bin/sh

# Run the password reset script
node scripts/reset-super-admin-password.js

# Follow the prompts to select user and set new password
```

### Option B: Direct SQL Update
```sql
-- Connect to PostgreSQL
psql -h srv-captain--postgres -U postgres -d postgres

-- Update password for specific user
UPDATE "User"
SET "passwordHash" = '$2a$10$YourBcryptHashHere'
WHERE email = 'admin@vyydecourt.site';

-- Generate bcrypt hash using:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(console.log)"
```

### Option C: Use Diagnostic Scripts
```bash
# Check user authentication details
node scripts/check-user-auth.js

# This will show:
# - All users and their roles
# - Password hash presence and format
# - Email verification status
# - Account status
```

## Still Having Issues?

If database connectivity is confirmed but login still fails:

1. **Check application logs** for `[AUTH]` and `[LOGIN]` debug messages
2. **Verify SUPER_ADMIN user exists** in database:
   ```sql
   SELECT email, role, "emailVerified", status FROM "User" WHERE role = 'SUPER_ADMIN';
   ```
3. **Reset password** for existing super admin:
   ```sql
   UPDATE "User" SET "passwordHash" = '$2a$10$...' WHERE role = 'SUPER_ADMIN';
   ```
   (Use `bcrypt.hash('yourpassword', 10)` to generate hash)