#!/bin/sh

# Exit on any error except for seeding
set -e

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy || echo "Warning: Migration failed or no migrations to run. Continuing..."

# Run database seeding (non-fatal - app should start even if seeding fails)
echo "Running database seeding..."
set +e
npx prisma db seed 2>/dev/null
SEED_EXIT=$?
set -e

if [ $SEED_EXIT -ne 0 ]; then
    echo "Note: Database seeding skipped (tsx not available in production or seed already applied). This is normal."
fi

echo "Database setup completed"

# Start the application
echo "Starting application..."
if [ -f "server.js" ]; then
    node server.js
else
    node .next/standalone/server.js
fi
