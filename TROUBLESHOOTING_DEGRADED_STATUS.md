# ClickVid Application Degraded Status Troubleshooting Guide

## Overview

Despite successful deployment, your ClickVid application is showing "Degraded (unhealthy)" status. This guide provides a systematic approach to diagnose and resolve this issue.

## Understanding Degraded Status

"Degraded (unhealthy)" typically means:
- The container is running but not responding to health checks
- The application started but crashed during initialization
- Required services (database, Redis) are not accessible
- The startup script failed to complete successfully

## Immediate Diagnostic Steps

### 1. Check Application Logs

In Coolify, go to your application and check the logs. Look for:

#### Error Patterns to Identify:
```
# Database connection issues
Error: connect ECONNREFUSED [database-host]:5432
PrismaClientInitializationError: Failed to initialize Prisma Client

# Redis connection issues
Error: Redis connection to [redis-host]:6372 failed
ECONNREFUSED

# Startup script issues
./startup.sh: not found
startup.sh: permission denied
node: command not found

# Application errors
Error: Cannot find module './server.js'
Port 3000 is already in use
```

### 2. Check Container Status

In Coolify, verify:
- Container is running (not stopped or restarting)
- Resource usage (CPU, memory) is normal
- No crash loops (container repeatedly restarting)

## Common Causes and Solutions

### 1. Database Connection Issues

#### Symptoms:
- Prisma initialization errors
- Database migration failures
- Timeout errors during startup

#### Diagnostic Commands:
```bash
# In Coolify container terminal
echo $DATABASE_URL
npx prisma db push --preview-feature
```

#### Solutions:
1. **Verify DATABASE_URL format**:
   ```
   postgresql://username:password@hostname:5432/database?schema=public
   ```

2. **Check database accessibility**:
   - Ensure database server is running
   - Verify firewall allows connection from Coolify server
   - Confirm database credentials are correct

3. **Test connection manually**:
   ```bash
   # In Coolify container terminal
   apt-get update && apt-get install -y postgresql-client
   psql "$DATABASE_URL" -c "SELECT 1"
   ```

### 2. Redis Connection Issues

#### Symptoms:
- Redis connection errors
- Session management failures
- Caching errors

#### Diagnostic Commands:
```bash
# In Coolify container terminal
echo $REDIS_URL
redis-cli -u "$REDIS_URL" ping
```

#### Solutions:
1. **Verify REDIS_URL format**:
   ```
   redis://username:password@hostname:6379
   ```

2. **Check Redis accessibility**:
   - Ensure Redis server is running
   - Verify network connectivity
   - Confirm Redis credentials

### 3. Startup Script Issues

#### Symptoms:
- "startup.sh not found" errors
- Permission denied errors
- Script execution failures

#### Diagnostic Commands:
```bash
# In Coolify container terminal
ls -la /app/startup.sh
cat /app/startup.sh
./startup.sh
```

#### Solutions:
1. **Verify script exists and is executable**:
   - Check that `startup.sh` is in the repository root
   - Ensure it has execute permissions (`chmod +x startup.sh`)

2. **Check script content**:
   ```bash
   #!/bin/bash
   
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

3. **Verify server.js exists**:
   ```bash
   ls -la /app/server.js
   ```

### 4. Environment Variable Issues

#### Symptoms:
- Missing configuration errors
- Undefined variable errors
- Service initialization failures

#### Diagnostic Commands:
```bash
# In Coolify container terminal
env | grep -E "(DATABASE_URL|REDIS_URL|NEXTAUTH|NODE_ENV)"
```

#### Solutions:
1. **Verify all required variables are set**:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_URL_INTERNAL`
   - `NODE_ENV=production`
   - `PORT=3000`

2. **Check for typos in variable names**

### 5. Port Conflicts

#### Symptoms:
- "Port already in use" errors
- Application fails to bind to port

#### Diagnostic Commands:
```bash
# In Coolify container terminal
netstat -tlnp | grep :3000
lsof -i :3000
```

#### Solutions:
1. **Ensure no other process is using port 3000**
2. **Verify PORT environment variable is set to 3000**

## Advanced Troubleshooting

