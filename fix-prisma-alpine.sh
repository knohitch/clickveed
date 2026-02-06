#!/bin/bash

# This script fixes the Prisma client to work with Alpine Linux

echo "Cleaning up existing Prisma client..."
rm -rf node_modules/.prisma

echo "Regenerating Prisma client with Alpine Linux support..."
npx prisma generate

echo "Prisma client has been regenerated for Alpine Linux support."
echo "You can now rebuild your Docker image with: docker build -t your-app-name ."