#!/bin/bash
echo "=== Checking Docker Database Connectivity ==="
echo ""
echo "1. Testing connection to srv-captain--postgres:5432..."
echo ""

# Try to connect using psql if available
if command -v psql &> /dev/null; then
    echo "Attempting to connect with psql..."
    PGPASSWORD=4cb45a6cdd4cc01c psql -h srv-captain--postgres -U postgres -d postgres -c "SELECT 'Connected successfully' as status;" 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Database connection successful"
        
        echo ""
        echo "2. Checking for SUPER_ADMIN users..."
        echo ""
        PGPASSWORD=4cb45a6cdd4cc01c psql -h srv-captain--postgres -U postgres -d postgres -c "SELECT email, role, \"emailVerified\", status FROM \"User\" WHERE role = 'SUPER_ADMIN';" 2>&1
        
        echo ""
        echo "3. Checking total user count..."
        echo ""
        PGPASSWORD=4cb45a6cdd4cc01c psql -h srv-captain--postgres -U postgres -d postgres -c "SELECT COUNT(*) as total_users FROM \"User\";" 2>&1
        
        echo ""
        echo "4. Checking if database has been seeded..."
        echo ""
        PGPASSWORD=4cb45a6cdd4cc01c psql -h srv-captain--postgres -U postgres -d postgres -c "SELECT name FROM \"Plan\" LIMIT 5;" 2>&1
    else
        echo "✗ Database connection failed"
        echo ""
        echo "Possible issues:"
        echo "- Database service 'srv-captain--postgres' not running"
        echo "- Network connectivity between containers"
        echo "- Wrong credentials in DATABASE_URL"
        echo "- Database not initialized"
    fi
else
    echo "psql not available. Testing with netcat..."
    nc -z -w5 srv-captain--postgres 5432 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Port 5432 is open on srv-captain--postgres"
    else
        echo "✗ Cannot connect to srv-captain--postgres:5432"
    fi
fi

echo ""
echo "=== Docker Container Diagnostics ==="
echo ""
echo "1. Check if database container is running:"
echo "   docker ps | grep postgres"
echo ""
echo "2. Check container logs:"
echo "   docker logs srv-captain--postgres"
echo ""
echo "3. Check network configuration:"
echo "   docker network ls"
echo "   docker network inspect captain-default"
echo ""
echo "4. Run database migrations from app container:"
echo "   docker exec -it [app-container-name] npx prisma migrate status"
echo ""
echo "5. Seed database if needed:"
echo "   docker exec -it [app-container-name] npx prisma db seed"
echo ""
echo "=== Quick Fixes ==="
echo ""
echo "If database is not seeded:"
echo "1. Enter the app container:"
echo "   docker exec -it [app-container-name] /bin/sh"
echo "2. Run migrations:"
echo "   npx prisma migrate deploy"
echo "3. Seed database:"
echo "   npx prisma db seed"
echo "4. Create super admin:"
echo "   node scripts/fix-super-admin.js"
echo ""
echo "If database service isn't running:"
echo "1. Restart the database service in CapRover"
echo "2. Check database logs in CapRover dashboard"