### 1. Container Shell Access

For deeper diagnostics, access the container shell:

1. In Coolify, go to your application
2. Click "Terminal" or "Exec"
3. Run diagnostic commands:
   ```bash
   # Check working directory
   pwd
   
   # List files
   ls -la
   
   # Check Node.js
   node --version
   npm --version
   
   # Check Prisma
   npx prisma --version
   
   # Test database connection
   npx prisma db execute --stdin <<< "SELECT 1"
   
   # Test Redis connection
   redis-cli -u "$REDIS_URL" ping
   ```

### 2. Health Check Configuration

Coolify uses health checks to determine application status. Verify:

1. **Health check endpoint exists**:
   - Check if your application has a `/health` or `/api/health` endpoint
   - If not, you may need to create one

2. **Health check timeout**:
   - Increase timeout if application startup is slow
   - Default is typically 30 seconds

3. **Health check interval**:
   - Adjust if needed for your application

### 3. Resource Limits

Check if resource limits are causing issues:

1. **Memory limits**:
   - Ensure at least 1GB memory is allocated
   - Monitor memory usage during startup

2. **CPU limits**:
   - Ensure at least 1 CPU core is allocated
   - Monitor CPU usage during startup

## Step-by-Step Resolution Process

### Step 1: Gather Information
1. Check application logs in Coolify
2. Note any error messages or patterns
3. Check container status and resource usage

### Step 2: Verify Connectivity
1. Test database connection from container
2. Test Redis connection from container
3. Verify network connectivity to external services

### Step 3: Check Configuration
1. Verify all environment variables are set correctly
2. Check for typos or formatting issues
3. Ensure required files exist in the container

### Step 4: Test Startup Process
1. Manually run startup script in container
2. Check each step of the startup process
3. Identify where the process fails

### Step 5: Implement Fixes
1. Apply specific fixes based on diagnostics
2. Redeploy application
3. Monitor for successful startup

## Common Fix Scenarios

### Scenario 1: Database Connection Failed
```bash
# Fix: Update DATABASE_URL with correct credentials
# Ensure database is accessible from Coolify server
# Verify database is running
```

### Scenario 2: Redis Connection Failed
```bash
# Fix: Update REDIS_URL with correct credentials
# Ensure Redis is accessible from Coolify server
# Verify Redis is running
```

### Scenario 3: Startup Script Issues
```bash
# Fix: Ensure startup.sh is in repository root
# Add execute permissions: chmod +x startup.sh
# Verify script content is correct
```

### Scenario 4: Missing Environment Variables
```bash
# Fix: Add all required variables in Coolify
# Double-check variable names and values
# Ensure no typos in variable names
```

### Scenario 5: Port Conflicts
```bash
# Fix: Ensure PORT=3000 is set
# Check for other processes using port 3000
# Consider using a different port if needed
```

## Prevention Measures

### 1. Pre-Deployment Checks
Create a checklist to verify before deployment:
- [ ] All environment variables are set
- [ ] Database is accessible
- [ ] Redis is accessible
- [ ] All required files are in repository
- [ ] Startup script has correct permissions

### 2. Monitoring Setup
Configure monitoring to catch issues early:
- Application logs monitoring
- Resource usage alerts
- Health check failures alerts

### 3. Health Check Endpoint
Implement a proper health check endpoint:
```javascript
// Example health check endpoint (add to your application)
app.get('/health', (req, res) => {
  // Check database connection
  // Check Redis connection
  // Return 200 if all checks pass
  res.status(200).json({ status: 'healthy' });
});
```

## Getting Help

If issues persist after trying these solutions:

1. **Share specific error messages** from the logs
2. **Provide environment variable values** (without sensitive data)
3. **Describe the deployment process** you followed
4. **Include any custom configurations** you've made

## Conclusion

The "Degraded (unhealthy)" status typically indicates an issue with the application startup process or service connectivity. By systematically checking each component (database, Redis, startup script, environment variables), you can identify and resolve the specific cause of the issue.

Start with the immediate diagnostic steps, then work through the common causes and solutions. Most issues can be resolved by correcting environment variables, ensuring service connectivity, or fixing startup script permissions.