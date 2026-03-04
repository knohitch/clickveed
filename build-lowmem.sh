#!/bin/bash
# Build script for ultra-low memory environments (4GB RAM or less)
# Uses aggressive memory optimizations

echo "Building with aggressive memory optimizations..."

# Set environment variables for low-memory build
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_DISABLE_SWC_WORKER=1
export NEXT_PRIVATE_BUILD_WORKER=0

# Build with minimal memory footprint
npm run build:docker || {
    echo "Build failed with 2GB, retrying with 1.5GB..."
    export NODE_OPTIONS="--max-old-space-size=1536"
    npm run build:docker
}

if [ $? -eq 0 ]; then
    echo "Build successful!"
    exit 0
else
    echo "Build failed even with aggressive optimizations"
    echo "Consider:"
    echo "1. Adding swap space to your VPS"
    echo "2. Building locally and pushing to Docker registry"
    echo "3. Using GitHub Actions for CI/CD"
    exit 1
fi