#!/bin/sh

# Exit on any error except for seeding
set -e

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Run database seeding with fallback
echo "Running database seeding..."
if ! npx prisma db seed; then
    echo "TypeScript seeding failed, trying SQL fallback..."
    # Extract database connection info for psql command
    if [ ! -z "$DATABASE_URL" ]; then
        echo "Running SQL fallback seed..."
        if command -v psql > /dev/null 2>&1; then
            psql "$DATABASE_URL" -f seed-fallback.sql
            echo "SQL fallback seeding completed"
        else
            # For environments without psql, try using node with raw SQL
            echo "psql not available, using alternative method..."
            node -e "
                const { PrismaClient } = require('@prisma/client');
                const fs = require('fs');
                const prisma = new PrismaClient();
                async function runSeed() {
                    try {
                        const sql = fs.readFileSync('seed-fallback.sql', 'utf8');
                        // Split SQL statements by semicolon and execute each
                        const statements = sql.split(';').filter(s => s.trim().length > 0);
                        for (const statement of statements) {
                            if (statement.trim()) {
                                await prisma.\$executeRawUnsafe(statement + ';');
                            }
                        }
                        console.log('Fallback seeding completed via Prisma');
                    } catch (error) {
                        console.log('Fallback seeding failed:', error.message);
                    } finally {
                        await prisma.\$disconnect();
                    }
                }
                runSeed();
            "
        fi
    else
        echo "DATABASE_URL not set, cannot run fallback seeding"
    fi
fi

echo "Database setup completed"

# Start the application
echo "Starting application..."
node server.js
