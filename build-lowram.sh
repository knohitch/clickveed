#!/bin/bash
# Build script with resource limits for 8GB RAM systems
# This limits Docker to 4GB RAM and 2 CPU cores

echo "Building with resource limits..."

docker buildx build \
  --platform linux/amd64 \
  --file Dockerfile.lowram \
  --memory 4g \
  --memory-swap 6g \
  --cpus="2.0" \
  --progress=plain \
  -t clickveed:latest \
  .

if [ $? -eq 0 ]; then
    echo "Build successful!"
else
    echo "Build failed with error code $?"
    exit 1
fi
