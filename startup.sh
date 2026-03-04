#!/bin/sh

# Exit on any error except for seeding
set -e

PRISMA_BIN="./node_modules/.bin/prisma"

# Run database migrations when Prisma CLI exists in runtime image
if [ -x "$PRISMA_BIN" ]; then
    echo "Running database migrations..."
    $PRISMA_BIN migrate deploy || echo "Warning: Migration failed or no migrations to run. Continuing..."
else
    echo "Prisma CLI not found in runtime image. Skipping migrations."
fi

# Run database seeding (non-fatal - app should start even if seeding fails)
SEED_EXIT=0
if [ -x "$PRISMA_BIN" ]; then
    echo "Running database seeding..."
    set +e
    $PRISMA_BIN db seed 2>/dev/null
    SEED_EXIT=$?
    set -e
else
    echo "Prisma CLI not found in runtime image. Skipping seed."
fi

if [ $SEED_EXIT -ne 0 ]; then
    echo "Note: Database seeding skipped (tsx not available in production or seed already applied). This is normal."
fi

echo "Database setup completed"

# Start the application
echo "Starting application..."
if [ -f "server.js" ]; then
    node server.js
elif [ -f ".next/standalone/server.js" ]; then
    node .next/standalone/server.js
else
    npx next start -p "${PORT:-3000}" -H "${HOSTNAME:-0.0.0.0}"
fi
