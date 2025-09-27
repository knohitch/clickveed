#!/bin/bash

# Run database migrations and seeding
echo "Running database migrations..."
npx prisma migrate deploy

echo "Running database seeding..."
npx prisma db seed

# Start the application
echo "Starting application..."
node server.js
