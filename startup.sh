#!/bin/sh

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Run database seeding
echo "Running database seeding..."
npx prisma db seed

# Start the application
echo "Starting application..."
node server.js
