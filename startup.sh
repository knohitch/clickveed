#!/bin/bash

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Run database seeding - install tsx if not available
echo "Running database seeding..."
if ! command -v tsx &> /dev/null; then
    echo "Installing tsx for seeding..."
    npm install --no-save tsx
fi
npx prisma db seed

# Start the application
echo "Starting application..."
node server.js
